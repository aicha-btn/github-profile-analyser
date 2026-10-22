import { type FormEvent, useEffect, useRef, useState } from 'react'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { LoadingState } from './components/LoadingState'
import { ProfileCard } from './components/ProfileCard'
import { RecruiterLensCard } from './components/RecruiterLensCard'
import { RecommendationsList } from './components/RecommendationsList'
import { RepoCard } from './components/RepoCard'
import { ScoreCard } from './components/ScoreCard'
import { SearchForm } from './components/SearchForm'
import { type StatItem } from './components/StatsGrid'
import {
  DEFAULT_DEEP_README_LIMIT,
  GithubApiError,
  attachReadmeAvailability,
  createReposWithoutReadmeInspection,
  getGithubRepos,
  getGithubUser,
} from './services/githubApi'
import { createDemoAnalysis } from './data/demoAnalysis'
import type {
  AnalysisDepth,
  AnalysisMode,
  FetchStatus,
  PortfolioAnalysis,
  RecruiterGoal,
} from './types/github'
import { analyzeRepos, getReadmeInspectionCandidates } from './utils/analyzeRepos'
import { readCachedAnalysis, writeCachedAnalysis } from './utils/analysisCache'
import { calculateScore } from './utils/calculateScore'
import { generateRecommendations } from './utils/generateRecommendations'
import {
  getRecruiterDiagnosis,
  getRecruiterProfile,
  getRecruiterProfiles,
} from './utils/recruiterMode'

const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i

type BootstrapConfig =
  | {
      mode: 'idle'
      username: string
      validationMessage: string | null
    }
  | {
      mode: 'demo'
      username: string
      validationMessage: null
    }
  | {
      mode: 'auto-analyze'
      username: string
      validationMessage: string | null
    }

function validateGithubUsername(username: string): string | null {
  if (!username.trim()) {
    return 'Entre un pseudo GitHub pour lancer l’analyse.'
  }

  if (!GITHUB_USERNAME_REGEX.test(username.trim())) {
    return 'Le pseudo GitHub semble invalide. Utilise uniquement lettres, chiffres et tirets.'
  }

  return null
}

function toErrorMessage(error: unknown): string {
  if (error instanceof GithubApiError) {
    return error.message
  }

  return 'Une erreur inattendue est survenue pendant l’analyse.'
}

function getBootstrapConfig(): BootstrapConfig {
  const searchParams = new URLSearchParams(window.location.search)
  const urlUsername = searchParams.get('username')?.trim() ?? ''
  const shouldAutoAnalyze = searchParams.get('autoAnalyze') === '1'
  const shouldUseDemo = searchParams.get('demo') === '1'

  if (shouldUseDemo) {
    return {
      mode: 'demo',
      username: urlUsername || 'github-analyzer-demo',
      validationMessage: null,
    }
  }

  if (!shouldAutoAnalyze || !urlUsername) {
    return {
      mode: 'idle',
      username: '',
      validationMessage: null,
    }
  }

  return {
    mode: 'auto-analyze',
    username: urlUsername,
    validationMessage: validateGithubUsername(urlUsername),
  }
}

async function buildPortfolioAnalysis(
  username: string,
  recruiterGoal: RecruiterGoal,
  analysisDepth: AnalysisDepth,
): Promise<PortfolioAnalysis> {
  const cachedAnalysis = readCachedAnalysis(username, analysisDepth)

  if (cachedAnalysis) {
    return applyRecruiterGoalToAnalysis(cachedAnalysis, recruiterGoal)
  }

  const user = await getGithubUser(username)
  const { repos, paginationTruncated } = await getGithubRepos(username, user.public_repos)
  const repoAnalysisOptions = {
    totalRepoCount: user.public_repos,
    paginationTruncated,
  }
  const repoSummary =
    analysisDepth === 'quick'
      ? analyzeRepos(createReposWithoutReadmeInspection(repos), {
          ...repoAnalysisOptions,
          readmeStrategy: 'none',
          readmeInspectedRepoCount: 0,
          readmeInspectionLimit: 0,
        })
      : await (async () => {
          const readmeTargets = getReadmeInspectionCandidates(repos, DEFAULT_DEEP_README_LIMIT)
          const readmeTargetIds = new Set(readmeTargets.map((repo) => repo.id))
          const reposWithReadme = await attachReadmeAvailability(repos, readmeTargetIds)

          return analyzeRepos(reposWithReadme, {
            ...repoAnalysisOptions,
            readmeStrategy: 'top-ranked',
            readmeInspectedRepoCount: readmeTargets.length,
            readmeInspectionLimit: DEFAULT_DEEP_README_LIMIT,
          })
        })()
  const score = calculateScore(user, repoSummary, recruiterGoal)
  const recommendations = generateRecommendations(user, repoSummary, score, recruiterGoal)

  return writeCachedAnalysis(username, analysisDepth, {
    user,
    repoSummary,
    score,
    recommendations,
    metadata: {
      depth: analysisDepth,
      fromCache: false,
      cachedAt: null,
    },
    source: 'github',
  })
}

