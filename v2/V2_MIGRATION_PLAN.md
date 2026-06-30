# Pykur Tracker V2 - Journal officiel de migration

## Objet du document

Ce fichier constitue le journal officiel de la migration de Pykur Tracker vers la V2.
Il doit être mis à jour à la fin de chaque phase validée.

La V2 vise à reconstruire l'application avec une architecture plus propre, moderne,
performante et maintenable, sans modifier volontairement son apparence, ses
fonctionnalités ni son comportement utilisateur.

## Règles permanentes

- La V1 reste la référence officielle et ne doit jamais être modifiée par la migration.
- Tous les travaux de migration doivent rester dans le dossier `v2/`.
- Aucune fonctionnalité, logique métier ou donnée compatible ne doit être supprimée.
- Les textes, raccourcis, sons, notifications, easter eggs, sauvegardes, statistiques,
  profils, imports, exports, interfaces d'administration et comportements mobiles
  doivent être conservés.
- Une seule phase peut être exécutée à la fois.
- Chaque phase doit être testée, documentée, puis soumise à validation avant la suivante.
- En cas de doute, le point concerné doit être documenté sans inventer de comportement.

## État des phases

| Phase | Objet | État |
| --- | --- | --- |
| 0 | Initialisation du journal officiel | Terminée et validée |
| 1 | Audit complet de la V1 | Terminée et validée |
| 2 | Plan complet de migration | Terminée et validée |
| 3 | Squelette de la V2 | Terminée et validée |
| 4 | Reconstruction du layout | Terminée et validée |
| 5 | Migration progressive des fonctionnalités | En cours - état global en attente de validation |
| 6 | Tests complets | Non commencée |
| 7 | Optimisation finale | Non commencée |

## Journal des phases

### Phase 0 - Initialisation

**Date :** 28 juin 2026  
**État :** terminée, en attente de validation

Travaux effectués :

- création du dossier isolé `v2/` ;
- création du présent journal `v2/V2_MIGRATION_PLAN.md` ;
- consignation des règles permanentes et de l'état initial des phases.

Vérifications :

- aucun fichier de la V1 n'a été modifié ;
- aucun audit de la V1 n'a été commencé ;
- aucune architecture, interface ou fonctionnalité V2 n'a été créée.

Phase validée par l'utilisateur le 28 juin 2026.

### Phase 1 - Audit complet de la V1

**Date :** 28 juin 2026  
**État :** terminée, en attente de validation

Travaux effectués :

- inventaire exhaustif de 610 fichiers V1, hors dépendances installées et dossiers de travail ;
- cartographie des pages, modules, composants, modales, options et surfaces d'administration ;
- inventaire des 20 familiers, 29 donjons/méthodes, 219 monstres et comportements spéciaux ;
- inventaire des profils, statistiques, raccourcis, notifications, succès et easter eggs ;
- audit des événements vivants, ambiances passives, animations, médias et sons ;
- audit du stockage local, d'IndexedDB, du cloud, des imports et exports ;
- audit du serveur, des 81 routes API, de SQLite, des rôles et permissions ;
- mesure de la dette CSS et JavaScript, des doublons, hacks et risques techniques ;
- définition du contrat fonctionnel à préserver pendant la migration.

Livrables :

- `v2/V2_PHASE1_AUDIT.md` : rapport fonctionnel et technique détaillé ;
- `v2/V2_PHASE1_FILE_INVENTORY.md` : inventaire fichier par fichier.

Vérifications :

- aucun fichier V1 n'a été volontairement modifié pendant la phase 1 ;
- aucune correction ou optimisation V1 n'a été appliquée ;
- aucun code V2 n'a été commencé ;
- la phase 2 n'a pas été commencée.

Phase validée par l'utilisateur le 28 juin 2026.

### Phase 2 - Plan complet de migration

**Date :** 28 juin 2026  
**État :** terminée, en attente de validation

Travaux effectués :

