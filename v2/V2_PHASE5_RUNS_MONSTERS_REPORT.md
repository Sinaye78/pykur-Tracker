# Pykur Tracker V2 - Phase 5, module 5 : runs et monstres

**Date :** 28 juin 2026  
**État :** validé par l'utilisateur  
**Périmètre :** ajout, retrait et édition des runs ; consultation et correction des monstres.

## 1. Édition des runs

Le bouton `Modifier donjon` ouvre désormais un éditeur adapté au familier actif.
Chaque donjon possède son compteur borné par la configuration métier. Lors de
l'enregistrement :

- le nombre de runs est validé ;
- les compteurs du donjon sont reconstruits depuis son bundle exact ;
- le choix de boss Gelutin est respecté ;
- les autres sources et la zone ne sont pas écrasées ;
- la progression est recalculée puis sauvegardée dans la clé V2.

## 2. Bestiaire multi-familiers

Le bouton `Monstres` ouvre une interface fonctionnelle comprenant :

- un filtre par donjon, zone ou total ;
- une recherche insensible aux accents ;
- les sprites chargés à la demande ;
- le palier et le gain propre au familier ;
- le nombre restant avant le prochain gain ;
- le total toutes sources ;
- l'édition manuelle d'une source précise.

La vue `Tous` reste volontairement en lecture seule afin d'éviter une correction
ambiguë qui ne préciserait pas sa source.

## 3. Modale partagée

Les profils et le suivi utilisent maintenant un contrôleur de modale unique. Il
centralise :

- ouverture et nettoyage ;
- fermeture par bouton, fond ou touche Échap ;
- restauration du focus ;
- erreurs accessibles ;
- premier plan commun.

## 4. Cohérence métier

- Les 20 familiers utilisent la même interface à partir de leur registre.
- Les monstres `noProgress` ne polluent pas le bestiaire.
- Une correction manuelle ne modifie pas les runs.
- Une modification des runs ne touche que le donjon concerné.
- Les sources et monstres inconnus sont rejetés.
- Le bouton `Annuler` reste désactivé jusqu'au module Historique, afin de ne pas
  simuler une annulation qui n'existe pas encore.

## 5. Tests

La suite complète contient **31 tests réussis sur 31**.

Les nouveaux contrôles couvrent :

- la reconstruction de chaque donjon des 20 familiers ;
- les limites de runs ;
- l'absence de mutation lors d'une correction ;
- la conservation des runs après édition manuelle ;
- le rejet des identifiants invalides.

## 6. Validation navigateur

- édition Morose de 1 à 2 runs : réussie ;
- bundle de monstres reconstruit : réussi ;
- recherche `Floribonde` : réussie ;
- correction de la zone à 40 : bonus passé de 0 à 1 ;
- persistance après rechargement : réussie ;
- données de test restaurées ensuite ;
- modale et lignes contenues à 390 px ;
- aucune erreur ni aucun avertissement console.

## 7. Index V2

L'index V2 charge maintenant les modules État, Stockage, Profils, Progression,
Runs et Monstres. Son titre et sa description ne le présentent plus comme un layout
statique. Il est directement testable à l'adresse locale `/v2/index.html`.

## 8. Décision attendue

Validation du module **Runs et monstres** avant le module suivant : **Projection**.
