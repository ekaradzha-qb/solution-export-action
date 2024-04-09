const core = require('@actions/core')
const { context } = require('@actions/github')
const { Octokit } = require('octokit')
const { rest } = new Octokit({ auth: core.getInput('gh_token') })

//Action variables
const repo = context.repo.repo
const owner = context.repo.owner
const OWNER_NAME = core.getInput('owner_name')
const OWNER_EMAIL = core.getInput('owner_email')
const BRANCH_NAME = core.getInput('branch_name')
const PR_TITLE = core.getInput('pr_title')
const PR_DESCRIPTION = core.getInput('pr_description')
const QB_SOLUTION_ID = core.getInput('qb_solution_id_to_export')
const QB_USR_TOKEN = core.getInput('qb_user_token')
const QB_REALM = core.getInput('qb_realm')
const QBL_VERSION = core.getInput('qbl_version')
const QBL_FILENAME = core.getInput('qbl_filename')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const solutionYaml = await exportSolution(
      QB_SOLUTION_ID,
      QBL_VERSION,
      QB_REALM,
      QB_USR_TOKEN
    )

    //Add some uniqueness to the PR title and branch name
    const suffix = GetRandomSuffix()
    const pr_title = `[${suffix}] ${PR_TITLE}`
    const branch_name = `${BRANCH_NAME}_${suffix}`

    await createOrUpdatePullRequest(pr_title, branch_name, solutionYaml)
    core.setOutput('branch_name', BRANCH_NAME)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function exportSolution(solutionId, qblVersion, realmHostname, qbTk) {
  const headers = {
    'QBL-Version': `${qblVersion}`,
    'QB-Realm-Hostname': `${realmHostname}`,
    'User-Agent': `GitHub action`,
    Authorization: `QB-USER-TOKEN ${qbTk}`,
    'Content-Type': 'application/x-yaml'
  }

  const resp = await fetch(
    `https://api.quickbase.com/v1/solutions/${solutionId}`,
    {
      method: 'GET',
      headers
    }
  )
  return await resp.text()
}

async function findPullRequest(prTitle) {
  const { data: pullRequests } = await rest.pulls.list({
    owner,
    repo,
    state: 'open'
  })

  return pullRequests.find(pr => pr.head.ref === 'main' && pr.title === prTitle)
}

async function createOrUpdatePullRequest(title, branchName, solutionYaml) {
  try {
    const pr = await findPullRequest(title)
    if (pr) {
      return pr
    }

    const listCommitResponse = await rest.repos.listCommits({
      owner,
      repo,
      per_page: 1
    })

    if (listCommitResponse.status !== 200) {
      console.error(
        `Can't list commits. Status code: ${listCommitResponse.status}`
      )
      return 1
    }

    const createTreeResponse = await rest.git.createTree({
      owner,
      repo,
      base_tree: listCommitResponse.data[0].commit.tree.sha,
      tree: [{ path: QBL_FILENAME, mode: '100644', content: solutionYaml }]
    })

    if (createTreeResponse.status !== 201) {
      console.error(
        `Can't create a tree. Status code: ${createTreeResponse.status}`
      )
      return 1
    }
    console.info(createTreeResponse.text)
    console.info(createTreeResponse.status)

    const commitResponse = await rest.git.createCommit({
      owner,
      repo,
      message: 'Latest QBL version',
      tree: createTreeResponse.data.sha,
      parents: [listCommitResponse.data[0].sha],
      author: {
        name: OWNER_NAME,
        email: OWNER_EMAIL
      }
    })

    if (commitResponse.status !== 201) {
      console.error(
        `Can't create a commit. Status code: ${commitResponse.status}`
      )
      return 1
    }

    const createRefResp = await rest.git.createRef({
      owner,
      repo,
      sha: commitResponse.data.sha,
      ref: `refs/heads/${branchName}`
    })

    if (createRefResp.status !== 201) {
      console.error(`Can't create a ref. Status code: ${createRefResp.status}`)
      return 1
    }

    const createPRResponse = await rest.pulls.create({
      owner,
      repo,
      head: branchName,
      base: 'main',
      body: PR_DESCRIPTION,
      title
    })

    if (createPRResponse.status !== 201) {
      console.error(
        `Can't create a PR. Status code: ${createPRResponse.status}`
      )
      return 1
    }
  } catch (e) {
    console.error(`Creating PR failed with unexpected error: ${e}`)
    return
  }

  console.info(`PR: ${title} with branch ${branchName} is created.`)
}

function GetRandomSuffix() {
  return (
    String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    new Date()
      .toISOString()
      .slice(18, 23)
      .replaceAll('.', '')
      .replaceAll(':', '')
  )
}

module.exports = { run }
