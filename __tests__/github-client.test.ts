/**
 * Unit tests for github-client.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock the octokit request method
const mockRequestReviewers = jest.fn()
const mockGetOctokit = jest.fn()

// Mock modules
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
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
}))

const { GitHubClient } = await import('../src/github-client.js')

describe('GitHubClient', () => {
  let githubClient: GitHubClient
  const mockToken = 'test-token'

  beforeEach(() => {
    jest.resetAllMocks()

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

      mockRequestReviewers.mockResolvedValue({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1', 'reviewer2']
      })

      expect(core.info).toHaveBeenCalledWith(
        'Assigned reviewers: reviewer1, reviewer2'
      )
      expect(core.setOutput).toHaveBeenCalledWith(
        'assigned-reviewers',
        'reviewer1,reviewer2'
      )
    })

    it('should handle single reviewer', async () => {
      const mockReviewers = [{ githubName: 'reviewer1' }]

      mockRequestReviewers.mockResolvedValue({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: ['reviewer1']
      })

      expect(core.info).toHaveBeenCalledWith('Assigned reviewers: reviewer1')
      expect(core.setOutput).toHaveBeenCalledWith(
        'assigned-reviewers',
        'reviewer1'
      )
    })

    it('should handle empty reviewers array', async () => {
      const mockReviewers: { githubName: string }[] = []

      mockRequestReviewers.mockResolvedValue({})

      await githubClient.assignReviewers(mockReviewers)

      expect(mockRequestReviewers).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 123,
        reviewers: []
      })

      expect(core.info).toHaveBeenCalledWith('Assigned reviewers: ')
      expect(core.setOutput).toHaveBeenCalledWith('assigned-reviewers', '')
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
