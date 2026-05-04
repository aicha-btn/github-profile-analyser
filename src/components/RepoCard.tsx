import { TechBadge } from './TechBadge'
import type { AnalyzedRepo } from '../types/github'

interface RepoCardProps {
  repo: AnalyzedRepo
}

function getSelectionClass(label: string): string {
  switch (label) {
    case 'Projet vitrine':
      return 'pill--selection-showcase'
    case 'Projet actif':
      return 'pill--selection-active'
    case 'Projet visible':
      return 'pill--selection-visible'
    case 'Projet technique':
      return 'pill--selection-technical'
    default:
      return 'pill--selection-promising'
  }
}

function normalizeExternalUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `https://${url}`
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function RepoCard({ repo }: RepoCardProps) {
  const signalMessages = [
    repo.hasClearDescription ? 'Description claire' : 'Description à renforcer',
    repo.hasReadme ? 'README détecté' : 'README absent',
    repo.hasDemo ? 'Démo disponible' : 'Pas de démo visible',
    repo.hasReadableName ? 'Nom lisible' : 'Nom à clarifier',
  ]

  const readmeSignalLabels = [
    repo.readmeAnalysis.signals.hasInstallation ? 'Installation' : null,
    repo.readmeAnalysis.signals.hasTechStack ? 'Stack' : null,
    repo.readmeAnalysis.signals.hasFeatures ? 'Fonctionnalités' : null,
    repo.readmeAnalysis.signals.hasScreenshots ? 'Screenshots' : null,
    repo.readmeAnalysis.signals.hasDemoLink ? 'Démo' : null,
    repo.readmeAnalysis.signals.hasFutureImprovements ? 'Roadmap' : null,
  ].filter((signal): signal is string => Boolean(signal))

  return (
    <article className="repo-card">
      <div className="repo-card__top">
        <div>
          <span className={`pill pill--selection ${getSelectionClass(repo.selectionLabel)}`}>
            {repo.selectionLabel}
          </span>
          <h3>{repo.name}</h3>
          <p>{repo.description?.trim() || 'Aucune description renseignée.'}</p>
        </div>

        <div className="link-row">
          <a className="secondary-link" href={repo.html_url} target="_blank" rel="noreferrer">
            GitHub
          </a>

          {repo.homepage?.trim() ? (
            <a
              className="secondary-link"
              href={normalizeExternalUrl(repo.homepage)}
              target="_blank"
              rel="noreferrer"
            >
              Démo
            </a>
          ) : null}
        </div>
      </div>

      <div className="repo-card__meta">
        {repo.language ? <TechBadge label={repo.language} /> : null}
        {repo.detectedKeywords.slice(0, 3).map((keyword) => (
          <TechBadge className="pill--accented" key={keyword} label={keyword} />
        ))}
        {repo.isRecentlyUpdated ? <span className="pill pill--success">Récent</span> : null}
      </div>

      <dl className="repo-card__stats">
        <div>
          <dt>Mise à jour</dt>
          <dd>{formatUpdatedAt(repo.updated_at)}</dd>
        </div>
        <div>
          <dt>Stars</dt>
          <dd>{repo.stargazers_count}</dd>
        </div>
        <div>
          <dt>Forks</dt>
          <dd>{repo.forks_count}</dd>
        </div>
        <div>
          <dt>Niveau README</dt>
          <dd>
            {repo.hasReadme
              ? repo.readmeAnalysis.analyzed
                ? `${repo.readmeAnalysis.level} (${repo.readmeAnalysis.score}/${repo.readmeAnalysis.maxScore})`
                : 'README présent'
              : 'README absent'}
          </dd>
        </div>
      </dl>

      {repo.readmeAnalysis.analyzed ? (
        <div className="repo-card__readme">
          <p className="repo-card__readme-title">README inspecté dans l’analyse</p>
          <div className="badge-wrap">
            {readmeSignalLabels.map((signal) => (
              <span className="pill pill--readme" key={signal}>
                {signal}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <ul className="signal-list">
        {signalMessages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </article>
  )
}
