import * as core from '@actions/core'
import * as github from '@actions/github'
import axios from 'axios'
import { slackMessageTemplates } from './message-templates.js'
import type { Reviewer, SlackMessage, SupportedLanguage } from './types.js'

export class SlackNotifier {
  constructor(
    private webhookUrl: string,
    private language: SupportedLanguage = 'ko'
  ) {}

  async sendReviewerNotification(reviewers: Reviewer[]) {
    try {
      const prUrl = github.context.payload.pull_request?.html_url
      const prTitle = github.context.payload.pull_request?.title
      const prAuthor = github.context.payload.pull_request?.user?.login
      const { owner, repo } = github.context.repo

      // 멘션할 리뷰어들 목록 생성
      const mentions = reviewers
        .filter((r) => r.slackMention)
        .map((r) => r.slackMention)
        .join(' ')

      const templates = slackMessageTemplates[this.language]

      const payload: SlackMessage = {
        text:
          (mentions ? `${mentions}\n` : '') +
          `${templates.assignmentHeader} \n` +
          `• ${templates.prTitleLabel}: <${prUrl}|${prTitle}>\n` +
          `• ${templates.authorLabel}: ${prAuthor}\n` +
          `• ${templates.repositoryLabel}: <https://github.com/${owner}/${repo}|${repo}>`
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
