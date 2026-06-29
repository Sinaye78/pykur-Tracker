# Pykur Tracker V2 - Phase 5, module 1 : état global

**Date :** 28 juin 2026  
**État :** terminé et validé  
**Périmètre :** schéma, défauts, migration V1, sélecteurs et store mémoire uniquement.

## 1. Comportement V1 de référence

La V1 conserve un store de compte contenant :

- le profil actif ;
- les profils multi-familiers et leurs données ;
- les tombstones des profils supprimés ;
- la galerie partagée ou locale ;
- les options partagées ou locales ;
- les succès communs au compte ;
- les dates de sauvegarde.

Chaque profil contient notamment le familier, les runs, monstres, statistiques,
chrono, session, interface, options, succès, galerie, détection Dofus, données
spéciales, activité et historique d'annulation.

La V1 accepte encore des sauvegardes sans version explicite. Elle complète les
champs absents au chargement et doit préserver les champs inconnus.

## 2. Implémentation V2

### Schéma versionné

- version courante : `1` ;
- validation minimale de la racine et des profils ;
- refus explicite d'un schéma plus récent ;
- sérialisation déterministe avec tri récursif des clés.

### Valeurs par défaut

- aucun profil créé automatiquement ;
- `active` vaut `null` ;
- le choix d'un familier reste requis ;
- paramètres, raccourcis, galerie, succès, chrono, session et détection alignés
  sur les valeurs V1 ;
- création générique des maps de runs, monstres, moyennes et références Dofus à
  partir de la définition d'un familier.

### Migration non destructive

- prise en charge du store V1 non versionné ;
- aucune mutation de l'objet source ;
- conservation des champs inconnus ;
- conservation des familiers et donjons non encore connus de la V2 ;
- suppression effective des profils possédant un tombstone ;
- réparation du profil actif ;
- migration de la galerie historique vers la galerie partagée ;
- fusion des succès de compte et respect des suppressions explicites ;
- conservation des réglages du profil actif lorsque les réglages partagés sont absents.

### Sélecteurs purs

Sélecteurs ajoutés pour :

- profils et identifiants ;
- profil actif et ses données ;
- besoin de choisir un familier ;
- galerie effective ;
- paramètres effectifs ;
- succès effectifs ;
- nombre de profils.

### Store mémoire

- lecture d'un état gelé ;
- remplacement et mise à jour contrôlés ;
- abonnement et désabonnement ;
- aucune dépendance au DOM ou au stockage.

## 3. Fichiers créés ou modifiés

- `v2/js/state/defaults.js`
- `v2/js/state/schema.js`
- `v2/js/state/migrations.js`
- `v2/js/state/selectors.js`
- `v2/js/state/store.js`
- `v2/js/bootstrap.js`
- `v2/js/app.js`
- `v2/package.json`
- `v2/tests/fixtures/legacy-state.json`
- `v2/tests/unit/state.test.js`

## 4. Tests exécutés

Commande :

```text
node --test tests/unit/*.test.js
```

Résultat : **6 tests réussis, 0 échec**.

Cas couverts :

1. état initial sans profil imposé ;
2. défauts adaptés aux donjons d'un familier ;
3. migration V1 multi-profils sans mutation ni perte ;
4. sérialisation stable ;
5. sélecteurs et modes de partage ;
6. notifications et immutabilité du store mémoire.

Vérifications complémentaires :

- aucun accès à `document`, `window`, `localStorage`, `sessionStorage` ou
  `indexedDB` dans `v2/js/state/` ;
- import navigateur sans erreur console ;
- layout toujours visible ;
- aucun overflow horizontal introduit.

## 5. Limites volontaires

Ce module ne charge et ne sauvegarde encore aucune donnée réelle. Il ne branche
aucun bouton et ne modifie pas l'interface. Le stockage est le prochain module de
la phase 5 et ne doit commencer qu'après validation explicite.

## 6. Décision attendue

Validation du module **État global** avant le module suivant : **Stockage**.
