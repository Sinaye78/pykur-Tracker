# Pykur Tracker V2 - Phase 5, module 7 : chrono

**Date :** 29 juin 2026  
**État :** validé par l'utilisateur  
**Périmètre :** chronomètre de run, reprise, marquage, historique et persistance.

## 1. Comportement migré

Le module reproduit le comportement utile de la V1 :

- démarrer un chrono ;
- mettre en pause puis reprendre sans perdre le temps ;
- reprendre automatiquement après un rechargement ;
- marquer des runs successifs sans remettre le temps total à zéro ;
- terminer ou réinitialiser le chrono courant ;
- conserver les temps marqués dans l'historique du profil.

La session de farm reste volontairement hors de ce module. Elle sera migrée séparément.

## 2. Architecture

`domain/chrono.js` contient toute la logique métier pure. Les actions retournent un
nouvel état et ne modifient jamais l'objet reçu.

`services/timers.js` fournit un ticker unique et nettoyable. Il ne sauvegarde pas à
chaque rafraîchissement : la durée courante est dérivée de `seconds` et `startedAt`.

`ui/chrono.js` relie le domaine au panneau existant, à la modale partagée et au
stockage V2.

## 3. Panneau Chrono

Le panneau affiche désormais :

- l'état `Prête`, `En cours` ou `En pause` ;
- le segment de run en cours ;
- le nombre de temps marqués pour le donjon actif ;
- le meilleur temps ;
- la moyenne ;
- des boutons activés uniquement lorsque l'action est valide.

Le bouton de réglages permet d'afficher les dixièmes de seconde pendant le
chronométrage.

## 4. Historique

La fenêtre `Temps chronométrés` liste les temps de tous les donjons du profil avec :

- le nom du donjon ;
- la durée ;
- la date ;
- la suppression individuelle ;
- la réinitialisation complète de l'historique.

Les anciennes marques V1 sans identifiant reçoivent un identifiant stable lors de
leur lecture afin de rester supprimables individuellement.

## 5. Persistance et profils

- Les actions réelles sont sauvegardées immédiatement.
- Le ticker d'affichage n'écrit jamais dans le stockage.
- Un chrono actif repart après reload à partir de son horodatage.
- Chaque profil possède son propre chrono et son propre historique.
- Le ticker suit uniquement le profil actif et s'arrête lorsqu'il n'est plus utile.

## 6. Tests

La suite complète contient **45 tests réussis sur 45**, dont 9 dédiés au chrono :

- démarrage, pause et reprise ;
- reprise après reload ;
- segments successifs ;
- refus d'un marquage invalide ;
- statistiques par donjon ;
- fin et reset ;
- suppression et vidage de l'historique ;
- isolation entre profils ;
- format des durées.

## 7. Validation navigateur

- démarrage et incrémentation : réussis ;
- pause stable : réussie ;
- reprise et marquage : réussis ;
- meilleur temps et moyenne : corrects ;
- historique : correct ;
- reprise après rechargement : réussie ;
- `Terminer` remet le chrono à zéro et conserve l'historique ;
- panneau utilisable à 390 × 844 px sans overflow horizontal ;
- aucune erreur ni aucun avertissement console.

Les données créées pendant le test navigateur ont été supprimées à la fin.

## 8. Validation

Le module **Chrono** a été validé par l'utilisateur avant le démarrage du module **Session**.
