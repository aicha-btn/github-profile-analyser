import { z } from 'zod'
import type { AnalysisDepth, PortfolioAnalysis } from '../types/github'
import { parsePortfolioAnalysis } from './githubValidation'

const ANALYSIS_CACHE_PREFIX = 'github-analyzer:analysis'
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 6
const ANALYSIS_CACHE_VERSION = 1

interface CachedAnalysisEntry {
  version: typeof ANALYSIS_CACHE_VERSION
  cachedAt: string
  depth: AnalysisDepth
  analysis: PortfolioAnalysis
}

const cachedAnalysisEnvelopeSchema = z
  .object({
    version: z.literal(ANALYSIS_CACHE_VERSION),
    cachedAt: z.string().datetime({ offset: true }),
    depth: z.enum(['quick', 'deep']),
    analysis: z.unknown(),
  })
  .strict()

function getStorageKey(username: string, depth: AnalysisDepth): string {
  return `${ANALYSIS_CACHE_PREFIX}:${username.trim().toLowerCase()}:${depth}`
}

export function readCachedAnalysis(
  username: string,
  depth: AnalysisDepth,
  storage: Storage = window.localStorage,
): PortfolioAnalysis | null {
  const storageKey = getStorageKey(username, depth)

  try {
    const rawValue = storage.getItem(storageKey)

    if (!rawValue) {
      return null
    }

    const cachedEnvelope = cachedAnalysisEnvelopeSchema.parse(JSON.parse(rawValue))
    const cachedEntry: CachedAnalysisEntry = {
      ...cachedEnvelope,
      analysis: parsePortfolioAnalysis(cachedEnvelope.analysis),
    }
    const cachedAtTime = new Date(cachedEntry.cachedAt).getTime()

    if (
      cachedEntry.depth !== depth ||
      cachedEntry.analysis.metadata.depth !== depth ||
      cachedEntry.analysis.source !== 'github' ||
      !Number.isFinite(cachedAtTime) ||
      cachedAtTime > Date.now() ||
      Date.now() - cachedAtTime > ANALYSIS_CACHE_TTL_MS
    ) {
      storage.removeItem(storageKey)
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
    try {
      storage.removeItem(storageKey)
    } catch {
      // Storage can be unavailable in restrictive browser contexts.
    }

    return null
  }
}

export function writeCachedAnalysis(
  username: string,
  depth: AnalysisDepth,
  analysis: PortfolioAnalysis,
  storage: Storage = window.localStorage,
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
      version: ANALYSIS_CACHE_VERSION,
      cachedAt,
      depth,
      analysis: persistedAnalysis,
    }

    storage.setItem(getStorageKey(username, depth), JSON.stringify(payload))
  } catch {
    return persistedAnalysis
  }

  return persistedAnalysis
}
