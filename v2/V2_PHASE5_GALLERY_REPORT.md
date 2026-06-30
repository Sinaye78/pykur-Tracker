# Pykur Tracker V2 - Phase 5 - Galerie

**Date :** 30 juin 2026
**État :** terminée, en attente de validation

## Périmètre

Migration de la galerie multi-familiers, sans migration des événements vivants eux-mêmes.

## Travaux effectués

- création du domaine Galerie indépendant du DOM ;
- fusion automatique des anciennes galeries locales dans la galerie du compte ;
- archivage d'un familier arrivé à son objectif ;
- redémarrage d'un cycle neuf après archivage ;
- conservation des options, succès et références de détection Dofus ;
- statistiques globales et filtres multi-familiers ;
- affichage des événements déjà présents dans les sauvegardes ;
- suppression individuelle des archives et événements ;
- reset complet de la galerie active ;
- tombstones pour empêcher toute résurrection par le cloud ;
- galerie unique liée au compte, ou au navigateur pour un invité ;
- branchement du raccourci Galerie et des succès associés ;
- responsive de la fenêtre et états vides.

## Compatibilité

- les archives historiques sans `familiarId` restent interprétées comme Pykur ;
- les images d'archives utilisent en priorité le registre multi-familiers V2 ;
- les champs inconnus du store ne sont pas supprimés ;
- les événements inconnus restent affichables avec un libellé dérivé de leur identifiant ;
- aucune donnée V1 n'est écrite ou modifiée.

## Vérifications

- 109 tests unitaires réussis, 0 échec ;
- familier incomplet impossible à archiver ;
- archivage puis nouveau cycle validés ;
- options et références Dofus conservées ;
- suppression et reset protégés par tombstones ;
- redécouverte d'un événement retiré validée ;
- onglets Archives, Événements et Paramètres vérifiés dans le navigateur ;
- aucune erreur ou warning console ;
- aucune largeur horizontale parasite sur la modale desktop.

## Limites volontaires

- rejouer un événement sera branché avec le module Événements vivants ;
- les catégories et événements inconnus seront enrichis avec la configuration du module Événements ;
- le partage communautaire d'une fin de familier attend le module Social.

## Prochaine étape après validation

**Phase 5 - Easter eggs**, migrés un par un avec leur déclencheur et leur nettoyage.
