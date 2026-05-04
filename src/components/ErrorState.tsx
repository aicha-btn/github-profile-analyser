interface ErrorStateProps {
  message: string
  onRetry: () => void
  onUseDemo: () => void
  canRetry: boolean
  submittedUsername: string
}

export function ErrorState({
  message,
  onRetry,
  onUseDemo,
  canRetry,
  submittedUsername,
}: ErrorStateProps) {
  return (
    <section className="feedback-card feedback-card--error">
      <div className="panel-card__header">
        <span className="eyebrow-chip">Erreur</span>
      </div>

      <h2>Analyse impossible</h2>
      <p>{message}</p>
      {submittedUsername ? (
        <p className="muted-note">Pseudo demandé : @{submittedUsername}</p>
      ) : null}

      <ul className="signal-list">
        <li>Vérifie que le pseudo GitHub existe et qu’il est public.</li>
        <li>Si GitHub limite les requêtes, attends un peu ou repasse sur une analyse rapide.</li>
        <li>Un nouveau clic sur “Réessayer” relance exactement la même analyse.</li>
      </ul>

      {canRetry ? (
        <button className="primary-button" type="button" onClick={onRetry}>
          Réessayer
        </button>
      ) : null}

      <button className="secondary-button" type="button" onClick={onUseDemo}>
        Continuer en démo locale
      </button>
    </section>
  )
}
