# Pykur Tracker V2 - Phase 5, module 4 : progression

**Date :** 28 juin 2026  
**État :** validé par l'utilisateur  
**Périmètre :** calcul de progression, paliers, données de monstres et socle des runs.

## 1. Source de vérité

Le catalogue généré de la V2 transporte maintenant, pour chacun des 20 familiers :

- les monstres et leurs paliers ;
- les gains par donjon ;
- les monstres de zone ;
- les limites de runs ;
- les gains spéciaux ;
- les variantes de boss du Gelutin.

Ces données restent extraites mécaniquement de la configuration V1. La V1 n'a pas
été modifiée.

## 2. Logique métier migrée

Trois modules purs ont été ajoutés :

- `progression.js` calcule le bonus et le pourcentage, avec plafond strict ;
- `monsters.js` normalise les compteurs, reconstruit les anciennes runs et calcule
  la contribution de chaque monstre ;
- `runs.js` fournit le socle déterministe d'ajout, retrait et reconstruction des runs.

Le dashboard consomme ces fonctions sans recalculer la progression dans le DOM.
L'ajout et le retrait d'un run sont persistés dans la clé V2 uniquement.

## 3. Cas particuliers conservés

- **Abra Kadabra :** l'entrée dans la salle Abrakne comptabilise les premières
  salles à chaque nouvelle entrée, puis les boucles ajoutent une Abrakne.
- **Gelutin :** le boss Blop choisi modifie correctement les gains du Donjon des
  Blops et de l'Antre du Blop Multicolore.
- **Miniminotot :** une sauvegarde contenant des runs sans monstres reconstruit
  l'historique, sans écraser les compteurs déjà connus.
- Les monstres de zone participent au bonus et aucun familier ne dépasse son
  objectif maximal.

## 4. Interface

Le profil actif pilote maintenant :

- le familier, son bonus et son pourcentage ;
- le libellé et l'icône de la caractéristique ;
- le sélecteur de donjon ;
- les cartes des donjons et leurs runs effectués ;
- les contrôles spéciaux Abra et Gelutin ;
- les boutons `+ Run` et `- Run`.

Les valeurs « Restants » et « Temps estimé restant » demeurent volontairement
neutres jusqu'au module Projection. Aucun faux calcul n'est présenté.

## 5. Tests automatisés

La suite complète contient **28 tests réussis sur 28**.

Les nouveaux tests vérifient :

- chaque donjon de chacun des 20 familiers ;
- l'exactitude du bundle de monstres appliqué ;
- l'aller-retour ajout/retrait ;
- les limites de runs ;
- Abra, Gelutin et Miniminotot ;
- les gains de zone et les plafonds.

## 6. Validation navigateur

- ajout d'un run : immédiat ;
- persistance après rechargement : réussie ;
- retrait du run de test : réussi ;
- profil actif et dashboard synchronisés ;
- aucun overflow horizontal à 390 px ;
- aucune erreur ni aucun avertissement console ;
- badge de projection provisoire masqué jusqu'à son vrai calcul.

## 7. Limites volontaires

Le simulateur, les donjons restants et les estimations temporelles appartiennent au
module **Projection**. L'interface complète d'édition manuelle des monstres sera
branchée avec le module **Runs et monstres**, conformément à l'ordre de migration.

## 8. Décision attendue

Validation du module **Progression** avant le module suivant : **Runs et monstres**.
