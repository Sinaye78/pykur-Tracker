# Pykur Tracker V2 - Plan complet de migration

**Phase :** 2  
**Date :** 28 juin 2026  
**État :** terminée, en attente de validation  
**Nature du livrable :** plan uniquement, sans code ni squelette V2.

## 1. Finalité

Ce plan transforme l’audit validé de la V1 en une stratégie de reconstruction contrôlée.

La V2 doit conserver le produit tel que l’utilisateur le connaît :

- mêmes fonctionnalités ;
- mêmes textes ;
- mêmes calculs ;
- mêmes données ;
- mêmes profils ;
- mêmes raccourcis ;
- mêmes notifications ;
- mêmes sons ;
- mêmes succès et easter eggs ;
- mêmes événements ;
- mêmes permissions ;
- même compatibilité locale, cloud et mobile ;
- même identité visuelle.

Les améliorations visées concernent uniquement l’architecture, la maintenabilité, la stabilité, les performances et le responsive.

## 2. Principes de migration

1. La V1 reste intacte et demeure la référence.
2. Toute la V2 reste sous v2/.
3. Aucun module n’est migré sans contrat de comportement écrit.
4. Une seule fonctionnalité métier est migrée et validée à la fois.
5. La compatibilité des sauvegardes est vérifiée avant l’interface.
6. Les comportements spéciaux ne sont jamais généralisés au prix d’une régression.
7. Les effets visuels sont migrés après la logique dont ils dépendent.
8. Le serveur V1 reste compatible pendant la reconstruction du client.
9. Chaque étape possède une porte de validation et un retour arrière simple.
10. Aucun nettoyage de code V1 n’est nécessaire pour construire la V2.

## 3. Choix d’architecture recommandé

### 3.1 Client

Conserver une application web légère en JavaScript natif avec modules ES.

Raisons :

- la V1 utilise déjà les API natives du navigateur ;
- aucune dépendance de framework n’est nécessaire pour reproduire le comportement ;
- la migration peut se faire progressivement ;
- l’application reste déployable comme site statique derrière Nginx ;
- les risques de différence visuelle et comportementale sont plus faibles.

La V2 ne doit pas être une application à page unique complexe. Elle doit rester une page principale composée de modules, de composants DOM explicites et de modales.

### 3.2 Serveur

Conserver initialement l’API Express et SQLite existantes comme contrat externe.

Le serveur ne doit être restructuré qu’après validation du client V2 ou lorsque la compatibilité l’exige. Les routes, statuts HTTP et payloads restent identiques pendant la migration.

### 3.3 Données

Créer une seule source de vérité versionnée pour :

- le schéma du store ;
- les familiers ;
- les donjons ;
- les monstres ;
- les gains ;
- les succès ;
- les événements ;
- les raccourcis ;
- les options par défaut ;
- les permissions.

Les fallbacks historiques deviennent des migrations explicites et testées.

## 4. Architecture cible proposée

L’arborescence ci-dessous est une proposition pour la phase 3. Aucun de ces fichiers n’est créé pendant la phase 2.

    v2/
      index.html
      mobile.html
      assets/
        images/
        sounds/
        icons/
        fonts/
      css/
        variables.css
        reset.css
        base.css
        layout.css
        dashboard.css
        components.css
        cards.css
        buttons.css
        forms.css
        modals.css
        notifications.css
        social.css
        admin.css
        events.css
        animations.css
        responsive.css
        themes.css
      js/
        app.js
        bootstrap.js
        config/
          familiars.js
          achievements.js
          events.js
          shortcuts.js
          permissions.js
        state/
          schema.js
          defaults.js
          migrations.js
          store.js
          selectors.js
        storage/
          local.js
          cloud.js
          indexedDb.js
          importExport.js
          backups.js
        domain/
          progression.js
          runs.js
          monsters.js
          projection.js
          chrono.js
          session.js
          gallery.js
          achievements.js
          dofusDetection.js
        services/
          api.js
          auth.js
          audio.js
          notifications.js
          timers.js
          visibility.js
        ui/
          render.js
          focus.js
          shortcuts.js
          tooltips.js
          dialogs.js
          dashboard.js
          profiles.js
          stats.js
          history.js
          projection.js
          monsters.js
          options.js
          gallery.js
          achievements.js
          detection.js
          social.js
          admin.js
        events/
          living.js
          passive.js
          easterEggs.js
          cleanup.js
        components/
          modal.js
          toast.js
          tabs.js
          badges.js
          emptyState.js
      tests/
        fixtures/
        unit/
        integration/
        compatibility/
        visual/
        e2e/
      docs/

