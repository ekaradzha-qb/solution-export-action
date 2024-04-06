const core = require('@actions/core')
const { wait } = require('./wait')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const ms = core.getInput('milliseconds', { required: true })

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    const userToken = 'b6jcfp_nryt_1_d8fyfgwd7ka3575vwtm5cy332h3'
    const solutionId = '14b17764-d754-42e3-a5fa-2a4eaf6457d3'
    const resp = await ExportSolution(
      solutionId,
      '0.2',
      'carbonprodtest',
      userToken
    )
    // Set outputs for other workflow steps to use
    core.setOutput(resp)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

async function ExportSolution(
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

  const response = await resp.blob().text()
  return response
}

module.exports = {
  run
}
