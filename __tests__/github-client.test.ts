/**
 * Unit tests for github-client.ts
 */
import { jest } from '@jest/globals'

// Mock the modules before importing anything else
const mockCore = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn()
}

const mockRequestReviewers = jest.fn() as jest.MockedFunction<
  () => Promise<unknown>
>
const mockGetOctokit = jest.fn() as jest.MockedFunction<() => unknown>

const mockGithubContext = {
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    payload: {
      pull_request: {
        number: 123,
        user: { login: 'test-author' }
      }
    }
  },
  getOctokit: mockGetOctokit
}

jest.unstable_mockModule('@actions/core', () => mockCore)
jest.unstable_mockModule('@actions/github', () => mockGithubContext)

// Now import the module under test
const { GitHubClient } = await import('../src/github-client.js')

describe('GitHubClient', () => {
  let githubClient: InstanceType<typeof GitHubClient>
  const mockToken = 'test-token'

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup mock octokit instance
    mockGetOctokit.mockReturnValue({
      rest: {
        pulls: {
          requestReviewers: mockRequestReviewers
        }
      }
    })

    githubClient = new GitHubClient(mockToken)
  })

  describe('assignReviewers', () => {
    it('should assign reviewers to pull request', async () => {
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' },
        { githubName: 'reviewer2' }
      ]

      mockRequestReviewers.mockResolvedValueOnce({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1', 'reviewer2']
      })

      expect(mockCore.info).toHaveBeenCalledWith(
        'Assigned reviewers: reviewer1, reviewer2'
      )
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'assigned-reviewers',
        'reviewer1,reviewer2'
      )
    })

    it('should handle single reviewer', async () => {
      const mockReviewers = [{ githubName: 'reviewer1' }]

      mockRequestReviewers.mockResolvedValueOnce({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1']
      })

      expect(mockCore.info).toHaveBeenCalledWith(
        'Assigned reviewers: reviewer1'
      )
      expect(mockCore.setOutput).toHaveBeenCalledWith(
        'assigned-reviewers',
        'reviewer1'
      )
    })

    it('should handle empty reviewers array', async () => {
      const mockReviewers: { githubName: string }[] = []

      mockRequestReviewers.mockResolvedValueOnce({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: []
      })

      expect(mockCore.info).toHaveBeenCalledWith('Assigned reviewers: ')
      expect(mockCore.setOutput).toHaveBeenCalledWith('assigned-reviewers', '')
    })

    it('should propagate API errors', async () => {
      const mockReviewers = [{ githubName: 'reviewer1' }]
      const apiError = new Error('API Error')

      mockRequestReviewers.mockRejectedValue(apiError)

      await expect(githubClient.assignReviewers(mockReviewers)).rejects.toThrow(
        'API Error'
      )
    })
  })

  describe('getPRCreator', () => {
    it('should return PR creator username', () => {
      const creator = githubClient.getPRCreator()
      expect(creator).toBe('test-author')
    })
  })

  describe('validatePRContext', () => {
    it('should return true when PR context is valid', () => {
      const isValid = githubClient.validatePRContext()
      expect(isValid).toBe(true)
    })
  })
})
