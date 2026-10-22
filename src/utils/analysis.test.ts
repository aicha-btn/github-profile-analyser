import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoAnalysis } from '../data/demoAnalysis'
import {
  createGithubRepoWithReadme,
  createGithubUser,
} from '../test/fixtures'
import { analyzeRepos, isRecentlyUpdated } from './analyzeRepos'
import { calculateScore } from './calculateScore'
import { generateRecommendations } from './generateRecommendations'
import { portfolioAnalysisSchema } from './githubValidation'

describe('analysis and scoring', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-22T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('recognizes a recent valid update date', () => {
    expect(isRecentlyUpdated('2026-10-01T12:00:00Z')).toBe(true)
  })

  it('does not mark an old update date as recent', () => {
    expect(isRecentlyUpdated('2025-01-01T12:00:00Z')).toBe(false)
  })

  it('does not award recent activity to a future date', () => {
    expect(isRecentlyUpdated('2027-01-01T12:00:00Z')).toBe(false)
  })

  it('does not award recent activity to an invalid date', () => {
    expect(isRecentlyUpdated('not-a-date')).toBe(false)
  })

  it('keeps invalid and future dates finite and free of activity bonuses', () => {
    const summary = analyzeRepos([
      createGithubRepoWithReadme(1, { updated_at: 'not-a-date' }),
      createGithubRepoWithReadme(2, { updated_at: '2027-10-22T12:00:00Z' }),
    ])

    expect(summary.overallRecentlyUpdatedCount).toBe(0)
    expect(summary.analyzedRepos.every((repo) => Number.isFinite(repo.selectionScore))).toBe(true)
  })

  it('keeps all score categories within their documented maxima', () => {
    const summary = analyzeRepos([
      createGithubRepoWithReadme(1),
      createGithubRepoWithReadme(2),
      createGithubRepoWithReadme(3),
    ])
    const score = calculateScore(createGithubUser(), summary, 'alternance-frontend')

    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(score.categories.map((category) => category.maxScore)).toEqual([20, 30, 25, 15, 10])
    expect(score.categories.reduce((total, category) => total + category.maxScore, 0)).toBe(100)
    expect(
      score.categories.every(
        (category) =>
          Number.isFinite(category.score) &&
          category.score >= 0 &&
          category.score <= category.maxScore,
      ),
    ).toBe(true)
  })

  it('is deterministic for the same data and reference time', () => {
    const user = createGithubUser()
    const summary = analyzeRepos([createGithubRepoWithReadme()])

    expect(calculateScore(user, summary, 'junior-react')).toEqual(
      calculateScore(user, summary, 'junior-react'),
    )
  })

  it('produces coherent recommendations for an incomplete profile', () => {
    const user = createGithubUser({ bio: null, blog: '' })
    const summary = analyzeRepos([])
    const recommendations = generateRecommendations(
      user,
      summary,
      calculateScore(user, summary, 'alternance-frontend'),
      'alternance-frontend',
    )

    expect(recommendations.improvements.some((message) => message.includes('bio'))).toBe(true)
    expect(recommendations.improvements.some((message) => message.includes('portfolio'))).toBe(
      true,
    )
  })

  it('distinguishes a real missing README from quick mode without README inspection', () => {
    const user = createGithubUser()
    const missingReadmeSummary = analyzeRepos(
      [createGithubRepoWithReadme(1, { hasReadme: false, readmeContent: null })],
      { readmeStrategy: 'top-ranked', readmeInspectedRepoCount: 1, readmeInspectionLimit: 5 },
    )
    const quickSummary = analyzeRepos(
      [createGithubRepoWithReadme(1, { hasReadme: false, readmeContent: null })],
      { readmeStrategy: 'none', readmeInspectedRepoCount: 0, readmeInspectionLimit: 0 },
    )
    const missingRecommendations = generateRecommendations(
      user,
      missingReadmeSummary,
      calculateScore(user, missingReadmeSummary, 'alternance-frontend'),
      'alternance-frontend',
    )
    const quickRecommendations = generateRecommendations(
      user,
      quickSummary,
      calculateScore(user, quickSummary, 'alternance-frontend'),
      'alternance-frontend',
    )

    expect(missingRecommendations.improvements.some((message) => message.includes('README'))).toBe(
      true,
    )
    expect(quickRecommendations.improvements.some((message) => message.includes('README'))).toBe(
      false,
    )
  })

  it('keeps the demo fixture compatible with schemas and product invariants', () => {
    const demo = createDemoAnalysis('fictional-demo-user')

    expect(portfolioAnalysisSchema.safeParse(demo).success).toBe(true)
    expect(demo.score.total).toBeGreaterThanOrEqual(0)
    expect(demo.score.total).toBeLessThanOrEqual(100)
    expect(demo.repoSummary.analyzedRepoCount).toBe(demo.repoSummary.analyzedRepos.length)
    expect(demo.repoSummary.totalRepoCount).toBe(demo.user.public_repos)
    expect(demo.repoSummary.readmeInspectedRepoCount).toBeLessThanOrEqual(5)
    expect(demo.repoSummary.paginationTruncated).toBe(false)
  })
})
