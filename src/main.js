const core = require('@actions/core')
const { context } = require('@actions/github')
const { Octokit } = require('octokit')
const { rest } = new Octokit({ auth: core.getInput('gh_token') })
const repo = core.getInput('repo')
const owner = core.getInput('owner')

//Action variables
const PR_TITLE = core.getInput('pr_title')
const OWNER_NAME = core.getInput('owner_name')
const OWNER_EMAIL = core.getInput('owner_email')
const BRANCH_NAME = `${core.getInput('branch_name')}-${GetHeadSurfix()}`
const PR_DESCRIPTION = core.getInput('pr_description')
const QB_SOLUTION_ID = core.getInput('qb_solution_id')
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

    await createOrUpdatePullRequest(PR_TITLE, BRANCH_NAME, solutionYaml)
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

    const createTreeResponse = await rest.git.createTree({
      owner,
      repo,
      base_tree: listCommitResponse.data[0].commit.tree.sha,
      tree: [{ path: QBL_FILENAME, mode: '100644', content: solutionYaml }]
    })

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

    await rest.git.createRef({
      owner,
      repo,
      sha: commitResponse.data.sha,
      ref: `refs/heads/${branchName}`
    })

    await rest.pulls.create({
      owner,
      repo,
      head: branchName,
      base: 'main',
      body: PR_DESCRIPTION,
      title
    })
  } catch (e) {
    console.error(`Creating PR failed: ${e}`)
    return
  }

  console.info('PR created')
}

function GetHeadSurfix() {
  return new Date()
    .toISOString()
    .slice(10)
    .replaceAll('.', '')
    .replaceAll(':', '')
}

module.exports = {
  run,
  exportSolution
}
