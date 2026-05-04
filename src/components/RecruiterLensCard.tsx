import type { RecruiterGoal } from '../types/github'
import type { RecruiterDiagnosis, RecruiterProfile } from '../utils/recruiterMode'
import { TechBadge } from './TechBadge'

interface RecruiterLensCardProps {
  goal: RecruiterGoal
  profile: RecruiterProfile
  diagnosis: RecruiterDiagnosis
}

export function RecruiterLensCard({
  goal,
  profile,
  diagnosis,
}: RecruiterLensCardProps) {
  void goal

  return (
    <section className="panel-card panel-card--recruiter">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Mode recruteur</span>
      </div>

      <div className="recruiter-card">
        <div className="recruiter-card__hero">
          <div>
            <h3>{profile.label}</h3>
            <p>{profile.description}</p>
          </div>

          <div className="recruiter-score">
            <strong>{diagnosis.fitScore}%</strong>
            <span>Adéquation estimée</span>
          </div>
        </div>

        <div className="recruiter-card__summary">
          <h4>{diagnosis.headline}</h4>
          <p>{diagnosis.summary}</p>
        </div>

        <div className="recruiter-card__columns">
          <div className="recruiter-card__column">
            <p className="recruiter-card__label">Technos attendues</p>
            <div className="badge-wrap">
              {profile.expectedTechs.map((tech) => (
                <TechBadge key={tech.id} label={tech.label} className="pill--expected" />
              ))}
            </div>
          </div>

          <div className="recruiter-card__column">
            <p className="recruiter-card__label">Déjà visibles</p>
            <div className="badge-wrap">
              {diagnosis.matchedTechs.length > 0 ? (
                diagnosis.matchedTechs.map((tech) => (
                  <TechBadge className="pill--success-soft" key={tech} label={tech} />
                ))
              ) : (
                <span className="muted-note">Aucun signal clé détecté pour l’instant.</span>
              )}
            </div>
          </div>

          <div className="recruiter-card__column">
            <p className="recruiter-card__label">À renforcer</p>
            <div className="badge-wrap">
              {diagnosis.missingTechs.length > 0 ? (
                diagnosis.missingTechs.map((tech) => (
                  <TechBadge className="pill--warning-soft" key={tech} label={tech} />
                ))
              ) : (
                <span className="muted-note">Les attentes principales sont déjà bien couvertes.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
