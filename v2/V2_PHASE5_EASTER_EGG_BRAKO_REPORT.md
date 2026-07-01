# Phase 5 - Easter egg Brako

## Périmètre migré

- commande secrète `brako` sur desktop ;
- combat animé entre Brako et le Minotot ;
- dialogues, tirs à distance, flèche explosive et finition à la baguette ;
- drop du Dofus Pourpre conservé à 20 % ;
- issues persistantes avec et sans drop ;
- conflit bidirectionnel avec Raj-Pah et succès de guerre des easter eggs ;
- nametag de Brako au survol ;
- nettoyage complet des timers et éléments temporaires.

## Architecture

La logique est isolée dans `js/events/easterEggs/brako.js`. Le routeur commun ne connaît que la commande publique du contrôleur. Raj et Brako communiquent par un petit contrat public afin d'éviter toute dépendance au DOM interne de l'autre scène.

## Vérifications

- 122 tests unitaires réussis, 0 échec ;
- syntaxe des modules validée ;
- neuf assets Brako/Raj présents ;
- activation et rendu contrôlés dans le navigateur local ;
- aucun overflow horizontal détecté ;
- scène désactivée sur mobile et avec pointeur tactile ;
- aucun fichier V1 inclus dans cette migration.

## Test manuel

1. Saisir `brako` hors d'un champ de formulaire.
2. Survoler Brako pour afficher son nametag.
3. Saisir `raj` pendant le combat pour provoquer l'interruption.
4. Relancer plusieurs combats pour observer les deux issues de butin.

