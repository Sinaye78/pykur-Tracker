# Pykur Tracker

Tracker de progression autour du Pykur : suivi Morose/Tynril, prospection, statistiques, galerie, succès, événements, ambiances passives et préparation de la version cloud.

## Structure

- `index.html` : hub d'accueil.
- `mobile.html` : redirection vers la version mobile Pykur.
- `familiers/pykur/` : application Pykur complète.
- `familiers/pykur/assets/` : assets du familier Pykur.
- `server/` : API Node.js de préparation v1.5 pour comptes, rôles, modération et sauvegarde cloud.

## Lancement local statique

Depuis la racine du projet :

```bash
python -m http.server 8765
```

Puis ouvrir :

```text
http://127.0.0.1:8765/
```

## API locale

Voir [server/README.md](server/README.md).
