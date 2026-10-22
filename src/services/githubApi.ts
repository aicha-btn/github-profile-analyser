import { ZodError } from 'zod'
import type { GithubRepo, GithubRepoWithReadme, GithubUser } from '../types/github'
import {
  githubReadmeSchema,
  parseGithubRepos,
  parseGithubUser,
} from '../utils/githubValidation'

const GITHUB_API_BASE = 'https://api.github.com'
const GITHUB_API_VERSION = '2022-11-28'
const GITHUB_REQUEST_TIMEOUT_MS = 12_000
const REPO_PAGE_SIZE = 100
const MAX_REPO_PAGES = 5
const README_FETCH_CONCURRENCY = 5
const README_CONTENT_MAX_BYTES = 100_000
export const DEFAULT_DEEP_README_LIMIT = 5

export type GithubApiErrorCode =
  | 'USER_NOT_FOUND'
  | 'RESOURCE_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'GITHUB_UNAVAILABLE'
  | 'INVALID_REMOTE_DATA'
  | 'NETWORK_ERROR'

export interface GithubRequestOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

interface GithubErrorDetails {
  retryAfterSeconds: number | null
  rateLimitRemaining: number | null
  rateLimitResetAt: string | null
}

export interface GithubReposResult {
  repos: GithubRepo[]
  paginationTruncated: boolean
}

export class GithubApiError extends Error {
  readonly code: GithubApiErrorCode
  readonly status: number
  readonly details: GithubErrorDetails

  constructor(
    code: GithubApiErrorCode,
    status: number,
    details: GithubErrorDetails = {
      retryAfterSeconds: null,
      rateLimitRemaining: null,
      rateLimitResetAt: null,
    },
  ) {
    super(getPublicErrorMessage(code, details.rateLimitResetAt))
    this.name = 'GithubApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function getPublicErrorMessage(code: GithubApiErrorCode, resetAt: string | null): string {
  switch (code) {
    case 'USER_NOT_FOUND':
      return 'Ce profil GitHub est introuvable.'
    case 'RESOURCE_NOT_FOUND':
      return 'La ressource GitHub demandée est introuvable.'
    case 'RATE_LIMITED':
      return resetAt
        ? `La limite de requêtes GitHub est atteinte. Réessaie après ${new Intl.DateTimeFormat(
            'fr-FR',
            { timeStyle: 'short' },
          ).format(new Date(resetAt))}.`
        : 'La limite de requêtes GitHub est atteinte. Réessaie un peu plus tard.'
    case 'TIMEOUT':
      return 'GitHub met trop de temps à répondre. Réessaie dans un moment.'
    case 'GITHUB_UNAVAILABLE':
      return 'GitHub est temporairement indisponible. Réessaie un peu plus tard.'
    case 'INVALID_REMOTE_DATA':
      return 'GitHub a renvoyé des données inattendues. Réessaie un peu plus tard.'
    case 'NETWORK_ERROR':
      return 'Impossible de contacter GitHub. Vérifie ta connexion puis réessaie.'
  }
}

function parseHeaderNumber(value: string | null): number | null {
  if (value === null || value.trim() === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : null
}

function getRateLimitDetails(headers: Headers): GithubErrorDetails {
  const retryAfterValue = headers.get('Retry-After')
  const retryAfterSeconds = parseHeaderNumber(retryAfterValue)
  const resetSeconds = parseHeaderNumber(headers.get('X-RateLimit-Reset'))
  let resetAt: string | null = null

  if (retryAfterSeconds !== null) {
    resetAt = new Date(Date.now() + retryAfterSeconds * 1000).toISOString()
  } else if (retryAfterValue) {
    const retryDate = new Date(retryAfterValue)
    resetAt = Number.isFinite(retryDate.getTime()) ? retryDate.toISOString() : null
  } else if (resetSeconds !== null) {
    resetAt = new Date(resetSeconds * 1000).toISOString()
  }

  return {
    retryAfterSeconds,
    rateLimitRemaining: parseHeaderNumber(headers.get('X-RateLimit-Remaining')),
    rateLimitResetAt: resetAt,
  }
}

function getGithubApiUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error('GitHub API paths must be relative to the configured API host.')
  }

  return `${GITHUB_API_BASE}${path}`
}

async function fetchGithubJson<T>(
  path: string,
  parsePayload: (payload: unknown) => T,
  notFoundCode: Extract<GithubApiErrorCode, 'USER_NOT_FOUND' | 'RESOURCE_NOT_FOUND'>,
  options: GithubRequestOptions = {},
): Promise<T> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? GITHUB_REQUEST_TIMEOUT_MS,
  )
  let response: Response

  try {
    response = await (options.fetchImpl ?? fetch)(getGithubApiUrl(path), {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      signal: controller.signal,
    })
  } catch (error) {
    if (controller.signal.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
      throw new GithubApiError('TIMEOUT', 0)
    }

    throw new GithubApiError('NETWORK_ERROR', 0)
  } finally {
    globalThis.clearTimeout(timeout)
  }

  if (!response.ok) {
    const rateLimitDetails = getRateLimitDetails(response.headers)

    if (response.status === 404) {
      throw new GithubApiError(notFoundCode, response.status)
    }

    if (response.status === 403 || response.status === 429) {
      throw new GithubApiError('RATE_LIMITED', response.status, rateLimitDetails)
    }

    if (response.status >= 500) {
      throw new GithubApiError('GITHUB_UNAVAILABLE', response.status)
    }

    throw new GithubApiError('GITHUB_UNAVAILABLE', response.status)
  }

  let payload: unknown

  try {
    payload = await response.json()
    return parsePayload(payload)
  } catch (error) {
    if (error instanceof GithubApiError) {
      throw error
    }

    if (error instanceof ZodError || error instanceof SyntaxError) {
      throw new GithubApiError('INVALID_REMOTE_DATA', response.status)
    }

    throw new GithubApiError('INVALID_REMOTE_DATA', response.status)
  }
}

