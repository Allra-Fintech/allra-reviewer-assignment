export interface Reviewer {
  githubName: string
  slackMention?: string
}

export interface ReviewerConfig {
  reviewers?: Reviewer[]
  fixedReviewers?: Reviewer[]
  // GitHub 아이디 ↔ Slack 멘션 매핑 (담당자 표시용, 리뷰어 배정에는 쓰지 않음)
  members?: Reviewer[]
}

export interface SlackMessage {
  text: string
}

export type SupportedLanguage = 'ko' | 'en'

export interface MessageTemplates {
  assignmentHeader: string
  prTitleLabel: string
  authorLabel: string
  repositoryLabel: string
}
