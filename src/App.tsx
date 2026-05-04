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
  GithubApiError,
  attachReadmeAvailability,
  getGithubRepos,
  getGithubUser,
} from './services/githubApi'
import { createDemoAnalysis } from './data/demoAnalysis'
import type {
  AnalysisMode,
  FetchStatus,
  PortfolioAnalysis,
  RecruiterGoal,
} from './types/github'
import { analyzeRepos } from './utils/analyzeRepos'
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

  if (error instanceof Error) {
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
      username: urlUsername || 'portfolio-pulse-demo',
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
): Promise<PortfolioAnalysis> {
  const [user, repos] = await Promise.all([getGithubUser(username), getGithubRepos(username)])
  const reposWithReadme = await attachReadmeAvailability(repos)
  const repoSummary = analyzeRepos(reposWithReadme)
  const score = calculateScore(user, repoSummary, recruiterGoal)
  const recommendations = generateRecommendations(user, repoSummary, score, recruiterGoal)

  return {
    user,
    repoSummary,
    score,
    recommendations,
    source: 'github',
  }
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
      hint: 'Tous les répos publics du profil sont pris en compte dans le diagnostic.',
    },
    {
      label: 'README inspectés',
      value: `${repoSummary.analyzedReadmeCount}/${repoSummary.reposWithReadme}`,
      hint: 'Chaque README détecté est inspecté en profondeur.',
    },
    {
      label: 'Activité récente',
      value: String(repoSummary.overallRecentlyUpdatedCount),
      hint: 'Nombre de répos mis à jour dans les 6 derniers mois.',
    },
    {
      label: 'Répos avec README',
      value: String(repoSummary.reposWithReadme),
      hint: 'Nombre de répos publics qui exposent déjà un README détectable.',
    },
    {
      label: 'Langages visibles',
      value: String(repoSummary.languageDiversityCount),
      hint: 'Diversité technique repérée sur l’ensemble des répos publics.',
    },
    {
      label: 'Qualité README',
      value:
        repoSummary.analyzedReadmeCount > 0
          ? `${repoSummary.readmeAverageScore}/10`
          : 'Non analysé',
      hint: 'Score moyen des README réellement inspectés.',
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

  async function runAnalysis(nextUsername: string) {
    setStatus('loading')
    setErrorMessage('')
    setAnalysis(null)

    try {
      const result = await buildPortfolioAnalysis(nextUsername, recruiterGoal)
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
      nextUsername?.trim() || username.trim() || lastSubmittedUsername || 'portfolio-pulse-demo'

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

        void buildPortfolioAnalysis(bootstrapConfig.username, recruiterGoal)
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
  }, [bootstrapConfig, recruiterGoal])

  const stats = analysis ? createStats(analysis) : []
  const recruiterProfile = getRecruiterProfile(recruiterGoal)
  const recruiterDiagnosis = analysis
    ? getRecruiterDiagnosis(recruiterGoal, analysis.repoSummary)
    : null

  return (
    <div className="app-shell">
      <header className="site-header">
        <div>
          <p className="site-header__eyebrow">Portfolio Pulse</p>
          <p className="site-header__tagline">
            Transforme un profil GitHub en diagnostic d’employabilité développeur.
          </p>
        </div>
      </header>

      <main className="page-content">
        <section className="hero-section">
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
          <section className="results-section">
            <div className="section-heading">
              <span className="eyebrow-chip">Dashboard résultat</span>
              <h2>Analyse terminée pour {analysis.user.name ?? analysis.user.login}</h2>
              <p>
                {analysis.source === 'demo'
                  ? 'Tu consultes actuellement une démonstration locale. Elle sert à tester l’interface sans appeler l’API GitHub.'
                  : 'Tous les répos publics du profil ont été analysés puis triés par pertinence portfolio pour rendre la lecture plus utile.'}
              </p>
              <p>Lecture active : {recruiterProfile.label}</p>
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
                <section className="results-subsection">
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

            <section className="repo-section">
              <div className="section-heading">
                <span className="eyebrow-chip">Tous les répos</span>
                <h2>Répos analysés</h2>
                <p>
                  Portfolio Pulse analyse les {analysis.repoSummary.totalRepoCount} répos publics
                  du profil, puis les trie pour faire remonter en premier les projets les plus
                  convaincants, les plus récents ou les plus complets.
                </p>
                <p>
                  Chaque README détecté est inspecté, ce qui donne un diagnostic plus complet mais
                  peut consommer plus vite la limite GitHub non authentifiée.
                </p>
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
