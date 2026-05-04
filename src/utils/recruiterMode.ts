import type { RecruiterGoal, RepoAnalysisSummary } from '../types/github'

interface RecruiterTechExpectation {
  id: string
  label: string
}

export interface RecruiterProfile {
  id: RecruiterGoal
  label: string
  shortLabel: string
  description: string
  expectedTechs: RecruiterTechExpectation[]
}

export interface RecruiterDiagnosis {
  fitScore: number
  matchedTechs: string[]
  missingTechs: string[]
  headline: string
  summary: string
}

const RECRUITER_PROFILES: Record<RecruiterGoal, RecruiterProfile> = {
  'alternance-frontend': {
    id: 'alternance-frontend',
    label: 'Alternance frontend',
    shortLabel: 'Frontend',
    description:
      'Le recruteur frontend attend surtout une interface soignée, des démos visibles, React/TypeScript et de bonnes pratiques UI.',
    expectedTechs: [
      { id: 'react', label: 'React' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'frontend', label: 'Frontend' },
      { id: 'css', label: 'CSS / UI' },
      { id: 'api', label: 'API' },
    ],
  },
  'alternance-fullstack': {
    id: 'alternance-fullstack',
    label: 'Alternance fullstack',
    shortLabel: 'Fullstack',
    description:
      'Le recruteur fullstack cherche un profil capable de montrer une base frontend solide et des signaux backend ou API plus complets.',
    expectedTechs: [
      { id: 'react', label: 'React' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'api', label: 'API' },
      { id: 'node', label: 'Node.js' },
      { id: 'backend', label: 'Backend' },
      { id: 'sql', label: 'SQL / data' },
    ],
  },
  'stage-developpeur-web': {
    id: 'stage-developpeur-web',
    label: 'Stage développeur web',
    shortLabel: 'Stage web',
    description:
      'Pour un stage web, le recruteur veut surtout des fondations claires : projets compréhensibles, README, activité et bases web visibles.',
    expectedTechs: [
      { id: 'javascript', label: 'JavaScript' },
      { id: 'css', label: 'CSS' },
      { id: 'api', label: 'API' },
      { id: 'frontend', label: 'Frontend' },
      { id: 'documentation', label: 'Documentation' },
    ],
  },
  'junior-react': {
    id: 'junior-react',
    label: 'Junior React',
    shortLabel: 'Junior React',
    description:
      'Le recruteur React junior veut voir React, TypeScript si possible, composants propres, données API et sens du produit.',
    expectedTechs: [
      { id: 'react', label: 'React' },
      { id: 'typescript', label: 'TypeScript' },
      { id: 'frontend', label: 'Frontend' },
      { id: 'api', label: 'API' },
      { id: 'readme-pro', label: 'README solide' },
    ],
  },
}

function buildSignalSet(repoSummary: RepoAnalysisSummary): Set<string> {
  const signalSet = new Set<string>()

  repoSummary.modernTechSignals.forEach((signal) => signalSet.add(signal.toLowerCase()))
  repoSummary.languages.forEach((language) => signalSet.add(language.toLowerCase()))

  if (repoSummary.reposWithDemo > 0) {
    signalSet.add('demo')
  }

  if (repoSummary.analyzedReadmeCount > 0) {
    signalSet.add('documentation')
  }

  if (repoSummary.readmeAverageScore >= 8) {
    signalSet.add('readme-pro')
  }

  if (repoSummary.reposWithReadme > 0) {
    signalSet.add('readme')
  }

  if (repoSummary.readmeAverageScore >= 5) {
    signalSet.add('readme-ok')
  }

  if (repoSummary.modernTechSignals.includes('api')) {
    signalSet.add('backend')
  }

  return signalSet
}

export function getRecruiterProfile(goal: RecruiterGoal): RecruiterProfile {
  return RECRUITER_PROFILES[goal]
}

export function getRecruiterProfiles(): RecruiterProfile[] {
  return Object.values(RECRUITER_PROFILES)
}

export function getRecruiterDiagnosis(
  goal: RecruiterGoal,
  repoSummary: RepoAnalysisSummary,
): RecruiterDiagnosis {
  const profile = getRecruiterProfile(goal)
  const signalSet = buildSignalSet(repoSummary)

  const matchedTechs = profile.expectedTechs
    .filter((tech) => signalSet.has(tech.id))
    .map((tech) => tech.label)

  const missingTechs = profile.expectedTechs
    .filter((tech) => !signalSet.has(tech.id))
    .map((tech) => tech.label)

  const fitScore = Math.round((matchedTechs.length / profile.expectedTechs.length) * 100)

  let headline = 'Signal encore partiel'
  let summary =
    "Le portfolio montre des bases intéressantes, mais il manque encore plusieurs signaux attendus pour cet objectif."

  if (fitScore >= 80) {
    headline = 'Très bon alignement recruteur'
    summary =
      'Le profil montre déjà plusieurs signaux attendus pour cet objectif, avec une lecture assez rassurante pour un recruteur.'
  } else if (fitScore >= 55) {
    headline = 'Alignement crédible'
    summary =
      'Le profil commence à correspondre à cet objectif, mais quelques technos ou signaux portfolio peuvent encore faire la différence.'
  }

  return {
    fitScore,
    matchedTechs,
    missingTechs,
    headline,
    summary,
  }
}

export function getScoreAdjustments(
  goal: RecruiterGoal,
  repoSummary: RepoAnalysisSummary,
): Record<string, number> {
  const signalSet = buildSignalSet(repoSummary)
  const hasReact = signalSet.has('react')
  const hasTypeScript = signalSet.has('typescript')
  const hasApi = signalSet.has('api')
  const hasFrontend = signalSet.has('frontend')
  const hasNode = signalSet.has('node')
  const hasBackend = signalSet.has('backend')
  const hasSql = signalSet.has('sql')
  const hasReadmePro = signalSet.has('readme-pro')
  const hasDemo = signalSet.has('demo')

  switch (goal) {
    case 'alternance-frontend':
      return {
        'Qualité des repos': hasReadmePro ? 1 : 0,
        'Lisibilité portfolio': hasDemo && hasFrontend ? 3 : hasDemo ? 1 : -1,
        'Diversité technique': hasReact && hasTypeScript ? 3 : hasReact || hasTypeScript ? 1 : -2,
      }
    case 'alternance-fullstack':
      return {
        'Qualité des repos': hasApi ? 2 : 0,
        'Lisibilité portfolio': hasDemo ? 1 : 0,
        'Diversité technique':
          hasNode && hasSql
            ? 4
            : hasNode || hasBackend || hasSql
              ? 2
              : -2,
      }
    case 'stage-developpeur-web':
      return {
        'Profil GitHub': repoSummary.totalRepoCount >= 3 ? 1 : 0,
        'Qualité des repos': repoSummary.readmeAverageScore >= 5 ? 2 : -1,
        'Activité récente': repoSummary.overallRecentlyUpdatedCount > 0 ? 1 : 0,
      }
    case 'junior-react':
      return {
        'Qualité des repos': hasReadmePro ? 1 : 0,
        'Lisibilité portfolio': hasDemo && hasApi ? 2 : hasDemo ? 1 : 0,
        'Diversité technique':
          hasReact && hasTypeScript && hasApi
            ? 4
            : hasReact && hasTypeScript
              ? 2
              : hasReact
                ? 1
                : -2,
      }
  }
}
