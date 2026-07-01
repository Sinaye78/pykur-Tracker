# Phase 5 - Easter egg Capy

## Périmètre migré

- commande secrète `capy` ;
- remplacement visuel du familier actif par Capy ;
- titre `Progression du Capykur` et ambiance verte dédiée ;
- conservation intégrale de la progression réelle en arrière-plan ;
- persistance du mode dans le profil actif ;
- restauration lors de la désactivation ou du changement de profil ;
- notification Capy et historique dédiés ;
- déblocage du succès `egg_capy` ;
- ciblage et neutralisation par Raj-Pah ;
- repli automatique si l'asset Capy est indisponible.

## Architecture

Le contrôleur `js/events/easterEggs/capy.js` ne modifie que `profile.data.ui.capyMode`. Le renderer d'identité du profil reste propriétaire de l'image et du titre : il respecte ce mode même après une synchronisation cloud ou un nouveau rendu du profil.

## Vérifications

- 124 tests unitaires réussis, 0 échec ;
- syntaxe des modules validée ;
- asset Capy présent ;
- activation, désactivation, sauvegarde et restauration testées ;
- ressource locale corrigée servie avec HTTP 200 ;
- aucun fichier V1 inclus dans cette migration.

## Test manuel

1. Saisir `capy` hors d'un champ de formulaire.
2. Vérifier l'image Capy et le titre `Progression du Capykur`.
3. Changer de profil puis revenir afin de contrôler la persistance par profil.
4. Saisir de nouveau `capy` pour restaurer le familier.
5. Activer Raj pendant le mode Capy pour vérifier sa neutralisation.