- définition des principes de migration et des portes de validation ;
- proposition d'une architecture client modulaire sans framework imposé ;
- définition des responsabilités config, state, storage, domain, services, UI, events et components ;
- définition d'une source de vérité unique pour les familiers et comportements spéciaux ;
- stratégie de versionnement du store et de compatibilité V1/cloud/IndexedDB ;
- ordre complet de migration, du contrat de données jusqu'à la validation production ;
- stratégie détaillée par fonctionnalité ;
- stratégies JavaScript, CSS, responsive, assets, API, sécurité et tests ;
- définition de la matrice de parité, des rapports et du rollback.

Livrable :

- `v2/V2_PHASE2_MIGRATION_PLAN.md` : plan complet de migration.

Vérifications :

- aucun fichier V1 n'a été modifié ;
- aucun squelette, composant ou code fonctionnel V2 n'a été créé ;
- la phase 3 n'a pas été commencée.

Phase validée par l'utilisateur le 28 juin 2026.

### Phase 3 - Création du squelette V2

**Date :** 28 juin 2026  
**État :** terminée, en attente de validation

Travaux effectués :

- création des pages minimales desktop et mobile ;
- création des couches CSS et des variables de base ;
- création des points d'entrée JavaScript neutres ;
- création des modules réservés config, state, storage, domain, services, UI, events et components ;
- création des dossiers d'assets, tests et documentation ;
- création du rapport `v2/V2_PHASE3_REPORT.md`.

Vérifications :

- toutes les références locales des pages existent ;
- aucun accès DOM, stockage, API, listener ou timer fonctionnel n'a été ajouté ;
- aucun asset V1 n'a été copié ;
- aucun fichier V1 n'a été modifié ;
- aucun layout complet de phase 4 n'a été commencé.

Phase validée par l'utilisateur le 28 juin 2026.

### Phase 4 - Reconstruction du layout statique

**Date :** 28 juin 2026  
**État :** terminée, en attente de validation

Travaux effectués :

- reproduction statique du dashboard, de la colonne familier, du chrono et des cartes ;
- reproduction des contrôles de profil, run, donjon, projection et navigation ;
- création de la structure visuelle générique des modales ;
- mise en place du responsive desktop, tablette et mobile ;
- comparaison V1/V2 à 1280×720 ;
- validation de neuf résolutions sans overflow horizontal ;
- correction après revue de la hauteur desktop, du chrono et de l'accès aux blocs Projection et Monstres ;
- création du rapport et des captures de référence.

Livrable :

- `v2/V2_PHASE4_REPORT.md` ;
- captures dans `v2/docs/phase4-*.png`.

Vérifications :

- aucune logique métier ou fonctionnalité V1 n'a été migrée ;
- aucun fichier V1 n'a été modifié ;
- aucun `!important`, `zoom` ou `transform: scale` de contournement ;
- chrono entièrement contenu et blocs inférieurs accessibles sur toutes les résolutions testées ;
- la phase 5 n'a pas été commencée.

Prochaine étape après validation explicite : **Phase 5 - Migration d'une seule fonctionnalité à la fois**.

Phase validée par l'utilisateur le 28 juin 2026.

### Phase 5 - Module 1 : état global

**Date :** 28 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- création du schéma V2 versionné ;
- création des valeurs par défaut sans profil imposé ;
- migration non destructive du store V1 non versionné ;
- conservation des champs inconnus et des familiers non encore configurés ;
- prise en charge des tombstones, partages de galerie, options et succès ;
- création des sélecteurs purs ;
- création d'un store mémoire immuable et observable ;
- ajout d'une fixture V1 multi-profils et de six tests unitaires.

Livrable :

- `v2/V2_PHASE5_STATE_REPORT.md`.

Vérifications :

- 6 tests réussis, 0 échec ;
- aucune mutation de la fixture V1 ;
- aucun accès DOM ou stockage dans la couche d'état ;
- aucune erreur console lors de l'import navigateur ;
- aucun fichier V1 modifié par ce module ;
- le module Stockage n'a pas été commencé.

Prochaine étape après validation explicite : **Phase 5 - Module 2 : Stockage**.

