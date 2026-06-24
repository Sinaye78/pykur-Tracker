(function(){
  const STORE_KEY="pykur_clean_v1";
  const PP_MAX=90;
  const RUN_LIMITS={morose:640,tynril:48};
  const mobs={
    chiendent:{name:"Chiendent",img:"chiendent.png",ppNeed:80},
    nerbe:{name:"Nerbe",img:"nerbe.png",ppNeed:80},
    fecorce:{name:"Fécorce",img:"fecorce.png",ppNeed:60},
    abrakleur:{name:"Abrakleur Sombre",img:"abrakleur.png",ppNeed:40},
    bitouf:{name:"Bitouf Sombre",img:"bitouf.png",ppNeed:40},
    floribonde:{name:"Floribonde",img:"floribonde.png",ppNeed:40},
    brouture:{name:"Brouture",img:"Brouture.png",ppNeed:60},
    tynrilAhuri:{name:"Tynril Ahuri",img:"tynril-ahuri.png",ppNeed:3},
    tynrilPerfide:{name:"Tynril Perfide",img:"tynril-perfide.png",ppNeed:3},
    tynrilDeconcerte:{name:"Tynril Déconcerté",img:"tynril-deconcerte.png",ppNeed:3},
    tynrilConsterne:{name:"Tynril Consterné",img:"tynril-consterne.png",ppNeed:3}
  };
  const gains={
    morose:{chiendent:1,nerbe:1,fecorce:1,abrakleur:1,bitouf:1,floribonde:2},
    tynril:{tynrilConsterne:1,tynrilDeconcerte:1,tynrilPerfide:1,tynrilAhuri:1,fecorce:2,abrakleur:3,brouture:3,chiendent:5,nerbe:6,floribonde:6,bitouf:10}
  };
  const ACHIEVEMENT_CATEGORIES=[
    "PREMIERS PAS",
    "PROGRESSION",
    "DONJONS",
    "VARIETE",
    "MONSTRES",
    "OUTILS",
    "GALERIE",
    "SOCIAL",
    "REGULARITE",
    "FINAL",
    "EASTER EGGS",
    "SECRETS"
  ];
  const DEFAULT_ACHIEVEMENT_ICON="./assets/images/succes/boutonsucces.png";
  const FINAL_ACHIEVEMENT_ICON="./assets/images/succes/FINAL/trackerabsolu.jpg";
  const ACHIEVEMENTS={
    create_profile:{title:"Premier compagnon",description:"Creer votre premier profil de familier.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    first_run:{title:"Premier donjon",description:"Valider votre premier donjon termine.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_projection:{title:"Regarder la route",description:"Ouvrir la projection pour estimer votre progression.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_monsters:{title:"Bestiaire ouvert",description:"Ouvrir le suivi des monstres tues.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_history:{title:"Trace ecrite",description:"Consulter l'historique du tracker.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_gallery:{title:"Memoire ouverte",description:"Ouvrir la galerie des familiers termines.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_help:{title:"Guide consulte",description:"Ouvrir le guide d'aide du tracker.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_options:{title:"Reglages decouverts",description:"Ouvrir les options du tracker.",category:"PREMIERS PAS",icon:DEFAULT_ACHIEVEMENT_ICON},
    progress_10:{title:"Premiers progres",description:"Atteindre 10 % de progression sur un familier.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    progress_50:{title:"A mi-chemin",description:"Atteindre 50 % de progression sur un familier.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    progress_90:{title:"Derniere ligne droite",description:"Atteindre 90 % de progression sur un familier.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    complete_1:{title:"Premier familier termine",description:"Terminer un familier.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    complete_2:{title:"Duo accompli",description:"Terminer 2 familiers.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    complete_5:{title:"Collection solide",description:"Terminer 5 familiers.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    complete_10:{title:"Eleveur confirme",description:"Terminer 10 familiers.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    complete_20:{title:"Maitre des familiers",description:"Terminer 20 familiers.",category:"PROGRESSION",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_1:{title:"Depart en donjon",description:"Valider un donjon.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_10:{title:"Routine de farm",description:"Valider 10 donjons.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_50:{title:"Rythme installe",description:"Valider 50 donjons.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_100:{title:"Centenaire",description:"Valider 100 donjons.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_250:{title:"Endurance",description:"Valider 250 donjons.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_500:{title:"Marathonien",description:"Valider 500 donjons.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_variety_3:{title:"Explorateur",description:"Valider au moins 3 donjons differents.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_variety_5:{title:"Tour des donjons",description:"Valider au moins 5 donjons differents.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    dungeon_variety_10:{title:"Grand itineraire",description:"Valider au moins 10 donjons differents.",category:"DONJONS",icon:DEFAULT_ACHIEVEMENT_ICON},
    familiar_variety_2:{title:"Deux styles",description:"Faire progresser 2 familiers differents.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    familiar_variety_5:{title:"Famille elargie",description:"Faire progresser 5 familiers differents.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    profiles_5:{title:"Carnet bien rempli",description:"Creer 5 profils de familiers.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    bonus_variety_3:{title:"Polyvalent",description:"Faire progresser 3 types de bonus differents.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    bonus_variety_5:{title:"Collection equilibree",description:"Faire progresser 5 types de bonus differents.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    farm_methods_3:{title:"Methodes variees",description:"Valider des runs sur 3 methodes de farm differentes.",category:"VARIETE",icon:DEFAULT_ACHIEVEMENT_ICON},
    monster_1:{title:"Premier trophee",description:"Comptabiliser votre premier monstre.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    monster_100:{title:"Petit bestiaire",description:"Comptabiliser 100 monstres.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    monster_1000:{title:"Bestiaire fourni",description:"Comptabiliser 1 000 monstres.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    monster_5000:{title:"Chasseur applique",description:"Comptabiliser 5 000 monstres.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    monster_10000:{title:"Chasseur infatigable",description:"Comptabiliser 10 000 monstres.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    manual_adjustments:{title:"Correction maitrisee",description:"Modifier manuellement une valeur de suivi.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_monster_threshold:{title:"Paliers compris",description:"Consulter les paliers de progression des monstres.",category:"MONSTRES",icon:DEFAULT_ACHIEVEMENT_ICON},
    use_projection_simulator:{title:"Simulation prudente",description:"Utiliser le simulateur de projection.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    view_time_estimate:{title:"Temps anticipe",description:"Consulter une estimation de temps restant.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    start_chrono:{title:"Chrono lance",description:"Demarrer le chronometre.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    chrono_mark:{title:"Run marque",description:"Marquer un run avec le chronometre.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    start_session:{title:"Session complete",description:"Utiliser la session et le chrono pendant un farm.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    edit_average_time:{title:"Temps personnalise",description:"Modifier un temps moyen de donjon.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_dofus_detection:{title:"Detection decouverte",description:"Ouvrir la section Detection Dofus.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    configure_dofus_detection:{title:"Reference preparee",description:"Configurer une reference de detection Dofus.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    test_dofus_detection:{title:"Test de detection",description:"Tester la detection Dofus.",category:"OUTILS",icon:DEFAULT_ACHIEVEMENT_ICON},
    archive_1:{title:"Archive creee",description:"Archiver un familier termine.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    view_archive:{title:"Souvenir consulte",description:"Consulter une archive de familier termine.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    archive_3:{title:"Galerie naissante",description:"Archiver 3 familiers termines.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    archive_10:{title:"Grande galerie",description:"Archiver 10 familiers termines.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    restart_after_completion:{title:"Nouvelle aventure",description:"Repartir sur un nouveau profil apres une completion.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    view_event_collection:{title:"Collection consultee",description:"Ouvrir la collection d'evenements.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    replay_gallery_event:{title:"Souvenir rejoue",description:"Rejouer un evenement decouvert depuis la galerie.",category:"GALERIE",icon:DEFAULT_ACHIEVEMENT_ICON},
    create_account:{title:"Compte cree",description:"Creer un compte Familier Tracker.",category:"SOCIAL",icon:DEFAULT_ACHIEVEMENT_ICON},
    open_user_profile:{title:"Profil consulte",description:"Ouvrir votre profil utilisateur.",category:"SOCIAL",icon:DEFAULT_ACHIEVEMENT_ICON},
    search_member:{title:"Recherche sociale",description:"Rechercher un membre.",category:"SOCIAL",icon:DEFAULT_ACHIEVEMENT_ICON},
    private_message:{title:"Message envoye",description:"Envoyer un message prive.",category:"SOCIAL",icon:DEFAULT_ACHIEVEMENT_ICON},
    global_chat_message:{title:"Discussion lancee",description:"Envoyer un message dans le chat global.",category:"SOCIAL",icon:DEFAULT_ACHIEVEMENT_ICON},
    active_2_days:{title:"Retour rapide",description:"Utiliser le tracker sur 2 jours differents.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    active_7_days:{title:"Habitude prise",description:"Utiliser le tracker sur 7 jours differents.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    active_30_days:{title:"Compagnon durable",description:"Utiliser le tracker sur 30 jours differents.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    daily_runs_10:{title:"Bonne seance",description:"Valider 10 donjons sur une journee.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    daily_runs_25:{title:"Grosse seance",description:"Valider 25 donjons sur une journee.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    daily_runs_50:{title:"Journee acharnee",description:"Valider 50 donjons sur une journee.",category:"REGULARITE",icon:DEFAULT_ACHIEVEMENT_ICON},
    tracker_absolute:{title:"Tracker accompli",description:"Debloquer tous les succes principaux du compte.",category:"FINAL",icon:FINAL_ACHIEVEMENT_ICON},
    master_secrets:{title:"Maitre des secrets",description:"Decouvrir tous les secrets et easter eggs du tracker.",category:"FINAL",icon:FINAL_ACHIEVEMENT_ICON},
    true_100:{title:"Le vrai 100%",description:"Debloquer Tracker accompli et Maitre des secrets.",category:"FINAL",icon:FINAL_ACHIEVEMENT_ICON},
    egg_charlie:{title:"Charlie trouve",description:"Activer l'easter egg Charlie.",category:"EASTER EGGS",optional:true},
    egg_toom:{title:"Retour de la NRG 500",description:"Activer l'easter egg Toom.",category:"EASTER EGGS",optional:true},
    egg_aina:{title:"Le drop impossible",description:"Activer l'easter egg Aina.",category:"EASTER EGGS",optional:true},
    egg_raj:{title:"Bot detecte",description:"Activer l'easter egg Raj.",category:"EASTER EGGS",optional:true},
    egg_brako:{title:"Chasseur de Minotot",description:"Activer l'easter egg Brako.",category:"EASTER EGGS",optional:true},
    egg_alhass:{title:"Observe par Alhass",description:"Activer l'easter egg Alhass.",category:"EASTER EGGS",optional:true},
    egg_capy:{title:"Capybara detecte",description:"Activer l'easter egg Capy.",category:"EASTER EGGS",optional:true},
    egg_dimeh:{title:"Construire des trottoirs",description:"Activer l'easter egg Dimeh.",category:"EASTER EGGS",optional:true},
    secret_brako_drop:{title:"Le destin a choisi Brako",description:"Obtenir le Dofus Pourpre dans l'easter egg Brako.",category:"SECRETS",optional:true},
    secret_brako_no_drop:{title:"Eh... pas d'oeuf",description:"Finir le combat Brako sans drop Pourpre.",category:"SECRETS",optional:true},
    secret_egg_war:{title:"Guerre des easter eggs",description:"Voir Brako interrompre Raj.",category:"SECRETS",optional:true},
    secret_raj_ban:{title:"Bannissement definitif",description:"Voir Happios bannir Raj.",category:"SECRETS",optional:true},
    secret_happios_hover:{title:"Le vrai boss",description:"Survoler Happios plusieurs fois.",category:"SECRETS",optional:true}
  };
  const MAIN_ACHIEVEMENT_CATEGORIES=["PREMIERS PAS","PROGRESSION","DONJONS","VARIETE","MONSTRES","OUTILS","GALERIE","SOCIAL","REGULARITE"];

  function clone(value){return JSON.parse(JSON.stringify(value))}

  function defaultKeybinds(){
    return {
      addRun:"+",
      removeRun:"-",
      switchDungeon:"Tab",
      chronoToggle:"S",
      chronoReset:"R",
      openHistory:"H",
      openOptions:"O",
      openProjection:"P",
      openMonsters:"B",
      openGallery:"",
      toggleSound:"Ctrl+M",
      toggleNight:"Ctrl+D",
      openHelp:"F1"
    };
  }

  function defaultData(){
    return {
      runs:{morose:0,tynril:0},
      mobs:{morose:{},tynril:{},zone:{}},
      settings:{
        night:false,animations:true,tooltips:true,notifications:true,sound:true,autoMarkOnPlus:false,chronoAutoStartOnRun:false,hudMode:false,
        visualIntensity:"standard",uiOpacity:"medium",dashboardMode:"tryhard",
        chronoStyle:"technical",showMilliseconds:false,autoDungeonEstimate:false,notificationSize:"normal",notificationDuration:3200,
        notificationsPersistent:false,disableMinorNotifications:false,highContrast:false,reducedSaturation:false,largeFont:false,
        shortcutsEnabled:true,livingEvents:true,passiveAmbience:true,helpAutoDisabled:false,adminAutoCloseAfterAction:false,adminQuickReopenSeconds:45,keybinds:defaultKeybinds()
      },
      stats:{avgMorose:125,avgTynril:600,milestones:{},days:{}},
      chrono:{seconds:0,running:false,startedAt:null,lastMarkSeconds:0,marks:[]},
      session:{active:false,startedAt:null,sessionStartedAt:null,totalSeconds:0,runs:{morose:0,tynril:0},ppStart:0,ppGain:0,lastSummary:null},
      ui:{farm:"morose",tab:"morose",monsterSort:"total",monsterView:"comfortable",monsterSearch:"",monsterFavs:[],activityDensity:"compact",collapsedActivityDays:[],capyMode:false,helpSeen:false},
      hud:{windows:{},z:10050},
      achievements:{unlocked:{},secretCategoriesUnlocked:false,eggCollected:false,counters:{happiosHover:0}},
      gallery:{completedPykurs:[],eventsDiscovered:{},currentCycleArchived:false,currentCycleCompletionSeen:false},
      dofusDetection:{enabled:false,cooldownSeconds:45,scanIntervalMs:1000,status:"Inactif",refs:{morose:{imageKey:null,zone:null,threshold:82},tynril:{imageKey:null,zone:null,threshold:82}}},
      createdAt:new Date().toISOString(),
      activity:[],
      undo:[]
    };
  }

  function makeStore(){
    const id=`p_${Date.now()}`;
    return {
      active:id,
      galleryShared:true,
      sharedGallery:defaultData().gallery,
      optionsShared:false,
      sharedSettings:defaultData().settings,
      achievementsShared:true,
      achievementAccountMode:1,
      sharedAchievements:defaultData().achievements,
      profiles:{[id]:{name:"Pykur principal",data:defaultData()}}
    };
  }

  function formatChrono(sec){
    sec=Math.max(0,Math.floor(sec||0));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }

  function formatDuration(sec){
    sec=Math.max(0,Math.round(sec||0));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    if(h>0)return `${h}h ${String(m).padStart(2,"0")}min`;
    if(m>0)return `${m}min ${String(s).padStart(2,"0")}s`;
    return `${s}s`;
  }

  function totalMobs(data){
    const totals={};
    Object.keys(mobs).forEach(id=>{
      totals[id]=(data.mobs?.morose?.[id]||0)+(data.mobs?.tynril?.[id]||0)+(data.mobs?.zone?.[id]||0);
    });
    return totals;
  }

  function ppFrom(source){
    let pp=0;
    Object.keys(mobs).forEach(id=>pp+=Math.floor((source[id]||0)/mobs[id].ppNeed));
    return Math.min(pp,PP_MAX);
  }

  function currentPP(data){return ppFrom(totalMobs(data))}

  function defaultAchievements(){return clone(defaultData().achievements)}

  window.PykurCore={STORE_KEY,PP_MAX,RUN_LIMITS,mobs,gains,ACHIEVEMENTS,ACHIEVEMENT_CATEGORIES,MAIN_ACHIEVEMENT_CATEGORIES,clone,defaultKeybinds,defaultData,defaultAchievements,makeStore,formatChrono,formatDuration,totalMobs,ppFrom,currentPP};
})();
