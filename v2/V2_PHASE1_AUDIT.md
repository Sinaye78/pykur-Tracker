# Pykur Tracker V2 - Audit complet de la V1

**Phase :** 1  
**Date :** 28 juin 2026  
**État :** terminée, en attente de validation  
**Contrainte respectée :** aucun fichier de la V1 n'a été modifié.

## 1. Périmètre et méthode

Audit statique exhaustif des pages, sources client/serveur, données, médias, stockages et outils. Les dépendances installées, .git, artifacts et v2 sont hors inventaire V1. Aucun nettoyage ni correctif n'a été appliqué. Les essais interactifs multi-résolutions appartiennent aux phases ultérieures.

Inventaire fichier par fichier : [V2_PHASE1_FILE_INVENTORY.md](./V2_PHASE1_FILE_INVENTORY.md).

## 2. Synthèse

- 610 fichiers, 138,81 Mio ;
- 5 pages HTML ;
- 20 familiers, 29 donjons/méthodes et 219 monstres ;
- 81 succès dans 12 catégories ;
- 26 événements vivants et 16 ambiances passives ;
- 27 grandes modales/panneaux desktop ;
- 81 routes Express ;
- pykur-app.js : 14 444 lignes ; pykur.css : 13 946 lignes ; server.js : 3 671 lignes ;
- 1 218 !important, 61 media queries et 161 keyframes.

La V1 est fonctionnellement riche mais monolithique. Les données familiers sont centralisées, tandis que rendu, état, stockage, social, effets et administration restent imbriqués.

## 3. Pages

| Page | Rôle |
| --- | --- |
| `index.html` | Redirection racine vers le tracker desktop. |
| `mobile.html` | Redirection racine vers la version mobile. |
| `familiers/pykur/index.html` | Application desktop complète. |
| `familiers/pykur/mobile.html` | Application mobile autonome et historique. |
| `tools/familiar-builder.html` | Générateur de définition et d'assets de familier. |

## 4. Modules physiques et logiques

- `pykur-app.js` : état, profils, progression, chrono, sessions, UI, galerie, succès, événements, Dofus, social, cloud, admin, import/export ;
- `pykur.css` : layout, thèmes, composants, responsive, effets et animations ;
- `data/familiars.js` : source des familiers, donjons, monstres, gains, assets et exceptions ;
- `pykur-core.js` : constantes Pykur, succès et helpers historiques ;
- `mobile.html` : seconde implémentation du store et de plusieurs fonctions métier ;
- `server/server.js` : API, auth, cloud, social, modération, événements et migrations SQLite ;
- `server/schema.sql` : schéma déclaratif, complété par le serveur ;
- `tools/validate-familiars.js` : validateur du registre ;
- scripts VPS/Nginx : installation, déploiement, démarrage, état, compression et cache.

## 5. Interfaces

Dashboard : barre d'actions, carte familier, profil, Session & Chrono, donjon actif, + Run/- Run, stats, historique, édition, reset, cartes donjon, bonus, prochaine progression, projection, monstres, changelog et panneau social.

Modales/panneaux : appDialog, runTimesPanel, statsModal, soundSettingsModal, authModal, passwordResetModal, accountProfileModal, friendsModal, messagesModal, chatboxModal, communityDirectoryModal, communityProfileModal, moderationOverviewModal, moderationModal, changelogModal, galleryModal, pykurCompletionModal, dofusConfigModal, dofusTutorialModal, optionsModal, livingEventAdmin, achievementsModal, activityModal, projectionModal, sessionModal, monstersModal, editMobsModal.

Options : Apparence, Interface, Chrono, Détection Dofus, Notifications, Raccourcis, Liens profils, Données, Accessibilité.

Administration : Accueil, Membres, Modération, Événements, Succès locaux, Permissions, Journal, Préférences.

## 6. Familiers

