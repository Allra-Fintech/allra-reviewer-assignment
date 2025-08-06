import * as core from '@actions/core'
import { ReviewerSelector } from './reviewer-selector.js'
import { SlackNotifier } from './slack-notifier.js'
import { GitHubClient } from './github-client.js'
import type { SupportedLanguage } from './types.js'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // 입력 파라미터 읽기
    const githubToken = core.getInput('github-token')
    const slackWebhookUrl = core.getInput('slack-webhook-url')
    const reviewersConfigPath = core.getInput('reviewers-config-path')
    const maxReviewers = parseInt(core.getInput('max-reviewers'), 10)
    const language = core.getInput('language') as SupportedLanguage

    // 필수 파라미터 검증
    if (!githubToken) {
      core.setFailed('GitHub token is required')
      return
    }

    // GitHub 클라이언트 초기화 및 컨텍스트 검증
    const githubClient = new GitHubClient(githubToken)
    if (!githubClient.validatePRContext()) {
      return
    }

    const prCreator = githubClient.getPRCreator()
    if (!prCreator) {
      core.warning('Could not determine PR creator')
      return
    }

    // 리뷰어 선택
    const reviewerSelector = new ReviewerSelector(reviewersConfigPath)
    const selectedReviewers = reviewerSelector.selectRandomReviewers(
      maxReviewers,
      prCreator
    )

    if (selectedReviewers.length === 0) {
      core.info('No available reviewers found')
      return
    }

    // GitHub에 리뷰어 할당
    await githubClient.assignReviewers(selectedReviewers)

    // Slack 알림 전송 (선택사항)
    if (slackWebhookUrl) {
      const slackNotifier = new SlackNotifier(slackWebhookUrl, language || 'ko')
      await slackNotifier.sendReviewerNotification(selectedReviewers)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`)
    } else {
      core.setFailed('Action failed: Unknown error')
    }
  }
}
