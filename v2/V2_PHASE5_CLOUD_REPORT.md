# Familier Tracker V2 - Phase 5, module 14 : synchronisation cloud

**Date :** 30 juin 2026
**Etat :** termine, en attente de validation
**Perimetre :** sauvegarde automatique des comptes V2 et synchronisation entre appareils.

## Fonctionnalites migrees

- sauvegarde cloud automatique apres chaque modification persistante ;
- chargement automatique du compte au demarrage, sans bouton d'import ;
- synchronisation periodique entre plusieurs appareils ;
- revision serveur et detection des ecritures concurrentes ;
- resolution des conflits en conservant l'etat le plus recent ;
- backup local avant toute application d'un etat distant ;
- isolation des donnees entre deux comptes utilises dans le meme navigateur ;
- stockage local conserve pour les utilisateurs invites ;
- erreurs cloud signalees sans bloquer l'utilisation locale.

## Isolation de la V1

La V2 utilise une table et des routes dediees :

- `cloud_saves_v2` ;
- `GET /api/cloud/v2/save` ;
- `PUT /api/cloud/v2/save`.

La table historique `cloud_saves` et les routes cloud V1 ne sont pas modifiees. Une
sauvegarde V2 ne peut donc pas ecraser une progression V1.

## Strategie de synchronisation

Chaque sauvegarde contient une enveloppe validee, une empreinte du contenu, un identifiant
d'appareil et une revision serveur. Les modifications locales sont regroupees pendant
500 ms avant envoi. Le serveur refuse une revision depassee et retourne la derniere copie,
ce qui permet au client de choisir explicitement l'etat le plus recent.

Un controle distant est realise toutes les 15 secondes. Avant ce controle, toute modification
locale en attente est envoyee afin qu'un polling ne puisse jamais remplacer une action non
synchronisee.

## Verifications

- 93 tests unitaires reussis, 0 echec ;
- verification syntaxique du serveur, du service cloud et de l'application ;
- test d'un cloud vide, d'une premiere connexion et d'un changement local ;
- test d'un conflit gagne par un autre appareil ;
- test de non-contamination entre deux comptes ;
- aucun fichier d'interface V1 modifie dans ce module.

## Etape suivante

Apres validation explicite : choisir le prochain module V2 parmi la detection Dofus, les
evenements/animations ou les fonctions sociales.
