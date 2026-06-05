# Pykur Tracker API

Backend de préparation pour la version 1.5 : comptes, rôles, modération et sauvegarde cloud.

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

## Rôles

- `user` : compte standard.
- `moderator` : peut bannir, timeban, mute, unmute et unban les utilisateurs de rôle inférieur.
- `admin` : peut faire toute la modération, promouvoir/rétrograder les rôles et accéder au panel admin in-game.

## Routes principales

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/moderation/users`
- `POST /api/moderation/users/:id/ban`
- `POST /api/moderation/users/:id/unban`
- `POST /api/moderation/users/:id/mute`
- `POST /api/moderation/users/:id/unmute`
- `POST /api/admin/users/:id/role`
- `GET /api/cloud/save`
- `PUT /api/cloud/save`

## Déploiement VPS

1. Installer Node.js, Nginx et Certbot.
2. Copier le projet sur le VPS.
3. Dans `server`, créer `.env` depuis `.env.example`.
4. Remplacer `JWT_SECRET` par une longue valeur aléatoire.
5. Lancer `npm install`.
6. Démarrer avec `pm2` :

```bash
pm2 start server.js --name pykur-api
pm2 save
```

7. Configurer Nginx pour servir le site statique et proxifier `/api/` vers `http://127.0.0.1:3000/api/`.
