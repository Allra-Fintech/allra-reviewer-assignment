import * as core from '@actions/core'
import * as github from '@actions/github'
import type { Reviewer } from './types.js'

export class GitHubClient {
  private octokit: ReturnType<typeof github.getOctokit>

  constructor(token: string) {
    this.octokit = github.getOctokit(token)
  }

  async assignReviewers(reviewers: Reviewer[]): Promise<void> {
    const reviewerNames = reviewers.map((r) => r.githubName)

    await this.octokit.rest.pulls.requestReviewers({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request!.number,
      reviewers: reviewerNames
    })

    core.info(`Assigned reviewers: ${reviewerNames.join(', ')}`)
    core.setOutput('assigned-reviewers', reviewerNames.join(','))
  }

  getPRCreator(): string | undefined {
    return github.context.payload.pull_request?.user?.login
  }

  validatePRContext(): boolean {
    const prNumber = github.context.payload.pull_request?.number
    if (!prNumber) {
      core.error('This action can only be run on pull request events')
      return false
    }
    return true
  }
}