| Familier | Bonus/max | Farms | Mobs |
| --- | ---: | ---: | ---: |
| Pykur | 90 PP | 2 | 11 |
| Abra Kadabra | 55 puissance | 3 | 8 |
| Dragoune Noir | 55 sagesse | 1 | 34 |
| Tofoudre | 11 dommages | 3 | 14 |
| Flibalak | 11 dommages | 2 | 12 |
| Croum Aqueux | 90 chance | 1 | 7 |
| Croum Volatile | 90 agilité | 1 | 7 |
| Croum Igné | 90 intelligence | 1 | 7 |
| Croum Végétal | 90 force | 1 | 7 |
| Bouloute | 165 vitalité | 1 | 7 |
| Bouloute du parrain | 165 vitalité | 1 | 7 |
| Vampyrette | 165 vitalité | 1 | 9 |
| Gelutin | 165 vitalité | 2 | 15 |
| Tifoux Tigré | 90 PP | 1 | 6 |
| Marcassin | 55 puissance | 1 | 9 |
| Glouton | 1 100 pods | 1 | 15 |
| Tiwabbit Kiafin | 55 puissance | 2 | 11 |
| Miniminotot | 55 puissance | 2 | 10 |
| Chenapandi | 440 vitalité | 1 | 13 |
| Chercheur d'Ogrines | 55 puissance | 1 | 10 |

Le validateur retourne OK : 20 familiers, 29 donjons, 219 mobs, 357 références d'assets. Seize avertissements concernent les sprites Pykur en fallback et l'absence de contrôles statiques explicites pour catalogue, détection, galerie, projection et admin.

Exceptions obligatoires : boucle Salle Abrakne et salles d'accès ; choix du Blop Royal et parcours Blop Multi ; estimation minimale du Miniminotot à composition variable.

## 7. Profils, statistiques et métier

Store global : active, needsFamiliarChoice, galleryShared/sharedGallery, optionsShared/sharedSettings, achievementsShared/sharedAchievements, achievementAccountMode, deletedProfiles et profiles.

Profil : familiarId, runs, mobs par farm et zone, settings, stats, chrono, session, ui, hud, achievements, gallery, dofusDetection, createdAt, activity, undo et special.

Succès communs au compte ; galerie partageable ou locale ; options partageables ; tombstones de suppressions pour profils, archives, événements et succès.

Progression : somme de floor(total tué / palier) × gainValue, bornée au maximum. Les runs appliquent les compositions du registre. Les anciennes sauvegardes peuvent reconstruire les mobs à partir des runs.

Projection : simulation sur copie jusqu'au prochain gain ou objectif, avec limites et exceptions. Chrono et session restent deux structures malgré une UI commune. Historique limité à 80 entrées ; undo limité à 20 états.

Fin de familier : archivage, statistiques, titre, écran final et nouveau cycle. Galerie : archives, événements découverts, dates et compteurs.

## 8. Détection Dofus

Partage volontaire getDisplayMedia, capture personnalisée, zone/seuil par donjon, stockage IndexedDB, comparaison en gris 48×48, fréquence configurable, cooldown minimal par familier, ajout automatique et arrêt sur fin de piste.

IndexedDB : base pykur-dofus-detection v1, store refs, clés dofus_ref_<profil>_<farm>.

## 9. Raccourcis

| Action | Défaut |
| --- | --- |
| + Run | + |
| - Run | - |
| Changer donjon | Tab |
| Chrono | S |
| Reset chrono | R |
| Historique | H |
| Options | O |
| Projection | P |
| Monstres | B |
| Galerie | désactivé |
| Son | Ctrl+M |
| Nuit | Ctrl+D |
| Détection Dofus | désactivé |
| Aide | F1 |

Capture, suppression, activation globale et conflits sont gérés. pykur-core.js ne contient toutefois pas le raccourci Dofus : les défauts ont deux sources.

## 10. Notifications

196 appels toast statiques. Types : success, error, warning, info, rare, reset, undo, chrono, pause, edit, export, import, profile, mark, progression, milestone et variantes d'easter eggs. Déclencheurs : progression, runs, succès, profils, chrono, Dofus, cloud, import/export, événements, social et modération.

Badges persistants par utilisateur : MP non lus, mentions chat, demandes d'ami et avertissements. Ce sont des notifications DOM, pas l'API Notification du navigateur.

## 11. Succès

81 succès dans 12 catégories. Tracker accompli couvre les catégories principales ; Maître des secrets couvre Easter Eggs et Secrets ; Le vrai 100% exige les deux. Les secrets restent cachés jusqu'à l'œuf côté utilisateur mais administrables.

