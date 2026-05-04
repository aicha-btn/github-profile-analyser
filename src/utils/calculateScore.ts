import type {
  GithubUser,
  RecruiterGoal,
  RepoAnalysisSummary,
  ScoreCategory,
  ScoreResult,
} from '../types/github'
import { getScoreAdjustments } from './recruiterMode'

function getRatioScore(value: number, total: number, maxScore: number): number {
  if (total === 0) {
    return 0
  }

  return Math.round((value / total) * maxScore)
}

function hasPortfolioLink(blog: string): boolean {
  return blog.trim().length > 0
}

function clampScore(score: number, maxScore: number): number {
  return Math.max(0, Math.min(score, maxScore))
}

export function calculateScore(
  user: GithubUser,
  repoSummary: RepoAnalysisSummary,
  goal: RecruiterGoal,
): ScoreResult {
  const analyzedRepoCount = repoSummary.analyzedRepoCount
  const readmeQualityScore =
    repoSummary.readmeStrategy === 'none'
      ? 5
      : repoSummary.analyzedReadmeCount > 0
      ? Math.round((repoSummary.readmeAverageScore / 10) * 10)
      : getRatioScore(repoSummary.reposWithReadme, analyzedRepoCount, 10)

  const profileScore =
    (user.avatar_url ? 5 : 0) +
    (user.bio?.trim() ? 5 : 0) +
    (hasPortfolioLink(user.blog) ? 5 : 0) +
    (user.public_repos >= 3 ? 5 : 0)

  const repoQualityScore =
    getRatioScore(repoSummary.reposWithDescription, analyzedRepoCount, 10) +
    readmeQualityScore +
    (repoSummary.analyzedRecentlyUpdatedCount > 0 ? 5 : 0) +
    getRatioScore(repoSummary.readableNamesCount, analyzedRepoCount, 5)

  const portfolioReadabilityScore =
    Math.min(repoSummary.reposWithDemo * 5, 10) +
    getRatioScore(repoSummary.clearDescriptionsCount, analyzedRepoCount, 5) +
    getRatioScore(repoSummary.realProjectCount, analyzedRepoCount, 5) +
    (repoSummary.standoutProjectsCount >= 3
      ? 5
      : repoSummary.standoutProjectsCount === 2
        ? 3
        : repoSummary.standoutProjectsCount === 1
          ? 1
          : 0)

  const activityScore =
    (repoSummary.overallRecentlyUpdatedCount > 0 ? 10 : 0) +
    (repoSummary.overallRecentlyUpdatedCount >= 3
      ? 5
      : repoSummary.overallRecentlyUpdatedCount >= 2
        ? 3
        : 0)

  const diversityScore =
    (repoSummary.languageDiversityCount >= 3
      ? 5
      : repoSummary.languageDiversityCount === 2
        ? 3
        : repoSummary.languageDiversityCount === 1
          ? 1
          : 0) +
    (repoSummary.modernTechSignals.length >= 3
      ? 5
      : repoSummary.modernTechSignals.length >= 1
        ? 3
        : 0)

  const adjustments = getScoreAdjustments(goal, repoSummary)

  const categories: ScoreCategory[] = [
    {
      label: 'Profil GitHub',
      score: clampScore(profileScore + (adjustments['Profil GitHub'] ?? 0), 20),
      maxScore: 20,
      description: 'Avatar, bio, lien portfolio et volume de répos publics.',
    },
    {
      label: 'Qualité des repos',
      score: clampScore(repoQualityScore + (adjustments['Qualité des repos'] ?? 0), 30),
      maxScore: 30,
      description: 'Descriptions, qualité des README, fraîcheur des répos et lisibilité des noms.',
    },
    {
      label: 'Lisibilité portfolio',
      score: clampScore(
        portfolioReadabilityScore + (adjustments['Lisibilité portfolio'] ?? 0),
        25,
      ),
      maxScore: 25,
      description: 'Présence de démos, clarté des projets et capacité à faire ressortir les meilleurs.',
    },
    {
      label: 'Activité récente',
      score: clampScore(activityScore + (adjustments['Activité récente'] ?? 0), 15),
      maxScore: 15,
      description: 'Signaux d’activité visibles dans les répos récents.',
    },
    {
      label: 'Diversité technique',
      score: clampScore(diversityScore + (adjustments['Diversité technique'] ?? 0), 10),
      maxScore: 10,
      description: 'Langages et signaux de stack moderne détectés.',
    },
  ]

  const total = categories.reduce((sum, category) => sum + category.score, 0)

  return {
    total: Math.min(total, 100),
    categories,
  }
}