function applyRecruiterGoalToAnalysis(
  analysis: PortfolioAnalysis,
  recruiterGoal: RecruiterGoal,
): PortfolioAnalysis {
  const score = calculateScore(analysis.user, analysis.repoSummary, recruiterGoal)
  const recommendations = generateRecommendations(
    analysis.user,
    analysis.repoSummary,
    score,
    recruiterGoal,
  )

  return {
    ...analysis,
    score,
    recommendations,
  }
}

function createStats(analysis: PortfolioAnalysis): StatItem[] {
  const { repoSummary } = analysis

  return [
    {
      label: 'Répos analysés',
      value: String(repoSummary.analyzedRepoCount),
      hint: repoSummary.paginationTruncated
        ? `Analyse partielle plafonnée à ${repoSummary.analyzedRepoCount} répos sur ${repoSummary.totalRepoCount}.`
        : 'Tous les répos publics du profil sont pris en compte dans le diagnostic.',
    },
    {
      label: 'README inspectés',
      value:
        repoSummary.readmeStrategy === 'none'
          ? '0'
          : `${repoSummary.analyzedReadmeCount}/${repoSummary.readmeInspectedRepoCount}`,
      hint:
        repoSummary.readmeStrategy === 'none'
          ? 'Analyse rapide : aucun README inspecté pour préserver la limite GitHub.'
          : `Analyse approfondie : README limités aux ${repoSummary.readmeInspectionLimit} répos les plus pertinents.`,
    },
    {
      label: 'Activité récente',
      value: String(repoSummary.overallRecentlyUpdatedCount),
      hint: 'Nombre de répos mis à jour dans les 6 derniers mois.',
    },
    {
      label: 'README détectés',
      value:
        repoSummary.readmeStrategy === 'none'
          ? 'Non inspecté'
          : String(repoSummary.reposWithReadme),
      hint:
        repoSummary.readmeStrategy === 'none'
          ? 'Cette donnée apparaît seulement pendant une analyse approfondie.'
          : 'Nombre de README réellement détectés dans les répos inspectés.',
    },
    {
      label: 'Langages visibles',
      value: String(repoSummary.languageDiversityCount),
      hint: 'Diversité technique repérée sur l’ensemble des répos publics.',
    },
    {
      label: 'Qualité README',
      value:
        repoSummary.readmeStrategy === 'none'
          ? 'Mode rapide'
          : repoSummary.analyzedReadmeCount > 0
          ? `${repoSummary.readmeAverageScore}/10`
          : 'Non analysé',
      hint:
        repoSummary.readmeStrategy === 'none'
          ? 'Le score README est neutralisé tant que tu restes en analyse rapide.'
          : 'Score moyen des README réellement inspectés.',
    },
  ]
}

