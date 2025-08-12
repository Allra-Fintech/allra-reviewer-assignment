import type { SupportedLanguage, MessageTemplates } from './types.js'

export const slackMessageTemplates: Record<
  SupportedLanguage,
  MessageTemplates
> = {
  ko: {
    assignmentHeader: '리뷰어로 할당되었습니다!!',
    prTitleLabel: 'PR 제목',
    authorLabel: '담당자',
    repositoryLabel: '저장소'
  },
  en: {
    assignmentHeader: 'You have been assigned as reviewers!!',
    prTitleLabel: 'PR Title',
    authorLabel: 'Author',
    repositoryLabel: 'Repository'
  }
}
