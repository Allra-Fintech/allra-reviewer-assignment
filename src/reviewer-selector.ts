import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import { readFileSync } from 'fs'
import type { Reviewer, ReviewerConfig } from './types.js'

export class ReviewerSelector {
  constructor(private configPath: string) {}

  selectRandomReviewers(count: number, prCreator: string): Reviewer[] {
    const candidates = this.getCandidates().filter(
      (person) => person.githubName !== prCreator
    )

    if (candidates.length === 0) {
      core.warning('No available reviewers after filtering PR creator')
      return []
    }

    // 후보자가 요청된 수보다 적으면 모든 후보자 선택
    if (candidates.length <= count) {
      core.info(`Only ${candidates.length} reviewers available, selecting all`)
      return candidates
    }

    // Fisher-Yates 셔플 알고리즘으로 랜덤 선택
    const shuffled = [...candidates]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled.slice(0, count)
  }

  private getCandidates(): Reviewer[] {
    try {
      const configFile = readFileSync(this.configPath, 'utf8')
      const config = yaml.load(configFile) as ReviewerConfig
      return config.reviewers || []
    } catch (error) {
      core.error(`Failed to load reviewers config: ${error}`)
      return []
    }
  }
}
