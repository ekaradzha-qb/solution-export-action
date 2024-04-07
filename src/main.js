const core = require('@actions/core')
const { wait } = require('./wait')
const fs = require('fs')
const { Octokit } = require('octokit')

const octokit = new Octokit({
  auth: process.env.TOKEN
})

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const ms = core.getInput('milliseconds', { required: true })

    const userToken = 'b6jcfp_nryt_1_d8fyfgwd7ka3575vwtm5cy332h3'
    const solutionId = '14b17764-d754-42e3-a5fa-2a4eaf6457d3'
    const solutionYaml = await exportSolution(
      solutionId,
      '0.2',
      'carbonprodtest',
      userToken
    )

    // console.debug('response of export call', solutionYaml)
    const resp = await uploadFileToGit()
    console.debug('response of upload to git call', resp)
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
  let result = await resp.text()
  writeTextFile('solution.yaml', result)
  return result
}

function writeTextFile(filepath, output) {
  fs.writeFile(filepath, output, err => {
    if (err) console.log(err)
    else {
      console.log('File written successfully\n')
      console.log('The written has the following contents:')
      //console.log(fs.readFileSync(filepath, 'utf8'))
    }
  })
}

async function uploadFileToGit() {
  return await octokit.request(
    'PUT /repos/ekaradzha-qb/solution-export-action/contents/',
    {
      owner: 'ekaradzha-qb',
      repo: 'solution-export-action',
      path: '.',
      message: 'my commit message',
      committer: {
        name: 'Adding file',
        email: 'ekaradzha@quickbase.com'
      },
      content: 'bXkgbmV3IGZpbGUgY29udGVudHM=',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  )
}

module.exports = {
  run,
  exportSolution
}