Module validé par l'utilisateur le 28 juin 2026.

### Phase 5 - Module 2 : stockage

**Date :** 28 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- création d'un adaptateur localStorage V2 séparé de la clé V1 ;
- écriture préparée avec checksum et récupération après corruption ;
- gestion structurée des erreurs et du dépassement de quota ;
- création de backups bornés, vérifiés et restaurables ;
- création du stockage IndexedDB des références Dofus ;
- préparation de la migration séparée des images V1 ;
- création d'enveloppes cloud déterministes sans application automatique ;
- ajout de sept tests unitaires de stockage et d'un smoke test navigateur réel.

Livrable :

- `v2/V2_PHASE5_STORAGE_REPORT.md`.

Vérifications :

- 14 tests unitaires réussis au total, 0 échec ;
- cycle IndexedDB réel réussi dans le navigateur ;
- tombstones conservés dans local, backup et cloud ;
- sauvegarde V1 non modifiée ;
- aucun appel réseau ou écrasement cloud ajouté ;
- aucune erreur console et aucune régression visuelle ;
- le module Profils n'a pas été commencé.

Prochaine étape après validation explicite : **Phase 5 - Module 3 : Profils**.

Module validé par l'utilisateur le 28 juin 2026.

### Phase 5 - Module 3 : profils

**Date :** 28 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- extraction reproductible du catalogue V1 vers une configuration V2 ;
- prise en charge des 20 familiers, de la recherche et de la pagination ;
- création initiale sans profil imposé ;
- création multi-familiers et initialisation adaptée à leurs donjons ;
- renommage, changement actif et suppression ;
- protection du dernier profil ;
- création et conservation des tombstones ;
- registre de nettoyage exécuté avant changement de profil ;
- branchement de la persistance V2 avec backup préalable d'une migration V1 ;
- ajout des dialogues accessibles et de leur responsive.

Livrable :

- `v2/V2_PHASE5_PROFILES_REPORT.md`.

Vérifications :

- 21 tests unitaires réussis au total, 0 échec ;
- parcours complet vérifié dans le navigateur ;
- profil supprimé absent après rechargement ;
- premier lancement isolé sans Pykur automatique ;
- catalogue mobile sans overflow ;
- aucune erreur console ;
- aucun fichier V1 modifié par ce module ;
- le module Progression n'a pas été commencé.

Prochaine étape après validation explicite : **Phase 5 - Module 4 : Progression**.

### Phase 5 - Modules 4 à 10

**Date :** 28-29 juin 2026  
**État :** validés par l'utilisateur

Modules migrés et validés individuellement :

- progression ;
- runs et monstres ;
- projection ;
- chrono ;
- session ;
- historique ;
- statistiques.

Livrables :

- `v2/V2_PHASE5_PROGRESSION_REPORT.md` ;
- `v2/V2_PHASE5_RUNS_MONSTERS_REPORT.md` ;
- `v2/V2_PHASE5_PROJECTION_REPORT.md` ;
- `v2/V2_PHASE5_CHRONO_REPORT.md` ;
- `v2/V2_PHASE5_SESSION_REPORT.md` ;
- `v2/V2_PHASE5_HISTORY_REPORT.md` ;
- `v2/V2_PHASE5_STATS_REPORT.md`.

### Phase 5 - Module 11 : notifications

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- création d'un service central de notifications ;
- migration des durées, tailles, notifications persistantes et filtrage des messages mineurs ;
- file visuelle bornée à six messages et fermeture accessible ;
- branchement du dashboard, des profils, du chrono, de l'historique et des erreurs de stockage ;
- responsive mobile et respect de la réduction des animations ;
- ajout de cinq tests unitaires et d'un smoke test navigateur.

Livrable :

- `v2/V2_PHASE5_NOTIFICATIONS_REPORT.md`.

Vérifications :

- 74 tests unitaires réussis, 0 échec ;
- toast créé et fermé dans Chrome headless ;
- rôles `status` et `alert` appliqués selon la priorité ;
- aucune modification de la V1 ;
- le module Options n'a pas été commencé.

