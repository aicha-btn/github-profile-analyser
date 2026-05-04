import type { AnalysisDepth, PortfolioAnalysis } from '../types/github'

const ANALYSIS_CACHE_PREFIX = 'github-analyzer:analysis'
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 6

interface CachedAnalysisEntry {
  cachedAt: string
  analysis: PortfolioAnalysis
}

function getStorageKey(username: string, depth: AnalysisDepth): string {
  return `${ANALYSIS_CACHE_PREFIX}:${username.trim().toLowerCase()}:${depth}`
}

export function readCachedAnalysis(
  username: string,
  depth: AnalysisDepth,
): PortfolioAnalysis | null {
  try {
    const rawValue = window.localStorage.getItem(getStorageKey(username, depth))

    if (!rawValue) {
      return null
    }

    const cachedEntry = JSON.parse(rawValue) as CachedAnalysisEntry
    const cachedAtTime = new Date(cachedEntry.cachedAt).getTime()

    if (!Number.isFinite(cachedAtTime) || Date.now() - cachedAtTime > ANALYSIS_CACHE_TTL_MS) {
      window.localStorage.removeItem(getStorageKey(username, depth))
      return null
    }

    return {
      ...cachedEntry.analysis,
      metadata: {
        ...cachedEntry.analysis.metadata,
        depth,
        fromCache: true,
        cachedAt: cachedEntry.cachedAt,
      },
    }
  } catch {
    return null
  }
}

export function writeCachedAnalysis(
  username: string,
  depth: AnalysisDepth,
  analysis: PortfolioAnalysis,
): PortfolioAnalysis {
  const cachedAt = new Date().toISOString()
  const persistedAnalysis: PortfolioAnalysis = {
    ...analysis,
    metadata: {
      ...analysis.metadata,
      depth,
      fromCache: false,
      cachedAt,
    },
  }

  try {
    const payload: CachedAnalysisEntry = {
      cachedAt,
      analysis: persistedAnalysis,
    }

    window.localStorage.setItem(getStorageKey(username, depth), JSON.stringify(payload))
  } catch {
    return persistedAnalysis
  }

  return persistedAnalysis
}