| Catégorie | Nombre |
| --- | ---: |
| PREMIERS PAS | 8 |
| PROGRESSION | 8 |
| DONJONS | 9 |
| VARIETE | 6 |
| MONSTRES | 7 |
| OUTILS | 9 |
| GALERIE | 7 |
| SOCIAL | 5 |
| REGULARITE | 6 |
| FINAL | 3 |
| EASTER EGGS | 8 |
| SECRETS | 5 |

Liste exhaustive :

- `create_profile` — **Premier compagnon** : Creer votre premier profil de familier. [PREMIERS PAS]
- `first_run` — **Premier donjon** : Valider votre premier donjon termine. [PREMIERS PAS]
- `open_projection` — **Regarder la route** : Ouvrir la projection pour estimer votre progression. [PREMIERS PAS]
- `open_monsters` — **Bestiaire ouvert** : Ouvrir le suivi des monstres tues. [PREMIERS PAS]
- `open_history` — **Trace ecrite** : Consulter l'historique du tracker. [PREMIERS PAS]
- `open_gallery` — **Memoire ouverte** : Ouvrir la galerie des familiers termines. [PREMIERS PAS]
- `open_help` — **Guide consulte** : Ouvrir le guide d'aide du tracker. [PREMIERS PAS]
- `open_options` — **Reglages decouverts** : Ouvrir les options du tracker. [PREMIERS PAS]
- `progress_10` — **Premiers progres** : Atteindre 10 % de progression sur un familier. [PROGRESSION]
- `progress_50` — **A mi-chemin** : Atteindre 50 % de progression sur un familier. [PROGRESSION]
- `progress_90` — **Derniere ligne droite** : Atteindre 90 % de progression sur un familier. [PROGRESSION]
- `complete_1` — **Premier familier termine** : Terminer un familier. [PROGRESSION]
- `complete_2` — **Duo accompli** : Terminer 2 familiers. [PROGRESSION]
- `complete_5` — **Collection solide** : Terminer 5 familiers. [PROGRESSION]
- `complete_10` — **Eleveur confirme** : Terminer 10 familiers. [PROGRESSION]
- `complete_20` — **Maitre des familiers** : Terminer 20 familiers. [PROGRESSION]
- `dungeon_1` — **Depart en donjon** : Valider un donjon. [DONJONS]
- `dungeon_10` — **Routine de farm** : Valider 10 donjons. [DONJONS]
- `dungeon_50` — **Rythme installe** : Valider 50 donjons. [DONJONS]
- `dungeon_100` — **Centenaire** : Valider 100 donjons. [DONJONS]
- `dungeon_250` — **Endurance** : Valider 250 donjons. [DONJONS]
- `dungeon_500` — **Marathonien** : Valider 500 donjons. [DONJONS]
- `dungeon_variety_3` — **Explorateur** : Valider au moins 3 donjons differents. [DONJONS]
- `dungeon_variety_5` — **Tour des donjons** : Valider au moins 5 donjons differents. [DONJONS]
- `dungeon_variety_10` — **Grand itineraire** : Valider au moins 10 donjons differents. [DONJONS]
- `familiar_variety_2` — **Deux styles** : Faire progresser 2 familiers differents. [VARIETE]
- `familiar_variety_5` — **Famille elargie** : Faire progresser 5 familiers differents. [VARIETE]
- `profiles_5` — **Carnet bien rempli** : Creer 5 profils de familiers. [VARIETE]
- `bonus_variety_3` — **Polyvalent** : Faire progresser 3 types de bonus differents. [VARIETE]
- `bonus_variety_5` — **Collection equilibree** : Faire progresser 5 types de bonus differents. [VARIETE]
- `farm_methods_3` — **Methodes variees** : Valider des runs sur 3 methodes de farm differentes. [VARIETE]
- `monster_1` — **Premier trophee** : Comptabiliser votre premier monstre. [MONSTRES]
- `monster_100` — **Petit bestiaire** : Comptabiliser 100 monstres. [MONSTRES]
- `monster_1000` — **Bestiaire fourni** : Comptabiliser 1 000 monstres. [MONSTRES]
- `monster_5000` — **Chasseur applique** : Comptabiliser 5 000 monstres. [MONSTRES]
- `monster_10000` — **Chasseur infatigable** : Comptabiliser 10 000 monstres. [MONSTRES]
- `manual_adjustments` — **Correction maitrisee** : Modifier manuellement une valeur de suivi. [MONSTRES]
- `open_monster_threshold` — **Paliers compris** : Consulter les paliers de progression des monstres. [MONSTRES]
- `use_projection_simulator` — **Simulation prudente** : Utiliser le simulateur de projection. [OUTILS]
- `view_time_estimate` — **Temps anticipe** : Consulter une estimation de temps restant. [OUTILS]
- `start_chrono` — **Chrono lance** : Demarrer le chronometre. [OUTILS]
- `chrono_mark` — **Run marque** : Marquer un run avec le chronometre. [OUTILS]
- `start_session` — **Session complete** : Utiliser la session et le chrono pendant un farm. [OUTILS]
- `edit_average_time` — **Temps personnalise** : Modifier un temps moyen de donjon. [OUTILS]
- `open_dofus_detection` — **Detection decouverte** : Ouvrir la section Detection Dofus. [OUTILS]
- `configure_dofus_detection` — **Reference preparee** : Configurer une reference de detection Dofus. [OUTILS]
- `test_dofus_detection` — **Test de detection** : Tester la detection Dofus. [OUTILS]
- `archive_1` — **Archive creee** : Archiver un familier termine. [GALERIE]
- `view_archive` — **Souvenir consulte** : Consulter une archive de familier termine. [GALERIE]
- `archive_3` — **Galerie naissante** : Archiver 3 familiers termines. [GALERIE]
- `archive_10` — **Grande galerie** : Archiver 10 familiers termines. [GALERIE]
- `restart_after_completion` — **Nouvelle aventure** : Repartir sur un nouveau profil apres une completion. [GALERIE]
- `view_event_collection` — **Collection consultee** : Ouvrir la collection d'evenements. [GALERIE]
- `replay_gallery_event` — **Souvenir rejoue** : Rejouer un evenement decouvert depuis la galerie. [GALERIE]
- `create_account` — **Compte cree** : Creer un compte Familier Tracker. [SOCIAL]
- `open_user_profile` — **Profil consulte** : Ouvrir votre profil utilisateur. [SOCIAL]
- `search_member` — **Recherche sociale** : Rechercher un membre. [SOCIAL]
- `private_message` — **Message envoye** : Envoyer un message prive. [SOCIAL]
- `global_chat_message` — **Discussion lancee** : Envoyer un message dans le chat global. [SOCIAL]
- `active_2_days` — **Retour rapide** : Utiliser le tracker sur 2 jours differents. [REGULARITE]
- `active_7_days` — **Habitude prise** : Utiliser le tracker sur 7 jours differents. [REGULARITE]
- `active_30_days` — **Compagnon durable** : Utiliser le tracker sur 30 jours differents. [REGULARITE]
- `daily_runs_10` — **Bonne seance** : Valider 10 donjons sur une journee. [REGULARITE]
- `daily_runs_25` — **Grosse seance** : Valider 25 donjons sur une journee. [REGULARITE]
- `daily_runs_50` — **Journee acharnee** : Valider 50 donjons sur une journee. [REGULARITE]
- `tracker_absolute` — **Tracker accompli** : Debloquer tous les succes principaux du compte. [FINAL]
- `master_secrets` — **Maitre des secrets** : Decouvrir tous les secrets et easter eggs du tracker. [FINAL]
- `true_100` — **Le vrai 100%** : Debloquer Tracker accompli et Maitre des secrets. [FINAL]
- `egg_charlie` — **Charlie trouve** : Activer l'easter egg Charlie. [EASTER EGGS]
- `egg_toom` — **Retour de la NRG 500** : Activer l'easter egg Toom. [EASTER EGGS]
- `egg_aina` — **Le drop impossible** : Activer l'easter egg Aina. [EASTER EGGS]
- `egg_raj` — **Bot detecte** : Activer l'easter egg Raj. [EASTER EGGS]
- `egg_brako` — **Chasseur de Minotot** : Activer l'easter egg Brako. [EASTER EGGS]
- `egg_alhass` — **Observe par Alhass** : Activer l'easter egg Alhass. [EASTER EGGS]
- `egg_capy` — **Capybara detecte** : Activer l'easter egg Capy. [EASTER EGGS]
- `egg_dimeh` — **Construire des trottoirs** : Activer l'easter egg Dimeh. [EASTER EGGS]
- `secret_brako_drop` — **Le destin a choisi Brako** : Obtenir le Dofus Pourpre dans l'easter egg Brako. [SECRETS]
- `secret_brako_no_drop` — **Eh... pas d'oeuf** : Finir le combat Brako sans drop Pourpre. [SECRETS]
- `secret_egg_war` — **Guerre des easter eggs** : Voir Brako interrompre Raj. [SECRETS]
- `secret_raj_ban` — **Bannissement definitif** : Voir Happios bannir Raj. [SECRETS]
- `secret_happios_hover` — **Le vrai boss** : Survoler Happios plusieurs fois. [SECRETS]

