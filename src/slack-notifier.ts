import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
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

  async sendReviewerNotification(reviewers: Reviewer[]) {
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

      const result = await this.sendWebhookRequest(payload)
      core.info('Slack webhook notification sent successfully')
      return result
    } catch (error) {
      core.warning(`Failed to send Slack webhook notification: ${error}`)
    }
  }

  private sendWebhookRequest(payload: SlackMessage) {
    return axios
      .post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then((body) => {
        core.info('Slack notification sent successfully')
        return body.data
      })
      .catch((error) => {
        core.warning(`Error sending Slack notification: ${error.message}`)
      })
  }
}
