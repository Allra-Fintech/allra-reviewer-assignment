export interface Reviewer {
  githubName: string
  slackMention?: string
}

export interface ReviewerConfig {
  reviewers: Reviewer[]
}

export interface SlackMessage {
  text: string
}
