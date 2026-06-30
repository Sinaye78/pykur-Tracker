# Familier Tracker V2 - Phase 5, module 15 : succes

**Date :** 30 juin 2026
**Etat :** termine, en attente de validation
**Perimetre :** catalogue, calcul, affichage, sons et effets des succes V2.

## Fonctionnalites migrees

- catalogue complet des 81 succes V1 et de leurs 12 categories ;
- progression de compte commune a tous les profils ;
- deblocage automatique selon les profils, runs, monstres, donjons, archives et sessions ;
- deblocages lies a la decouverte des outils deja migres ;
- affichage par categorie avec compteurs, cartes verrouillees et dates de deblocage ;
- conservation du verrouillage des categories Secret et Easter Eggs ;
- regles de Tracker accompli, Maitre des secrets et Le vrai 100 % ;
- son standard et son final respectant le mute et le volume du site ;
- feu d'artifice CSS non bloquant pour Le vrai 100 % ;
- reset avec marqueurs de retrait pour eviter le retour immediat des succes ;
- possibilite de regagner les succes retires apres une nouvelle action eligible ;
- chargement cloud silencieux afin de ne pas rejouer les sons ou notifications existants.

## Architecture

- `js/config/achievements.js` contient uniquement le catalogue et les categories ;
- `js/domain/achievements.js` contient les calculs purs et les regles de deblocage ;
- `js/ui/achievements.js` gere la modale, les notifications et la celebration ;
- `js/services/audio.js` centralise le son avec volume, mute et anti-superposition.

La V1 n'est pas modifiee par ce module. Les donnees restent dans
`sharedAchievements`, deja prevu par le schema V2 et synchronise par le cloud V2.

## Verifications

- 101 tests unitaires reussis, 0 echec ;
- verification syntaxique de l'application et de tous les nouveaux modules ;
- verification du catalogue complet et des categories finales/secretes ;
- verification du reset, des tombstones, du mute, du volume et de l'anti-superposition ;
- ouverture et controle visuel de la modale sur le site local ;
- comportement responsive prevu : categories horizontales et cartes sur une colonne sous 736 px ;
- aucune erreur de syntaxe ni espace invalide detecte par Git.

## Limites volontaires

Les succes lies a des modules V2 non encore migres (aide, galerie, detection Dofus,
social et evenements) sont conserves dans le catalogue mais ne seront declenches que
lorsque leur module officiel sera branche. Aucun faux deblocage n'a ete ajoute.

## Etape suivante

Apres validation explicite : migrer un seul nouveau module V2 parmi la detection Dofus,
les evenements/animations, la galerie ou les fonctions sociales.
