# Pykur Tracker V2 - Phase 5, module 3 : profils

**Date :** 28 juin 2026  
**État :** validé par l'utilisateur  
**Périmètre :** catalogue, création, renommage, suppression et changement de profil uniquement.

## 1. Catalogue multi-familiers

La V2 extrait mécaniquement une vue de catalogue depuis la source de vérité V1.
Le fichier généré ne contient que les informations nécessaires aux profils :

- identité et libellés ;
- bonus et objectif ;
- images et fond ;
- difficulté et méthodes de farm ;
- donjons et temps moyens ;
- valeurs spéciales initiales.

Les 20 familiers sont présents. Les chemins V1 sont résolus en URL absolue depuis
la V2. La recherche porte sur le nom, le bonus, la description et les méthodes de
farm. Le catalogue affiche quatre familiers par page.

## 2. Opérations de profil

Les opérations métier sont pures et testables :

- création avec nom nettoyé et `familiarId` obligatoire ;
- initialisation des runs, moyennes et références Dofus du familier choisi ;
- renommage borné à 60 caractères ;
- changement du profil actif sans altérer les autres profils ;
- suppression protégée du dernier profil ;
- tombstone complet avec date, nom et familier ;
- refus de réutiliser un identifiant déjà supprimé.

Un registre de nettoyage lié au profil est exécuté avant tout changement ou toute
suppression. Les futurs timers du chrono et des événements pourront s'y inscrire
sans rester actifs sur le profil suivant.

## 3. Interface

- aucun profil n'est créé automatiquement par la V2 ;
- sans profil, le catalogue s'ouvre et le sélecteur affiche `Aucun profil` ;
- création en deux étapes : familier puis nom ;
- recherche et pagination ;
- actions Renommer et Supprimer dans des dialogues dédiés ;
- suppression impossible lorsqu'il ne reste qu'un profil ;
- mise à jour immédiate du sélecteur, du portrait, du nom du familier et du fond ;
- persistance V2 après chaque action ;
- première écriture issue d'une V1 précédée d'un backup de migration.

Le reste du dashboard demeure volontairement statique jusqu'au module Progression.

## 4. Tests

Commande :

```text
node --test tests/unit/*.test.js
```

Résultat global : **21 tests réussis, 0 échec**.

Tests de profils ajoutés :

1. catalogue de 20 familiers sans doublon ;
2. recherche et pagination ;
3. création Abra avec ses trois donjons ;
4. renommage et changement sans perte de données ;
5. tombstone et non-résurrection après migration ;
6. protection du dernier profil et des identifiants supprimés ;
7. nettoyage et limite du nom ;
8. exécution unique des nettoyages de profil.

Parcours navigateur vérifiés :

- catalogue de 20 familiers ;
- recherche `Chenapandi` ;
- création et sélection ;
- renommage ;
- changement Pykur/Chenapandi ;
- suppression ;
- rechargement sans retour du profil supprimé ;
- premier lancement isolé sans profil imposé ;
- catalogue à 390 × 844 sans overflow horizontal ;
- aucune erreur ou warning console.

## 5. Fichiers créés ou modifiés

- `scripts/extract-v1-familiar-catalog.mjs`
- `js/config/familiarCatalog.generated.js`
- `js/config/familiars.js`
- `js/domain/profiles.js`
- `js/ui/profiles.js`
- `js/app.js`
- `js/bootstrap.js`
- `index.html`
- `css/modals.css`
- `tests/unit/profiles.test.js`
- `tests/browser/profiles-smoke.html`
- `tests/browser/profiles-smoke.js`

## 6. Limites volontaires

La progression, les donjons, les bonus, le chrono et les autres cartes ne sont pas
encore recalculés lors du changement de profil. Seule l'identité visuelle du
familier est actualisée. Ces éléments appartiennent aux modules suivants.

## 7. Décision attendue

Validation du module **Profils** avant le module suivant : **Progression**.
