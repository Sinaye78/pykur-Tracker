const STANDARD_ICON = "../familiers/pykur/assets/images/succes/boutonsucces.png";
const FINAL_ICON = "../familiers/pykur/assets/images/succes/FINAL/trackerabsolu.jpg";

function achievement(title, description, category, options = {}) {
  return Object.freeze({ title, description, category, icon: options.icon || STANDARD_ICON, optional: Boolean(options.optional) });
}

export const ACHIEVEMENT_CATEGORIES = Object.freeze([
  "PREMIERS PAS", "PROGRESSION", "DONJONS", "VARIETE", "MONSTRES", "OUTILS",
  "GALERIE", "SOCIAL", "REGULARITE", "FINAL", "EASTER EGGS", "SECRETS"
]);

export const MAIN_ACHIEVEMENT_CATEGORIES = Object.freeze([
  "PREMIERS PAS", "PROGRESSION", "DONJONS", "VARIETE", "MONSTRES", "OUTILS",
  "GALERIE", "SOCIAL", "REGULARITE"
]);

export const SECRET_ACHIEVEMENT_CATEGORIES = Object.freeze(["EASTER EGGS", "SECRETS"]);
export const SECRET_FINAL_ACHIEVEMENTS = Object.freeze(["master_secrets", "true_100"]);

