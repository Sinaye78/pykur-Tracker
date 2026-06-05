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
    "PROGRESSION PYKUR",
    "DONJONS",
    "TRACKER & UTILISATION",
    "FINAL",
    "EASTER EGGS",
    "SECRETS"
  ];
  const ACHIEVEMENTS={
    first_pp:{title:"Premiers fragments",description:"Obtenir 1 PP.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/premiersfragments.jpg"},
    growth:{title:"Croissance",description:"Atteindre 30 PP.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/croissance.jpg"},
    half_awaken:{title:"Mi-éveil",description:"Atteindre la moitié, 50 % de la progression du Pykur.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/mieveil.png"},
    mutation:{title:"Mutation",description:"Atteindre 60 PP.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/mutation.jpg"},
    full_awaken:{title:"Éveil complet",description:"Atteindre 90 PP.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/eveilcomplet.jpg"},
    reset_pykur:{title:"Recommencer encore",description:"Reset un Pykur.",category:"PROGRESSION PYKUR",icon:"./assets/images/succes/PROGRESSION PYKUR/recommencerencore.jpg"},
    first_morose:{title:"Premiers pas dans Morose",description:"Faire un Morose.",category:"DONJONS",icon:"./assets/images/succes/DONJONS/premierpasdansmorose.jpg"},
    first_tynril:{title:"Première jungle",description:"Faire un Tynril.",category:"DONJONS",icon:"./assets/images/succes/DONJONS/premierejungle.jpg"},
    halfway_dungeons:{title:"À mi-chemin",description:"Effectuer 320 donjons Morose ou 24 Tynril.",category:"DONJONS",icon:"./assets/images/succes/DONJONS/amichemain.jpg"},
    session_10:{title:"Routine installée",description:"Faire 10 runs dans une session.",category:"DONJONS",icon:"./assets/images/succes/DONJONS/routineinstallee.jpg"},
    session_25:{title:"Routine confirmée",description:"Faire 25 runs dans une session.",category:"DONJONS",icon:"./assets/images/succes/DONJONS/routineconfirme.jpg"},
    open_options:{title:"Curieux",description:"Ouvrir les options.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/curieux.jpg"},
    start_chrono:{title:"Le chrono tourne",description:"Lancer le chronomètre pour la première fois.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/chrono.png"},
    start_session:{title:"La session commence",description:"Démarrer une session de farm.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/session.png"},
    open_stats:{title:"Sous surveillance",description:"Ouvrir les statistiques pour la première fois.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/stats.png"},
    open_projection:{title:"Visionnaire",description:"Ouvrir les projections.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/visionnaire.jpg"},
    open_history:{title:"Archiviste",description:"Ouvrir l’historique.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/archiviste.jpg"},
    open_monsters:{title:"Bestiaire ouvert",description:"Ouvrir l’interface monstres.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/bestiaireouvert.jpg"},
    manual_adjustments:{title:"Ajustements manuels",description:"Modifier manuellement le nombre de donjons Morose ou de Tynril.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/ajustement.png"},
    edit_shortcuts:{title:"Contrôle total",description:"Modifier les raccourcis clavier.",category:"TRACKER & UTILISATION",icon:"./assets/images/succes/TRACKER & UTILISATION/controletotal.jpg"},
    tracker_absolute:{title:"Tracker absolu",description:"Débloquer tous les succès principaux.",category:"FINAL",icon:"./assets/images/succes/FINAL/trackerabsolu.jpg"},
    master_secrets:{title:"Maître des secrets",description:"Découvrir tous les secrets et easter eggs du tracker.",category:"FINAL",icon:"./assets/images/succes/FINAL/trackerabsolu.jpg"},
    true_100:{title:"Le vrai 100%",description:"Débloquer Tracker absolu et Maître des secrets.",category:"FINAL",icon:"./assets/images/succes/FINAL/trackerabsolu.jpg"},
    egg_charlie:{title:"Charlie trouvé",description:"Activer l’easter egg Charlie.",category:"EASTER EGGS",optional:true},
    egg_toom:{title:"Retour de la NRG 500",description:"Activer l’easter egg Toom.",category:"EASTER EGGS",optional:true},
    egg_aina:{title:"Le drop impossible",description:"Activer l’easter egg Aina.",category:"EASTER EGGS",optional:true},
    egg_raj:{title:"Bot détecté",description:"Activer l’easter egg Raj.",category:"EASTER EGGS",optional:true},
    egg_brako:{title:"Chasseur de Minotot",description:"Activer l’easter egg Brako.",category:"EASTER EGGS",optional:true},
    egg_alhass:{title:"Observé par Alhass",description:"Activer l’easter egg Alhass.",category:"EASTER EGGS",optional:true},
    egg_capy:{title:"Capybara détecté",description:"Activer l’easter egg Capy.",category:"EASTER EGGS",optional:true},
    egg_dimeh:{title:"Construire des trottoirs",description:"Activer l’easter egg Dimeh.",category:"EASTER EGGS",optional:true},
    secret_brako_drop:{title:"Le destin a choisi Brako",description:"Obtenir le Dofus Pourpre dans l’easter egg Brako.",category:"SECRETS",optional:true},
    secret_brako_no_drop:{title:"Eh… pas d’œuf",description:"Finir le combat Brako sans drop Pourpre.",category:"SECRETS",optional:true},
    secret_egg_war:{title:"Guerre des easter eggs",description:"Voir Brako interrompre Raj.",category:"SECRETS",optional:true},
    secret_raj_ban:{title:"Bannissement définitif",description:"Voir Happios bannir Raj.",category:"SECRETS",optional:true},
    secret_happios_hover:{title:"Le vrai boss",description:"Survoler Happios plusieurs fois.",category:"SECRETS",optional:true}
  };
  const MAIN_ACHIEVEMENT_CATEGORIES=["PROGRESSION PYKUR","DONJONS","TRACKER & UTILISATION"];

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
      achievementsShared:false,
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
