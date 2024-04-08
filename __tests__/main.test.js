/**
 * Unit tests for the action's main functionality, src/main.js
 */
const main = require('../src/main')
const expect = require('expect')

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('test export', async () => {
    // Set the action's inputs as return values from core.getInput()
    const solutionUserTK = 'b6jcfp_nryt_1_d8fyfgwd7ka3575vwtm5cy332h3'
    const solutionId = '14b17764-d754-42e3-a5fa-2a4eaf6457d3'
    const resp = await main.exportSolution(
      solutionId,
      '0.2',
      'carbonprodtest',
      solutionUserTK
    )
    // console.debug('resp', resp)
    expect(resp).not.toBeNull()
  })
})
