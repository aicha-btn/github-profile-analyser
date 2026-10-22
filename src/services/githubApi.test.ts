import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  attachReadmeAvailability,
  createReposWithoutReadmeInspection,
  DEFAULT_DEEP_README_LIMIT,
  getGithubRepos,
  getGithubUser,
  GithubApiError,
} from './githubApi'
import { getReadmeInspectionCandidates } from '../utils/analyzeRepos'
import {
  createGithubRepo,
  createGithubUser,
  createJsonResponse,
} from '../test/fixtures'

function getFetchMock() {
  return vi.mocked(globalThis.fetch)
}

async function captureApiError(action: Promise<unknown>): Promise<GithubApiError> {
  try {
    await action
  } catch (error) {
    if (error instanceof GithubApiError) {
      return error
    }

    throw error
  }

  throw new Error('Expected a GithubApiError.')
}

function createRepoPage(page: number, count: number) {
  return Array.from({ length: count }, (_, index) =>
    createGithubRepo((page - 1) * 100 + index + 1),
  )
}

describe('GitHub API integration', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new Error('Unexpected external network request.'))),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('profile requests', () => {
    it('returns a valid profile and uses the fixed GitHub API host', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse(createGithubUser()))

      await expect(getGithubUser('fixture-developer')).resolves.toEqual(createGithubUser())
      expect(getFetchMock()).toHaveBeenCalledOnce()
      expect(getFetchMock().mock.calls[0]?.[0]).toBe(
        'https://api.github.com/users/fixture-developer',
      )
      expect(getFetchMock().mock.calls[0]?.[1]).toMatchObject({
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
    })

    it('maps an invalid successful payload to INVALID_REMOTE_DATA', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse({ login: 'incomplete' }))

      expect((await captureApiError(getGithubUser('fixture'))).code).toBe(
        'INVALID_REMOTE_DATA',
      )
    })

    it('maps a missing user to USER_NOT_FOUND', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse({ message: 'Not Found' }, 404))

      expect((await captureApiError(getGithubUser('missing'))).code).toBe('USER_NOT_FOUND')
    })

    it('maps a 403 quota response and preserves rate-limit headers', async () => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse(
          { message: 'API rate limit exceeded' },
          403,
          {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1800000000',
          },
        ),
      )

      const error = await captureApiError(getGithubUser('fixture'))

      expect(error.code).toBe('RATE_LIMITED')
      expect(error.status).toBe(403)
      expect(error.details.retryAfterSeconds).toBe(60)
      expect(error.details.rateLimitRemaining).toBe(0)
      expect(error.details.rateLimitResetAt).not.toBeNull()
    })

    it('maps a 429 response and uses X-RateLimit-Reset when Retry-After is absent', async () => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse(
          { message: 'Slow down' },
          429,
          {
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': '1800000000',
          },
        ),
      )

      const error = await captureApiError(getGithubUser('fixture'))

      expect(error.code).toBe('RATE_LIMITED')
      expect(error.status).toBe(429)
      expect(error.details.rateLimitResetAt).toBe('2027-01-15T08:00:00.000Z')
    })

    it('maps a GitHub 500 response to GITHUB_UNAVAILABLE', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse({ message: 'Internal error' }, 500))

      expect((await captureApiError(getGithubUser('fixture'))).code).toBe(
        'GITHUB_UNAVAILABLE',
      )
    })

    it('maps a fetch failure to NETWORK_ERROR', async () => {
      getFetchMock().mockRejectedValueOnce(new TypeError('Network failed'))

      expect((await captureApiError(getGithubUser('fixture'))).code).toBe('NETWORK_ERROR')
    })

    it('aborts a timed-out request and maps it to TIMEOUT', async () => {
      vi.useFakeTimers()
      getFetchMock().mockImplementationOnce(
        (_input, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              reject(new DOMException('Request aborted', 'AbortError'))
            })
          }),
      )

      const errorPromise = captureApiError(getGithubUser('fixture', { timeoutMs: 25 }))
      await vi.advanceTimersByTimeAsync(25)

      expect((await errorPromise).code).toBe('TIMEOUT')
    })

    it('never exposes the raw GitHub error message', async () => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse({ message: 'Internal provider detail' }, 400),
      )

      const error = await captureApiError(getGithubUser('fixture'))

      expect(error.message).not.toContain('Internal provider detail')
      expect(error.message).toBe('GitHub est temporairement indisponible. Réessaie un peu plus tard.')
    })
  })

  describe('README requests', () => {
    const repo = createGithubRepo()

    it('decodes a valid README response', async () => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse({ content: btoa('# Demo README'), encoding: 'base64' }),
      )

      const [result] = await attachReadmeAvailability([repo], new Set([repo.id]))

      expect(result).toMatchObject({ hasReadme: true, readmeContent: '# Demo README' })
    })

    it('treats only a README 404 as an absent README', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse({ message: 'Not Found' }, 404))

      const [result] = await attachReadmeAvailability([repo], new Set([repo.id]))

      expect(result).toMatchObject({ hasReadme: false, readmeContent: null })
    })

    it.each([403, 429])('propagates README status %s as RATE_LIMITED', async (status) => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse({ message: 'Rate limited' }, status, {
          'X-RateLimit-Remaining': '0',
        }),
      )

      expect(
        (await captureApiError(attachReadmeAvailability([repo], new Set([repo.id])))).code,
      ).toBe('RATE_LIMITED')
    })

    it('propagates a README 500 as GITHUB_UNAVAILABLE', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse({ message: 'Unavailable' }, 500))

      expect(
        (await captureApiError(attachReadmeAvailability([repo], new Set([repo.id])))).code,
      ).toBe('GITHUB_UNAVAILABLE')
    })

    it('rejects an invalid README payload', async () => {
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse({ content: 42, encoding: 'base64' }),
      )

      expect(
        (await captureApiError(attachReadmeAvailability([repo], new Set([repo.id])))).code,
      ).toBe('INVALID_REMOTE_DATA')
    })

    it('caps decoded README content at 100,000 characters', async () => {
      const oversizedContent = 'x'.repeat(150_000)
      getFetchMock().mockResolvedValueOnce(
        createJsonResponse({ content: btoa(oversizedContent), encoding: 'base64' }),
      )

      const [result] = await attachReadmeAvailability([repo], new Set([repo.id]))

      expect(result?.readmeContent).toHaveLength(100_000)
    })
  })

  describe('repository pagination', () => {
    it('stops after the first short page', async () => {
      getFetchMock().mockResolvedValueOnce(createJsonResponse(createRepoPage(1, 20)))

      const result = await getGithubRepos('fixture', 20)

      expect(result.repos).toHaveLength(20)
      expect(getFetchMock()).toHaveBeenCalledOnce()
    })

    it('continues after a full page and stops on the next short page', async () => {
      getFetchMock()
        .mockResolvedValueOnce(createJsonResponse(createRepoPage(1, 100)))
        .mockResolvedValueOnce(createJsonResponse(createRepoPage(2, 12)))

      const result = await getGithubRepos('fixture', 112)

      expect(result.repos).toHaveLength(112)
      expect(getFetchMock()).toHaveBeenCalledTimes(2)
      expect(getFetchMock().mock.calls[1]?.[0]).toContain('page=2')
    })

    it('enforces the five-page hard cap without requesting page six', async () => {
      for (let page = 1; page <= 5; page += 1) {
        getFetchMock().mockResolvedValueOnce(createJsonResponse(createRepoPage(page, 100)))
      }

      const result = await getGithubRepos('fixture', 600)

      expect(result.repos).toHaveLength(500)
      expect(result.paginationTruncated).toBe(true)
      expect(getFetchMock()).toHaveBeenCalledTimes(5)
      expect(getFetchMock().mock.calls.some(([url]) => String(url).includes('page=6'))).toBe(false)
    })

    it('propagates an error raised during pagination', async () => {
      getFetchMock()
        .mockResolvedValueOnce(createJsonResponse(createRepoPage(1, 100)))
        .mockResolvedValueOnce(createJsonResponse({ message: 'Unavailable' }, 500))

      expect((await captureApiError(getGithubRepos('fixture', 150))).code).toBe(
        'GITHUB_UNAVAILABLE',
      )
    })
  })

  describe('quick and deep README behavior', () => {
    const repos = Array.from({ length: 8 }, (_, index) =>
      createGithubRepo(index + 1, { stargazers_count: 8 - index }),
    )

    it('performs no README request for quick-mode repository conversion', () => {
      const result = createReposWithoutReadmeInspection(repos)

      expect(result.every((repo) => !repo.hasReadme && repo.readmeContent === null)).toBe(true)
      expect(getFetchMock()).not.toHaveBeenCalled()
    })

    it('limits deep-mode README requests to five selected repositories', async () => {
      const candidates = getReadmeInspectionCandidates(repos, DEFAULT_DEEP_README_LIMIT)
      candidates.forEach(() => {
        getFetchMock().mockResolvedValueOnce(
          createJsonResponse({ content: btoa('# Demo'), encoding: 'base64' }),
        )
      })

      const result = await attachReadmeAvailability(
        repos,
        new Set(candidates.map((repo) => repo.id)),
      )

      expect(candidates).toHaveLength(5)
      expect(getFetchMock()).toHaveBeenCalledTimes(5)
      expect(result.filter((repo) => repo.hasReadme)).toHaveLength(5)
    })
  })
})
