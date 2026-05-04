import { useState, type CSSProperties } from 'react'
import type { ScoreResult } from '../types/github'
import type { StatItem } from './StatsGrid'

interface ScoreCardProps {
  score: ScoreResult
  stats: StatItem[]
}

function getScoreMessage(total: number): string {
  if (total >= 80) {
    return 'Très bon signal recruteur : le portfolio est déjà convaincant.'
  }

  if (total >= 60) {
    return 'Base solide : quelques optimisations peuvent encore faire monter le niveau.'
  }

  if (total >= 40) {
    return 'Le potentiel est réel, mais le profil a besoin de plus de lisibilité.'
  }

  return 'Le diagnostic met surtout en évidence des fondations à renforcer.'
}

function getScorePalette(completion: number): { color: string; softColor: string } {
  const hue = 20 + completion * 1.15
  const cappedHue = Math.min(hue, 152)

  return {
    color: `hsl(${cappedHue} 70% 38%)`,
    softColor: `hsl(${Math.max(18, cappedHue - 18)} 86% 66%)`,
  }
}

export function ScoreCard({ score, stats }: ScoreCardProps) {
  const [activePanel, setActivePanel] = useState<'score' | 'stats'>('score')

  return (
    <section className="panel-card panel-card--overview">
      <div className="panel-card__header panel-card__header--stacked">
        <span className="eyebrow-chip">Vue d’ensemble</span>

        <div className="insight-toggle" role="tablist" aria-label="Panneau de synthèse">
          <button
            className={`insight-toggle__button ${
              activePanel === 'score' ? 'insight-toggle__button--active' : ''
            }`}
            type="button"
            role="tab"
            aria-selected={activePanel === 'score'}
            onClick={() => setActivePanel('score')}
            onMouseEnter={() => setActivePanel('score')}
          >
            Score
          </button>
          <button
            className={`insight-toggle__button ${
              activePanel === 'stats' ? 'insight-toggle__button--active' : ''
            }`}
            type="button"
            role="tab"
            aria-selected={activePanel === 'stats'}
            onClick={() => setActivePanel('stats')}
            onMouseEnter={() => setActivePanel('stats')}
          >
            Statistiques
          </button>
        </div>
      </div>

      <div className="score-card score-card--overview">
        <div className="score-card__hero score-card__hero--overview">
          <div className="score-orb">
            <p className="score-card__total">
              <span>{score.total}</span>
              <small>/100</small>
            </p>
          </div>

          <div className="score-card__hero-copy">
            <p className="score-card__summary">{getScoreMessage(score.total)}</p>
            <p className="muted-note">
              Le score est un diagnostic pédagogique, pas un verdict absolu.
            </p>
          </div>
        </div>

        {activePanel === 'score' ? (
          <div className="score-card__details">
            {score.categories.map((category) => {
              const completion = (category.score / category.maxScore) * 100
              const palette = getScorePalette(completion)

              return (
                <article className="score-row" key={category.label}>
                  <div className="score-row__top">
                    <h3>{category.label}</h3>
                    <strong>
                      {category.score}/{category.maxScore}
                    </strong>
                  </div>

                  <div
                    className="score-row__bar"
                    aria-hidden="true"
                    style={
                      {
                        '--score-width': `${completion}%`,
                        '--score-color': palette.color,
                        '--score-soft-color': palette.softColor,
                      } as CSSProperties
                    }
                  />

                  <p>{category.description}</p>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="stats-grid stats-grid--overview">
            {stats.map((stat) => (
              <article className="stat-card" key={stat.label}>
                <p className="stat-card__label">{stat.label}</p>
                <strong className="stat-card__value">{stat.value}</strong>
                <p className="stat-card__hint">{stat.hint}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