## 5. Responsabilités des couches

### config

Données déclaratives immuables. Aucun accès DOM, stockage ou réseau.

### state

Schéma, valeurs par défaut, migrations, état courant et sélecteurs dérivés. Aucune présentation.

### storage

Adaptateurs localStorage, IndexedDB, cloud, import/export et sauvegardes de sécurité.

### domain

Calculs métier purs : progression, runs, monstres, projection, chrono, sessions, galerie et succès.

### services

Accès API, authentification, audio, notifications et gestion centralisée des timers.

### ui

Rendu DOM et interactions. Les modules UI consomment l’état et appellent les actions métier, sans recalculer la logique.

### events

Événements vivants, ambiances passives, easter eggs et nettoyage de leurs ressources.

### components

Petits composants réutilisables sans logique métier : modale, toast, tabs, badges et états vides.

## 6. Source de vérité multi-familiers

Le registre doit exposer pour chaque familier :

- identifiant stable ;
- libellés ;
- bonus et maximum ;
- images normale, aura et sommeil ;
- fond ;
- donjons ;
- temps moyens ;
- monstres ;
- paliers ;
- gains par source ;
- zones ;
- cooldown Dofus minimal ;
- comportement standard ou spécial ;
- texte d’aide ;
- texte de projection ;
- règles de galerie.

Les comportements spéciaux restent des stratégies nommées :

- abraRoomLoop ;
- gelutinBossChoice ;
- miniminototVariableComposition ;
- standard.

Aucun test conditionnel dispersé sur familiarId ne doit être ajouté en dehors du registre et des stratégies dédiées.

## 7. Schéma de données V2

### 7.1 Versionnement

Ajouter un schemaVersion indépendant de la version de l’application.

Chaque migration doit être :

- pure ;
- idempotente ;
- ordonnée ;
- testée avec un fixture réel ;
- incapable d’effacer silencieusement une donnée inconnue.

### 7.2 Structure globale

Le store V2 conserve conceptuellement :

- profil actif ;
- choix initial du familier ;
- profils ;
- profils supprimés ;
- galerie partagée ou locale ;
- options partagées ou locales ;
- succès de compte ;
- dates de sauvegarde ;
- métadonnées de migration.

### 7.3 Structure profil

Conserver tous les champs observés en phase 1 :

- familiarId ;
- runs ;
- mobs ;
- settings ;
- stats ;
- chrono ;
- session ;
- ui ;
- hud ;
- achievements pour compatibilité ;
- gallery pour compatibilité locale ;
- dofusDetection ;
- createdAt ;
- activity ;
- undo ;
- special.

### 7.4 Tombstones

Les suppressions restent explicites :

- deletedProfiles ;
- removedPykurs ;
- removedEvents ;
- removedUnlocked.

La V2 ne doit jamais fusionner un élément supprimé comme s’il était nouveau.

## 8. Stratégie de compatibilité

### 8.1 Lecture V1

La V2 doit accepter :

- export desktop version 2 ;
- store brut historique ;
- sauvegarde sans familiarId ;
- sauvegarde sans sharedGallery ;
- sauvegarde sans sharedSettings ;
- sauvegarde sans sharedAchievements ;
- runs sans compteurs de monstres ;
- succès par profil ;
- anciennes références Dofus absentes ;
- données issues de mobile.html.

### 8.2 Écriture

Tant que la V2 n’est pas officiellement validée :

- ne pas écraser automatiquement la sauvegarde V1 ;
- utiliser une clé locale V2 distincte ;
- fournir un export de retour ;
- conserver une sauvegarde de sécurité V1 avant migration ;
- ne pas modifier le payload cloud officiel sans validation dédiée.

### 8.3 Cloud

Prévoir trois états explicites :

- local uniquement ;
- cloud inspecté mais non appliqué ;
- cloud synchronisé.

La résolution local/cloud doit être déterministe, horodatée et journalisée.

### 8.4 IndexedDB

Les références Dofus doivent être migrées séparément du store JSON et conserver leurs clés ou une table de correspondance.

