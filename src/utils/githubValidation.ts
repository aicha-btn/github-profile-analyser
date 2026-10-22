import { z } from 'zod'
import type { GithubRepo, GithubUser, PortfolioAnalysis } from '../types/github'

const isoDateTimeSchema = z.string().datetime({ offset: true })
const nonNegativeIntegerSchema = z.number().int().nonnegative()

export const githubUserSchema = z.object({
  login: z.string().min(1),
  name: z.string().nullable(),
  avatar_url: z.string().url(),
  bio: z.string().nullable(),
  public_repos: nonNegativeIntegerSchema,
  followers: nonNegativeIntegerSchema,
  following: nonNegativeIntegerSchema,
  created_at: isoDateTimeSchema,
  html_url: z.string().url(),
  blog: z
    .string()
    .nullable()
    .transform((value) => value ?? ''),
})

export const githubRepoSchema = z.object({
  id: nonNegativeIntegerSchema,
  name: z.string().min(1),
  full_name: z.string().min(1),
  description: z.string().nullable(),
  html_url: z.string().url(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  stargazers_count: nonNegativeIntegerSchema,
  forks_count: nonNegativeIntegerSchema,
  updated_at: isoDateTimeSchema,
  fork: z.boolean(),
  archived: z.boolean(),
  owner: z.object({
    login: z.string().min(1),
  }),
})

export const githubRepoListSchema = z.array(githubRepoSchema)

export const githubReadmeSchema = z.object({
  content: z.string(),
  encoding: z.string(),
})

const readmeSignalsSchema = z.object({
  hasImportantSections: z.boolean(),
  hasInstallation: z.boolean(),
  hasTechStack: z.boolean(),
  hasFeatures: z.boolean(),
  hasScreenshots: z.boolean(),
  hasDemoLink: z.boolean(),
  hasFutureImprovements: z.boolean(),
})

const readmeAnalysisSchema = z.object({
  score: nonNegativeIntegerSchema,
  maxScore: nonNegativeIntegerSchema,
  level: z.enum(['README basique', 'README correct', 'README professionnel']),
  analyzed: z.boolean(),
  signals: readmeSignalsSchema,
})

const analyzedRepoSchema = githubRepoSchema.extend({
  hasReadme: z.boolean(),
  readmeContent: z.string().nullable(),
  hasDemo: z.boolean(),
  hasReadableName: z.boolean(),
  hasClearDescription: z.boolean(),
  isRecentlyUpdated: z.boolean(),
  seemsRealProject: z.boolean(),
  detectedKeywords: z.array(z.string()),
  selectionLabel: z.string(),
  selectionScore: z.number().finite(),
  readmeAnalysis: readmeAnalysisSchema,
})

const repoAnalysisSummarySchema = z.object({
  analyzedRepos: z.array(analyzedRepoSchema),
  analyzedRepoCount: nonNegativeIntegerSchema,
  totalRepoCount: nonNegativeIntegerSchema,
  paginationTruncated: z.boolean(),
  readmeStrategy: z.enum(['none', 'top-ranked']),
  readmeInspectedRepoCount: nonNegativeIntegerSchema,
  readmeInspectionLimit: nonNegativeIntegerSchema,
  reposWithDescription: nonNegativeIntegerSchema,
  reposWithReadme: nonNegativeIntegerSchema,
  analyzedReadmeCount: nonNegativeIntegerSchema,
  readmeAverageScore: nonNegativeIntegerSchema,
  readmeProfessionalCount: nonNegativeIntegerSchema,
  reposWithDemo: nonNegativeIntegerSchema,
  readableNamesCount: nonNegativeIntegerSchema,
  clearDescriptionsCount: nonNegativeIntegerSchema,
  realProjectCount: nonNegativeIntegerSchema,
  standoutProjectsCount: nonNegativeIntegerSchema,
  analyzedRecentlyUpdatedCount: nonNegativeIntegerSchema,
  overallRecentlyUpdatedCount: nonNegativeIntegerSchema,
  languageDiversityCount: nonNegativeIntegerSchema,
  languages: z.array(z.string()),
  languageStats: z.array(
    z.object({
      name: z.string(),
      repoCount: nonNegativeIntegerSchema,
    }),
  ),
  modernTechSignals: z.array(z.string()),
})

const scoreResultSchema = z.object({
  total: z.number().finite().min(0).max(100),
  categories: z.array(
    z.object({
      label: z.string(),
      score: z.number().finite().nonnegative(),
      maxScore: z.number().finite().positive(),
      description: z.string(),
    }),
  ),
})

const recommendationsSchema = z.object({
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  checklist: z.array(z.string()),
})

export const portfolioAnalysisSchema = z.object({
  user: githubUserSchema,
  repoSummary: repoAnalysisSummarySchema,
  score: scoreResultSchema,
  recommendations: recommendationsSchema,
  metadata: z.object({
    depth: z.enum(['quick', 'deep']),
    fromCache: z.boolean(),
    cachedAt: isoDateTimeSchema.nullable(),
  }),
  source: z.enum(['github', 'demo']),
})

export function parseGithubUser(payload: unknown): GithubUser {
  return githubUserSchema.parse(payload)
}

export function parseGithubRepos(payload: unknown): GithubRepo[] {
  return githubRepoListSchema.parse(payload)
}

export function parsePortfolioAnalysis(payload: unknown): PortfolioAnalysis {
  return portfolioAnalysisSchema.parse(payload)
}
