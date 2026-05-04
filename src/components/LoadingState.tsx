export function LoadingState() {
  return (
    <section className="feedback-card">
      <div className="loading-spinner" aria-hidden="true" />
      <h2>Analyse en cours</h2>
      <p>
        Portfolio Pulse récupère le profil GitHub, parcourt tous les répos publics et inspecte
        chaque README détecté.
      </p>
    </section>
  )
}
