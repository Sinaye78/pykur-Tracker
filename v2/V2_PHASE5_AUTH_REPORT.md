# Familier Tracker V2 - Phase 5, module 13 : authentification

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation  
**Périmètre :** comptes, emails de confirmation, récupération de mot de passe et session V2.

## Fonctionnalités migrées

- connexion par email ou pseudo ;
- inscription avec pseudo, email et mot de passe ;
- confirmation de l'adresse email depuis un lien V2 ;
- demande et confirmation de réinitialisation du mot de passe ;
- restauration de session au rechargement ;
- déconnexion ;
- affichage du pseudo et du rôle dans le panneau utilisateur ;
- erreurs API lisibles, délai maximal et empreinte navigateur de sécurité.

## Isolation de la V1

La V2 utilise la même API et la même base de comptes que la V1, mais conserve son jeton
dans une clé locale distincte. Une connexion ou une déconnexion V2 ne modifie donc pas la
session V1 du navigateur.

Le serveur accepte désormais un identifiant client strictement borné. Une inscription ou
une récupération demandée depuis la V2 produit un lien vers `/v2/index.html`. Les demandes
V1 sans identifiant continuent de produire leur lien historique vers
`/familiers/pykur/index.html`.

## Déploiement parallèle

La V2 est publiée comme dossier statique sous `/v2/`. La racine et les routes V1 ne sont
ni remplacées ni redirigées. L'API demeure accessible sous `/api/` pour les deux versions.

## Vérifications

- 87 tests unitaires réussis, dont 7 nouveaux tests API/authentification ;
- vérification syntaxique du serveur et des nouveaux modules ;
- connexion, inscription et récupération affichées dans le navigateur ;
- absence de débordement horizontal dans les dialogues ;
- aucune erreur ou alerte dans la console du navigateur ;
- aucun compte factice créé pendant les tests ;
- synchronisation cloud volontairement non activée dans ce module.

## Étape suivante

Après validation explicite : migration de la synchronisation cloud V2.
