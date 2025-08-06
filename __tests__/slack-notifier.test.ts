/**
 * Unit tests for slack-notifier.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock modules
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('@actions/github', () => ({
  context: {
    payload: {
      pull_request: {
        html_url: 'https://github.com/test-owner/test-repo/pull/123',
        title: 'Test PR Title',
        user: { login: 'test-author' }
      }
    }
  }
}))

const mockRequest = jest.fn()
jest.unstable_mockModule('https', () => ({
  default: {
    request: mockRequest
  }
}))

const { SlackNotifier } = await import('../src/slack-notifier.js')

describe('SlackNotifier', () => {
  let slackNotifier: SlackNotifier
  const mockWebhookUrl = 'https://hooks.slack.com/services/TEST/WEBHOOK/URL'

  beforeEach(() => {
    slackNotifier = new SlackNotifier(mockWebhookUrl)
    jest.resetAllMocks()
  })

  describe('sendReviewerNotification', () => {
    it('should send notification with reviewer mentions', async () => {
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' },
        { githubName: 'reviewer2', slackMention: '<@U456>' },
        { githubName: 'reviewer3' }
      ]

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler('')
          if (event === 'end') handler()
        })
      }

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      }

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse)
        return mockReq
      })

      await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: 'hooks.slack.com',
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        }),
        expect.any(Function)
      )

      expect(mockReq.write).toHaveBeenCalledWith(
        expect.stringContaining('<@U123> <@U456>')
      )
      expect(core.info).toHaveBeenCalledWith(
        'Slack webhook notification sent successfully'
      )
    })

    it('should send notification without mentions when no slack mentions', async () => {
      const mockReviewers = [
        { githubName: 'reviewer1' },
        { githubName: 'reviewer2' }
      ]

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler('')
          if (event === 'end') handler()
        })
      }

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      }

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse)
        return mockReq
      })

      await slackNotifier.sendReviewerNotification(mockReviewers)

      const writtenData = (mockReq.write as jest.Mock).mock.calls[0][0]
      const payload = JSON.parse(writtenData)

      expect(payload.text).toContain('리뷰어로 할당되었습니다!!')
      expect(payload.text).toContain('• PR 제목: Test PR Title')
      expect(payload.text).toContain('• 담당자: test-author')
      expect(payload.text).toContain('• 리뷰어: reviewer1, reviewer2')
      expect(payload.text).not.toContain('<@')
    })

    it('should handle HTTP errors gracefully', async () => {
      const mockReviewers = [{ githubName: 'reviewer1' }]

      const mockResponse = {
        statusCode: 500,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler('Internal Server Error')
          if (event === 'end') handler()
        })
      }

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      }

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse)
        return mockReq
      })

      await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to send Slack webhook notification/)
      )
    })

    it('should handle network errors gracefully', async () => {
      const mockReviewers = [{ githubName: 'reviewer1' }]

      const mockReq = {
        on: jest.fn((event: string, handler: (error?: Error) => void) => {
          if (event === 'error') {
            handler(new Error('Network error'))
          }
        }),
        write: jest.fn(),
        end: jest.fn()
      }

      mockRequest.mockImplementation(() => mockReq)

      await slackNotifier.sendReviewerNotification(mockReviewers)

      expect(core.warning).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to send Slack webhook notification/)
      )
    })

    it('should format message correctly with all PR details', async () => {
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' }
      ]

      const mockResponse = {
        statusCode: 200,
        on: jest.fn((event: string, handler: (data?: string) => void) => {
          if (event === 'data') handler('')
          if (event === 'end') handler()
        })
      }

      const mockReq = {
        on: jest.fn(),
        write: jest.fn(),
        end: jest.fn()
      }

      mockRequest.mockImplementation((options, callback) => {
        callback(mockResponse)
        return mockReq
      })

      await slackNotifier.sendReviewerNotification(mockReviewers)

      const writtenData = (mockReq.write as jest.Mock).mock.calls[0][0]
      const payload = JSON.parse(writtenData)

      expect(payload.text).toContain('<@U123>')
      expect(payload.text).toContain('리뷰어로 할당되었습니다!!')
      expect(payload.text).toContain('• PR 제목: Test PR Title')
      expect(payload.text).toContain('• 담당자: test-author')
      expect(payload.text).toContain('• 리뷰어: reviewer1')
      expect(payload.text).toContain(
        '• 리뷰하러 가기 >> https://github.com/test-owner/test-repo/pull/123'
      )
    })
  })
})
