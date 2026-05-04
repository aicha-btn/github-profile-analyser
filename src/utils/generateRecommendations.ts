import type {
  GithubUser,
  RecommendationGroups,
  RecruiterGoal,
  RepoAnalysisSummary,
  ScoreResult,
} from '../types/github'
import { getRecruiterProfile, getRecruiterDiagnosis } from './recruiterMode'

function pushUnique(items: string[], message: string): void {
  if (!items.includes(message)) {
    items.push(message)
  }
}

function hasPortfolioLink(blog: string): boolean {
  return blog.trim().length > 0
}

export function generateRecommendations(
  user: GithubUser,
  repoSummary: RepoAnalysisSummary,
  score: ScoreResult,
  goal: RecruiterGoal,
): RecommendationGroups {
  const strengths: string[] = []
  const improvements: string[] = []
  const checklist: string[] = []
  const recruiterProfile = getRecruiterProfile(goal)
  const recruiterDiagnosis = getRecruiterDiagnosis(goal, repoSummary)

  if (score.total >= 75) {
    pushUnique(
      strengths,
      'Le profil envoie déjà plusieurs signaux positifs pour une candidature junior en développement web.',
    )
  } else if (score.total >= 55) {
    pushUnique(
      strengths,
      'La base est solide : quelques ajustements ciblés peuvent rapidement rendre le portfolio plus convaincant.',
    )
  }

  if (user.bio?.trim()) {
    pushUnique(strengths, 'La bio GitHub apporte déjà du contexte sur le profil.')
  } else {
    pushUnique(
      improvements,
      "L'absence de bio rend le positionnement moins lisible pour un recruteur.",
    )
    pushUnique(
      checklist,
      'Ajouter une bio GitHub courte avec ton rôle, ta stack et le type de poste recherché.',
    )
  }

  if (hasPortfolioLink(user.blog)) {
    pushUnique(strengths, 'Le profil propose déjà un lien externe vers un site ou un portfolio.')
  } else {
    pushUnique(
      improvements,
      'Le profil ne renvoie pas encore vers un portfolio, une landing page ou un CV en ligne.',
    )
    pushUnique(checklist, 'Ajouter un lien de portfolio ou de site personnel dans le profil GitHub.')
  }

  if (repoSummary.reposWithDemo >= 2) {
    pushUnique(strengths, 'Plusieurs projets proposent une démo en ligne, ce qui aide beaucoup la projection recruteur.')
  } else if (repoSummary.reposWithDemo === 1) {
    pushUnique(strengths, 'Au moins un projet propose déjà une démo en ligne.')
    pushUnique(
      checklist,
      'Ajouter une deuxième démo publique pour montrer plusieurs projets directement consultables.',
    )
  } else {
    pushUnique(
      improvements,
      "Aucune démo n'est visible sur les projets analysés, ce qui réduit l'impact portfolio.",
    )
    pushUnique(
      checklist,
      'Publier au moins 2 démos sur Vercel, Netlify ou GitHub Pages pour les projets principaux.',
    )
  }

  if (repoSummary.reposWithReadme >= Math.max(1, Math.ceil(repoSummary.analyzedRepoCount / 2))) {
    pushUnique(strengths, 'La présence de README est visible sur une part importante des répos analysés.')
  } else {
    pushUnique(
      improvements,
      'Les README sont encore trop peu visibles sur les répos analysés.',
    )
    pushUnique(
      checklist,
      'Ajouter ou améliorer les README des 3 projets les plus importants avec objectif, stack, installation et captures.',
    )
    pushUnique(
      checklist,
      'Ajouter une section "problème résolu" dans les README pour expliquer la valeur du projet.',
    )
  }

  if (repoSummary.analyzedReadmeCount > 0) {
    if (repoSummary.readmeAverageScore >= 8) {
      pushUnique(
        strengths,
        'Les README analysés sont détaillés et bien structurés, avec un niveau déjà professionnel.',
      )
    } else if (repoSummary.readmeAverageScore >= 5) {
      pushUnique(
        strengths,
        'Les README analysés sont corrects et apportent déjà un bon niveau de contexte.',
      )
      pushUnique(
        checklist,
        'Ajouter des captures, une roadmap ou une section installation sur les README encore intermédiaires.',
      )
    } else {
      pushUnique(
        improvements,
        'Le contenu des README analysés reste encore trop basique pour vraiment valoriser les projets.',
      )
      pushUnique(
        checklist,
        'Améliorer les README prioritaires avec installation, stack, fonctionnalités, démo et améliorations futures.',
      )
    }
  }

  if (
    repoSummary.reposWithDescription === repoSummary.analyzedRepoCount &&
    repoSummary.analyzedRepoCount > 0
  ) {
    pushUnique(strengths, 'Les répos analysés possèdent tous une description visible dès la liste GitHub.')
  } else {
    pushUnique(
      improvements,
      'Certaines descriptions de repos manquent ou restent trop discrètes.',
    )
    pushUnique(
      checklist,
      'Compléter les descriptions GitHub des répos importants avec une phrase claire sur le problème résolu.',
    )
  }

  if (repoSummary.readableNamesCount < repoSummary.analyzedRepoCount) {
    pushUnique(
      improvements,
      'Quelques noms de répos pourraient être plus explicites pour gagner en lisibilité.',
    )
    pushUnique(
      checklist,
      'Renommer les répos trop vagues pour mettre en avant le produit, la fonctionnalité ou la stack.',
    )
  } else if (repoSummary.analyzedRepoCount > 0) {
    pushUnique(strengths, 'Les noms de répos analysés sont globalement lisibles et professionnels.')
  }

  if (repoSummary.overallRecentlyUpdatedCount > 0) {
    pushUnique(
      strengths,
      'Une activité récente est visible, ce qui montre que le portfolio continue de vivre.',
    )
  } else {
    pushUnique(
      improvements,
      'Aucune activité récente ne ressort, ce qui peut donner une impression de portfolio figé.',
    )
    pushUnique(
      checklist,
      'Mettre à jour au moins un projet vitrine avec une amélioration concrète et récente.',
    )
  }

  if (repoSummary.languageDiversityCount >= 2) {
    pushUnique(
      strengths,
      'Le profil montre déjà une diversité technique intéressante à travers plusieurs langages.',
    )
  } else {
    pushUnique(
      improvements,
      "La diversité technique visible reste encore limitée sur les répos analysés.",
    )
  }

  if (
    !repoSummary.modernTechSignals.includes('react') &&
    !repoSummary.modernTechSignals.includes('typescript')
  ) {
    pushUnique(
      checklist,
      'Prévoir un prochain projet avec React ou TypeScript pour renforcer le signal frontend moderne.',
    )
  }

  if (!repoSummary.modernTechSignals.includes('api')) {
    pushUnique(
      checklist,
      'Ajouter un projet consommant une API publique avec gestion du loading et des erreurs.',
    )
  } else {
    pushUnique(
      strengths,
      "Des signaux de projets connectés à une API sont déjà visibles dans l'historique.",
    )
  }

  if (repoSummary.analyzedRepoCount >= 3) {
    pushUnique(
      checklist,
      'Mettre clairement en avant les 3 meilleurs projets avec README, démo et description soignée.',
    )
  } else {
    pushUnique(
      checklist,
      'Publier au moins 3 projets publics solides pour créer un portfolio plus rassurant.',
    )
  }

  if (strengths.length === 0) {
    pushUnique(
      strengths,
      "Le profil est public et exploitable : c'est déjà une bonne base pour construire une vitrine plus forte.",
    )
  }

  if (recruiterDiagnosis.fitScore >= 75) {
    pushUnique(
      strengths,
      `Le profil est déjà bien aligné avec l’objectif ${recruiterProfile.label.toLowerCase()}.`,
    )
  } else {
    pushUnique(
      improvements,
      `Le profil n’est pas encore totalement aligné avec l’objectif ${recruiterProfile.label.toLowerCase()}.`,
    )
  }

  switch (goal) {
    case 'alternance-frontend':
      if (!repoSummary.modernTechSignals.includes('react')) {
        pushUnique(checklist, 'Ajouter au moins un projet React proprement présenté pour renforcer le positionnement frontend.')
      }
      if (repoSummary.reposWithDemo === 0) {
        pushUnique(checklist, 'Publier une ou deux démos web visibles pour rassurer un recruteur frontend.')
      }
      break
    case 'alternance-fullstack':
      if (!repoSummary.modernTechSignals.includes('node')) {
        pushUnique(checklist, 'Ajouter un projet avec une vraie couche backend ou Node.js pour crédibiliser le positionnement fullstack.')
      }
      if (!repoSummary.modernTechSignals.includes('api')) {
        pushUnique(checklist, 'Montrer un projet avec API, logique métier et circulation claire des données côté client et serveur.')
      }
      break
    case 'stage-developpeur-web':
      pushUnique(
        checklist,
        'Privilégier des projets simples mais très clairs, avec README propres, objectifs compréhensibles et captures d’écran.',
      )
      break
    case 'junior-react':
      if (!repoSummary.modernTechSignals.includes('react')) {
        pushUnique(checklist, 'Créer un projet centré sur React pour rendre l’objectif junior React plus crédible.')
      }
      if (!repoSummary.modernTechSignals.includes('typescript')) {
        pushUnique(checklist, 'Ajouter TypeScript sur un projet React pour envoyer un signal plus moderne et rassurant.')
      }
      break
  }

  return {
    strengths: strengths.slice(0, 5),
    improvements: improvements.slice(0, 5),
    checklist: checklist.slice(0, 8),
  }
}