export const ACHIEVEMENTS = Object.freeze({
  create_profile: achievement("Premier compagnon", "Creer votre premier profil de familier.", "PREMIERS PAS"),
  first_run: achievement("Premier donjon", "Valider votre premier donjon termine.", "PREMIERS PAS"),
  open_projection: achievement("Regarder la route", "Ouvrir la projection pour estimer votre progression.", "PREMIERS PAS"),
  open_monsters: achievement("Bestiaire ouvert", "Ouvrir le suivi des monstres tues.", "PREMIERS PAS"),
  open_history: achievement("Trace ecrite", "Consulter l'historique du tracker.", "PREMIERS PAS"),
  open_gallery: achievement("Memoire ouverte", "Ouvrir la galerie des familiers termines.", "PREMIERS PAS"),
  open_help: achievement("Guide consulte", "Ouvrir le guide d'aide du tracker.", "PREMIERS PAS"),
  open_options: achievement("Reglages decouverts", "Ouvrir les options du tracker.", "PREMIERS PAS"),
  progress_10: achievement("Premiers progres", "Atteindre 10 % de progression sur un familier.", "PROGRESSION"),
  progress_50: achievement("A mi-chemin", "Atteindre 50 % de progression sur un familier.", "PROGRESSION"),
  progress_90: achievement("Derniere ligne droite", "Atteindre 90 % de progression sur un familier.", "PROGRESSION"),
  complete_1: achievement("Premier familier termine", "Terminer un familier.", "PROGRESSION"),
  complete_2: achievement("Duo accompli", "Terminer 2 familiers.", "PROGRESSION"),
  complete_5: achievement("Collection solide", "Terminer 5 familiers.", "PROGRESSION"),
  complete_10: achievement("Eleveur confirme", "Terminer 10 familiers.", "PROGRESSION"),
  complete_20: achievement("Maitre des familiers", "Terminer 20 familiers.", "PROGRESSION"),
  dungeon_1: achievement("Depart en donjon", "Valider un donjon.", "DONJONS"),
  dungeon_10: achievement("Routine de farm", "Valider 10 donjons.", "DONJONS"),
  dungeon_50: achievement("Rythme installe", "Valider 50 donjons.", "DONJONS"),
  dungeon_100: achievement("Centenaire", "Valider 100 donjons.", "DONJONS"),
  dungeon_250: achievement("Endurance", "Valider 250 donjons.", "DONJONS"),
  dungeon_500: achievement("Marathonien", "Valider 500 donjons.", "DONJONS"),
  dungeon_variety_3: achievement("Explorateur", "Valider au moins 3 donjons differents.", "DONJONS"),
  dungeon_variety_5: achievement("Tour des donjons", "Valider au moins 5 donjons differents.", "DONJONS"),
  dungeon_variety_10: achievement("Grand itineraire", "Valider au moins 10 donjons differents.", "DONJONS"),
  familiar_variety_2: achievement("Deux styles", "Faire progresser 2 familiers differents.", "VARIETE"),
  familiar_variety_5: achievement("Famille elargie", "Faire progresser 5 familiers differents.", "VARIETE"),
  profiles_5: achievement("Carnet bien rempli", "Creer 5 profils de familiers.", "VARIETE"),
  bonus_variety_3: achievement("Polyvalent", "Faire progresser 3 types de bonus differents.", "VARIETE"),
  bonus_variety_5: achievement("Collection equilibree", "Faire progresser 5 types de bonus differents.", "VARIETE"),
  farm_methods_3: achievement("Methodes variees", "Valider des runs sur 3 methodes de farm differentes.", "VARIETE"),
  monster_1: achievement("Premier trophee", "Comptabiliser votre premier monstre.", "MONSTRES"),
  monster_100: achievement("Petit bestiaire", "Comptabiliser 100 monstres.", "MONSTRES"),
  monster_1000: achievement("Bestiaire fourni", "Comptabiliser 1 000 monstres.", "MONSTRES"),
  monster_5000: achievement("Chasseur applique", "Comptabiliser 5 000 monstres.", "MONSTRES"),
  monster_10000: achievement("Chasseur infatigable", "Comptabiliser 10 000 monstres.", "MONSTRES"),
  manual_adjustments: achievement("Correction maitrisee", "Modifier manuellement une valeur de suivi.", "MONSTRES"),
  open_monster_threshold: achievement("Paliers compris", "Consulter les paliers de progression des monstres.", "MONSTRES"),
  use_projection_simulator: achievement("Simulation prudente", "Utiliser le simulateur de projection.", "OUTILS"),
  view_time_estimate: achievement("Temps anticipe", "Consulter une estimation de temps restant.", "OUTILS"),
  start_chrono: achievement("Chrono lance", "Demarrer le chronometre.", "OUTILS"),
  chrono_mark: achievement("Run marque", "Marquer un run avec le chronometre.", "OUTILS"),
  start_session: achievement("Session complete", "Utiliser la session et le chrono pendant un farm.", "OUTILS"),
  edit_average_time: achievement("Temps personnalise", "Modifier un temps moyen de donjon.", "OUTILS"),
  open_dofus_detection: achievement("Detection decouverte", "Ouvrir la section Detection Dofus.", "OUTILS"),
  configure_dofus_detection: achievement("Reference preparee", "Configurer une reference de detection Dofus.", "OUTILS"),
  test_dofus_detection: achievement("Test de detection", "Tester la detection Dofus.", "OUTILS"),
  archive_1: achievement("Archive creee", "Archiver un familier termine.", "GALERIE"),
  view_archive: achievement("Souvenir consulte", "Consulter une archive de familier termine.", "GALERIE"),
  archive_3: achievement("Galerie naissante", "Archiver 3 familiers termines.", "GALERIE"),
  archive_10: achievement("Grande galerie", "Archiver 10 familiers termines.", "GALERIE"),
  restart_after_completion: achievement("Nouvelle aventure", "Repartir sur un nouveau profil apres une completion.", "GALERIE"),
  view_event_collection: achievement("Collection consultee", "Ouvrir la collection d'evenements.", "GALERIE"),
  replay_gallery_event: achievement("Souvenir rejoue", "Rejouer un evenement decouvert depuis la galerie.", "GALERIE"),
  create_account: achievement("Compte cree", "Creer un compte Familier Tracker.", "SOCIAL"),
  open_user_profile: achievement("Profil consulte", "Ouvrir votre profil utilisateur.", "SOCIAL"),
  search_member: achievement("Recherche sociale", "Rechercher un membre.", "SOCIAL"),
  private_message: achievement("Message envoye", "Envoyer un message prive.", "SOCIAL"),
  global_chat_message: achievement("Discussion lancee", "Envoyer un message dans le chat global.", "SOCIAL"),
  active_2_days: achievement("Retour rapide", "Utiliser le tracker sur 2 jours differents.", "REGULARITE"),
  active_7_days: achievement("Habitude prise", "Utiliser le tracker sur 7 jours differents.", "REGULARITE"),
  active_30_days: achievement("Compagnon durable", "Utiliser le tracker sur 30 jours differents.", "REGULARITE"),
  daily_runs_10: achievement("Bonne seance", "Valider 10 donjons sur une journee.", "REGULARITE"),
  daily_runs_25: achievement("Grosse seance", "Valider 25 donjons sur une journee.", "REGULARITE"),
  daily_runs_50: achievement("Journee acharnee", "Valider 50 donjons sur une journee.", "REGULARITE"),
  tracker_absolute: achievement("Tracker accompli", "Debloquer tous les succes principaux du compte.", "FINAL", { icon: FINAL_ICON }),
  master_secrets: achievement("Maitre des secrets", "Decouvrir tous les secrets et easter eggs du tracker.", "FINAL", { icon: FINAL_ICON }),
  true_100: achievement("Le vrai 100%", "Debloquer Tracker accompli et Maitre des secrets.", "FINAL", { icon: FINAL_ICON }),
  egg_charlie: achievement("Charlie trouve", "Activer l'easter egg Charlie.", "EASTER EGGS", { optional: true }),
  egg_toom: achievement("Retour de la NRG 500", "Activer l'easter egg Toom.", "EASTER EGGS", { optional: true }),
  egg_aina: achievement("Le drop impossible", "Activer l'easter egg Aina.", "EASTER EGGS", { optional: true }),
  egg_raj: achievement("Bot detecte", "Activer l'easter egg Raj.", "EASTER EGGS", { optional: true }),
  egg_brako: achievement("Chasseur de Minotot", "Activer l'easter egg Brako.", "EASTER EGGS", { optional: true }),
  egg_alhass: achievement("Observe par Alhass", "Activer l'easter egg Alhass.", "EASTER EGGS", { optional: true }),
  egg_capy: achievement("Capybara detecte", "Activer l'easter egg Capy.", "EASTER EGGS", { optional: true }),
  egg_dimeh: achievement("Construire des trottoirs", "Activer l'easter egg Dimeh.", "EASTER EGGS", { optional: true }),
  secret_brako_drop: achievement("Le destin a choisi Brako", "Obtenir le Dofus Pourpre dans l'easter egg Brako.", "SECRETS", { optional: true }),
  secret_brako_no_drop: achievement("Eh... pas d'oeuf", "Finir le combat Brako sans drop Pourpre.", "SECRETS", { optional: true }),
  secret_egg_war: achievement("Guerre des easter eggs", "Voir Brako interrompre Raj.", "SECRETS", { optional: true }),
  secret_raj_ban: achievement("Bannissement definitif", "Voir Happios bannir Raj.", "SECRETS", { optional: true }),
  secret_happios_hover: achievement("Le vrai boss", "Survoler Happios plusieurs fois.", "SECRETS", { optional: true })
});

export function achievementEntries(category = null) {
  const entries = Object.entries(ACHIEVEMENTS);
  return category ? entries.filter(([, item]) => item.category === category) : entries;
}
