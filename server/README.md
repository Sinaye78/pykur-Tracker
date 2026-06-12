# Pykur Tracker API

Backend officiel de la version 1.5 : comptes, rôles, modération, communauté, récupération de mot de passe et sauvegarde cloud.

## Installation locale

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

API locale par défaut :

```text
http://127.0.0.1:3000/api
```

Le premier compte créé reçoit automatiquement le rôle `admin`.
Les nouveaux comptes doivent confirmer leur email avant de pouvoir se connecter.

## Rôles

- `user` : compte standard.
- `moderator` : peut bannir, timeban, mute, unmute et unban les utilisateurs de rôle inférieur.
- `admin` : peut faire toute la modération, promouvoir/rétrograder les rôles et accéder au panel admin in-game.

## Emails transactionnels

L'inscription envoie un lien de confirmation valable 24 heures.
La récupération de mot de passe utilise un token temporaire valable 1 heure.

Variables à configurer dans `.env` :

- `APP_PUBLIC_URL` : URL publique du site, par exemple `https://pykur-tracker.fr`.
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Sans SMTP configuré, les liens sont affichés dans les logs uniquement en environnement local. Un déploiement public refuse cette solution de secours afin de ne jamais exposer un token de confirmation ou de récupération dans les journaux.

## Routes principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/verify-email/confirm`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `PUT /api/account/email`
- `PUT /api/account/password`
- `PUT /api/account/preferences`
- `GET /api/community/users/:pseudo`
- `GET /api/moderation/users`
- `POST /api/moderation/users/:id/ban`
- `POST /api/moderation/users/:id/unban`
- `POST /api/moderation/users/:id/mute`
- `POST /api/moderation/users/:id/unmute`
- `POST /api/admin/users/:id/role`
- `GET /api/cloud/save`
- `PUT /api/cloud/save`

La sauvegarde cloud fusionne côté serveur les archives de galerie, événements découverts et succès afin d'éviter qu'un autre appareil avec un état local plus ancien supprime la mémoire du compte.

## Déploiement VPS

1. Installer Node.js, Nginx et Certbot.
2. Copier le projet sur le VPS.
3. Dans `server`, créer `.env` depuis `.env.example`.
4. Remplacer `JWT_SECRET` par une valeur aléatoire d'au moins 32 caractères.
5. Configurer `CLIENT_ORIGIN` avec les origines HTTPS autorisées, séparées par des virgules.
6. Configurer `APP_PUBLIC_URL` avec l'URL HTTPS publique et renseigner toutes les variables SMTP.
7. Lancer `npm ci --omit=dev` pour respecter exactement le verrouillage des dépendances.
8. Démarrer avec `pm2` :

```bash
pm2 start server.js --name pykur-api
pm2 save
```

9. Configurer Nginx pour servir le site statique et proxifier `/api/` vers `http://127.0.0.1:3000/api/`.
10. Ne jamais exposer directement le port `3000` sur Internet ; seuls SSH, HTTP et HTTPS doivent être autorisés par le pare-feu.

## Contrôles avant production

- `NODE_ENV=production`
- HTTPS actif sur le domaine et redirection HTTP vers HTTPS
- `JWT_SECRET` unique et conservé hors Git
- SMTP opérationnel avec un expéditeur vérifié
- port `3000` accessible uniquement depuis la machine locale
- sauvegarde régulière du fichier SQLite et de ses fichiers WAL/SHM
- `npm audit --omit=dev` sans vulnérabilité connue avant chaque publication

La modification de l'email exige le mot de passe actuel. Une modification ou une réinitialisation du mot de passe invalide les anciennes sessions.
