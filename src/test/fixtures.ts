import { createDemoAnalysis } from '../data/demoAnalysis'
import type {
  AnalysisDepth,
  GithubRepo,
  GithubRepoWithReadme,
  GithubUser,
  PortfolioAnalysis,
} from '../types/github'

export function createGithubUser(overrides: Partial<GithubUser> = {}): GithubUser {
  return {
    login: 'fixture-developer',
    name: 'Demo Developer',
    avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
    bio: 'Frontend developer building useful web applications.',
    public_repos: 3,
    followers: 12,
    following: 4,
    created_at: '2022-01-10T10:00:00Z',
    html_url: 'https://github.com/fixture-developer',
    blog: 'https://fixture-developer.example',
    ...overrides,
  }
}

export function createGithubRepo(
  id = 1,
  overrides: Partial<GithubRepo> = {},
): GithubRepo {
  return {
    id,
    name: `portfolio-project-${id}`,
    full_name: `fixture-developer/portfolio-project-${id}`,
    description: 'A fictional TypeScript project with a clear product purpose.',
    html_url: `https://github.com/fixture-developer/portfolio-project-${id}`,
    homepage: `https://portfolio-project-${id}.example`,
    language: 'TypeScript',
    stargazers_count: 2,
    forks_count: 1,
    updated_at: '2026-09-01T10:00:00Z',
    fork: false,
    archived: false,
    owner: {
      login: 'fixture-developer',
    },
    ...overrides,
  }
}

export function createGithubRepoWithReadme(
  id = 1,
  overrides: Partial<GithubRepoWithReadme> = {},
): GithubRepoWithReadme {
  return {
    ...createGithubRepo(id),
    hasReadme: true,
    readmeContent: '# Demo project\n\n## Installation\n\n## Features\n\n## Tech stack',
    ...overrides,
  }
}

export function createPortfolioAnalysis(depth: AnalysisDepth = 'quick'): PortfolioAnalysis {
  const analysis = createDemoAnalysis('fixture-developer')

  return {
    ...analysis,
    source: 'github',
    metadata: {
      depth,
      fromCache: false,
      cachedAt: null,
    },
  }
}

export function createJsonResponse(
  payload: unknown,
  status = 200,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}
