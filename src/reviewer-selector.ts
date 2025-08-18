import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import { readFileSync } from 'fs'
import type { Reviewer, ReviewerConfig } from './types.js'

export class ReviewerSelector {
  constructor(private configPath: string) {}

  selectRandomReviewers(count: number, prCreator: string): Reviewer[] {
    const candidates = this.getCandidates()
    const fixedReviewers = this.filterCreatorFromReviewers(
      [prCreator],
      candidates.fixedReviewers
    )
    const reviewers = this.filterCreatorFromReviewers(
      [prCreator, ...fixedReviewers.map((r) => r.githubName)],
      candidates.reviewers
    )

    const totalReviewersCount = reviewers.length + fixedReviewers.length

    if (totalReviewersCount <= 0) {
      core.warning('No available reviewers after filtering PR creator')
      return []
    }

    // 후보자가 요청된 수보다 적으면 모든 후보자 선택
    if (totalReviewersCount <= count) {
      core.info(
        `Only ${totalReviewersCount} reviewers available, selecting all`
      )
      return [...fixedReviewers, ...reviewers]
    }

    // 지정한 수 보다 고정 리뷰어가 많으면 고정 리뷰어만 선택
    const remainingCount = count - fixedReviewers.length
    if (remainingCount <= 0) {
      core.info(
        `All ${fixedReviewers.length} reviewers are fixed, no random selection needed`
      )
      return [...fixedReviewers]
    }

    // Fisher-Yates 셔플 알고리즘으로 랜덤 선택
    const targets = [...reviewers]
    for (let i = targets.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[targets[i], targets[j]] = [targets[j], targets[i]]
    }

    // 전체 리뷰어 수에서 고정 리뷰어 수를 제외한 나머지 리뷰어 중에서 랜덤하게 선택
    const shuffled = targets.slice(0, remainingCount)

    // 고정 리뷰어와 랜덤으로 선택된 리뷰어를 합쳐서 반환
    return [...fixedReviewers, ...shuffled]
  }

  private getCandidates(): ReviewerConfig {
    try {
      const configFile = readFileSync(this.configPath, 'utf8')
      const config = yaml.load(configFile) as ReviewerConfig
      const reviewers = this.dedupe(this.asArray(config.reviewers))
      const fixedReviewers = this.dedupe(this.asArray(config.fixedReviewers))
      return { reviewers, fixedReviewers }
    } catch (error) {
      core.error(`Failed to load reviewers config: ${error}`)
      return {
        reviewers: [],
        fixedReviewers: []
      }
    }
  }

  private filterCreatorFromReviewers(
    filterTargets: string[],
    reviewers?: Reviewer[]
  ): Reviewer[] {
    const exclude = new Set(filterTargets.map((s) => s.toLowerCase()))
    return (
      reviewers?.filter((person) => {
        const name = person?.githubName
        return typeof name === 'string' && !exclude.has(name.toLowerCase())
      }) || []
    )
  }

  // Normalize, validate shape, and de-duplicate by githubName (case-insensitive)
  private asArray = (arr: unknown): Reviewer[] =>
    Array.isArray(arr) ? (arr as Reviewer[]) : []

  private dedupe = (arr: Reviewer[]): Reviewer[] => {
    const seen = new Set<string>()
    return arr.filter((r) => {
      const name = r?.githubName
      if (typeof name !== 'string' || name.length === 0) return false
      const key = name.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
}
