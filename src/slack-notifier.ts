import * as core from '@actions/core'
import * as github from '@actions/github'
import https from 'https'
import type {
  Reviewer,
  SlackMessage,
  SupportedLanguage,
  MessageTemplates
} from './types.js'

export class SlackNotifier {
  private messageTemplates: Record<SupportedLanguage, MessageTemplates> = {
    ko: {
      assignmentHeader: '리뷰어로 할당되었습니다!!',
      prTitleLabel: 'PR 제목',
      authorLabel: '담당자',
      reviewersLabel: '리뷰어',
      reviewLinkLabel: '리뷰하러 가기'
    },
    en: {
      assignmentHeader: 'You have been assigned as reviewers!!',
      prTitleLabel: 'PR Title',
      authorLabel: 'Author',
      reviewersLabel: 'Reviewers',
      reviewLinkLabel: 'Review PR'
    }
  }

  constructor(
    private webhookUrl: string,
    private language: SupportedLanguage = 'ko'
  ) {}

  async sendReviewerNotification(reviewers: Reviewer[]): Promise<void> {
    try {
      const prUrl = github.context.payload.pull_request?.html_url
      const prTitle = github.context.payload.pull_request?.title
      const prAuthor = github.context.payload.pull_request?.user?.login

      // 멘션할 리뷰어들 목록 생성
      const mentions = reviewers
        .filter((r) => r.slackMention)
        .map((r) => r.slackMention)
        .join(' ')

      const reviewerList = reviewers.map((r) => r.githubName).join(', ')
      const templates = this.messageTemplates[this.language]

      const payload: SlackMessage = {
        text:
          (mentions ? `${mentions}\n` : '') +
          `${templates.assignmentHeader} \n` +
          `• ${templates.prTitleLabel}: ${prTitle}\n` +
          `• ${templates.authorLabel}: ${prAuthor}\n` +
          `• ${templates.reviewersLabel}: ${reviewerList}\n` +
          `• ${templates.reviewLinkLabel} >> ${prUrl}`
      }

      await this.sendWebhookRequest(payload)
      core.info('Slack webhook notification sent successfully')
    } catch (error) {
      core.warning(`Failed to send Slack webhook notification: ${error}`)
    }
  }

  private sendWebhookRequest(payload: SlackMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload)
      const parsedUrl = new URL(this.webhookUrl)

      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 443,
        path: parsedUrl.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      }

      const req = https.request(options, (res) => {
        let responseData = ''
        res.on('data', (chunk) => {
          responseData += chunk
        })
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve()
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`))
          }
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(data)
      req.end()
    })
  }
}