Prochaine étape après validation explicite : **Phase 5 - Module 12 : Options**.

### Phase 5 - Module 12 : options et raccourcis

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- création du domaine de réglages sans mutation ;
- fenêtre Options avec sept catégories et recherche en temps réel ;
- application immédiate des réglages d'apparence, interface, chrono, notifications et accessibilité ;
- réglages locaux ou partagés entre tous les profils ;
- activation de la galerie partagée avec fusion non destructive ;
- volume et bouton de son global ;
- raccourcis configurables, conflits détectés et neutralisation pendant la saisie ;
- branchement des raccourcis vers les modules déjà migrés ;
- finalisation de `v2/index.html` comme entrée de test de tous les modules migrés.

Livrable :

- `v2/V2_PHASE5_OPTIONS_REPORT.md`.

Vérifications :

- 80 tests unitaires réussis, 0 échec ;
- recherche Options, sauvegarde et persistance après rechargement vérifiées ;
- raccourcis `+` et `O` vérifiés dans Chrome ;
- responsive 390×844 sans overflow horizontal ;
- aucune erreur console ;
- aucune modification de la V1 dans ce module.

Le module Import / Export a été écarté à la demande de l'utilisateur : la V2 conservera
le stockage local pour les invités et utilisera le cloud pour les comptes.

### Phase 5 - Module 13 : authentification

**Date :** 29 juin 2026  
**État :** terminé, en attente de validation

Travaux effectués :

- client API V2 avec gestion des erreurs, délai maximal et empreinte navigateur ;
- session V2 isolée de la session V1 ;
- connexion, inscription, confirmation email et déconnexion ;
- récupération et réinitialisation du mot de passe ;
- liens email V2 sous `/v2/` sans modifier les liens historiques V1 ;
- préparation du déploiement parallèle sous `/v2/`.

Livrable :

- `v2/V2_PHASE5_AUTH_REPORT.md`.

Vérifications :

- 87 tests unitaires réussis, 0 échec ;
- parcours visuels vérifiés sans erreur console ;
- aucun compte de test créé ;
- aucun fichier d'interface V1 modifié.

Prochaine étape après validation explicite : **Phase 5 - Synchronisation cloud**.

### Phase 5 - Module 14 : synchronisation cloud

**Date :** 30 juin 2026
**État :** terminé, en attente de validation

Travaux effectués :

- sauvegarde automatique des comptes V2 dans une table dédiée ;
- chargement automatique et synchronisation périodique entre appareils ;
- révisions serveur et résolution des conflits sans écrasement silencieux ;
- backup avant application d'une copie distante ;
- isolation des comptes et maintien du stockage local pour les invités ;
- routes V2 séparées des sauvegardes cloud historiques de la V1.

Livrable :

- `v2/V2_PHASE5_CLOUD_REPORT.md`.

Vérifications :

- 93 tests unitaires réussis, 0 échec ;
- syntaxe serveur et client validée ;
- aucun fichier d'interface V1 modifié dans ce module.

Prochaine étape après validation explicite : sélection du prochain module V2.

### Phase 5 - Module 16 : galerie

**Date :** 30 juin 2026
**État :** terminé, en attente de validation

Travaux effectués :

- galerie unique liée au compte, ou au navigateur pour un invité ;
- archives multi-familiers et filtres ;
- archivage de fin de familier et redémarrage du cycle ;
- conservation des options et références Dofus ;
- événements découverts issus des sauvegardes ;
- suppressions et reset protégés par tombstones ;
- branchement des succès et du raccourci Galerie.

Livrable :

- `v2/V2_PHASE5_GALLERY_REPORT.md`.

Vérifications :

- 109 tests unitaires réussis, 0 échec ;
- navigation réelle des trois sections validée ;
- aucune erreur console ;
- aucun fichier V1 modifié par ce module.

Prochaine étape après validation explicite : **Phase 5 - Easter eggs**.
