const core = require('@actions/core')
const { wait } = require('./wait')
const fs = require('fs')
const { Octokit } = require('octokit')
//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
//hjghjgjhgjjghjghjghjgjjhgjg'
const octokit = new Octokit({
  //auth: process.env.TOKEN
  // //process.env.GITHUB_PERSONAL_TOKEN
  auth: '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'
})

const OWNER = 'ekaradzha-qb'
const REPO = 'solution-export-action'
const REF = 'heads/main'
/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const userToken = 'b6jcfp_nryt_1_d8fyfgwd7ka3575vwtm5cy332h3'
    const solutionId = '14b17764-d754-42e3-a5fa-2a4eaf6457d3'
    const solutionYaml = await exportSolution(
      solutionId,
      '0.2',
      'carbonprodtest',
      userToken
    )

    // console.debug('response of export call', solutionYaml)
    // const resp = await uploadFileToGit()
    // console.log('response of upload to git call', resp)
    // Set outputs for other workflow steps to use
    core.setOutput('yaml', 'setOutput')
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function exportSolution(
  solutionId,
  qblVersion,
  realmHostname,
  userToken
) {
  const headers = {
    'QBL-Version': `${qblVersion}`,
    'QB-Realm-Hostname': `${realmHostname}`,
    'User-Agent': `GitHub action`,
    Authorization: `QB-USER-TOKEN ${userToken}`,
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
  await writeTextFile('solution.yaml', result)
  const respGit = await uploadFileToGit()
  console.log('response of upload to git call', respGit)
  return result
}

async function writeTextFile(filepath, output) {
  await fs.writeFile(filepath, output, err => {
    if (err) console.log(err)
    else {
      console.log('File written successfully\n')
      console.log('The written has the following contents:')
      //console.log(fs.readFileSync(filepath, 'utf8'))
    }
  })
}

async function uploadFileToGit(solutionYaml) {
  // Get reference to the latest commit in the main branch
  const { data: refData } = await octokit.rest.git.getRef({
    owner: OWNER,
    repo: REPO,
    ref: REF
  })

  // Create a new blob with the file content
  const { data: blobData } = await octokit.rest.git.createBlob({
    owner: OWNER,
    repo: REPO,
    content: solutionYaml
  })

  // Create a new tree with the new file
  const { data: treeData } = await octokit.rest.git.createTree({
    owner: OWNER,
    repo: REPO,
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
  const { data: commitData } = await octokit.rest.git.createCommit({
    owner: OWNER,
    repo: REPO,
    message: `update solution`,
    tree: treeData.sha,
    parents: [refData.object.sha]
  })

  // Update the reference to point to the new commit
  await octokit.rest.git.updateRef({
    owner: OWNER,
    repo: REPO,
    ref: 'heads/main',
    sha: commitData.sha
  })

  //   return await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
  //   owner: 'ekaradzha-qb',
  //   repo: 'solution-export-action',
  //   path: '.',
  //   message: 'my commit message',
  //   committer: {
  //     name: 'Adding file',
  //     email: 'ekaradzha@quickbase.com'
  //   },
  //   content: 'bXkgbmV3IGZpbGUgY29udGVudHM=',
  //   headers: {
  //     'X-GitHub-Api-Version': '2022-11-28'
  //   }
  // })
}

module.exports = {
  run,
  exportSolution
}
