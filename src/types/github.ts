export interface GithubOwner {
  login: string
}

export interface GithubUser {
  login: string
  name: string | null
  avatar_url: string
  bio: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
  html_url: string
  blog: string
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  homepage: string | null
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
  fork: boolean
  archived: boolean
  owner: GithubOwner
}

export interface GithubRepoWithReadme extends GithubRepo {
  hasReadme: boolean
  readmeContent: string | null
}

export interface ReadmeSignals {
  hasImportantSections: boolean
  hasInstallation: boolean
  hasTechStack: boolean
  hasFeatures: boolean
  hasScreenshots: boolean
  hasDemoLink: boolean
  hasFutureImprovements: boolean
}

export interface ReadmeAnalysis {
  score: number
  maxScore: number
  level: 'README basique' | 'README correct' | 'README professionnel'
  analyzed: boolean
  signals: ReadmeSignals
}

export interface AnalyzedRepo extends GithubRepoWithReadme {
  hasDemo: boolean
  hasReadableName: boolean
  hasClearDescription: boolean
  isRecentlyUpdated: boolean
  seemsRealProject: boolean
  detectedKeywords: string[]
  selectionLabel: string
  selectionScore: number
  readmeAnalysis: ReadmeAnalysis
}

export interface LanguageStat {
  name: string
  repoCount: number
}

export interface RepoAnalysisSummary {
  analyzedRepos: AnalyzedRepo[]
  analyzedRepoCount: number
  totalRepoCount: number
  paginationTruncated: boolean
  readmeStrategy: 'none' | 'top-ranked'
  readmeInspectedRepoCount: number
  readmeInspectionLimit: number
  reposWithDescription: number
  reposWithReadme: number
  analyzedReadmeCount: number
  readmeAverageScore: number
  readmeProfessionalCount: number
  reposWithDemo: number
  readableNamesCount: number
  clearDescriptionsCount: number
  realProjectCount: number
  standoutProjectsCount: number
  analyzedRecentlyUpdatedCount: number
  overallRecentlyUpdatedCount: number
  languageDiversityCount: number
  languages: string[]
  languageStats: LanguageStat[]
  modernTechSignals: string[]
}

export interface ScoreCategory {
  label: string
  score: number
  maxScore: number
  description: string
}

export interface ScoreResult {
  total: number
  categories: ScoreCategory[]
}

export interface RecommendationGroups {
  strengths: string[]
  improvements: string[]
  checklist: string[]
}

export type AnalysisDepth = 'quick' | 'deep'

export interface AnalysisMetadata {
  depth: AnalysisDepth
  fromCache: boolean
  cachedAt: string | null
}

export interface PortfolioAnalysis {
  user: GithubUser
  repoSummary: RepoAnalysisSummary
  score: ScoreResult
  recommendations: RecommendationGroups
  metadata: AnalysisMetadata
  source: 'github' | 'demo'
}

export type FetchStatus = 'idle' | 'loading' | 'success' | 'error'
export type AnalysisMode = 'github' | 'demo'
export type RecruiterGoal =
  | 'alternance-frontend'
  | 'alternance-fullstack'
  | 'stage-developpeur-web'
  | 'junior-react'
