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

async function uploadFileToGit() {
  await octokit.rest.pulls.create({
    owner: 'ekaradzha-qb',
    repo: 'solution-export-action',
    title: 'test PR',
    head: 'main',
    base: 'main'
  })
  // owner,
  //     repo,
  //     head,
  //     base,
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
