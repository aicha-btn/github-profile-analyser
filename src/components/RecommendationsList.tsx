interface RecommendationsListProps {
  title: string
  items: string[]
  tone: 'positive' | 'warning' | 'action'
}

export function RecommendationsList({
  title,
  items,
  tone,
}: RecommendationsListProps) {
  return (
    <section className={`panel-card panel-card--${tone}`}>
      <div className="panel-card__header">
        <span className="eyebrow-chip">{title}</span>
      </div>

      <ul className="recommendation-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
