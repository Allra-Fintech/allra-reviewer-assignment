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

export type SupportedLanguage = 'ko' | 'en'

export interface MessageTemplates {
  assignmentHeader: string
  prTitleLabel: string
  authorLabel: string
  reviewersLabel: string
  reviewLinkLabel: string
}