## 9. Ordre global de migration

### Étape A - Contrats

1. Geler l’inventaire V1.
2. Créer les fixtures de sauvegardes.
3. Formaliser le schéma V2.
4. Formaliser les données familiers.
5. Formaliser le contrat API.
6. Écrire la matrice V1 vers V2.

### Étape B - Squelette

7. Créer l’arborescence.
8. Créer index minimal et bootstrap.
9. Créer variables CSS et base.
10. Créer le store vide sans fonctionnalité.

### Étape C - Layout

11. Reproduire le cadre principal.
12. Reproduire le dashboard.
13. Reproduire la colonne familier/chrono.
14. Reproduire les cartes.
15. Reproduire les modales génériques.
16. Reproduire le responsive sans métier.

### Étape D - Fonctionnalités

17. État et migrations.
18. Stockage local.
19. Profils.
20. Progression.
21. Runs et monstres.
22. Projection.
23. Chrono.
24. Session.
25. Historique.
26. Statistiques.
27. Notifications.
28. Options.
29. Raccourcis.
30. Import/export.
31. Galerie.
32. Succès.
33. Easter eggs.
34. Événements vivants.
35. Ambiances passives.
36. Détection Dofus.
37. Auth et cloud.
38. Social.
39. Administration.
40. Mobile.

### Étape E - Validation

41. Parité complète.
42. Responsive complet.
43. Accessibilité.
44. Performance.
45. Sécurité.
46. Nettoyage final.

## 10. Migration détaillée des fonctionnalités

Chaque module de phase 5 suit toujours la même séquence :

1. documenter le comportement V1 ;
2. créer les fixtures ;
3. migrer la logique pure ;
4. tester la logique ;
5. connecter le stockage ;
6. connecter l’interface ;
7. comparer V1/V2 ;
8. vérifier import/export ;
9. produire le rapport ;
10. s’arrêter pour validation.

### 10.1 État global

Migrer en premier le schéma, les défauts, les migrations et les sélecteurs.

Critères :

- aucun DOM dans le domaine ;
- aucun accès storage direct hors adaptateurs ;
- fixture V1 chargée sans perte ;
- sérialisation stable.

### 10.2 Stockage

Migrer localStorage, backups, IndexedDB et préparation cloud.

Critères :

- échec quota géré ;
- sauvegarde atomique autant que possible ;
- erreurs visibles ;
- backups restaurables ;
- tombstones conservés.

### 10.3 Profils

Création initiale, catalogue, renommage, suppression, changement actif et profils multi-familiers.

Critères :

- aucun profil par défaut imposé ;
- familiarId conservé ;
- suppression non ressuscitée ;
- changement de profil sans fuite de timer.

### 10.4 Progression, runs et monstres

Migrer les calculs purs avant les boutons.

Critères :

- résultats identiques sur les 20 familiers ;
- exceptions Abra/Gelutin/Miniminotot validées ;
- reconstruction historique identique ;
- bornes et gains identiques.

### 10.5 Projection

Réutiliser les mêmes fonctions métier sur un état cloné.

Critères :

- aucune mutation ;
- aucun succès ;
- aucune sauvegarde ;
- estimations et limites identiques.

### 10.6 Chrono et session

Conserver deux sous-états avec une interface unifiée.

Critères :

- reprise après reload ;
- changement de profil ;
- marquage automatique ;
- résumé ;
- nettoyage des intervalles.

### 10.7 Historique et statistiques

Les données dérivées doivent passer par des sélecteurs, sans recalculs dispersés dans les vues.

### 10.8 Notifications

Créer un service unique avec :

- type ;
- durée ;
- persistance ;
- son ;
- priorité ;
- accessibilité ;
- déduplication.

Conserver tous les textes et variantes V1.

### 10.9 Options et raccourcis

Créer un registre d’options et un registre de raccourcis.

Critères :

- partage entre profils ;
- conflits de raccourcis ;
- activation globale ;
- valeurs historiques ;
- persistance immédiate.

### 10.10 Import/export

Migrer avant galerie/succès complexes afin de tester chaque ajout avec des données réelles.

Critères :

- PC vers V2 ;
- mobile vers V2 ;
- V2 vers V2 ;
- données inconnues préservées ;
- images Dofus restaurées ;
- résumé et backup identiques.