## 12. Easter eggs

Commandes/séquences : adminoeuf, ester eggs, pc, tel, raj, brako, capy, toom, aina, charlie, alhass ; Dimeh a une logique séparée. Effets : overlays, scènes, sons, interactions, succès optionnels et déverrouillage de l'œuf. Aucun de ces comportements ne peut être simplifié.

## 13. Événements et ambiance

26 événements serveur : Pluie, Vent, Canicule, Orage, Brouillard, Nuit tombante, Rayon de soleil, Fantôme de Keph, Ombre mystérieuse, Papillon doré, Corbac, Chacha, Larve, Tofu, Trace suspecte, Pièce ancienne, Fragment, Coffre, Bouteille, Résonance, Aura instable, Étoile filante, Familier endormi, Comète, Éveil, Faux bug.

16 ambiances locales : poussières, feuilles, reflet, micro-vent, vie du familier (5 variantes), feuille portée, brise, plume, graine, gouttes, oiseaux, insectes, branche, feuille sonore, vent sonore, gouttes sonores.

## 14. Animations

161 keyframes, 164 déclarations animation, 46 transitions, 28 overlays fixed et 81 z-index. Liste exhaustive :

achievementGlow, achievementReveal, activeDungeonPulse, ainaFloat, ainaGlow, ainaSparkles, alhassAura, alhassFloat, ambientDrift, brakoExplosionGlow, brakoExplosionPulse, brakoExplosionSparks, brakoIdle, brakoKite, charlieChomp, chronoSweep, completionAura, completionPykurFloat, completionSparkle, finalFireworkCore, finalFireworkParticle, finalFireworkVeil, liveAncientPulse, liveBottleFloat, liveBottleOpen, liveBug, liveButterfly, liveButterflyDust, liveButterflyPath, liveChachaDust, liveChachaLost, liveChachaWool, liveChestBurst, liveChestFlash, liveChestIdle, liveChestOpen, liveChestPuff, liveCoinIdle, liveCoinShine, liveCoinSpark, liveCollect, liveCollectImg, liveCorbacFeather, liveCorbacFly, liveFirefly, liveFogBand, liveFogMove, liveFogVeil, liveFogWisp, liveFragmentFly, liveGroundAppear, liveHeatHaze, liveHeatWave, liveKama, liveKephGhost, liveLarvaCrawl, liveLarvaDust, liveLarvaEgg, liveLeafFly, liveLightning, liveNightAppear, liveNightFade, liveNightStar, liveOrbit, liveOverlayFade, livePeek, livePoopAppear, livePoopSmell, livePykurOops, livePykurPulse, livePykurSleepBreath, livePykurTired, liveRainAmbience, liveRainFall, liveRainLine, liveRainSheet, liveRay, liveResonanceAbsorb, liveResonanceAura, liveResonanceOrbit, liveResonancePeakFlare, liveResonancePeakShake, liveResonanceWave, liveShadowWatch, liveShootingStar, liveShootingStarTrail, liveSleepZzz, liveSparkle, liveStar, liveStarDust, liveStarImg, liveStarSkyGlow, liveStarWish, liveStormFlash, liveSunDust, liveSunrayBeam, liveSweatDrop, liveTofuRun, liveTofuStun, liveTombScene, liveUnstableHalo, liveUnstableParticle, liveUnstableSource, liveUnstableSpark, liveUnstableWave, liveWander, liveWaterParticle, liveWindLeaf, liveWindSheet, liveWindStreak, liveZzz, liveZzzImg, milestoneAppFlash, milestonePop, minototBreath, minototHit, modalPolishIn, modalRise, passiveBreeze, passiveDropFall, passiveDustFloat, passiveFeatherFloat, passiveGlint, passiveLeafDrift, passiveLeafShadow, passivePykurBubble, passivePykurRing, passiveSeedDrift, pop, ppFloatRise, progressShine, pykurAbsorb, pykurAltarTurn, pykurAuraSpin, pykurBreath, pykurDrainPulse, pykurFinishPulse, pykurGrumpyTilt, pykurHappyBounce, pykurIdle, pykurLifeBlink, pykurLifeBreathe, pykurLifeLookLeft, pykurLifeLookRight, pykurLifeTilt, pykurMilestone, pykurSanctuaryPulse, pykurSparkle, rajEggVictim, rajHit, rajIdle, rajImpact, rajMonsterAttack, rajTrophyGlow, rajWalk, runEnergyTransfer, socialBadgePulse, toastGoldPulse, toastIn, toomSmoke, toomWheelie.

