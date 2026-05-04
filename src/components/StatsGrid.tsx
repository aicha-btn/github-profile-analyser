export interface StatItem {
  label: string
  value: string
  hint: string
}

interface StatsGridProps {
  stats: StatItem[]
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="panel-card">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Statistiques clés</span>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <article className="stat-card" key={stat.label}>
            <p className="stat-card__label">{stat.label}</p>
            <strong className="stat-card__value">{stat.value}</strong>
            <p className="stat-card__hint">{stat.hint}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
