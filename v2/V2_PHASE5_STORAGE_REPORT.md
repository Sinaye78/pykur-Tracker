# Pykur Tracker V2 - Phase 5, module 2 : stockage

**Date :** 28 juin 2026  
**État :** terminé et validé  
**Périmètre :** localStorage, backups, IndexedDB et préparation cloud uniquement.

## 1. Principes retenus

- la clé V1 `pykur_clean_v1` reste strictement intacte ;
- la V2 écrit dans ses propres clés préfixées `familier_tracker_v2_` ;
- une sauvegarde V1 peut être lue et migrée en mémoire sans être réécrite automatiquement ;
- aucune donnée cloud n'est appliquée automatiquement ;
- les images de référence Dofus restent hors du store JSON, dans IndexedDB ;
- les tombstones de suppression font partie de chaque sauvegarde, backup et enveloppe cloud.

## 2. Stockage local

L'adaptateur local utilise une enveloppe avec date, checksum et payload sérialisé de
manière stable. L'écriture passe d'abord par une clé de préparation, puis par la
clé principale. La préparation est supprimée uniquement après succès complet.

Le chargement cherche successivement :

1. la sauvegarde V2 principale ;
2. la préparation récupérable ;
3. la sauvegarde V1 en lecture seule.

Les erreurs de quota, lecture, corruption et indisponibilité exposent un code
technique et un message utilisateur en français via `userMessage` et `onError`.
Leur présentation en toast sera branchée dans le module Notifications.

## 3. Backups

- création indépendante de la sauvegarde principale ;
- index borné à cinq entrées par défaut ;
- checksum de chaque backup ;
- liste, restauration et suppression ;
- nettoyage des anciennes entrées après validation du nouvel index ;
- suppression de l'écriture partielle en cas d'échec.

## 4. IndexedDB

La base V2 `familier-tracker-v2-assets` contient un store `dofusReferences` à clé
explicite. L'adaptateur prend en charge l'ajout, la lecture, la liste et la
suppression. Une migration séparée sait recopier les références de la base V1
`pykur-dofus-detection/refs`, conserver une table de correspondance et ignorer
les références déjà migrées.

## 5. Préparation cloud

Les enveloppes cloud contiennent le schéma, l'appareil, la révision de base, la
date, le checksum et le store complet. La comparaison distingue : vide, local
seul, cloud seul, identique, local plus récent, cloud plus récent et conflit.

Toute divergence demande une confirmation explicite : `applyAutomatically`
reste toujours à `false`. Aucun appel API et aucune modification du payload
cloud V1 n'ont été ajoutés.

## 6. Tests

Commande unitaire :

```text
node --test tests/unit/*.test.js
```

Résultat : **14 tests réussis, 0 échec**.

Cas stockage couverts :

- écriture et relecture V2 sans modification de la V1 ;
- lecture seule d'une V1 ;
- échec quota avec préparation récupérable ;
- récupération après corruption de la clé principale ;
- récupération de la préparation plus récente après échec du commit principal ;
- rotation, restauration et suppression des backups ;
- conservation des tombstones ;
- validation et comparaison cloud sans application automatique ;
- erreur propre si IndexedDB est indisponible.

Test navigateur réel : `tests/browser/storage-smoke.html`.

- cycle localStorage : réussi ;
- IndexedDB put/get/list/delete : réussi ;
- erreur ou warning console : aucun ;
- page V2 après import : visible, sans overflow horizontal ni erreur console.

## 7. Fichiers créés ou modifiés

- `js/storage/local.js`
- `js/storage/backups.js`
- `js/storage/indexedDb.js`
- `js/storage/cloud.js`
- `js/bootstrap.js`
- `tests/unit/storage.test.js`
- `tests/browser/storage-smoke.html`
- `tests/browser/storage-smoke.js`

`js/storage/importExport.js` reste volontairement vide jusqu'au module 10.

## 8. Limites volontaires

Le stockage n'est pas encore branché à des actions utilisateur, car les profils
et la progression ne sont pas migrés. Aucun bouton, rendu ou appel réseau n'a été
ajouté. Le module suivant ne doit commencer qu'après validation explicite.

## 9. Décision attendue

Validation du module **Stockage** avant le module suivant : **Profils**.
