import type { FormEvent } from 'react'
import type { AnalysisMode, RecruiterGoal } from '../types/github'
import type { RecruiterProfile } from '../utils/recruiterMode'

interface SearchFormProps {
  username: string
  validationMessage: string | null
  isLoading: boolean
  analysisMode: AnalysisMode
  recruiterGoal: RecruiterGoal
  recruiterProfiles: RecruiterProfile[]
  onUsernameChange: (value: string) => void
  onAnalysisModeChange: (mode: AnalysisMode) => void
  onRecruiterGoalChange: (goal: RecruiterGoal) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function SearchForm({
  username,
  validationMessage,
  isLoading,
  analysisMode,
  recruiterGoal,
  recruiterProfiles,
  onUsernameChange,
  onAnalysisModeChange,
  onRecruiterGoalChange,
  onSubmit,
}: SearchFormProps) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <label className="search-form__label" htmlFor="github-username">
        Pseudo GitHub public
      </label>

      <div className="search-form__controls">
        <input
          id="github-username"
          className="search-form__input"
          type="text"
          value={username}
          onChange={(event) => onUsernameChange(event.target.value)}
          placeholder="Exemple : gaearon"
          autoComplete="off"
          spellCheck="false"
          disabled={isLoading}
          aria-describedby="search-help"
        />

        <button className="primary-button" type="submit" disabled={isLoading}>
          {isLoading
            ? 'Analyse en cours...'
            : analysisMode === 'demo'
              ? 'Lancer la démo'
              : 'Analyser le profil'}
        </button>
      </div>

      <div className="search-mode-toggle" role="group" aria-label="Mode d’analyse">
        <button
          className={`search-mode-toggle__button ${
            analysisMode === 'github' ? 'search-mode-toggle__button--active' : ''
          }`}
          type="button"
          onClick={() => onAnalysisModeChange('github')}
          disabled={isLoading}
        >
          GitHub réel
        </button>

        <button
          className={`search-mode-toggle__button ${
            analysisMode === 'demo' ? 'search-mode-toggle__button--active' : ''
          }`}
          type="button"
          onClick={() => onAnalysisModeChange('demo')}
          disabled={isLoading}
        >
          Démo locale
        </button>
      </div>

      <div className="search-form__select-group">
        <label className="search-form__label" htmlFor="recruiter-goal">
          Objectif recruteur
        </label>
        <select
          id="recruiter-goal"
          className="search-form__select"
          value={recruiterGoal}
          onChange={(event) => onRecruiterGoalChange(event.target.value as RecruiterGoal)}
          disabled={isLoading}
        >
          {recruiterProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.label}
            </option>
          ))}
        </select>
      </div>

      <p
        id="search-help"
        className={`search-form__message ${
          validationMessage ? 'search-form__message--error' : ''
        }`}
      >
        {validationMessage ??
          (analysisMode === 'demo'
            ? 'Le mode démo n’appelle pas GitHub. Il génère un résultat local pour tester l’interface.'
            : 'Portfolio Pulse analyse le profil, tous les répos publics et tous les README détectés.')}
      </p>
    </form>
  )
}
