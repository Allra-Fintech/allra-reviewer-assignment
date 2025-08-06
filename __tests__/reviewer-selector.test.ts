/**
 * Unit tests for reviewer-selector.ts
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

// Mock modules
jest.unstable_mockModule('@actions/core', () => core)
jest.unstable_mockModule('js-yaml', () => ({
  load: jest.fn()
}))
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn()
}))

const { ReviewerSelector } = await import('../src/reviewer-selector.js')
const yaml = await import('js-yaml')
const fs = await import('fs')

describe('ReviewerSelector', () => {
  let reviewerSelector: ReviewerSelector
  const mockConfigPath = '.github/reviewers.yml'

  beforeEach(() => {
    reviewerSelector = new ReviewerSelector(mockConfigPath)
    jest.resetAllMocks()
  })

  describe('selectRandomReviewers', () => {
    it('should exclude PR creator from selection', () => {
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' },
        { githubName: 'reviewer2', slackMention: '<@U456>' },
        { githubName: 'pr-author' }
      ]

      ;(fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content')
      ;(yaml.load as jest.Mock).mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(2, 'pr-author')

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.githubName !== 'pr-author')).toBe(true)
    })

    it('should return all candidates when count is greater than available', () => {
      const mockReviewers = [
        { githubName: 'reviewer1' },
        { githubName: 'reviewer2' }
      ]

      ;(fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content')
      ;(yaml.load as jest.Mock).mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(5, 'pr-author')

      expect(result).toHaveLength(2)
      expect(core.info).toHaveBeenCalledWith(
        'Only 2 reviewers available, selecting all'
      )
    })

    it('should return empty array when no reviewers available', () => {
      ;(fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content')
      ;(yaml.load as jest.Mock).mockReturnValue({ reviewers: [] })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(core.warning).toHaveBeenCalledWith(
        'No available reviewers after filtering PR creator'
      )
    })

    it('should return only non-PR-author reviewers when PR author is in list', () => {
      const mockReviewers = [{ githubName: 'pr-author' }]

      ;(fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content')
      ;(yaml.load as jest.Mock).mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(core.warning).toHaveBeenCalledWith(
        'No available reviewers after filtering PR creator'
      )
    })

    it('should handle file read errors gracefully', () => {
      ;(fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(core.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to load reviewers config/)
      )
    })

    it('should handle yaml parsing errors gracefully', () => {
      ;(fs.readFileSync as jest.Mock).mockReturnValue('invalid yaml')
      ;(yaml.load as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid YAML')
      })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(core.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to load reviewers config/)
      )
    })

    it('should return correct number of reviewers when enough candidates', () => {
      const mockReviewers = [
        { githubName: 'reviewer1' },
        { githubName: 'reviewer2' },
        { githubName: 'reviewer3' },
        { githubName: 'reviewer4' },
        { githubName: 'reviewer5' }
      ]

      ;(fs.readFileSync as jest.Mock).mockReturnValue('mock yaml content')
      ;(yaml.load as jest.Mock).mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(3)
    })
  })
})
