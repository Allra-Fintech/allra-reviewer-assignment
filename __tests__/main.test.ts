/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'

// Mock the modules before importing anything else
const mockCore = {
  debug: jest.fn() as jest.MockedFunction<(message: string) => void>,
  error: jest.fn() as jest.MockedFunction<(message: string | Error) => void>,
  info: jest.fn() as jest.MockedFunction<(message: string) => void>,
  getInput: jest.fn() as jest.MockedFunction<
    (name: string, options?: unknown) => string
  >,
  setOutput: jest.fn() as jest.MockedFunction<
    (name: string, value: unknown) => void
  >,
  setFailed: jest.fn() as jest.MockedFunction<
    (message: string | Error) => void
  >,
  warning: jest.fn() as jest.MockedFunction<(message: string | Error) => void>
}

// Create mock functions
const mockSelectRandomReviewers = jest.fn() as jest.MockedFunction<
  () => unknown[]
>
const mockSendReviewerNotification = jest.fn() as jest.MockedFunction<
  () => Promise<unknown>
>
const mockAssignReviewers = jest.fn() as jest.MockedFunction<
  () => Promise<void>
>
const mockGetPRCreator = jest.fn() as jest.MockedFunction<
  () => string | undefined
>
const mockValidatePRContext = jest.fn() as jest.MockedFunction<() => boolean>

// Mock @actions/core
jest.unstable_mockModule('@actions/core', () => mockCore)

// Mock the individual modules with class constructors
jest.unstable_mockModule('../src/reviewer-selector.js', () => ({
  ReviewerSelector: class {
    constructor() {}
    selectRandomReviewers = mockSelectRandomReviewers
  }
}))

jest.unstable_mockModule('../src/slack-notifier.js', () => ({
  SlackNotifier: class {
    constructor() {}
    sendReviewerNotification = mockSendReviewerNotification
  }
}))

jest.unstable_mockModule('../src/github-client.js', () => ({
  GitHubClient: class {
    constructor() {}
    assignReviewers = mockAssignReviewers
    getPRCreator = mockGetPRCreator
    validatePRContext = mockValidatePRContext
  }
}))

const { run } = await import('../src/main.js')

describe('main.ts', () => {
  const mockReviewers = [
    { githubName: 'reviewer1', slackMention: '<@U123>' },
    { githubName: 'reviewer2' }
  ]

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()

    // Setup default mock implementations
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        case 'slack-webhook-url':
          return 'https://hooks.slack.com/mock'
        case 'reviewers-config-path':
          return '.github/reviewers.yml'
        case 'max-reviewers':
          return '3'
        case 'language':
          return 'ko'
        default:
          return ''
      }
    })

    // Set up default mock behaviors
    mockValidatePRContext.mockReturnValue(true)
    mockGetPRCreator.mockReturnValue('test-author')
    mockSelectRandomReviewers.mockReturnValue(mockReviewers)
    mockAssignReviewers.mockImplementation(() => Promise.resolve())
    mockSendReviewerNotification.mockImplementation(() => Promise.resolve())
  })

  it('should orchestrate the full reviewer assignment flow', async () => {
    await run()

    expect(mockValidatePRContext).toHaveBeenCalled()
    expect(mockGetPRCreator).toHaveBeenCalled()
    expect(mockSelectRandomReviewers).toHaveBeenCalledWith(3, 'test-author')
    expect(mockAssignReviewers).toHaveBeenCalledWith(mockReviewers)
    expect(mockSendReviewerNotification).toHaveBeenCalledWith(mockReviewers)
  })

  it('should handle missing GitHub token', async () => {
    mockCore.getInput.mockImplementation((name: string) =>
      name === 'github-token' ? '' : 'mock-value'
    )

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith('GitHub token is required')
    expect(mockValidatePRContext).not.toHaveBeenCalled()
  })

  it('should exit early when PR context validation fails', async () => {
    mockValidatePRContext.mockReturnValue(false)

    await run()

    expect(mockValidatePRContext).toHaveBeenCalled()
    expect(mockGetPRCreator).not.toHaveBeenCalled()
    expect(mockSelectRandomReviewers).not.toHaveBeenCalled()
  })

  it('should exit early when PR creator cannot be determined', async () => {
    mockGetPRCreator.mockReturnValue(undefined)

    await run()

    expect(mockGetPRCreator).toHaveBeenCalled()
    expect(mockCore.warning).toHaveBeenCalledWith(
      'Could not determine PR creator'
    )
    expect(mockSelectRandomReviewers).not.toHaveBeenCalled()
  })

  it('should exit early when no reviewers are selected', async () => {
    mockSelectRandomReviewers.mockReturnValue([])

    await run()

    expect(mockSelectRandomReviewers).toHaveBeenCalled()
    expect(mockCore.info).toHaveBeenCalledWith('No available reviewers found')
    expect(mockAssignReviewers).not.toHaveBeenCalled()
  })

  it('should skip Slack notification when webhook URL is not provided', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'github-token':
          return 'mock-token'
        case 'slack-webhook-url':
          return ''
        case 'reviewers-config-path':
          return '.github/reviewers.yml'
        case 'max-reviewers':
          return '3'
        default:
          return ''
      }
    })

    await run()

    expect(mockAssignReviewers).toHaveBeenCalledWith(mockReviewers)
    expect(mockSendReviewerNotification).not.toHaveBeenCalled()
  })

  it('should handle GitHub API errors gracefully', async () => {
    const apiError = new Error('GitHub API Error')
    mockAssignReviewers.mockRejectedValue(apiError)

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'Action failed: GitHub API Error'
    )
  })

  it('should handle Slack notification errors gracefully', async () => {
    const slackError = new Error('Slack API Error')
    mockSendReviewerNotification.mockRejectedValue(slackError)

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'Action failed: Slack API Error'
    )
  })

  it('should handle unknown errors gracefully', async () => {
    mockAssignReviewers.mockRejectedValue('Unknown error')

    await run()

    expect(mockCore.setFailed).toHaveBeenCalledWith(
      'Action failed: Unknown error'
    )
  })

  it('should parse max-reviewers parameter correctly', async () => {
    mockCore.getInput.mockImplementation((name: string) => {
      switch (name) {
        case 'max-reviewers':
          return '5'
        default:
          return name === 'github-token' ? 'mock-token' : ''
      }
    })

    await run()

    expect(mockSelectRandomReviewers).toHaveBeenCalledWith(5, 'test-author')
  })
})