## 15. Assets

419 PNG (114,02 Mio), 88 WEBP (3,12 Mio), 16 JPG (0,35 Mio), 29 MP3 (3,92 Mio), 7 WAV (0,19 Mio), 1 MP4 (15,47 Mio). Risques : LCP, décodage et mémoire sur appareils faibles. Plusieurs fonds font 1,5 à 2,9 Mio.

Sons :

- `familiers\pykur\assets\ambiance\branche.mp3`
- `familiers\pykur\assets\ambiance\feuille1.mp3`
- `familiers\pykur\assets\ambiance\feuille2.mp3`
- `familiers\pykur\assets\ambiance\goute1.mp3`
- `familiers\pykur\assets\ambiance\goute2.mp3`
- `familiers\pykur\assets\ambiance\insect2.mp3`
- `familiers\pykur\assets\ambiance\insecte1.mp3`
- `familiers\pykur\assets\ambiance\oiseau 3.mp3`
- `familiers\pykur\assets\ambiance\oiseau1.mp3`
- `familiers\pykur\assets\ambiance\oiseau2.mp3`
- `familiers\pykur\assets\ambiance\vent-leger.mp3`
- `familiers\pykur\assets\images\evenement\1. Pluie\pluie.mp3`
- `familiers\pykur\assets\images\evenement\13. Corbac de passage\corbac.mp3`
- `familiers\pykur\assets\images\evenement\17. Crotte\pet.mp3`
- `familiers\pykur\assets\images\evenement\2. Vent\vent.mp3`
- `familiers\pykur\assets\images\evenement\20. Coffre abandonné\coffre.mp3`
- `familiers\pykur\assets\images\evenement\22. Résonance du Pykur\energie.mp3`
- `familiers\pykur\assets\images\evenement\24. Étoile filante\etoile.mp3`
- `familiers\pykur\assets\images\evenement\25. Pykur endormi\baillement.mp3`
- `familiers\pykur\assets\images\evenement\3. Canicule\canicule.mp3`
- `familiers\pykur\assets\images\evenement\4. Orage\tonnerre.mp3`
- `familiers\pykur\assets\images\evenement\9. Fantôme de Keph\fantome.mp3`
- `familiers\pykur\assets\images\evenement\alertevent.mp3`
- `familiers\pykur\assets\sons\chrono_toggle.wav`
- `familiers\pykur\assets\sons\click.mp3`
- `familiers\pykur\assets\sons\error.mp3`
- `familiers\pykur\assets\sons\export_save.wav`
- `familiers\pykur\assets\sons\import_save.wav`
- `familiers\pykur\assets\sons\pp_gain.wav`
- `familiers\pykur\assets\sons\reset_soft.wav`
- `familiers\pykur\assets\sons\run_mark.wav`
- `familiers\pykur\assets\sons\succes\100%.mp3`
- `familiers\pykur\assets\sons\success.mp3`
- `familiers\pykur\assets\sons\undo_soft.wav`
- `familiers\pykur\assets\sons\unlock.mp3`
- `familiers\pykur\assets\sons\warning.mp3`

