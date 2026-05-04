# Portfolio Pulse

Portfolio Pulse transforme un profil GitHub en diagnostic d'employabilité développeur.

## Pitch

Cette application React TypeScript analyse un profil GitHub public, sélectionne les repositories les plus représentatifs et génère :

- un score global sur 100 ;
- un résumé des signaux forts du profil ;
- des points à améliorer ;
- une checklist concrète pour rendre le portfolio plus convaincant.

## Objectif du projet

Ce projet a été pensé comme un projet portfolio frontend pour démontrer :

- la création d'une application React avec TypeScript et Vite ;
- la consommation d'une API réelle ;
- la gestion des états `loading`, `error` et `success` ;
- la transformation de données API en logique métier exploitable ;
- la création d'un dashboard clair et responsive ;
- l'organisation propre d'un projet frontend.

## Fonctionnalités actuelles

### V0

- initialisation du projet avec Vite React TypeScript ;
- structure de dossiers dédiée aux composants, services, utilitaires et types ;
- base CSS globale personnalisée ;
- roadmap versionnée du projet.

### V1

- recherche d'un pseudo GitHub public ;
- validation simple du username ;
- récupération du profil public GitHub ;
- récupération des repositories publics ;
- détection de README sur les répos publics ;
- calcul d'un score sur 100 avec détail par catégorie ;
- affichage des informations de profil ;
- affichage des répos analysés ;
- recommandations automatiques : points forts, points à améliorer, checklist actionnable ;
- interface responsive de type dashboard.

### V1.1

- état vide avant recherche avec exemples de usernames ;
- mode démo local utile pour les screenshots et les présentations ;
- messages d’erreur plus guidants ;
- tri plus intelligent des répos analysés ;
- badges de langages et signaux de stack ;
- section de répos en défilement horizontal ;
- préparation du déploiement Vercel.

### V2

- analyse détaillée du contenu README sur tous les répos détectés ;
- décodage du README depuis l’API GitHub ;
- détection de sections clés : installation, stack, fonctionnalités, screenshots, démo, roadmap ;
- score README par répo sur 10 ;
- niveau affiché : `README basique`, `README correct` ou `README professionnel` ;
- impact du README sur l’analyse globale.

### V3

- sélecteur d’objectif recruteur ;
- modes disponibles :
  - alternance frontend ;
  - alternance fullstack ;
  - stage développeur web ;
  - junior React ;
- scoring réorienté selon l’objectif sélectionné ;
- recommandations adaptées à la cible ;
- technos attendues mises en avant ;
- diagnostic orienté recruteur avec adéquation estimée.

## Stack technique

- React
- TypeScript
- Vite
- CSS
- API GitHub publique

## API utilisée

Endpoints principaux :

- `GET https://api.github.com/users/{username}`
- `GET https://api.github.com/users/{username}/repos?sort=updated&per_page=100`
- `GET https://api.github.com/repos/{owner}/{repo}/readme`

Note : l'application analyse désormais tous les répos publics du profil et inspecte chaque README détecté. Sur de très gros profils, cela peut donc atteindre plus vite la limite GitHub non authentifiée.

## Installation locale

```bash
cd /Users/aicha/Documents/portfolio-pulse
npm install
npm run dev
```

Puis ouvrir l'URL affichée dans le terminal, en général `http://localhost:5173`.

## Mode démo local

Un mode démo local est disponible pour montrer l'interface même si l'API GitHub est limitée.

Exemple d'URL :

```text
http://localhost:5173/?demo=1
```

Ce mode affiche une analyse locale fictive, uniquement pour la démonstration visuelle.

## Scripts utiles

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Logique de scoring

Le score global est calculé sur 100 points :

- Profil GitHub : 20 points
- Qualité des repos : 30 points
- Lisibilité portfolio : 25 points
- Activité récente : 15 points
- Diversité technique : 10 points

Le résultat reste un diagnostic pédagogique : il aide à prioriser les améliorations visibles par un recruteur.

## Tri des répos analysés

L'application analyse tous les répos publics du profil dans le dashboard, puis les trie pour faire remonter en premier :

- les projets non archivés ;
- les projets avec description claire ;
- les projets avec README ;
- les projets avec démo ;
- les projets récemment mis à jour ;
- les projets dont le nom et la stack sont lisibles.

Cela garde une lecture claire tout en montrant absolument tous les répos du profil.

## Analyse README

En `V2`, Portfolio Pulse inspecte le contenu des README sur tous les répos détectés.

Signaux recherchés :

- section d’installation ;
- stack ou technologies ;
- fonctionnalités ;
- screenshots ou images ;
- lien de démo ;
- améliorations futures / roadmap ;
- structure globale du document.

Chaque README analysé reçoit un score sur `10` puis un niveau :

- `README basique`
- `README correct`
- `README professionnel`

## Mode recruteur

En `V3`, l’application peut relire le même profil GitHub selon un objectif professionnel précis.

Objectifs disponibles :

- `Alternance frontend`
- `Alternance fullstack`
- `Stage développeur web`
- `Junior React`

Ce mode agit sur trois choses :

- le scoring global ;
- les recommandations ;
- la mise en avant des technos attendues par le recruteur.

Le dashboard affiche aussi :

- une adéquation estimée ;
- les signaux déjà visibles ;
- les technos ou signaux qu’il manque encore pour mieux coller au poste visé.

## Screenshots

### Etat vide

![Etat vide](./docs/screenshots/empty-state.png)

### Dashboard desktop

![Dashboard desktop](./docs/screenshots/dashboard-analysis.png)

### Dashboard mobile

![Dashboard mobile](./docs/screenshots/dashboard-mobile.png)

## Déploiement Vercel

Le projet est préparé pour un déploiement simple sur Vercel avec [vercel.json](./vercel.json).

Etapes :

1. importer le dépôt GitHub dans Vercel ;
2. laisser Vercel détecter le projet Vite ;
3. vérifier que la commande de build est `npm run build` ;
4. vérifier que le dossier de sortie est `dist` ;
5. lancer le déploiement.

## Prochaines améliorations prévues

- `V4` : historique local des analyses ;
- `V5` : génération assistée de textes portfolio.

## Ce que le projet démontre techniquement

- séparation claire entre UI, services API, types et utilitaires métier ;
- gestion de données externes en frontend ;
- création d'heuristiques de scoring ;
- restitution visuelle d'un diagnostic produit.
