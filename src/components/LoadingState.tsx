export function LoadingState() {
  return (
    <section className="feedback-card">
      <div className="loading-spinner" aria-hidden="true" />
      <h2>Analyse en cours</h2>
      <p>
        Github Analyzer récupère le profil GitHub, analyse les répos publics et n’inspecte les
        README que si tu demandes une lecture approfondie.
      </p>
    </section>
  )
}
