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

Sans SMTP configuré, les liens sont affichés dans les logs serveur pour les tests, mais aucun email réel n'est envoyé.

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
4. Remplacer `JWT_SECRET` par une longue valeur aléatoire.
5. Configurer `APP_PUBLIC_URL` et les variables SMTP si les emails doivent être envoyés réellement.
6. Lancer `npm install`.
7. Démarrer avec `pm2` :

```bash
pm2 start server.js --name pykur-api
pm2 save
```

8. Configurer Nginx pour servir le site statique et proxifier `/api/` vers `http://127.0.0.1:3000/api/`.
