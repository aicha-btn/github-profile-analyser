import type { GithubRepo, GithubRepoWithReadme, GithubUser } from '../types/github'

const GITHUB_API_BASE = 'https://api.github.com'
const README_FETCH_CONCURRENCY = 6

export class GithubApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubApiError'
    this.status = status
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  let response: Response

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github+json',
      },
    })
  } catch {
    throw new GithubApiError(
      "Impossible de contacter GitHub pour le moment. Vérifie ta connexion internet puis réessaie.",
      0,
    )
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      message?: string
    } | null

    if (response.status === 404) {
      throw new GithubApiError('Ce profil GitHub est introuvable.', response.status)
    }

    if (response.status === 403) {
      throw new GithubApiError(
        "La limite de requêtes GitHub a été atteinte. Réessaie dans environ une heure.",
        response.status,
      )
    }

    if (response.status === 429) {
      throw new GithubApiError(
        'Trop de requêtes GitHub en peu de temps. Attends un moment avant de relancer une analyse.',
        response.status,
      )
    }

    if (response.status >= 500) {
      throw new GithubApiError(
        'GitHub rencontre un problème temporaire. Réessaie un peu plus tard.',
        response.status,
      )
    }

    throw new GithubApiError(
      payload?.message ?? 'Une erreur GitHub inattendue est survenue.',
      response.status,
    )
  }

  return (await response.json()) as T
}

function decodeBase64ToUtf8(base64Content: string): string {
  const cleanedContent = base64Content.replace(/\n/g, '')
  const binaryString = atob(cleanedContent)
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

async function fetchReadmeData(
  owner: string,
  repo: string,
): Promise<{ hasReadme: boolean; readmeContent: string | null }> {
  const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  })

  if (response.ok) {
    const payload = (await response.json()) as {
      content?: string
      encoding?: string
    }

    if (payload.content && payload.encoding === 'base64') {
      return {
        hasReadme: true,
        readmeContent: decodeBase64ToUtf8(payload.content),
      }
    }

    return {
      hasReadme: true,
      readmeContent: null,
    }
  }

  if (response.status === 404 || response.status === 403 || response.status === 429) {
    return {
      hasReadme: false,
      readmeContent: null,
    }
  }

  throw new GithubApiError(
    `Impossible de récupérer le README du répo ${owner}/${repo}.`,
    response.status,
  )
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

export function getGithubUser(username: string): Promise<GithubUser> {
  return fetchJson<GithubUser>(`${GITHUB_API_BASE}/users/${username}`)
}

export async function getGithubRepos(username: string): Promise<GithubRepo[]> {
  const repos: GithubRepo[] = []
  let page = 1

  while (true) {
    const pageRepos = await fetchJson<GithubRepo[]>(
      `${GITHUB_API_BASE}/users/${username}/repos?sort=updated&per_page=100&page=${page}`,
    )

    repos.push(...pageRepos)

    if (pageRepos.length < 100) {
      break
    }

    page += 1
  }

  return repos
}

export async function attachReadmeAvailability(
  repos: GithubRepo[],
): Promise<GithubRepoWithReadme[]> {
  const readmeChecks = await mapWithConcurrency(repos, README_FETCH_CONCURRENCY, async (repo) => ({
    repoId: repo.id,
    ...(await fetchReadmeData(repo.owner.login, repo.name)),
  }))

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
