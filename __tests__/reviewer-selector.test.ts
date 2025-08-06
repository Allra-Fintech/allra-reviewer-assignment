/**
 * Unit tests for reviewer-selector.ts
 */
import { jest } from '@jest/globals'

// Mock the modules before importing anything else
const mockCore = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  warning: jest.fn()
}

const mockYamlLoad = jest.fn()
const mockReadFileSync = jest.fn()

jest.unstable_mockModule('@actions/core', () => mockCore)
jest.unstable_mockModule('js-yaml', () => ({
  load: mockYamlLoad
}))
jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync
}))

// Now import the module under test
const { ReviewerSelector } = await import('../src/reviewer-selector.js')

describe('ReviewerSelector', () => {
  let reviewerSelector: InstanceType<typeof ReviewerSelector>
  const mockConfigPath = '.github/reviewers.yml'

  beforeEach(() => {
    reviewerSelector = new ReviewerSelector(mockConfigPath)
    jest.clearAllMocks()
    // Reset mocks to default state
    mockReadFileSync.mockReturnValue('mock yaml content')
    mockYamlLoad.mockReturnValue({ reviewers: [] })
  })

  describe('selectRandomReviewers', () => {
    it('should exclude PR creator from selection', () => {
      const mockReviewers = [
        { githubName: 'reviewer1', slackMention: '<@U123>' },
        { githubName: 'reviewer2', slackMention: '<@U456>' },
        { githubName: 'pr-author' }
      ]

      mockReadFileSync.mockReturnValue('mock yaml content')
      mockYamlLoad.mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(2, 'pr-author')

      expect(result).toHaveLength(2)
      expect(result.every((r) => r.githubName !== 'pr-author')).toBe(true)
    })

    it('should return all candidates when count is greater than available', () => {
      const mockReviewers = [
        { githubName: 'reviewer1' },
        { githubName: 'reviewer2' }
      ]

      mockReadFileSync.mockReturnValue('mock yaml content')
      mockYamlLoad.mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(5, 'pr-author')

      expect(result).toHaveLength(2)
      expect(mockCore.info).toHaveBeenCalledWith(
        'Only 2 reviewers available, selecting all'
      )
    })

    it('should return empty array when no reviewers available', () => {
      mockReadFileSync.mockReturnValue('mock yaml content')
      mockYamlLoad.mockReturnValue({ reviewers: [] })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(mockCore.warning).toHaveBeenCalledWith(
        'No available reviewers after filtering PR creator'
      )
    })

    it('should return only non-PR-author reviewers when PR author is in list', () => {
      const mockReviewers = [{ githubName: 'pr-author' }]

      mockReadFileSync.mockReturnValue('mock yaml content')
      mockYamlLoad.mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(mockCore.warning).toHaveBeenCalledWith(
        'No available reviewers after filtering PR creator'
      )
    })

    it('should handle file read errors gracefully', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('File not found')
      })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(mockCore.error).toHaveBeenCalledWith(
        expect.stringMatching(/Failed to load reviewers config/)
      )
    })

    it('should handle yaml parsing errors gracefully', () => {
      mockReadFileSync.mockReturnValue('invalid yaml')
      mockYamlLoad.mockImplementation(() => {
        throw new Error('Invalid YAML')
      })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(0)
      expect(mockCore.error).toHaveBeenCalledWith(
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

      mockReadFileSync.mockReturnValue('mock yaml content')
      mockYamlLoad.mockReturnValue({ reviewers: mockReviewers })

      const result = reviewerSelector.selectRandomReviewers(3, 'pr-author')

      expect(result).toHaveLength(3)
    })
  })
})
