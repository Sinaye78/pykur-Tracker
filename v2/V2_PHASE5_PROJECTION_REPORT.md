# Pykur Tracker V2 - Phase 5, module 6 : projection

**Date :** 29 juin 2026  
**État :** validé par l'utilisateur  
**Périmètre :** prochains paliers, objectif final, temps estimés et simulateur non destructif.

## 1. Moteur métier

Le module `domain/projection.js` fournit des calculs purs pour :

- simuler un nombre de runs sur un donjon ;
- rechercher le nombre minimal de runs avant un palier ;
- calculer le nombre de runs avant l'objectif final ;
- respecter les limites et capacités restantes ;
- utiliser les temps moyens du profil avec les valeurs par défaut du familier ;
- simuler plusieurs donjons dans un même scénario.

Il consomme le même registre de monstres et de gains que la progression réelle.
Les gains multiples d'une même run sont donc affichés correctement.

## 2. Absence de mutation

Les projections travaillent sur des totaux clonés. Elles ne modifient jamais :

- les runs ;
- les monstres ;
- la progression ;
- le profil actif ;
- le stockage local ;
- les récompenses.

Fermer puis rouvrir le simulateur réinitialise entièrement le scénario.

## 3. Dashboard

L'index V2 affiche maintenant :

- les runs restantes sur chaque carte de donjon ;
- le temps estimé restant ;
- le prochain gain pour chaque donjon ;
- le gain réel obtenu au palier, même lorsqu'il dépasse une unité.

Les libellés sont génériques pour tous les bonus : PP, puissance, sagesse,
dommages, vitalité, pods et caractéristiques élémentaires.

## 4. Fenêtre Projection

La fenêtre possède trois vues :

### Résumé

- progression actuelle ;
- prochain palier par donjon ;
- gain prévu réel ;
- objectif 100% ;
- note d'estimation propre au familier lorsqu'elle existe.

### Simulateur

- contrôles `-`, `+` et `+10` par donjon ;
- compteurs bornés par la capacité restante ;
- bonus simulé, gain, pourcentage et runs restantes ;
- remise à zéro locale ;
- aucune sauvegarde.

### Détails

- temps avant le prochain gain ;
- temps avant l'objectif final ;
- rendement estimé par donjon.

## 5. Tests

La suite complète contient **36 tests réussis sur 36**.

Les tests Projection vérifient :

- les 20 familiers ;
- l'atteinte réelle et minimale du prochain palier ;
- l'absence de mutation du profil ;
- les limites de runs ;
- les temps moyens ;
- le comportement lorsque l'objectif est déjà atteint.

## 6. Validation navigateur

- Dragoune Noir : 1 run pour le prochain gain, 12 pour l'objectif ;
- simulation de 10 runs : 0 → 46 sagesse, puis 2 runs restantes ;
- fermeture/rechargement : progression réelle restée à 0 ;
- Tofoudre : gains multiples correctement affichés (`+2 dommages`) ;
- détails temporels et rendement affichés ;
- modale contenue à 390 × 844 px sans overflow horizontal ;
- aucune erreur ni aucun avertissement console.

## 7. Index V2

L'index `/v2/index.html` charge maintenant le module Projection complet et peut être
testé directement. La V1 reste intacte et utilise toujours son propre stockage.

## 8. Validation

Le module **Projection** a été validé par l'utilisateur avant le démarrage du module **Chrono**.
