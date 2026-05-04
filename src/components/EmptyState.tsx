interface EmptyStateProps {
  onUseExample: (username: string) => void
  onUseDemo: (username?: string) => void
}

const EXAMPLE_USERNAMES = ['gaearon', 'sindresorhus', 'yyx990803']

export function EmptyState({ onUseExample, onUseDemo }: EmptyStateProps) {
  return (
    <section className="feedback-card feedback-card--empty">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Avant de commencer</span>
      </div>

      <div className="empty-state">
        <div className="empty-state__copy">
          <h2>L’analyse n’a pas encore démarré</h2>
          <p>
            Entre un pseudo GitHub public pour afficher un score, tous les répos analysés, les
            points forts et une checklist d’amélioration.
          </p>
        </div>

        <div className="empty-state__examples">
          <p className="empty-state__label">Exemples à tester</p>
          <div className="empty-state__chips">
            {EXAMPLE_USERNAMES.map((exampleUsername) => (
              <button
                key={exampleUsername}
                className="ghost-chip"
                type="button"
                onClick={() => onUseExample(exampleUsername)}
              >
                @{exampleUsername}
              </button>
            ))}

            <button
              className="ghost-chip ghost-chip--accent"
              type="button"
              onClick={() => onUseDemo()}
            >
              Voir une démo locale
            </button>
          </div>
        </div>

        <ul className="signal-list">
          <li>Le dashboard analyse tous les répos publics du profil renseigné.</li>
          <li>Le score détaille les points forts du profil et les axes à améliorer.</li>
          <li>L’objectif est de produire un diagnostic clair, utile et montrable.</li>
        </ul>
      </div>
    </section>
  )
}