### 10.11 Galerie

Conserver archives multi-familiers, filtre, événements et tombstones.

### 10.12 Succès

Le registre est une source unique. Les conditions deviennent des prédicats testables.

Conserver :

- 81 succès ;
- catégories ;
- dates ;
- sons FINAL ;
- feu d’artifice ;
- visibilité secrète ;
- give/retrait admin ;
- absence de son admin par défaut.

### 10.13 Easter eggs

Migrer un easter egg à la fois dans un module isolé.

Chaque effet doit déclarer :

- déclencheur ;
- état ;
- DOM créé ;
- timers ;
- sons ;
- cleanup ;
- succès associés.

### 10.14 Événements et ambiance

Événements serveur et ambiance locale restent indépendants.

Créer un gestionnaire de ressources pour supprimer :

- nœuds DOM ;
- classes ;
- timeouts ;
- intervals ;
- audio ;
- listeners temporaires.

### 10.15 Détection Dofus

Séparer :

- partage d’écran ;
- capture ;
- sélection de zone ;
- stockage ;
- comparaison ;
- planification ;
- cooldown ;
- ajout de run.

### 10.16 Auth, cloud et social

Conserver les routes V1. Isoler API, token, présence, polling, messages, chat, amis et profils publics.

Avant toute amélioration de sécurité, reproduire le comportement puis traiter la CSP et le stockage du token dans une étape validée.

### 10.17 Administration

Construire l’administration à partir du catalogue de permissions, jamais seulement du rôle.

Conserver :

- ciblage utilisateur/profil/familier ;
- sanctions ;
- signalements ;
- audit ;
- commandes différées ;
- événements ciblés ;
- resets et réparations ;
- IP et navigateur ;
- overrides staff.

### 10.18 Mobile

Ne pas porter mobile.html ligne par ligne.

Après validation du desktop responsive :

- définir si une page responsive unique suffit ;
- conserver mobile.html V1 tant que la parité n’est pas prouvée ;
- migrer les différences réelles ;
- tester import/export mobile ;
- retirer l’ancienne page seulement après validation explicite.

## 11. Stratégie JavaScript

### Règles

- modules ES explicites ;
- fonctions métier pures ;
- dépendances injectées ;
- pas de variable globale métier ;
- pas de fonction déclarée deux fois ;
- pas de onclick affecté dans plusieurs rendus ;
- un AbortController ou cleanup par vue/modale ;
- un registre central de timers ;
- textContent par défaut ;
- HTML dynamique uniquement via composants sûrs ;
- erreurs remontées au service de notification ;
- aucun catch vide.

### Rendu

Le rendu doit être ciblé :

- renderProfileSwitcher ;
- renderFamiliarCard ;
- renderDungeonCards ;
- renderProgress ;
- renderProjectionSummary ;
- renderSocialBadges.

Un changement de chrono ne doit pas relancer tout le dashboard.

### État

Les actions métier modifient le store. Les sélecteurs calculent les vues dérivées. Les composants ne modifient jamais directement les objets de données.

## 12. Stratégie CSS

### Ordre des couches

1. variables ;
2. reset ;
3. base ;
4. layout ;
5. composants ;
6. pages/modules ;
7. thèmes ;
8. animations ;
9. responsive.

### Règles

- pas de copie du CSS V1 complet ;
- aucune utilisation de zoom ;
- aucun transform: scale pour adapter le layout ;
- !important exceptionnel et documenté ;
- tailles via rem, %, minmax, clamp, min et max ;
- dimensions stables pour contrôles ;
- pas de sélecteurs ID pour la présentation ;
- classes d’état explicites ;
- z-index via échelle centralisée ;
- animations désactivables ;
- prefers-reduced-motion respecté.

### Variables

Prévoir des tokens pour :

- couleurs ;
- surfaces ;
- bordures ;
- ombres ;
- rayons ;
- espacements ;
- typographie ;
- tailles de contrôles ;
- z-index ;
- durées d’animation.

## 13. Stratégie responsive

### Approche

Desktop-first mesuré, avec composants intrinsèquement flexibles et quelques breakpoints cohérents.

Breakpoints proposés à valider par le contenu, pas à recopier automatiquement :