39 groupes de fichiers identiques : 91 fichiers et environ 7,69 Mo de copies. Plusieurs duplications sont intentionnelles entre boss/donjon ou alias familiers ; toute centralisation devra préserver les chemins.

## 16. Stockage, cloud, import/export

localStorage : pykur_clean_v1, pykur_auth_token, familier_tracker_browser_id, pykur_api_base, pykur_global_muted, pykur_global_volume, clés sociales suffixées par utilisateur, pykur_warning_seen_at, sauvegardes de sécurité cloud/import et backups horodatés.

Cloud : store complet envoyé 500 ms après sauvegarde ; retries 5/15/30/60 s ; payload app, version 1.6.0, savedAt, store. Le schéma métier n'a pas de schemaVersion explicite.

Export desktop JSON version 2 : store + images Dofus data URL. Import : store direct ou payload.store, résumé, confirmation, export préalable, backup, normalisation et restauration IndexedDB. Mobile possède son propre import/export : risque de divergence.

## 17. Backend et API

Express + SQLite/better-sqlite3 + JWT + bcrypt + Nodemailer. WAL, foreign_keys, busy_timeout 5 s. Tables : utilisateurs, cloud, tokens email/reset, amis, modération, avertissements, logs, MP, chat, ignorés, signalements, paramètres chat/sécurité, permissions, historique pseudo, audit immuable, événements, commandes admin et bans IP/navigateur.

