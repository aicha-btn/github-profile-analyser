import type { LanguageStat } from '../types/github'
import { TechBadge } from './TechBadge'

interface LanguageBadgesProps {
  languages: LanguageStat[]
  techSignals: string[]
}

export function LanguageBadges({ languages, techSignals }: LanguageBadgesProps) {
  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Badges techniques</span>
      </div>

      <div className="badge-section">
        <div>
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

        <div>
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
    </section>
  )
}
