import type {
  AnalyzedRepo,
  GithubRepo,
  GithubRepoWithReadme,
  LanguageStat,
  RepoAnalysisSummary,
} from '../types/github'
import { analyzeReadmeContent, createUnavailableReadmeAnalysis } from './analyzeReadme'

const RECENT_ACTIVITY_DAYS = 180

const MODERN_TECH_KEYWORDS = [
  'react',
  'typescript',
  'javascript',
  'api',
  'frontend',
  'node',
  'next',
  'vite',
  'tailwind',
  'css',
]

const VAGUE_REPO_PATTERNS = [
  /^test\d*$/i,
  /^project\d*$/i,
  /^repo\d*$/i,
  /^app\d*$/i,
  /^new[-_]?repo$/i,
  /^demo\d*$/i,
  /^untitled/i,
]

type EnhancedAnalyzedRepo = AnalyzedRepo & {
  standoutSignalsCount: number
}

interface AnalyzeReposOptions {
  readmeStrategy?: 'none' | 'top-ranked'
  readmeInspectedRepoCount?: number
  readmeInspectionLimit?: number
  totalRepoCount?: number
  paginationTruncated?: boolean
}

function getSelectionLabel(
  repo: GithubRepoWithReadme,
  detectedKeywords: string[],
  standoutSignalsCount: number,
): string {
  if (repo.homepage?.trim() && repo.hasReadme && hasClearDescription(repo.description)) {
    return 'Projet vitrine'
  }

  if (isRecentlyUpdated(repo.updated_at) && standoutSignalsCount >= 3) {
    return 'Projet actif'
  }

  if (repo.stargazers_count > 0 || repo.forks_count > 0) {
    return 'Projet visible'
  }

  if (detectedKeywords.length >= 2 || repo.language) {
    return 'Projet technique'
  }

  return 'Projet prometteur'
}

export function isRecentlyUpdated(updatedAt: string): boolean {
  const updatedAtTime = new Date(updatedAt).getTime()
  const now = Date.now()

  if (!Number.isFinite(updatedAtTime) || updatedAtTime > now) {
    return false
  }

  const diffInDays = (now - updatedAtTime) / (1000 * 60 * 60 * 24)

  return diffInDays >= 0 && diffInDays <= RECENT_ACTIVITY_DAYS
}

export function hasClearDescription(description: string | null): boolean {
  if (!description) {
    return false
  }

  const cleanedDescription = description.trim()
  const wordCount = cleanedDescription.split(/\s+/).length

  return cleanedDescription.length >= 24 && wordCount >= 4
}

export function hasReadableRepoName(name: string): boolean {
  const cleanedName = name.trim().toLowerCase()
  const tokens = cleanedName.split(/[-_.]/).filter(Boolean)

  if (cleanedName.length < 4) {
    return false
  }

  if (VAGUE_REPO_PATTERNS.some((pattern) => pattern.test(cleanedName))) {
    return false
  }

  if (tokens.length >= 2) {
    return tokens.every((token) => token.length >= 2)
  }

  return cleanedName.length >= 6
}

function hasDemoLink(homepage: string | null): boolean {
  return Boolean(homepage?.trim())
}

function detectTechKeywords(repo: Pick<GithubRepo, 'name' | 'description' | 'language'>): string[] {
  const searchableText = `${repo.name} ${repo.description ?? ''} ${repo.language ?? ''}`.toLowerCase()

  return MODERN_TECH_KEYWORDS.filter((keyword) => searchableText.includes(keyword))
}

function seemsRealProject(repo: GithubRepo, detectedKeywords: string[]): boolean {
  return (
    hasClearDescription(repo.description) ||
    hasDemoLink(repo.homepage) ||
    repo.stargazers_count > 0 ||
    repo.forks_count > 0 ||
    detectedKeywords.length >= 2
  )
}

function getFeaturePriority(repo: GithubRepo): number {
  let score = 0

  if (!repo.fork) {
    score += 24
  }

  if (!repo.archived) {
    score += 6
  }

  if (repo.description) {
    score += 14
  }

  if (hasClearDescription(repo.description)) {
    score += 10
  }

  if (hasDemoLink(repo.homepage)) {
    score += 10
  }

  if (repo.language) {
    score += 8
  }

  if (hasReadableRepoName(repo.name)) {
    score += 8
  }

  if (isRecentlyUpdated(repo.updated_at)) {
    score += 12
  }

  score += Math.min(repo.stargazers_count, 5) * 3
  score += Math.min(repo.forks_count, 5) * 2

  return score
}

function getSortableUpdatedAt(updatedAt: string): number {
  const timestamp = new Date(updatedAt).getTime()
  return Number.isFinite(timestamp) && timestamp <= Date.now() ? timestamp : 0
}

export function sortReposByPortfolioValue<T extends GithubRepo>(repos: T[]): T[] {
  return [...repos]
    .sort((firstRepo, secondRepo) => {
      const priorityDiff = getFeaturePriority(secondRepo) - getFeaturePriority(firstRepo)

      if (priorityDiff !== 0) {
        return priorityDiff
      }

      return getSortableUpdatedAt(secondRepo.updated_at) - getSortableUpdatedAt(firstRepo.updated_at)
    })
}