Mesures : Helmet, CORS, JSON 2 Mio, rate limits, session_version, rôles et overrides. CSP est désactivée.

Routes (81) :

- `GET /api/health`
- `GET /api/events/living`
- `POST /api/auth/register`
- `POST /api/auth/verify-email/confirm`
- `POST /api/auth/login`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/account/close`
- `PUT /api/account/email`
- `PUT /api/account/password`
- `PUT /api/account/preferences`
- `PUT /api/account/avatar`
- `GET /api/account/warnings`
- `PUT /api/cloud/save`
- `GET /api/cloud/save`
- `GET /api/account/admin-commands`
- `POST /api/account/admin-commands/:id/complete`
- `GET /api/community/users`
- `GET /api/community/users/:pseudo`
- `GET /api/social/online`
- `GET /api/social/chat`
- `POST /api/social/chat`
- `PATCH /api/social/chat/:id`
- `DELETE /api/social/chat/:id`
- `POST /api/social/chat/:id/report`
- `POST /api/social/ignore/:pseudo`
- `DELETE /api/social/ignore/:pseudo`
- `GET /api/social/friends`
- `POST /api/social/friends/:pseudo/request`
- `POST /api/social/friends/:pseudo/accept`
- `POST /api/social/friends/:pseudo/reject`
- `DELETE /api/social/friends/:pseudo`
- `GET /api/social/messages`
- `POST /api/social/messages/read-all`
- `POST /api/social/messages/:pseudo`
- `PATCH /api/social/messages/:pseudo/:id`
- `DELETE /api/social/messages/:pseudo/:id`
- `POST /api/social/messages/:pseudo/:id/report`
- `GET /api/social/messages/:pseudo`
- `GET /api/admin/console`
- `POST /api/admin/broadcast`
- `GET /api/admin/users/:pseudo/control`
- `POST /api/admin/users/:id/commands`
- `POST /api/admin/events/force`
- `PUT /api/admin/events/settings`
- `POST /api/admin/commands/:id/cancel`
- `GET /api/admin/staff-permissions`
- `PUT /api/admin/staff-permissions/:id`
- `GET /api/moderation/users`
- `GET /api/moderation/overview`
- `POST /api/moderation/chat/clear`
- `PUT /api/moderation/chat-settings`
- `PUT /api/admin/security-settings`
- `PATCH /api/moderation/reports/:id`
- `POST /api/moderation/reports/:id/resolve`
- `POST /api/moderation/reports/:id/action`
- `GET /api/moderation/users/:pseudo`
- `PUT /api/moderation/users/:id/pseudo`
- `PUT /api/moderation/users/:id/note`
- `PUT /api/moderation/users/:id/restrictions`
- `PUT /api/moderation/users/:id/avatar`
- `POST /api/moderation/users/:id/sessions/revoke`
- `POST /api/moderation/users/:id/password-reset`
- `DELETE /api/moderation/actions/:id`
- `DELETE /api/moderation/warnings/:id`
- `DELETE /api/moderation/users/:id/history`
- `POST /api/moderation/users/:id/ban`
- `POST /api/moderation/users/:id/unban`
- `POST /api/moderation/users/:id/mute`
- `POST /api/moderation/users/:id/warn`
- `POST /api/moderation/users/:id/unmute`
- `GET /api/moderation/security-bans`
- `POST /api/moderation/users/:id/ip-ban`
- `POST /api/moderation/users/:id/browser-ban`
- `DELETE /api/moderation/security-bans/:kind/:id`
- `POST /api/admin/users/:id/role`
- `POST /api/admin/users/:id/role-legacy`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/role-legacy-disabled`