function decodeBoundedBase64ToUtf8(base64Content: string): string {
  const cleanedContent = base64Content.replace(/\s/g, '')
  const maximumEncodedLength = Math.ceil(README_CONTENT_MAX_BYTES / 3) * 4
  const boundedContent = cleanedContent.slice(0, maximumEncodedLength)
  const completeQuartets = boundedContent.slice(0, boundedContent.length - (boundedContent.length % 4))

  try {
    const binaryString = atob(completeQuartets)
    const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0))
    return new TextDecoder().decode(bytes).slice(0, README_CONTENT_MAX_BYTES)
  } catch {
    throw new GithubApiError('INVALID_REMOTE_DATA', 200)
  }
}

async function fetchReadmeData(
  owner: string,
  repo: string,
  options: GithubRequestOptions = {},
): Promise<{ hasReadme: boolean; readmeContent: string | null }> {
  try {
    const payload = await fetchGithubJson(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
      (value) => githubReadmeSchema.parse(value),
      'RESOURCE_NOT_FOUND',
      options,
    )

    if (payload.encoding !== 'base64' || !payload.content) {
      return {
        hasReadme: true,
        readmeContent: null,
      }
    }

    return {
      hasReadme: true,
      readmeContent: decodeBoundedBase64ToUtf8(payload.content),
    }
  } catch (error) {
    if (error instanceof GithubApiError && error.code === 'RESOURCE_NOT_FOUND') {
      return {
        hasReadme: false,
        readmeContent: null,
      }
    }

    throw error
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let currentIndex = 0

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex
      currentIndex += 1
      results[index] = await mapper(items[index] as T)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )

  return results
}

export function getGithubUser(
  username: string,
  options: GithubRequestOptions = {},
): Promise<GithubUser> {
  return fetchGithubJson(
    `/users/${encodeURIComponent(username)}`,
    parseGithubUser,
    'USER_NOT_FOUND',
    options,
  )
}

export async function getGithubRepos(
  username: string,
  expectedPublicRepoCount: number,
  options: GithubRequestOptions = {},
): Promise<GithubReposResult> {
  const repos: GithubRepo[] = []

  if (expectedPublicRepoCount === 0) {
    return {
      repos,
      paginationTruncated: false,
    }
  }

  for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
    const pageRepos = await fetchGithubJson(
      `/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=${REPO_PAGE_SIZE}&page=${page}`,
      parseGithubRepos,
      'USER_NOT_FOUND',
      options,
    )

    repos.push(...pageRepos)

    if (pageRepos.length < REPO_PAGE_SIZE || repos.length >= expectedPublicRepoCount) {
      return {
        repos,
        paginationTruncated: false,
      }
    }
  }

  return {
    repos,
    paginationTruncated: repos.length < expectedPublicRepoCount,
  }
}

export async function attachReadmeAvailability(
  repos: GithubRepo[],
  readmeTargetRepoIds: Set<number>,
  options: GithubRequestOptions = {},
): Promise<GithubRepoWithReadme[]> {
  if (readmeTargetRepoIds.size === 0) {
    return createReposWithoutReadmeInspection(repos)
  }

  const targetRepos = repos.filter((repo) => readmeTargetRepoIds.has(repo.id))
  const readmeChecks = await mapWithConcurrency(
    targetRepos,
    Math.min(README_FETCH_CONCURRENCY, Math.max(1, readmeTargetRepoIds.size)),
    async (repo) => ({
      repoId: repo.id,
      ...(await fetchReadmeData(repo.owner.login, repo.name, options)),
    }),
  )

  const readmeMap = new Map<number, { hasReadme: boolean; readmeContent: string | null }>()

  readmeChecks.forEach((entry) => {
    readmeMap.set(entry.repoId, {
      hasReadme: entry.hasReadme,
      readmeContent: entry.readmeContent,
    })
  })

  return repos.map((repo) => ({
    ...repo,
    hasReadme: readmeMap.get(repo.id)?.hasReadme ?? false,
    readmeContent: readmeMap.get(repo.id)?.readmeContent ?? null,
  }))
}

export function createReposWithoutReadmeInspection(repos: GithubRepo[]): GithubRepoWithReadme[] {
  return repos.map((repo) => ({
    ...repo,
    hasReadme: false,
    readmeContent: null,
  }))
}
