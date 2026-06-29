# Pykur Tracker V2 - Phase 5, module 9 : historique

**Date :** 29 juin 2026  
**État :** validé  
**Périmètre :** timeline des actions importantes par profil.

## 1. Comportement V1 conservé

L'historique V2 reprend les principes utiles de la V1 :

- actions classées par catégorie ;
- recherche en temps réel ;
- regroupement par jour ;
- ordre chronologique décroissant ;
- compactage des actions identiques sur une même minute ;
- résumé des actions du jour et du total.

## 2. Données structurées

Chaque nouvelle entrée possède maintenant un identifiant, une date, une catégorie,
un type, un donjon facultatif et des métadonnées. Les anciennes entrées V1 qui ne
contiennent qu'un message, un type et une date restent compatibles et sont classées
automatiquement.

La timeline est limitée à 200 actions par profil afin d'éviter une croissance sans
borne du stockage.

## 3. Actions enregistrées

Le module enregistre désormais :

- création et renommage d'un profil ;
- ajout et retrait d'un run ;
- arrivée dans la salle Abrakne ;
- correction manuelle des donjons ;
- correction manuelle des monstres ;
- démarrage, pause et remise à zéro de Session & Chrono ;
- fin de session et résumé obtenu ;
- temps de run marqué.

Les temps détaillés restent consultables dans `Temps chrono`. L'historique général
n'enregistre qu'une ligne synthétique pour ne pas dupliquer l'interface spécialisée.

## 4. Interface

Le bouton `Historique` ouvre une modale contenant :

- recherche textuelle ;
- filtre par catégorie ;
- quatre indicateurs rapides ;
- timeline regroupée par jour ;
- état vide explicite ;
- effacement protégé par une confirmation.

La modale conserve un scroll interne et adapte sa grille aux petites largeurs.

## 5. Isolation et persistance

- Chaque profil possède sa propre timeline.
- Une action n'est enregistrée qu'après la sauvegarde réelle de la modification.
- Effacer l'historique ne modifie ni les runs, ni les monstres, ni la progression.
- Les écritures passent par le même adaptateur de persistance que le reste de la V2.

## 6. Tests

La suite complète contient **61 tests réussis sur 61**, dont 8 nouveaux tests :

- ajout immuable et structure d'une entrée ;
- limite de taille ;
- compatibilité des anciennes entrées V1 ;
- combinaison recherche, catégorie et donjon ;
- compactage par minute ;
- regroupement par jour ;
- résumé ;
- isolation et effacement par profil.

Tous les fichiers JavaScript modifiés passent le contrôle syntaxique Node.

## 7. Validation navigateur

La modale a été ouverte dans la V2 locale avec un profil multi-donjons. Ont été
vérifiés :

- noms accessibles des filtres ;
- état vide ;
- disposition compacte ;
- création de deux entrées après `+ Run` puis `- Run` ;
- compteur total et compteur progression cohérents.

Aucune erreur JavaScript liée au module n'a été observée pendant ces contrôles.

## 8. Validation

Le module **Historique** a été validé le 29 juin 2026. Le module suivant est **Statistiques**.