## 18. Dette CSS

13 946 lignes ; 1 218 !important ; 61 media queries ; 161 keyframes ; 254 transforms avec scale ; aucun zoom CSS. Breakpoints superposés : 768 px (15 blocs), 760 (11), 900 (6), 700 et 560 (3 chacun), plus 780/820/901.

Doublons CSSOM observés sur body, #monsterLauncher, .actions, chrono, colonnes, hero, layout, profile-row, action-groups, side et bestiaire. Le CSS est composé de couches successives ; !important est devenu structurel.

## 19. Dette JavaScript

pykur-app.js : 208 addEventListener, 117 onclick, 10 intervals, 77 timeouts, 114 innerHTML, 107 catch dont 10 vides, 34 console.

renderAdminTarget existe trois fois. Environ 29 fonctions d'événements ont deux déclarations (Rain, Wind, Heat, Storm, Fog, Night, Sunray, Keph, Shadow, Butterfly, Corbac, Chacha, Larva, Tofu, Poop, Coin, Fragment, Chest, Bottle, Resonance, Aura, Star, Sleepy, Comet, Awakening, FakeBug, Interactive, Sound, RandomPoint). La dernière déclaration gagne ; les précédentes sont du code mort risqué.

pykur-core.js est historique : makeStore crée encore un Pykur, cooldown Dofus 45 s et raccourcis incomplets. pykur-app.js redéfinit ces valeurs.

## 20. Mobile

mobile.html est une seconde application : 2 718 lignes, 84 IDs, 58 boutons, CSS/JS intégrés, store/import/export propres et symboles legacy. C'est le plus grand risque de parité fonctionnelle.

## 21. Risques classés

### Critiques

1. Parité difficile à prouver dans deux monolithes desktop/mobile.
2. Sources concurrentes : core, app, mobile, schema.sql et migrations serveur.
3. Store sans version de schéma métier formelle.
4. Easter eggs et exceptions dispersés.
5. Rendu global et état mutable très couplés.

### Élevés

1. JWT localStorage + CSP désactivée + 114 innerHTML : surface XSS.
2. Timers/listeners/polling : fuite et charge possibles.
3. 1 218 !important et media queries contradictoires.
4. 137 Mio de médias.
5. SQLite et snapshot cloud global sensibles à la croissance/concurrence.

### Moyens

1. trust proxy=1 dépend du déploiement.
2. IP/browser ID : conservation et confidentialité à formaliser.
3. Schéma SQL dupliqué.
4. Dix catch vides.
5. Nommage historique Pykur/PP dans un produit multi-familiers.

## 22. Hacks et compatibilités à préserver

- fallback familiarId inconnu vers Pykur ;
- reconstruction mobs depuis runs ;
- tombstones deletedProfiles/removedPykurs/removedEvents/removedUnlocked ;
- migration des succès vers le compte ;
- reset des modes Capy/Toom/Aina au chargement ;
- fallbacks d'assets Pykur ;
- chargement du registre client dans le serveur via vm.runInNewContext ;
- fusion/remplacement du store cloud ;
- images Dofus hors JSON dans IndexedDB ;
- règles responsive et fonctions événements empilées ;
- logique mobile parallèle.

## 23. Contrat de conservation V2

La V2 doit conserver : 20 familiers et exceptions, 29 farms, 219 mobs, imports historiques, tombstones, galerie locale/partagée, succès communs et secrets, 26 événements, 16 ambiances, 14 raccourcis, tous les sons, chrono/session, Dofus IndexedDB, social, permissions/audit, invités/cloud/multi-appareils et mobile jusqu'à remplacement validé.

## 24. Résultat

- audit et inventaire produits ;
- aucune correction V1 ;
- risques, doublons, hacks et contrats consignés ;
- phase 2 non commencée.

**Décision attendue : validation explicite de la phase 1 avant toute phase 2.**

