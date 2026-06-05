# 🏅 Olympiades IUT

Tableau de bord en temps réel pour les Olympiades entre amis. Un admin saisit les scores, tout le monde suit le classement en direct via un lien partagé.

## Stack

- **Frontend** : React + Vite
- **Backend / DB** : Supabase (PostgreSQL + Realtime + Storage)
- **Déploiement** : Vercel

---

## 1. Créer le projet Supabase

1. Rendez-vous sur [supabase.com](https://supabase.com) et créez un nouveau projet.
2. Dans **SQL Editor**, copiez-collez le contenu de `supabase/schema.sql` et exécutez-le.
   - Cela crée les tables `players`, `events`, `scores`, les politiques RLS et le bucket `avatars`.
3. Dans **Project Settings → API**, copiez votre **Project URL** et votre **anon public key**.

---

## 2. Configurer l'environnement

Copiez `.env.example` vers `.env` à la racine :

```bash
cp .env.example .env
```

Remplissez les valeurs :

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ADMIN_PASSWORD=votre-mot-de-passe-secret
```

> **Note :** Ces variables sont embarquées dans le bundle JS côté client. Le mot de passe admin est une protection d'interface, pas une sécurité réseau. Pour un usage privé entre amis, c'est suffisant.

---

## 3. Lancer en local

```bash
npm install
npm run dev
```

Ouvrez [http://localhost:5173](http://localhost:5173).

| URL | Description |
|-----|-------------|
| `/` | Classement public (lecture seule, temps réel) |
| `/admin` | Panneau admin (protégé par mot de passe) |

---

## 4. Déployer sur Vercel

1. Poussez le repo sur GitHub.
2. Sur [vercel.com](https://vercel.com), importez le repo.
3. Dans **Settings → Environment Variables**, ajoutez les trois variables `.env`.
4. Déployez – Vercel détecte automatiquement Vite.

Le fichier `vercel.json` gère le routage SPA (redirige toutes les URLs vers `index.html`).

---

## Fonctionnalités

### Classement public `/`
- Classement total par joueur (somme des points)
- Colonnes par épreuve avec score individuel
- Score absent = `0` affiché, non comptabilisé dans le total
- Top 3 mis en valeur (🥇🥈🥉) avec fond or/argent/bronze
- Avatar ou initiales colorées pour chaque joueur
- Mise à jour automatique via Supabase Realtime

### Panel admin `/admin`
- Connexion par mot de passe (stocké en localStorage → session persistante)
- **Onglet Joueurs** : ajouter/supprimer des joueurs, uploader une photo de profil
- **Onglet Épreuves** : ajouter/supprimer des épreuves (avec emoji optionnel)
- **Onglet Scores** : grille par épreuve – saisie libre des points, bouton "Sauver" par épreuve

### Barème de référence (pour l'admin)
| Position | Points |
|----------|--------|
| 1er | 10 |
| 2e  | 8  |
| 3e  | 7  |
| 4e  | 6  |
| 5e  | 5  |
| 6e  | 4  |
| 7e  | 3  |
| 8e  | 2  |
| 9e  | 1  |

---

## Structure du projet

```
olympiades_iut/
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
├── supabase/
│   └── schema.sql          # Schéma complet à exécuter dans Supabase
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   └── supabase.js
    ├── components/
    │   └── PlayerAvatar.jsx
    └── pages/
        ├── Leaderboard.jsx
        └── Admin.jsx
```
