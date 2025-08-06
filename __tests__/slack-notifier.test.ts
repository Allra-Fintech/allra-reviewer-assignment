/**
 * Unit tests for slack-notifier.ts
 */
import { jest } from '@jest/globals'
import axios from 'axios'
import mockAdapter from 'axios-mock-adapter'

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

const mockGithubContext = {
  context: {
    payload: {
      pull_request: {
        html_url: 'https://github.com/test-owner/test-repo/pull/123',
        title: 'Test PR Title',
        user: { login: 'test-author' }
      }
    }
  }
}

jest.unstable_mockModule('@actions/core', () => mockCore)
jest.unstable_mockModule('@actions/github', () => mockGithubContext)

// Now import the module under test
const { SlackNotifier } = await import('../src/slack-notifier.js')

describe('SlackNotifier', () => {
  let slackNotifier: InstanceType<typeof SlackNotifier>
  const mockWebhookUrl = 'https://hooks.slack.com/services/TEST/WEBHOOK/URL'
  let mock: mockAdapter

  beforeAll(() => {
    // Mock axios request
    mock = new mockAdapter(axios)
  })

  afterAll(() => {
    mock.reset()
  })

  beforeEach(() => {
    slackNotifier = new SlackNotifier(mockWebhookUrl, 'ko')
    jest.clearAllMocks()
  })

  describe('sendReviewerNotification', () => {
    it('should send notification with reviewer mentions', async () => {
      mock.onPost(mockWebhookUrl).reply(200, 'success')
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' },
        { githubName: 'reviewer2', slackMention: '<@U456>' },
        { githubName: 'reviewer3' }
      ]

      const result = await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(result).toEqual('success')

      expect(mockCore.info).toHaveBeenCalledWith(
        'Slack webhook notification sent successfully'
      )
    })

    it('should send notification without mentions when no slack mentions', async () => {
      mock.onPost(mockWebhookUrl).reply(200, 'success')
      const mockReviewers = [
        { githubName: 'reviewer1' },
        { githubName: 'reviewer2' }
      ]

      const result = await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(result).toEqual('success')

      expect(mockCore.info).toHaveBeenCalledWith(
        'Slack webhook notification sent successfully'
      )
    })

    it('should handle HTTP errors gracefully', async () => {
      mock.onPost(mockWebhookUrl).reply(500, 'Internal Server Error')
      const mockReviewers = [{ githubName: 'reviewer1' }]

      await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(mockCore.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Error sending Slack notification/)
      )
    })

    it('should handle network errors gracefully', async () => {
      jest.spyOn(axios, 'post').mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network error')), 100)
        })
      })
      const mockReviewers = [{ githubName: 'reviewer1' }]

      await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(mockCore.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Error sending Slack notification/)
      )
    })
  })
})
