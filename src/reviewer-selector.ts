import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import { readFileSync } from 'node:fs'
import type { Reviewer, ReviewerConfig } from './types.js'

export class ReviewerSelector {
  constructor(private configPath: string) {}

  selectRandomReviewers(count: number, prCreator: string): Reviewer[] {
    const candidates = this.getCandidates()
    const reviewers = candidates.reviewers?.filter(
      (person) => person.githubName !== prCreator
    ) || []
    const fixedReviewers = candidates.fixedReviewers || []
    const totalReviewersCount = reviewers.length + fixedReviewers.length

    if (totalReviewersCount <= 0) {
      core.warning('No available reviewers after filtering PR creator')
      return []
    }

    // 후보자가 요청된 수보다 적으면 모든 후보자 선택
    if (totalReviewersCount <= count) {
      core.info(`Only ${totalReviewersCount} reviewers available, selecting all`)
      return [...reviewers, ...fixedReviewers]
    }

    // Fisher-Yates 셔플 알고리즘으로 랜덤 선택
    const targets = [...reviewers]
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[targets[i], targets[j]] = [targets[j], targets[i]]
    }

    const shuffled = targets.slice(0, count - fixedReviewers.length)

    return [
      ...fixedReviewers,
      ...shuffled,
    ]
  }

  private getCandidates(): ReviewerConfig {
    try {
      const configFile = readFileSync(this.configPath, 'utf8')
      const config = yaml.load(configFile) as ReviewerConfig
      return {
        reviewers: config.reviewers || [],
        fixedReviewers: config.fixedReviewers || []
      }
    } catch (error) {
      core.error(`Failed to load reviewers config: ${error}`)
      return {
        reviewers: [],
        fixedReviewers: []
      }
    }
  }
}