- large : au-dessus de 1600 px ;
- desktop : 1280 à 1599 px ;
- compact desktop/tablette paysage : 1024 à 1279 px ;
- tablette : 768 à 1023 px ;
- mobile : sous 768 px.

### Principes

- aucun overflow horizontal ;
- grilles avec minmax ;
- panneaux qui passent en colonne naturellement ;
- modales limitées par dvh et scroll interne ;
- boutons tactiles au moins 44 px ;
- textes jamais réduits selon la largeur du viewport ;
- panneau social repositionné sans recouvrir le tracker ;
- sticky uniquement dans un conteneur maîtrisé ;
- aucune règle 760/768/780 concurrente.

### Résolutions de référence

1920×1080, 1600×900, 1536×864, 1440×900, 1366×768, 1280×720, 1024×768, tablette, Android et iPhone.

## 14. Stratégie assets et performances

- créer un manifeste d’assets ;
- conserver les originaux ;
- fournir WEBP/AVIF lorsque compatible ;
- dimensions explicites pour éviter le CLS ;
- lazy loading hors premier viewport ;
- précharger uniquement le familier et le fond actifs ;
- ne pas charger tous les sprites catalogue au démarrage ;
- différer vidéo et sons jusqu’à usage ;
- centraliser les alias d’assets dupliqués ;
- conserver les noms fonctionnels pour la compatibilité.

Budgets proposés :

- JS initial inférieur à 200 Kio compressé ;
- CSS initial inférieur à 100 Kio compressé ;
- image LCP adaptée à l’écran ;
- aucune tâche principale supérieure à 50 ms lors du chargement ;
- zéro layout shift provoqué par images sans dimensions.

Ces budgets sont des objectifs de phase 7, pas des conditions pour commencer.

## 15. Stratégie API et serveur

### Contrat initial

- conserver les 81 routes ;
- conserver les payloads ;
- conserver les codes d’erreur ;
- conserver rôles et permissions ;
- conserver l’audit immuable ;
- conserver les commandes différées.

### Restructuration ultérieure possible

Après parité :

    server/
      app.js
      config/
      middleware/
      routes/
      services/
      repositories/
      db/
      migrations/
      validators/

La migration serveur devra être une phase dédiée, route par route, avec tests de contrat.

## 16. Stratégie sécurité

Sans modifier le comportement avant validation :

- inventorier toutes les écritures HTML ;
- remplacer progressivement par textContent ou templates sûrs ;
- préparer une CSP testée ;
- documenter la conservation IP/browser ID ;
- valider trust proxy avec Nginx ;
- protéger les uploads ;
- conserver les rate limits ;
- tester les permissions côté serveur ;
- ne jamais faire confiance aux permissions affichées par le client ;
- tester révocation de session, ban, mute et suppression.

## 17. Stratégie de tests

### 17.1 Tests unitaires

- progression de chaque familier ;
- gains par donjon ;
- paliers ;
- projections ;
- limites ;
- chrono ;
- migrations ;
- succès ;
- fusion galerie ;
- tombstones.

### 17.2 Tests de compatibilité

Fixtures minimales :

- nouveau store vide ;
- sauvegarde Pykur historique ;
- multi-profils multi-familiers ;
- galerie partagée ;
- galerie locale ;
- succès secrets ;
- profil supprimé ;
- archive supprimée ;
- référence Dofus ;
- sauvegarde mobile ;
- payload cloud ;
- store partiellement corrompu.

### 17.3 Tests d’intégration

- création/changement/suppression profil ;
- run puis sauvegarde/reload ;
- import/export ;
- fin de familier et archivage ;
- options partagées ;
- succès partagés ;
- Dofus ;
- auth/cloud ;
- chat/MP/amis ;
- administration.

### 17.4 Tests E2E

Utiliser Playwright pour les parcours et Chrome DevTools pour DOM, responsive, mémoire, réseau et performances.

### 17.5 Tests visuels

Captures V1/V2 côte à côte aux résolutions imposées. Les différences doivent être expliquées ou corrigées.

### 17.6 Tests de performance

- démarrage à froid ;
- cache chaud ;
- changement de profil ;
- ouverture des grosses modales ;
- 30 minutes de chrono ;
- événements répétés ;
- polling social ;
- mémoire après fermeture des modales.

### 17.7 Tests accessibilité

