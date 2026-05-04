import type { GithubUser, LanguageStat } from '../types/github'
import { TechBadge } from './TechBadge'

interface ProfileCardProps {
  user: GithubUser
  languages: LanguageStat[]
  techSignals: string[]
}

function normalizeExternalUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  return `https://${url}`
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
  }).format(new Date(value))
}

export function ProfileCard({ user, languages, techSignals }: ProfileCardProps) {
  const hasPortfolio = user.blog.trim().length > 0

  return (
    <section className="panel-card panel-card--profile">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Profil et stack</span>
      </div>

      <div className="profile-card">
        <div className="profile-card__identity">
          <img
            className="profile-card__avatar"
            src={user.avatar_url}
            alt={`Avatar de ${user.login}`}
          />

          <div className="profile-card__content">
            <div>
              <h3>{user.name ?? user.login}</h3>
              <p className="profile-card__handle">@{user.login}</p>
            </div>

            <p className="profile-card__bio">
              {user.bio?.trim() || 'Aucune bio renseignée pour le moment.'}
            </p>

            <div className="link-row">
              <a className="secondary-link" href={user.html_url} target="_blank" rel="noreferrer">
                Voir le profil GitHub
              </a>

              {hasPortfolio ? (
                <a
                  className="secondary-link"
                  href={normalizeExternalUrl(user.blog)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir le portfolio
                </a>
              ) : (
                <span className="muted-note">Aucun lien portfolio détecté</span>
              )}
            </div>
          </div>
        </div>

        <dl className="profile-card__stats">
          <div>
            <dt>Repos publics</dt>
            <dd>{user.public_repos}</dd>
          </div>
          <div>
            <dt>Followers</dt>
            <dd>{user.followers}</dd>
          </div>
          <div>
            <dt>Following</dt>
            <dd>{user.following}</dd>
          </div>
          <div>
            <dt>Compte créé</dt>
            <dd>{formatCreatedAt(user.created_at)}</dd>
          </div>
        </dl>

        <div className="profile-card__tech">
          <div className="profile-card__tech-block">
            <h3>Langages repérés</h3>
            <div className="badge-wrap">
              {languages.length > 0 ? (
                languages.map((language) => (
                  <TechBadge key={language.name} label={language.name} count={language.repoCount} />
                ))
              ) : (
                <span className="muted-note">Aucun langage principal détecté.</span>
              )}
            </div>
          </div>

          <div className="profile-card__tech-block">
            <h3>Signaux de stack</h3>
            <div className="badge-wrap">
              {techSignals.length > 0 ? (
                techSignals.map((signal) => (
                  <TechBadge key={signal} label={signal} className="pill--accented" />
                ))
              ) : (
                <span className="muted-note">Aucun mot-clé de stack moderne détecté.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
