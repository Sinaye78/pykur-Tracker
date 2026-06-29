# Pykur Tracker V2 - Phase 5, module 10 : statistiques

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation  
**Périmètre :** statistiques du profil actif, donjons et temps chronométrés.

## 1. Architecture

Les calculs statistiques sont regroupés dans un sélecteur métier pur. La vue ne
recalcule plus elle-même la progression, les monstres, les répartitions ou les temps.
Ouvrir la modale ne modifie aucune donnée.

## 2. Données quotidiennes

Un run réellement appliqué met maintenant à jour la journée du profil :

- compteur du bon donjon ;
- gain de progression depuis le début de la journée ;
- protection contre les valeurs négatives lors d'une correction.

Les modifications manuelles de compteurs ne sont pas considérées comme une activité
quotidienne et ne gonflent donc pas les séries.

Les anciennes données V1 conservées dans `stats.days` restent utilisées.

## 3. Vue d'ensemble

La première vue affiche :

- progression courante et pourcentage ;
- total des donjons ;
- total des monstres comptabilisés ;
- nombre de jours actifs ;
- activité du jour par donjon ;
- progression gagnée aujourd'hui ;
- série actuelle et meilleure série ;
- moyenne par jour actif ;
- meilleure journée.

Les unités s'adaptent au familier actif.

## 4. Vue Donjons

Chaque parcours présente :

- nombre de runs ;
- part dans le volume total ;
- barre de répartition ;
- contribution brute au bonus ;
- part de la zone ou des corrections manuelles.

Les calculs utilisent les mêmes monstres et paliers que la progression principale.

## 5. Vue Temps

Pour chaque donjon, la vue distingue :

- nombre de temps enregistrés ;
- meilleur temps ;
- moyenne réelle des runs marqués ;
- moyenne configurée utilisée par les projections.

Un profil sans temps affiche un état neutre sans inventer de moyenne réelle.

## 6. Tests

La suite complète contient **69 tests réussis sur 69**, dont 8 nouveaux tests :

- totaux et répartition des runs ;
- écriture quotidienne immuable ;
- retrait sans valeur négative ;
- séries, moyenne et meilleure journée ;
- interruption d'une série ;
- contributions et total des monstres ;
- meilleurs temps et moyennes ;
- absence de mutation par le sélecteur.

Les fichiers JavaScript modifiés passent le contrôle syntaxique Node.

## 7. Validation navigateur

La modale a été testée dans la V2 locale avec un profil Pykur existant :

- ouverture depuis le bouton `Stats` ;
- affichage cohérent de la vue d'ensemble ;
- navigation vers `Donjons` ;
- répartition de 24 runs Morose à 100 % ;
- contribution de 1 PP ;
- navigation vers `Temps` ;
- moyennes configurées Morose et Tynril correctement affichées ;
- aucun message d'erreur console.

## 8. Décision attendue

Validation du module **Statistiques** avant le module suivant : **Notifications**.