- tabulation ;
- focus modal ;
- Escape ;
- labels ;
- noms accessibles ;
- contraste ;
- reduced motion ;
- zoom navigateur 200 % ;
- lecteurs d’écran pour contrôles principaux.

## 18. Matrice de parité

Créer pour chaque fonctionnalité une ligne avec :

- référence V1 ;
- module V2 ;
- fixture ;
- test unitaire ;
- test E2E ;
- test visuel ;
- statut ;
- différence connue ;
- validation utilisateur.

Aucune fonctionnalité n’est déclarée migrée sans cette ligne.

## 19. Rapports attendus

Après chaque module :

1. périmètre ;
2. fichiers V2 créés ou modifiés ;
3. comportement V1 de référence ;
4. comportement V2 obtenu ;
5. tests exécutés ;
6. captures si interface ;
7. données testées ;
8. écarts éventuels ;
9. risques restants ;
10. décision attendue.

À la fin de chaque phase :

- résumé ;
- checklist ;
- preuves ;
- fichiers ;
- problèmes ;
- décision de passage.

## 20. Portes de validation

### Porte 1 - Données

Aucune perte sur les fixtures V1.

### Porte 2 - Métier

Calculs identiques sur les 20 familiers.

### Porte 3 - Interface

Layout fidèle sans logique manquante.

### Porte 4 - Fonctionnalités

Matrice V1 vers V2 complète.

### Porte 5 - Responsive

Toutes les résolutions validées à 100 % de zoom.

### Porte 6 - Production

Sécurité, performance, sauvegardes, rollback et monitoring validés.

## 21. Stratégie de rollback

- V1 reste déployable ;
- V2 possède un chemin séparé ;
- sauvegardes V1 conservées ;
- aucune migration cloud destructive avant validation ;
- déploiement V2 activable par route ou feature flag ;
- retour V1 sans conversion forcée ;
- journal des migrations de données.

## 22. Risques et réponses

| Risque | Réponse |
| --- | --- |
| Perte de comportement caché | Matrice de parité + migration easter egg par easter egg. |
| Store incompatible | schemaVersion + fixtures + migrations idempotentes. |
| Régression multi-familiers | Tests générés depuis le registre. |
| Mobile divergent | Maintien V1 mobile puis convergence contrôlée. |
| CSS à nouveau empilé | Couches strictes et revue de spécificité. |
| Fuite de timers | Service central et cleanup obligatoire. |
| XSS | Templates sûrs puis CSP validée. |
| Cloud écrasant le local | inspection, backup et résolution déterministe. |
| API cassée | tests de contrat sur les 81 routes. |
| Médias lourds | manifeste, formats optimisés et chargement à la demande. |

## 23. Découpage des phases suivantes

### Phase 3

Créer uniquement l’arborescence, les fichiers vides utiles, variables CSS, index minimal et bootstrap sans fonctionnalité.

### Phase 4

Reproduire uniquement le layout et le responsive statique. Aucune logique métier.

### Phase 5

Migrer une fonctionnalité à la fois selon l’ordre défini dans ce plan. S’arrêter après chaque module.

Suivi au 28 juin 2026 :

- état et migrations : validé ;
- stockage local : validé ;
- profils : validé ;
- progression : validé ;
- runs et monstres : validé ;
- projection : validé ;
- chrono : validé ;
- session : validée ;
- historique : validé ;
- statistiques : terminé, en attente de validation ;
- prochain module après validation : notifications.

### Phase 6

Exécuter les tests complets, comparaisons visuelles et validations multi-résolutions.

### Phase 7

Supprimer le code mort V2, factoriser, optimiser et finaliser les performances uniquement après parité.

## 24. Conditions de réussite de la phase 2

- ordre de migration défini ;
- architecture cible définie ;
- responsabilités des modules définies ;
- stratégie données et compatibilité définie ;
- stratégie responsive définie ;
- stratégie CSS définie ;
- stratégie JavaScript définie ;
- stratégie serveur définie ;
- stratégie de tests définie ;
- rapports et portes de validation définis ;
- aucun code V2 créé ;
- aucune modification V1.

## 25. Décision attendue

Ce document est un plan. Il ne crée aucun squelette et ne choisit aucun détail non validé au-delà des recommandations architecturales.

Après validation explicite, la prochaine étape sera uniquement la phase 3 : création du squelette V2 sans fonctionnalité.