export function getReadmeInspectionCandidates(repos: GithubRepo[], limit: number): GithubRepo[] {
  return sortReposByPortfolioValue(repos).slice(0, limit)
}

export function analyzeRepos(
  repos: GithubRepoWithReadme[],
  options: AnalyzeReposOptions = {},
): RepoAnalysisSummary {
  const {
    readmeStrategy = 'top-ranked',
    readmeInspectedRepoCount = repos.length,
    readmeInspectionLimit = repos.length,
    totalRepoCount = repos.length,
    paginationTruncated = false,
  } = options
  const sortedRepos = sortReposByPortfolioValue(repos)
  const enhancedAnalyzedRepos: EnhancedAnalyzedRepo[] = sortedRepos.map((repo) => {
    const detectedKeywords = detectTechKeywords(repo)
    const repoSignals = [
      hasClearDescription(repo.description),
      repo.hasReadme,
      hasDemoLink(repo.homepage),
      isRecentlyUpdated(repo.updated_at),
      repo.stargazers_count > 0,
    ]
    const standoutSignalsCount = repoSignals.filter(Boolean).length
    const readmeAnalysis = repo.readmeContent
      ? analyzeReadmeContent(repo.readmeContent, repo.homepage)
      : createUnavailableReadmeAnalysis()

    return {
      ...repo,
      detectedKeywords,
      hasDemo: hasDemoLink(repo.homepage),
      hasReadableName: hasReadableRepoName(repo.name),
      hasClearDescription: hasClearDescription(repo.description),
      isRecentlyUpdated: isRecentlyUpdated(repo.updated_at),
      seemsRealProject: seemsRealProject(repo, detectedKeywords),
      selectionLabel: getSelectionLabel(repo, detectedKeywords, standoutSignalsCount),
      selectionScore: getFeaturePriority(repo),
      readmeAnalysis,
      standoutSignalsCount,
    }
  })

  const languages = Array.from(
    new Set(
      enhancedAnalyzedRepos
        .map((repo) => repo.language)
        .filter((language): language is string => Boolean(language)),
    ),
  )

  const modernTechSignals = Array.from(
    new Set(enhancedAnalyzedRepos.flatMap((repo) => detectTechKeywords(repo))),
  )

  const analyzedReadmes = enhancedAnalyzedRepos.filter((repo) => repo.readmeAnalysis.analyzed)
  const readmeAverageScore =
    analyzedReadmes.length > 0
      ? Math.round(
          analyzedReadmes.reduce((sum, repo) => sum + repo.readmeAnalysis.score, 0) /
            analyzedReadmes.length,
        )
      : 0

  const languageStats: LanguageStat[] = Array.from(
    enhancedAnalyzedRepos.reduce((accumulator, repo) => {
      if (!repo.language) {
        return accumulator
      }

      accumulator.set(repo.language, (accumulator.get(repo.language) ?? 0) + 1)
      return accumulator
    }, new Map<string, number>()),
  )
    .map(([name, repoCount]) => ({
      name,
      repoCount,
    }))
    .sort((firstLanguage, secondLanguage) => secondLanguage.repoCount - firstLanguage.repoCount)
    .slice(0, 8)

  return {
    analyzedRepos: enhancedAnalyzedRepos.map((repo) => {
      const { standoutSignalsCount: hiddenSignalCount, ...publicRepo } = repo
      void hiddenSignalCount

      return publicRepo
    }),
    analyzedRepoCount: enhancedAnalyzedRepos.length,
    totalRepoCount,
    paginationTruncated,
    readmeStrategy,
    readmeInspectedRepoCount,
    readmeInspectionLimit,
    reposWithDescription: enhancedAnalyzedRepos.filter((repo) => Boolean(repo.description?.trim()))
      .length,
    reposWithReadme: enhancedAnalyzedRepos.filter((repo) => repo.hasReadme).length,
    analyzedReadmeCount: analyzedReadmes.length,
    readmeAverageScore,
    readmeProfessionalCount: enhancedAnalyzedRepos.filter(
      (repo) => repo.readmeAnalysis.level === 'README professionnel',
    ).length,
    reposWithDemo: enhancedAnalyzedRepos.filter((repo) => repo.hasDemo).length,
    readableNamesCount: enhancedAnalyzedRepos.filter((repo) => repo.hasReadableName).length,
    clearDescriptionsCount: enhancedAnalyzedRepos.filter((repo) => repo.hasClearDescription).length,
    realProjectCount: enhancedAnalyzedRepos.filter((repo) => repo.seemsRealProject).length,
    standoutProjectsCount: enhancedAnalyzedRepos.filter((repo) => repo.standoutSignalsCount >= 3)
      .length,
    analyzedRecentlyUpdatedCount: enhancedAnalyzedRepos.filter((repo) => repo.isRecentlyUpdated)
      .length,
    overallRecentlyUpdatedCount: enhancedAnalyzedRepos.filter((repo) => repo.isRecentlyUpdated)
      .length,
    languageDiversityCount: languages.length,
    languages,
    languageStats,
    modernTechSignals,
  }
}
