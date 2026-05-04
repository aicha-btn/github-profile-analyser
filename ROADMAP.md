# Portfolio Pulse Roadmap

Ce document suit l'avancement version par version. Seules `V0` et `V1` sont autorisées pour l'instant.

## V0 — Initialisation propre du projet

Objectif : avoir une base React TypeScript propre et prête à développer.

- [x] Créer le projet avec Vite React TypeScript si nécessaire
- [x] Nettoyer les fichiers inutiles générés par Vite
- [x] Créer une structure de dossiers claire
- [x] Ajouter un style global propre
- [x] Vérifier que l’app démarre avec `npm run dev`
- [x] Préparer le README de base
- [x] Créer `ROADMAP.md` avec toutes les versions

## V1 — MVP Portfolio Pulse

Objectif : créer une première version complète, utilisable et démontrable.

- [x] Champ de recherche pour entrer un username GitHub
- [x] Validation simple du champ
- [x] Appel API pour récupérer le profil GitHub
- [x] Appel API pour récupérer les repositories publics
- [x] Gestion loading
- [x] Gestion error
- [x] Gestion success
- [x] Affichage des infos du profil
- [x] Affichage des repositories principaux
- [x] Calcul d’un score global sur 100
- [x] Calcul de statistiques principales
- [x] Génération de points forts
- [x] Génération de points à améliorer
- [x] Génération d’une checklist actionnable
- [x] Interface responsive propre
- [x] README mis à jour avec description, stack, fonctionnalités et lancement local

## V1.1 — Polish et robustesse

Objectif : rendre le MVP plus propre, plus robuste et plus agréable.

- [x] Améliorer le design responsive
- [x] Améliorer les messages d’erreur
- [x] Ajouter un état vide avant recherche
- [x] Ajouter une limite de repos analysés
- [x] Ajouter un tri intelligent des repos
- [x] Ajouter badges de langages
- [x] Améliorer le README
- [x] Ajouter screenshots du projet
- [x] Préparer le déploiement Vercel

## V2 — Analyse README plus intelligente

Objectif : analyser le contenu des README pour donner un score plus pertinent.

- [x] Récupérer le README de quelques repos principaux seulement
- [x] Décoder le contenu README depuis l’API GitHub
- [x] Détecter les sections importantes
- [x] Détecter présence installation
- [x] Détecter présence stack / technologies
- [x] Détecter présence fonctionnalités
- [x] Détecter présence screenshots/images
- [x] Détecter présence lien démo
- [x] Détecter présence améliorations futures
- [x] Créer un score README par repo
- [x] Afficher “README basique / correct / professionnel”

## V3 — Mode recruteur

Objectif : adapter l’analyse selon un objectif professionnel.

- [x] Ajouter un sélecteur d’objectif
- [x] Adapter le scoring selon l’objectif
- [x] Adapter les recommandations selon l’objectif
- [x] Mettre en avant les technos attendues
- [x] Afficher un diagnostic orienté recruteur

## V4 — Progression avant/après

Objectif : permettre de sauvegarder une analyse localement et comparer l’évolution.

- [ ] Sauvegarder une analyse dans `localStorage`
- [ ] Afficher l’historique local des analyses
- [ ] Comparer ancien score et nouveau score
- [ ] Afficher progression en points
- [ ] Afficher progression par catégorie
- [ ] Ajouter bouton “Nouvelle analyse”
- [ ] Ajouter bouton “Effacer historique”

## V5 — Génération assistée plus avancée

Objectif : ajouter des suggestions de texte sans forcément utiliser une IA payante.

- [ ] Générer une bio GitHub optimisée avec templates locaux
- [ ] Générer une description de repo avec templates locaux
- [ ] Générer une structure README professionnelle
- [ ] Ajouter un bouton copier
- [ ] Plus tard seulement : envisager une API IA gratuite ou peu coûteuse
