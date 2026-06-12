# Gestionnaire VPS Familier Tracker

À la racine du projet, lancez `Gestionnaire VPS.vbs`. Il ouvre l'application sans console PowerShell visible.
Au premier lancement, le gestionnaire s'ajoute au démarrage de Windows. Cette option peut être désactivée directement dans l'application.

## Première configuration

1. Cliquez sur **Générer clé SSH**.
2. La clé publique est copiée dans le presse-papiers.
3. Ajoutez cette ligne dans `/root/.ssh/authorized_keys` sur le VPS.
4. Cliquez sur **Tester SSH**.
5. Après le premier push contenant les scripts, cliquez sur **Auto-démarrage VPS**.

Une fois cette étape réalisée, Nginx et l'API redémarrent automatiquement avec le VPS. Le gestionnaire Windows n'a pas besoin de rester ouvert pour que le site fonctionne.

Le fichier `manager.config.json` est local et ignoré par Git. Aucun mot de passe VPS n'est stocké dans le projet.

## Actions

- **Commit + publier** : crée un commit si nécessaire, pousse GitHub puis déploie le VPS.
- **Déployer GitHub** : récupère et déploie la dernière version distante.
- **Redémarrer le site** : relance Nginx et l'API.
- **État du VPS** : affiche les services, la santé API, le disque et la mémoire.
- **Logs API / Nginx** : affiche les derniers journaux utiles.
- **Auto-démarrage VPS** : active Nginx et PM2 au démarrage du VPS.

Le gestionnaire Windows ne peut pas s'ouvrir sur le VPS, qui n'a pas d'interface graphique. Il peut démarrer avec Windows ; le site démarre séparément et automatiquement avec le VPS.
