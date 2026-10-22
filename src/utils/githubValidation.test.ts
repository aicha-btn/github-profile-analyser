import { describe, expect, it } from 'vitest'
import {
  githubReadmeSchema,
  githubRepoSchema,
  githubUserSchema,
  parseGithubRepos,
  parseGithubUser,
  parsePortfolioAnalysis,
  portfolioAnalysisSchema,
} from './githubValidation'
import {
  createGithubRepo,
  createGithubUser,
  createPortfolioAnalysis,
} from '../test/fixtures'

describe('GitHub runtime validation', () => {
  it('accepts a valid GitHub profile', () => {
    expect(parseGithubUser(createGithubUser())).toEqual(createGithubUser())
  })

  it('accepts nullable GitHub profile fields and normalizes a null blog', () => {
    const parsed = githubUserSchema.parse(
      createGithubUser({ name: null, bio: null, blog: null as unknown as string }),
    )

    expect(parsed).toMatchObject({ name: null, bio: null, blog: '' })
  })

  it('rejects a profile with an invalid id-like count type', () => {
    expect(() => parseGithubUser({ ...createGithubUser(), public_repos: '3' })).toThrow()
  })

  it('rejects a profile missing a required field', () => {
    const { login: _login, ...profileWithoutLogin } = createGithubUser()
    void _login

    expect(() => parseGithubUser(profileWithoutLogin)).toThrow()
  })

  it('rejects an empty login', () => {
    expect(() => parseGithubUser(createGithubUser({ login: '' }))).toThrow()
  })

  it('accepts a valid repository', () => {
    expect(githubRepoSchema.parse(createGithubRepo())).toEqual(createGithubRepo())
  })

  it('rejects an invalid repository', () => {
    expect(() => parseGithubRepos([{ ...createGithubRepo(), id: -1 }])).toThrow()
  })

  it('accepts a valid README response', () => {
    expect(githubReadmeSchema.parse({ content: 'IyBEZW1v', encoding: 'base64' })).toEqual({
      content: 'IyBEZW1v',
      encoding: 'base64',
    })
  })

  it('rejects an invalid README response', () => {
    expect(() => githubReadmeSchema.parse({ content: 42, encoding: 'base64' })).toThrow()
  })

  it('accepts a complete valid cached analysis and rejects an invalid one', () => {
    const analysis = createPortfolioAnalysis('deep')

    expect(parsePortfolioAnalysis(analysis)).toEqual(analysis)
    expect(portfolioAnalysisSchema.safeParse({ ...analysis, score: { total: '84' } }).success).toBe(
      false,
    )
  })
})
