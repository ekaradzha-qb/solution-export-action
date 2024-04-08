const core = require('@actions/core')
const { context } = require('@actions/github')
const fs = require('fs')
const { Octokit } = require('octokit')

const {
  log: { info },
  rest
} = new Octokit({
  auth: process.env.GITHUB_PERSONAL_TOKEN
})

const PR_TITLE = core.getInput('pr_title')
const MAIN = 'main'
const repo = core.getInput('repo') //'solution-export-action'
const owner = core.getInput('owner') //'ekaradzha-qb'
const owner_name = core.getInput('owner_name') //'ekaradzha-qb'
const owner_email = core.getInput('owner_email') //'ekaradzha-qb'
const head = 'new-solution-qbl-version' // + Math.random().toString(36).substr(2, 5)
const SOLUTION_ID = core.getInput('solution_id')
const QB_TK = core.getInput('qb_tk')
const QB_REALM = core.getInput('qb_realm')
const BRANCH_NAME = core.getInput('branch_name')
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const solutionYaml = await exportSolution(
      SOLUTION_ID,
      '0.2',
      QB_REALM,
      QB_TK
    )

    await createOrUpdatePullRequest(PR_TITLE, head, solutionYaml)
    core.setOutput('yaml', 'setOutput')
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
  const result = await resp.text()
  //await writeTextFile('solution.yaml', result)

  const pr = await createOrUpdatePullRequest(PR_TITLE, BRANCH_NAME, result)

  const respGit = await uploadFileToGit(result, pr.head.ref)
  console.log('response of upload to git call', respGit)
  return result
}

// async function writeTextFile(filepath, output) {
//   await fs.writeFile(filepath, output, err => {
//     if (err) console.log(err)
//     else {
//       console.log('File written successfully\n')
//       console.log('The written has the following contents:')
//       //console.log(fs.readFileSync(filepath, 'utf8'))
//     }
//   })
// }

async function findPullRequest(prTitle) {
  const { data: pullRequests } = await rest.pulls.list({
    owner,
    repo
  })

  return pullRequests.find(
    pr => pr.head.ref === 'main' && pr.state === 'open' && pr.title === prTitle
  )
}

async function createOrUpdatePullRequest(title, branchName, solutionYaml) {
  let logMsg = ''
  try {
    const pr = await findPullRequest(title)
    if (pr) {
      console.info('PR is found')
      return pr
    }
    logMsg = 'PR is not found'
    console.info('getting latest commit sha & treeSha')
    let response = await rest.repos.listCommits({
      owner,
      repo,
      per_page: 1
    })

    const latestCommitSha = response.data[0].sha
    const treeSha = response.data[0].commit.tree.sha
    console.info(`commit sha: ${latestCommitSha}, tree sha: ${treeSha}`)
    logMsg = 'commit sha'
    response = await rest.git.createTree({
      owner,
      repo,
      base_tree: treeSha,
      tree: [{ path: 'solution.yaml', mode: '100644', content: solutionYaml }]
    })

    const newTreeSha = response.data.sha
    logMsg = 'creating commit'
    console.info('creating commit')
    response = await rest.git.createCommit({
      owner,
      repo,
      message: 'Commit message',
      tree: newTreeSha,
      parents: [latestCommitSha],
      author: {
        name: owner_name,
        email: owner_email
      }
    })

    const newCommitSha = response.data.sha
    console.info(`new commit sha: ${newCommitSha}`)
    logMsg = 'creating branch'
    console.info(`creating branch ${branchName}`)
    await rest.git.createRef({
      owner,
      repo,
      sha: newCommitSha,
      ref: `refs/heads/${branchName}`
    })

    const create = await rest.pulls.create({
      owner,
      repo,
      head: branchName,
      base: MAIN,
      body: 'See the difference between the old and new solution QBL',
      title
    })
  } catch (e) {
    console.error(e.message)
    console.log(e)
    console.log(`createOrUpdatePullRequest failed: ${e.message}`)
    console.info(`soluitonId: ${SOLUTION_ID} `)
    console.info(logMsg)

    return
  }

  console.log('PR created')
}

async function uploadFileToGit(solutionYaml, gitRef) {
  // Get reference to the latest commit in the main branch
  const { data: refData } = await rest.git.getRef({
    owner,
    repo,
    ref: gitRef
  })

  // Create a new blob with the file content
  const { data: blobData } = await rest.git.createBlob({
    owner,
    repo,
    content: solutionYaml,
    encoding: 'utf-8'
  })

  // Create a new tree with the new file
  const { data: treeData } = await rest.git.createTree({
    owner,
    repo,
    base_tree: refData.object.sha,
    tree: [
      {
        path: `solution.yaml`,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      }
    ]
  })

  // Create a new commit
  const { data: commitData } = await rest.git.createCommit({
    owner,
    repo,
    message: `update solution`,
    tree: treeData.sha,
    parents: [refData.object.sha]
  })

  // Update the reference to point to the new commit
  await rest.git.updateRef({
    owner,
    repo,
    ref: gitRef,
    sha: commitData.sha
  })
}

module.exports = {
  run,
  exportSolution
}