function App() {
  const [bootstrapConfig] = useState<BootstrapConfig>(() => getBootstrapConfig())
  const recruiterProfiles = getRecruiterProfiles()

  const [username, setUsername] = useState(bootstrapConfig.username)
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>(
    bootstrapConfig.mode === 'demo' ? 'demo' : 'github',
  )
  const [analysisDepth, setAnalysisDepth] = useState<AnalysisDepth>('quick')
  const [recruiterGoal, setRecruiterGoal] = useState<RecruiterGoal>('alternance-frontend')
  const [lastSubmittedUsername, setLastSubmittedUsername] = useState(
    bootstrapConfig.mode === 'idle' ? '' : bootstrapConfig.username,
  )
  const [status, setStatus] = useState<FetchStatus>(
    bootstrapConfig.mode === 'demo' ? 'success' : 'idle',
  )
  const [validationMessage, setValidationMessage] = useState<string | null>(
    bootstrapConfig.validationMessage,
  )
  const [errorMessage, setErrorMessage] = useState('')
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(
    bootstrapConfig.mode === 'demo'
      ? createDemoAnalysis(bootstrapConfig.username, 'alternance-frontend')
      : null,
  )
  const hasBootstrappedFromUrl = useRef(false)

  async function runAnalysis(nextUsername: string, depthOverride?: AnalysisDepth) {
    setStatus('loading')
    setErrorMessage('')
    setAnalysis(null)

    try {
      const result = await buildPortfolioAnalysis(
        nextUsername,
        recruiterGoal,
        depthOverride ?? analysisDepth,
      )
      setAnalysis(result)
      setStatus('success')
    } catch (error) {
      setErrorMessage(toErrorMessage(error))
      setStatus('error')
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedUsername = username.trim()
    const validationError = validateGithubUsername(normalizedUsername)

    if (validationError) {
      setValidationMessage(validationError)
      setStatus('idle')
      return
    }

    setValidationMessage(null)
    setLastSubmittedUsername(normalizedUsername)

    if (analysisMode === 'demo') {
      setErrorMessage('')
      setAnalysis(createDemoAnalysis(normalizedUsername, recruiterGoal))
      setStatus('success')
      return
    }

    await runAnalysis(normalizedUsername)
  }

  function handleExampleSelection(exampleUsername: string) {
    setUsername(exampleUsername)
    setValidationMessage(null)
    setLastSubmittedUsername(exampleUsername)
    if (analysisMode === 'demo') {
      setErrorMessage('')
      setAnalysis(createDemoAnalysis(exampleUsername, recruiterGoal))
      setStatus('success')
      return
    }

    void runAnalysis(exampleUsername)
  }

  function handleDemoSelection(nextUsername?: string) {
    const demoUsername =
      nextUsername?.trim() || username.trim() || lastSubmittedUsername || 'github-analyzer-demo'

    setAnalysisMode('demo')
    setUsername(demoUsername)
    setValidationMessage(null)
    setLastSubmittedUsername(demoUsername)
    setErrorMessage('')
    setAnalysis(createDemoAnalysis(demoUsername, recruiterGoal))
    setStatus('success')
  }

  useEffect(() => {
    if (hasBootstrappedFromUrl.current) {
      return
    }

    hasBootstrappedFromUrl.current = true

    if (bootstrapConfig.mode === 'auto-analyze' && !bootstrapConfig.validationMessage) {
      queueMicrotask(() => {
        setStatus('loading')
        setErrorMessage('')
        setAnalysis(null)

        void buildPortfolioAnalysis(bootstrapConfig.username, recruiterGoal, analysisDepth)
          .then((result) => {
            setAnalysis(result)
            setStatus('success')
          })
          .catch((error: unknown) => {
            setErrorMessage(toErrorMessage(error))
            setStatus('error')
          })
      })
    }
  }, [analysisDepth, bootstrapConfig, recruiterGoal])

  const stats = analysis ? createStats(analysis) : []
  const recruiterProfile = getRecruiterProfile(recruiterGoal)
  const recruiterDiagnosis = analysis
    ? getRecruiterDiagnosis(recruiterGoal, analysis.repoSummary)
    : null

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="site-header__inner">
          <a className="site-header__brand" href="#analyse">
            <p className="site-header__eyebrow">Github Analyzer</p>
            <p className="site-header__tagline">
              Diagnostic GitHub orienté employabilité développeur.
            </p>
          </a>

          <nav aria-label="Navigation principale" className="site-header__nav">
            <a className="site-header__link" href="#analyse">
              Analyse
            </a>
            <a className="site-header__link" href="#resultats">
              Dashboard
            </a>
            <a className="site-header__link" href="#recruteur">
              Lecture recruteur
            </a>
            <a className="site-header__link" href="#repos">
              Répos
            </a>
          </nav>

          <div className="site-header__stack" aria-label="Stack du projet">
            <span className="site-header__stack-label">Stack</span>
            <div className="site-header__stack-items">
              <span className="site-header__stack-pill">React</span>
              <span className="site-header__stack-pill">TypeScript</span>
              <span className="site-header__stack-pill">GitHub API</span>
            </div>
          </div>
        </div>
      </header>

      <main className="page-content">
        <section className="hero-section" id="analyse">
          <div className="hero-section__copy">
            <span className="eyebrow-chip">React + TypeScript + GitHub API</span>
            <h1>
              Évalue un profil GitHub public pour un objectif{' '}
              {recruiterProfile.shortLabel.toLowerCase()}.
            </h1>
            <p className="hero-section__description">
              Entre un username GitHub pour récupérer les informations publiques, analyser les
              répos publics et obtenir un score sur 100 avec des recommandations concrètes
              orientées recruteur.
            </p>

            <SearchForm
              username={username}
              validationMessage={validationMessage}
              isLoading={status === 'loading'}
              analysisMode={analysisMode}
              analysisDepth={analysisDepth}
              recruiterGoal={recruiterGoal}
              recruiterProfiles={recruiterProfiles}
              onUsernameChange={(value) => {
                setUsername(value)
                if (validationMessage) {
                  setValidationMessage(null)
                }
              }}
              onAnalysisModeChange={(mode) => {
                setAnalysisMode(mode)
                setValidationMessage(null)
              }}
              onAnalysisDepthChange={setAnalysisDepth}
              onRecruiterGoalChange={(goal) => {
                setRecruiterGoal(goal)

                if (analysis) {
                  if (analysis.source === 'demo') {
                    setAnalysis(createDemoAnalysis(username || lastSubmittedUsername, goal))
                    return
                  }

                  setAnalysis(applyRecruiterGoalToAnalysis(analysis, goal))
                }
              }}
              onSubmit={handleSubmit}
            />
          </div>

          <aside className="hero-section__panel">
            <h2>Lecture recruteur actuelle</h2>
            <p>{recruiterProfile.description}</p>
            <ul className="signal-list">
              <li>Objectif visé : {recruiterProfile.label}</li>
              <li>
                Mode actif :{' '}
                {analysisMode === 'demo'
                  ? 'démo locale'
                  : analysisDepth === 'quick'
                    ? 'analyse rapide'
                    : 'analyse approfondie'}
              </li>
              <li>Qualité du profil GitHub : bio, lien portfolio, volume de répos publics</li>
              <li>Clarté des répos : description, README, nommage, fraîcheur</li>
              <li>Lisibilité portfolio : démos visibles, projets mis en avant, signaux métier</li>
              <li>
                Technos attendues :{' '}
                {recruiterProfile.expectedTechs.map((tech) => tech.label).join(', ')}
              </li>
            </ul>
          </aside>
        </section>

        {status === 'loading' ? <LoadingState /> : null}

        {status === 'idle' ? (
          <EmptyState onUseExample={handleExampleSelection} onUseDemo={handleDemoSelection} />
        ) : null}

        {status === 'error' ? (
          <ErrorState
            message={errorMessage}
            canRetry={Boolean(lastSubmittedUsername)}
            submittedUsername={lastSubmittedUsername}
            onUseDemo={() => handleDemoSelection(lastSubmittedUsername)}
            onRetry={() => {
              if (lastSubmittedUsername) {
                void runAnalysis(lastSubmittedUsername)
              }
            }}
          />
        ) : null}

        {status === 'success' && analysis ? (
          <section className="results-section" id="resultats">
            <div className="section-heading">
              <span className="eyebrow-chip">Dashboard résultat</span>
              <h2>Analyse terminée pour {analysis.user.name ?? analysis.user.login}</h2>
              <p>
                {analysis.source === 'demo'
                  ? 'Tu consultes actuellement une démonstration locale. Elle sert à tester l’interface sans appeler l’API GitHub.'
                  : analysis.metadata.depth === 'quick'
                    ? 'Analyse rapide : le score s’appuie sur le profil et les métadonnées des répos sans inspecter les README.'
                    : `Analyse approfondie : les README sont limités aux ${analysis.repoSummary.readmeInspectionLimit} répos les plus pertinents pour préserver la limite GitHub.`}
              </p>
              {analysis.source === 'github' &&
              analysis.metadata.fromCache &&
              analysis.metadata.cachedAt ? (
                <p>
                  Résultat chargé depuis le cache local. Dernière mise à jour :{' '}
                  {new Intl.DateTimeFormat('fr-FR', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  }).format(new Date(analysis.metadata.cachedAt))}
                </p>
              ) : null}
              <p>Lecture active : {recruiterProfile.label}</p>
              {analysis.source === 'github' && analysis.metadata.depth === 'quick' ? (
                <div className="link-row">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      const targetUsername = lastSubmittedUsername || username.trim()

                      if (!targetUsername) {
                        return
                      }

                      setAnalysisDepth('deep')
                      void runAnalysis(targetUsername, 'deep')
                    }}
                  >
                    Lancer une analyse approfondie
                  </button>
                </div>
              ) : null}
            </div>

            <div className="results-layout">
              <section className="results-band">
                <div className="results-band__main">
                  <ScoreCard score={analysis.score} stats={stats} />
                </div>

                <div className="results-band__aside">
                  <ProfileCard
                    user={analysis.user}
                    languages={analysis.repoSummary.languageStats}
                    techSignals={analysis.repoSummary.modernTechSignals}
                  />
                </div>
              </section>

              {recruiterDiagnosis ? (
                <section className="results-subsection" id="recruteur">
                  <RecruiterLensCard
                    goal={recruiterGoal}
                    profile={recruiterProfile}
                    diagnosis={recruiterDiagnosis}
                  />
                </section>
              ) : null}

              <section className="insights-grid">
                <div>
                  <RecommendationsList
                    title="Points forts"
                    items={analysis.recommendations.strengths}
                    tone="positive"
                  />
                </div>

                <div>
                  <RecommendationsList
                    title="Points à améliorer"
                    items={analysis.recommendations.improvements}
                    tone="warning"
                  />
                </div>
              </section>

              <section className="results-subsection">
                <RecommendationsList
                  title="Checklist actionnable"
                  items={analysis.recommendations.checklist}
                  tone="action"
                />
              </section>
            </div>

            <section className="repo-section" id="repos">
              <div className="section-heading">
                <span className="eyebrow-chip">Tous les répos</span>
                <h2>Répos analysés</h2>
                <p>
                  Github Analyzer analyse{' '}
                  {analysis.repoSummary.paginationTruncated
                    ? `${analysis.repoSummary.analyzedRepoCount} des ${analysis.repoSummary.totalRepoCount}`
                    : `les ${analysis.repoSummary.totalRepoCount}`}{' '}
                  répos publics du profil, puis les trie pour faire remonter en premier les projets
                  les plus convaincants, les plus récents ou les plus complets.
                </p>
                {analysis.repoSummary.readmeStrategy === 'none' ? (
                  <p>
                    Cette vue reste volontairement légère : aucun README n’a été inspecté pour
                    préserver les requêtes GitHub.
                  </p>
                ) : (
                  <p>
                    Les README sont inspectés seulement sur les{' '}
                    {analysis.repoSummary.readmeInspectionLimit} répos les plus pertinents pour
                    limiter les appels API.
                  </p>
                )}
                <p className="scroll-hint">
                  Fais défiler horizontalement pour parcourir tous les répos du profil.
                </p>
              </div>

              <div className="repo-scroll-shell">
                <div className="repo-grid">
                  {analysis.repoSummary.analyzedRepos.map((repo) => (
                    <RepoCard key={repo.id} repo={repo} />
                  ))}
                </div>
              </div>
            </section>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
