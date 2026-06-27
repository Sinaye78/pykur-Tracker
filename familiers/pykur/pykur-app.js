const {
  PP_MAX,
  ABRA_OBJECTIVE_MAX,
  DRAGOUNE_OBJECTIVE_MAX,
  TOFOUDRE_OBJECTIVE_MAX,
  CROUM_OBJECTIVE_MAX,
  VITALITY_OBJECTIVE_MAX,
  GLOUTON_OBJECTIVE_MAX,
  PYKUR_RUN_LIMITS,
  ABRA_RUN_LIMITS,
  DRAGOUNE_RUN_LIMITS,
  TOFOUDRE_RUN_LIMITS,
  CROUM_RUN_LIMITS,
  BOULOUTE_RUN_LIMITS,
  VAMPYRETTE_RUN_LIMITS,
  GELUTIN_RUN_LIMITS,
  TIFOUX_RUN_LIMITS,
  MARCASSIN_RUN_LIMITS,
  GLOUTON_RUN_LIMITS,
  TIWABBIT_RUN_LIMITS,
  FAMILIARS
}=window.PYKUR_FAMILIAR_DATA;
function normalizeFamiliarId(id){
  return FAMILIARS[id] ? id : "pykur";
}
function activeFamiliarId(){
  return normalizeFamiliarId(data?.familiarId);
}
function activeFamiliar(){
  return FAMILIARS[activeFamiliarId()] || FAMILIARS.pykur;
}
function activeProgressMax(){
  return activeFamiliar().objectiveMax || PP_MAX;
}
function activeProgressShort(){
  return activeFamiliar().progressShort || "PP";
}
function activeFarmKeys(){
  return activeFamiliar().dungeons.map(entry=>entry.key);
}
function familiarFarmLabel(farm,format="short"){
  const familiar=activeFamiliar();
  const item=familiar.dungeons.find(entry=>entry.key===farm);
  if(item)return format==="full" ? item.fullLabel : item.label;
  return farm==="morose" ? (format==="full"?"Donjon Morose":"Morose") : farm==="tynril" ? (format==="full"?"Donjon Tynril":"Tynril") : farm;
}
function farmDomId(farm){
  return String(farm||"").replace(/[^a-zA-Z0-9]+/g," ").trim().replace(/(^|\s)([a-zA-Z0-9])/g,(_,space,letter)=>letter.toUpperCase());
}
function farmAverageKey(farm){
  return farm==="morose" ? "avgMorose" : farm==="tynril" ? "avgTynril" : "avg"+farmDomId(farm);
}
function farmDefaultAverage(farm){
  for(const familiar of Object.values(FAMILIARS)){
    const dungeon=familiar.dungeons.find(entry=>entry.key===farm);
    if(dungeon?.defaultAverage)return dungeon.defaultAverage;
  }
  return 120;
}
function formatProgressValue(value=currentPP()){
  const rounded=Number.isInteger(value) ? value : Math.round(value*10)/10;
  return `${rounded}`;
}
function formatProgressGain(value){
  if(value===null || value===undefined)return "Indisponible";
  return `+${formatProgressValue(value)} ${activeProgressShort()}`;
}
function isPykurProfile(){
  return activeFamiliarId()==="pykur";
}
const ACHIEVEMENTS=window.PykurCore.ACHIEVEMENTS;
const ACHIEVEMENT_CATEGORIES=window.PykurCore.ACHIEVEMENT_CATEGORIES;
const MAIN_ACHIEVEMENT_CATEGORIES=window.PykurCore.MAIN_ACHIEVEMENT_CATEGORIES;
const defaultKeybinds=()=>({
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
  toggleDofusDetection:"",
  openHelp:"F1"
});

const SHORTCUT_ACTIONS=[
  {id:"addRun",label:"Ajouter une run",description:"Ajoute une run au donjon actif.",target:"#plus"},
  {id:"removeRun",label:"Retirer une run",description:"Retire une run du donjon actif pour corriger une erreur.",target:"#minus"},
  {id:"switchDungeon",label:"Changer Morose/Tynril",description:"Bascule le donjon actif entre Morose et Tynril.",target:".farm-toggle"},
  {id:"chronoToggle",label:"Start/Pause chrono",description:"Lance le chrono ou le met en pause.",target:"#chronoStart,#chronoPause"},
  {id:"chronoReset",label:"Reset chrono",description:"Remet le chrono a zero.",target:"#chronoReset"},
  {id:"openHistory",label:"Ouvrir historique",description:"Ouvre la timeline des actions.",target:"#activityButton"},
  {id:"openOptions",label:"Ouvrir options",description:"Ouvre le centre de reglages.",target:"#optionsButton"},
  {id:"openProjection",label:"Ouvrir projections",description:"Ouvre les estimations de progression.",target:"#projectionButton"},
  {id:"openMonsters",label:"Ouvrir bestiaire",description:"Ouvre le suivi des monstres.",target:"#monsterLauncher"},
  {id:"openGallery",label:"Ouvrir la galerie",description:"Ouvre la mémoire des familiers terminés et des événements découverts.",target:"#galleryButton"},
  {id:"toggleSound",label:"Activer/desactiver son",description:"Coupe ou reactive tous les sons.",target:"#soundToggle,#toggleSound"},
  {id:"toggleNight",label:"Mode nuit",description:"Active ou desactive le mode nuit.",target:"#toggleNight"},
  {id:"toggleDofusDetection",label:"Détection Dofus",description:"Active ou désactive la détection automatique Dofus.",target:"#editDofusShortcut"},
  {id:"openHelp",label:"Aide",description:"Ouvre le guide complet.",target:"#helpButton"}
];
const {
  PYKUR_MOBS,
  ABRA_MOBS,
  DRAGOUNE_MOBS,
  TOFOUDRE_MOBS,
  CROUM_MOBS,
  BOULOUTE_MOBS,
  VAMPYRETTE_MOBS,
  GELUTIN_MOBS,
  PYKUR_GAINS,
  ABRA_GAINS,
  DRAGOUNE_GAINS,
  TOFOUDRE_GAINS,
  CROUM_GAINS,
  BOULOUTE_GAINS,
  VAMPYRETTE_GAINS,
  GELUTIN_BLOP_BOSS_GAINS,
  GELUTIN_GAINS,
  ABRA_SPECIAL_GAINS,
  PYKUR_ZONE_IDS,
  ABRA_ZONE_IDS,
  DRAGOUNE_ZONE_IDS,
  TOFOUDRE_ZONE_IDS,
  CROUM_ZONE_IDS,
  BOULOUTE_ZONE_IDS,
  VAMPYRETTE_ZONE_IDS,
  GELUTIN_ZONE_IDS,
  FAMILIAR_RUNTIME
}=window.PYKUR_FAMILIAR_DATA;
let RUN_LIMITS=PYKUR_RUN_LIMITS;
let mobs=PYKUR_MOBS;
let gains=PYKUR_GAINS;
let zoneIds=PYKUR_ZONE_IDS;

function familiarRuntime(familiarId=activeFamiliarId()){
  return FAMILIAR_RUNTIME[normalizeFamiliarId(familiarId)] || FAMILIAR_RUNTIME.pykur;
}

function refreshFamiliarRuntime(){
  const runtime=familiarRuntime();
  RUN_LIMITS=runtime.runLimits;
  mobs=runtime.mobs;
  gains=runtime.gains;
  zoneIds=runtime.zoneIds;
}

function gelutinSelectedBoss(){
  const boss=data?.special?.blopBoss;
  return GELUTIN_BLOP_BOSS_GAINS[boss] ? boss : "blopCocoRoyal";
}

function gelutinBlopBossOptions(){
  return [
    ["blopCocoRoyal","Blop Coco Royal"],
    ["blopGriotteRoyal","Blop Griotte Royal"],
    ["blopIndigoRoyal","Blop Indigo Royal"],
    ["blopReinetteRoyal","Blop Reinette Royal"]
  ];
}

function effectiveFarmGains(farm){
  const base=clone(gains[farm]||{});
  if(activeFamiliarId()==="gelutin" && (farm==="donjonBlops" || farm==="antreBlopMulticolore")){
    Object.entries(GELUTIN_BLOP_BOSS_GAINS[gelutinSelectedBoss()]||{}).forEach(([id,count])=>{
      base[id]=(base[id]||0)+count;
    });
  }
  return base;
}

const defaultData=()=>({
  familiarId:"pykur",
  runs:{morose:0,tynril:0},
  mobs:{morose:{},tynril:{},zone:{}},
  settings:{
    night:false,animations:true,tooltips:true,notifications:true,sound:true,soundVolume:100,autoMarkOnPlus:false,chronoAutoStartOnRun:false,hudMode:false,
    visualIntensity:"standard",uiOpacity:"medium",dashboardMode:"tryhard",performanceMode:"auto",
    chronoStyle:"technical",showMilliseconds:false,autoDungeonEstimate:false,notificationSize:"normal",notificationDuration:3200,
    notificationsPersistent:false,disableMinorNotifications:false,highContrast:false,reducedSaturation:false,largeFont:false,
    shortcutsEnabled:true,livingEvents:true,passiveAmbience:true,helpAutoDisabled:false,adminAutoCloseAfterAction:false,adminQuickReopenSeconds:45,keybinds:defaultKeybinds()
  },
  stats:{avgMorose:125,avgTynril:600,milestones:{},days:{}},
  chrono:{seconds:0,running:false,startedAt:null,lastMarkSeconds:0,marks:[]},
  session:{active:false,startedAt:null,sessionStartedAt:null,totalSeconds:0,runs:{morose:0,tynril:0},ppStart:0,ppGain:0,lastSummary:null},
  ui:{farm:"morose",tab:"morose",monsterSort:"total",monsterView:"comfortable",monsterSearch:"",monsterFavs:[],activityDensity:"compact",collapsedActivityDays:[],capyMode:false,helpSeen:false},
  hud:{windows:{},z:10050},
  achievements:{unlocked:{},removedUnlocked:{},secretCategoriesUnlocked:false,eggCollected:false,counters:{happiosHover:0}},
  gallery:{completedPykurs:[],eventsDiscovered:{},removedPykurs:{},removedEvents:{},currentCycleArchived:false,currentCycleCompletionSeen:false},
  dofusDetection:{enabled:false,cooldownSeconds:10,scanIntervalMs:1000,status:"Inactif",refs:{morose:{imageKey:null,zone:null,threshold:82},tynril:{imageKey:null,zone:null,threshold:82}}},
  createdAt:new Date().toISOString(),
  activity:[],
  undo:[]
});

function defaultDataForFamiliar(familiarId="pykur"){
  const next=defaultData();
  const normalized=normalizeFamiliarId(familiarId);
  const familiar=FAMILIARS[normalized]||FAMILIARS.pykur;
  next.familiarId=normalized;
  next.runs={};
  next.mobs={zone:{}};
  next.session.runs={};
  next.dofusDetection.refs={};
  familiar.dungeons.forEach(dungeon=>{
    next.runs[dungeon.key]=0;
    next.mobs[dungeon.key]={};
    next.session.runs[dungeon.key]=0;
    next.stats[farmAverageKey(dungeon.key)]=farmDefaultAverage(dungeon.key);
    next.dofusDetection.refs[dungeon.key]={imageKey:null,zone:null,threshold:82};
  });
  next.ui.farm=familiar.dungeons[0]?.key||"morose";
  next.ui.tab=next.ui.farm;
  if(familiar.specialDefaults)next.special=clone(familiar.specialDefaults);
  return next;
}

let store=null;
let activeProfile=null;
let data=defaultData();
let chronoTimer=null;
let charlieBuffer="";
let charlieEnabled=false;
let charlieMoveHandler=null;
let secretBuffer="";
let alhassEnabled=false;
let alhassLastReaction=0;
let toomEnabled=false;
let ainaEnabled=false;
let ainaLastClick=0;
let editingKeybind=null;
const CAPY_IMAGE_SRC="./assets/images/capy.png";
const PYKUR_IMAGE_SRC="./assets/images/pykur.png";
const AURAPYKUR_IMAGE_SRC="./assets/images/aurapykur.png";
function assetPath(src){
  if(!src || typeof src!=="string")return src;
  if(/^(data:|blob:|https?:\/\/)/i.test(src))return src;
  return src
    .replace(/^\.?\/?images\//,"./assets/images/")
    .replace(/^\.?\/?sons\//,"./assets/sons/")
    .replace(/^\.?\/?ambiance\//,"./assets/ambiance/")
    .replace(/^\.?\/?tuto\//,"./assets/tuto/");
}
const AUTH_API_BASE=localStorage.getItem("pykur_api_base")||(location.hostname==="127.0.0.1"||location.hostname==="localhost"?"http://127.0.0.1:3000/api":"/api");
const AUTH_TOKEN_KEY="pykur_auth_token";
const BROWSER_ID_KEY="familier_tracker_browser_id";
let authMode="login";
let authState={token:localStorage.getItem(AUTH_TOKEN_KEY)||"",user:null,apiOnline:null,refreshTimer:null,lastSnapshotAt:0,snapshotRefreshing:false};
const socialState={friends:0,incoming:0,outgoing:0,loaded:false,seenIncoming:[]};
const messageState={activePseudo:null,conversations:[],unread:0,timer:null,lastNotifiedId:Math.max(0,parseInt(localStorage.getItem("pykur_messages_notified_id"),10)||0),threadRequest:0};
const chatState={messages:[],online:[],ignored:[],settings:{locked:0,slowModeSeconds:0},lastPingSeenAt:localStorage.getItem("pykur_chat_ping_seen_at")||"",mentionUnread:Math.max(0,parseInt(localStorage.getItem("pykur_chat_mention_unread"),10)||0),timer:null,pingTimer:null,hideShares:false,hideText:false,refreshing:false};

function performanceModeActive(){
  const mode=data?.settings?.performanceMode||"auto";
  if(mode==="on")return true;
  if(mode==="off")return false;
  const memory=Number(navigator.deviceMemory)||8;
  const cores=Number(navigator.hardwareConcurrency)||8;
  return !!navigator.connection?.saveData || memory<=4 || cores<=4 || window.innerWidth<=760 || window.matchMedia("(pointer: coarse)").matches;
}

function performancePollingDelay(normal,light){
  return performanceModeActive()?light:normal;
}

function hydrateDeferredImages(root){
  if(!root)return;
  root.querySelectorAll("img[data-src]").forEach(img=>{
    img.src=img.dataset.src;
    delete img.dataset.src;
  });
}
messageState.refreshing=false;
function socialNotificationKey(name){
  const pseudo=String(authState.user?.pseudo||"guest").trim().toLowerCase().replace(/[^a-z0-9_-]+/g,"_");
  return `${name}_${pseudo}`;
}
function loadSocialNotificationState(){
  messageState.lastNotifiedId=Math.max(0,parseInt(localStorage.getItem(socialNotificationKey("pykur_messages_notified_id")),10)||0);
  chatState.lastPingSeenAt=localStorage.getItem(socialNotificationKey("pykur_chat_ping_seen_at"))||"";
  chatState.mentionUnread=Math.max(0,parseInt(localStorage.getItem(socialNotificationKey("pykur_chat_mention_unread")),10)||0);
  try{
    const stored=JSON.parse(localStorage.getItem(socialNotificationKey("pykur_friend_requests_seen"))||"[]");
    socialState.seenIncoming=Array.isArray(stored)?stored:[];
  }catch{
    socialState.seenIncoming=[];
  }
}
const cloudState={timer:null,retryTimer:null,retryAttempt:0,syncing:false,pending:false,lastSyncAt:null,error:null,loading:false};
let accountProfileSection="account";
let accountWarnings=[];
let lastWarningSeenAt=localStorage.getItem("pykur_warning_seen_at")||"";
let moderationOverviewSection="dashboard";
let moderationLogFilter="";
let moderationReportFilter="open";
let moderationReportType="all";
let moderationReportSearch="";
let moderationPermissions=[];
let moderationStaffPermissions=[];

function canModeration(permission){
  return moderationPermissions.includes(permission);
}
let moderationAccountFilter="all";
let moderationAccountSearch="";
let passwordResetToken="";
const apiRequestsInFlight=new Map();

class ApiRequestError extends Error{
  constructor(message,details={}){
    super(message);
    this.name="ApiRequestError";
    Object.assign(this,details);
  }
}

function apiFriendlyMessage(status,body={}){
  if(body?.error && body.error!=="Erreur API.")return body.error;
  if(status===401)return "Votre session a expiré. Reconnectez-vous.";
  if(status===403)return "Vous n’avez pas l’autorisation d’effectuer cette action.";
  if(status===404)return "La ressource demandée est introuvable.";
  if(status===429)return "Le serveur reçoit trop de demandes. Réessayez dans quelques secondes.";
  if(status>=500)return "Le serveur rencontre un problème temporaire. Réessayez dans quelques instants.";
  return "La demande n’a pas pu être traitée.";
}

function isTransientApiError(error){
  return !!error && (error.network===true || error.timeout===true || [0,408,425,429,502,503,504].includes(Number(error.status||0)));
}

function apiDelay(ms){
  return new Promise(resolve=>setTimeout(resolve,ms));
}

function browserSecurityId(){
  let value=localStorage.getItem(BROWSER_ID_KEY)||"";
  if(!/^[a-zA-Z0-9._:-]{12,120}$/.test(value)){
    value=globalThis.crypto?.randomUUID?.()||`browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(BROWSER_ID_KEY,value);
  }
  return value;
}

async function authFetch(path,options={}){
  const method=String(options.method||"GET").toUpperCase();
  const requestKey=method==="GET" ? `${method}:${path}` : "";
  if(requestKey && apiRequestsInFlight.has(requestKey))return apiRequestsInFlight.get(requestKey);
  const request=(async()=>{
    const maxAttempts=method==="GET" ? 2 : 1;
    let lastError=null;
    for(let attempt=1;attempt<=maxAttempts;attempt++){
      const controller=new AbortController();
      const timeoutId=setTimeout(()=>controller.abort(),12000);
      const requestId=globalThis.crypto?.randomUUID?.()||`web-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const headers=Object.assign({"Content-Type":"application/json","X-Request-Id":requestId},options.headers||{});
      headers["X-Browser-Id"]=browserSecurityId();
      if(authState.token)headers.Authorization=`Bearer ${authState.token}`;
      try{
        const response=await fetch(AUTH_API_BASE+path,{...options,method,headers,signal:controller.signal});
        const body=await response.json().catch(()=>({}));
        if(!response.ok){
          const error=new ApiRequestError(apiFriendlyMessage(response.status,body),{
            status:response.status,
            code:body.code||"API_ERROR",
            requestId:body.requestId||response.headers.get("X-Request-Id")||requestId,
            path
          });
          if(attempt<maxAttempts && isTransientApiError(error)){
            lastError=error;
            await apiDelay(350+Math.floor(Math.random()*250));
            continue;
          }
          throw error;
        }
        authState.apiOnline=true;
        return body;
      }catch(error){
        const normalized=error instanceof ApiRequestError ? error : new ApiRequestError(
          error?.name==="AbortError" ? "Le serveur met trop de temps à répondre." : "Connexion au serveur momentanément indisponible.",
          {status:0,code:error?.name==="AbortError"?"TIMEOUT":"NETWORK_ERROR",requestId,path,timeout:error?.name==="AbortError",network:error?.name!=="AbortError"}
        );
        if(isTransientApiError(normalized) || Number(normalized.status||0)>=500)authState.apiOnline=false;
        if(attempt<maxAttempts && isTransientApiError(normalized)){
          lastError=normalized;
          await apiDelay(350+Math.floor(Math.random()*250));
          continue;
        }
        throw normalized;
      }finally{
        clearTimeout(timeoutId);
      }
    }
    throw lastError||new ApiRequestError("Connexion au serveur momentanément indisponible.",{status:0,network:true,path});
  })();
  if(requestKey)apiRequestsInFlight.set(requestKey,request);
  try{
    return await request;
  }finally{
    if(requestKey && apiRequestsInFlight.get(requestKey)===request)apiRequestsInFlight.delete(requestKey);
  }
}

function authRoleLabel(role){
  return role==="admin"?"Admin":role==="moderator"?"Modérateur":"Utilisateur";
}

function socialAssetButton({id,asset,title,description,className="",badge="",attributes=""}){
  return `<button class="btn social-image-button tooltip ${className}" id="${id}" type="button" aria-label="${escapeHtml(title)}" data-tooltip-title="${escapeHtml(title)}" data-tooltip="${escapeHtml(description)}" ${attributes}><img src="assets/bouton/${asset}" alt="" aria-hidden="true">${badge}</button>`;
}

function socialActionButton({asset,title,description,className="btn-blue",attributes=""}){
  return `<button class="btn ${className} social-action-button tooltip" type="button" aria-label="${escapeHtml(title)}" data-tooltip-title="${escapeHtml(title)}" data-tooltip="${escapeHtml(description)}" ${attributes}><img src="assets/bouton/${asset}" alt="" aria-hidden="true"></button>`;
}

const ACCOUNT_PRIVACY_OPTIONS=[
  {group:"Visibilité",key:"publicProfile",label:"Profil public",description:"Autoriser l'affichage d'une page profil communautaire."},
  {group:"Visibilité",key:"showSecondaryProfiles",label:"Afficher mes profils secondaires",description:"Permet aux autres membres de consulter vos autres profils familiers."},
  {group:"Visibilité",key:"hidePykurProfileNames",label:"Masquer les noms de profils familiers",description:"Remplace les noms de profils par des intitulés neutres dans les vues publiques."},
  {group:"Visibilité",key:"hideDetailedStats",label:"Masquer les statistiques détaillées",description:"Affiche seulement les grandes lignes de progression."},
  {group:"Visibilité",key:"hideGallery",label:"Masquer la galerie publique",description:"Ne partage pas vos anciens familiers sur le profil public."},
  {group:"Succès",key:"hideSecretAchievements",label:"Masquer les succès secrets",description:"Évite de révéler les succès et easter eggs cachés."},
  {group:"Succès",key:"hideNormalAchievements",label:"Masquer les succès normaux",description:"Cache aussi les succès classiques sur le profil public."},
  {group:"Partages automatiques",key:"shareAchievements",label:"Partager mes succès dans le chat",description:"Annonce automatiquement les succès débloqués dans la chatbox."},
  {group:"Partages automatiques",key:"shareGalleryMoments",label:"Partager mes familiers terminés",description:"Annonce automatiquement les familiers archivés dans la chatbox."},
  {group:"Messagerie",key:"allowPrivateMessages",label:"Autoriser les messages privés",description:"Permet aux amis de vous envoyer des messages privés."}
];

function accountPreferences(){
  return Object.assign({
    publicProfile:false,
    showSecondaryProfiles:false,
    hidePykurProfileNames:true,
    hideDetailedStats:false,
    hideGallery:false,
    hideSecretAchievements:true,
    showOnlyMainProfile:true,
    allowPrivateMessages:true
  },authState.user?.preferences||{});
}

function authSetError(message=""){
  const box=$("#authError");
  if(!box)return;
  box.textContent=message;
  box.classList.toggle("show",!!message);
}

function authSetMode(mode){
  authMode=mode==="register"?"register":"login";
  $("#authLoginTab")?.classList.toggle("active",authMode==="login");
  $("#authRegisterTab")?.classList.toggle("active",authMode==="register");
  const isRegister=authMode==="register";
  $("#authTitle").textContent=isRegister?"Inscription":"Connexion";
  $("#authSubtitle").textContent=isRegister?"Créez votre compte Pykur Tracker avec un pseudo public.":"Connectez votre compte Pykur Tracker.";
  $("#authSubmit").textContent=isRegister?"Créer le compte":"Se connecter";
  $("#authPseudoField").style.display=isRegister?"grid":"none";
  $("#authEmailField").style.display=isRegister?"grid":"none";
  $("#authIdentifier").closest(".auth-field").style.display=isRegister?"none":"grid";
  $("#authPassword").autocomplete=isRegister?"new-password":"current-password";
  if($("#forgotPasswordButton"))$("#forgotPasswordButton").style.display=isRegister?"none":"block";
  authSetError("");
}

function authRender(){
  const box=$("#authWidget");
  if(!box)return;
  if(!authState.user){
    box.innerHTML='<button class="btn btn-blue" id="openLogin" type="button">Connexion</button><button class="btn btn-orange" id="openRegister" type="button">Inscription</button>';
    $("#openLogin").onclick=()=>authOpen("login");
    $("#openRegister").onclick=()=>authOpen("register");
    renderCloudStatus();
    return;
  }
  const user=authState.user;
  unlockAchievement("create_account");
  const pendingFriends=socialState.incoming+socialState.outgoing;
  const friendsBadge=pendingFriends>0 ? `<span class="auth-friends-badge combined">${Math.min(99,pendingFriends)}</span>` : "";
  const socialMenuBadge=pendingFriends>0 ? `<span class="auth-notification-badge">${Math.min(99,pendingFriends)}</span>` : "";
  const chatBadge=chatState.mentionUnread>0 ? `<span class="auth-notification-badge">${Math.min(99,chatState.mentionUnread)}</span>` : "";
  const directBadge=messageState.unread>0 ? `<span class="auth-notification-badge">${Math.min(99,messageState.unread)}</span>` : "";
  const memberButton=socialAssetButton({id:"authCommunitySearch",asset:"membre.png",title:"Membres",description:"Rechercher un membre et consulter son profil communautaire."});
  const friendsButton=socialAssetButton({id:"authFriendsPanel",asset:"ami.png",title:"Amis",description:pendingFriends?`${pendingFriends} demande${pendingFriends>1?"s":""} en attente. Ouvrez la liste pour les traiter.`:"Gérer vos amis et vos demandes.",className:"auth-friends-button",badge:friendsBadge});
  const moderationButton=["moderator","admin"].includes(user.role) ? socialAssetButton({id:"authModerationOverview",asset:"moderation.png",title:"Modération",description:"Ouvrir les signalements, sanctions et journaux de modération."}) : "";
  const adminButton=["moderator","admin"].includes(user.role) ? socialAssetButton({id:"authAdminPanel",asset:"admin.png",title:"Centre de contrôle",description:"Ouvrir les outils autorisés pour votre rôle."}) : "";
  box.innerHTML='<button class="auth-user-chip account-open tooltip" id="accountProfileOpen" type="button" data-tooltip="Ouvrir le profil utilisateur"><strong>'+escapeHtml(user.pseudo)+'</strong><span>'+authRoleLabel(user.role)+'</span></button><button class="btn btn-green auth-icon-btn tooltip '+(chatState.mentionUnread?'has-notification':'')+'" id="authChatboxPanel" type="button" aria-label="Chat global" data-tooltip="Chat global'+(chatState.mentionUnread?' · '+chatState.mentionUnread+' mention(s) non lue(s)':'')+'">💬'+chatBadge+'</button><button class="btn btn-blue auth-icon-btn tooltip '+(messageState.unread?'has-notification':'')+'" id="authDirectMessages" type="button" aria-label="Messages privés" data-tooltip="Messages privés'+(messageState.unread?' · '+messageState.unread+' nouveau(x)':'')+'">✉'+directBadge+'</button><button class="btn btn-blue auth-icon-btn tooltip '+(pendingFriends?'has-notification':'')+'" id="authSocialMenu" type="button" aria-label="Menu social" data-tooltip="Menu social'+(pendingFriends?' · '+pendingFriends+' demande(s) en attente':'')+'">☰'+socialMenuBadge+'</button><div class="auth-menu-panel" id="authMenuPanel">'+memberButton+friendsButton+moderationButton+adminButton+'<button class="btn btn-gray auth-danger-btn" id="authLogout" type="button">Déconnexion</button></div>';
  if($("#accountProfileOpen"))$("#accountProfileOpen").onclick=()=>{unlockAchievement("open_user_profile");openAccountProfile()};
  if($("#authCommunitySearch"))$("#authCommunitySearch").onclick=openCommunityDirectory;
  if($("#authFriendsPanel"))$("#authFriendsPanel").onclick=openFriendsPanel;
  if($("#authChatboxPanel"))$("#authChatboxPanel").onclick=openChatboxPanel;
  if($("#authDirectMessages"))$("#authDirectMessages").onclick=()=>openMessagesPanel();
  if($("#authModerationOverview"))$("#authModerationOverview").onclick=()=>openControlCenterSection("moderation");
  if($("#authLogout"))$("#authLogout").onclick=authLogout;
  if($("#authAdminPanel"))$("#authAdminPanel").onclick=()=>openControlCenterSection("dashboard");
  if($("#authSocialMenu"))$("#authSocialMenu").onclick=()=>box.classList.toggle("menu-open");
  renderCloudStatus();
}

function authOpen(mode="login"){
  authSetMode(mode);
  openModal("authModal");
  setTimeout(()=>$(authMode==="register"?"#authPseudo":"#authIdentifier")?.focus?.(),0);
}

function openPasswordResetRequest(){
  passwordResetToken="";
  $("#passwordResetSubtitle").textContent="Recevez un lien sécurisé pour réinitialiser votre mot de passe.";
  $("#passwordResetRequestForm")?.classList.remove("hidden");
  $("#passwordResetConfirmForm")?.classList.add("hidden");
  closeModal("authModal");
  openModal("passwordResetModal");
  setTimeout(()=>$("#passwordResetIdentifier")?.focus?.(),0);
}

function openPasswordResetConfirm(token){
  passwordResetToken=String(token||"");
  $("#passwordResetSubtitle").textContent="Définissez votre nouveau mot de passe pour récupérer votre compte.";
  $("#passwordResetRequestForm")?.classList.add("hidden");
  $("#passwordResetConfirmForm")?.classList.remove("hidden");
  openModal("passwordResetModal");
  setTimeout(()=>$("#passwordResetNewPassword")?.focus?.(),0);
}

async function requestPasswordReset(event){
  event.preventDefault();
  const identifier=$("#passwordResetIdentifier")?.value||"";
  try{
    await authFetch("/auth/password-reset/request",{method:"POST",body:JSON.stringify({identifier})});
    toast("Si un compte correspond, un email de récupération a été envoyé.","success","success");
    closeModal("passwordResetModal");
  }catch(error){
    toast(error.message||"Demande impossible pour le moment.","error","error");
  }
}

async function confirmPasswordReset(event){
  event.preventDefault();
  const newPassword=$("#passwordResetNewPassword")?.value||"";
  try{
    const result=await authFetch("/auth/password-reset/confirm",{method:"POST",body:JSON.stringify({token:passwordResetToken,newPassword})});
    authState.token=result.token;
    authState.user=result.user;
    authState.apiOnline=true;
    localStorage.setItem(AUTH_TOKEN_KEY,authState.token);
    loadSocialNotificationState();
    authRender();
    closeModal("passwordResetModal");
    toast("Mot de passe réinitialisé. Vous êtes connecté.","success","success");
    cloudAfterLogin({silent:true});
    refreshFriendSummary({silent:true});
    const url=new URL(location.href);
    url.searchParams.delete("resetToken");
    history.replaceState(null,"",url.toString());
  }catch(error){
    toast(error.message||"Lien de récupération invalide.","error","error");
  }
}

function checkPasswordResetLink(){
  const token=new URLSearchParams(location.search).get("resetToken");
  if(token)openPasswordResetConfirm(token);
}

async function confirmEmailVerificationToken(token){
  try{
    const result=await authFetch("/auth/verify-email/confirm",{method:"POST",body:JSON.stringify({token})});
    authState.token=result.token;
    authState.user=result.user;
    authState.apiOnline=true;
    localStorage.setItem(AUTH_TOKEN_KEY,authState.token);
    loadSocialNotificationState();
    authRender();
    toast("Email confirmé. Votre compte est activé.","success","success");
    cloudAfterLogin({silent:true});
    refreshFriendSummary({silent:true});
  }catch(error){
    toast(error.message||"Lien de confirmation invalide.","error","error");
  }finally{
    const url=new URL(location.href);
    url.searchParams.delete("verifyToken");
    history.replaceState(null,"",url.toString());
  }
}

function checkEmailVerificationLink(){
  const token=new URLSearchParams(location.search).get("verifyToken");
  if(token)confirmEmailVerificationToken(token);
}

function setAccountProfileSection(section="account"){
  accountProfileSection=section;
  $$("#accountSectionTabs [data-account-section-tab]").forEach(button=>{
    button.classList.toggle("active",button.dataset.accountSectionTab===section);
  });
  $$("#accountProfileModal [data-account-section]").forEach(panel=>{
    panel.classList.toggle("hidden",panel.dataset.accountSection!==section);
  });
  if(section==="warnings")loadAccountWarnings();
}

function renderAccountWarnings(){
  const list=$("#accountWarningsList");
  if(!list)return;
  if(!accountWarnings.length){
    list.innerHTML=`<div class="community-profile-empty">Aucun avertissement reçu.</div>`;
    return;
  }
  list.innerHTML=accountWarnings.map(item=>`
    <div class="account-warning-item">
      <strong>${escapeHtml(item.reason||"Avertissement")}</strong>
      <small>Par ${escapeHtml(item.actor?.pseudo||"Modération")} · ${formatCloudDateTime(item.createdAt)}</small>
    </div>
  `).join("");
}

async function loadAccountWarnings(){
  const list=$("#accountWarningsList");
  if(list)list.innerHTML=`<div class="community-profile-empty">Chargement des avertissements...</div>`;
  try{
    const result=await authFetch("/account/warnings");
    accountWarnings=result.warnings||[];
    renderAccountWarnings();
  }catch(error){
    if(list)list.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Avertissements indisponibles.")}</div>`;
  }
}

function renderAccountProfile(){
  const user=authState.user;
  if(!user)return;
  const meta=$("#accountProfileMeta");
  if(meta){
    meta.innerHTML=[
      ["Pseudo",user.pseudo],
      ["Email",user.email],
      ["Rôle",authRoleLabel(user.role)],
      ["Compte créé",user.createdAt?formatDateShort(user.createdAt):"-"],
      ["Dernière connexion",user.lastLoginAt?formatDateShort(user.lastLoginAt):"-"]
    ].map(([label,value])=>`<span>${label}<small>${escapeHtml(value)}</small></span>`).join("");
  }
  const email=$("#accountEmailInput");
  if(email)email.value=user.email||"";
  const avatar=$("#accountAvatarInput");
  if(avatar)avatar.value=user.avatarUrl||"";
  const preview=$("#accountAvatarPreview");
  if(preview){
    if(user.avatarUrl)preview.style.setProperty("--avatar-url",`url("${String(user.avatarUrl).replace(/"/g,"%22")}")`);
    else preview.style.removeProperty("--avatar-url");
  }
  const prefs=accountPreferences();
  const list=$("#accountPrivacyList");
  if(list){
    const groups=[...new Set(ACCOUNT_PRIVACY_OPTIONS.map(option=>option.group||"Options"))];
    list.innerHTML=groups.map(group=>`
      <div class="privacy-group">
        <h4>${escapeHtml(group)}</h4>
        ${ACCOUNT_PRIVACY_OPTIONS.filter(option=>(option.group||"Options")===group).map(option=>`
          <label class="privacy-toggle">
            <input type="checkbox" data-account-pref="${option.key}" ${prefs[option.key]?"checked":""}>
            <span>${option.label}<small>${option.description}</small></span>
          </label>
        `).join("")}
      </div>
    `).join("");
    list.querySelectorAll("[data-account-pref]").forEach(input=>{
      input.addEventListener("change",saveAccountPreferences);
    });
  }
  setAccountProfileSection(accountProfileSection);
}

function communityAchievementEntries(profile){
  const unlocked=Array.isArray(profile?.achievements?.unlocked)?profile.achievements.unlocked:[];
  const hiddenSecrets=!!profile?.achievements?.hiddenSecrets;
  return unlocked
    .map(item=>({item,achievement:ACHIEVEMENTS?.[item.id]}))
    .filter(entry=>entry.achievement)
    .filter(entry=>!hiddenSecrets || !["SECRETS","EASTER EGGS"].includes(entry.achievement.category))
    .sort((a,b)=>new Date(b.item.date||0)-new Date(a.item.date||0));
}

function communityProfileUrl(pseudo){
  const url=new URL(location.href);
  url.search="";
  url.hash="";
  url.searchParams.set("user",pseudo||"");
  return url.toString();
}

function canOpenModerationTools(profile){
  if(!authState.user || !profile)return false;
  if(!["moderator","admin"].includes(authState.user.role))return false;
  return String(authState.user.pseudo||"").toLowerCase()!==String(profile.pseudo||"").toLowerCase();
}

function parseServerDate(value){
  if(!value)return null;
  const text=String(value);
  const date=new Date(text.includes("T")?text:text.replace(" ","T")+"Z");
  return Number.isNaN(date.getTime())?null:date;
}

function memberIsOnline(user){
  if(user?.isBanned)return false;
  if(typeof user?.isOnline==="boolean")return user.isOnline;
  const date=parseServerDate(user?.lastLoginAt);
  return !!date && Date.now()-date.getTime()<15*60*1000;
}

function memberStatusMarkup(user,options={}){
  const online=memberIsOnline(user);
  const label=online?"En ligne":"Hors ligne";
  const ban=user?.isBanned?`<span class="member-ban-badge">Banni</span>`:"";
  const last=!online && options.showLastSeen && user?.lastLoginAt ? ` · vu le ${formatDateShort(user.lastLoginAt)}` : "";
  return `<span class="member-status-line"><span class="member-presence ${online?"online":"offline"}">${label}${last}</span>${ban}</span>`;
}

function avatarStyle(url){
  const clean=String(url||"").trim();
  return clean ? ` style="--avatar-url:url('${escapeHtml(clean).replace(/'/g,"\\'")}')"` : "";
}

function avatarMarkup(user,className="chat-avatar"){
  return `<span class="${className}"${avatarStyle(user?.avatarUrl)}></span>`;
}

function cloudProfileProgressValue(profile){
  return Number(profile?.progressValue ?? profile?.pp ?? 0) || 0;
}
function cloudProfileFamiliarId(profile){
  const direct=normalizeFamiliarId(profile?.familiarId);
  if(direct!=="pykur" || profile?.familiarId==="pykur")return direct;
  const haystack=[
    profile?.familiarLabel,
    profile?.name,
    profile?.progressLabel,
    profile?.progressShort,
    ...(Array.isArray(profile?.runDetails)?profile.runDetails.map(item=>item?.label):[])
  ].filter(Boolean).join(" ").toLowerCase();
  if(haystack.includes("abra") || haystack.includes("puissance") || haystack.includes("chêne") || haystack.includes("chene"))return "abra-kadabra";
  return "pykur";
}
function cloudProfileFamiliar(profile){
  return FAMILIARS[cloudProfileFamiliarId(profile)] || FAMILIARS.pykur;
}
function cloudProfileProgressLabel(profile){
  return profile?.progressLabel || cloudProfileFamiliar(profile).progressShort || "PP";
}
function cloudProfileObjectiveMax(profile){
  return Number(profile?.objectiveMax || cloudProfileFamiliar(profile).objectiveMax || PP_MAX) || PP_MAX;
}
function cloudProfileRunValue(profile,key){
  if(profile?.runs && Object.prototype.hasOwnProperty.call(profile.runs,key))return Number(profile.runs[key])||0;
  if(Object.prototype.hasOwnProperty.call(profile||{},key))return Number(profile[key])||0;
  return 0;
}
function cloudProfileRunsEntries(profile){
  const details=Array.isArray(profile?.runDetails) ? profile.runDetails : [];
  const visible=details.filter(item=>item && item.label).map(item=>({label:String(item.label),value:Number(item.value)||0}));
  if(visible.length)return visible;
  const familiar=cloudProfileFamiliar(profile);
  return (familiar.dungeons||[]).map(dungeon=>({
    label:dungeon.label,
    value:cloudProfileRunValue(profile,dungeon.key)
  }));
}
function cloudProfileRunsText(profile){
  return cloudProfileRunsEntries(profile).map(item=>`${escapeHtml(item.label)} ${item.value}`).join(" · ");
}
function cloudProfileSummaryText(profile){
  const value=cloudProfileProgressValue(profile);
  const label=cloudProfileProgressLabel(profile);
  const max=cloudProfileObjectiveMax(profile);
  return `${value} / ${max} ${escapeHtml(label)} · ${cloudProfileRunsText(profile)}${profile?.active?" · actif":""}`;
}
function cloudProfileAdminOption(profile,selected=false){
  const familiar=cloudProfileFamiliar(profile);
  const value=cloudProfileProgressValue(profile);
  const max=cloudProfileObjectiveMax(profile);
  const label=cloudProfileProgressLabel(profile);
  return `<label class="admin-clean-profile-option admin-profile-familiar-card">
    <input type="radio" name="adminTargetProfile" value="${adminEscapeAttr(profile.id)}" ${selected?"checked":""}>
    <span class="admin-profile-main">
      <strong>${escapeHtml(profile.name)}</strong>
      <small><b>${escapeHtml(familiar.label)}</b> · ${value} / ${max} ${escapeHtml(label)}${profile.active?" · actif":""}</small>
      <small class="admin-profile-runs">${cloudProfileRunsText(profile)}</small>
    </span>
  </label>`;
}
function cloudProfileAdminFocus(profile){
  if(!profile)return `<div class="admin-console-empty">Aucun profil sélectionné.</div>`;
  const familiar=cloudProfileFamiliar(profile);
  const value=cloudProfileProgressValue(profile);
  const max=cloudProfileObjectiveMax(profile);
  const label=cloudProfileProgressLabel(profile);
  return `<div class="admin-profile-focus-grid">
    <div><span>Familier ciblé</span><strong>${escapeHtml(familiar.label)}</strong></div>
    <div><span>Progression</span><strong>${value} / ${max} ${escapeHtml(label)}</strong></div>
    <div class="wide"><span>Méthodes</span><strong>${cloudProfileRunsText(profile)}</strong></div>
  </div>`;
}

async function copyTextToClipboard(text){
  if(navigator.clipboard?.writeText){
    await navigator.clipboard.writeText(text);
    return;
  }
  const input=document.createElement("textarea");
  input.value=text;
  input.setAttribute("readonly","");
  input.style.position="fixed";
  input.style.left="-9999px";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function renderCommunityProfile(profile){
  const box=$("#communityProfileContent");
  if(!box)return;
  const profiles=Array.isArray(profile?.profiles)?profile.profiles:[];
  const achievements=communityAchievementEntries(profile);
  const hiddenAchievementCount=(Array.isArray(profile?.achievements?.unlocked)?profile.achievements.unlocked.length:0)-achievements.length;
  const social=profile?.social||{};
  const canSeeDetails=!profile?.isPrivate || !!profile?.moderationView;
  box.innerHTML=`
    <section class="community-profile-shell ${profile?.moderationView?"is-staff-view":""}">
      ${profile?.moderationView?`<div class="community-staff-banner"><span>Vue équipe</span><p>Les informations privées sont visibles uniquement pour vos missions de modération.</p></div>`:""}
      <div class="community-profile-hero role-${escapeHtml(profile?.role||"user")}">
        ${avatarMarkup(profile,"chat-avatar community-avatar")}
        <div class="community-profile-identity">
          <div class="community-profile-name-row">
            <h3 class="community-profile-title">${escapeHtml(profile?.pseudo||"Profil")}</h3>
            ${memberStatusMarkup(profile)}
          </div>
          <p>${profile?.isPrivate?"Profil privé · ":""}Compte créé le ${profile?.createdAt?formatDateShort(profile.createdAt):"date inconnue"}</p>
          <div class="community-profile-meta">
            <span>${profiles.length} profil${profiles.length>1?"s":""} familier visible${profiles.length>1?"s":""}</span>
            <span>${achievements.length} succès visible${achievements.length>1?"s":""}</span>
            ${profile?.achievements?.eggCollected?`<span>Œuf secret récupéré</span>`:""}
          </div>
        </div>
        <span class="community-role-badge role-${escapeHtml(profile?.role||"user")}">${authRoleLabel(profile?.role)}</span>
      </div>
      <div class="community-profile-toolbar">
        <div class="community-profile-toolbar-group">
          <small>Actions sociales</small>
          <div>
            ${socialActionButton({asset:"copierprofil.png",title:"Copier le profil",description:"Copier le lien public de ce profil.",attributes:`data-community-copy-link="${escapeHtml(profile?.pseudo||"")}"`})}
            ${socialActionButton({asset:"recherchermembre.png",title:"Rechercher un membre",description:"Ouvrir l'annuaire des membres.",className:"btn-gray",attributes:"data-community-open-search"})}
            <span class="community-friend-actions" data-community-social-actions></span>
          </div>
        </div>
        ${canOpenModerationTools(profile)?`<div class="community-profile-toolbar-group is-staff"><small>Outils équipe</small><button class="btn btn-orange" type="button" data-community-moderate="${escapeHtml(profile?.pseudo||"")}">Ouvrir la modération</button></div>`:""}
      </div>
    </section>
    ${profile?.isPrivate && !profile?.moderationView?`
      <section class="community-private-note">
        Ce membre a choisi de garder ses informations privées. Vous pouvez tout de même l'ajouter en ami et, plus tard, lui envoyer un message si ses préférences l'autorisent.
      </section>
    `:""}
    ${canSeeDetails?`
    <nav class="community-profile-tabs" aria-label="Sections du profil">
      <button class="is-active" type="button" data-community-tab="progression">Progression</button>
      <button type="button" data-community-tab="collection">Collection</button>
      <button type="button" data-community-tab="achievements">Succès <span>${achievements.length}</span></button>
    </nav>
    <div class="community-profile-tab-panel is-active" data-community-panel="progression">
      <section class="community-section-heading"><div><small>Parcours familier</small><h4>Progression visible</h4></div><span>${profiles.length} profil${profiles.length>1?"s":""}</span></section>
      <section class="community-profile-grid">
      ${profiles.length ? profiles.map(item=>{
        const familiar=cloudProfileFamiliar(item);
        return `
          <article class="community-profile-card">
            <div class="community-profile-card-head">
              <img class="community-profile-familiar-img" src="${assetPath(familiar.logo||familiar.image)}" alt="">
              <div>
                <h4>${escapeHtml(item.name)}${item.isMain?" · Principal":""}</h4>
                <p><strong>${cloudProfileProgressValue(item)} / ${cloudProfileObjectiveMax(item)} ${escapeHtml(cloudProfileProgressLabel(item))}</strong></p>
              </div>
            </div>
          <div class="progress-bar"><span class="community-profile-progress-fill" style="width:${Math.max(0,Math.min(100,item.progress||0))}%"></span></div>
          ${(Array.isArray(item.runDetails)&&item.runDetails.length?item.runDetails:[{label:"Morose",value:item.runs?.morose||0},{label:"Tynril",value:item.runs?.tynril||0}]).map(run=>`<p>${escapeHtml(run.label)} : ${Number(run.value)||0}</p>`).join("")}
          ${item.stats?`<p>Temps chrono : ${item.stats.chronoTotalSeconds?formatDuration(item.stats.chronoTotalSeconds):"—"}</p>`:""}
        </article>
      `}).join("") : `<div class="community-profile-empty">Aucun profil familier visible publiquement.</div>`}
      </section>
    </div>
    <div class="community-profile-tab-panel" data-community-panel="collection">
      <section class="community-profile-card community-collection-card">
      <div class="community-section-heading"><div><small>Mémoire du joueur</small><h4>Collection publique</h4></div></div>
      <div class="community-profile-summary-grid">
        ${profile?.gallery
          ? `<div class="community-profile-summary-item"><small>Familiers terminés</small>${profile.gallery.completedPykurs || 0}</div>
             <div class="community-profile-summary-item"><small>Événements découverts</small>${profile.gallery.eventsDiscovered || 0}</div>`
          : `<div class="community-profile-summary-item"><small>Galerie</small>Masquée</div>`}
        <div class="community-profile-summary-item"><small>Succès visibles</small>${achievements.length}</div>
      </div>
      </section>
    </div>
    <div class="community-profile-tab-panel" data-community-panel="achievements">
      <section class="community-profile-card">
      <div class="community-section-heading"><div><small>Accomplissements</small><h4>Succès visibles</h4></div><span>${achievements.length}</span></div>
      ${achievements.length
        ? `<div class="community-achievement-list">
            ${achievements.slice(0,6).map(({item,achievement})=>`
              <div class="community-achievement-pill">
                ${escapeHtml(achievement.title)}
                <small>${escapeHtml(achievement.category)}${item.date?` · ${formatDateShort(item.date)}`:""}</small>
              </div>
            `).join("")}
          </div>
          ${achievements.length>6?`<p>${achievements.length-6} autres succès visibles.</p>`:""}
          ${hiddenAchievementCount>0?`<p>${hiddenAchievementCount} succès secret${hiddenAchievementCount>1?"s":""} masqué${hiddenAchievementCount>1?"s":""}.</p>`:""}`
        : `<p>Aucun succès public visible pour le moment.</p>`}
      </section>
    </div>
    `:""}
  `;
  renderCommunitySocialActions(box.querySelector("[data-community-social-actions]"),profile?.pseudo,social);
  box.querySelector("[data-community-copy-link]")?.addEventListener("click",async event=>{
    const pseudo=event.currentTarget.dataset.communityCopyLink;
    try{
      await copyTextToClipboard(communityProfileUrl(pseudo));
      toast("Lien du profil public copié.","success","click");
    }catch{
      toast("Impossible de copier le lien automatiquement.","warning","warning");
    }
  });
  box.querySelector("[data-community-open-search]")?.addEventListener("click",openCommunityDirectory);
  box.querySelector("[data-community-moderate]")?.addEventListener("click",event=>openControlCenterForUser(event.currentTarget.dataset.communityModerate));
  box.querySelectorAll("[data-community-tab]").forEach(button=>button.addEventListener("click",()=>{
    const tab=button.dataset.communityTab;
    box.querySelectorAll("[data-community-tab]").forEach(item=>item.classList.toggle("is-active",item===button));
    box.querySelectorAll("[data-community-panel]").forEach(panel=>panel.classList.toggle("is-active",panel.dataset.communityPanel===tab));
  }));
}

function moderationActionLabel(type){
  return ({
    ban:"Ban",
    timeban:"Timeban",
    unban:"Unban",
    mute:"Mute",
    unmute:"Unmute",
    warn:"Avertissement",
    promote:"Promotion",
    demote:"Rétrogradation",
    delete:"Suppression"
  })[type]||type;
}

function moderationDateText(value){
  if(!value)return "Permanent";
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "-";
  return date.toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
}

function moderationUntil(hours){
  return new Date(Date.now()+hours*60*60*1000).toISOString();
}

function renderModerationPanelLegacy(data,pseudo){
  const box=$("#moderationContent");
  if(!box)return;
  const user=data?.user||{};
  const history=Array.isArray(data?.history)?data.history:[];
  const canAct=!!user.canModerate;
  const canAdmin=authState.user?.role==="admin";
  const disabled=canAct?"":"disabled";
  box.innerHTML=`
    <section class="moderation-target role-${escapeHtml(user.role||"user")}">
      <div>
        <h3 class="community-profile-title">${escapeHtml(user.pseudo||pseudo||"Membre")} ${memberStatusMarkup(user)}</h3>
        <p>${escapeHtml(user.email||"Email masqué")} · ${authRoleLabel(user.role)} · inscrit le ${user.createdAt?formatDateShort(user.createdAt):"-"}</p>
      </div>
      <span class="community-role-badge role-${escapeHtml(user.role||"user")}">${authRoleLabel(user.role)}</span>
    </section>
    <section class="moderation-status-grid">
      <div class="moderation-info"><small>Ban</small><strong>${user.isBanned?"Actif":"Aucun"}</strong></div>
      <div class="moderation-info"><small>Fin ban</small><strong>${moderationDateText(user.banUntil)}</strong></div>
      <div class="moderation-info"><small>Mute</small><strong>${user.muteUntil?moderationDateText(user.muteUntil):"Aucun"}</strong></div>
    </section>
    ${canAct?`
    <section class="moderation-action-grid">
      <article class="moderation-action-card">
        <small>Sanction compte</small>
        <p>Empêche temporairement ou définitivement la connexion du membre.</p>
        <button class="btn btn-red" type="button" data-moderation-action="ban24" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Ban 24h</button>
        <button class="btn btn-red" type="button" data-moderation-action="banPermanent" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Ban permanent</button>
        <button class="btn btn-gray" type="button" data-moderation-action="unban" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Retirer le ban</button>
      </article>
      <article class="moderation-action-card">
        <small>Messagerie</small>
        <p>Empêche le membre d'envoyer des messages privés pendant une durée donnée.</p>
        <button class="btn btn-blue" type="button" data-moderation-action="warn" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Avertir</button>
        <button class="btn btn-orange" type="button" data-moderation-action="mute1" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Mute 1h</button>
        <button class="btn btn-orange" type="button" data-moderation-action="mute24" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Mute 24h</button>
        <button class="btn btn-gray" type="button" data-moderation-action="unmute" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${disabled}>Retirer le mute</button>
      </article>
      ${canAdmin?`
      <article class="moderation-action-card ${user.canDelete?"moderation-danger-zone":""}">
        <small>Administration</small>
        <p>Gère le rôle du membre ou supprime définitivement son compte.</p>
        ${user.role==="moderator"
          ? `<button class="btn btn-gray" type="button" data-moderation-action="roleUser" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Retirer modo</button>`
          : `<button class="btn btn-blue" type="button" data-moderation-action="roleModerator" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Passer modo</button>`}
        <button class="btn btn-red" type="button" data-moderation-action="deleteUser" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${user.canDelete?"":"disabled"}>Supprimer le compte</button>
      </article>`:""}
    </section>`:`<div class="community-profile-empty">Vous ne pouvez pas modérer ce membre avec votre rôle actuel.</div>`}
    <section class="community-profile-card">
      <h4>Historique récent ${history.length?`<button class="btn btn-red" type="button" data-reset-moderation-history="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Vider l'historique</button>`:""}</h4>
      <div class="moderation-history">
        ${history.length?history.map(row=>`
          <div class="moderation-history-row">
            <span class="moderation-history-type">${moderationActionLabel(row.type)}</span>
            <span>${escapeHtml(row.reason||"Aucune raison indiquée")}<br><small>Par ${escapeHtml(row.actor?.pseudo||"Système")}</small></span>
            <time>${row.createdAt?formatDateShort(row.createdAt):"-"}</time>
            <button class="btn btn-gray" type="button" data-delete-moderation-history="${escapeHtml(String(row.id))}" data-pseudo="${escapeHtml(user.pseudo)}">Retirer</button>
          </div>
        `).join(""):`<div class="community-profile-empty">Aucune action de modération récente.</div>`}
      </div>
    </section>
  `;
  box.querySelectorAll("[data-moderation-action]").forEach(button=>{
    button.addEventListener("click",()=>runModerationAction(button.dataset.moderationAction,button.dataset.userId,button.dataset.pseudo));
  });
  box.querySelectorAll("[data-delete-moderation-history]").forEach(button=>{
    button.addEventListener("click",()=>deleteModerationHistoryEntry(button.dataset.deleteModerationHistory,button.dataset.pseudo));
  });
  box.querySelector("[data-reset-moderation-history]")?.addEventListener("click",event=>{
    resetModerationHistory(event.currentTarget.dataset.resetModerationHistory,event.currentTarget.dataset.pseudo);
  });
}

async function openModerationPanel(pseudo){
  if(!authState.user || !["moderator","admin"].includes(authState.user.role))return;
  const box=$("#moderationContent");
  openModal("moderationModal");
  if(box)box.innerHTML=`<div class="community-profile-empty">Chargement des informations de modération...</div>`;
  try{
    const data=await authFetch(`/moderation/users/${encodeURIComponent(pseudo||"")}`);
    renderModerationPanel(data,pseudo);
  }catch(error){
    if(box)box.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Modération indisponible.")}</div>`;
  }
}

function moderationStateBadges(user={}){
  const badges=[];
  if(user.isBanned)badges.push(`<span class="moderation-state-badge is-ban">Banni</span>`);
  if(user.muteUntil)badges.push(`<span class="moderation-state-badge is-mute">Mute</span>`);
  if(["moderator","admin"].includes(user.role))badges.push(`<span class="moderation-state-badge is-team">${authRoleLabel(user.role)}</span>`);
  if(!badges.length)badges.push(`<span class="moderation-state-badge">Actif</span>`);
  return badges.join("");
}

function renderModerationPanel(data,pseudo){
  const box=$("#moderationContent");
  if(!box)return;
  const user=data?.user||{};
  const history=Array.isArray(data?.history)?data.history:[];
  const pseudoRows=Array.isArray(data?.pseudoHistory)?data.pseudoHistory:[];
  const permissions=new Set(data?.permissions||[]);
  const can=permission=>permissions.has(permission)&&!!user.canModerate;
  const restrictions=user.socialRestrictions||{};
  box.innerHTML=`
    <section class="moderation-identity-card role-${escapeHtml(user.role||"user")}">
      ${avatarMarkup(user)}
      <div><h3>${escapeHtml(user.pseudo||pseudo||"Membre")} ${memberStatusMarkup(user)}</h3><p>${escapeHtml(user.email||"Email masqué")} · inscrit le ${user.createdAt?formatDateShort(user.createdAt):"-"}</p></div>
      <span class="community-role-badge role-${escapeHtml(user.role||"user")}">${authRoleLabel(user.role)}</span>
    </section>
    <nav class="moderation-workspace-tabs" aria-label="Sections de modération">
      <button class="is-active" type="button" data-moderation-tab="overview">Vue d'ensemble</button>
      <button type="button" data-moderation-tab="restrictions">Restrictions</button>
      <button type="button" data-moderation-tab="security">Sécurité</button>
      <button type="button" data-moderation-tab="history">Historique</button>
    </nav>
    <div class="moderation-workspace-panel is-active" data-moderation-panel="overview">
      <section class="moderation-status-grid">
        <div class="moderation-info"><small>Ban</small><strong>${user.isBanned?"Actif":"Aucun"}</strong></div>
        <div class="moderation-info"><small>Fin ban</small><strong>${moderationDateText(user.banUntil)}</strong></div>
        <div class="moderation-info"><small>Mute</small><strong>${user.muteUntil?moderationDateText(user.muteUntil):"Aucun"}</strong></div>
        <div class="moderation-info"><small>Mot de passe</small><strong>${user.passwordResetRequired?"Réinitialisation requise":"Normal"}</strong></div>
      </section>
      <section class="moderation-security-grid">
        <article class="moderation-form-card"><h4>Sanctions du compte</h4><p>Chaque action exige une raison et reste tracée dans l'audit.</p><div class="moderation-form-row">
          <button class="btn btn-red" type="button" data-moderation-action="ban24" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.ban")?"":"disabled"}>Ban 24h</button>
          <button class="btn btn-red" type="button" data-moderation-action="banPermanent" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.ban")?"":"disabled"}>Ban permanent</button>
          <button class="btn btn-gray" type="button" data-moderation-action="unban" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.ban")?"":"disabled"}>Débannir</button>
        </div></article>
        <article class="moderation-form-card"><h4>Communication</h4><p>Avertissement ou suspension temporaire de la messagerie.</p><div class="moderation-form-row">
          <button class="btn btn-blue" type="button" data-moderation-action="warn" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.warn")?"":"disabled"}>Avertir</button>
          <button class="btn btn-orange" type="button" data-moderation-action="mute1" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.mute")?"":"disabled"}>Mute 1h</button>
          <button class="btn btn-orange" type="button" data-moderation-action="mute24" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.mute")?"":"disabled"}>Mute 24h</button>
          <button class="btn btn-gray" type="button" data-moderation-action="unmute" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${can("users.mute")?"":"disabled"}>Démute</button>
        </div></article>
      </section>
      ${permissions.has("users.notes")?`<section class="moderation-form-card"><h4>Note interne</h4><p>Visible uniquement par l'équipe. N'y placez aucune donnée inutilement sensible.</p><textarea id="moderationStaffNote" rows="4" maxlength="2000" placeholder="Contexte utile pour les prochaines interventions...">${escapeHtml(user.staffNote||"")}</textarea><div><button class="btn btn-blue" type="button" data-save-staff-note="${user.id}">Enregistrer la note</button></div></section>`:""}
    </div>
    <div class="moderation-workspace-panel" data-moderation-panel="restrictions">
      <section class="moderation-form-card"><h4>Accès communautaires ciblés</h4><p>Ces restrictions n'affectent ni la progression ni les données du Pykur.</p>
        <div class="moderation-restriction-grid">
          <label><input type="checkbox" data-user-restriction="chat" ${restrictions.chat?"checked":""}><span>Chat global<small>Empêche l'envoi de messages publics.</small></span></label>
          <label><input type="checkbox" data-user-restriction="privateMessages" ${restrictions.privateMessages?"checked":""}><span>Messages privés<small>Empêche l'envoi de nouveaux MP.</small></span></label>
          <label><input type="checkbox" data-user-restriction="friendRequests" ${restrictions.friendRequests?"checked":""}><span>Demandes d'ami<small>Empêche de solliciter de nouveaux membres.</small></span></label>
          <label><input type="checkbox" data-user-restriction="sharing" ${restrictions.sharing?"checked":""}><span>Partages automatiques<small>Bloque les annonces de succès et Pykurs.</small></span></label>
          <label><input type="checkbox" id="moderationProfileLocked" ${user.profileLocked?"checked":""}><span>Profil public verrouillé<small>Le profil reste privé jusqu'à levée manuelle.</small></span></label>
          <label><input type="checkbox" id="moderationAvatarLocked" ${user.avatarLocked?"checked":""}><span>Avatar verrouillé<small>Empêche la modification de la photo.</small></span></label>
        </div>
        <div class="moderation-form-row"><input id="moderationRestrictionReason" maxlength="500" placeholder="Raison obligatoire"><button class="btn btn-orange" type="button" data-save-user-restrictions="${user.id}" ${can("users.restrict")?"":"disabled"}>Appliquer les restrictions</button></div>
      </section>
    </div>
    <div class="moderation-workspace-panel" data-moderation-panel="security">
      <section class="moderation-security-grid">
        <article class="moderation-form-card"><h4>Identité du compte</h4><p>Le changement de pseudo conserve un historique complet.</p><div class="moderation-form-row"><input id="moderationNewPseudo" maxlength="24" value="${escapeHtml(user.pseudo||"")}"><button class="btn btn-blue" type="button" data-rename-user="${user.id}" ${can("users.rename")?"":"disabled"}>Modifier le pseudo</button></div></article>
        <article class="moderation-form-card"><h4>Sessions actives</h4><p>Déconnecte tous les appareils sans modifier le mot de passe.</p><button class="btn btn-red" type="button" data-revoke-user-sessions="${user.id}" ${can("users.sessions.revoke")?"":"disabled"}>Révoquer toutes les sessions</button></article>
        <article class="moderation-form-card"><h4>Réinitialisation du mot de passe</h4><p>Envoie un lien sécurisé et bloque les anciennes sessions.</p><button class="btn btn-orange" type="button" data-force-password-reset="${user.id}" ${can("users.password.reset")?"":"disabled"}>Forcer la réinitialisation</button></article>
        ${authState.user?.role==="admin"?`<article class="moderation-form-card moderation-danger-zone"><h4>Administration du compte</h4><p>Gestion du rôle et suppression définitive.</p><div class="moderation-form-row">${user.role==="moderator"?`<button class="btn btn-gray" data-moderation-action="roleUser" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Retirer modo</button>`:`<button class="btn btn-blue" data-moderation-action="roleModerator" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Passer modo</button>`}<button class="btn btn-red" data-moderation-action="deleteUser" data-user-id="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}" ${user.canDelete?"":"disabled"}>Supprimer le compte</button></div></article>`:""}
      </section>
      <section class="moderation-form-card"><h4>Historique des pseudos</h4><div class="moderation-pseudo-history">${pseudoRows.length?pseudoRows.map(row=>`<div><strong>${escapeHtml(row.oldPseudo)} → ${escapeHtml(row.newPseudo)}</strong><time>${row.createdAt?formatDateShort(row.createdAt):"-"}</time><small>${escapeHtml(row.reason)} · par ${escapeHtml(row.actorPseudo||"Équipe")}</small></div>`).join(""):`<div class="community-profile-empty">Aucun changement de pseudo.</div>`}</div></section>
    </div>
    <div class="moderation-workspace-panel" data-moderation-panel="history">
      <section class="community-profile-card"><h4>Historique récent ${history.length&&permissions.has("users.history.manage")?`<button class="btn btn-red" type="button" data-reset-moderation-history="${user.id}" data-pseudo="${escapeHtml(user.pseudo)}">Vider l'historique</button>`:""}</h4><div class="moderation-history">${history.length?history.map(row=>`<div class="moderation-history-row"><span class="moderation-history-type">${moderationActionLabel(row.type)}</span><span>${escapeHtml(row.reason||"Aucune raison indiquée")}<br><small>Par ${escapeHtml(row.actor?.pseudo||"Système")}</small></span><time>${row.createdAt?formatDateShort(row.createdAt):"-"}</time>${permissions.has("users.history.manage")?`<button class="btn btn-gray" type="button" data-delete-moderation-history="${escapeHtml(String(row.id))}" data-pseudo="${escapeHtml(user.pseudo)}">Retirer</button>`:""}</div>`).join(""):`<div class="community-profile-empty">Aucune action récente.</div>`}</div></section>
    </div>`;
  box.querySelectorAll("[data-moderation-tab]").forEach(button=>button.addEventListener("click",()=>{
    box.querySelectorAll("[data-moderation-tab]").forEach(item=>item.classList.toggle("is-active",item===button));
    box.querySelectorAll("[data-moderation-panel]").forEach(panel=>panel.classList.toggle("is-active",panel.dataset.moderationPanel===button.dataset.moderationTab));
  }));
  box.querySelectorAll("[data-moderation-action]").forEach(button=>button.addEventListener("click",()=>runModerationAction(button.dataset.moderationAction,button.dataset.userId,button.dataset.pseudo)));
  box.querySelectorAll("[data-delete-moderation-history]").forEach(button=>button.addEventListener("click",()=>deleteModerationHistoryEntry(button.dataset.deleteModerationHistory,button.dataset.pseudo)));
  box.querySelector("[data-reset-moderation-history]")?.addEventListener("click",event=>resetModerationHistory(event.currentTarget.dataset.resetModerationHistory,event.currentTarget.dataset.pseudo));
  box.querySelector("[data-save-staff-note]")?.addEventListener("click",()=>saveModerationNote(user.id,user.pseudo));
  box.querySelector("[data-save-user-restrictions]")?.addEventListener("click",()=>saveModerationRestrictions(user.id,user.pseudo));
  box.querySelector("[data-rename-user]")?.addEventListener("click",()=>renameModeratedUser(user.id,user.pseudo));
  box.querySelector("[data-revoke-user-sessions]")?.addEventListener("click",()=>runModerationSecurityAction("sessions/revoke",user.id,user.pseudo));
  box.querySelector("[data-force-password-reset]")?.addEventListener("click",()=>runModerationSecurityAction("password-reset",user.id,user.pseudo));
}

async function saveModerationNote(userId,pseudo){
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(userId)}/note`,{method:"PUT",body:JSON.stringify({note:$("#moderationStaffNote")?.value||""})});
    toast("Note interne enregistrée.","success","success");
  }catch(error){toast(error.message||"Note impossible à enregistrer.","error","error")}
}

async function saveModerationRestrictions(userId,pseudo){
  const reason=String($("#moderationRestrictionReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez une raison pour modifier les restrictions.","warning","warning");
  const restrictions={};
  document.querySelectorAll("[data-user-restriction]").forEach(input=>{restrictions[input.dataset.userRestriction]=!!input.checked});
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(userId)}/restrictions`,{method:"PUT",body:JSON.stringify({restrictions,profileLocked:!!$("#moderationProfileLocked")?.checked,avatarLocked:!!$("#moderationAvatarLocked")?.checked,reason})});
    toast("Restrictions mises à jour.","success","success");
    await openModerationPanel(pseudo);
  }catch(error){toast(error.message||"Restrictions impossibles à appliquer.","error","error")}
}

async function renameModeratedUser(userId,currentPseudo){
  const nextPseudo=String($("#moderationNewPseudo")?.value||"").trim();
  if(!nextPseudo||nextPseudo===currentPseudo)return toast("Indiquez un nouveau pseudo.","warning","warning");
  const reason=await moderationReason("rename",currentPseudo);
  if(reason===null)return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(userId)}/pseudo`,{method:"PUT",body:JSON.stringify({pseudo:nextPseudo,reason})});
    toast("Pseudo modifié et historisé.","success","success");
    await openModerationPanel(nextPseudo);
  }catch(error){toast(error.message||"Modification du pseudo impossible.","error","error")}
}

async function runModerationSecurityAction(path,userId,pseudo){
  const isPassword=path==="password-reset";
  const reason=await moderationReason(path,pseudo);
  if(reason===null)return;
  const confirmed=await showConfirm(isPassword?`Forcer ${pseudo} à définir un nouveau mot de passe ?`:`Déconnecter ${pseudo} de tous ses appareils ?`,{title:isPassword?"Réinitialisation de sécurité":"Révocation des sessions",danger:true,okLabel:"Confirmer"});
  if(!confirmed)return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(userId)}/${path}`,{method:"POST",body:JSON.stringify({reason})});
    toast(isPassword?"Lien de réinitialisation envoyé.":"Toutes les sessions ont été révoquées.","success","success");
    await openModerationPanel(pseudo);
  }catch(error){toast(error.message||"Action de sécurité impossible.","error","error")}
}

function moderationAccountRows(items,empty="Aucun compte correspondant."){
  return `<div class="moderation-account-list">
    ${items.length?items.map(user=>`
      <article class="moderation-account-row">
        ${avatarMarkup(user)}
        <div>
          <strong>${escapeHtml(user.pseudo||"Compte")}</strong> ${memberStatusMarkup(user)}
          <small>${authRoleLabel(user.role)} · inscrit le ${user.createdAt?formatDateShort(user.createdAt):"-"}</small>
        </div>
        <div class="moderation-account-state">${moderationStateBadges(user)}</div>
        <button class="btn btn-blue" type="button" data-overview-moderate="${escapeHtml(user.pseudo||"")}">Ouvrir</button>
      </article>
    `).join(""):`<div class="moderation-empty">${escapeHtml(empty)}</div>`}
  </div>`;
}

function moderationQuickAccounts(title,items,empty){
  return `<section class="community-profile-card">
    <div class="moderation-section-heading"><div><h4>${escapeHtml(title)}</h4><p>${items.length} compte${items.length>1?"s":""}</p></div></div>
    <div class="moderation-quick-list">
      ${items.slice(0,5).map(user=>`<div class="moderation-quick-row"><span><strong>${escapeHtml(user.pseudo)}</strong><br><small>${moderationStateBadges(user)}</small></span><button class="btn btn-gray" data-overview-moderate="${escapeHtml(user.pseudo)}">Voir</button></div>`).join("")||`<div class="moderation-empty">${escapeHtml(empty)}</div>`}
    </div>
  </section>`;
}

function moderationReportLabel(action){
  return ({close:"Fermé sans sanction",warn:"Avertissement",mute1:"Mute 1 heure",mute24:"Mute 24 heures",ban24:"Ban 24 heures",ban:"Ban permanent"})[action]||"Traité";
}

function moderationReportCard(report){
  const resolved=report.status==="resolved";
  const priorityLabels={low:"Faible",normal:"Normale",high:"Haute",urgent:"Urgente"};
  const workflowLabels={new:"Nouveau",in_review:"En cours",resolved:"Clos"};
  const canAssign=canModeration("reports.assign")&&!resolved;
  const canResolve=canModeration("reports.resolve")&&!resolved;
  return `<article class="moderation-report ${resolved?"is-resolved":""} priority-${escapeHtml(report.priority||"normal")}">
    <div class="moderation-report-head">
      <div class="moderation-report-identity">
        <span class="moderation-history-type">${report.type==="chatbox"?"Chat global":"Message privé"}</span>
        <div>
          <strong>${escapeHtml(report.target?.pseudo||"Cible inconnue")}</strong>
          <div class="moderation-report-meta">
            <span>Signalé par ${escapeHtml(report.reporter?.pseudo||"Utilisateur")}</span>
            <span>${report.createdAt?formatCloudDateTime(report.createdAt):"-"}</span>
            <span>${escapeHtml(report.reason||"Aucune raison")}</span>
          </div>
        </div>
      </div>
      <div class="moderation-report-badges"><span class="moderation-priority-badge priority-${escapeHtml(report.priority||"normal")}">${priorityLabels[report.priority]||"Normale"}</span><span class="moderation-state-badge ${resolved?"":"is-ban"}">${workflowLabels[report.workflowStatus]||(resolved?"Clos":"Nouveau")}</span></div>
    </div>
    <div class="moderation-report-owner"><span>Responsable : <strong>${escapeHtml(report.assignedTo?.pseudo||"Non assigné")}</strong></span>${report.updatedAt?`<small>Mis à jour ${formatCloudDateTime(report.updatedAt)}</small>`:""}</div>
    <div class="moderation-report-message">${escapeHtml(report.body||"Message indisponible")}</div>
    ${report.context?.length?`<details class="moderation-report-context"><summary>Contexte de la conversation (${report.context.length} messages)</summary>${report.context.map(line=>`<div class="moderation-report-context-row"><strong>${escapeHtml(line.senderPseudo||"Membre")}</strong><span>${escapeHtml(line.body||"")}<br><small>${line.createdAt?formatCloudDateTime(line.createdAt):""}${line.editedAt?" · modifié":""}</small></span></div>`).join("")}</details>`:""}
    ${report.internalNote?`<div class="moderation-report-note"><strong>Note interne</strong><span>${escapeHtml(report.internalNote)}</span></div>`:""}
    ${resolved?`<div class="moderation-report-decision"><strong>${moderationReportLabel(report.resolutionAction)}</strong> par ${escapeHtml(report.resolvedBy?.pseudo||"Modération")} ${report.resolvedAt?`le ${formatCloudDateTime(report.resolvedAt)}`:""}${report.resolutionNote?`<br>${escapeHtml(report.resolutionNote)}`:""}</div>`:`
      ${canAssign?`<div class="moderation-report-workflow"><select data-report-priority="${report.id}" aria-label="Priorité du signalement">${Object.entries(priorityLabels).map(([value,label])=>`<option value="${value}" ${report.priority===value?"selected":""}>${label}</option>`).join("")}</select><button class="btn btn-blue" type="button" data-report-assign="${report.id}">${report.assignedTo?.pseudo===authState.user?.pseudo?"Assigné à moi":"Me l'assigner"}</button><button class="btn btn-gray" type="button" data-report-note="${report.id}" data-report-note-value="${escapeHtml(report.internalNote||"")}">Note interne</button></div>`:""}
      <div class="moderation-report-actions">
        <div class="moderation-action-group">${canResolve?`<button class="btn btn-gray" type="button" data-report-action="close" data-report-id="${report.id}">Classer sans suite</button>`:""}${report.target?.pseudo&&canModeration("users.view")?`<button class="btn btn-blue" type="button" data-overview-moderate="${escapeHtml(report.target.pseudo)}">Voir le membre</button>`:""}</div>
        ${report.target?.pseudo&&canResolve?`<div class="moderation-action-group">${canModeration("users.warn")?`<button class="btn btn-blue" type="button" data-report-action="warn" data-report-id="${report.id}">Avertir</button>`:""}${canModeration("users.mute")?`<button class="btn btn-orange" type="button" data-report-action="mute1" data-report-id="${report.id}">Mute 1h</button><button class="btn btn-orange" type="button" data-report-action="mute24" data-report-id="${report.id}">Mute 24h</button>`:""}</div>${canModeration("users.ban")?`<div class="moderation-action-group"><button class="btn btn-red" type="button" data-report-action="ban24" data-report-id="${report.id}">Ban 24h</button><button class="btn btn-red" type="button" data-report-action="ban" data-report-id="${report.id}">Ban permanent</button></div>`:""}`:""}
      </div>`}
  </article>`;
}

function moderationLogLabel(type){
  return ({
    login:"Connexion",first_login:"Première connexion",avatar:"Photo de profil",
    account_email:"Email modifié",account_password:"Mot de passe modifié",account_close_requested:"Fermeture demandée",
    private_message:"Message privé",report_chat:"Signalement chat",report_private:"Signalement privé",
    moderation_action:"Sanction",moderation_warn:"Avertissement",moderation_history_delete:"Sanction retirée",
    moderation_history_reset:"Historique vidé",security_settings:"Sécurité modifiée"
  })[type]||moderationActionLabel(type||"log");
}

function moderationLogSection(title,items,empty){
  const needle=moderationLogFilter.trim().toLowerCase();
  const visibleItems=needle ? items.filter(item=>{
    const blob=[
      item.user?.pseudo,
      item.actor?.pseudo,
      item.target?.pseudo,
      item.type,
      item.body,
      item.reason,
      JSON.stringify(item.meta||{})
    ].join(" ").toLowerCase();
    return blob.includes(needle);
  }) : items;
  return `
    <section class="community-profile-card moderation-log-panel">
      <h4>${escapeHtml(title)} <span class="gallery-count-badge">${visibleItems.length}${needle?` / ${items.length}`:""}</span></h4>
      <div class="moderation-log-toolbar">
        <input class="moderation-log-filter" value="${escapeHtml(moderationLogFilter)}" placeholder="Filtrer par pseudo, action, cible...">
      </div>
      <div class="moderation-history">
        ${visibleItems.length?visibleItems.map(item=>`
          <div class="moderation-history-row">
            ${item.user?avatarMarkup(item.user):""}
            <span>
              <strong>${escapeHtml(item.user?.pseudo||item.actor?.pseudo||"Système")}</strong>
              <small>${escapeHtml(moderationLogLabel(item.type))} · ${item.createdAt?formatCloudDateTime(item.createdAt):"-"}</small><br>
              ${escapeHtml(item.body||item.reason||"Action enregistrée.")}
              ${item.meta&&Object.keys(item.meta).length?`<details class="moderation-log-meta"><summary>Détails techniques</summary>${escapeHtml(JSON.stringify(item.meta,null,2))}</details>`:""}
            </span>
            ${item.target?`<small>Cible : ${escapeHtml(item.target.pseudo||"Compte")}</small>`:""}
          </div>
        `).join(""):`<div class="community-profile-empty">${escapeHtml(empty)}</div>`}
      </div>
    </section>
  `;
}

function securitySettingsPanel(settings={}){
  if(authState.user?.role!=="admin")return "";
  return `
    <section class="community-profile-card security-settings-card">
      <h4>Sécurité publique anti-abus</h4>
      <div class="moderation-status-grid">
        <label class="auth-field">Mode
          <select id="securityMode">
            ${["soft","normal","strict"].map(mode=>`<option value="${mode}" ${settings.mode===mode?"selected":""}>${mode}</option>`).join("")}
          </select>
        </label>
        <label class="auth-field">Cooldown succès (s)<input id="securityAchievementCooldown" type="number" min="0" max="3600" value="${Number(settings.achievementCooldownSeconds)||0}"></label>
        <label class="auth-field">Cooldown familier (s)<input id="securityPykurCooldown" type="number" min="0" max="604800" value="${Number(settings.pykurCooldownSeconds)||0}"></label>
        <label class="auth-field">Succès / heure<input id="securityAchievementHour" type="number" min="1" max="100" value="${Number(settings.maxAchievementSharesPerHour)||8}"></label>
        <label class="auth-field">Familiers / jour<input id="securityPykurDay" type="number" min="1" max="20" value="${Number(settings.maxPykurSharesPerDay)||2}"></label>
        <label class="auth-field">Âge mini familier (h)<input id="securityPykurAge" type="number" min="0" max="720" value="${Number(settings.minPykurAgeHours)||0}"></label>
        <label class="privacy-toggle"><input type="checkbox" id="securityAutoShare" ${settings.autoShareEnabled!==false?"checked":""}><span>Partages automatiques autorisés<small>Coupe les annonces publiques si désactivé.</small></span></label>
        <button class="btn btn-orange" id="saveSecuritySettings" type="button">Enregistrer la sécurité</button>
      </div>
    </section>
  `;
}

function renderModerationOverview(payload={}){
  const box=$("#adminModerationOverviewEmbed") || $("#moderationOverviewContent");
  if(!box)return;
  moderationPermissions=payload.permissions||[];
  moderationStaffPermissions=payload.staffPermissions||[];
  const banned=payload.banned||[];
  const muted=payload.muted||[];
  const moderators=payload.moderators||[];
  const users=payload.users||[];
  const reports=payload.reports||[];
  const resolvedReports=payload.resolvedReports||[];
  const metrics=payload.metrics||{};
  const settings=payload.chatSettings||{};
  const securitySettings=payload.securitySettings||{};
  const communityLogs=payload.communityLogs||[];
  const moderationLogs=payload.moderationLogs||[];
  const auditLogs=payload.auditLogs||[];
  const sections=[["dashboard","Vue d'ensemble"]];
  if(canModeration("reports.view"))sections.push(["reports",`Signalements${reports.length?` (${reports.length})`:""}`]);
  if(canModeration("users.view"))sections.push(["accounts","Membres & sanctions"]);
  if(canModeration("logs.view"))sections.push(["logs","Activité"]);
  if(authState.user?.role==="admin"&&canModeration("logs.view"))sections.push(["adminLogs","Journal admin"]);
  if(canModeration("audit.view"))sections.push(["audit","Audit immuable"]);
  if(canModeration("permissions.manage"))sections.push(["permissions","Permissions"]);
  if(canModeration("chat.configure")||canModeration("security.configure"))sections.push(["settings","Réglages"]);
  if(!sections.some(([id])=>id===moderationOverviewSection))moderationOverviewSection="dashboard";
  const reportPool=moderationReportFilter==="open"?reports:moderationReportFilter==="resolved"?resolvedReports:reports.concat(resolvedReports);
  const reportNeedle=moderationReportSearch.trim().toLowerCase();
  const filteredReports=reportPool.filter(report=>{
    if(moderationReportType!=="all" && report.type!==moderationReportType)return false;
    if(!reportNeedle)return true;
    return [report.target?.pseudo,report.reporter?.pseudo,report.reason,report.body,report.resolutionNote].join(" ").toLowerCase().includes(reportNeedle);
  });
  const accountNeedle=moderationAccountSearch.trim().toLowerCase();
  const filteredUsers=users.filter(user=>{
    const matchesSearch=!accountNeedle || [user.pseudo,user.email,user.role].join(" ").toLowerCase().includes(accountNeedle);
    const matchesState=moderationAccountFilter==="all"
      || (moderationAccountFilter==="banned" && user.isBanned)
      || (moderationAccountFilter==="muted" && user.muteUntil)
      || (moderationAccountFilter==="team" && ["moderator","admin"].includes(user.role));
    return matchesSearch&&matchesState;
  });
  box.className="moderation-panel moderation-console";
  box.innerHTML=`
    <section class="moderation-summary-grid">
      <div class="moderation-summary-card ${reports.length?"is-alert":""}"><small>À traiter</small><strong>${reports.length}</strong><span>signalement${reports.length>1?"s":""} ouvert${reports.length>1?"s":""}</span></div>
      <div class="moderation-summary-card ${banned.length?"is-warning":""}"><small>Comptes bannis</small><strong>${banned.length}</strong><span>sanction active</span></div>
      <div class="moderation-summary-card ${muted.length?"is-warning":""}"><small>Comptes mute</small><strong>${muted.length}</strong><span>restriction active</span></div>
      <div class="moderation-summary-card"><small>Activité 24h</small><strong>${Number(metrics.reports24h)||0}</strong><span>nouveaux signalements</span></div>
      <div class="moderation-summary-card"><small>Communauté</small><strong>${Number(metrics.users)||users.length}</strong><span>${Number(metrics.actions24h)||0} action${Number(metrics.actions24h)===1?"":"s"} de modération en 24h</span></div>
    </section>
    <nav class="moderation-tabs">
      ${sections.map(([id,label])=>`<button class="btn btn-gray ${moderationOverviewSection===id?"active":""}" type="button" data-moderation-tab="${id}">${label}</button>`).join("")}
    </nav>
    <div class="moderation-section ${moderationOverviewSection==="dashboard"?"":"hidden"}" data-moderation-section="dashboard">
      <div class="moderation-dashboard-grid">
        <section class="moderation-workspace">
          <div class="moderation-section-heading"><div><h3>File prioritaire</h3><p>Les signalements les plus récents à examiner.</p></div><button class="btn btn-blue" data-moderation-jump="reports">Tout voir</button></div>
          <div class="moderation-report-list">${reports.slice(0,3).map(moderationReportCard).join("")||`<div class="moderation-empty">Aucun signalement en attente.</div>`}</div>
        </section>
        <div class="moderation-quick-list">
          ${moderationQuickAccounts("Bans actifs",banned,"Aucun compte banni.")}
          ${moderationQuickAccounts("Mutes actifs",muted,"Aucun compte mute.")}
          <section class="community-profile-card"><div class="moderation-section-heading"><div><h4>Équipe</h4><p>${moderators.length} membre${moderators.length>1?"s":""}</p></div><button class="btn btn-gray" data-moderation-jump="accounts">Gérer</button></div><div class="moderation-account-state">${moderators.map(user=>`<span class="moderation-state-badge is-team">${escapeHtml(user.pseudo)} · ${authRoleLabel(user.role)}</span>`).join("")}</div></section>
        </div>
      </div>
    </div>
    <div class="moderation-section ${moderationOverviewSection==="reports"?"":"hidden"}" data-moderation-section="reports">
      <section class="moderation-workspace">
        <div class="moderation-section-heading"><div><h3>Signalements</h3><p>Examinez le message, son contexte et la situation du membre avant d'agir.</p></div><span class="gallery-count-badge">${filteredReports.length}</span></div>
        <div class="moderation-toolbar">
          <input id="moderationReportSearch" value="${escapeHtml(moderationReportSearch)}" placeholder="Rechercher un membre, un motif, un message...">
          <select id="moderationReportStatus"><option value="open" ${moderationReportFilter==="open"?"selected":""}>À traiter</option><option value="resolved" ${moderationReportFilter==="resolved"?"selected":""}>Traités récemment</option><option value="all" ${moderationReportFilter==="all"?"selected":""}>Tous</option></select>
          <select id="moderationReportType"><option value="all" ${moderationReportType==="all"?"selected":""}>Tous les canaux</option><option value="chatbox" ${moderationReportType==="chatbox"?"selected":""}>Chat global</option><option value="message prive" ${moderationReportType==="message prive"?"selected":""}>Messages privés</option></select>
          <button class="btn btn-gray" id="refreshModerationOverview">Actualiser</button>
        </div>
        <div class="moderation-report-list">${filteredReports.map(moderationReportCard).join("")||`<div class="moderation-empty">Aucun signalement ne correspond à ces filtres.</div>`}</div>
      </section>
    </div>
    <div class="moderation-section ${moderationOverviewSection==="accounts"?"":"hidden"}" data-moderation-section="accounts">
      <section class="moderation-workspace">
        <div class="moderation-section-heading"><div><h3>Membres et sanctions</h3><p>Recherchez un compte puis ouvrez sa fiche de modération complète.</p></div><span class="gallery-count-badge">${filteredUsers.length}</span></div>
        <div class="moderation-toolbar">
          <input id="moderationAccountSearch" value="${escapeHtml(moderationAccountSearch)}" placeholder="Pseudo, email ou rôle...">
          <select id="moderationAccountFilter"><option value="all" ${moderationAccountFilter==="all"?"selected":""}>Tous les comptes</option><option value="banned" ${moderationAccountFilter==="banned"?"selected":""}>Bannis</option><option value="muted" ${moderationAccountFilter==="muted"?"selected":""}>Mute</option><option value="team" ${moderationAccountFilter==="team"?"selected":""}>Équipe</option></select>
        </div>
        ${moderationAccountRows(filteredUsers)}
      </section>
    </div>
    <div class="moderation-section ${moderationOverviewSection==="logs"?"":"hidden"}" data-moderation-section="logs">
      ${moderationLogSection("Logs utilisateurs",communityLogs,"Aucun log utilisateur récent.")}
    </div>
    <div class="moderation-section ${moderationOverviewSection==="adminLogs"?"":"hidden"}" data-moderation-section="adminLogs">
      ${authState.user?.role==="admin"?moderationLogSection("Logs modération admin",moderationLogs,"Aucun log de modération récent."):""}
    </div>
    <div class="moderation-section ${moderationOverviewSection==="audit"?"":"hidden"}" data-moderation-section="audit">
      ${canModeration("audit.view")?moderationAuditSection(auditLogs):""}
    </div>
    <div class="moderation-section ${moderationOverviewSection==="permissions"?"":"hidden"}" data-moderation-section="permissions">
      ${canModeration("permissions.manage")?moderationPermissionsPanel(payload.permissionCatalog||[],moderationStaffPermissions):""}
    </div>
    <div class="moderation-section ${moderationOverviewSection==="settings"?"":"hidden"}" data-moderation-section="settings">
      <div class="moderation-settings-grid">
        ${canModeration("chat.configure")?`<section class="community-profile-card">
          <div class="moderation-section-heading"><div><h3>Chat global</h3><p>Contrôlez temporairement la publication des messages.</p></div><span class="moderation-state-badge ${settings.locked?"is-ban":""}">${settings.locked?"Fermé":"Ouvert"}</span></div>
          <div class="moderation-status-grid">
            <label class="privacy-toggle"><input type="checkbox" id="moderationChatLocked" ${settings.locked?"checked":""}><span>Fermer la chatbox<small>Les membres ne peuvent plus écrire.</small></span></label>
            <label class="auth-field">Mode lent<input id="moderationSlowMode" type="number" min="0" max="300" value="${Number(settings.slowModeSeconds)||0}" placeholder="Secondes"></label>
            <button class="btn btn-orange" id="saveChatModerationSettings" type="button">Enregistrer</button>
            ${canModeration("chat.clear")?`<button class="btn btn-red" id="clearChatboxMessages" type="button">Vider la chatbox</button>`:""}
          </div>
        </section>`:""}
        ${canModeration("security.configure")?securitySettingsPanel(securitySettings):""}
      </div>
    </div>
  `;
  box.querySelectorAll("[data-moderation-tab]").forEach(button=>{
    button.addEventListener("click",()=>{
      moderationOverviewSection=button.dataset.moderationTab||"reports";
      renderModerationOverview(payload);
    });
  });
  box.querySelectorAll("[data-moderation-jump]").forEach(button=>button.addEventListener("click",()=>{
    moderationOverviewSection=button.dataset.moderationJump||"dashboard";
    renderModerationOverview(payload);
  }));
  box.querySelectorAll(".moderation-log-filter").forEach(input=>{
    input.addEventListener("input",e=>{
      moderationLogFilter=e.target.value||"";
      renderModerationOverview(payload);
      const next=box.querySelector(".moderation-log-filter");
      next?.focus();
      next?.setSelectionRange(next.value.length,next.value.length);
    });
  });
  box.querySelectorAll("[data-overview-moderate]").forEach(button=>{
    if(button.dataset.overviewModerate)button.addEventListener("click",()=>openControlCenterForUser(button.dataset.overviewModerate));
  });
  const rerenderWithFocus=(input,stateSetter)=>input?.addEventListener("input",event=>{
    stateSetter(event.target.value||"");
    renderModerationOverview(payload);
    const next=box.querySelector(`#${input.id}`);
    next?.focus();
    next?.setSelectionRange(next.value.length,next.value.length);
  });
  rerenderWithFocus($("#moderationReportSearch"),value=>moderationReportSearch=value);
  rerenderWithFocus($("#moderationAccountSearch"),value=>moderationAccountSearch=value);
  $("#moderationReportStatus")?.addEventListener("change",event=>{moderationReportFilter=event.target.value;renderModerationOverview(payload);});
  $("#moderationReportType")?.addEventListener("change",event=>{moderationReportType=event.target.value;renderModerationOverview(payload);});
  $("#moderationAccountFilter")?.addEventListener("change",event=>{moderationAccountFilter=event.target.value;renderModerationOverview(payload);});
  $("#refreshModerationOverview")?.addEventListener("click",openModerationOverview);
  $("#saveChatModerationSettings")?.addEventListener("click",saveChatModerationSettings);
  $("#saveSecuritySettings")?.addEventListener("click",saveSecuritySettings);
  $("#clearChatboxMessages")?.addEventListener("click",clearChatboxMessages);
  box.querySelectorAll("[data-report-action]").forEach(button=>button.addEventListener("click",()=>moderationReportAction(button.dataset.reportId,button.dataset.reportAction)));
  box.querySelectorAll("[data-report-priority]").forEach(select=>select.addEventListener("change",()=>updateModerationReport(select.dataset.reportPriority,{priority:select.value,workflowStatus:"in_review"})));
  box.querySelectorAll("[data-report-assign]").forEach(button=>button.addEventListener("click",()=>updateModerationReport(button.dataset.reportAssign,{assignedToUserId:authState.user?.id,workflowStatus:"in_review"})));
  box.querySelectorAll("[data-report-note]").forEach(button=>button.addEventListener("click",()=>editModerationReportNote(button.dataset.reportNote,button.dataset.reportNoteValue||"")));
  box.querySelectorAll("[data-save-staff-permissions]").forEach(button=>button.addEventListener("click",()=>saveStaffPermissions(button.dataset.saveStaffPermissions)));
}

async function updateModerationReport(id,patch){
  try{
    await authFetch(`/moderation/reports/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(patch)});
    toast("Dossier de signalement mis à jour.","success","success");
    openModerationOverview();
  }catch(error){toast(error.message||"Impossible de mettre à jour le dossier.","error","error")}
}

async function editModerationReportNote(id,currentValue){
  const note=await showPrompt("Cette note reste réservée à l'équipe de modération.",{title:"Note interne du dossier",placeholder:"Éléments vérifiés, contexte, suite à donner...",defaultValue:currentValue,okLabel:"Enregistrer"});
  if(note===null)return;
  updateModerationReport(id,{internalNote:note,workflowStatus:"in_review"});
}

async function saveStaffPermissions(userId){
  const card=document.querySelector(`[data-staff-permission-card="${CSS.escape(String(userId))}"]`);
  if(!card)return;
  const permissions=[...card.querySelectorAll('input[type="checkbox"]:checked')].map(input=>input.value);
  try{
    await authFetch(`/admin/staff-permissions/${encodeURIComponent(userId)}`,{method:"PUT",body:JSON.stringify({permissions})});
    toast("Permissions du modérateur enregistrées.","success","success");
    openModerationOverview();
  }catch(error){toast(error.message||"Permissions impossibles à enregistrer.","error","error")}
}

async function saveChatModerationSettings(){
  try{
    const locked=!!$("#moderationChatLocked")?.checked;
    const slowModeSeconds=Math.max(0,Math.min(300,parseInt($("#moderationSlowMode")?.value,10)||0));
    await authFetch("/moderation/chat-settings",{method:"PUT",body:JSON.stringify({locked,slowModeSeconds})});
    toast("Réglages chatbox sauvegardés.","success","success");
    openModerationOverview();
  }catch(error){
    toast(error.message||"Réglages impossibles à sauvegarder.","error","error");
  }
}

async function saveSecuritySettings(){
  try{
    const payload={
      mode:$("#securityMode")?.value||"normal",
      achievementCooldownSeconds:parseInt($("#securityAchievementCooldown")?.value,10)||0,
      pykurCooldownSeconds:parseInt($("#securityPykurCooldown")?.value,10)||0,
      maxAchievementSharesPerHour:parseInt($("#securityAchievementHour")?.value,10)||8,
      maxPykurSharesPerDay:parseInt($("#securityPykurDay")?.value,10)||2,
      minPykurAgeHours:parseInt($("#securityPykurAge")?.value,10)||0,
      autoShareEnabled:!!$("#securityAutoShare")?.checked
    };
    await authFetch("/admin/security-settings",{method:"PUT",body:JSON.stringify(payload)});
    toast("Sécurité anti-abus sauvegardée.","success","success");
    openModerationOverview();
  }catch(error){
    toast(error.message||"Réglages de sécurité impossibles à sauvegarder.","error","error");
  }
}

async function clearChatboxMessages(){
  const ok=await showConfirm("Vider toute la chatbox ?",{
    title:"Vider la chatbox",
    subtitle:"Tous les messages visibles seront supprimés pour les utilisateurs. Cette action ne supprime pas les comptes.",
    okLabel:"Vider",
    okClass:"btn-red"
  });
  if(!ok)return;
  try{
    await authFetch("/moderation/chat/clear",{method:"POST",body:JSON.stringify({})});
    toast("Chatbox vidée.","success","success");
    openModerationOverview();
    if($("#chatboxModal")?.classList.contains("show"))loadChatbox({silent:true});
  }catch(error){
    toast(error.message||"Impossible de vider la chatbox.","error","error");
  }
}

async function moderationReportAction(id,action){
  if(!id || !action)return;
  const labels={close:"Classer sans suite",warn:"Avertir",mute1:"Mute 1h",mute24:"Mute 24h",ban24:"Ban 24h",ban:"Ban permanent"};
  const reason=await showPrompt(action==="close"?"Ajoutez une note de classement si nécessaire.":`Indiquez la raison de la sanction.`,{
    title:labels[action]||"Action sur signalement",
    placeholder:action==="close"?"Note facultative":"Raison courte",
    okLabel:labels[action]||"Appliquer"
  });
  if(reason===null)return;
  try{
    await authFetch(`/moderation/reports/${encodeURIComponent(id)}/action`,{method:"POST",body:JSON.stringify({action,reason})});
    toast(action==="close"?"Signalement fermé.":"Action appliquée depuis le signalement.","success","success");
    openModerationOverview();
  }catch(error){
    toast(error.message||"Action impossible sur ce signalement.","error","error");
  }
}

async function resolveModerationReport(id){
  try{
    await authFetch(`/moderation/reports/${encodeURIComponent(id)}/resolve`,{method:"POST"});
    toast("Signalement résolu.","success","success");
    openModerationOverview();
  }catch(error){
    toast(error.message||"Signalement impossible à résoudre.","error","error");
  }
}

async function loadModerationOverviewPanel(){
  if(!authState.user || !["moderator","admin"].includes(authState.user.role))return;
  const box=$("#adminModerationOverviewEmbed") || $("#moderationOverviewContent");
  if(box)box.innerHTML=`<div class="community-profile-empty">Chargement du tableau de modération...</div>`;
  try{
    const payload=await authFetch("/moderation/overview");
    renderModerationOverview(payload);
  }catch(error){
    if(box)box.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Tableau de modération indisponible.")}</div>`;
  }
}

async function openModerationOverview(){
  if(!authState.user || !["moderator","admin"].includes(authState.user.role))return;
  if($("#livingEventAdmin")?.classList.contains("show")){
    adminConsoleSelectTab("moderation");
    return;
  }
  openControlCenterSection("moderation");
}

async function moderationReason(action,pseudo){
  return showPrompt(`Indiquez une raison courte pour ${pseudo||"ce membre"}.`,{
    title:"Raison de modération",
    placeholder:"Raison courte",
    okLabel:"Continuer"
  });
}

async function runModerationAction(action,userId,pseudo){
  if(!userId)return;
  try{
    let endpoint="";
    let method="POST";
    let body={};
    if(action==="deleteUser"){
      const typed=await showPrompt("",{
        title:"Supprimer le compte",
        subtitle:"Cette action supprime définitivement le compte de la base de données.",
        html:`<p>Pour confirmer la suppression définitive, tapez le pseudo exact :</p><p><strong>${escapeHtml(pseudo)}</strong></p>`,
        placeholder:pseudo,
        okLabel:"Supprimer définitivement",
        danger:true
      });
      if(typed!==pseudo)return toast("Suppression annulée : pseudo différent.","warning","warning");
      const reason=await moderationReason(action,pseudo);
      if(reason===null)return;
      endpoint=`/admin/users/${encodeURIComponent(userId)}`;
      method="DELETE";
      body={reason};
    }else if(action==="roleUser" || action==="roleModerator"){
      const reason=await moderationReason(action,pseudo);
      if(reason===null)return;
      endpoint=`/admin/users/${encodeURIComponent(userId)}/role`;
      body={role:action==="roleModerator"?"moderator":"user",reason};
    }else{
      const reason=await moderationReason(action,pseudo);
      if(reason===null)return;
      const map={
        ban24:{path:"ban",until:moderationUntil(24)},
        banPermanent:{path:"ban",until:null},
        unban:{path:"unban"},
        warn:{path:"warn"},
        mute1:{path:"mute",until:moderationUntil(1)},
        mute24:{path:"mute",until:moderationUntil(24)},
        unmute:{path:"unmute"}
      }[action];
      if(!map)return;
      endpoint=`/moderation/users/${encodeURIComponent(userId)}/${map.path}`;
      body={reason};
      if(map.until)body.until=map.until;
    }
    await authFetch(endpoint,{method,body:JSON.stringify(body)});
    toast(action==="deleteUser"?"Compte supprimé définitivement.":"Action de modération appliquée.","success","success");
    if(action==="deleteUser"){
      closeModal("moderationModal");
      closeModal("communityProfileModal");
      runCommunitySearch();
      return;
    }
    await openModerationPanel(pseudo);
  }catch(error){
    toast(error.message||"Action de modération impossible.","error","error");
  }
}

async function deleteModerationHistoryEntry(id,pseudo){
  const clean=String(id||"");
  if(!clean)return;
  const ok=await showConfirm("Retirer cette ligne d'historique ?",{
    title:"Corriger l'historique",
    subtitle:"Cette action retire uniquement la trace récente affichée dans le profil de modération.",
    okLabel:"Retirer",
    okClass:"btn-red"
  });
  if(!ok)return;
  const endpoint=clean.startsWith("warn-")
    ? `/moderation/warnings/${encodeURIComponent(clean.replace("warn-",""))}`
    : `/moderation/actions/${encodeURIComponent(clean)}`;
  try{
    await authFetch(endpoint,{method:"DELETE"});
    toast("Ligne d'historique retirée.","success","success");
    await openModerationPanel(pseudo);
  }catch(error){
    toast(error.message||"Suppression de l'historique impossible.","error","error");
  }
}

async function resetModerationHistory(userId,pseudo){
  const ok=await showConfirm("Vider l'historique récent de ce membre ?",{
    title:"Réinitialiser l'historique",
    subtitle:"Les sanctions actives ne sont pas retirées automatiquement. Cette action nettoie seulement les traces récentes et les avertissements.",
    okLabel:"Vider",
    okClass:"btn-red"
  });
  if(!ok)return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(userId)}/history`,{method:"DELETE"});
    toast("Historique récent vidé.","success","success");
    await openModerationPanel(pseudo);
  }catch(error){
    toast(error.message||"Impossible de vider l'historique.","error","error");
  }
}

function renderCommunitySocialActions(container,pseudo,social={}){
  if(!container)return;
  if(!authState.user){
    container.innerHTML=`<button class="btn btn-blue" type="button" data-social-login>Se connecter pour ajouter</button>`;
    container.querySelector("[data-social-login]")?.addEventListener("click",()=>authOpen("login"));
    return;
  }
  if(social.isSelf || social.status==="self"){
    container.innerHTML=`<span class="community-profile-summary-item"><small>Profil</small>Votre compte</span>`;
    return;
  }
  const messageButton=socialActionButton({asset:"message%20prive.png",title:"Message privé",description:"Ouvrir une conversation privée avec ce membre.",className:"btn-green",attributes:`data-social-message="${escapeHtml(pseudo||"")}"`});
  const removeButton=socialActionButton({asset:"retirerami.png",title:"Retirer des amis",description:"Retirer ce membre de votre liste d'amis.",className:"btn-red",attributes:'data-social-action="remove"'});
  if(social.status==="friends"){
    container.innerHTML=`${social.canMessage?messageButton:""}${removeButton}`;
  }else if(social.status==="pending_sent"){
    container.innerHTML=`<span class="community-profile-summary-item"><small>Demande</small>Envoyée</span>${removeButton}`;
  }else if(social.status==="pending_received"){
    container.innerHTML=`<button class="btn btn-green" type="button" data-social-action="accept">Accepter</button><button class="btn btn-gray" type="button" data-social-action="reject">Refuser</button>`;
  }else{
    container.innerHTML=socialActionButton({asset:"ajouterami.png",title:"Ajouter en ami",description:"Envoyer une demande d'ami à ce membre.",attributes:'data-social-action="request"'});
  }
  container.querySelectorAll("[data-social-action]").forEach(button=>{
    button.addEventListener("click",()=>communitySocialAction(pseudo,button.dataset.socialAction));
  });
  container.querySelector("[data-social-message]")?.addEventListener("click",()=>openMessagesPanel(pseudo));
}

async function communitySocialAction(pseudo,action){
  if(!authState.user)return authOpen("login");
  const clean=(pseudo||"").trim();
  if(!clean)return;
  const method=action==="remove"?"DELETE":"POST";
  const suffix=action==="remove"?"":`/${action}`;
  try{
    await authFetch(`/social/friends/${encodeURIComponent(clean)}${suffix}`,{method});
    const messages={
      request:"Demande d'ami envoyée.",
      accept:"Demande d'ami acceptée.",
      reject:"Demande d'ami refusée.",
      remove:"Relation d'ami retirée."
    };
    toast(messages[action]||"Action effectuée.","success","success");
    await openCommunityProfileByPseudo(clean);
    if($("#friendsModal")?.classList.contains("show"))loadFriendsPanel();
    refreshFriendSummary({silent:true});
  }catch(error){
    toast(error.message||"Action sociale impossible.","error","error");
  }
}

function updateSocialStateFromFriends(payload={}){
  socialState.friends=(payload.friends||[]).length;
  socialState.incoming=(payload.incoming||[]).length;
  socialState.outgoing=(payload.outgoing||[]).length;
  socialState.loaded=true;
}

function moderationAuditSection(items=[]){
  const needle=moderationLogFilter.trim().toLowerCase();
  const visible=needle?items.filter(item=>[item.action,item.actor?.pseudo,item.target?.pseudo,item.entityType,item.entityId,JSON.stringify(item.details||{})].join(" ").toLowerCase().includes(needle)):items;
  return `<section class="community-profile-card moderation-log-panel audit-log-panel">
    <div class="moderation-section-heading"><div><h3>Journal d'audit immuable</h3><p>Les actions sensibles sont conservées côté serveur et ne peuvent être ni modifiées ni supprimées.</p></div><span class="gallery-count-badge">${visible.length}</span></div>
    <div class="moderation-log-toolbar"><input class="moderation-log-filter" value="${escapeHtml(moderationLogFilter)}" placeholder="Filtrer par acteur, cible, action ou identifiant..."></div>
    <div class="moderation-history">${visible.length?visible.map(item=>`<article class="moderation-history-row audit-log-row"><span><strong>${escapeHtml(item.action||"Action")}</strong><small>${item.createdAt?formatCloudDateTime(item.createdAt):"-"} · ${escapeHtml(item.actor?.pseudo||"Système")}${item.target?.pseudo?` → ${escapeHtml(item.target.pseudo)}`:""}</small><br><span>${escapeHtml(item.entityType||"système")}${item.entityId?` #${escapeHtml(item.entityId)}`:""}</span>${item.details&&Object.keys(item.details).length?`<details class="moderation-log-meta"><summary>Contexte enregistré</summary>${escapeHtml(JSON.stringify(item.details,null,2))}</details>`:""}</span><small>${item.requestId?`Requête ${escapeHtml(item.requestId)}`:"Trace serveur"}</small></article>`).join(""):`<div class="moderation-empty">Aucune action sensible enregistrée.</div>`}</div>
  </section>`;
}

function moderationPermissionsPanel(catalog=[],staff=[]){
  const groups=[...new Set(catalog.map(permission=>permission.group))];
  return `<section class="moderation-workspace permissions-workspace">
    <div class="moderation-section-heading"><div><h3>Permissions détaillées</h3><p>Les droits des modérateurs peuvent être adaptés sans leur donner les pouvoirs d'un administrateur.</p></div></div>
    <div class="staff-permission-list">${staff.map(member=>`<article class="staff-permission-card" data-staff-permission-card="${member.id}">
      <header>${avatarMarkup(member)}<span><strong>${escapeHtml(member.pseudo)}</strong><small>${authRoleLabel(member.role)}${member.editable?" · personnalisable":" · droits complets"}</small></span>${member.editable?`<button class="btn btn-blue" type="button" data-save-staff-permissions="${member.id}">Enregistrer</button>`:`<span class="moderation-state-badge is-team">Administrateur</span>`}</header>
      <div class="permission-group-grid">${groups.map(group=>`<fieldset><legend>${escapeHtml(group)}</legend>${catalog.filter(permission=>permission.group===group).map(permission=>`<label class="permission-toggle"><input type="checkbox" value="${escapeHtml(permission.id)}" ${member.permissions.includes(permission.id)?"checked":""} ${member.editable?"":"disabled"}><span><strong>${escapeHtml(permission.label)}</strong><small>${escapeHtml(permission.description)}</small></span></label>`).join("")}</fieldset>`).join("")}</div>
    </article>`).join("")||`<div class="moderation-empty">Aucun membre du staff.</div>`}</div>
  </section>`;
}

function notifyIncomingFriendRequests(payload={}){
  const incoming=Array.isArray(payload.incoming)?payload.incoming:[];
  if(!incoming.length)return;
  const seen=new Set(socialState.seenIncoming||[]);
  const fresh=incoming.filter(item=>{
    const key=`${String(item?.user?.pseudo||"").toLowerCase()}|${item?.createdAt||""}`;
    item.__notificationKey=key;
    return key && !seen.has(key);
  });
  if(!fresh.length)return;
  fresh.forEach(item=>seen.add(item.__notificationKey));
  socialState.seenIncoming=Array.from(seen).slice(-100);
  localStorage.setItem(socialNotificationKey("pykur_friend_requests_seen"),JSON.stringify(socialState.seenIncoming));
  const names=fresh.map(item=>item?.user?.pseudo).filter(Boolean);
  const message=names.length===1
    ? `${names[0]} vous a envoyé une demande d'ami.`
    : `${names.length} nouvelles demandes d'ami sont en attente.`;
  toast(message,"info","notification");
}

async function refreshFriendSummary(options={}){
  if(!authState.user){
    socialState.friends=0;
    socialState.incoming=0;
    socialState.outgoing=0;
    socialState.loaded=false;
    authRender();
    return null;
  }
  try{
    const payload=await authFetch("/social/friends");
    updateSocialStateFromFriends(payload);
    notifyIncomingFriendRequests(payload);
    authRender();
    return payload;
  }catch(error){
    if(!options.silent)toast(error.message||"Résumé des amis indisponible.","warning","warning");
    return null;
  }
}

function friendRow(item,actions=[]){
  const user=item?.user||{};
  return `
    <article class="friend-row role-${escapeHtml(user.role||"user")}">
      ${avatarMarkup(user,"chat-avatar friend-avatar")}
      <div>
        <strong>${escapeHtml(user.pseudo||"Utilisateur")}</strong>
        <small>${authRoleLabel(user.role)} · inscrit le ${user.createdAt?formatDateShort(user.createdAt):"date inconnue"}</small>
        ${memberStatusMarkup(user)}
      </div>
      <div class="friend-row-actions">
        ${socialActionButton({asset:"voir.png",title:"Voir le profil",description:"Consulter le profil communautaire de ce membre.",attributes:`data-friend-view="${escapeHtml(user.pseudo||"")}"`})}
        ${actions.map(action=>action.action==="message"
          ? socialActionButton({asset:"message%20prive.png",title:"Message privé",description:"Ouvrir une conversation privée avec cet ami.",className:action.className,attributes:`data-friend-message="${escapeHtml(user.pseudo||"")}"`})
          : action.action==="remove"
            ? socialActionButton({asset:"retirerami.png",title:action.label||"Retirer",description:action.label==="Annuler"?"Annuler cette demande d'ami.":"Retirer ce membre de votre liste d'amis.",className:action.className,attributes:`data-friend-action="${action.action}" data-friend-pseudo="${escapeHtml(user.pseudo||"")}"`})
            : `<button class="btn ${action.className}" type="button" data-friend-action="${action.action}" data-friend-pseudo="${escapeHtml(user.pseudo||"")}">${action.label}</button>`
        ).join("")}
      </div>
    </article>
  `;
}

function friendsSection(title,items,empty,actions=[]){
  return `
    <section class="friends-section">
      <h3>${title}</h3>
      ${items.length?items.map(item=>friendRow(item,actions)).join(""):`<div class="community-profile-empty">${empty}</div>`}
    </section>
  `;
}

async function loadFriendsPanel(){
  const box=$("#friendsContent");
  if(!box)return;
  if(!authState.user){
    box.innerHTML=`<div class="community-profile-empty">Connectez-vous pour gérer vos amis.</div>`;
    return;
  }
  box.innerHTML=`<div class="community-profile-empty">Chargement des amis...</div>`;
  try{
    const data=await authFetch("/social/friends");
    updateSocialStateFromFriends(data);
    authRender();
    box.innerHTML=[
      friendsSection("Demandes reçues",data.incoming||[],"Aucune demande reçue.",[
        {action:"accept",label:"Accepter",className:"btn-green"},
        {action:"reject",label:"Refuser",className:"btn-gray"}
      ]),
      friendsSection("Demandes envoyées",data.outgoing||[],"Aucune demande envoyée.",[
        {action:"remove",label:"Annuler",className:"btn-red"}
      ]),
      friendsSection("Amis",data.friends||[],"Aucun ami pour le moment.",[
        {action:"message",label:"Message",className:"btn-green"},
        {action:"remove",label:"Retirer",className:"btn-red"}
      ])
    ].join("");
    box.querySelectorAll("[data-friend-view]").forEach(button=>{
      button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.friendView,{updateUrl:true}));
    });
    box.querySelectorAll("[data-friend-action]").forEach(button=>{
      button.addEventListener("click",()=>communitySocialAction(button.dataset.friendPseudo,button.dataset.friendAction));
    });
    box.querySelectorAll("[data-friend-message]").forEach(button=>{
      button.addEventListener("click",()=>{
        closeModal("friendsModal");
        openMessagesPanel(button.dataset.friendMessage);
      });
    });
  }catch(error){
    box.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Liste d'amis indisponible.")}</div>`;
  }
}

function openFriendsPanel(){
  if(!authState.user)return authOpen("login");
  openModal("friendsModal");
  loadFriendsPanel();
}

function renderMessagesList(){
  const list=$("#messagesConversationList");
  if(!list)return;
  if(!messageState.conversations.length){
    list.innerHTML=`<div class="community-profile-empty">Aucune conversation pour le moment. Ouvrez un profil ami pour envoyer un premier message.</div>`;
    return;
  }
  list.innerHTML=messageState.conversations.map(item=>{
    const pseudo=item.other?.pseudo||"Utilisateur";
    const preview=item.lastMessage?.body ? item.lastMessage.body : "Aucun message encore.";
    return `
      <div class="message-conversation-row">
        <button class="message-conversation ${messageState.activePseudo===pseudo?"active":""} ${item.unread?"unread":""}" type="button" data-message-pseudo="${escapeHtml(pseudo)}">
          <span class="message-conversation-main">
            ${avatarMarkup(item.other,"chat-avatar message-conversation-avatar")}
            <span class="message-conversation-copy">
              <strong>${escapeHtml(pseudo)}</strong>
              ${memberStatusMarkup(item.other)}
              <small>${item.unread?"Nouveau · ":""}${escapeHtml(preview.slice(0,90))}${preview.length>90?"...":""}</small>
            </span>
          </span>
        </button>
        ${socialActionButton({asset:"voir.png",title:"Voir le profil",description:`Consulter le profil communautaire de ${pseudo}.`,className:"btn-gray message-profile-open",attributes:`data-message-profile="${escapeHtml(pseudo)}"`})}
      </div>
    `;
  }).join("");
  list.querySelectorAll("[data-message-pseudo]").forEach(button=>{
    button.addEventListener("click",()=>loadMessageThread(button.dataset.messagePseudo));
  });
  list.querySelectorAll("[data-message-profile]").forEach(button=>{
    button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.messageProfile,{updateUrl:true}));
  });
}

function resetMessageCompose(disabled=true){
  const input=$("#messageComposeInput");
  const button=$("#messageComposeForm button[type='submit']");
  if(input)input.disabled=disabled;
  if(button)button.disabled=disabled;
}

function renderMessageThread(payload=null){
  const head=$("#messagesThread .messages-thread-head");
  const feed=$("#messagesFeed");
  const conversation=payload?.conversation;
  if(!head || !feed)return;
  if(!conversation){
    head.innerHTML=`<strong>Conversation</strong><small>Sélectionnez un ami pour commencer.</small>`;
    feed.innerHTML=`<div class="community-profile-empty">Aucune conversation sélectionnée.</div>`;
    resetMessageCompose(true);
    return;
  }
  const pseudo=conversation.other?.pseudo||messageState.activePseudo||"Utilisateur";
  head.innerHTML=`<button class="messages-thread-profile" type="button" data-thread-profile="${escapeHtml(pseudo)}" aria-label="Voir le profil de ${escapeHtml(pseudo)}">${avatarMarkup(conversation.other,"chat-avatar")}<span><strong>${escapeHtml(pseudo)}</strong><small>Messages privés entre amis · cliquez pour voir le profil.</small></span></button>`;
  head.querySelector("[data-thread-profile]")?.addEventListener("click",()=>openCommunityProfileByPseudo(pseudo,{updateUrl:true}));
  const messages=conversation.messages||[];
  feed.innerHTML=messages.length ? messages.map(item=>`
    <div class="message-bubble ${item.isMine?"mine":""}">
      ${escapeHtml(item.body)}
      <small>${escapeHtml(item.sender?.pseudo||"Utilisateur")} · ${formatCloudDateTime(item.createdAt)}${item.editedAt?" · modifié":""}</small>
      <div class="message-actions">
        ${item.isMine?`<button class="btn btn-blue" type="button" data-private-edit="${item.id}">Modifier</button><button class="btn btn-red" type="button" data-private-delete="${item.id}">Supprimer</button>`:`<button class="btn btn-orange" type="button" data-private-report="${item.id}">Report</button>`}
      </div>
    </div>
  `).join("") : `<div class="community-profile-empty">Aucun message dans cette conversation.</div>`;
  feed.querySelectorAll("[data-private-edit]").forEach(button=>button.addEventListener("click",()=>editPrivateMessage(button.dataset.privateEdit)));
  feed.querySelectorAll("[data-private-delete]").forEach(button=>button.addEventListener("click",()=>deletePrivateMessage(button.dataset.privateDelete)));
  feed.querySelectorAll("[data-private-report]").forEach(button=>button.addEventListener("click",()=>reportPrivateMessage(button.dataset.privateReport)));
  feed.scrollTop=feed.scrollHeight;
  resetMessageCompose(false);
}

async function loadMessagesList(){
  const list=$("#messagesConversationList");
  if(list)list.innerHTML=`<div class="community-profile-empty">Chargement des conversations...</div>`;
  try{
    const result=await authFetch("/social/messages");
    messageState.conversations=result.conversations||[];
    messageState.unread=Number(result.unreadCount)||messageState.conversations.filter(item=>item.unread).length;
    authRender();
    renderMessagesList();
  }catch(error){
    if(list)list.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Messages indisponibles.")}</div>`;
  }
}

function stopMessagePolling(){
  if(messageState.timer){
    clearInterval(messageState.timer);
    messageState.timer=null;
  }
  if(chatState.pingTimer){
    clearInterval(chatState.pingTimer);
    chatState.pingTimer=null;
  }
  if(adminCommandTimer){
    clearInterval(adminCommandTimer);
    adminCommandTimer=null;
  }
}

let adminCommandTimer=null;
const processedAdminCommands=new Set();

function adminResetGalleryCommand(){
  const empty=clone(defaultData().gallery);
  const removedPykurs={};
  const removedEvents={};
  adminGallerySources().forEach(source=>{
    (source.completedPykurs||[]).forEach(item=>{if(item?.id)removedPykurs[item.id]=new Date().toISOString()});
    Object.keys(source.eventsDiscovered||{}).forEach(id=>removedEvents[id]=new Date().toISOString());
  });
  empty.removedPykurs=removedPykurs;
  empty.removedEvents=removedEvents;
  store.sharedGallery=clone(empty);
  Object.values(store.profiles||{}).forEach(profile=>{if(profile?.data)profile.data.gallery=clone(empty)});
  data.gallery=clone(empty);
}

function adminResetAchievementsCommand(){
  const empty=clone(defaultData().achievements);
  const removedUnlocked={};
  adminAchievementSources().forEach(source=>Object.keys(source.unlocked||{}).forEach(id=>removedUnlocked[id]=new Date().toISOString()));
  empty.removedUnlocked=removedUnlocked;
  store.sharedAchievements=clone(empty);
  Object.values(store.profiles||{}).forEach(profile=>{if(profile?.data)profile.data.achievements=clone(empty)});
  data.achievements=clone(empty);
}

function adminResetProfileCommand(profileId){
  const profile=store.profiles?.[profileId];
  if(!profile?.data)return;
  const previous=profile.data;
  const fresh=defaultData();
  fresh.settings=clone(previous.settings||fresh.settings);
  fresh.achievements=clone(previous.achievements||fresh.achievements);
  fresh.gallery=clone(previous.gallery||fresh.gallery);
  fresh.dofusDetection=clone(previous.dofusDetection||fresh.dofusDetection);
  fresh.createdAt=new Date().toISOString();
  profile.data=fresh;
  if(profileId===activeProfile)data=clone(fresh);
}

function adminDeleteProfileCommand(profileId){
  if(!store.profiles?.[profileId])return;
  if(Object.keys(store.profiles).length<=1)throw new Error("Le dernier profil ne peut pas être supprimé.");
  store.deletedProfiles=Object.assign({},store.deletedProfiles||{});
  store.deletedProfiles[profileId]=new Date().toISOString();
  delete store.profiles[profileId];
  if(activeProfile===profileId){
    activeProfile=Object.keys(store.profiles)[0];
    store.active=activeProfile;
    data=clone(store.profiles[activeProfile].data);
  }
}

function adminRenameProfileCommand(profileId,name){
  const profile=store.profiles?.[profileId];
  if(!profile)return;
  profile.name=String(name||"").trim().slice(0,80)||profile.name;
}

function adminGallerySources(){
  const sources=[];
  if(store.sharedGallery)sources.push(store.sharedGallery);
  Object.values(store.profiles||{}).forEach(profile=>{if(profile?.data?.gallery)sources.push(profile.data.gallery)});
  return sources;
}

function adminAchievementSources(){
  const sources=[];
  if(store.sharedAchievements)sources.push(store.sharedAchievements);
  Object.values(store.profiles||{}).forEach(profile=>{if(profile?.data?.achievements)sources.push(profile.data.achievements)});
  return sources;
}

function adminRemoveAchievementCommand(id){
  adminAchievementSources().forEach(source=>{
    delete source.unlocked?.[id];
    source.removedUnlocked=Object.assign({},source.removedUnlocked||{},{[id]:new Date().toISOString()});
  });
}

function adminRemoveGalleryEventCommand(id){
  adminGallerySources().forEach(source=>{
    delete source.eventsDiscovered?.[id];
    source.removedEvents=Object.assign({},source.removedEvents||{},{[id]:new Date().toISOString()});
  });
}

function adminRemoveGalleryPykurCommand(id){
  adminGallerySources().forEach(source=>{
    source.completedPykurs=(source.completedPykurs||[]).filter(item=>String(item?.id||"")!==String(id)).map((item,index)=>({...item,number:index+1}));
    source.removedPykurs=Object.assign({},source.removedPykurs||{},{[id]:new Date().toISOString()});
  });
}

async function executeAdminCommand(command){
  if(!command?.id || processedAdminCommands.has(command.id))return;
  processedAdminCommands.add(command.id);
  let ok=true;
  let message="Commande exécutée.";
  let logoutAfterAck=false;
  try{
    const payload=command.payload||{};
    if(command.type==="notification"){
      toast(payload.message||"Message de l'équipe.",payload.level||"info",payload.sound||"click");
      message="Notification affichée.";
    }else if(command.type==="popup-message"){
      await showDialog(payload.message||"Message de l'équipe.",{type:"alert",title:"Message de l'équipe",subtitle:"Cette information vous a été adressée personnellement.",okLabel:"J'ai compris"});
      message="Popup affichée.";
    }else if(command.type==="kick"){
      await showDialog(payload.message||"Votre session a été interrompue par l'équipe de modération.",{type:"alert",title:"Session interrompue",subtitle:"Vous allez être déconnecté du compte cloud.",danger:true,okLabel:"Fermer"});
      logoutAfterAck=true;
      message="Utilisateur déconnecté.";
    }else if(command.type==="living-event"){
      if(!livingStart(payload.eventId,{admin:true,replay:true}))throw new Error("Événement indisponible dans cet affichage.");
      message="Événement ciblé lancé.";
    }else if(command.type==="reset-gallery"){
      adminResetGalleryCommand();
      save();renderGallery();
      toast("Votre galerie a été réinitialisée par un administrateur.","warning","warning");
    }else if(command.type==="reset-achievements"){
      adminResetAchievementsCommand();
      save();renderAchievements();renderHiddenSecretEgg();
      toast("Vos succès ont été réinitialisés par un administrateur.","warning","warning");
    }else if(command.type==="reset-profile" || command.type==="reset-pykur"){
      adminResetProfileCommand(payload.profileId);
      ensureData();save();renderProfiles();renderAll();
      toast("Un profil familier a été réinitialisé par un administrateur.","warning","warning");
    }else if(command.type==="delete-profile"){
      adminDeleteProfileCommand(payload.profileId);
      ensureData();save();renderProfiles();renderAll();
      toast("Un profil familier a été supprimé par un administrateur.","warning","warning");
    }else if(command.type==="rename-profile"){
      adminRenameProfileCommand(payload.profileId,payload.name);
      save();renderProfiles();renderAll();
      toast("Un profil familier a été renommé par un administrateur.","info","click");
    }else if(command.type==="remove-achievement"){
      adminRemoveAchievementCommand(payload.achievementId);
      save();renderAchievements();renderHiddenSecretEgg();
      toast("Un succès a été retiré par un administrateur.","warning","warning");
    }else if(command.type==="remove-gallery-event"){
      adminRemoveGalleryEventCommand(payload.eventId);
      save();renderGallery();
      toast("Un événement a été retiré de votre galerie.","warning","warning");
    }else if(command.type==="remove-gallery-pykur"){
      adminRemoveGalleryPykurCommand(payload.pykurId);
      save();renderGallery();
      toast("Un familier archivé a été retiré de votre galerie.","warning","warning");
    }else if(command.type==="recalculate-achievements"){
      recalculateAchievements({silent:true});
      message="Succès recalculés.";
    }else if(command.type==="repair-progression"){
      ensureData();save();renderAll();
      message="Progression normalisée et recalculée.";
    }else{
      throw new Error("Commande administrative inconnue.");
    }
    if(authState.user && !["notification","popup-message","kick","living-event"].includes(command.type))await cloudSyncNow({silent:true});
  }catch(error){
    ok=false;
    message=error.message||"Échec de la commande.";
  }
  try{
    await authFetch(`/account/admin-commands/${encodeURIComponent(command.id)}/complete`,{method:"POST",body:JSON.stringify({ok,message})});
    if(logoutAfterAck)authLogout();
  }catch(error){
    processedAdminCommands.delete(command.id);
    console.warn("Confirmation de commande administrative reportée",error?.message||error);
  }
}

async function pollAdminCommands(){
  if(!authState.user)return;
  try{
    const result=await authFetch("/account/admin-commands");
    for(const command of result.commands||[])await executeAdminCommand(command);
  }catch(error){
    if(!isTransientApiError(error))console.warn("Commandes administratives indisponibles",error?.message||error);
  }
}

async function refreshMessageNotifications({silent=false}={}){
  if(!authState.user || messageState.refreshing)return;
  messageState.refreshing=true;
  try{
    const result=await authFetch("/social/messages");
    messageState.conversations=result.conversations||[];
    const unread=messageState.conversations.filter(item=>item.unread);
    messageState.unread=Number(result.unreadCount)||unread.length;
    const newest=unread
      .slice()
      .sort((a,b)=>Number(b.lastMessage?.id||0)-Number(a.lastMessage?.id||0))[0];
    const newestId=Number(newest?.lastMessage?.id||0);
    if(newest && !silent && newestId>messageState.lastNotifiedId){
      messageState.lastNotifiedId=newestId;
      localStorage.setItem(socialNotificationKey("pykur_messages_notified_id"),String(messageState.lastNotifiedId));
      toast(`Nouveau message privé de ${newest.other?.pseudo||"un membre"}.`,"info","click");
    }
    authRender();
    if($("#messagesModal")?.classList.contains("show")){
      renderMessagesList();
      if(messageState.activePseudo)await loadMessageThread(messageState.activePseudo,{silent:true,preserveScroll:true});
    }
  }catch(error){
    if(!silent && !isTransientApiError(error))toast(error.message||"Messages indisponibles.","error","error");
    else if(isTransientApiError(error))console.warn("[API] Rafraîchissement des messages reporté",error.requestId||error.code||error.message);
  }finally{
    messageState.refreshing=false;
  }
}

function startSocialPolling(){
  stopMessagePolling();
  if(!authState.user)return;
  refreshMessageNotifications({silent:true});
  refreshChatPingNotifications({silent:true});
  refreshWarningNotifications({silent:true});
  refreshFriendSummary({silent:true});
  refreshAccountSnapshot({silent:true});
  pollAdminCommands();
  messageState.timer=setInterval(()=>{if(!document.hidden)refreshMessageNotifications()},performancePollingDelay(3000,7000));
  chatState.pingTimer=setInterval(()=>{
    refreshChatPingNotifications();
    refreshWarningNotifications();
    refreshFriendSummary({silent:true});
    if(Date.now()-Number(authState.lastSnapshotAt||0)>10000)refreshAccountSnapshot({silent:true});
  },performancePollingDelay(5000,10000));
  adminCommandTimer=setInterval(()=>{if(!document.hidden)pollAdminCommands()},performancePollingDelay(3000,7000));
}

async function refreshAccountSnapshot({silent=false}={}){
  if(!authState.token || authState.snapshotRefreshing)return;
  authState.snapshotRefreshing=true;
  try{
    const previousRole=authState.user?.role||"";
    const result=await authFetch("/auth/me");
    authState.lastSnapshotAt=Date.now();
    authState.user=result.user;
    if(previousRole && previousRole!==result.user?.role){
      moderationPermissions=[];
      toast(`Votre rôle est maintenant ${authRoleLabel(result.user?.role)}.`,"info","success");
    }
    authRender();
    if($("#livingEventAdmin")?.classList.contains("show"))loadAdminConsole();
  }catch(error){
    if([401,403].includes(Number(error?.status||0))){
      authLogout();
      return;
    }
    if(!silent && !isTransientApiError(error))toast(error.message||"Session indisponible.","error","error");
  }finally{
    authState.snapshotRefreshing=false;
  }
}

async function loadMessageThread(pseudo,{silent=false,preserveScroll=false}={}){
  const clean=(pseudo||"").trim();
  if(!clean)return;
  const requestId=++messageState.threadRequest;
  messageState.activePseudo=clean;
  renderMessagesList();
  const feed=$("#messagesFeed");
  const previousScroll=feed ? feed.scrollTop : 0;
  if(feed && !silent)feed.innerHTML=`<div class="community-profile-empty">Chargement de la conversation...</div>`;
  if(!silent)resetMessageCompose(true);
  try{
    const result=await authFetch(`/social/messages/${encodeURIComponent(clean)}`);
    if(requestId!==messageState.threadRequest || messageState.activePseudo!==clean)return;
    renderMessageThread(result);
    if(preserveScroll && feed)feed.scrollTop=previousScroll;
  }catch(error){
    if(requestId===messageState.threadRequest && messageState.activePseudo===clean && feed)feed.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Conversation indisponible.")}</div>`;
  }
}

async function sendPrivateMessage(event){
  event.preventDefault();
  if(!authState.user)return authOpen("login");
  const pseudo=messageState.activePseudo;
  const input=$("#messageComposeInput");
  const body=(input?.value||"").trim();
  if(!pseudo || !body)return;
  try{
    await authFetch(`/social/messages/${encodeURIComponent(pseudo)}`,{method:"POST",body:JSON.stringify({body})});
    unlockAchievement("private_message");
    if(input)input.value="";
    await loadMessagesList();
    await loadMessageThread(pseudo);
  }catch(error){
    toast(error.message||"Message impossible à envoyer.","error","error");
  }
}

async function editPrivateMessage(id){
  const pseudo=messageState.activePseudo;
  if(!pseudo || !id)return;
  const current=[...$("#messagesFeed")?.querySelectorAll(`[data-private-edit="${CSS.escape(String(id))}"]`)||[]][0]?.closest(".message-bubble")?.childNodes?.[0]?.textContent?.trim()||"";
  const body=await showMessageEditor(current,1000);
  if(body===null)return;
  try{
    await authFetch(`/social/messages/${encodeURIComponent(pseudo)}/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({body})});
    await loadMessageThread(pseudo);
    await loadMessagesList();
  }catch(error){
    toast(error.message||"Modification impossible.","error","error");
  }
}

async function deletePrivateMessage(id){
  const pseudo=messageState.activePseudo;
  if(!pseudo || !id)return;
  try{
    await authFetch(`/social/messages/${encodeURIComponent(pseudo)}/${encodeURIComponent(id)}`,{method:"DELETE"});
    await loadMessageThread(pseudo);
    await loadMessagesList();
  }catch(error){
    toast(error.message||"Suppression impossible.","error","error");
  }
}

async function reportPrivateMessage(id){
  const pseudo=messageState.activePseudo;
  if(!pseudo || !id)return;
  const reason=await showPrompt("Pourquoi signaler ce message privé ?",{
    title:"Signaler le message",
    placeholder:"Raison courte",
    okLabel:"Signaler"
  });
  if(reason===null)return;
  try{
    await authFetch(`/social/messages/${encodeURIComponent(pseudo)}/${encodeURIComponent(id)}/report`,{method:"POST",body:JSON.stringify({reason})});
    toast("Signalement envoyé à la modération.","success","success");
  }catch(error){
    toast(error.message||"Signalement impossible.","error","error");
  }
}

async function openMessagesPanel(pseudo=null){
  if(!authState.user)return authOpen("login");
  openModal("messagesModal");
  try{await authFetch("/social/messages/read-all",{method:"POST"})}catch(error){}
  await loadMessagesList();
  messageState.unread=0;
  authRender();
  const clean=(pseudo||messageState.activePseudo||"").trim();
  if(clean)await loadMessageThread(clean);
  else renderMessageThread(null);
}

function renderChatbox({forceBottom=false}={}){
  const feed=$("#chatboxFeed");
  const online=$("#chatboxOnlineList");
  const stateLabel=$("#chatboxStateLabel");
  if(stateLabel){
    stateLabel.textContent=chatState.settings?.locked ? "Chat fermé" : (Number(chatState.settings?.slowModeSeconds)>0 ? `Mode lent ${chatState.settings.slowModeSeconds}s` : "Chat ouvert");
    stateLabel.classList.toggle("online",!chatState.settings?.locked);
    stateLabel.classList.toggle("offline",!!chatState.settings?.locked);
  }
  const chatLocked=!!chatState.settings?.locked && !["moderator","admin"].includes(authState.user?.role);
  const chatInput=$("#chatboxInput");
  const chatSubmit=$("#chatboxComposeForm button[type='submit']");
  if(chatInput){
    chatInput.disabled=chatLocked;
    chatInput.placeholder=chatLocked?"La chatbox est temporairement fermée par la modération.":"Écrire dans le chat global...";
  }
  if(chatSubmit)chatSubmit.disabled=chatLocked;
  if(feed){
    const previousScrollTop=feed.scrollTop;
    const previousScrollHeight=feed.scrollHeight;
    const wasNearBottom=previousScrollHeight-feed.clientHeight-previousScrollTop<=80;
    const visible=chatState.messages.filter(item=>{
      const isShare=item.type==="achievement" || item.type==="pykur" || item.meta?.system;
      if(chatState.hideShares && isShare)return false;
      if(chatState.hideText && item.type==="message" && !item.meta?.system)return false;
      return true;
    });
    feed.innerHTML=visible.length ? visible.map(item=>{
      const sender=item.sender||{};
      const system=item.type==="achievement" || item.type==="pykur";
      const canModerate=["moderator","admin"].includes(authState.user?.role);
      const canOwn=item.isMine;
      const canEditOwn=canOwn && item.type==="message";
      return `
        <article class="chat-message ${system?"system":""} role-${escapeHtml(sender.role||"user")}">
          ${avatarMarkup(sender)}
          <div class="chat-message-body">
            <strong data-chat-profile="${escapeHtml(sender.pseudo||"")}">${escapeHtml(sender.pseudo||"Utilisateur")}</strong>
            ${memberStatusMarkup(sender)}
            <p>${escapeHtml(item.body)}</p>
            <small>${formatCloudDateTime(item.createdAt)}${item.editedAt?" · modifié":""}</small>
          </div>
          <div class="chat-message-actions">
            <button class="btn btn-gray" type="button" data-chat-reply="${escapeHtml(sender.pseudo||"")}">@</button>
            ${canEditOwn?`<button class="btn btn-blue" type="button" data-chat-edit="${item.id}">Modifier</button>`:""}
            ${canOwn||canModerate?`<button class="btn btn-red" type="button" data-chat-delete="${item.id}">Supprimer</button>`:""}
            ${!canOwn?`<button class="btn btn-orange" type="button" data-chat-report="${item.id}">Report</button><button class="btn btn-gray" type="button" data-chat-ignore="${escapeHtml(sender.pseudo||"")}">Ignorer</button>`:""}
          </div>
        </article>
      `;
    }).join("") : `<div class="community-profile-empty">Aucun message pour le moment.</div>`;
    feed.querySelectorAll("[data-chat-profile]").forEach(button=>{
      button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.chatProfile,{updateUrl:true}));
    });
    feed.querySelectorAll("[data-chat-delete]").forEach(button=>{
      button.addEventListener("click",()=>deleteChatMessage(button.dataset.chatDelete));
    });
    feed.querySelectorAll("[data-chat-edit]").forEach(button=>{
      button.addEventListener("click",()=>editChatMessage(button.dataset.chatEdit));
    });
    feed.querySelectorAll("[data-chat-report]").forEach(button=>{
      button.addEventListener("click",()=>reportChatMessage(button.dataset.chatReport));
    });
    feed.querySelectorAll("[data-chat-ignore]").forEach(button=>{
      button.addEventListener("click",()=>ignoreChatUser(button.dataset.chatIgnore));
    });
    feed.querySelectorAll("[data-chat-reply]").forEach(button=>{
      button.addEventListener("click",()=>prefillChatMention(button.dataset.chatReply));
    });
    if(forceBottom || wasNearBottom)feed.scrollTop=feed.scrollHeight;
    else feed.scrollTop=Math.min(previousScrollTop,Math.max(0,feed.scrollHeight-feed.clientHeight));
  }
  if(online){
    const ignored=chatState.ignored||[];
    online.innerHTML=`
      ${chatState.online.length ? chatState.online.map(user=>`
        <button class="online-user-row role-${escapeHtml(user.role||"user")}" type="button" data-online-profile="${escapeHtml(user.pseudo)}">
          ${avatarMarkup(user)}
          <span><strong>${escapeHtml(user.pseudo)}</strong><small>${authRoleLabel(user.role)}</small></span>
        </button>
      `).join("") : `<div class="community-profile-empty">Aucun membre en ligne.</div>`}
      ${ignored.length?`
        <div class="community-profile-empty">
          <strong>Membres ignorés</strong><br>
          ${ignored.map(pseudo=>`<button class="btn btn-gray" type="button" data-chat-unignore="${escapeHtml(pseudo)}">${escapeHtml(pseudo)} · réafficher</button>`).join(" ")}
        </div>
      `:""}
    `;
    online.querySelectorAll("[data-online-profile]").forEach(button=>{
      button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.onlineProfile,{updateUrl:true}));
    });
    online.querySelectorAll("[data-chat-unignore]").forEach(button=>{
      button.addEventListener("click",()=>unignoreChatUser(button.dataset.chatUnignore));
    });
  }
}

async function loadChatbox({silent=false,forceBottom=false}={}){
  if(!authState.user || chatState.refreshing)return;
  chatState.refreshing=true;
  try{
    const [chat,online]=await Promise.all([
      authFetch("/social/chat?limit=80"),
      authFetch("/social/online")
    ]);
    chatState.messages=chat.messages||[];
    chatState.settings=chat.settings||chatState.settings||{};
    chatState.ignored=chat.ignored||[];
    chatState.online=online.users||[];
    detectChatPings();
    renderChatbox({forceBottom});
  }catch(error){
    if(!silent)toast(error.message||"Chat indisponible.","error","error");
  }finally{
    chatState.refreshing=false;
  }
}

function detectChatPings(){
  if(!authState.user?.pseudo)return;
  const seen=chatState.lastPingSeenAt ? new Date(chatState.lastPingSeenAt).getTime() : 0;
  const mention=`@${authState.user.pseudo}`.toLowerCase();
  const hits=chatState.messages.filter(item=>!item.isMine && item.createdAt && new Date(item.createdAt).getTime()>seen && String(item.body||"").toLowerCase().includes(mention));
  if(hits.length){
    const newest=hits.slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0];
    chatState.lastPingSeenAt=newest.createdAt;
    localStorage.setItem(socialNotificationKey("pykur_chat_ping_seen_at"),chatState.lastPingSeenAt);
    if($("#chatboxModal")?.classList.contains("show"))return;
    chatState.mentionUnread=Math.min(99,chatState.mentionUnread+hits.length);
    localStorage.setItem(socialNotificationKey("pykur_chat_mention_unread"),String(chatState.mentionUnread));
    authRender();
    toast(`${newest.sender?.pseudo||"Un membre"} vous a mentionné dans le chat.`,"info","click");
  }
}

async function refreshChatPingNotifications({silent=false}={}){
  if(!authState.user?.pseudo)return;
  if($("#chatboxModal")?.classList.contains("show"))return;
  try{
    const chat=await authFetch("/social/chat?limit=30");
    chatState.messages=chat.messages||[];
    detectChatPings();
  }catch(error){
    if(!silent && !isTransientApiError(error))toast(error.message||"Notifications chat indisponibles.","error","error");
    else if(isTransientApiError(error))console.warn("[API] Rafraîchissement des mentions reporté",error.requestId||error.code||error.message);
  }
}

async function refreshWarningNotifications({silent=false}={}){
  if(!authState.user)return;
  try{
    const result=await authFetch("/account/warnings");
    const warnings=result.warnings||[];
    accountWarnings=warnings;
    const newest=warnings.slice().sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime())[0];
    const newestTime=newest?.createdAt ? new Date(newest.createdAt).getTime() : 0;
    const seenTime=lastWarningSeenAt ? new Date(lastWarningSeenAt).getTime() : 0;
    if(newest && newestTime>seenTime){
      lastWarningSeenAt=newest.createdAt;
      localStorage.setItem("pykur_warning_seen_at",lastWarningSeenAt);
      if(!silent)toast(`Avertissement reçu : ${newest.reason||"consultez votre profil utilisateur"}.`,"warning","warning");
      if($("#accountProfileModal")?.classList.contains("show"))renderAccountWarnings();
    }
  }catch(error){
    if(!silent && !isTransientApiError(error))toast(error.message||"Avertissements indisponibles.","error","error");
    else if(isTransientApiError(error))console.warn("[API] Rafraîchissement des avertissements reporté",error.requestId||error.code||error.message);
  }
}

function stopChatboxPolling(){
  if(chatState.timer){
    clearInterval(chatState.timer);
    chatState.timer=null;
  }
}

async function openChatboxPanel(){
  if(!authState.user)return authOpen("login");
  chatState.mentionUnread=0;
  localStorage.setItem(socialNotificationKey("pykur_chat_mention_unread"),"0");
  authRender();
  openModal("chatboxModal");
  if($("#chatHideShares"))$("#chatHideShares").checked=chatState.hideShares;
  if($("#chatHideText"))$("#chatHideText").checked=chatState.hideText;
  await loadChatbox({forceBottom:true});
  stopChatboxPolling();
  chatState.timer=setInterval(()=>loadChatbox({silent:true}),3000);
}

async function sendChatMessage(event){
  event.preventDefault();
  if(!authState.user)return authOpen("login");
  const input=$("#chatboxInput");
  const body=(input?.value||"").trim();
  if(!body)return;
  try{
    await authFetch("/social/chat",{method:"POST",body:JSON.stringify({body,type:"message"})});
    unlockAchievement("global_chat_message");
    if(input)input.value="";
    await loadChatbox({silent:true,forceBottom:true});
  }catch(error){
    toast(error.message||"Message impossible à envoyer.","error","error");
  }
}

async function deleteChatMessage(id){
  if(!id)return;
  try{
    await authFetch(`/social/chat/${encodeURIComponent(id)}`,{method:"DELETE"});
    await loadChatbox({silent:true});
    toast("Message supprimé.","success","success");
  }catch(error){
    toast(error.message||"Suppression impossible.","error","error");
  }
}

async function editChatMessage(id){
  const item=chatState.messages.find(message=>String(message.id)===String(id));
  if(!item)return;
  const body=await showMessageEditor(item.body||"",500);
  if(body===null)return;
  try{
    await authFetch(`/social/chat/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify({body})});
    await loadChatbox({silent:true});
  }catch(error){
    toast(error.message||"Modification impossible.","error","error");
  }
}

async function reportChatMessage(id){
  const reason=await showPrompt("Pourquoi signaler ce message ?",{
    title:"Signaler le message",
    placeholder:"Raison courte",
    okLabel:"Signaler"
  });
  if(reason===null)return;
  try{
    await authFetch(`/social/chat/${encodeURIComponent(id)}/report`,{method:"POST",body:JSON.stringify({reason})});
    toast("Signalement envoyé à la modération.","success","success");
  }catch(error){
    toast(error.message||"Signalement impossible.","error","error");
  }
}

async function ignoreChatUser(pseudo){
  if(!pseudo)return;
  const ok=await showConfirm(`Ignorer ${pseudo} dans la chatbox ?`,{
    title:"Ignorer un membre",
    subtitle:"Ses messages seront masqués de votre chatbox.",
    okLabel:"Ignorer",
    okClass:"btn-orange"
  });
  if(!ok)return;
  try{
    await authFetch(`/social/ignore/${encodeURIComponent(pseudo)}`,{method:"POST"});
    await loadChatbox({silent:true});
    toast(`${pseudo} est ignoré dans le chat.`,"success","success");
  }catch(error){
    toast(error.message||"Impossible d'ignorer ce membre.","error","error");
  }
}

async function unignoreChatUser(pseudo){
  if(!pseudo)return;
  try{
    await authFetch(`/social/ignore/${encodeURIComponent(pseudo)}`,{method:"DELETE"});
    await loadChatbox({silent:true});
    toast(`${pseudo} est de nouveau visible dans le chat.`,"success","success");
  }catch(error){
    toast(error.message||"Impossible de réafficher ce membre.","error","error");
  }
}

function prefillChatMention(pseudo){
  const input=$("#chatboxInput");
  if(!input || !pseudo)return;
  const mention=`@${pseudo} `;
  if(!input.value.includes(mention))input.value=mention+input.value;
  input.focus();
}

async function shareCommunityMilestone(type,payload={}){
  if(!authState.user)return;
  const prefs=accountPreferences();
  if(type==="achievement" && prefs.shareAchievements===false)return;
  if((type==="pykur" || type==="familiar") && prefs.shareGalleryMoments===false)return;
  const title=payload.title ? String(payload.title) : "";
  const body=type==="achievement"
    ? `${authState.user.pseudo} a débloqué le succès ${title}.`
    : `${authState.user.pseudo} a terminé ${payload.familiarLabel?`un ${payload.familiarLabel}`:"un familier"}${payload.title?` : ${payload.title}`:""}.`;
  try{
    await authFetch("/social/chat",{method:"POST",body:JSON.stringify({type,body,meta:payload})});
  }catch{
    // Le partage communautaire reste secondaire et ne doit jamais bloquer le tracker.
  }
}

async function openCommunityProfileByPseudo(pseudo,{updateUrl=false}={}){
  const clean=(pseudo||"").trim();
  if(!clean)return;
  try{
    const result=await authFetch(`/community/users/${encodeURIComponent(clean)}`);
    renderCommunityProfile(result.profile);
    unlockAchievement("open_user_profile");
    if(updateUrl){
      const url=communityProfileUrl(result.profile?.pseudo||clean);
      history.replaceState(null,"",url);
    }
    openModal("communityProfileModal");
  }catch(error){
    toast(error.message||"Profil public indisponible.","warning","warning");
  }
}

async function openCommunityProfilePreview(){
  if(!authState.user)return authOpen("login");
  openCommunityProfileByPseudo(authState.user.pseudo);
}

function openCommunityDirectory(){
  unlockAchievement("search_member");
  openModal("communityDirectoryModal");
  loadCommunityDirectoryOnline();
  setTimeout(()=>$("#communitySearchInput")?.focus(),60);
}

function submitMessageOnEnter(event){
  if(event.key!=="Enter" || event.shiftKey || event.isComposing)return;
  event.preventDefault();
  if(event.repeat)return;
  const form=event.currentTarget?.form;
  if(form && !event.currentTarget.disabled)form.requestSubmit();
}

function renderCommunityDirectoryOnline(users=[]){
  const box=$("#communityDirectoryOnline");
  if(!box)return;
  if(!users.length){
    box.innerHTML=`<div class="community-profile-empty">Aucun membre en ligne actuellement.</div>`;
    return;
  }
  box.innerHTML=users.map(user=>`
    <button class="online-user-row role-${escapeHtml(user.role||"user")}" type="button" data-directory-online-user="${escapeHtml(user.pseudo)}">
      ${avatarMarkup(user)}
      <span><strong>${escapeHtml(user.pseudo)}</strong><small>${authRoleLabel(user.role)} · En ligne</small></span>
    </button>
  `).join("");
  box.querySelectorAll("[data-directory-online-user]").forEach(button=>{
    button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.directoryOnlineUser,{updateUrl:true}));
  });
}

async function loadCommunityDirectoryOnline(){
  const box=$("#communityDirectoryOnline");
  if(!box)return;
  if(!authState.user){
    box.innerHTML=`<div class="community-profile-empty">Connectez-vous pour voir les membres en ligne.</div>`;
    return;
  }
  box.innerHTML=`<div class="community-profile-empty">Chargement des membres connectés...</div>`;
  try{
    const result=await authFetch("/social/online");
    renderCommunityDirectoryOnline(result.users||[]);
  }catch(error){
    box.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Liste indisponible.")}</div>`;
  }
}

function renderCommunitySearchResults(users,query=""){
  const box=$("#communitySearchResults");
  if(!box)return;
  if(!query || query.trim().length<2){
    box.innerHTML=`<div class="community-profile-empty">Saisissez au moins 2 caractères pour rechercher un membre.</div>`;
    return;
  }
  if(!users.length){
    box.innerHTML=`<div class="community-profile-empty"><strong>Aucun membre trouvé.</strong><br><span>Essayez avec un autre pseudo.</span></div>`;
    return;
  }
  box.innerHTML=users.map(user=>`
    <article class="community-search-result role-${escapeHtml(user.role||"user")}">
      <div>
        <strong>${escapeHtml(user.pseudo)}</strong>
        <small>${authRoleLabel(user.role)} · ${user.publicProfile?"Profil public":"Profil privé"} · inscrit le ${user.createdAt?formatDateShort(user.createdAt):"date inconnue"}</small>
        ${memberStatusMarkup(user)}
      </div>
      <button class="btn btn-blue" type="button" data-community-user="${escapeHtml(user.pseudo)}">Voir</button>
    </article>
  `).join("");
  box.querySelectorAll("[data-community-user]").forEach(button=>{
    button.addEventListener("click",()=>openCommunityProfileByPseudo(button.dataset.communityUser,{updateUrl:true}));
  });
}

let communitySearchTimer=null;
async function runCommunitySearch(){
  unlockAchievement("search_member");
  const input=$("#communitySearchInput");
  const query=(input?.value||"").trim();
  if(query.length<2){
    renderCommunitySearchResults([],query);
    return;
  }
  const box=$("#communitySearchResults");
  if(box)box.innerHTML=`<div class="community-profile-empty">Recherche en cours...</div>`;
  try{
    const result=await authFetch(`/community/users?q=${encodeURIComponent(query)}`);
    renderCommunitySearchResults(result.users||[],query);
  }catch(error){
    if(box)box.innerHTML=`<div class="community-profile-empty">${escapeHtml(error.message||"Recherche indisponible.")}</div>`;
  }
}

function checkCommunityProfileLink(){
  const params=new URLSearchParams(location.search);
  const pseudo=params.get("user")||params.get("profil")||params.get("profile");
  if(pseudo)setTimeout(()=>openCommunityProfileByPseudo(pseudo),250);
}

function openAccountProfile(){
  if(!authState.user){
    authOpen("login");
    return;
  }
  accountProfileSection="account";
  renderAccountProfile();
  openModal("accountProfileModal");
}

async function saveAccountEmail(event){
  event.preventDefault();
  if(!authState.user)return authOpen("login");
  const email=$("#accountEmailInput")?.value||"";
  const currentPassword=$("#accountEmailPassword")?.value||"";
  try{
    const result=await authFetch("/account/email",{method:"PUT",body:JSON.stringify({email,currentPassword})});
    authState.user=result.user;
    if($("#accountEmailPassword"))$("#accountEmailPassword").value="";
    authRender();
    renderAccountProfile();
    toast("Email mis à jour.","success","success");
  }catch(error){
    toast(error.message||"Email impossible à modifier.","error","error");
  }
}

async function saveAccountPassword(event){
  event.preventDefault();
  if(!authState.user)return authOpen("login");
  const currentPassword=$("#accountCurrentPassword")?.value||"";
  const newPassword=$("#accountNewPassword")?.value||"";
  try{
    const result=await authFetch("/account/password",{method:"PUT",body:JSON.stringify({currentPassword,newPassword})});
    if(result.token){
      authState.token=result.token;
      localStorage.setItem(AUTH_TOKEN_KEY,authState.token);
    }
    if(result.user)authState.user=result.user;
    if($("#accountCurrentPassword"))$("#accountCurrentPassword").value="";
    if($("#accountNewPassword"))$("#accountNewPassword").value="";
    toast("Mot de passe mis à jour.","success","success");
  }catch(error){
    toast(error.message||"Mot de passe impossible à modifier.","error","error");
  }
}

async function saveAccountAvatar(event){
  event.preventDefault();
  if(!authState.user)return authOpen("login");
  const avatarUrl=$("#accountAvatarInput")?.value||"";
  try{
    const result=await authFetch("/account/avatar",{method:"PUT",body:JSON.stringify({avatarUrl})});
    authState.user=result.user;
    authRender();
    renderAccountProfile();
    toast("Photo de profil mise à jour.","success","success");
  }catch(error){
    toast(error.message||"Photo de profil impossible à modifier.","error","error");
  }
}

async function saveAccountPreferences(){
  if(!authState.user)return;
  const preferences=accountPreferences();
  $$("[data-account-pref]").forEach(input=>{
    preferences[input.dataset.accountPref]=!!input.checked;
  });
  try{
    const result=await authFetch("/account/preferences",{method:"PUT",body:JSON.stringify({preferences})});
    authState.user=result.user;
    authRender();
    renderAccountProfile();
    toast("Préférences communautaires sauvegardées.","success","success");
  }catch(error){
    toast(error.message||"Préférences impossibles à sauvegarder.","error","error");
    renderAccountProfile();
  }
}

async function closeOwnAccount(){
  if(!authState.user)return authOpen("login");
  const ok=await showConfirm("Fermer votre compte ?",{
    title:"Fermer le compte",
    subtitle:"Vous serez déconnecté. Si vous ne vous reconnectez pas pendant 30 jours, le compte sera supprimé définitivement.",
    okLabel:"Fermer mon compte",
    okClass:"btn-red",
    danger:true
  });
  if(!ok)return;
  try{
    await authFetch("/account/close",{method:"POST",body:JSON.stringify({})});
    closeModal("accountProfileModal");
    authLogout();
    toast("Compte fermé. Reconnectez-vous sous 30 jours pour annuler la suppression.","warning","warning");
  }catch(error){
    toast(error.message||"Fermeture du compte impossible.","error","error");
  }
}

async function authSubmit(event){
  event.preventDefault();
  authSetError("");
  const password=$("#authPassword")?.value||"";
  try{
    const payload=authMode==="register"
      ? {pseudo:$("#authPseudo")?.value||"",email:$("#authEmail")?.value||"",password}
      : {identifier:$("#authIdentifier")?.value||"",password};
    const result=await authFetch(authMode==="register"?"/auth/register":"/auth/login",{
      method:"POST",
      body:JSON.stringify(payload)
    });
    if(authMode==="register" && result.pendingVerification){
      closeModal("authModal");
      authSetMode("login");
      toast(result.bootstrapAdmin?"Compte créé. Confirmez votre email pour activer le rôle admin.":"Compte créé. Vérifiez vos emails pour l'activer.","success","success");
      return;
    }
    authState.token=result.token;
    authState.user=result.user;
    authState.apiOnline=true;
    localStorage.setItem(AUTH_TOKEN_KEY,authState.token);
    loadSocialNotificationState();
    authRender();
    closeModal("authModal");
    toast(result.bootstrapAdmin?"Premier compte créé : rôle admin activé.":"Connexion réussie.","success","success");
    cloudAfterLogin();
    refreshFriendSummary({silent:true});
    startSocialPolling();
  }catch(error){
    authSetError(error.message||"Connexion impossible.");
  }
}

function authLogout(){
  if(authState.token){
    authFetch("/auth/logout",{method:"POST"}).catch(()=>{});
  }
  if(cloudState.timer){
    clearTimeout(cloudState.timer);
    cloudState.timer=null;
  }
  if(cloudState.retryTimer){
    clearTimeout(cloudState.retryTimer);
    cloudState.retryTimer=null;
  }
  if(authState.refreshTimer)clearTimeout(authState.refreshTimer);
  stopChatboxPolling();
  stopMessagePolling();
  authState={token:"",user:null,apiOnline:authState.apiOnline,refreshTimer:null};
  socialState.friends=0;
  socialState.incoming=0;
  socialState.outgoing=0;
  socialState.loaded=false;
  socialState.seenIncoming=[];
  localStorage.removeItem(AUTH_TOKEN_KEY);
  authRender();
  toast("Vous êtes déconnecté du compte cloud.","info","click");
}

async function authRefresh(){
  if(!authState.token){
    authRender();
    return;
  }
  try{
    const result=await authFetch("/auth/me");
    authState.user=result.user;
    authState.apiOnline=true;
    loadSocialNotificationState();
    if(authState.refreshTimer){
      clearTimeout(authState.refreshTimer);
      authState.refreshTimer=null;
    }
  }catch(error){
    authState.apiOnline=false;
    if([401,403].includes(Number(error?.status||0))){
      authState.token="";
      authState.user=null;
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }else{
      console.warn("[API] Session conservée pendant une indisponibilité temporaire",error?.requestId||error?.code||error?.message);
      if(!authState.refreshTimer){
        authState.refreshTimer=setTimeout(()=>{
          authState.refreshTimer=null;
          authRefresh();
        },5000);
      }
    }
  }
  authRender();
  if(authState.user){
    cloudAfterLogin({silent:true});
    refreshFriendSummary({silent:true});
    startSocialPolling();
  }
}

function cloudPayload(){
  store.lastCloudPreparedAt=new Date().toISOString();
  return {
    app:"pykur-tracker",
    version:"1.6.0",
    savedAt:new Date().toISOString(),
    store:clone(store)
  };
}

function getPayloadTime(payload){
  if(!payload)return 0;
  const candidates=[
    payload.savedAt,
    payload.store?.updatedAt,
    payload.store?.lastSavedAt,
    payload.store?.lastCloudPreparedAt
  ];
  return candidates.reduce((max,value)=>{
    const time=value ? new Date(value).getTime() || 0 : 0;
    return Math.max(max,time);
  },0);
}

function profilePPFromData(profileData){
  const src={};
  const profileMobs=profileData?.mobs || {};
  for(const id in mobs){
    src[id]=(profileMobs.morose?.[id]||0)+(profileMobs.tynril?.[id]||0)+(profileMobs.zone?.[id]||0);
  }
  return ppFrom(src);
}

function countDiscoveredEvents(gallery){
  return Object.values(gallery?.eventsDiscovered||{}).filter(Boolean).length;
}

function formatCloudDateTime(value){
  const d=value ? new Date(value) : null;
  if(!d || isNaN(d))return "date inconnue";
  return d.toLocaleString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}

function cloudStoreSummary(inputStore){
  const profiles=inputStore?.profiles || {};
  const ids=Object.keys(profiles);
  const activeId=inputStore?.active && profiles[inputStore.active] ? inputStore.active : ids[0];
  const active=activeId ? profiles[activeId] : null;
  const activeData=active?.data || {};
  const activePP=active ? profilePPFromData(activeData) : 0;
  const runs=activeData.runs || {};
  const gallery=inputStore?.galleryShared!==false ? inputStore?.sharedGallery : activeData.gallery;
  const updatedAt=inputStore?.lastSavedAt || inputStore?.updatedAt || inputStore?.lastCloudPreparedAt;
  return {
    profileCount:ids.length,
    activeName:active?.name || "Aucun profil",
    activePP,
    morose:runs.morose||0,
    tynril:runs.tynril||0,
    completed:Array.isArray(gallery?.completedPykurs) ? gallery.completedPykurs.length : 0,
    events:countDiscoveredEvents(gallery),
    updatedAt
  };
}

function isEmptyStarterStore(inputStore){
  const summary=cloudStoreSummary(inputStore);
  if(summary.profileCount!==1)return false;
  if(summary.activePP>0 || summary.morose>0 || summary.tynril>0)return false;
  if(summary.completed>0 || summary.events>0)return false;
  return true;
}

function summaryTitle(summary){
  if(!summary.profileCount)return "Aucune donnée détectée";
  return `${summary.activeName} · ${summary.activePP} / ${summary.objectiveMax||PP_MAX} ${summary.progressLabel||"PP"}`;
}

function summaryDetail(summary){
  if(!summary.profileCount)return "Aucun profil dans cette sauvegarde.";
  const pieces=[
    `${summary.profileCount} profil${summary.profileCount>1?"s":""}`,
    `Morose ${summary.morose}`,
    `Tynril ${summary.tynril}`,
    `${summary.completed} familier${summary.completed>1?"s":""} archivé${summary.completed>1?"s":""}`,
    `${summary.events} événement${summary.events>1?"s":""}`
  ];
  return `${pieces.join(" · ")} · ${formatCloudDateTime(summary.updatedAt)}`;
}

function renderCloudMigrationTools(remotePayload=null){
  const localTitle=$("#cloudLocalSummary");
  const localDetail=$("#cloudLocalDetail");
  const remoteTitle=$("#cloudRemoteSummary");
  const remoteDetail=$("#cloudRemoteDetail");
  const inspectBtn=$("#cloudInspectNow");
  const uploadBtn=$("#cloudUploadNow");
  const downloadBtn=$("#cloudDownloadNow");
  const logged=!!authState.user;
  const localSummary=cloudStoreSummary(store);
  const remoteSummary=remotePayload?.store ? cloudStoreSummary(remotePayload.store) : null;

  if(localTitle)localTitle.textContent=summaryTitle(localSummary);
  if(localDetail)localDetail.textContent=summaryDetail(localSummary);
  if(remoteTitle)remoteTitle.textContent=logged ? (remoteSummary ? summaryTitle(remoteSummary) : "Cloud non vérifié") : "Connectez-vous pour vérifier.";
  if(remoteDetail)remoteDetail.textContent=logged ? (remoteSummary ? summaryDetail(remoteSummary) : "Cliquez sur Vérifier le cloud pour lire la sauvegarde en ligne.") : "La migration cloud nécessite un compte connecté.";

  [inspectBtn,uploadBtn,downloadBtn].forEach(btn=>{
    if(btn)btn.disabled=!logged || cloudState.syncing || cloudState.loading;
  });
}

function applyCloudPayload(payload){
  if(!payload?.store || typeof payload.store!=="object")return false;
  cloudState.loading=true;
  try{
    store=clone(payload.store);
    localStorage.setItem("pykur_clean_v1",JSON.stringify(store));
    load();
    cloudState.lastSyncAt=payload.savedAt ? new Date(payload.savedAt) : new Date();
    markSaveStatus(true);
    return true;
  }catch(error){
    console.error("Chargement cloud impossible",error);
    toast("Sauvegarde cloud invalide.","error","error");
    return false;
  }finally{
    cloudState.loading=false;
    renderCloudStatus();
  }
}

function createCloudSafetyBackup(reason="cloud-download"){
  try{
    const backup={createdAt:new Date().toISOString(),reason,store:clone(store)};
    localStorage.setItem("pykur_safety_backup_before_cloud",JSON.stringify(backup));
    const list=JSON.parse(localStorage.getItem("pykur_safety_backup_list")||"[]").filter(Boolean);
    list.unshift({createdAt:backup.createdAt,reason});
    localStorage.setItem("pykur_safety_backup_list",JSON.stringify(list.slice(0,5)));
    return true;
  }catch(error){
    console.warn("Sauvegarde locale de sécurité impossible",error);
    return false;
  }
}

function cloudStatusText(){
  if(!authState.user)return "Sauvegarde locale active";
  if(cloudState.error)return "Erreur de sauvegarde cloud";
  if(cloudState.syncing)return "Synchronisation cloud...";
  if(cloudState.lastSyncAt)return "Cloud synchronisé";
  return "Connecté au cloud";
}

function renderCloudStatus(){
  const title=$("#cloudSaveTitle");
  const detail=$("#cloudSaveDetail");
  const state=$("#cloudSaveState");
  const syncBtn=$("#cloudSyncNow");
  const logged=!!authState.user;
  if(title)title.textContent=logged?"Sauvegarde cloud membre":"Mode invité local";
  if(detail){
    detail.textContent=logged
      ? "Chaque action est sauvegardée localement puis envoyée automatiquement vers votre compte cloud."
      : "Votre progression est conservée uniquement dans ce navigateur. Sans compte, elle peut être perdue si le cache est supprimé ou si vous changez d'appareil.";
  }
  if(state){
    state.textContent=cloudStatusText();
    state.classList.toggle("online",logged && !cloudState.error);
    state.classList.toggle("local",!logged);
    state.classList.toggle("error",!!cloudState.error);
  }
  if(syncBtn){
    syncBtn.disabled=!logged || cloudState.syncing;
    syncBtn.textContent=cloudState.syncing?"Synchronisation...":"Synchroniser maintenant";
  }
  renderCloudMigrationTools(cloudState.remotePayload);
}

function scheduleCloudSave(){
  if(!authState.user || cloudState.loading)return;
  if(cloudState.timer)clearTimeout(cloudState.timer);
  cloudState.timer=setTimeout(()=>cloudSyncNow({silent:true}),500);
}

function scheduleCloudRetry(){
  if(!authState.user || cloudState.retryTimer)return;
  const delays=[5000,15000,30000,60000];
  const delay=delays[Math.min(cloudState.retryAttempt,delays.length-1)];
  cloudState.retryAttempt+=1;
  cloudState.retryTimer=setTimeout(()=>{
    cloudState.retryTimer=null;
    cloudSyncNow({silent:true});
  },delay);
}

async function cloudSyncNow(options={}){
  if(!authState.user){
    if(!options.silent)toast("Connectez-vous pour utiliser la sauvegarde cloud.","warning","warning");
    renderCloudStatus();
    return false;
  }
  if(cloudState.syncing){
    cloudState.pending=true;
    return false;
  }
  cloudState.syncing=true;
  cloudState.error=null;
  renderCloudStatus();
  try{
    const result=await authFetch("/cloud/save",{method:"PUT",body:JSON.stringify({payload:cloudPayload()})});
    if(result?.payload?.store){
      cloudState.remotePayload=result.payload;
      store=Object.assign({},store,result.payload.store);
      localStorage.setItem("pykur_clean_v1",JSON.stringify(store));
    }
    cloudState.lastSyncAt=new Date();
    cloudState.error=null;
    cloudState.retryAttempt=0;
    if(cloudState.retryTimer){
      clearTimeout(cloudState.retryTimer);
      cloudState.retryTimer=null;
    }
    markSaveStatus(true);
    if(!options.silent)toast("Sauvegarde cloud synchronisée.","success","success");
    return true;
  }catch(error){
    cloudState.error=error.message||"Erreur cloud";
    if(isTransientApiError(error))scheduleCloudRetry();
    if(!options.silent)toast("Sauvegarde cloud impossible.","error","error");
    return false;
  }finally{
    cloudState.syncing=false;
    if(cloudState.pending && authState.user){
      cloudState.pending=false;
      scheduleCloudSave();
    }
    renderCloudStatus();
  }
}

async function cloudInspectNow(options={}){
  if(!authState.user){
    if(!options.silent)toast("Connectez-vous pour vérifier le cloud.","warning","warning");
    renderCloudStatus();
    return null;
  }
  cloudState.loading=true;
  cloudState.error=null;
  renderCloudStatus();
  try{
    const result=await authFetch("/cloud/save");
    const payload=result?.payload || null;
    if(payload && result?.updatedAt && !payload.savedAt)payload.savedAt=result.updatedAt;
    cloudState.remotePayload=payload;
    if(!options.silent){
      toast(cloudState.remotePayload?.store ? "Sauvegarde cloud vérifiée." : "Aucune sauvegarde cloud trouvée.","info","click");
    }
    return cloudState.remotePayload;
  }catch(error){
    cloudState.error=error.message||"Erreur cloud";
    if(!options.silent)toast("Vérification cloud impossible.","error","error");
    return null;
  }finally{
    cloudState.loading=false;
    renderCloudStatus();
  }
}

async function cloudUploadNow(){
  if(!authState.user)return cloudSyncNow({silent:false});
  const ok=await showConfirm("Envoyer la sauvegarde de ce navigateur vers votre compte cloud ?",{
    title:"Envoyer vers le cloud",
    subtitle:"La sauvegarde cloud sera fusionnée avec les données de ce navigateur.",
    okLabel:"Envoyer",
    okClass:"btn-green",
    html:`<p>Cette action sert surtout à migrer un ancien navigateur ou une ancienne adresse vers votre compte.</p><p>Elle ne modifie pas vos calculs, mais elle peut ajouter les profils présents ici au cloud.</p>`
  });
  if(!ok)return false;
  const synced=await cloudSyncNow({silent:false});
  if(synced)await cloudInspectNow({silent:true});
  return synced;
}

async function cloudDownloadNow(){
  let payload=cloudState.remotePayload;
  if(!payload?.store)payload=await cloudInspectNow({silent:true});
  if(!payload?.store){
    toast("Aucune sauvegarde cloud à récupérer.","warning","warning");
    return false;
  }
  const remoteSummary=cloudStoreSummary(payload.store);
  const localSummary=cloudStoreSummary(store);
  const ok=await showConfirm("Récupérer la sauvegarde cloud sur ce navigateur ?",{
    title:"Récupérer le cloud",
    subtitle:"Une sauvegarde locale de sécurité sera créée avant le remplacement.",
    okLabel:"Récupérer",
    okClass:"btn-orange",
    html:`<p><strong>Cloud :</strong> ${escapeHtml(summaryTitle(remoteSummary))}<br><small>${escapeHtml(summaryDetail(remoteSummary))}</small></p><p><strong>Ce navigateur :</strong> ${escapeHtml(summaryTitle(localSummary))}<br><small>${escapeHtml(summaryDetail(localSummary))}</small></p><p>Après validation, ce navigateur utilisera la sauvegarde cloud.</p>`
  });
  if(!ok)return false;
  const backedUp=createCloudSafetyBackup("before-cloud-download");
  const applied=applyCloudPayload(payload);
  if(applied){
    toast(backedUp?"Sauvegarde cloud récupérée. Backup local créé.":"Sauvegarde cloud récupérée.","success","success");
    renderAll();
    return true;
  }
  return false;
}

async function cloudAfterLogin(options={}){
  if(!authState.user)return;
  cloudState.loading=true;
  renderCloudStatus();
  try{
    const result=await authFetch("/cloud/save");
    const remotePayload=result?.payload;
    if(remotePayload && result?.updatedAt && !remotePayload.savedAt)remotePayload.savedAt=result.updatedAt;
    cloudState.remotePayload=remotePayload || null;
    const remoteTime=getPayloadTime(remotePayload);
    const localTime=getPayloadTime({store});
    const preferRemote=remotePayload?.store && (!localTime || remoteTime >= localTime || isEmptyStarterStore(store));
    if(preferRemote){
      cloudState.loading=false;
      const applied=applyCloudPayload(remotePayload);
      if(applied && !options.silent)toast("Sauvegarde cloud récupérée.","success","success");
      return;
    }
    cloudState.loading=false;
    await cloudSyncNow({silent:true});
    if(!options.silent)toast("Sauvegarde cloud automatique activée.","success","success");
  }catch(error){
    cloudState.loading=false;
    cloudState.error=error.message||"Erreur cloud";
    renderCloudStatus();
    if(!options.silent)toast("Impossible de récupérer la sauvegarde cloud.","error","error");
  }
}
const RAJ_ASSETS={
  cra:"./assets/images/raj/cra.png",
  modo:"./assets/images/raj/modo.png",
  rajLabel:"./assets/images/raj/raj.png",
  happiosLabel:"./assets/images/raj/happios.png",
  arrow:"./assets/images/raj/fleche.png",
  redCard:"./assets/images/raj/carton-rouge.png",
  monsters:[
    {id:"bouftonBlanc",className:"boufton-blanc",src:"./assets/images/raj/monstre/boufton-blanc.png",loot:["./assets/images/raj/loot/laine-blanc.png"]},
    {id:"bouftonNoir",className:"boufton-noir",src:"./assets/images/raj/monstre/boufton-noir.png",loot:["./assets/images/raj/loot/laine-noir.png"]},
    {id:"bouftou",className:"bouftou",src:"./assets/images/raj/monstre/bouftou.png",loot:["./assets/images/raj/loot/laine.png","./assets/images/raj/loot/cuir.png"]},
    {id:"chefBouftou",className:"chef-bouftou",src:"./assets/images/raj/monstre/chef-de-guerre-bouftou.png",loot:["./assets/images/raj/loot/laine-chef.png"]}
  ]
};
const BRAKO_ASSETS={
  brako:"./assets/images/brako/brako.png",
  minotot:"./assets/images/brako/minotot.png",
  nametag:"./assets/images/brako/nametag.png",
  arc:"./assets/images/brako/arc.png",
  arrow:"./assets/images/raj/fleche.png",
  explo:"./assets/images/brako/explo.png",
  baguette:"./assets/images/brako/baguette.png",
  pourpre:"./assets/images/brako/pourpre.png",
  dialogues:[
    "./assets/images/brako/dialogue1.png",
    "./assets/images/brako/dialogue2.png",
    "./assets/images/brako/dialogue3.png",
    "./assets/images/brako/dialogue4.png",
    "./assets/images/brako/dialogue5.png"
  ],
  dialogueTexts:[
    "Jouez vite svp ...",
    "T'es un vrai noob, ça fait combien de temps que tu joues au jeu",
    "Les gars focus svp wsh",
    "Maaaaais debuffffffff",
    "Go chall celui qui rate paye sa capt"
  ]
};
const rajState={
  active:false,
  banned:false,
  fighting:false,
  looting:false,
  moderatorActive:false,
  timers:[],
  elements:[],
  currentTarget:null,
  raj:null,
  happios:null,
  layer:null,
  combats:0,
  combatsBeforeBan:3,
  rajPos:{x:80,y:420},
  stopped:false
};
const brakoState={
  active:false,
  phase:"idle",
  timers:[],
  elements:[],
  dropRolled:false,
  finished:false,
  layer:null,
  brako:null,
  minotot:null,
  brakoPos:{x:100,y:360},
  minototPos:{x:900,y:340},
  dialogueLimit:0,
  dialoguesShown:0,
  dialogueNode:null,
  interruptRequested:false,
  interrupting:false,
  interruptDone:false,
  pendingRajInterrupt:false
};

const sounds={
  click:new Audio("./assets/sons/click.mp3"),
  success:new Audio("./assets/sons/success.mp3"),
  error:new Audio("./assets/sons/error.mp3"),
  warning:new Audio("./assets/sons/warning.mp3"),
  unlock:new Audio("./assets/sons/unlock.mp3"),
  final:new Audio("./assets/sons/succes/100%25.mp3"),

  pp:new Audio("./assets/sons/pp_gain.wav"),
  mark:new Audio("./assets/sons/run_mark.wav"),
  reset:new Audio("./assets/sons/reset_soft.wav"),
  chrono:new Audio("./assets/sons/chrono_toggle.wav"),
  export:new Audio("./assets/sons/export_save.wav"),
  import:new Audio("./assets/sons/import_save.wav"),
  undo:new Audio("./assets/sons/undo_soft.wav")
};
Object.values(sounds).forEach(s=>{s.volume=.14*soundVolumeRatio()});

const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
function escapeHtml(value){
  return String(value??"").replace(/[&<>"']/g,match=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[match]));
}
let activeDialog=null;
let lastSaveAt=null;
let lastSaveError=false;

function dialogMeta(title,type,danger){
  const raw=String(title||"").toLowerCase();
  if(raw==="renommer le profil")return {iconAsset:"renomerprofile.png",subtitle:"Choisissez un nouveau nom lisible et facile à retrouver."};
  if(raw==="créer un profil")return {iconAsset:"creerprofile.png",subtitle:"Créez une nouvelle aventure de familier."};
  if(raw==="supprimer le profil")return {iconAsset:"supprimerprofile.png",subtitle:"Cette action peut modifier ou supprimer des données du profil actif."};
  if(raw==="modifier le donjon")return {iconAsset:"modifierdonjon.png",subtitle:"Ajustez cette valeur manuellement, sans modifier le reste du tracker."};
  if(raw.includes("renommer"))return {icon:"✏️",subtitle:"Choisissez un nouveau nom lisible et facile à retrouver."};
  if(raw.includes("créer"))return {icon:"✨",subtitle:"Créez une nouvelle aventure de familier."};
  if(raw.includes("modifier") || raw.includes("temps moyen"))return {icon:"🏰",subtitle:"Ajustez cette valeur manuellement, sans modifier le reste du tracker."};
  if(raw.includes("reset") || raw.includes("remettre") || raw.includes("vider") || raw.includes("supprimer") || danger)return {icon:"⚠️",subtitle:"Cette action peut modifier ou supprimer des données du profil actif."};
  if(raw.includes("import"))return {icon:"📥",subtitle:"Vérifiez la sauvegarde avant de remplacer les données locales."};
  if(raw.includes("export"))return {icon:"📤",subtitle:"Prépare une copie complète de vos données locales."};
  if(raw.includes("tutoriel") || raw.includes("aide"))return {icon:"📖",subtitle:"Suivez les étapes tranquillement, rien ne presse."};
  if(type==="prompt")return {icon:"✏️",subtitle:"Saisissez la nouvelle valeur puis validez."};
  if(type==="confirm")return {icon:"❔",subtitle:"Confirmez votre choix pour continuer."};
  return {icon:"💬",subtitle:"Information du tracker."};
}

function showDialog(message,options={}){
  return new Promise(resolve=>{
    const bg=$("#appDialog");
    const title=$("#dialogTitle");
    const msg=$("#dialogMessage");
    let input=$("#dialogInput");
    const actions=$("#dialogActions");
    if(!bg || !title || !msg || !input || !actions){
      resolve(options.type==="prompt" ? null : true);
      return;
    }
    if(input.tagName?.toLowerCase()!=="input"){
      const fresh=document.createElement("input");
      fresh.id=input.id;
      fresh.className=input.className;
      input.replaceWith(fresh);
      input=fresh;
    }

    const type=options.type||"alert";
    activeDialog={resolve,type,previous:document.activeElement,submitted:false};
    const baseTitle=options.title || (type==="confirm"?"Confirmation":type==="prompt"?"Saisie":"Information");
    const meta=dialogMeta(baseTitle,type,options.danger);
    const iconAsset=options.iconAsset||meta.iconAsset;
    const iconMarkup=iconAsset
      ? `<img class="dialog-title-icon" src="./assets/icone/${escapeHtml(iconAsset)}" alt="">`
      : `<span aria-hidden="true">${escapeHtml(options.icon||meta.icon)}</span>`;
    title.innerHTML=`${iconMarkup}<span>${escapeHtml(baseTitle)}</span>`;
    const head=title.closest(".dialog-head");
    head?.querySelector(".dialog-subtitle")?.remove();
    bg.querySelector(".dialog-counter")?.remove();
    const subtitle=document.createElement("p");
    subtitle.className="dialog-subtitle";
    subtitle.textContent=options.subtitle||meta.subtitle;
    head?.appendChild(subtitle);
    if(options.html){
      msg.innerHTML=options.html;
    }else{
      msg.textContent=message;
    }
    if(options.extraHtml)msg.insertAdjacentHTML("beforeend",options.extraHtml);
    input.style.display=type==="prompt"?"block":"none";
    input.value=options.defaultValue||"";
    input.placeholder=options.placeholder||"";
    actions.innerHTML="";
    bg.classList.remove("familiar-choice-dialog");
    if(options.dialogClass)bg.classList.add(options.dialogClass);

    const cancelLabel=options.cancelLabel||"Annuler";
    const okLabel=options.okLabel||"Valider";
    if(type!=="alert"){
      const cancel=document.createElement("button");
      cancel.className="btn btn-gray";
      cancel.type="button";
      cancel.textContent=cancelLabel;
      cancel.addEventListener("click",()=>closeDialog(type==="prompt"?null:false));
      actions.appendChild(cancel);
    }

    const ok=document.createElement("button");
    ok.className="btn "+(options.danger?"btn-red":options.okClass||"btn-blue");
    ok.type="button";
    ok.textContent=okLabel;
    ok.addEventListener("click",submitDialog);
    actions.appendChild(ok);
    options.onRender?.({bg,title,msg,input,actions});

    bg.classList.add("show");
    bg.setAttribute("aria-hidden","false");
    setTimeout(()=>type==="prompt"?input.focus():ok.focus(),0);
  });
}

function submitDialog(){
  if(!activeDialog || activeDialog.submitted)return;
  activeDialog.submitted=true;
  const input=$("#dialogInput");
  closeDialog(activeDialog.type==="prompt" ? input.value : true);
}

function closeDialog(value){
  const bg=$("#appDialog");
  const dialog=activeDialog;
  if(!dialog)return;
  activeDialog=null;
  bg?.classList.remove("show");
  bg?.classList.remove("familiar-choice-dialog");
  bg?.setAttribute("aria-hidden","true");
  dialog.previous?.focus?.();
  dialog.resolve(value);
}

const showConfirm=(message,options={})=>showDialog(message,{...options,type:"confirm"});
const showPrompt=(message,options={})=>showDialog(message,{...options,type:"prompt"});

function showMessageEditor(defaultValue="",maxLength=500){
  return showPrompt("Modifiez le contenu du message :",{
    title:"Modifier le message",
    subtitle:"Corrigez votre message sans changer le reste de la conversation.",
    defaultValue,
    okLabel:"Enregistrer",
    onRender:({input,msg})=>{
      const textarea=document.createElement("textarea");
      textarea.id=input.id;
      textarea.className=input.className;
      textarea.value=defaultValue||"";
      textarea.maxLength=maxLength;
      textarea.rows=5;
      textarea.style.resize="vertical";
      textarea.style.minHeight="112px";
      input.replaceWith(textarea);
      const counter=document.createElement("small");
      counter.className="dialog-counter";
      const update=()=>counter.textContent=`${textarea.value.length} / ${maxLength}`;
      textarea.addEventListener("input",update);
      update();
      msg.insertAdjacentElement("afterend",counter);
    }
  });
}

function positionCharlie(clientX,clientY){
  const cursor=$("#charlieCursor");
  if(!cursor)return;
  cursor.style.setProperty("--charlie-x",(clientX-18)+"px");
  cursor.style.setProperty("--charlie-y",(clientY-8)+"px");
}

function animateCharlieClick(clientX,clientY){
  if(!charlieEnabled)return;
  const cursor=$("#charlieCursor");
  if(!cursor)return;
  positionCharlie(clientX,clientY);
  cursor.classList.remove("chomp");
  void cursor.offsetWidth;
  cursor.classList.add("chomp");
  setTimeout(()=>cursor.classList.remove("chomp"),240);
}

function toggleCharlieCursor(){
  const cursor=$("#charlieCursor");
  if(!cursor)return;
  charlieEnabled=!charlieEnabled;
  document.body.classList.toggle("charlie-mode",charlieEnabled);

  if(charlieEnabled){
    unlockAchievement("egg_charlie");
    charlieMoveHandler=e=>positionCharlie(e.clientX,e.clientY);
    document.addEventListener("pointermove",charlieMoveHandler,{passive:true});
    toast("Charlie est là","info","click");
  }else{
    document.removeEventListener("pointermove",charlieMoveHandler);
    charlieMoveHandler=null;
    cursor.classList.remove("chomp");
    cursor.removeAttribute("style");
    toast("Charlie est reparti","info","click");
  }
}

function toggleAlhass(){
  alhassEnabled=!alhassEnabled;
  if(alhassEnabled)hydrateDeferredImages($("#alhassPresence"));
  document.body.classList.toggle("alhass-mode",alhassEnabled);

  if(alhassEnabled){
    unlockAchievement("egg_alhass");
    alhassLastReaction=Date.now();
    toast("⚔️ Alhass a rejoint l'expedition.","rare","unlock");
    console.info("[Alhass] Inspection du tracker...");
    console.info("[Alhass] Aucun bug critique detecte.");
  }else{
    document.body.classList.remove("alhass-mode");
    alhassLastReaction=0;
    toast("Alhass retourne dans l'ombre.","info","click");
    console.info("[Alhass] Observation terminee.");
  }
}

function alhassReact(context="run",force=false){
  if(!alhassEnabled)return;
  const now=Date.now();
  if(!force && now-alhassLastReaction<45000)return;
  if(!force && Math.random()>.16)return;
  alhassLastReaction=now;

  const messages={
    run:["✔ Alhass valide cette run.","⚠️ Alhass inspecte le tracker...","🔥 Aucun bug detecte."],
    milestone:["👁️ Le testeur legendaire observe la progression.","⚔️ Alhass garde l'expedition sous controle."],
    guard:["🛡️ Alhass bloque l'exces avant qu'il ne devienne un bug."]
  };
  const list=messages[context] || messages.run;
  toast(list[Math.floor(Math.random()*list.length)],context==="guard"?"warning":"rare","click");
}

function toggleToom(){
  toomEnabled=!toomEnabled;
  document.body.classList.toggle("toom-mode",toomEnabled);
  const overlay=$("#toomOverlay");
  if(toomEnabled)hydrateDeferredImages(overlay);
  overlay?.classList.toggle("toom-active",toomEnabled);

  if(toomEnabled){
    unlockAchievement("egg_toom");
    if(overlay){
      overlay.style.opacity="1";
      overlay.style.visibility="visible";
      overlay.style.transform="translate3d(-50%,0,0) scale(1)";
    }
    toast("🏍️ Félicitations, Toom a obtenu une NRG 500.","toom","unlock");
    console.info("[Toom] NRG 500 attribuée. Surveillance de Nipsey recommandée.");
  }else{
    document.body.classList.remove("toom-mode");
    if(overlay){
      overlay.classList.remove("toom-active");
      overlay.style.visibility="hidden";
      overlay.style.transform="translate3d(-50%,18px,0) scale(.96)";
      setTimeout(()=>{
        if(!toomEnabled)overlay.removeAttribute("style");
      },280);
    }
    toast("🚨 Nipsey a récupéré la NRG 500.","warning","warning");
    console.info("[Toom] Nipsey a récupéré la NRG 500.");
  }
}

function toggleAina(){
  ainaEnabled=!ainaEnabled;
  document.body.classList.toggle("aina-mode",ainaEnabled);
  const overlay=$("#ainaOverlay");
  if(ainaEnabled)hydrateDeferredImages(overlay);
  overlay?.classList.toggle("aina-active",ainaEnabled);

  if(ainaEnabled){
    unlockAchievement("egg_aina");
    if(overlay){
      overlay.style.opacity="1";
      overlay.style.visibility="visible";
      overlay.style.transform="translate3d(0,0,0) scale(1)";
    }
    toast("🥚 Aina brandit le Dofus Ivoire.","aina","unlock");
    console.info("[Aina] Drop Ivoire détecté : taux absurdement bas, exploit validé.");
  }else{
    document.body.classList.remove("aina-mode");
    if(overlay){
      overlay.classList.remove("aina-active");
      overlay.style.visibility="hidden";
      overlay.style.transform="translate3d(-14px,12px,0) scale(.96)";
      setTimeout(()=>{
        if(!ainaEnabled)overlay.removeAttribute("style");
      },320);
    }
    toast("🌌 Le Dofus Ivoire disparaît dans la brume.","info","reset");
    console.info("[Aina] Le Dofus Ivoire retourne dans la brume.");
  }
}

function handleAinaDofusClick(){
  if(!ainaEnabled)return;
  const now=Date.now();
  if(now-ainaLastClick<900)return;
  ainaLastClick=now;
  playSound("reset");
  const messages=[
    "🚫 Impossible de récupérer le Dofus Ivoire.",
    "🥚 Ce drop appartient déjà à Aina.",
    "⚠️ Probabilité de récupération : 0.000001%."
  ];
  toast(messages[Math.floor(Math.random()*messages.length)],"aina","reset");
}

function rajIsDesktop(){
  return !window.matchMedia("(max-width: 760px)").matches && !window.matchMedia("(pointer: coarse)").matches;
}

function rajTimer(fn,delay){
  const timer={id:null,resolve:null};
  timer.id=setTimeout(()=>{
    rajState.timers=rajState.timers.filter(item=>item!==timer);
    fn?.();
    timer.resolve?.(true);
  },delay);
  rajState.timers.push(timer);
  return timer;
}

function rajDelay(delay){
  return new Promise(resolve=>{
    const timer=rajTimer(null,delay);
    timer.resolve=resolve;
  });
}

function rajClearTimers(){
  rajState.timers.forEach(timer=>{
    clearTimeout(timer.id);
    timer.resolve?.(false);
  });
  rajState.timers=[];
}

function rajTrack(element){
  rajState.elements.push(element);
  return element;
}

function rajRemoveElement(element){
  if(!element)return;
  element.remove();
  rajState.elements=rajState.elements.filter(item=>item!==element);
}

function rajResetState(){
  rajClearTimers();
  rajState.elements.forEach(element=>element.remove());
  Object.assign(rajState,{
    active:false,
    banned:false,
    fighting:false,
    looting:false,
    moderatorActive:false,
    timers:[],
    elements:[],
    currentTarget:null,
    raj:null,
    happios:null,
    combats:0,
    combatsBeforeBan:3,
    rajPos:{x:80,y:420},
    stopped:false
  });
  rajState.layer?.classList.remove("active");
  rajState.layer?.setAttribute("aria-hidden","true");
  rajState.layer?.replaceChildren();
}

function rajViewport(){
  return {
    w:Math.max(320,window.innerWidth),
    h:Math.max(280,window.innerHeight)
  };
}

function rajClampPosition(x,y,margin=72){
  const view=rajViewport();
  return {
    x:Math.min(view.w-margin,Math.max(18,x)),
    y:Math.min(view.h-margin,Math.max(78,y))
  };
}

function rajRandomPosition(){
  const view=rajViewport();
  const reservedBottom=120;
  return rajClampPosition(
    48+Math.random()*Math.max(120,view.w-180),
    96+Math.random()*Math.max(120,view.h-reservedBottom-160)
  );
}

function rajCreateImage(className,src,alt=""){
  const wrap=document.createElement("div");
  wrap.className=className;
  const img=document.createElement("img");
  img.src=src;
  img.alt=alt;
  wrap.appendChild(img);
  rajState.layer.appendChild(wrap);
  return rajTrack(wrap);
}

function rajCreateUnit(kind,src,labelSrc,start){
  const unit=rajCreateImage(`raj-unit interactive raj-${kind}`,src,kind);
  unit.style.setProperty("--raj-x",`${start.x}px`);
  unit.style.setProperty("--raj-y",`${start.y}px`);
  const character=unit.querySelector("img");
  if(character)character.className="raj-character";
  const label=document.createElement("img");
  label.className="raj-nameplate";
  label.src=labelSrc;
  label.alt="";
  unit.appendChild(label);
  if(kind==="happios"){
    unit.addEventListener("mouseenter",()=>{
      ensureAchievements();
      data.achievements.counters.happiosHover=(data.achievements.counters.happiosHover||0)+1;
      save();
      if(data.achievements.counters.happiosHover>=3)unlockAchievement("secret_happios_hover");
    });
  }
  return unit;
}

async function rajMoveUnit(unit,to,duration=1600){
  if(!rajState.active || !unit)return false;
  const next=rajClampPosition(to.x,to.y);
  unit.classList.add("moving");
  unit.style.setProperty("--raj-speed",`${duration}ms`);
  unit.style.setProperty("--raj-x",`${next.x}px`);
  unit.style.setProperty("--raj-y",`${next.y}px`);
  if(unit===rajState.raj)rajState.rajPos=next;
  const ok=await rajDelay(duration+80);
  unit.classList.remove("moving");
  return ok && rajState.active;
}

function rajMonsterLoot(monster){
  if(monster.id==="bouftou" && Math.random()<.38)return "./assets/images/raj/loot/cuir.png";
  return monster.loot[0];
}

function rajElementCenter(element){
  const rect=element?.getBoundingClientRect?.();
  if(!rect || rect.width<4 || rect.height<4)return null;
  return rajClampPosition(rect.left+rect.width/2,rect.top+rect.height/2,64);
}

function rajVisibleElement(selector){
  const element=$(selector);
  if(!element)return null;
  const style=getComputedStyle(element);
  if(style.display==="none" || style.visibility==="hidden" || Number(style.opacity)===0)return null;
  const rect=element.getBoundingClientRect();
  if(rect.right<0 || rect.bottom<0 || rect.left>window.innerWidth || rect.top>window.innerHeight)return null;
  return element;
}

function rajFindEggTargets(){
  const targets=[];
  const add=(id,label,element)=>{
    const pos=rajElementCenter(element);
    if(pos)targets.push({id,label,element,pos});
  };
  if(ainaEnabled)add("aina","Aina",rajVisibleElement("#ainaOverlay"));
  if(toomEnabled)add("toom","Toom",rajVisibleElement("#toomOverlay"));
  if(alhassEnabled)add("alhass","Alhass",rajVisibleElement("#alhassPresence"));
  if(charlieEnabled)add("charlie","Charlie",rajVisibleElement("#charlieCursor"));
  if(data.ui?.capyMode)add("capy","Capy",rajVisibleElement("#pykurImg"));
  return targets;
}

function rajAttachTrophy(src,className=""){
  if(!rajState.raj || rajState.raj.querySelector(`.${className}`))return;
  const img=document.createElement("img");
  img.className=`raj-trophy ${className}`.trim();
  img.src=src;
  img.alt="";
  rajState.raj.appendChild(img);
}

function rajMountToomBike(){
  if(!rajState.raj || rajState.raj.classList.contains("mounted"))return;
  const bike=document.createElement("img");
  bike.className="raj-mount-bike";
  bike.src="./assets/images/toom-nrg.png";
  bike.alt="";
  rajState.raj.prepend(bike);
  rajState.raj.classList.add("mounted");
}

function rajDisableEggTarget(target){
  if(!target)return;
  if(target.id==="aina" && ainaEnabled){
    ainaEnabled=false;
    document.body.classList.remove("aina-mode");
    const overlay=$("#ainaOverlay");
    overlay?.classList.remove("aina-active");
    overlay?.removeAttribute("style");
    rajAttachTrophy("./assets/images/Aina-ivoir.png","raj-dofus-trophy");
    toast("🥚 Raj-Pah récupère le Dofus Ivoire d'Aina.","aina","unlock");
    return;
  }
  if(target.id==="toom" && toomEnabled){
    toomEnabled=false;
    document.body.classList.remove("toom-mode");
    const overlay=$("#toomOverlay");
    overlay?.classList.remove("toom-active");
    overlay?.removeAttribute("style");
    rajMountToomBike();
    toast("🏍️ Raj-Pah récupère la NRG 500 de Toom et continue son farm.","toom","unlock");
    return;
  }
  if(target.id==="alhass" && alhassEnabled){
    alhassEnabled=false;
    alhassLastReaction=0;
    document.body.classList.remove("alhass-mode");
    toast("⚔️ Raj-Pah neutralise Alhass avant l'inspection.","warning","warning");
    return;
  }
  if(target.id==="charlie" && charlieEnabled){
    charlieEnabled=false;
    document.body.classList.remove("charlie-mode");
    if(charlieMoveHandler)document.removeEventListener("pointermove",charlieMoveHandler);
    charlieMoveHandler=null;
    const cursor=$("#charlieCursor");
    cursor?.classList.remove("chomp");
    cursor?.removeAttribute("style");
    toast("🎯 Raj-Pah tire sur Charlie. Le curseur redevient normal.","warning","mark");
    return;
  }
  if(target.id==="capy" && data.ui?.capyMode){
    setCapyMode(false,false);
    toast("🥬 Raj-Pah chasse Capy du tracker.","warning","warning");
  }
}

async function rajAttackEggTarget(target){
  if(!rajState.active || rajState.banned || !target?.element)return false;
  toast(`🎯 Raj-Pah repère ${target.label}.`,"warning","mark");
  await rajMoveUnit(rajState.raj,{x:target.pos.x-82,y:target.pos.y-46},1000);
  if(!rajState.active)return false;
  const fakeTarget={node:target.element,pos:target.pos,monster:{id:"egg",loot:["./assets/images/raj/loot/laine.png"]}};
  const shot=await rajShootMonster(fakeTarget,{removeTarget:false});
  if(!shot || !rajState.active)return false;
  target.element.classList.add("raj-egg-victim");
  await rajDelay(460);
  target.element.classList.remove("raj-egg-victim");
  rajDisableEggTarget(target);
  await rajDelay(520);
  return rajState.active;
}

function rajSpawnGroup(){
  const count=1+Math.floor(Math.random()*3);
  const base=rajRandomPosition();
  const group=[];
  for(let i=0;i<count;i++){
    const monster=RAJ_ASSETS.monsters[Math.floor(Math.random()*RAJ_ASSETS.monsters.length)];
    const pos=rajClampPosition(base.x+i*58,base.y+(i%2)*34,70);
    const node=rajCreateImage(`raj-monster ${monster.className}`,monster.src,monster.id);
    node.style.setProperty("--raj-x",`${pos.x}px`);
    node.style.setProperty("--raj-y",`${pos.y}px`);
    group.push({node,monster,pos});
  }
  return group;
}

async function rajShootMonster(target,options={}){
  const from={x:rajState.rajPos.x+58,y:rajState.rajPos.y+42};
  const to={x:target.pos.x+30,y:target.pos.y+28};
  const angle=Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
  const arrow=rajCreateImage("raj-arrow",RAJ_ASSETS.arrow,"fleche");
  arrow.style.setProperty("--raj-x",`${from.x}px`);
  arrow.style.setProperty("--raj-y",`${from.y}px`);
  arrow.style.setProperty("--raj-angle",`${angle}deg`);
  await rajDelay(40);
  arrow.style.setProperty("--raj-x",`${to.x}px`);
  arrow.style.setProperty("--raj-y",`${to.y}px`);
  arrow.style.setProperty("--raj-angle",`${angle}deg`);
  await rajDelay(560);
  rajRemoveElement(arrow);
  if(!rajState.active)return false;
  target.node.classList.add("hit");
  await rajDelay(420);
  if(options.removeTarget!==false){
    target.node.classList.add("dead");
    await rajDelay(260);
    rajRemoveElement(target.node);
  }else{
    target.node.classList.remove("hit");
  }
  return rajState.active;
}

async function rajMonsterCounterAttack(target){
  if(!rajState.active || rajState.banned || !target?.node)return false;
  const shouldAttack=target.monster.id==="chefBouftou" || Math.random()<.45;
  if(!shouldAttack)return true;
  const dx=rajState.rajPos.x-target.pos.x;
  const dy=rajState.rajPos.y-target.pos.y;
  const distance=Math.max(1,Math.hypot(dx,dy));
  target.node.style.setProperty("--raj-attack-x",`${Math.round((dx/distance)*28)}px`);
  target.node.style.setProperty("--raj-attack-y",`${Math.round((dy/distance)*18)}px`);
  rajState.raj?.style.setProperty("--raj-recoil",`${dx>=0?8:-8}px`);
  target.node.classList.add("attacking");
  await rajDelay(180);
  rajState.raj?.classList.add("under-attack");
  await rajDelay(420);
  target.node.classList.remove("attacking");
  rajState.raj?.classList.remove("under-attack");
  return rajState.active;
}

async function rajDropAndLoot(target){
  rajState.looting=true;
  const lootSrc=rajMonsterLoot(target.monster);
  const loot=rajCreateImage("raj-loot",lootSrc,"loot");
  const pos=rajClampPosition(target.pos.x+12,target.pos.y+28,34);
  loot.style.setProperty("--raj-x",`${pos.x}px`);
  loot.style.setProperty("--raj-y",`${pos.y}px`);
  await rajDelay(40);
  loot.classList.add("show");
  await rajDelay(360);
  await rajMoveUnit(rajState.raj,{x:pos.x-22,y:pos.y-56},900);
  if(!rajState.active)return false;
  loot.classList.add("picked");
  toast("📦 Raj-Pah ramasse le butin.","info","click");
  await rajDelay(220);
  rajRemoveElement(loot);
  rajState.looting=false;
  return rajState.active;
}

async function rajFightGroup(group){
  rajState.fighting=true;
  toast("⚔️ Raj-Pah engage un groupe de Bouftous.","warning","mark");
  for(const target of group){
    if(!rajState.active || rajState.banned)return false;
    await rajMoveUnit(rajState.raj,{x:target.pos.x-72,y:target.pos.y-28},1100);
    if(!rajState.active)return false;
    if(!await rajMonsterCounterAttack(target))return false;
    if(!await rajShootMonster(target))return false;
    if(!await rajDropAndLoot(target))return false;
  }
  rajState.fighting=false;
  rajState.combats++;
  return rajState.active;
}

async function rajModeratorSequence(){
  if(!rajState.active || rajState.moderatorActive)return;
  rajState.moderatorActive=true;
  toast("🛡️ Happios effectue une ronde anti-bot.","warning","warning");
  const view=rajViewport();
  const start=rajClampPosition(view.w-92,110,80);
  rajState.happios=rajCreateUnit("happios",RAJ_ASSETS.modo,RAJ_ASSETS.happiosLabel,start);
  await rajMoveUnit(rajState.happios,rajClampPosition(view.w*.72,view.h*.45),1500);
  if(!rajState.active)return;
  await rajMoveUnit(rajState.happios,rajClampPosition(view.w*.55,view.h*.35),1300);
  if(!rajState.active)return;
  const nearRaj=rajClampPosition(rajState.rajPos.x+88,rajState.rajPos.y-12);
  await rajMoveUnit(rajState.happios,nearRaj,1200);
  if(!rajState.active)return;
  rajState.banned=true;
  unlockAchievement("secret_raj_ban");
  const card=rajCreateImage("raj-card",RAJ_ASSETS.redCard,"carton rouge");
  card.style.setProperty("--raj-x",`${nearRaj.x-24}px`);
  card.style.setProperty("--raj-y",`${nearRaj.y-50}px`);
  await rajDelay(80);
  card.classList.add("show");
  await rajDelay(650);
  rajState.raj?.classList.add("banned");
  toast("🔨 Le compte Raj-Pah a été banni définitivement pour botting.","error","warning");
  console.info("[Raj-Pah] Ban Happios applique. Botting detecte.");
  await rajDelay(2600);
  toast("🛡️ Happios a terminé sa ronde.","info","click");
  await rajDelay(1200);
  stopRajEasterEgg({manual:false});
}

async function rajMainLoop(){
  while(rajState.active && !rajState.banned){
    for(let i=0;i<2 && rajState.active;i++){
      await rajMoveUnit(rajState.raj,rajRandomPosition(),1300+Math.random()*850);
      await rajDelay(360+Math.random()*520);
    }
    if(!rajState.active || rajState.banned)break;
    const eggTargets=rajFindEggTargets();
    if(eggTargets.length && Math.random()<.72){
      const target=eggTargets[Math.floor(Math.random()*eggTargets.length)];
      const ok=await rajAttackEggTarget(target);
      if(!ok)break;
      continue;
    }
    const group=rajSpawnGroup();
    const ok=await rajFightGroup(group);
    group.forEach(item=>rajRemoveElement(item.node));
    if(!ok)break;
    if(rajState.combats>=rajState.combatsBeforeBan){
      await rajModeratorSequence();
      break;
    }
  }
}

function startRajEasterEgg(){
  if(rajState.active)return;
  if(!rajIsDesktop()){
    toast("Raj-Pah préfère farmer sur desktop.","info","click");
    return;
  }
  if(brakoState.active){
    requestBrakoRajInterrupt();
    return;
  }
  rajResetState();
  rajState.layer=$("#rajEasterEggLayer");
  if(!rajState.layer)return;
  rajState.active=true;
  unlockAchievement("egg_raj");
  rajState.stopped=false;
  rajState.combatsBeforeBan=2+Math.floor(Math.random()*3);
  rajState.layer.classList.add("active");
  rajState.layer.setAttribute("aria-hidden","false");
  rajState.rajPos=rajClampPosition(80,window.innerHeight-190);
  rajState.raj=rajCreateUnit("raj",RAJ_ASSETS.cra,RAJ_ASSETS.rajLabel,rajState.rajPos);
  toast("🟢 Raj-Pah s’est connecté.","success","unlock");
  console.info("[Raj-Pah] Connexion detectee. Debut du farm Bouftou.");
  rajMainLoop();
  rajTimer(()=>rajModeratorSequence(),45000+Math.random()*24000);
}

function stopRajEasterEgg({manual=true}={}){
  if(!rajState.active && !rajState.elements.length)return;
  rajResetState();
  if(manual){
    toast("🔴 Raj-Pah s’est déconnecté.","warning","click");
    console.info("[Raj-Pah] Evenement stoppe manuellement.");
  }
}

function toggleRajEasterEgg(){
  if(rajState.active)stopRajEasterEgg({manual:true});
  else startRajEasterEgg();
}

function brakoIsDesktop(){
  return !window.matchMedia("(max-width: 760px)").matches && !window.matchMedia("(pointer: coarse)").matches;
}

function brakoTimer(fn,delay){
  const timer={id:null,resolve:null};
  timer.id=setTimeout(()=>{
    brakoState.timers=brakoState.timers.filter(item=>item!==timer);
    fn?.();
    timer.resolve?.(true);
  },delay);
  brakoState.timers.push(timer);
  return timer;
}

function brakoDelay(delay){
  return new Promise(resolve=>{
    const timer=brakoTimer(null,delay);
    timer.resolve=resolve;
  });
}

function brakoClearTimers(){
  brakoState.timers.forEach(timer=>{
    clearTimeout(timer.id);
    timer.resolve?.(false);
  });
  brakoState.timers=[];
}

function brakoTrack(element){
  brakoState.elements.push(element);
  return element;
}

function brakoRemoveElement(element){
  if(!element)return;
  element.remove();
  brakoState.elements=brakoState.elements.filter(item=>item!==element);
}

function brakoResetState(){
  brakoClearTimers();
  brakoState.elements.forEach(element=>element.remove());
  Object.assign(brakoState,{
    active:false,
    phase:"idle",
    timers:[],
    elements:[],
    dropRolled:false,
    finished:false,
    brako:null,
    minotot:null,
    brakoPos:{x:100,y:360},
    minototPos:{x:900,y:340},
    dialogueLimit:0,
    dialoguesShown:0,
    dialogueNode:null,
    interruptRequested:false,
    interrupting:false,
    interruptDone:false,
    pendingRajInterrupt:false
  });
  brakoState.layer?.classList.remove("active");
  brakoState.layer?.setAttribute("aria-hidden","true");
  brakoState.layer?.replaceChildren();
}

function brakoViewport(){
  return {w:Math.max(320,window.innerWidth),h:Math.max(280,window.innerHeight)};
}

function brakoClampPosition(x,y,margin=110){
  const view=brakoViewport();
  return {
    x:Math.min(view.w-margin,Math.max(24,x)),
    y:Math.min(view.h-margin,Math.max(86,y))
  };
}

function brakoCreateImage(className,src,alt=""){
  const wrap=document.createElement("div");
  wrap.className=className;
  const img=document.createElement("img");
  img.className="brako-body";
  img.src=src;
  img.alt=alt;
  wrap.appendChild(img);
  brakoState.layer.appendChild(wrap);
  return brakoTrack(wrap);
}

function brakoCreateUnit(kind,src,start,{interactive=false,nametag=false}={}){
  const unit=brakoCreateImage(`brako-unit brako-${kind}${interactive?" interactive":""}`,src,kind);
  unit.style.setProperty("--brako-x",`${start.x}px`);
  unit.style.setProperty("--brako-y",`${start.y}px`);
  if(nametag){
    const label=document.createElement("img");
    label.className="brako-nametag";
    label.src=BRAKO_ASSETS.nametag;
    label.alt="";
    unit.appendChild(label);
  }
  return unit;
}

function brakoSetPos(unit,pos){
  unit.style.setProperty("--brako-x",`${pos.x}px`);
  unit.style.setProperty("--brako-y",`${pos.y}px`);
}

function brakoFaceTarget(unit,from,to){
  unit?.style.setProperty("--brako-face",to.x < from.x ? "-1" : "1");
}

function brakoMaybeDialogue(force=false){
  if(!brakoState.active || !brakoState.brako || brakoState.dialoguesShown>=brakoState.dialogueLimit)return;
  if(!force)return;
  brakoState.dialoguesShown++;
  brakoState.dialogueNode?.remove();
  const bubble=document.createElement("div");
  bubble.className="brako-dialogue";
  const text=document.createElement("span");
  text.textContent=BRAKO_ASSETS.dialogueTexts[Math.floor(Math.random()*BRAKO_ASSETS.dialogueTexts.length)];
  bubble.appendChild(text);
  brakoState.brako.appendChild(bubble);
  brakoState.dialogueNode=bubble;
  brakoTimer(()=>bubble.classList.add("show"),40);
  brakoTimer(()=>{
    bubble.classList.remove("show");
    brakoTimer(()=>bubble.remove(),220);
    if(brakoState.dialogueNode===bubble)brakoState.dialogueNode=null;
  },2800+Math.random()*900);
}

function requestBrakoRajInterrupt(){
  if(!brakoState.active || brakoState.interruptDone || brakoState.interrupting){
    toast("Raj-Pah garde ses distances avec Brako.","warning","warning");
    return;
  }
  brakoState.interruptRequested=true;
  toast("Raj-Pah tente d'interrompre Brako.","warning","mark");
}

async function brakoWaitIfInterrupted(){
  if(!brakoState.active || !brakoState.interruptRequested || brakoState.interrupting || brakoState.interruptDone)return true;
  return await brakoHandleRajInterrupt();
}

async function brakoMoveUnit(unit,stateKey,to,duration=1200){
  if(!brakoState.active || !unit)return false;
  const next=brakoClampPosition(to.x,to.y);
  unit.classList.add("moving");
  unit.style.setProperty("--brako-speed",`${duration}ms`);
  brakoSetPos(unit,next);
  brakoState[stateKey]=next;
  const other=stateKey==="brakoPos"?brakoState.minototPos:brakoState.brakoPos;
  brakoFaceTarget(unit,next,other);
  const ok=await brakoDelay(duration+80);
  unit.classList.remove("moving");
  return ok && brakoState.active;
}

function brakoAngle(from,to){
  return Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI;
}

async function brakoShowWeapon(src,from,to,duration=320){
  if(!brakoState.active)return false;
  const weapon=brakoCreateImage("brako-weapon",src,"attaque");
  weapon.style.setProperty("--brako-x",`${from.x}px`);
  weapon.style.setProperty("--brako-y",`${from.y}px`);
  weapon.style.setProperty("--brako-angle",`${brakoAngle(from,to)}deg`);
  await brakoDelay(30);
  weapon.classList.add("show");
  await brakoDelay(duration);
  brakoRemoveElement(weapon);
  return brakoState.active;
}

async function brakoShootArrow({explosive=false,push=0}={}){
  if(!brakoState.active)return false;
  brakoFaceTarget(brakoState.brako,brakoState.brakoPos,brakoState.minototPos);
  await brakoShowWeapon(BRAKO_ASSETS.arc,{x:brakoState.brakoPos.x+44,y:brakoState.brakoPos.y+38},brakoState.minototPos,180);
  const from={x:brakoState.brakoPos.x+64,y:brakoState.brakoPos.y+48};
  const to={x:brakoState.minototPos.x+78,y:brakoState.minototPos.y+72};
  const arrow=brakoCreateImage("brako-arrow",BRAKO_ASSETS.arrow,"fleche");
  arrow.style.setProperty("--brako-x",`${from.x}px`);
  arrow.style.setProperty("--brako-y",`${from.y}px`);
  arrow.style.setProperty("--brako-angle",`${brakoAngle(from,to)}deg`);
  await brakoDelay(40);
  arrow.style.setProperty("--brako-x",`${to.x}px`);
  arrow.style.setProperty("--brako-y",`${to.y}px`);
  arrow.style.setProperty("--brako-angle",`${brakoAngle(from,to)}deg`);
  await brakoDelay(520);
  brakoRemoveElement(arrow);
  if(explosive){
    const impact=brakoCreateImage("brako-impact",BRAKO_ASSETS.explo,"explosion");
    impact.style.setProperty("--brako-x",`${to.x-40}px`);
    impact.style.setProperty("--brako-y",`${to.y-40}px`);
    await brakoDelay(40);
    impact.classList.add("show");
    await brakoDelay(1480);
    brakoRemoveElement(impact);
  }
  brakoState.minotot?.classList.add("hit");
  if(push){
    const dir=brakoState.minototPos.x<brakoState.brakoPos.x?-1:1;
    const next=brakoClampPosition(brakoState.minototPos.x+dir*push,brakoState.minototPos.y,180);
    brakoSetPos(brakoState.minotot,next);
    brakoState.minototPos=next;
  }
  await brakoDelay(420);
  brakoState.minotot?.classList.remove("hit");
  return brakoState.active;
}

async function brakoBaguetteCombo(){
  toast("⚡ Brako passe au corps à corps.","warning","warning");
  await brakoMoveUnit(brakoState.brako,"brakoPos",{x:brakoState.minototPos.x-70,y:brakoState.minototPos.y+34},900);
  for(let i=0;i<4 && brakoState.active;i++){
    const from={x:brakoState.brakoPos.x+52,y:brakoState.brakoPos.y+40};
    const to={x:brakoState.minototPos.x+70,y:brakoState.minototPos.y+72};
    await brakoShowWeapon(BRAKO_ASSETS.baguette,from,to,180);
    brakoState.minotot?.classList.add("hit");
    await brakoDelay(160);
    brakoState.minotot?.classList.remove("hit");
  }
  return brakoState.active;
}

async function brakoHitTemporaryRaj(tempRaj){
  if(!brakoState.active || !tempRaj)return false;
  brakoFaceTarget(brakoState.brako,brakoState.brakoPos,brakoState.brakoRajPos);
  await brakoMoveUnit(brakoState.brako,"brakoPos",{x:brakoState.brakoRajPos.x-62,y:brakoState.brakoRajPos.y+8},760);
  for(let i=0;i<3 && brakoState.active;i++){
    const from={x:brakoState.brakoPos.x+50,y:brakoState.brakoPos.y+44};
    const to={x:brakoState.brakoRajPos.x+38,y:brakoState.brakoRajPos.y+46};
    await brakoShowWeapon(BRAKO_ASSETS.baguette,from,to,150);
    tempRaj.classList.add("hit");
    await brakoDelay(120);
    tempRaj.classList.remove("hit");
  }
  tempRaj.classList.add("defeated");
  await brakoDelay(380);
  brakoRemoveElement(tempRaj);
  return brakoState.active;
}

async function brakoHandleRajInterrupt(){
  if(!brakoState.active || brakoState.interrupting || brakoState.interruptDone)return brakoState.active;
  brakoState.interrupting=true;
  brakoState.phase="raj-interrupt";
  unlockAchievement("secret_egg_war");
  const start=rajState.active ? {...rajState.rajPos} : brakoClampPosition(brakoState.brakoPos.x+260,brakoState.brakoPos.y+28,90);
  if(rajState.active)stopRajEasterEgg({manual:false});
  const tempRaj=brakoCreateImage("brako-unit brako-raj-intruder",RAJ_ASSETS.cra,"Raj-Pah");
  brakoState.brakoRajPos=brakoClampPosition(start.x,start.y,90);
  brakoSetPos(tempRaj,brakoState.brakoRajPos);
  await brakoDelay(180);
  if(!brakoState.active)return false;
  toast("⚡ Brako interrompt Raj-Pah à coups de baguette.","warning","warning");
  await brakoMoveUnit(tempRaj,"brakoRajPos",{x:brakoState.brakoPos.x+128,y:brakoState.brakoPos.y+14},760);
  const from={x:brakoState.brakoRajPos.x+46,y:brakoState.brakoRajPos.y+42};
  const to={x:brakoState.brakoPos.x+42,y:brakoState.brakoPos.y+48};
  const arrow=brakoCreateImage("brako-arrow",RAJ_ASSETS.arrow,"fleche");
  arrow.style.setProperty("--brako-x",`${from.x}px`);
  arrow.style.setProperty("--brako-y",`${from.y}px`);
  arrow.style.setProperty("--brako-angle",`${brakoAngle(from,to)}deg`);
  await brakoDelay(40);
  arrow.style.setProperty("--brako-x",`${to.x}px`);
  arrow.style.setProperty("--brako-y",`${to.y}px`);
  await brakoDelay(360);
  brakoRemoveElement(arrow);
  if(!await brakoHitTemporaryRaj(tempRaj))return false;
  toast("Raj-Pah a fui le combat.","info","click");
  brakoState.interrupting=false;
  brakoState.interruptRequested=false;
  brakoState.interruptDone=true;
  brakoState.phase="distance";
  await brakoDelay(420);
  return brakoState.active;
}

async function brakoRollLoot(){
  brakoState.dropRolled=true;
  const dropped=Math.random()<.2;
  if(!dropped)unlockAchievement("secret_brako_no_drop");
  if(!dropped){
    toast("🥚 Eh… pas d'œuf.","info","click");
    return brakoState.active;
  }
  toast("🟣 Incroyable ! Le Minotot a lâché un Dofus Pourpre !","rare","unlock");
  unlockAchievement("secret_brako_drop");
  const pos=brakoClampPosition(brakoState.minototPos.x+58,brakoState.minototPos.y+90,70);
  const loot=brakoCreateImage("brako-loot",BRAKO_ASSETS.pourpre,"Dofus Pourpre");
  loot.style.setProperty("--brako-x",`${pos.x}px`);
  loot.style.setProperty("--brako-y",`${pos.y}px`);
  await brakoDelay(80);
  loot.classList.add("show");
  await brakoDelay(650);
  await brakoMoveUnit(brakoState.brako,"brakoPos",{x:pos.x-42,y:pos.y-72},900);
  loot.classList.add("picked");
  await brakoDelay(280);
  brakoRemoveElement(loot);
  return brakoState.active;
}

async function brakoFightSequence(){
  brakoState.phase="spawn";
  const view=brakoViewport();
  const topLane=ainaEnabled ? 118 : 96;
  brakoState.brakoPos=brakoClampPosition(96,topLane+38,120);
  brakoState.minototPos=brakoClampPosition(view.w-270,topLane+8,210);
  brakoState.brako=brakoCreateUnit("hero",BRAKO_ASSETS.brako,brakoState.brakoPos,{interactive:true,nametag:true});
  brakoState.minotot=brakoCreateUnit("minotot",BRAKO_ASSETS.minotot,brakoState.minototPos);
  brakoFaceTarget(brakoState.brako,brakoState.brakoPos,brakoState.minototPos);
  brakoFaceTarget(brakoState.minotot,brakoState.minototPos,brakoState.brakoPos);
  toast("🟣 Brako entre en combat contre le Minotot.","rare","unlock");
  await brakoDelay(900);
  brakoMaybeDialogue(true);
  if(brakoState.pendingRajInterrupt || rajState.active){
    brakoState.interruptRequested=true;
    if(!await brakoWaitIfInterrupted())return;
  }

  brakoState.phase="distance";
  for(let i=0;i<3 && brakoState.active;i++){
    if(!await brakoWaitIfInterrupted())return;
    await brakoMoveUnit(brakoState.minotot,"minototPos",{x:brakoState.minototPos.x-56,y:brakoState.minototPos.y},1050);
    if(!await brakoWaitIfInterrupted())return;
    await brakoMoveUnit(brakoState.brako,"brakoPos",{x:Math.max(36,brakoState.brakoPos.x-22),y:brakoState.brakoPos.y+(i%2?12:-10)},760);
    brakoMaybeDialogue(false);
    if(!await brakoShootArrow({push:i===2?34:0}))return;
  }

  brakoState.phase="explosive";
  if(!await brakoWaitIfInterrupted())return;
  toast("💥 Flèche explosive !","warning","warning");
  brakoMaybeDialogue(true);
  if(!await brakoShootArrow({explosive:true,push:82}))return;
  await brakoDelay(500);

  brakoState.phase="finish";
  if(!await brakoWaitIfInterrupted())return;
  await brakoMoveUnit(brakoState.minotot,"minototPos",{x:brakoState.brakoPos.x+118,y:brakoState.brakoPos.y-30},1200);
  if(!await brakoBaguetteCombo())return;

  brakoState.phase="death";
  brakoState.minotot?.classList.add("dead");
  await brakoDelay(720);
  brakoRemoveElement(brakoState.minotot);
  brakoState.minotot=null;

  brakoState.phase="loot";
  if(!await brakoRollLoot())return;
  brakoState.phase="done";
  brakoState.finished=true;
  await brakoDelay(2200);
  stopBrakoEasterEgg({manual:false});
}

function startBrakoEasterEgg(){
  if(brakoState.active)return;
  if(!brakoIsDesktop()){
    toast("Brako préfère combattre le Minotot sur PC.","info","click");
    return;
  }
  if(typeof dimehMode!=="undefined" && dimehMode){
    toast("Brako attend que l'autre événement se termine.","warning","warning");
    return;
  }
  const hadRajActive=rajState.active;
  brakoResetState();
  brakoState.layer=$("#brakoEasterEggLayer");
  if(!brakoState.layer)return;
  brakoState.active=true;
  unlockAchievement("egg_brako");
  brakoState.finished=false;
  brakoState.pendingRajInterrupt=hadRajActive;
  brakoState.dialogueLimit=1;
  brakoState.layer.classList.add("active");
  brakoState.layer.setAttribute("aria-hidden","false");
  brakoFightSequence();
}

function stopBrakoEasterEgg({manual=true}={}){
  if(!brakoState.active && !brakoState.elements.length)return;
  brakoResetState();
  if(manual)toast("Brako quitte le combat.","warning","click");
}

function toggleBrakoEasterEgg(){
  if(brakoState.active)stopBrakoEasterEgg({manual:true});
  else startBrakoEasterEgg();
}

function getPykurImageSrc(pp=currentPP()){
  const familiar=activeFamiliar();
  if(pp >= activeProgressMax())return familiar.auraImage||AURAPYKUR_IMAGE_SRC;
  return `./assets/optimized/catalog/${familiar.id}.webp`;
}

function setPykurImageSafely(src,alt){
  const img=$("#pykurImg");
  if(!img)return;
  const fallback=assetPath(activeFamiliar().image||PYKUR_IMAGE_SRC);
  img.onerror=()=>{
    img.onerror=null;
    img.src=fallback;
  };
  const currentSrc=img.getAttribute("src") || "";
  if(!currentSrc.endsWith(src.replace("./","")) && currentSrc !== src){
    img.src=src;
  }
  img.alt=alt;
}

function updateProgressTitle(){
  const title=$("#progressTitle");
  if(!title)return;
  title.textContent=data.ui?.capyMode ? "Progression du Capykur" : `Progression du ${activeFamiliar().shortLabel}`;
}

function setCapyMode(enabled,notify=true){
  if(!data.ui)data.ui={};
  data.ui.capyMode=!!enabled;
  document.body.classList.toggle("capy-mode",data.ui.capyMode);
  updateProgressTitle();
  updatePykurImageByPP(currentPP());
  save();

  if(!notify)return;
  if(data.ui.capyMode){
    unlockAchievement("egg_capy");
    toast("🥬 Capy a colonisé le tracker. Le Pykur est officiellement en pause goûter.","capy","unlock");
    addActivity("Easter egg Capykur activé","system");
  }else{
    toast("💀 L'espèce du Capybara est maintenant éteinte. Le Pykur reprend son trône.","error","warning");
    addActivity("Easter egg Capykur désactivé","warning");
  }
}

function toggleCapyMode(){
  setCapyMode(!data.ui?.capyMode,true);
}

function buildVersionUrl(file,view){
  const url=new URL(file,location.href);
  const params=new URLSearchParams(location.search);
  params.forEach((value,key)=>{if(key!=="view")url.searchParams.set(key,value)});
  url.searchParams.set("view",view);
  return url.href;
}

function goToVersion(view){
  location.href=view==="mobile"?buildVersionUrl("./mobile.html","mobile"):buildVersionUrl("./index.html","desktop");
}

const LIVING_EVENT_DEFS=[
  {id:"rain",label:"Pluie",message:"Une pluie légère commence à tomber.",duration:20000,sound:"import",run:livingRain},
  {id:"wind",label:"Vent",message:"Une bourrasque traverse la région.",duration:12000,sound:"undo",run:livingWind},
  {id:"heat",label:"Canicule",message:"L'air devient étouffant.",duration:15000,sound:"warning",run:livingHeat},
  {id:"storm",label:"Orage",message:"Le ciel gronde au loin.",duration:10000,sound:"warning",run:livingStorm},
  {id:"fog",label:"Brouillard",message:"Un brouillard étrange recouvre les environs.",duration:20000,sound:"click",run:livingFog},
  {id:"nightfall",label:"Nuit tombante",message:"Les ombres s'allongent.",duration:20000,sound:"click",run:livingNight},
  {id:"sunray",label:"Rayon de soleil",message:"Une éclaircie perce les nuages.",duration:10000,sound:"success",run:livingSunray},
  {id:"keph",label:"Fantôme de Keph",message:"Une présence familière traverse les lieux...",duration:42000,sound:"reset",run:livingKeph},
  {id:"shadow",label:"Ombre mystérieuse",message:"Quelqu'un semblait observer le tracker.",duration:8000,sound:"click",run:livingShadow},
  {id:"butterfly",label:"Papillon doré",message:"Un papillon lumineux apparaît brièvement.",duration:15000,sound:"unlock",run:livingButterfly},
  {id:"corbac",label:"Corbac de passage",message:"Un corbac traverse le ciel.",duration:5000,sound:"warning",run:livingCorbac},
  {id:"chacha",label:"Chacha perdu",message:"Un Chacha semble chercher son chemin.",duration:15000,sound:"click",run:livingChacha},
  {id:"larva",label:"Larve errante",message:"Une larve traverse discrètement la zone.",duration:20000,sound:"click",run:livingLarva},
  {id:"tofu",label:"Tofu paniqué",message:"Un Tofu passe en courant.",duration:3000,sound:"mark",run:livingTofu},
  {id:"poop",label:"Crotte",message:"Quelqu'un a laissé une surprise.",duration:45000,sound:"warning",interactive:true,run:livingPoop},
  {id:"coin",label:"Pièce oubliée",message:"Quelque chose brille dans un coin.",duration:45000,sound:"success",interactive:true,run:livingCoin},
  {id:"fragment",label:"Fragment perdu",message:"Un fragment de prospection semble avoir été abandonné.",duration:45000,sound:"pp",interactive:true,run:livingFragment},
  {id:"chest",label:"Coffre abandonné",message:"Un vieux coffre est apparu.",duration:60000,sound:"unlock",interactive:true,run:livingChest},
  {id:"bottle",label:"Bouteille à la mer",message:"Une étrange bouteille s'est échouée.",duration:60000,sound:"click",interactive:true,run:livingBottle},
  {id:"resonance",label:"Résonance du familier",message:"Le familier réagit étrangement.",duration:8000,sound:"pp",run:livingResonance},
  {id:"unstableAura",label:"Aura instable",message:"Une énergie inhabituelle se manifeste.",duration:15000,sound:"unlock",run:livingAura},
  {id:"shootingStar",label:"Étoile filante",message:"Un éclat traverse le ciel.",duration:3000,sound:"unlock",run:livingStar},
  {id:"sleepy",label:"Familier endormi",message:"Le familier semble fatigué.",duration:15000,sound:"reset",run:livingSleepy},
  {id:"comet",label:"Comète",message:"Un présage traverse le ciel.",duration:4000,sound:"unlock",legendary:true,run:livingComet},
  {id:"awakening",label:"Éveil spontané",message:"Le familier libère une énergie ancienne.",duration:8000,sound:"unlock",legendary:true,run:livingAwakening},
  {id:"fakeBug",label:"Faux bug",message:"Erreur 404 : Motivation introuvable.",duration:2000,sound:"error",legendary:true,run:livingFakeBug}
];

const livingState={
  active:false,
  current:null,
  timer:null,
  endTimer:null,
  alertTimer:null,
  pendingEvent:null,
  cooldownUntil:0,
  adminOpen:false,
  heatAudio:null,
  heatAudioPlays:0,
  kephAudio:null,
  resonanceAudio:null,
  sleepyOriginalSrc:null,
  sleepyOriginalAlt:null,
  pykurAnchors:new Map(),
  pykurAnchorFrame:null,
  source:null,
  serverPollTimer:null,
  serverPolling:false,
  serverSequence:null,
  serverAlertSequence:null,
  serverStartedSequence:null,
  serverLastWarningAt:0,
  serverRemainingMs:0,
  serverReceivedAt:0,
  serverStartsAt:0,
  serverPaused:false,
  serverMinCooldownSeconds:600,
  serverMaxCooldownSeconds:1500
};

function livingLayer(){return $("#livingEventsLayer")}
function livingIsDesktop(){return !window.matchMedia("(max-width: 768px)").matches && !window.matchMedia("(pointer: coarse)").matches}
function livingRandom(min,max){return Math.floor(min+Math.random()*(max-min+1))}
function livingCooldownMs(){return livingRandom(10*60*1000,25*60*1000)}
function livingPick(){
  const legendary=Math.random()<.035;
  const pool=LIVING_EVENT_DEFS.filter(ev=>legendary?ev.legendary:!ev.legendary);
  return pool[Math.floor(Math.random()*pool.length)] || LIVING_EVENT_DEFS[0];
}
function livingSetDuration(ms){livingLayer()?.style.setProperty("--live-duration",`${ms}ms`)}
function livingAdd(node){
  const layer=livingLayer();
  if(!layer)return node;
  layer.appendChild(node);
  return node;
}
function livingUpdatePykurAnchor(node,anchor){
  if(!node)return;
  const orb=livingPykurRect();
  const x=orb.left+(orb.width*(anchor.xRatio||0))+(anchor.x||0);
  const y=orb.top+(orb.height*(anchor.yRatio||0))+(anchor.y||0);
  node.style.left=`${Math.round(x)}px`;
  node.style.top=`${Math.round(Math.max(anchor.minTop ?? -9999,y))}px`;
  if(anchor.widthOffset!==undefined)node.style.width=`${Math.max(1,Math.round(orb.width+anchor.widthOffset))}px`;
  if(anchor.heightOffset!==undefined)node.style.height=`${Math.max(1,Math.round(orb.height+anchor.heightOffset))}px`;
}
function livingAnchorToPykur(node,anchor={}){
  if(!node)return node;
  if(!livingState.pykurAnchors)livingState.pykurAnchors=new Map();
  livingState.pykurAnchors.set(node,anchor);
  livingUpdatePykurAnchor(node,anchor);
  return node;
}
function livingUpdatePykurAnchors(){
  livingState.pykurAnchorFrame=null;
  if(!livingState.pykurAnchors?.size)return;
  livingState.pykurAnchors.forEach((anchor,node)=>{
    if(!node?.isConnected)livingState.pykurAnchors.delete(node);
    else livingUpdatePykurAnchor(node,anchor);
  });
}
function livingRequestPykurAnchorUpdate(){
  if(!livingState.pykurAnchors?.size || livingState.pykurAnchorFrame)return;
  livingState.pykurAnchorFrame=requestAnimationFrame(livingUpdatePykurAnchors);
}
function livingEl(className,text="",style={}){
  const el=document.createElement("div");
  el.className=className;
  el.textContent=text;
  Object.assign(el.style,style);
  return el;
}
function livingSound(key){
  if(!data?.settings?.sound)return;
  const sound=sounds[key]||sounds.click;
  if(!sound){playSound(key||"click");return}
  const previous=sound.volume;
  sound.volume=.24*soundVolumeRatio();
  sound.currentTime=0;
  sound.play().catch(()=>{}).finally(()=>{sound.volume=previous});
}
function livingToast(message,type="info",soundKey="click"){
  if(data?.settings?.notifications){
    const wrap=$("#toastWrap");
    const node=document.createElement("div");
    node.className=`toast ${type}`;
    node.textContent=message;
    wrap?.appendChild(node);
    setTimeout(()=>node.remove(),4000);
  }
  livingSound(soundKey);
}
function livingStop({silent=false,schedule=true}={}){
  clearTimeout(livingState.timer);
  clearTimeout(livingState.endTimer);
  clearTimeout(livingState.alertTimer);
  livingState.pendingEvent=null;
  (livingState.soundTimers||[]).forEach(clearTimeout);
  livingState.soundTimers=[];
  livingStopHeatSound();
  livingStopKephSound();
  livingStopResonanceSound();
  livingRestoreSleepyImage();
  livingState.timer=null;
  livingState.endTimer=null;
  livingState.active=false;
  livingState.current=null;
  livingState.source=null;
  if(livingState.pykurAnchorFrame)cancelAnimationFrame(livingState.pykurAnchorFrame);
  livingState.pykurAnchorFrame=null;
  livingState.pykurAnchors?.clear();
  const layer=livingLayer();
  if(layer){
    layer.className="";
    layer.innerHTML="";
    layer.style.removeProperty("--live-duration");
  }
  $(".pykur-orb")?.classList.remove("pykur-milestone","pykur-energize");
  $(".side > .card:first-child")?.classList.remove("pykur-milestone");
  $("#pykurImg")?.classList.remove("live-pykur-sleepy-img","live-pykur-tired-img","live-pykur-sleeping-img");
  $(".pykur-orb")?.classList.remove("pykur-fogged");
  $("#pykurImg")?.classList.remove("pykur-fogged");
  $(".pykur-orb")?.classList.remove("pykur-night-glow");
  $("#pykurImg")?.classList.remove("pykur-night-glow");
  $(".pykur-orb")?.classList.remove("pykur-sunray-glow");
  $("#pykurImg")?.classList.remove("pykur-sunray-glow");
  $(".pykur-orb")?.classList.remove("live-resonating");
  $("#pykurImg")?.classList.remove("live-resonating");
  $(".pykur-orb")?.classList.remove("live-resonance-peak");
  $("#pykurImg")?.classList.remove("live-resonance-peak");
  $(".pykur-orb")?.classList.remove("live-unstable-aura","live-unstable-chaos");
  $("#pykurImg")?.classList.remove("live-unstable-aura","live-unstable-chaos");
  $(".pykur-orb")?.classList.remove("live-star-wish");
  $("#pykurImg")?.classList.remove("live-star-wish");
  if(schedule){
    livingSchedule();
    passiveSchedule();
  }
  if(!silent)toast("Événement vivant arrêté.","info","click");
  livingRenderAdmin();
}
function livingStart(id,{admin=false,replay=false,synchronized=false,remainingMs=null}={}){
  if(!livingIsDesktop())return false;
  if(!data?.settings?.livingEvents && !admin)return false;
  const event=LIVING_EVENT_DEFS.find(ev=>ev.id===id) || livingPick();
  if(passiveState.active){
    if(synchronized){
      passiveStop({reschedule:false,clearSchedules:true});
    }else{
      const remaining=Math.max(0,(passiveState.endAt||0)-Date.now());
      const retryDelay=remaining<=5000 ? remaining+750 : 60000;
      clearTimeout(livingState.timer);
      livingState.timer=setTimeout(()=>livingStart(id,{admin,replay,synchronized,remainingMs}),retryDelay);
      livingState.cooldownUntil=Date.now()+retryDelay;
      if(admin)toast("Ambiance passive en cours : événement retardé pour éviter le chevauchement.","info","click");
      livingRenderAdmin();
      return false;
    }
  }
  if(livingState.active)livingStop({silent:true,schedule:false});
  const layer=livingLayer();
  if(!layer)return false;
  const duration=remainingMs===null ? event.duration : Math.max(500,Math.min(event.duration,Number(remainingMs)||event.duration));
  livingState.active=true;
  livingState.current=event.id;
  livingState.source=synchronized?"server":(admin?"admin":"local");
  layer.className="";
  layer.innerHTML="";
  livingSetDuration(duration);
  livingToast(event.message,event.legendary?"rare":"info",event.sound);
  event.run(event);
  if(!replay)markGalleryEventDiscovered(event.id);
  livingState.endTimer=setTimeout(()=>{
    const endMessage=event.endMessage;
    livingStop({silent:true,schedule:true});
    if(endMessage)livingToast(endMessage,event.legendary?"rare":"info",null);
  },duration);
  livingRenderAdmin();
  return true;
}
function livingStopServerSync({resetSequence=false}={}){
  if(livingState.serverPollTimer)clearInterval(livingState.serverPollTimer);
  livingState.serverPollTimer=null;
  livingState.serverPolling=false;
  if(resetSequence){
    livingState.serverSequence=null;
    livingState.serverAlertSequence=null;
    livingState.serverStartedSequence=null;
    livingState.serverRemainingMs=0;
    livingState.serverReceivedAt=0;
    livingState.serverStartsAt=0;
  }
}
async function livingPollServer(){
  if(document.hidden || livingState.serverPolling || !livingIsDesktop() || data?.settings?.livingEvents===false)return;
  livingState.serverPolling=true;
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),5000);
    let response;
    try{response=await fetch(`${AUTH_API_BASE}/events/living`,{cache:"no-store",signal:controller.signal})}
    finally{clearTimeout(timeout)}
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const payload=await response.json();
    const shared=payload?.event;
    if(!shared?.id || !Number.isFinite(Number(shared.sequence)))return;
    livingState.serverPaused=!!payload?.settings?.paused;
    livingState.serverMinCooldownSeconds=Number(payload?.settings?.minCooldownSeconds)||600;
    livingState.serverMaxCooldownSeconds=Number(payload?.settings?.maxCooldownSeconds)||1500;
    const startsInMs=Number.isFinite(Number(shared.startsInMs)) ? Number(shared.startsInMs) : Math.max(0,Number(shared.startsAt)-Number(payload.serverTime||Date.now()));
    const endsInMs=Number.isFinite(Number(shared.endsInMs)) ? Number(shared.endsInMs) : Math.max(0,Number(shared.endsAt)-Number(payload.serverTime||Date.now()));
    const startsAt=Date.now()+startsInMs;
    const endsAt=Date.now()+endsInMs;
    const alertAt=startsAt-30000;
    const sequence=Number(shared.sequence);
    livingState.serverSequence=sequence;
    livingState.pendingEvent=shared.id;
    livingState.cooldownUntil=startsAt;
    livingState.serverRemainingMs=shared.phase==="active" ? endsInMs : startsInMs;
    livingState.serverReceivedAt=performance.now();
    livingState.serverStartsAt=startsAt;
    const now=Date.now();
    if(!livingState.serverPaused && now>=alertAt && now<startsAt && livingState.serverAlertSequence!==sequence){
      livingState.serverAlertSequence=sequence;
      livingToast("Quelque chose semble se préparer...","info",LIVE_ASSETS.eventAlert);
    }
    if(!livingState.serverPaused && now>=startsAt && now<endsAt && livingState.serverStartedSequence!==sequence){
      if(livingState.active && livingState.source!=="server")return;
      const started=livingStart(shared.id,{synchronized:true,remainingMs:endsAt-now});
      if(started)livingState.serverStartedSequence=sequence;
    }
    livingRenderAdmin();
  }catch(error){
    if(Date.now()-livingState.serverLastWarningAt>30000){
      livingState.serverLastWarningAt=Date.now();
      console.warn("[Événements] Synchronisation serveur temporairement indisponible.",error?.message||error);
    }
  }finally{
    livingState.serverPolling=false;
  }
}
function livingSchedule(){
  if(!livingIsDesktop() || data?.settings?.livingEvents===false)return;
  if(!livingState.serverPollTimer)livingState.serverPollTimer=setInterval(livingPollServer,performancePollingDelay(4000,8000));
  livingPollServer();
}
function livingResetScheduler(){
  livingStopServerSync({resetSequence:false});
  livingSchedule();
}
let adminConsolePayload=null;
let adminConsoleTarget=null;
let adminConsoleCommandFilter="";
let adminTargetPanelTab="summary";

function adminConsoleHas(permission){return !!adminConsolePayload?.permissions?.includes(permission)}
function adminConsoleEventLabel(id){return LIVING_EVENT_DEFS.find(item=>item.id===id)?.label||id||"Aucun"}
function adminConsoleDate(value){return value?new Date(value).toLocaleString("fr-FR"):"-"}
function adminCommandStatusLabel(status){return ({pending:"En attente",delivered:"Transmise",completed:"Terminée",failed:"Échec",cancelled:"Annulée"})[status]||status}
function adminCommandTypeLabel(type){return ({notification:"Notification",["popup-message"]:"Popup persistante",kick:"Déconnexion forcée",livingEvent:"Événement",["living-event"]:"Événement ciblé",["reset-gallery"]:"Reset galerie",["reset-achievements"]:"Reset succès",["reset-profile"]:"Reset profil",["reset-pykur"]:"Reset familier",["delete-profile"]:"Suppression profil",["rename-profile"]:"Renommage profil",["remove-achievement"]:"Retrait succès",["remove-gallery-event"]:"Retrait événement",["remove-gallery-pykur"]:"Retrait familier archivé",["recalculate-achievements"]:"Recalcul succès",["repair-progression"]:"Réparation progression"})[type]||type}
function adminGalleryArchiveLabel(item){
  const familiarLabel=item?.familiarLabel || (item?.familiarId==="abra-kadabra"?"Abra Kadabra":"Pykur");
  const progressLabel=item?.progressLabel || (item?.familiarId==="abra-kadabra"?"puissance":"PP");
  return `${familiarLabel} #${item?.number||"?"} · ${item?.profileName||"Profil"} · ${item?.pp||0} ${progressLabel}`;
}

function adminConsoleCommandRows(items=[],options={}){
  const filtered=items.filter(item=>{
    const needle=String(options.filter||"").trim().toLowerCase();
    if(!needle)return true;
    return [
      adminCommandTypeLabel(item.type),
      item.status,
      item.target?.pseudo,
      item.actor?.pseudo,
      item.result?.message,
      JSON.stringify(item.payload||{})
    ].join(" ").toLowerCase().includes(needle);
  });
  return `<div class="admin-command-list">${filtered.length?filtered.map(item=>`<div class="admin-command-row">
    <div class="admin-command-main"><strong>${escapeHtml(adminCommandTypeLabel(item.type))}</strong>${item.target?`<span>→ ${escapeHtml(item.target.pseudo)}</span>`:""}<small>${adminConsoleDate(item.createdAt)}${item.actor?` · par ${escapeHtml(item.actor.pseudo)}`:""}${item.result?.message?` · ${escapeHtml(item.result.message)}`:""}</small>${item.payload&&Object.keys(item.payload).length?`<details><summary>Détails techniques</summary><pre>${escapeHtml(JSON.stringify(item.payload,null,2))}</pre></details>`:""}</div>
    <div class="admin-command-actions"><span class="admin-command-status ${escapeHtml(item.status)}">${adminCommandStatusLabel(item.status)}</span>${adminConsoleHas("events.configure")&&["pending","delivered"].includes(item.status)?`<button class="btn btn-red" type="button" data-admin-cancel-command="${item.id}">Annuler</button>`:""}</div>
  </div>`).join(""):`<div class="admin-console-empty">Aucune commande récente.</div>`}</div>`;
}

function renderAdminConsole(){
  if(!adminConsolePayload)return;
  const metrics=adminConsolePayload.metrics||{};
  const schedule=adminConsolePayload.eventSchedule||{};
  const event=schedule.event||{};
  const settings=schedule.settings||{};
  $$('[data-admin-permission]').forEach(element=>{
    element.hidden=!adminConsoleHas(element.dataset.adminPermission);
  });
  const dashboard=$("#adminConsoleDashboard");
  if(dashboard)dashboard.innerHTML=`
    <div class="admin-console-heading inline-heading"><div><h3>Vue d'ensemble staff</h3><p>Surveillez l'état général du tracker avant d'intervenir.</p></div><button class="btn btn-gray" id="adminOpenModerationOverview" type="button">Ouvrir la modération</button></div>
    <div class="admin-dashboard-metrics">
      <article class="admin-metric-card"><small>Utilisateurs</small><strong>${metrics.users||0}</strong><span>comptes inscrits</span></article>
      <article class="admin-metric-card"><small>En ligne</small><strong>${metrics.online||0}</strong><span>actifs récemment</span></article>
      <article class="admin-metric-card ${metrics.openReports?"is-danger":""}"><small>Signalements</small><strong>${metrics.openReports||0}</strong><span>à traiter</span></article>
      <article class="admin-metric-card ${metrics.pendingCommands?"is-warning":""}"><small>Commandes</small><strong>${metrics.pendingCommands||0}</strong><span>en attente</span></article>
    </div>
    <div class="admin-dashboard-layout">
      <article class="admin-server-card admin-section-card"><div class="admin-section-title"><h4>État serveur</h4><span>${settings.paused?"pause":"actif"}</span></div><div class="admin-state-grid"><div><small>Événement prévu</small><strong>${settings.paused?"Planning en pause":adminConsoleEventLabel(event.id)}</strong></div><div><small>Départ</small><strong>${adminConsoleDate(event.startsAt)}</strong></div><div><small>Cooldown</small><strong>${Math.ceil((event.startsInMs||0)/1000)}s</strong></div><div><small>Santé API</small><strong>Opérationnelle</strong></div></div></article>
      <article class="admin-server-card admin-section-card"><div class="admin-section-title"><h4>Permissions actives</h4><span>${(adminConsolePayload.permissions||[]).length}</span></div><p class="admin-permission-cloud">${(adminConsolePayload.permissions||[]).map(item=>`<span class="admin-permission-badge">${escapeHtml(item)}</span>`).join(" ")}</p></article>
      ${adminConsoleHas("notifications.send")?`<article class="admin-server-card admin-section-card admin-broadcast-card"><div class="admin-section-title"><h4>Annonce globale</h4><span>communication</span></div><p>Diffusez une information aux membres connectés. Les messages importants doivent rester rares.</p><div class="admin-broadcast-grid"><label><span>Message</span><textarea id="adminBroadcastMessage" maxlength="500" placeholder="Maintenance, mise à jour ou information importante..."></textarea></label><label><span>Affichage</span><select id="adminBroadcastMode"><option value="notification">Notification discrète</option><option value="info">Message d'information</option><option value="popup">Popup important</option></select></label><button class="btn btn-blue" id="adminSendBroadcast" type="button">Envoyer à tous</button></div></article>`:""}
    </div>`;
  const eventSettings=$("#adminServerEventSettings");
  if(eventSettings)eventSettings.innerHTML=adminConsoleHas("events.configure")?`
    <article class="admin-section-card"><div class="admin-section-title"><h4>Planning serveur</h4><span>global</span></div><p class="options-note">Ces réglages affectent tous les joueurs connectés.</p><div class="admin-event-settings">
      <label class="admin-toggle-row"><input type="checkbox" id="adminEventsPaused" ${settings.paused?"checked":""}> Mettre en pause</label>
      <label><span>Cooldown minimum (s)</span><input id="adminEventCooldownMin" type="number" min="30" max="86400" value="${settings.minCooldownSeconds||600}"></label>
      <label><span>Cooldown maximum (s)</span><input id="adminEventCooldownMax" type="number" min="30" max="172800" value="${settings.maxCooldownSeconds||1500}"></label>
      <button class="btn btn-blue" id="adminSaveEventSettings" type="button">Enregistrer</button>
      <button class="btn btn-orange" id="adminRescheduleEvent" type="button">Replanifier</button>
    </div></article>`:`<div class="options-note">Vous pouvez tester ou cibler un événement, mais seul un administrateur peut modifier le planning global.</div>`;
  const logs=$("#adminConsoleLogs");
  if(logs)logs.innerHTML=`<div class="admin-console-heading inline-heading"><div><h3>Journal serveur</h3><p>Suivez les commandes envoyées par le staff et leur statut.</p></div></div><section class="admin-section-card"><div class="admin-log-toolbar"><input id="adminCommandLogFilter" value="${escapeHtml(adminConsoleCommandFilter)}" placeholder="Filtrer par acteur, cible, action ou statut..."><button class="btn btn-gray" id="adminRefreshLogs" type="button">Rafraîchir</button></div>${adminConsoleCommandRows(adminConsolePayload.recentCommands||[],{filter:adminConsoleCommandFilter})}</section>`;
  bindAdminConsoleDynamicActions();
}

async function loadAdminConsole(){
  try{
    adminConsolePayload=await authFetch("/admin/console");
    renderAdminConsole();
  }catch(error){
    ["#adminConsoleDashboard","#adminConsoleLogs"].forEach(selector=>{const el=$(selector);if(el)el.innerHTML=`<div class="admin-console-empty">${escapeHtml(error.message||"Centre de contrôle indisponible.")}</div>`});
  }
}

function bindAdminConsoleDynamicActions(){
  $("#adminSaveEventSettings")?.addEventListener("click",()=>saveAdminEventSettings(false));
  $("#adminRescheduleEvent")?.addEventListener("click",()=>saveAdminEventSettings(true));
  $("#adminOpenModerationOverview")?.addEventListener("click",()=>{
    adminConsoleSelectTab("moderation");
  });
  $("#adminSendBroadcast")?.addEventListener("click",sendAdminBroadcast);
  $("#adminRefreshLogs")?.addEventListener("click",loadAdminConsole);
  $("#adminCommandLogFilter")?.addEventListener("input",event=>{
    adminConsoleCommandFilter=event.target.value||"";
    renderAdminConsole();
    const input=$("#adminCommandLogFilter");
    input?.focus();
    input?.setSelectionRange(input.value.length,input.value.length);
  });
}

async function sendAdminBroadcast(){
  const message=String($("#adminBroadcastMessage")?.value||"").trim();
  const mode=String($("#adminBroadcastMode")?.value||"notification");
  if(!message)return toast("Saisissez un message avant l'envoi.","warning","warning");
  try{
    const result=await authFetch("/admin/broadcast",{method:"POST",body:JSON.stringify({message,mode})});
    if($("#adminBroadcastMessage"))$("#adminBroadcastMessage").value="";
    toast(`Annonce transmise à ${result.recipients||0} utilisateur${result.recipients===1?"":"s"} connecté${result.recipients===1?"":"s"}.`,"success","success");
    await loadAdminConsole();
  }catch(error){
    toast(error.message||"Annonce globale impossible.","error","error");
  }
}

async function saveAdminEventSettings(reschedule=false){
  try{
    await authFetch("/admin/events/settings",{method:"PUT",body:JSON.stringify({paused:!!$("#adminEventsPaused")?.checked,minCooldownSeconds:Number($("#adminEventCooldownMin")?.value),maxCooldownSeconds:Number($("#adminEventCooldownMax")?.value),reschedule})});
    toast(reschedule?"Planning global replanifié.":"Réglages événementiels enregistrés.","success","success");
    await loadAdminConsole();await livingPollServer();
  }catch(error){toast(error.message||"Réglages impossibles.","error","error")}
}

function adminConsoleSelectTab(tab){
  $$("[data-admin-console-tab]").forEach(button=>button.classList.toggle("active",button.dataset.adminConsoleTab===tab));
  $$("[data-admin-console-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.adminConsolePanel===tab));
  if(tab==="moderation")loadModerationOverviewPanel();
  if(tab==="permissions")loadAdminPermissionsPanel();
}

async function loadAdminPermissionsPanel(){
  const box=$("#adminPermissionsWorkspace");
  if(!box)return;
  box.className="admin-console-loading";
  box.textContent="Chargement des permissions...";
  try{
    const payload=await authFetch("/moderation/overview");
    moderationPermissions=payload.permissions||[];
    moderationStaffPermissions=payload.staffPermissions||[];
    box.className="";
    box.innerHTML=canModeration("permissions.manage")
      ? moderationPermissionsPanel(payload.permissionCatalog||[],moderationStaffPermissions)
      : `<div class="admin-console-empty">Vous n'avez pas accès à la gestion des permissions.</div>`;
    box.querySelectorAll("[data-save-staff-permissions]").forEach(button=>button.addEventListener("click",()=>saveStaffPermissions(Number(button.dataset.saveStaffPermissions))));
  }catch(error){
    box.className="admin-console-empty";
    box.textContent=error.message||"Permissions indisponibles.";
  }
}

function adminTargetSelectedProfile(){return document.querySelector('input[name="adminTargetProfile"]:checked')?.value||""}

function adminTargetStatusChips(user){
  const chips=[];
  if(user.isBanned)chips.push(`<span class="admin-status-chip danger">Banni${user.banUntil?` jusqu'au ${escapeHtml(adminConsoleDate(user.banUntil))}`:" definitif"}</span>`);
  if(user.muteUntil)chips.push(`<span class="admin-status-chip warn">Mute jusqu'au ${escapeHtml(adminConsoleDate(user.muteUntil))}</span>`);
  if(user.profileLocked)chips.push(`<span class="admin-status-chip warn">Profil verrouille</span>`);
  if(user.avatarLocked)chips.push(`<span class="admin-status-chip warn">Avatar verrouille</span>`);
  if(user.passwordResetRequired)chips.push(`<span class="admin-status-chip info">Mot de passe a changer</span>`);
  if(!chips.length)chips.push(`<span class="admin-status-chip ok">Aucune restriction active</span>`);
  return chips.join("");
}

function renderAdminTarget(payload){
  adminConsoleTarget=payload;
  const box=$("#adminTargetWorkspace");
  if(!box)return;
  const user=payload.user||{};
  const permissions=new Set(payload.permissions||[]);
  const profiles=payload.profiles||[];
  const achievements=payload.achievements||[];
  const galleryEvents=payload.galleryEvents||[];
  const galleryPykurs=payload.galleryPykurs||[];
  const can=id=>permissions.has(id);
  const canModerate=can("users.warn")||can("users.mute")||can("users.ban")||can("users.history.manage");
  const canCommunicate=can("notifications.send");
  const canTargetEvent=can("events.target");
  const canAvatar=can("users.avatar.manage");
  const canRestrict=can("users.restrict");
  const canIdentity=can("users.rename");
  const canTechnicalSecurity=can("users.ip.view")||can("users.ip.ban")||can("users.browser.ban")||can("users.security_bans.view");
  const canSecurity=can("users.sessions.revoke")||can("users.password.reset")||canTechnicalSecurity;
  const canTracker=can("tracker.reset")||can("achievements.manage")||can("gallery.manage")||can("profiles.manage");
  const restrictions=user.socialRestrictions||{};
  box.className="";
  box.innerHTML=`
    <section class="admin-target-card">
      <div class="admin-target-hero">
        <div class="admin-target-identity">${avatarMarkup(user)}<div><h3>${escapeHtml(user.pseudo||"Utilisateur")}</h3><div class="admin-target-meta"><small>${escapeHtml(user.email||"")} · Cloud ${adminConsoleDate(payload.cloudUpdatedAt)}</small></div><div class="admin-status-row">${adminTargetStatusChips(user)}</div></div></div>
        <span class="admin-permission-badge ${escapeHtml(user.role||"user")}">${authRoleLabel(user.role)}</span>
      </div>
      <div class="admin-target-section">
        <div class="admin-section-title"><h4>Profils familiers cloud</h4><span>${profiles.length} profil${profiles.length>1?"s":""}</span></div>
        <div class="admin-profile-list">${profiles.length?profiles.map(profile=>`<label class="admin-profile-option"><input type="radio" name="adminTargetProfile" value="${adminEscapeAttr(profile.id)}" ${profile.active?"checked":""}><span><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(profile.familiarLabel||"Pykur")} · ${cloudProfileSummaryText(profile)}</small></span></label>`).join(""):`<div class="admin-console-empty">Aucune sauvegarde cloud exploitable.</div>`}</div>
      </div>
      <div class="admin-target-sections">
        ${canCommunicate?`<article class="admin-action-group admin-span-2"><div class="admin-section-title"><h4>Communication directe</h4><span>visible même hors ligne</span></div><div class="admin-target-notification"><textarea id="adminTargetNotification" maxlength="500" placeholder="Message destiné au joueur, conservé s'il est hors ligne"></textarea><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSendTargetNotification" type="button">Notification</button><button class="btn btn-orange" id="adminSendTargetPopup" type="button">Popup persistante</button><button class="btn btn-red" id="adminKickTarget" type="button">Kick avec message</button></div></div></article>`:""}
        ${canTargetEvent?`<article class="admin-action-group"><div class="admin-section-title"><h4>Événement individuel</h4><span>cosmétique</span></div><div class="admin-target-event"><select id="adminTargetEvent">${LIVING_EVENT_DEFS.map(item=>`<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}</select><button class="btn btn-orange" id="adminSendTargetEvent" type="button">Jouer</button></div><p class="options-note">Ne compte pas comme découverte et ne donne aucune récompense.</p></article>`:""}
        ${canModerate?`<article class="admin-action-group admin-span-2"><div class="admin-section-title"><h4>Sanctions</h4><span>motif obligatoire</span></div><p class="options-note">Appliquez une sanction mesurée, puis laissez une trace claire pour l'équipe et le joueur.</p><div class="admin-duration-grid"><div class="admin-duration-fields"><input id="adminModerationDuration" type="number" min="1" max="525600" value="24" aria-label="Durée de la sanction"><select id="adminModerationUnit" aria-label="Unité de durée"><option value="minutes">minutes</option><option value="hours" selected>heures</option><option value="days">jours</option></select><input id="adminModerationReason" type="text" maxlength="300" placeholder="Motif affiché au joueur"></div><div class="admin-duration-actions">${can("users.warn")?`<button class="btn btn-blue" id="adminWarnTarget" type="button">Avertir</button>`:""}${can("users.mute")?`<button class="btn btn-orange" id="adminMuteTarget" type="button">Mute temporaire</button>`:""}${can("users.ban")?`<button class="btn btn-red" id="adminBanTarget" type="button">Ban temporaire</button>`:""}${can("users.ban.permanent")?`<button class="btn btn-red" id="adminBanPermanentTarget" type="button">Ban définitif</button>`:""}${user.muteUntil&&can("users.mute")?`<button class="btn btn-gray" id="adminUnmuteTarget" type="button">Retirer le mute</button>`:""}${user.isBanned&&can("users.ban")?`<button class="btn btn-blue" id="adminUnbanTarget" type="button">Débannir</button>`:""}</div></div></article>`:""}
        ${(canAvatar||canRestrict||canIdentity)?`<article class="admin-action-group admin-span-2"><div class="admin-section-title"><h4>Profil public et restrictions</h4><span>identité sociale</span></div><div class="admin-profile-tools">
          ${canIdentity?`<div class="admin-target-event"><input id="adminTargetNewPseudo" type="text" maxlength="24" placeholder="Nouveau pseudo"><button class="btn btn-blue" id="adminRenameTargetUser" type="button">Renommer le membre</button></div>`:""}
          ${canAvatar?`<div class="admin-avatar-editor"><div class="admin-avatar-preview">${avatarMarkup(user)}</div><div class="admin-avatar-fields"><input id="adminTargetAvatarUrl" type="url" maxlength="800" value="${adminEscapeAttr(user.avatarUrl||"")}" placeholder="Nouvelle URL d'avatar ou vide pour supprimer"><input id="adminTargetAvatarReason" type="text" maxlength="300" placeholder="Motif de modification avatar"><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSaveTargetAvatar" type="button">Changer l'avatar</button><button class="btn btn-red" id="adminClearTargetAvatar" type="button">Supprimer l'avatar</button></div></div></div>`:""}
          ${canRestrict?`<div class="admin-restriction-grid">
            ${["chat","privateMessages","friendRequests","shares"].map(key=>`<label><input type="checkbox" data-admin-target-restriction="${key}" ${restrictions[key]?"checked":""}> ${key==="chat"?"Chat global":key==="privateMessages"?"Messages privés":key==="friendRequests"?"Demandes d'ami":"Partages automatiques"}</label>`).join("")}
            <label><input type="checkbox" id="adminTargetProfileLocked" ${user.profileLocked?"checked":""}> Verrouiller le profil public</label>
            <label><input type="checkbox" id="adminTargetAvatarLocked" ${user.avatarLocked?"checked":""}> Verrouiller l'avatar</label>
          </div><div class="admin-target-event"><input id="adminTargetRestrictionReason" type="text" maxlength="300" placeholder="Motif des restrictions"><button class="btn btn-orange" id="adminSaveTargetRestrictions" type="button">Appliquer les restrictions</button></div>`:""}
        </div></article>`:""}
        ${canSecurity?`<article class="admin-action-group"><div class="admin-section-title"><h4>Sécurité</h4><span>sessions</span></div><input id="adminTargetSecurityReason" type="text" maxlength="300" placeholder="Motif sécurité"><div class="admin-action-buttons">${can("users.sessions.revoke")?`<button class="btn btn-red" id="adminRevokeTargetSessions" type="button">Révoquer sessions</button>`:""}${can("users.password.reset")?`<button class="btn btn-orange" id="adminForceTargetPassword" type="button">Forcer mot de passe</button>`:""}</div></article>`:""}
        ${canTracker?`<article class="admin-action-group admin-span-2"><div class="admin-section-title"><h4>Données tracker</h4><span>actions destructrices</span></div><div class="admin-split-actions">
          <div>${can("tracker.reset")?`<h5>Réparation</h5><div class="admin-action-buttons"><button class="btn btn-orange" data-admin-target-command="repair-progression">Réparer la progression</button><button class="btn btn-orange" data-admin-target-command="recalculate-achievements">Recalculer les succès</button></div>`:""}${can("profiles.manage")?`<h5>Profils familiers</h5><div class="admin-target-event"><input id="adminTargetProfileName" type="text" maxlength="80" placeholder="Nouveau nom du profil"><button class="btn btn-blue" id="adminRenameTargetProfile" type="button">Renommer le profil sélectionné</button></div>`:""}</div>
          <div>${can("achievements.manage")?`${achievements.length?`<div class="admin-target-event"><select id="adminTargetAchievement"><option value="">Choisir un succès débloqué</option>${achievements.map(id=>`<option value="${adminEscapeAttr(id)}">${escapeHtml(ACHIEVEMENTS[id]?.name||id)}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetAchievement" type="button">Retirer ce succès</button></div>`:`<p class="options-note">Aucun succès débloqué.</p>`}`:""}${can("gallery.manage")?`${galleryEvents.length?`<div class="admin-target-event"><select id="adminTargetGalleryEvent"><option value="">Choisir un événement découvert</option>${galleryEvents.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminConsoleEventLabel(item.id))} · vu ${item.count} fois</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryEvent" type="button">Retirer l'événement</button></div>`:`<p class="options-note">Aucun événement découvert.</p>`}${galleryPykurs.length?`<div class="admin-target-event"><select id="adminTargetGalleryPykur"><option value="">Choisir un familier archivé</option>${galleryPykurs.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminGalleryArchiveLabel(item))}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryPykur" type="button">Retirer le familier</button></div>`:`<p class="options-note">Aucun familier archivé.</p>`}`:""}</div>
        </div><div class="admin-danger-strip">${can("gallery.manage")?`<button class="btn btn-red" data-admin-target-command="reset-gallery">Reset galerie</button>`:""}${can("achievements.manage")?`<button class="btn btn-red" data-admin-target-command="reset-achievements">Reset succès</button>`:""}${can("tracker.reset")?`<button class="btn btn-red" data-admin-target-command="reset-profile" data-needs-profile="1">Reset profil</button><button class="btn btn-red" data-admin-target-command="reset-pykur" data-needs-profile="1">Reset familier</button>`:""}${can("profiles.manage")?`<button class="btn btn-red" data-admin-target-command="delete-profile" data-needs-profile="1">Supprimer profil</button>`:""}</div></article>`:""}
      </div>
      <h4>Commandes récentes</h4>${adminConsoleCommandRows(payload.commands||[])}
    </section>`;
  $("#adminSendTargetNotification")?.addEventListener("click",()=>sendAdminTargetCommand("notification",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminSendTargetPopup")?.addEventListener("click",()=>sendAdminTargetCommand("popup-message",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminKickTarget")?.addEventListener("click",()=>sendAdminTargetCommand("kick",{message:$("#adminTargetNotification")?.value||"Votre session a été interrompue par l'équipe de modération."},true));
  $("#adminSendTargetEvent")?.addEventListener("click",()=>sendAdminTargetCommand("living-event",{eventId:$("#adminTargetEvent")?.value},false));
  $("#adminRenameTargetProfile")?.addEventListener("click",()=>sendAdminTargetCommand("rename-profile",{profileId:adminTargetSelectedProfile(),name:$("#adminTargetProfileName")?.value||""},true));
  $("#adminRenameTargetUser")?.addEventListener("click",()=>renameAdminTargetUser());
  $("#adminSaveTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(false));
  $("#adminClearTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(true));
  $("#adminSaveTargetRestrictions")?.addEventListener("click",()=>saveAdminTargetRestrictions());
  $("#adminRevokeTargetSessions")?.addEventListener("click",()=>adminSecurityTarget("sessions/revoke"));
  $("#adminForceTargetPassword")?.addEventListener("click",()=>adminSecurityTarget("password-reset"));
  $("#adminBanTargetIp")?.addEventListener("click",()=>adminTechnicalBanTarget("ip"));
  $("#adminBanTargetBrowser")?.addEventListener("click",()=>adminTechnicalBanTarget("browser"));
  $("#adminShowTechnicalBans")?.addEventListener("click",loadAdminTechnicalBans);
  $("#adminRemoveTargetAchievement")?.addEventListener("click",()=>sendAdminTargetCommand("remove-achievement",{achievementId:$("#adminTargetAchievement")?.value||""},true));
  $("#adminRemoveTargetGalleryEvent")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-event",{eventId:$("#adminTargetGalleryEvent")?.value||""},true));
  $("#adminRemoveTargetGalleryPykur")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-pykur",{pykurId:$("#adminTargetGalleryPykur")?.value||""},true));
  $("#adminWarnTarget")?.addEventListener("click",()=>adminModerateTarget("warn"));
  $("#adminMuteTarget")?.addEventListener("click",()=>adminModerateTarget("mute"));
  $("#adminBanTarget")?.addEventListener("click",()=>adminModerateTarget("ban"));
  $("#adminBanPermanentTarget")?.addEventListener("click",()=>adminModerateTarget("ban",true));
  $("#adminUnmuteTarget")?.addEventListener("click",()=>adminLiftModeration("unmute"));
  $("#adminUnbanTarget")?.addEventListener("click",()=>adminLiftModeration("unban"));
  box.querySelectorAll("[data-admin-target-command]").forEach(button=>button.addEventListener("click",()=>{
    const payloadData=button.dataset.needsProfile?{profileId:adminTargetSelectedProfile()}:{};
    sendAdminTargetCommand(button.dataset.adminTargetCommand,payloadData,true);
  }));
}

function renderAdminTarget(payload){
  adminConsoleTarget=payload;
  const box=$("#adminTargetWorkspace");
  if(!box)return;
  const user=payload.user||{};
  const permissions=new Set(payload.permissions||[]);
  const profiles=payload.profiles||[];
  const achievements=payload.achievements||[];
  const galleryEvents=payload.galleryEvents||[];
  const galleryPykurs=payload.galleryPykurs||[];
  const history=payload.history||[];
  const can=id=>permissions.has(id);
  const canModerate=!!user.canModerate&&(can("users.warn")||can("users.mute")||can("users.ban")||can("users.history.manage"));
  const canCommunicate=can("notifications.send");
  const canTargetEvent=can("events.target");
  const canAvatar=can("users.avatar.manage");
  const canRestrict=can("users.restrict");
  const canIdentity=can("users.rename");
  const canTechnicalSecurity=can("users.ip.view")||can("users.ip.ban")||can("users.browser.ban")||can("users.security_bans.view");
  const canSecurity=can("users.sessions.revoke")||can("users.password.reset")||canTechnicalSecurity;
  const canTracker=can("tracker.reset")||can("achievements.manage")||can("gallery.manage")||can("profiles.manage");
  const canRoles=can("roles.manage");
  const restrictions=user.socialRestrictions||{};
  const activeProfile=profiles.find(profile=>profile.active)||profiles[0]||null;
  const profileSummary=activeProfile?cloudProfileSummaryText(activeProfile):"Aucune sauvegarde cloud";
  const roleOptions=["user","moderator","admin"].map(role=>`<option value="${role}" ${user.role===role?"selected":""}>${escapeHtml(authRoleLabel(role))}</option>`).join("");
  const recentHistory=history.slice(0,5).map(item=>`<div class="admin-timeline-row"><strong>${escapeHtml(adminCommandTypeLabel(item.type)||item.type||"Action")}</strong><small>${adminConsoleDate(item.createdAt)}${item.actor?.pseudo?` · ${escapeHtml(item.actor.pseudo)}`:""}${item.reason?` · ${escapeHtml(item.reason)}`:""}</small></div>`).join("");
  box.className="";
  box.innerHTML=`
    <section class="admin-member-workspace">
      <header class="admin-member-hero ${escapeHtml(user.role||"user")}">
        <div class="admin-member-main">
          ${avatarMarkup(user)}
          <div>
            <div class="admin-member-title">
              <h3>${escapeHtml(user.pseudo||"Utilisateur")}</h3>
              <span class="admin-role-pill ${escapeHtml(user.role||"user")}">${escapeHtml(authRoleLabel(user.role))}</span>
            </div>
            <p>${escapeHtml(user.email||"Email masque")} · Cloud ${adminConsoleDate(payload.cloudUpdatedAt)}</p>
            <div class="admin-status-row">${adminTargetStatusChips(user)}</div>
          </div>
        </div>
        <div class="admin-member-snapshot">
          <span>Profil actif</span>
          <strong>${escapeHtml(activeProfile?.name||"Aucun profil")}</strong>
          <small>${escapeHtml(profileSummary)}</small>
        </div>
      </header>

      <div class="admin-member-layout">
        <aside class="admin-member-side">
          <article class="admin-action-group">
            <div class="admin-section-title"><h4>Profils cloud</h4><span>${profiles.length} profil${profiles.length>1?"s":""}</span></div>
            <div class="admin-profile-list compact">${profiles.length?profiles.map(profile=>`<label class="admin-profile-option"><input type="radio" name="adminTargetProfile" value="${adminEscapeAttr(profile.id)}" ${profile.active?"checked":""}><span><strong>${escapeHtml(profile.name)}</strong><small>${escapeHtml(profile.familiarLabel||"Pykur")} · ${cloudProfileSummaryText(profile)}</small></span></label>`).join(""):`<div class="admin-console-empty">Aucune sauvegarde cloud exploitable.</div>`}</div>
          </article>
          <article class="admin-action-group">
            <div class="admin-section-title"><h4>Résumé</h4><span>lecture rapide</span></div>
            <div class="admin-mini-stats">
              <div><small>Succès</small><strong>${achievements.length}</strong></div>
              <div><small>Événements</small><strong>${galleryEvents.length}</strong></div>
              <div><small>Familiers archivés</small><strong>${galleryPykurs.length}</strong></div>
            </div>
          </article>
          <article class="admin-action-group">
            <div class="admin-section-title"><h4>Historique récent</h4><span>sanctions</span></div>
            <div class="admin-timeline">${recentHistory||`<div class="admin-console-empty">Aucune action récente.</div>`}</div>
          </article>
        </aside>

        <div class="admin-member-mainpanel">
          <div class="admin-control-band">
            ${canRoles?`<article class="admin-control-card admin-control-card-role"><div class="admin-card-eyebrow">Permissions</div><h4>Rôle du compte</h4><p>Promouvez ou rétrogradez un membre. Cette action est journalisée et protégée contre la perte du dernier admin.</p><div class="admin-role-editor"><select id="adminTargetRole">${roleOptions}</select><input id="adminTargetRoleReason" type="text" maxlength="300" placeholder="Motif du changement de rôle"><button class="btn btn-blue" id="adminChangeTargetRole" type="button">Appliquer le rôle</button></div></article>`:""}
            ${canCommunicate?`<article class="admin-control-card"><div class="admin-card-eyebrow">Intervention</div><h4>Contacter le joueur</h4><textarea id="adminTargetNotification" maxlength="500" placeholder="Message visible par le joueur, même hors ligne"></textarea><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSendTargetNotification" type="button">Notification</button><button class="btn btn-orange" id="adminSendTargetPopup" type="button">Popup</button><button class="btn btn-red" id="adminKickTarget" type="button">Kick</button></div></article>`:""}
            ${canTargetEvent?`<article class="admin-control-card"><div class="admin-card-eyebrow">Cosmétique</div><h4>Événement ciblé</h4><div class="admin-target-event"><select id="adminTargetEvent">${LIVING_EVENT_DEFS.map(item=>`<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}</select><button class="btn btn-orange" id="adminSendTargetEvent" type="button">Jouer</button></div><p class="options-note">Aucun succès, aucune découverte, aucun bonus.</p></article>`:""}
          </div>

          ${canModerate?`<article class="admin-control-card admin-control-card-wide admin-danger-zone-soft"><div class="admin-section-title"><h4>Modération immédiate</h4><span>motif obligatoire</span></div><div class="admin-moderation-grid"><div class="admin-duration-fields"><input id="adminModerationDuration" type="number" min="1" max="525600" value="24" aria-label="Durée"><select id="adminModerationUnit" aria-label="Unité"><option value="minutes">minutes</option><option value="hours" selected>heures</option><option value="days">jours</option></select><input id="adminModerationReason" type="text" maxlength="300" placeholder="Motif affiché au joueur"></div><div class="admin-duration-actions">${can("users.warn")?`<button class="btn btn-blue" id="adminWarnTarget" type="button">Avertir</button>`:""}${can("users.mute")?`<button class="btn btn-orange" id="adminMuteTarget" type="button">Mute</button>`:""}${can("users.ban")?`<button class="btn btn-red" id="adminBanTarget" type="button">Ban temporaire</button>`:""}${can("users.ban.permanent")?`<button class="btn btn-red" id="adminBanPermanentTarget" type="button">Ban définitif</button>`:""}${user.muteUntil&&can("users.mute")?`<button class="btn btn-gray" id="adminUnmuteTarget" type="button">Retirer mute</button>`:""}${user.isBanned&&can("users.ban")?`<button class="btn btn-blue" id="adminUnbanTarget" type="button">Débannir</button>`:""}</div></div></article>`:""}

          <div class="admin-control-columns">
            ${(canIdentity||canAvatar||canRestrict)?`<article class="admin-control-card"><div class="admin-card-eyebrow">Identité publique</div><h4>Pseudo, avatar et restrictions</h4>${canIdentity?`<div class="admin-target-event"><input id="adminTargetNewPseudo" type="text" maxlength="24" placeholder="Nouveau pseudo"><button class="btn btn-blue" id="adminRenameTargetUser" type="button">Renommer</button></div>`:""}${canAvatar?`<div class="admin-avatar-editor compact"><div class="admin-avatar-preview">${avatarMarkup(user)}</div><div class="admin-avatar-fields"><input id="adminTargetAvatarUrl" type="url" maxlength="800" value="${adminEscapeAttr(user.avatarUrl||"")}" placeholder="URL d'avatar ou vide pour supprimer"><input id="adminTargetAvatarReason" type="text" maxlength="300" placeholder="Motif avatar"><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSaveTargetAvatar" type="button">Changer</button><button class="btn btn-red" id="adminClearTargetAvatar" type="button">Supprimer</button></div></div></div>`:""}${canRestrict?`<div class="admin-restriction-grid compact">${["chat","privateMessages","friendRequests","shares"].map(key=>`<label><input type="checkbox" data-admin-target-restriction="${key}" ${restrictions[key]?"checked":""}> ${key==="chat"?"Chat global":key==="privateMessages"?"Messages privés":key==="friendRequests"?"Demandes d'ami":"Partages automatiques"}</label>`).join("")}<label><input type="checkbox" id="adminTargetProfileLocked" ${user.profileLocked?"checked":""}> Verrouiller le profil</label><label><input type="checkbox" id="adminTargetAvatarLocked" ${user.avatarLocked?"checked":""}> Verrouiller l'avatar</label></div><div class="admin-target-event"><input id="adminTargetRestrictionReason" type="text" maxlength="300" placeholder="Motif restrictions"><button class="btn btn-orange" id="adminSaveTargetRestrictions" type="button">Appliquer</button></div>`:""}</article>`:""}
            ${canSecurity?`<article class="admin-control-card"><div class="admin-card-eyebrow">Sécurité</div><h4>Sessions et mot de passe</h4><input id="adminTargetSecurityReason" type="text" maxlength="300" placeholder="Motif sécurité"><div class="admin-action-buttons">${can("users.sessions.revoke")?`<button class="btn btn-red" id="adminRevokeTargetSessions" type="button">Révoquer sessions</button>`:""}${can("users.password.reset")?`<button class="btn btn-orange" id="adminForceTargetPassword" type="button">Forcer mot de passe</button>`:""}</div></article>`:""}
          </div>

          ${canTracker?`<article class="admin-control-card admin-control-card-wide"><div class="admin-section-title"><h4>Données tracker</h4><span>réparation et suppressions ciblées</span></div><div class="admin-data-tools">${can("tracker.reset")?`<section><h5>Réparer</h5><div class="admin-action-buttons"><button class="btn btn-orange" data-admin-target-command="repair-progression">Réparer progression</button><button class="btn btn-orange" data-admin-target-command="recalculate-achievements">Recalculer succès</button></div></section>`:""}${can("profiles.manage")?`<section><h5>Profils</h5><div class="admin-target-event"><input id="adminTargetProfileName" type="text" maxlength="80" placeholder="Nouveau nom du profil"><button class="btn btn-blue" id="adminRenameTargetProfile" type="button">Renommer profil</button></div></section>`:""}${can("achievements.manage")?`<section><h5>Succès</h5>${achievements.length?`<div class="admin-target-event"><select id="adminTargetAchievement"><option value="">Choisir un succès débloqué</option>${achievements.map(id=>`<option value="${adminEscapeAttr(id)}">${escapeHtml(ACHIEVEMENTS[id]?.name||id)}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetAchievement" type="button">Retirer</button></div>`:`<p class="options-note">Aucun succès débloqué.</p>`}</section>`:""}${can("gallery.manage")?`<section><h5>Galerie</h5>${galleryEvents.length?`<div class="admin-target-event"><select id="adminTargetGalleryEvent"><option value="">Choisir un événement découvert</option>${galleryEvents.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminConsoleEventLabel(item.id))} · vu ${item.count} fois</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryEvent" type="button">Retirer événement</button></div>`:`<p class="options-note">Aucun événement découvert.</p>`}${galleryPykurs.length?`<div class="admin-target-event"><select id="adminTargetGalleryPykur"><option value="">Choisir un familier archivé</option>${galleryPykurs.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminGalleryArchiveLabel(item))}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryPykur" type="button">Retirer familier</button></div>`:`<p class="options-note">Aucun familier archivé.</p>`}</section>`:""}</div><div class="admin-danger-strip">${can("gallery.manage")?`<button class="btn btn-red" data-admin-target-command="reset-gallery">Reset galerie</button>`:""}${can("achievements.manage")?`<button class="btn btn-red" data-admin-target-command="reset-achievements">Reset succès</button>`:""}${can("tracker.reset")?`<button class="btn btn-red" data-admin-target-command="reset-profile" data-needs-profile="1">Reset profil</button><button class="btn btn-red" data-admin-target-command="reset-pykur" data-needs-profile="1">Reset familier</button>`:""}${can("profiles.manage")?`<button class="btn btn-red" data-admin-target-command="delete-profile" data-needs-profile="1">Supprimer profil</button>`:""}</div></article>`:""}

          <article class="admin-control-card admin-control-card-wide"><div class="admin-section-title"><h4>Commandes récentes</h4><span>file serveur</span></div>${adminConsoleCommandRows(payload.commands||[])}</article>
        </div>
      </div>
    </section>`;
  $("#adminChangeTargetRole")?.addEventListener("click",adminChangeTargetRole);
  $("#adminSendTargetNotification")?.addEventListener("click",()=>sendAdminTargetCommand("notification",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminSendTargetPopup")?.addEventListener("click",()=>sendAdminTargetCommand("popup-message",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminKickTarget")?.addEventListener("click",()=>sendAdminTargetCommand("kick",{message:$("#adminTargetNotification")?.value||"Votre session a été interrompue par l'équipe de modération."},true));
  $("#adminSendTargetEvent")?.addEventListener("click",()=>sendAdminTargetCommand("living-event",{eventId:$("#adminTargetEvent")?.value},false));
  $("#adminRenameTargetProfile")?.addEventListener("click",()=>sendAdminTargetCommand("rename-profile",{profileId:adminTargetSelectedProfile(),name:$("#adminTargetProfileName")?.value||""},true));
  $("#adminRenameTargetUser")?.addEventListener("click",()=>renameAdminTargetUser());
  $("#adminSaveTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(false));
  $("#adminClearTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(true));
  $("#adminSaveTargetRestrictions")?.addEventListener("click",()=>saveAdminTargetRestrictions());
  $("#adminRevokeTargetSessions")?.addEventListener("click",()=>adminSecurityTarget("sessions/revoke"));
  $("#adminForceTargetPassword")?.addEventListener("click",()=>adminSecurityTarget("password-reset"));
  $("#adminBanTargetIp")?.addEventListener("click",()=>adminTechnicalBanTarget("ip"));
  $("#adminBanTargetBrowser")?.addEventListener("click",()=>adminTechnicalBanTarget("browser"));
  $("#adminShowTechnicalBans")?.addEventListener("click",loadAdminTechnicalBans);
  $("#adminRemoveTargetAchievement")?.addEventListener("click",()=>sendAdminTargetCommand("remove-achievement",{achievementId:$("#adminTargetAchievement")?.value||""},true));
  $("#adminRemoveTargetGalleryEvent")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-event",{eventId:$("#adminTargetGalleryEvent")?.value||""},true));
  $("#adminRemoveTargetGalleryPykur")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-pykur",{pykurId:$("#adminTargetGalleryPykur")?.value||""},true));
  $("#adminWarnTarget")?.addEventListener("click",()=>adminModerateTarget("warn"));
  $("#adminMuteTarget")?.addEventListener("click",()=>adminModerateTarget("mute"));
  $("#adminBanTarget")?.addEventListener("click",()=>adminModerateTarget("ban"));
  $("#adminBanPermanentTarget")?.addEventListener("click",()=>adminModerateTarget("ban",true));
  $("#adminUnmuteTarget")?.addEventListener("click",()=>adminLiftModeration("unmute"));
  $("#adminUnbanTarget")?.addEventListener("click",()=>adminLiftModeration("unban"));
  box.querySelectorAll("[data-admin-target-command]").forEach(button=>button.addEventListener("click",()=>{
    const payloadData=button.dataset.needsProfile?{profileId:adminTargetSelectedProfile()}:{};
    sendAdminTargetCommand(button.dataset.adminTargetCommand,payloadData,true);
  }));
}

async function adminChangeTargetRole(){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const role=String($("#adminTargetRole")?.value||"");
  const reason=String($("#adminTargetRoleReason")?.value||"").trim();
  if(!role)return toast("Choisissez un rôle.","warning","warning");
  if(role===target.role)return toast("Ce membre possède déjà ce rôle.","info","info");
  if(reason.length<3)return toast("Indiquez un motif pour le changement de rôle.","warning","warning");
  if(!await showConfirm(`Changer le rôle de ${target.pseudo} en ${authRoleLabel(role)} ?`,{title:"Changement de rôle",danger:role==="admin"||target.role==="admin",okLabel:"Appliquer"}))return;
  try{
    await authFetch(`/admin/users/${encodeURIComponent(target.id)}/role`,{method:"POST",body:JSON.stringify({role,reason})});
    toast("Rôle mis à jour.","success","success");
    await searchAdminTarget();
    await loadAdminConsole();
  }catch(error){toast(error.message||"Changement de rôle impossible.","error","error")}
}

function adminModerationUntil(){
  const value=Math.max(1,Number($("#adminModerationDuration")?.value)||1);
  const unit=$("#adminModerationUnit")?.value||"hours";
  const multiplier=unit==="minutes"?60000:unit==="days"?86400000:3600000;
  return new Date(Date.now()+value*multiplier).toISOString();
}

async function adminModerateTarget(action,permanent=false){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const reason=String($("#adminModerationReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez un motif de modération.","warning","warning");
  const label=action==="warn"?"avertissement":action==="mute"?"mute":(permanent?"ban définitif":"ban temporaire");
  if(!await showConfirm(`Appliquer un ${label} à ${target.pseudo} ?`,{title:"Action de modération",danger:action==="ban",okLabel:"Confirmer"}))return;
  try{
    const body={reason};
    if(action!=="warn"&&!permanent)body.until=adminModerationUntil();
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/${action}`,{method:"POST",body:JSON.stringify(body)});
    toast(`${label} appliqué.`,"success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Action de modération impossible.","error","error")}
}

async function renameAdminTargetUser(){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const pseudo=String($("#adminTargetNewPseudo")?.value||"").trim();
  const reason=String($("#adminModerationReason")?.value||$("#adminTargetRestrictionReason")?.value||"").trim();
  if(!pseudo)return toast("Indiquez un nouveau pseudo.","warning","warning");
  if(reason.length<3)return toast("Indiquez un motif pour le changement de pseudo.","warning","warning");
  if(!await showConfirm(`Renommer ${target.pseudo} en ${pseudo} ?`,{title:"Modification du pseudo",danger:true,okLabel:"Renommer"}))return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/pseudo`,{method:"PUT",body:JSON.stringify({pseudo,reason})});
    toast("Pseudo modifié.","success","success");
    const input=$("#adminTargetPseudo");if(input)input.value=pseudo;
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Modification du pseudo impossible.","error","error")}
}

async function adminUpdateTargetAvatar(clear=false){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const reason=String($("#adminTargetAvatarReason")?.value||$("#adminModerationReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez un motif pour modifier l'avatar.","warning","warning");
  const avatarUrl=clear?"":String($("#adminTargetAvatarUrl")?.value||"").trim();
  if(!clear&&!avatarUrl)return toast("Indiquez une URL d'avatar ou utilisez Supprimer l'avatar.","warning","warning");
  if(!await showConfirm(clear?`Supprimer l'avatar de ${target.pseudo} ?`:`Changer l'avatar de ${target.pseudo} ?`,{title:"Gestion de l'avatar",danger:clear,okLabel:clear?"Supprimer":"Changer"}))return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/avatar`,{method:"PUT",body:JSON.stringify({avatarUrl,reason})});
    toast(clear?"Avatar supprimé.":"Avatar modifié.","success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Modification de l'avatar impossible.","error","error")}
}

async function saveAdminTargetRestrictions(){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const reason=String($("#adminTargetRestrictionReason")?.value||$("#adminModerationReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez une raison pour modifier les restrictions.","warning","warning");
  const restrictions={};
  document.querySelectorAll("[data-admin-target-restriction]").forEach(input=>{restrictions[input.dataset.adminTargetRestriction]=!!input.checked});
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/restrictions`,{method:"PUT",body:JSON.stringify({
      restrictions,
      profileLocked:!!$("#adminTargetProfileLocked")?.checked,
      avatarLocked:!!$("#adminTargetAvatarLocked")?.checked,
      reason
    })});
    toast("Restrictions mises à jour.","success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Restrictions impossibles à appliquer.","error","error")}
}

async function adminSecurityTarget(path){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const reason=String($("#adminTargetSecurityReason")?.value||$("#adminModerationReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez un motif de sécurité.","warning","warning");
  const isPassword=path==="password-reset";
  if(!await showConfirm(isPassword?`Forcer ${target.pseudo} à choisir un nouveau mot de passe ?`:`Révoquer toutes les sessions de ${target.pseudo} ?`,{title:isPassword?"Mot de passe forcé":"Sessions",danger:true,okLabel:"Confirmer"}))return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/${path}`,{method:"POST",body:JSON.stringify({reason})});
    toast(isPassword?"Réinitialisation forcée.":"Sessions révoquées.","success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Action de sécurité impossible.","error","error")}
}

async function adminTechnicalBanTarget(kind){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const reason=String($("#adminTechnicalBanReason")?.value||$("#adminTargetSecurityReason")?.value||$("#adminModerationReason")?.value||"").trim();
  if(reason.length<3)return toast("Indiquez un motif pour le ban technique.","warning","warning");
  const label=kind==="ip"?"l'adresse IP":"ce navigateur";
  if(!await showConfirm(`Bannir ${label} de ${target.pseudo} ?\n\nLe membre pourra toujours utiliser le tracker local, mais la connexion cloud sera bloquée depuis cette cible.`,{title:"Ban technique",danger:true,okLabel:"Bannir"}))return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/${kind==="ip"?"ip-ban":"browser-ban"}`,{method:"POST",body:JSON.stringify({reason})});
    toast(kind==="ip"?"IP bannie.":"Navigateur banni.","success","success");
    await searchAdminTarget();
    await loadAdminTechnicalBans();
  }catch(error){toast(error.message||"Ban technique impossible.","error","error")}
}

function renderAdminTechnicalBans(result){
  const box=$("#adminTechnicalBanList");
  if(!box)return;
  const ips=Array.isArray(result?.ips)?result.ips:[];
  const browsers=Array.isArray(result?.browsers)?result.browsers:[];
  const rows=[
    ...ips.map(row=>({kind:"ip",id:row.id,label:row.ipAddress,target:row.targetPseudo,actor:row.actorPseudo,reason:row.reason,createdAt:row.createdAt})),
    ...browsers.map(row=>({kind:"browser",id:row.id,label:row.browserId,target:row.targetPseudo,actor:row.actorPseudo,reason:row.reason,createdAt:row.createdAt}))
  ];
  box.innerHTML=rows.length?rows.map(row=>`
    <article class="admin-clean-timeline-row">
      <strong>${row.kind==="ip"?"IP":"Navigateur"} · ${escapeHtml(row.kind==="browser"?`${String(row.label||"").slice(0,28)}...`:row.label||"")}</strong>
      <small>${row.target?`Cible : ${escapeHtml(row.target)} · `:""}Par ${escapeHtml(row.actor||"Equipe")} · ${adminConsoleDate(row.createdAt)}${row.reason?` · ${escapeHtml(row.reason)}`:""}</small>
      <button class="btn btn-gray" type="button" data-admin-delete-technical-ban="${escapeHtml(String(row.id))}" data-kind="${row.kind}">Retirer</button>
    </article>
  `).join(""):`<div class="admin-console-empty">Aucun ban technique actif.</div>`;
  box.querySelectorAll("[data-admin-delete-technical-ban]").forEach(button=>button.addEventListener("click",()=>deleteAdminTechnicalBan(button.dataset.kind,button.dataset.adminDeleteTechnicalBan)));
}

async function loadAdminTechnicalBans(){
  const box=$("#adminTechnicalBanList");
  if(box)box.innerHTML=`<div class="admin-console-empty">Chargement des bans techniques...</div>`;
  try{
    renderAdminTechnicalBans(await authFetch("/moderation/security-bans"));
  }catch(error){toast(error.message||"Impossible de charger les bans techniques.","error","error")}
}

async function deleteAdminTechnicalBan(kind,id){
  if(!await showConfirm("Retirer ce ban technique ?",{title:"Sécurité technique",okLabel:"Retirer"}))return;
  try{
    await authFetch(`/moderation/security-bans/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`,{method:"DELETE"});
    toast("Ban technique retiré.","success","success");
    await loadAdminTechnicalBans();
  }catch(error){toast(error.message||"Suppression impossible.","error","error")}
}

async function adminLiftModeration(action){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  const label=action==="unmute"?"retirer le mute":"débannir";
  if(!await showConfirm(`${label[0].toUpperCase()+label.slice(1)} ${target.pseudo} ?`,{title:"Lever une sanction",okLabel:"Confirmer"}))return;
  try{
    await authFetch(`/moderation/users/${encodeURIComponent(target.id)}/${action}`,{method:"POST",body:JSON.stringify({reason:"Sanction levée depuis le centre de contrôle."})});
    toast("Sanction levée.","success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Impossible de lever la sanction.","error","error")}
}

async function searchAdminTarget(){
  const pseudo=String($("#adminTargetPseudo")?.value||"").trim();
  if(!pseudo)return toast("Indiquez un pseudo.","warning","warning");
  const box=$("#adminTargetWorkspace");if(box){box.className="admin-console-loading";box.textContent="Chargement du compte..."}
  try{renderAdminTarget(await authFetch(`/admin/users/${encodeURIComponent(pseudo)}/control`))}
  catch(error){if(box){box.className="admin-console-empty";box.textContent=error.message||"Utilisateur introuvable."}}
}

function renderAdminTarget(payload){
  adminConsoleTarget=payload;
  const box=$("#adminTargetWorkspace");
  if(!box)return;
  const user=payload.user||{};
  const permissions=new Set(payload.permissions||[]);
  const profiles=payload.profiles||[];
  const achievements=payload.achievements||[];
  const galleryEvents=payload.galleryEvents||[];
  const galleryPykurs=payload.galleryPykurs||[];
  const history=payload.history||[];
  const can=id=>permissions.has(id);
  const canModerate=!!user.canModerate&&(can("users.warn")||can("users.mute")||can("users.ban")||can("users.history.manage"));
  const canCommunicate=can("notifications.send");
  const canTargetEvent=can("events.target");
  const canAvatar=can("users.avatar.manage");
  const canRestrict=can("users.restrict");
  const canIdentity=can("users.rename");
  const canTechnicalSecurity=can("users.ip.view")||can("users.ip.ban")||can("users.browser.ban")||can("users.security_bans.view");
  const canSecurity=can("users.sessions.revoke")||can("users.password.reset")||canTechnicalSecurity;
  const canTracker=can("tracker.reset")||can("achievements.manage")||can("gallery.manage")||can("profiles.manage");
  const canRoles=can("roles.manage");
  const restrictions=user.socialRestrictions||{};
  const activeProfile=profiles.find(profile=>profile.active)||profiles[0]||null;
  const selectedProfileId=adminTargetSelectedProfile();
  const selectedProfile=profiles.find(profile=>String(profile.id)===String(selectedProfileId))||activeProfile;
  const roleOptions=["user","moderator","admin"].map(role=>`<option value="${role}" ${user.role===role?"selected":""}>${escapeHtml(authRoleLabel(role))}</option>`).join("");
  const tabIds=["summary","tracker","moderation","identity","security","danger"];
  if(!tabIds.includes(adminTargetPanelTab))adminTargetPanelTab="summary";
  const recentHistory=history.slice(0,6).map(item=>`<article class="admin-clean-timeline-row"><strong>${escapeHtml(adminCommandTypeLabel(item.type)||item.type||"Action")}</strong><small>${adminConsoleDate(item.createdAt)}${item.actor?.pseudo?` · par ${escapeHtml(item.actor.pseudo)}`:""}${item.reason?` · ${escapeHtml(item.reason)}`:""}</small></article>`).join("");
  const profileCards=profiles.length?profiles.map(profile=>cloudProfileAdminOption(profile,String(profile.id)===String(selectedProfile?.id))).join(""):`<div class="admin-console-empty">Aucune sauvegarde cloud exploitable.</div>`;
  const tabButtons=[
    ["summary","Vue d'ensemble","Contact et commandes"],
    ["tracker","Tracker","Profils, galerie, succès"],
    ["moderation","Sanctions","Warn, mute, ban"],
    ["identity","Identité","Pseudo, avatar, restrictions"],
    ["security","Sécurité","Rôle et sessions"],
    ["danger","Zone critique","Actions destructrices"]
  ].map(([id,label,desc])=>`<button class="${adminTargetPanelTab===id?"active":""}" type="button" data-admin-member-tab="${id}"><span>${label}</span><small>${desc}</small></button>`).join("");
  const sections={
    summary:`
      <section class="admin-clean-section-grid">
        ${canCommunicate?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Communication</span><strong>Message direct</strong></div><textarea id="adminTargetNotification" maxlength="500" placeholder="Message visible par le joueur, même s'il est hors ligne"></textarea><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSendTargetNotification" type="button">Notification</button><button class="btn btn-orange" id="adminSendTargetPopup" type="button">Popup persistante</button><button class="btn btn-red" id="adminKickTarget" type="button">Kick avec message</button></div></article>`:""}
        ${canTargetEvent?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Cosmétique</span><strong>Événement ciblé</strong></div><div class="admin-target-event"><select id="adminTargetEvent">${LIVING_EVENT_DEFS.map(item=>`<option value="${item.id}">${escapeHtml(item.label)}</option>`).join("")}</select><button class="btn btn-orange" id="adminSendTargetEvent" type="button">Jouer</button></div><p class="options-note">Ne compte ni comme découverte, ni comme récompense.</p></article>`:""}
        <article class="admin-clean-card"><div class="admin-clean-card-head"><span>Historique</span><strong>Sanctions récentes</strong></div><div class="admin-clean-timeline">${recentHistory||`<div class="admin-console-empty">Aucune action récente.</div>`}</div></article>
        <article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>File serveur</span><strong>Commandes récentes</strong></div>${adminConsoleCommandRows(payload.commands||[])}</article>
      </section>`,
    tracker:`
      <section class="admin-clean-section-grid">
        <article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Cible actuelle</span><strong>${escapeHtml(selectedProfile?.name||"Aucun profil")}</strong></div>${cloudProfileAdminFocus(selectedProfile)}</article>
        <article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Profils familiers</span><strong>Sélectionnez la cible</strong></div><div class="admin-clean-profile-list">${profileCards}</div></article>
        ${can("tracker.reset")?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Réparation</span><strong>Recalculs sûrs</strong></div><div class="admin-action-buttons"><button class="btn btn-orange" data-admin-target-command="repair-progression">Réparer la progression</button><button class="btn btn-orange" data-admin-target-command="recalculate-achievements">Recalculer les succès</button></div></article>`:""}
        ${can("profiles.manage")?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Profil sélectionné</span><strong>Renommage</strong></div><div class="admin-target-event"><input id="adminTargetProfileName" type="text" maxlength="80" placeholder="Nouveau nom du profil"><button class="btn btn-blue" id="adminRenameTargetProfile" type="button">Renommer</button></div></article>`:""}
        ${can("achievements.manage")?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Succès</span><strong>Retrait ciblé</strong></div>${achievements.length?`<div class="admin-target-event"><select id="adminTargetAchievement"><option value="">Choisir un succès débloqué</option>${achievements.map(id=>`<option value="${adminEscapeAttr(id)}">${escapeHtml(ACHIEVEMENTS[id]?.name||id)}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetAchievement" type="button">Retirer ce succès</button></div>`:`<p class="options-note">Aucun succès débloqué.</p>`}</article>`:""}
        ${can("gallery.manage")?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Galerie</span><strong>Retraits individuels</strong></div><div class="admin-clean-inline-tools">${galleryEvents.length?`<div class="admin-target-event"><select id="adminTargetGalleryEvent"><option value="">Choisir un événement découvert</option>${galleryEvents.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminConsoleEventLabel(item.id))} · vu ${item.count} fois</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryEvent" type="button">Retirer l'événement</button></div>`:`<p class="options-note">Aucun événement découvert.</p>`}${galleryPykurs.length?`<div class="admin-target-event"><select id="adminTargetGalleryPykur"><option value="">Choisir un familier archivé</option>${galleryPykurs.map(item=>`<option value="${adminEscapeAttr(item.id)}">${escapeHtml(adminGalleryArchiveLabel(item))}</option>`).join("")}</select><button class="btn btn-red" id="adminRemoveTargetGalleryPykur" type="button">Retirer le familier</button></div>`:`<p class="options-note">Aucun familier archivé.</p>`}</div></article>`:""}
      </section>`,
    moderation:canModerate?`
      <section class="admin-clean-section-grid">
        <article class="admin-clean-card admin-clean-card-wide admin-clean-warning"><div class="admin-clean-card-head"><span>Sanction</span><strong>Durée et motif</strong></div><p class="options-note">Chaque action est visible dans les logs de modération. Le motif doit être clair pour l'utilisateur.</p><div class="admin-clean-moderation-form"><input id="adminModerationDuration" type="number" min="1" max="525600" value="24" aria-label="Durée"><select id="adminModerationUnit" aria-label="Unité"><option value="minutes">minutes</option><option value="hours" selected>heures</option><option value="days">jours</option></select><input id="adminModerationReason" type="text" maxlength="300" placeholder="Motif affiché au joueur"></div><div class="admin-action-buttons admin-clean-action-grid">${can("users.warn")?`<button class="btn btn-blue" id="adminWarnTarget" type="button">Avertir</button>`:""}${can("users.mute")?`<button class="btn btn-orange" id="adminMuteTarget" type="button">Mute temporaire</button>`:""}${can("users.ban")?`<button class="btn btn-red" id="adminBanTarget" type="button">Ban temporaire</button>`:""}${can("users.ban.permanent")?`<button class="btn btn-red" id="adminBanPermanentTarget" type="button">Ban définitif</button>`:""}${user.muteUntil&&can("users.mute")?`<button class="btn btn-gray" id="adminUnmuteTarget" type="button">Retirer le mute</button>`:""}${user.isBanned&&can("users.ban")?`<button class="btn btn-blue" id="adminUnbanTarget" type="button">Débannir</button>`:""}</div></article>
        <article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Contexte</span><strong>Historique récent</strong></div><div class="admin-clean-timeline">${recentHistory||`<div class="admin-console-empty">Aucune action récente.</div>`}</div></article>
      </section>`:`<div class="admin-console-empty">Vous ne pouvez pas modérer ce membre.</div>`,
    identity:`
      <section class="admin-clean-section-grid">
        ${canIdentity?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Pseudo</span><strong>Modifier l'identité</strong></div><div class="admin-target-event"><input id="adminTargetNewPseudo" type="text" maxlength="24" placeholder="Nouveau pseudo"><button class="btn btn-blue" id="adminRenameTargetUser" type="button">Renommer</button></div><p class="options-note">Le motif est lu depuis le champ de restrictions si nécessaire.</p></article>`:""}
        ${canAvatar?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Avatar</span><strong>Changer ou supprimer</strong></div><div class="admin-avatar-editor clean">${avatarMarkup(user)}<div class="admin-avatar-fields"><input id="adminTargetAvatarUrl" type="url" maxlength="800" value="${adminEscapeAttr(user.avatarUrl||"")}" placeholder="Nouvelle URL d'avatar ou vide pour supprimer"><input id="adminTargetAvatarReason" type="text" maxlength="300" placeholder="Motif de modification avatar"><div class="admin-action-buttons"><button class="btn btn-blue" id="adminSaveTargetAvatar" type="button">Changer l'avatar</button><button class="btn btn-red" id="adminClearTargetAvatar" type="button">Supprimer l'avatar</button></div></div></div></article>`:""}
        ${canRestrict?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Restrictions sociales</span><strong>Limiter temporairement des usages</strong></div><div class="admin-restriction-grid clean">${["chat","privateMessages","friendRequests","shares"].map(key=>`<label><input type="checkbox" data-admin-target-restriction="${key}" ${restrictions[key]?"checked":""}> ${key==="chat"?"Chat global":key==="privateMessages"?"Messages privés":key==="friendRequests"?"Demandes d'ami":"Partages automatiques"}</label>`).join("")}<label><input type="checkbox" id="adminTargetProfileLocked" ${user.profileLocked?"checked":""}> Verrouiller le profil public</label><label><input type="checkbox" id="adminTargetAvatarLocked" ${user.avatarLocked?"checked":""}> Verrouiller l'avatar</label></div><div class="admin-target-event"><input id="adminTargetRestrictionReason" type="text" maxlength="300" placeholder="Motif des restrictions"><button class="btn btn-orange" id="adminSaveTargetRestrictions" type="button">Appliquer les restrictions</button></div></article>`:""}
      </section>`,
    security:`
      <section class="admin-clean-section-grid">
        ${canRoles?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Rôle</span><strong>Permissions principales</strong></div><p class="options-note">Le changement de rôle est protégé, journalisé et ne peut pas supprimer le dernier administrateur.</p><div class="admin-role-editor clean"><select id="adminTargetRole">${roleOptions}</select><input id="adminTargetRoleReason" type="text" maxlength="300" placeholder="Motif du changement de rôle"><button class="btn btn-blue" id="adminChangeTargetRole" type="button">Appliquer le rôle</button></div></article>`:""}
        ${canSecurity?`<article class="admin-clean-card"><div class="admin-clean-card-head"><span>Compte</span><strong>Sessions</strong></div><input id="adminTargetSecurityReason" type="text" maxlength="300" placeholder="Motif sécurité"><div class="admin-action-buttons">${can("users.sessions.revoke")?`<button class="btn btn-red" id="adminRevokeTargetSessions" type="button">Révoquer sessions</button>`:""}${can("users.password.reset")?`<button class="btn btn-orange" id="adminForceTargetPassword" type="button">Forcer mot de passe</button>`:""}</div></article>`:""}
        ${canTechnicalSecurity?`<article class="admin-clean-card admin-clean-card-wide"><div class="admin-clean-card-head"><span>Sécurité technique</span><strong>IP et navigateur</strong></div><div class="admin-mini-stats clean">${can("users.ip.view")?`<div><small>Dernière IP</small><strong>${escapeHtml(user.lastIpAddress||"Non connue")}</strong></div><div><small>Navigateur</small><strong>${escapeHtml(user.lastBrowserId?`${user.lastBrowserId.slice(0,18)}...`:"Non connu")}</strong></div>`:`<div><small>Données réseau</small><strong>Permission requise</strong></div>`}</div><input id="adminTechnicalBanReason" type="text" maxlength="300" placeholder="Motif du ban technique"><div class="admin-action-buttons">${can("users.ip.ban")?`<button class="btn btn-red" id="adminBanTargetIp" type="button" ${user.lastIpAddress?"":"disabled"}>Bannir l'IP</button>`:""}${can("users.browser.ban")?`<button class="btn btn-red" id="adminBanTargetBrowser" type="button" ${user.lastBrowserId?"":"disabled"}>Bannir ce navigateur</button>`:""}${can("users.security_bans.view")?`<button class="btn btn-gray" id="adminShowTechnicalBans" type="button">Voir les bans techniques</button>`:""}</div><div id="adminTechnicalBanList" class="admin-clean-timeline"></div><p class="options-note">Le ban navigateur bloque ce navigateur connu. Il reste contournable si l'utilisateur efface ses données de site.</p></article>`:""}
      </section>`,
    danger:canTracker?`
      <section class="admin-clean-section-grid">
        <article class="admin-clean-card admin-clean-card-wide admin-clean-danger"><div class="admin-clean-card-head"><span>Zone critique</span><strong>Réinitialisations et suppressions</strong></div><p>Les actions de profil ciblent le familier sélectionné ci-dessous. Elles demandent une confirmation et sont journalisées côté serveur.</p>${cloudProfileAdminFocus(selectedProfile)}<div class="admin-danger-strip clean">${can("gallery.manage")?`<button class="btn btn-red" data-admin-target-command="reset-gallery">Reset galerie</button>`:""}${can("achievements.manage")?`<button class="btn btn-red" data-admin-target-command="reset-achievements">Reset succès</button>`:""}${can("tracker.reset")?`<button class="btn btn-red" data-admin-target-command="reset-profile" data-needs-profile="1">Reset profil</button><button class="btn btn-red" data-admin-target-command="reset-pykur" data-needs-profile="1">Reset familier</button>`:""}${can("profiles.manage")?`<button class="btn btn-red" data-admin-target-command="delete-profile" data-needs-profile="1">Supprimer profil</button>`:""}</div></article>
      </section>`:`<div class="admin-console-empty">Aucune action critique disponible pour votre rôle.</div>`
  };
  box.className="";
  box.innerHTML=`
    <section class="admin-clean-member">
      <header class="admin-clean-hero role-${escapeHtml(user.role||"user")}">
        <div class="admin-clean-identity">
          ${avatarMarkup(user)}
          <div><div class="admin-clean-title"><h3>${escapeHtml(user.pseudo||"Utilisateur")}</h3><span class="admin-role-pill ${escapeHtml(user.role||"user")}">${escapeHtml(authRoleLabel(user.role))}</span></div><p>${escapeHtml(user.email||"Email masqué")} · Cloud ${adminConsoleDate(payload.cloudUpdatedAt)}</p><div class="admin-status-row">${adminTargetStatusChips(user)}</div></div>
        </div>
        <div class="admin-clean-snapshot"><span>Profil actif</span><strong>${escapeHtml(activeProfile?.name||"Aucun profil")}</strong><small>${activeProfile?`${escapeHtml(activeProfile.familiarLabel||"Pykur")} · ${cloudProfileSummaryText(activeProfile)}`:"Aucune donnée cloud"}</small></div>
      </header>
      <div class="admin-clean-body">
        <aside class="admin-clean-sidebar">
          <article><h4>Profils cloud</h4><div class="admin-clean-profile-list">${profileCards}</div></article>
          <article><h4>Indicateurs</h4><div class="admin-mini-stats clean"><div><small>Succès</small><strong>${achievements.length}</strong></div><div><small>Événements</small><strong>${galleryEvents.length}</strong></div><div><small>Archives</small><strong>${galleryPykurs.length}</strong></div></div></article>
        </aside>
        <main class="admin-clean-main">
          <nav class="admin-member-tabs" aria-label="Contrôle du membre">${tabButtons}</nav>
          <div class="admin-member-tab-panel">${sections[adminTargetPanelTab]||sections.summary}</div>
        </main>
      </div>
    </section>`;
  box.querySelectorAll("[data-admin-member-tab]").forEach(button=>button.addEventListener("click",()=>{
    adminTargetPanelTab=button.dataset.adminMemberTab||"summary";
    renderAdminTarget(payload);
  }));
  box.querySelectorAll('input[name="adminTargetProfile"]').forEach(input=>input.addEventListener("change",()=>renderAdminTarget(payload)));
  $("#adminChangeTargetRole")?.addEventListener("click",adminChangeTargetRole);
  $("#adminSendTargetNotification")?.addEventListener("click",()=>sendAdminTargetCommand("notification",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminSendTargetPopup")?.addEventListener("click",()=>sendAdminTargetCommand("popup-message",{message:$("#adminTargetNotification")?.value||""},false));
  $("#adminKickTarget")?.addEventListener("click",()=>sendAdminTargetCommand("kick",{message:$("#adminTargetNotification")?.value||"Votre session a été interrompue par l'équipe de modération."},true));
  $("#adminSendTargetEvent")?.addEventListener("click",()=>sendAdminTargetCommand("living-event",{eventId:$("#adminTargetEvent")?.value},false));
  $("#adminRenameTargetProfile")?.addEventListener("click",()=>sendAdminTargetCommand("rename-profile",{profileId:adminTargetSelectedProfile(),name:$("#adminTargetProfileName")?.value||""},true));
  $("#adminRenameTargetUser")?.addEventListener("click",()=>renameAdminTargetUser());
  $("#adminSaveTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(false));
  $("#adminClearTargetAvatar")?.addEventListener("click",()=>adminUpdateTargetAvatar(true));
  $("#adminSaveTargetRestrictions")?.addEventListener("click",()=>saveAdminTargetRestrictions());
  $("#adminRevokeTargetSessions")?.addEventListener("click",()=>adminSecurityTarget("sessions/revoke"));
  $("#adminForceTargetPassword")?.addEventListener("click",()=>adminSecurityTarget("password-reset"));
  $("#adminRemoveTargetAchievement")?.addEventListener("click",()=>sendAdminTargetCommand("remove-achievement",{achievementId:$("#adminTargetAchievement")?.value||""},true));
  $("#adminRemoveTargetGalleryEvent")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-event",{eventId:$("#adminTargetGalleryEvent")?.value||""},true));
  $("#adminRemoveTargetGalleryPykur")?.addEventListener("click",()=>sendAdminTargetCommand("remove-gallery-pykur",{pykurId:$("#adminTargetGalleryPykur")?.value||""},true));
  $("#adminWarnTarget")?.addEventListener("click",()=>adminModerateTarget("warn"));
  $("#adminMuteTarget")?.addEventListener("click",()=>adminModerateTarget("mute"));
  $("#adminBanTarget")?.addEventListener("click",()=>adminModerateTarget("ban"));
  $("#adminBanPermanentTarget")?.addEventListener("click",()=>adminModerateTarget("ban",true));
  $("#adminUnmuteTarget")?.addEventListener("click",()=>adminLiftModeration("unmute"));
  $("#adminUnbanTarget")?.addEventListener("click",()=>adminLiftModeration("unban"));
  box.querySelectorAll("[data-admin-target-command]").forEach(button=>button.addEventListener("click",()=>{
    const payloadData=button.dataset.needsProfile?{profileId:adminTargetSelectedProfile()}:{};
    sendAdminTargetCommand(button.dataset.adminTargetCommand,payloadData,true);
  }));
}

async function sendAdminTargetCommand(type,payload={},danger=false){
  const target=adminConsoleTarget?.user;
  if(!target)return;
  if(danger){
    const targetedProfile=(adminConsoleTarget?.profiles||[]).find(profile=>String(profile.id)===String(payload.profileId));
    const profileDetail=targetedProfile?`\n\nProfil ciblé : ${targetedProfile.name}\nFamilier : ${cloudProfileFamiliar(targetedProfile).label}\nProgression : ${cloudProfileProgressValue(targetedProfile)} / ${cloudProfileObjectiveMax(targetedProfile)} ${cloudProfileProgressLabel(targetedProfile)}\nMéthodes : ${cloudProfileRunsEntries(targetedProfile).map(item=>`${item.label} ${item.value}`).join(" · ")}`:"";
    if(!await showConfirm(`Confirmer l'action « ${adminCommandTypeLabel(type)} » sur ${target.pseudo} ?${profileDetail}`,{title:"Action administrative",danger:true,okLabel:"Confirmer"}))return;
  }
  try{
    await authFetch(`/admin/users/${encodeURIComponent(target.id)}/commands`,{method:"POST",body:JSON.stringify({type,payload})});
    toast("Commande enregistrée et transmise au joueur.","success","success");
    await searchAdminTarget();await loadAdminConsole();
  }catch(error){toast(error.message||"Commande impossible.","error","error")}
}

function livingOpenAdmin(targetTab="dashboard",targetPseudo=""){
  if(!authState.user || !["moderator","admin"].includes(authState.user.role))return toast("Accès réservé à l'équipe.","error","error");
  closeHelp();
  if(activeDialog)closeDialog(activeDialog.type==="prompt"?null:false);
  $$(".modal-bg.show,.side-panel-bg.show").forEach(layer=>{
    if(layer.id!=="livingEventAdmin")closeModal(layer.id);
  });
  livingBuildAdmin();
  $$("#livingEventAdmin .living-admin-section").forEach(section=>{section.open=false});
  livingRenderAdmin();
  loadAdminConsole();
  openModal("livingEventAdmin");
  adminConsoleSelectTab(targetTab||"dashboard");
  if(targetPseudo){
    const input=$("#adminTargetPseudo");
    if(input){
      input.value=targetPseudo;
      searchAdminTarget();
    }
  }
  if(data.settings.hudMode)bringHudToFront("livingEventAdmin");
}
function openControlCenterSection(tab="dashboard"){
  livingOpenAdmin(tab||"dashboard");
}
function openControlCenterForUser(pseudo=""){
  livingOpenAdmin("users",pseudo);
}
function adminPanelReopenSeconds(){
  return Math.max(5,Math.min(300,parseInt(data?.settings?.adminQuickReopenSeconds,10)||45));
}
function adminPanelArmQuickReopen(){
  clearTimeout(adminQuickReopenTimer);
  const seconds=adminPanelReopenSeconds();
  adminQuickReopenUntil=Date.now()+(seconds*1000);
  adminQuickReopenTimer=setTimeout(()=>{
    adminQuickReopenUntil=0;
    adminQuickReopenTimer=null;
  },seconds*1000);
}
function adminPanelCanQuickReopen(){
  return adminQuickReopenUntil && Date.now()<=adminQuickReopenUntil;
}
function adminPanelAfterAction(){
  if(!data?.settings?.adminAutoCloseAfterAction)return;
  if(!$("#livingEventAdmin")?.classList.contains("show"))return;
  adminPanelArmQuickReopen();
  closeModal("livingEventAdmin");
  toast(`Panel admin fermé. Appuyez sur A pour le rouvrir pendant ${adminPanelReopenSeconds()}s.`,"info","click");
}
function adminPanelTryQuickReopen(e){
  if(!adminPanelCanQuickReopen())return false;
  if(e.ctrlKey || e.metaKey || e.altKey)return false;
  if(String(e.key||"").toLowerCase()!=="a")return false;
  if(e.target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return false;
  if(activeDialog)return false;
  livingOpenAdmin();
  return true;
}
const LIVING_ADMIN_GROUPS=[
  {title:"Météo & Ambiance",ids:["rain","wind","heat","storm","fog","nightfall","sunray"]},
  {title:"Apparitions / Créatures",ids:["keph","shadow","butterfly","corbac","chacha","larva","tofu"]},
  {title:"Interactifs",ids:["poop","coin","fragment","chest","bottle"]},
  {title:"Magiques",ids:["resonance","unstableAura","shootingStar","sleepy"]},
  {title:"Légendaires",ids:["comet","awakening","fakeBug"]},
];
const LIVING_ADMIN_EASTER_EGGS=[
  {id:"aina",label:"Aina"},
  {id:"brako",label:"Brako"},
  {id:"dimeh",label:"Dimeh"},
  {id:"toom",label:"Toom"},
  {id:"alhass",label:"Alhass"},
  {id:"raj",label:"Raj"},
  {id:"charlie",label:"Charlie"},
  {id:"capy",label:"Capy"},
];
const ADMIN_PANEL_COMMANDS=[
  {id:"pc",label:"PC"},
  {id:"tel",label:"Tel"},
  {id:"adminoeuf",label:"Reset oeuf"},
  {id:"ester-eggs",label:"Indice oeuf"},
  {id:"reset-gallery",label:"Reset galerie"},
  {id:"reset-achievements",label:"Reset succes"},
];
function livingBuildAdmin(){
  const box=$("#livingEventButtons");
  const localBox=$("#livingLocalTestButtons");
  const role=authState.user?.role||"";
  if(!box || !localBox || (box.dataset.ready && box.dataset.role===role))return;
  box.dataset.ready="1";
  box.dataset.role=role;
  const eventById=new Map(LIVING_EVENT_DEFS.map(ev=>[ev.id,ev]));
  const eventSections=LIVING_ADMIN_GROUPS.map(group=>{
    const buttons=group.ids
      .map(id=>eventById.get(id))
      .filter(Boolean)
      .map(ev=>`<button class="btn ${ev.legendary?"btn-orange":"btn-blue"}" type="button" data-admin-force-event="${ev.id}" ${authState.user?.role==="admin"?"":"disabled"}>${ev.label}</button>`)
      .join("");
    return `<details class="living-admin-section"><summary>${group.title}</summary><div class="living-admin-buttons">${buttons}</div></details>`;
  });
  box.innerHTML=eventSections.join("");
  const localSections=LIVING_ADMIN_GROUPS.map(group=>{
    const buttons=group.ids.map(id=>eventById.get(id)).filter(Boolean).map(ev=>`<button class="btn ${ev.legendary?"btn-orange":"btn-blue"}" type="button" data-living-event="${ev.id}">${ev.label}</button>`).join("");
    return `<details class="living-admin-section"><summary>${group.title}</summary><div class="living-admin-buttons">${buttons}</div></details>`;
  });
  localSections.push(`<details class="living-admin-section"><summary>Easter Eggs</summary><div class="living-admin-buttons">${LIVING_ADMIN_EASTER_EGGS.map(egg=>`<button class="btn btn-gray" type="button" data-admin-easter="${egg.id}">${egg.label}</button>`).join("")}</div></details>`);
  const localCommands=authState.user?.role==="admin"?ADMIN_PANEL_COMMANDS:ADMIN_PANEL_COMMANDS.filter(cmd=>["pc","tel"].includes(cmd.id));
  localSections.push(`<details class="living-admin-section"><summary>Commandes locales</summary><div class="living-admin-buttons">${localCommands.map(cmd=>`<button class="btn btn-orange" type="button" data-admin-command="${cmd.id}">${cmd.label}</button>`).join("")}</div></details>`);
  const passiveButtons=PASSIVE_AMBIENCE_EVENTS.map(item=>{
    const main=`<button class="btn btn-blue" type="button" data-passive-ambience="${item.id}">${item.label}</button>`;
    const variants=(item.variants||[])
      .map(variant=>`<button class="btn living-admin-variant" type="button" data-passive-ambience="${item.id}" data-passive-variant="${variant.id}">${variant.label}</button>`)
      .join("");
    return main+variants;
  }).join("");
  localSections.push(`<details class="living-admin-section"><summary>Ambiances passives</summary><div class="living-admin-buttons">${passiveButtons}</div></details>`);
  localBox.innerHTML=localSections.join("");
}
function livingRenderAdmin(){
  const active=$("#livingEventActiveLabel");
  const passive=$("#passiveAmbienceActiveLabel");
  const next=$("#livingEventNextLabel");
  const start=$("#livingEventStartLabel");
  const cooldown=$("#livingEventCooldownLabel");
  const passiveVisual=$("#passiveVisualCooldownLabel");
  const passiveSound=$("#passiveSoundCooldownLabel");
  const passiveSystem=$("#passiveSystemLabel");
  if(active)active.textContent=livingState.current ? (LIVING_EVENT_DEFS.find(ev=>ev.id===livingState.current)?.label||livingState.current) : "Aucun";
  if(passive)passive.textContent=passiveState.current ? (PASSIVE_AMBIENCE_EVENTS.find(item=>item.id===passiveState.current)?.label||passiveState.current) : "Aucune";
  const scheduled=LIVING_EVENT_DEFS.find(ev=>ev.id===livingState.pendingEvent);
  if(next)next.textContent=scheduled ? `${scheduled.label} · #${livingState.serverSequence||"-"}` : "Synchronisation...";
  if(start)start.textContent=livingState.serverStartsAt ? new Date(livingState.serverStartsAt).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "Synchronisation...";
  if(cooldown){
    const elapsed=livingState.serverReceivedAt ? performance.now()-livingState.serverReceivedAt : 0;
    const remain=Math.max(0,livingState.serverRemainingMs-elapsed);
    cooldown.textContent=livingState.serverPaused ? "En pause" : livingState.active && livingState.source==="server" ? `En cours · ${Math.ceil(remain/1000)}s` : remain ? `${Math.ceil(remain/1000)}s` : "Synchronisation...";
  }
  if(passiveVisual){
    const remain=Math.max(0,(passiveState.visualCooldownUntil||0)-Date.now());
    passiveVisual.textContent=passiveState.active && passiveState.currentType==="visual" ? "En cours" : remain ? `${Math.ceil(remain/1000)}s` : "Prêt";
  }
  if(passiveSound){
    const remain=Math.max(0,(passiveState.soundCooldownUntil||0)-Date.now());
    passiveSound.textContent=passiveState.active && passiveState.currentType==="sound" ? "En cours" : remain ? `${Math.ceil(remain/1000)}s` : "Prêt";
  }
  if(passiveSystem)passiveSystem.textContent=data?.settings?.passiveAmbience===false ? "Désactivé" : "Activé";
  if($("#passiveToggleAdmin"))$("#passiveToggleAdmin").textContent=data?.settings?.passiveAmbience===false ? "Activer ambiances" : "Désactiver ambiances";
  const autoClose=$("#adminAutoCloseAfterAction");
  if(autoClose)autoClose.checked=!!data?.settings?.adminAutoCloseAfterAction;
  const reopenSeconds=$("#adminQuickReopenSeconds");
  if(reopenSeconds)reopenSeconds.value=String(adminPanelReopenSeconds());
  try{adminRenderAchievements()}catch(e){}
}
function adminEscapeAttr(value){
  return String(value).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function adminAchievementCategoryLabel(category){
  const labels={
    "PROGRESSION PYKUR":"Progression Pykur",
    "DONJONS":"Donjons",
    "TRACKER & UTILISATION":"Tracker & Utilisation",
    "FINAL":"Final",
    "SECRETS":"Secret",
    "EASTER EGGS":"Easter Eggs",
    "ÉVÉNEMENTS":"Événements",
    "EVENEMENTS":"Événements"
  };
  return labels[category]||category;
}
function adminAchievementCategories(){
  const preferred=["PROGRESSION PYKUR","DONJONS","TRACKER & UTILISATION","FINAL","SECRETS","EASTER EGGS","ÉVÉNEMENTS","EVENEMENTS"];
  const present=[...new Set(Object.values(ACHIEVEMENTS||{}).map(a=>a.category))];
  return preferred.filter(cat=>present.includes(cat)).concat(present.filter(cat=>!preferred.includes(cat)));
}
function adminPruneInvalidFinals(){
  ensureAchievements();
  const secretProgress=getSecretAchievementsProgress();
  if((!secretProgress.total || secretProgress.done<secretProgress.total) && isAchievementUnlocked("master_secrets")){
    delete data.achievements.unlocked.master_secrets;
  }
  if((!isAchievementUnlocked("tracker_absolute") || !isAchievementUnlocked("master_secrets")) && isAchievementUnlocked("true_100")){
    delete data.achievements.unlocked.true_100;
  }
}
function adminGiveAchievement(id){
  ensureAchievements();
  const achievement=ACHIEVEMENTS[id];
  if(!achievement)return false;
  const wasUnlocked=isAchievementUnlocked(id);
  if(!wasUnlocked && adminAchievementSounds){
    return unlockAchievement(id,{silent:false,celebrate:true});
  }
  if(!wasUnlocked)data.achievements.unlocked[id]={date:new Date().toISOString()};
  if(achievement.category!=="FINAL")checkTrackerAbsolute({silent:true});
  if(SECRET_COMPLETION_CATEGORIES.includes(achievement.category))checkMasterSecrets({silent:true});
  checkTrue100({silent:true,celebrate:false});
  return true;
}
function adminRemoveAchievement(id){
  ensureAchievements();
  const achievement=ACHIEVEMENTS[id];
  if(!achievement)return false;
  delete data.achievements.unlocked[id];
  if(MAIN_ACHIEVEMENT_CATEGORIES.includes(achievement.category)){
    const progress=getMainAchievementsProgress();
    if(progress.done<progress.total)delete data.achievements.unlocked.tracker_absolute;
  }
  adminPruneInvalidFinals();
  return true;
}
function adminRenderAchievements(){
  const box=$("#adminAchievementList");
  if(!box || !data)return;
  ensureAchievements();
  const categories=adminAchievementCategories();
  box.innerHTML=categories.map(category=>{
    const entries=achievementList().filter(([,achievement])=>achievement.category===category);
    const done=entries.filter(([id])=>isAchievementUnlocked(id)).length;
    const rows=entries.map(([id,achievement])=>{
      const unlocked=isAchievementUnlocked(id);
      return `<div class="admin-achievement-row ${unlocked?"unlocked":"locked"}">
        <span>${achievement.title}<small>${unlocked?"Débloqué":"Verrouillé"}</small></span>
        <button class="btn btn-blue" type="button" data-admin-achievement-give="${adminEscapeAttr(id)}">Donner</button>
        <button class="btn btn-gray" type="button" data-admin-achievement-remove="${adminEscapeAttr(id)}">Retirer</button>
      </div>`;
    }).join("");
    return `<div class="admin-achievement-category">
      <div class="admin-achievement-head">
        <strong>${adminAchievementCategoryLabel(category)} <small>${done}/${entries.length}</small></strong>
        <div class="toolbar">
          <button class="btn btn-blue" type="button" data-admin-achievement-cat-give="${adminEscapeAttr(category)}">Tout donner</button>
          <button class="btn btn-gray" type="button" data-admin-achievement-cat-remove="${adminEscapeAttr(category)}">Tout retirer</button>
        </div>
      </div>
      <div class="admin-achievement-list">${rows}</div>
    </div>`;
  }).join("");
  const sound=$("#adminAchievementSounds");
  if(sound)sound.checked=adminAchievementSounds;
}
function adminAchievementSaveAndRender(message,type="info"){
  save();
  renderAchievements();
  adminRenderAchievements();
  if(message)toast(message,type,adminAchievementSounds?"click":false);
}
async function adminAchievementAction(action){
  if(action==="give-all"){
    achievementList().forEach(([id])=>adminGiveAchievement(id));
    adminAchievementSaveAndRender("Tous les succès ont été donnés.","success");
  }else if(action==="remove-all"){
    achievementList().forEach(([id])=>delete data.achievements.unlocked[id]);
    adminAchievementSaveAndRender("Tous les succès ont été retirés.","warning");
  }else if(action==="recalculate"){
    recalculateAchievements({silent:!adminAchievementSounds});
    toast("Succès recalculés.","info",adminAchievementSounds?"click":false);
  }else if(action==="reset-all"){
    await resetAchievements();
    adminRenderAchievements();
  }
}
function livingRunAdminEasterEgg(id){
  const actions={
    aina:()=>toggleAina(),
    brako:()=>toggleBrakoEasterEgg(),
    dimeh:()=>toggleDimehMode(),
    toom:()=>toggleToom(),
    alhass:()=>toggleAlhass(),
    raj:()=>toggleRajEasterEgg(),
    charlie:()=>toggleCharlieCursor(),
    capy:()=>toggleCapyMode(),
  };
  const run=actions[id];
  if(!run)return toast("Easter egg inconnu.","warning","warning");
  run();
}
async function adminPanelRunCommand(id){
  const actions={
    pc:()=>goToVersion("desktop"),
    tel:()=>goToVersion("mobile"),
    adminoeuf:()=>resetHiddenSecretEgg(),
    "ester-eggs":()=>toast("Une coquille murmure : cherche l'œuf caché sur le site.","info","click"),
    "reset-gallery":()=>resetGallery(),
    "reset-achievements":()=>resetAchievements(),
  };
  const run=actions[id];
  if(!run)return toast("Commande inconnue.","warning","warning");
  await run();
}
function adminPanelRunPassiveAmbience(id,variant=null){
  if(!livingIsDesktop())return toast("Les ambiances passives sont reservées au PC.","info","click");
  if(data?.settings?.passiveAmbience===false)return toast("Active d'abord les ambiances passives dans les options.","warning","warning");
  if(livingState.active)return toast("Événement vivant en cours : ambiance passive retardée pour éviter le chevauchement.","info","click");
  passiveStart(id,{manual:true,variant});
}
function passiveToggleAdmin(){
  data.settings.passiveAmbience=data.settings.passiveAmbience===false;
  if(data.settings.passiveAmbience===false)passiveStop({reschedule:false});
  else passiveSchedule();
  save();
  applySettings();
  livingRenderAdmin();
  toast(data.settings.passiveAmbience===false?"Ambiances passives désactivées.":"Ambiances passives activées.","info","click");
}
function passiveTestSoundAdmin(){
  if(data?.settings?.passiveAmbience===false)return toast("Active d'abord les ambiances passives.","warning","warning");
  if(livingState.active || passiveState.active)return toast("Un effet est déjà en cours, test sonore retardé.","info","click");
  passiveStart(null,{type:"sound",manual:true});
}
function livingStopAll(){
  livingStop({silent:true,schedule:false});
  passiveStop({reschedule:false});
  if(typeof ainaEnabled!=="undefined" && ainaEnabled)toggleAina();
  if(typeof toomEnabled!=="undefined" && toomEnabled)toggleToom();
  if(typeof alhassEnabled!=="undefined" && alhassEnabled)toggleAlhass();
  if(typeof charlieEnabled!=="undefined" && charlieEnabled)toggleCharlieCursor();
  if(typeof data!=="undefined" && data.ui?.capyMode)toggleCapyMode();
  if(typeof rajState!=="undefined" && rajState.active)stopRajEasterEgg({manual:true});
  if(typeof brakoState!=="undefined" && brakoState.active)stopBrakoEasterEgg({manual:true});
  if(typeof dimehMode!=="undefined" && dimehMode)toggleDimehMode();
  toast("Tous les événements de test ont été arrêtés.","info","click");
  livingRenderAdmin();
}
function livingRandomPoint(){
  const leftSide=Math.random()<.5;
  return {
    x:leftSide ? `${livingRandom(3,12)}vw` : `${livingRandom(84,92)}vw`,
    y:`${livingRandom(58,78)}vh`
  };
}
function livingRain(ev){
  const layer=livingLayer();
  layer.classList.add("live-dim");
  for(let i=0;i<54;i++)livingAdd(livingEl("live-drop","",{
    left:`${Math.random()*100}vw`,
    "--dur":`${livingRandom(800,1500)}ms`,
    "--delay":`${Math.random()*-1.6}s`
  }));
}
function livingWind(){
  for(let i=0;i<livingRandom(4,8);i++)livingAdd(livingEl("live-leaf","",{
    "--top":`${livingRandom(18,82)}vh`,
    "--dur":`${livingRandom(9000,14500)}ms`,
    "--delay":`${i*.25}s`
  }));
}
function livingHeat(){
  livingLayer().classList.add("live-heat");
  const orb=$(".pykur-orb")?.getBoundingClientRect();
  for(let i=0;i<4;i++){
    const drop=livingEl("live-actor","💧",{
      "--size":"34px",
      left:`${(orb?.left||220)+livingRandom(40,130)}px`,
      top:`${(orb?.top||130)+livingRandom(58,130)}px`,
      animation:"liveCollect 2.2s ease-in-out infinite alternate"
    });
    livingAdd(drop);
  }
}
function livingStorm(){
  livingLayer().classList.add("live-dim");
  livingRain();
  livingAdd(livingEl("live-lightning"));
}
function livingFog(){livingLayer().classList.add("live-fog")}
function livingNight(){livingLayer().classList.add("live-night")}
function livingSunray(){
  livingAdd(livingEl("live-sunray"));
  triggerPykurReaction("energy");
}
function livingKeph(){
  const tomb=livingEl("live-object","▰",{left:"7vw",top:"70vh","--size":"78px",color:"#6b7280"});
  const ghost=livingEl("live-actor","☁",{left:"7vw",top:"64vh","--size":"118px",color:"#e0f2fe"});
  livingAdd(tomb);
  livingAdd(ghost);
}
function livingShadow(){
  const side=Math.random()<.5 ? {left:"-8px"} : {right:"-8px"};
  livingAdd(livingEl("live-shadow","",{...side,top:`${livingRandom(18,48)}vh`,position:"absolute"}));
}
function livingButterfly(){livingAdd(livingEl("live-actor live-butterfly","✦",{"--size":"52px",left:"12vw",top:"58vh"}))}
function livingCorbac(){livingAdd(livingEl("live-actor","◆",{"--size":"74px",left:"-6vw",top:"18vh",animation:"liveLeafFly 5s linear forwards",color:"#111827"}))}
function livingChacha(){livingAdd(livingEl("live-actor","ᓚᘏᗢ",{"--size":"110px",left:"8vw",top:"72vh",fontSize:"38px",color:"#4a2b0c"}))}
function livingLarva(){livingAdd(livingEl("live-actor","●●●",{"--size":"88px",left:"4vw",top:"78vh",fontSize:"26px",color:"#8a5a22",animation:"liveWander 20s linear forwards"}))}
function livingTofu(){livingAdd(livingEl("live-actor","◇",{"--size":"78px",left:"-8vw",top:"70vh",color:"#facc15",animation:"liveLeafFly 3s linear forwards"}))}
function livingInteractive(symbol,extra={}){
  const point=livingRandomPoint();
  const el=livingEl("live-object live-clickable",symbol,{left:point.x,top:point.y,"--size":extra.size||"76px",fontSize:extra.fontSize||"",color:extra.color||""});
  livingAdd(el);
  return el;
}
function livingPoop(){
  const el=livingInteractive("♨",{color:"#6b3f18"});
  el.onclick=()=>{livingSound("warning");el.classList.add("collecting");setTimeout(()=>livingStop({silent:true,schedule:true}),520)};
}
function livingCoin(){
  const el=livingInteractive("●",{color:"#facc15"});
  el.style.textShadow="0 0 14px rgba(250,204,21,.9)";
  el.onclick=()=>{livingSound("success");el.classList.add("collecting");setTimeout(()=>livingStop({silent:true,schedule:true}),520)};
}
function livingFragment(){
  const el=livingInteractive("◆",{color:"#60a5fa"});
  el.onclick=()=>{livingSound("pp");triggerPykurReaction("energy");el.classList.add("collecting");setTimeout(()=>livingStop({silent:true,schedule:true}),620)};
}
function livingChest(){
  const el=livingInteractive("▣",{color:"#8b5a2b",size:"90px"});
  el.onclick=()=>{
    livingSound("unlock");
    for(let i=0;i<8;i++)livingAdd(livingEl("live-kama","",{left:el.style.left,top:el.style.top,"--dx":`${livingRandom(-60,70)}px`,"--dy":`${livingRandom(-80,20)}px`}));
    el.classList.add("collecting");
    setTimeout(()=>livingStop({silent:true,schedule:true}),950);
  };
}
function livingBottle(){
  const messages=[
    "Brako affirme avoir vu un Minotot voler.",
    "Raj prétend qu'il aurait gagné sans l'intervention de Brako.",
    "Le familier refuse de commenter cette découverte.",
    "Selon cette note, il suffirait de 3 Tynril pour atteindre 90 PP."
  ];
  const el=livingInteractive("◌",{color:"#93c5fd",size:"82px"});
  el.onclick=async()=>{
    el.classList.add("collecting");
    livingSound("click");
    await showDialog(messages[Math.floor(Math.random()*messages.length)],{title:"Message détrempé",okLabel:"Détruire"});
    livingStop({silent:true,schedule:true});
  };
}
function livingResonance(){
  livingStartResonanceSound();
  const orb=livingPykurRect();
  const cx=orb.left+orb.width*.5;
  const cy=orb.top+orb.height*.5;
  $(".pykur-orb")?.classList.add("live-resonating");
  $("#pykurImg")?.classList.add("live-resonating");

  const aura=livingEl("live-resonance-aura","",{
    left:`${orb.left-42}px`,
    top:`${orb.top-42}px`,
    width:`${orb.width+84}px`,
    height:`${orb.height+84}px`
  });
  livingAnchorToPykur(aura,{x:-42,y:-42,widthOffset:84,heightOffset:84});
  livingAdd(aura);
  triggerPykurReaction("energy");

  const addWave=({delay=0,strong=false}={})=>{
    const wave=livingEl("live-resonance-wave","",{
      left:`${orb.left-26}px`,
      top:`${orb.top-26}px`,
      width:`${orb.width+52}px`,
      height:`${orb.height+52}px`
    });
    wave.style.setProperty("--delay",`${delay}ms`);
    wave.style.setProperty("--dur",strong?"4400ms":"3600ms");
    if(strong)wave.style.borderColor="rgba(250,204,21,.62)";
    livingAnchorToPykur(wave,{x:-26,y:-26,widthOffset:52,heightOffset:52});
    livingAdd(wave);
  };
  [900,4300,8200,12600,16800,21200,25400,29400,32000].forEach((delay,index)=>addWave({delay,strong:index>=6}));

  for(let i=0;i<22;i++){
    const p=livingEl("live-resonance-particle orbit","",{
      left:`${cx}px`,
      top:`${cy}px`
    });
    livingAnchorToPykur(p,{xRatio:.5,yRatio:.5});
    p.style.setProperty("--size",`${livingRandom(5,10)}px`);
    p.style.setProperty("--radius",`${livingRandom(62,128)}px`);
    p.style.setProperty("--start",`${livingRandom(0,360)}deg`);
    p.style.setProperty("--turn",`${livingRandom(320,820)}deg`);
    p.style.setProperty("--dur",`${livingRandom(16000,34000)}ms`);
    p.style.setProperty("--delay",`${livingRandom(600,8200)}ms`);
    livingAdd(p);
  }

  for(let i=0;i<24;i++){
    const p=livingEl("live-resonance-particle absorb","",{
      left:`${cx}px`,
      top:`${cy}px`
    });
    livingAnchorToPykur(p,{xRatio:.5,yRatio:.5});
    p.style.setProperty("--size",`${livingRandom(4,9)}px`);
    p.style.setProperty("--sx",`${livingRandom(-240,240)}px`);
    p.style.setProperty("--sy",`${livingRandom(-180,190)}px`);
    p.style.setProperty("--dur",`${livingRandom(4200,7200)}ms`);
    p.style.setProperty("--delay",`${livingRandom(800,31000)}ms`);
    livingAdd(p);
  }

  const startPeak=()=>{
    if(livingState.current!=="resonance")return;
    $(".pykur-orb")?.classList.add("live-resonance-peak");
    $("#pykurImg")?.classList.add("live-resonance-peak");
    const flare=livingEl("live-resonance-peak-flare","",{
      left:`${orb.left-58}px`,
      top:`${orb.top-58}px`,
      width:`${orb.width+116}px`,
      height:`${orb.height+116}px`
    });
    livingAnchorToPykur(flare,{x:-58,y:-58,widthOffset:116,heightOffset:116});
    livingAdd(flare);
    for(let i=0;i<7;i++){
      addWave({delay:i*620,strong:true});
    }
    for(let i=0;i<18;i++){
      const burst=livingEl("live-resonance-particle absorb","",{
        left:`${cx}px`,
        top:`${cy}px`
      });
      livingAnchorToPykur(burst,{xRatio:.5,yRatio:.5});
      burst.style.setProperty("--size",`${livingRandom(6,12)}px`);
      burst.style.setProperty("--sx",`${livingRandom(-170,170)}px`);
      burst.style.setProperty("--sy",`${livingRandom(-150,150)}px`);
      burst.style.setProperty("--dur",`${livingRandom(1200,2600)}ms`);
      burst.style.setProperty("--delay",`${livingRandom(0,4300)}ms`);
      livingAdd(burst);
    }
    triggerPykurReaction("milestone");
  };

  const secondary=[
    "Une énergie ancienne semble traverser le familier.",
    "Le familier semble particulièrement concentré.",
    "Une étrange vibration parcourt le tracker."
  ];
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(startPeak,31000));
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="resonance")livingToast(secondary[Math.floor(Math.random()*secondary.length)],"info",null);
  },livingRandom(11500,18500)));
}
function livingAura(){
  const orb=$(".pykur-orb")?.getBoundingClientRect();
  for(let i=0;i<14;i++)livingAdd(livingEl("live-actor","✦",{
    "--size":"28px",
    left:`${(orb?.left||220)+livingRandom(-14,190)}px`,
    top:`${(orb?.top||130)+livingRandom(-12,190)}px`,
    color:i%2?"#facc15":"#60a5fa",
    animation:`liveButterfly ${livingRandom(6000,15000)}ms ease-in-out forwards`
  }));
}
function livingStar(){livingAdd(livingEl("live-star"))}
function livingSleepy(){livingAdd(livingEl("live-zzz","ZZZ"))}
function livingComet(){livingAdd(livingEl("live-comet"))}
function livingAwakening(){
  livingAdd(livingEl("live-pykur-glow"));
  triggerPykurReaction("milestone");
}
function livingFakeBug(){livingAdd(livingEl("live-fake-bug","Erreur 404 : Motivation introuvable."))}

const LIVE_ASSET_ROOT="./assets/images/evenement/";
const LIVE_ASSETS={
  rainSound:LIVE_ASSET_ROOT+"1. Pluie/pluie.mp3",
  leaves:[LIVE_ASSET_ROOT+"2. Vent/feuille1.png",LIVE_ASSET_ROOT+"2. Vent/feuille2.png",LIVE_ASSET_ROOT+"2. Vent/feuille3.png"],
  windSound:LIVE_ASSET_ROOT+"2. Vent/vent.mp3",
  sweat:LIVE_ASSET_ROOT+"3. Canicule/goute.png",
  heatSound:LIVE_ASSET_ROOT+"3. Canicule/canicule.mp3",
  thunderSound:LIVE_ASSET_ROOT+"4. Orage/tonnerre.mp3",
  sunray:LIVE_ASSET_ROOT+"7. Rayon de soleil/rayon.png.png",
  keph:LIVE_ASSET_ROOT+"9. Fantôme de Keph/fantome-keph.png",
  tomb:LIVE_ASSET_ROOT+"9. Fantôme de Keph/tombe.png",
  ghostSound:LIVE_ASSET_ROOT+"9. Fantôme de Keph/fantome.mp3",
  kephName:LIVE_ASSET_ROOT+"9. Fantôme de Keph/nametagkeph.png",
  shadow:LIVE_ASSET_ROOT+"10. Ombre mystérieuse/ombre.png",
  butterfly:LIVE_ASSET_ROOT+"11. Papillon doré/papillon.png",
  corbac:LIVE_ASSET_ROOT+"13. Corbac de passage/corbac.png",
  corbacSound:LIVE_ASSET_ROOT+"13. Corbac de passage/corbac.mp3",
  chacha:LIVE_ASSET_ROOT+"14. Chacha perdu/chacha.png",
  larva:LIVE_ASSET_ROOT+"15. Larve errante/larve.png",
  larvaEgg:LIVE_ASSET_ROOT+"15. Larve errante/oeuflarve.png",
  tofu:LIVE_ASSET_ROOT+"16. Tofu paniqué/tofu.png",
  poop:LIVE_ASSET_ROOT+"17. Crotte/crotte.png",
  poopSound:LIVE_ASSET_ROOT+"17. Crotte/pet.mp3",
  coin:LIVE_ASSET_ROOT+"18. Pièce oubliée/kamas.png",
  fragment:LIVE_ASSET_ROOT+"19. Fragment perdu/fragment.png",
  chest:LIVE_ASSET_ROOT+"20. Coffre abandonné/coffre.png",
  chestSound:LIVE_ASSET_ROOT+"20. Coffre abandonné/coffre.mp3",
  bottle:LIVE_ASSET_ROOT+"21. Bouteille à la mer/bouteille.png",
  energySound:LIVE_ASSET_ROOT+"22. Résonance du Pykur/energie.mp3",
  energyParticle:LIVE_ASSET_ROOT+"23. Aura instable/particule-energie.png",
  star:LIVE_ASSET_ROOT+"24. Étoile filante/etoile.png",
  starSound:LIVE_ASSET_ROOT+"24. Étoile filante/etoile.mp3",
  sleepyPykur:LIVE_ASSET_ROOT+"25. Pykur endormi/pykurz.png",
  zzz:LIVE_ASSET_ROOT+"25. Pykur endormi/zzz.png",
  yawnSound:LIVE_ASSET_ROOT+"25. Pykur endormi/baillement.mp3",
  eventAlert:LIVE_ASSET_ROOT+"alertevent.mp3",
  bouftouWool:"./assets/images/raj/loot/laine.png"
};

const PASSIVE_AMBIENCE_ROOT="./assets/ambiance/";
const PASSIVE_AMBIENCE_ASSETS={
  leafSounds:[PASSIVE_AMBIENCE_ROOT+"feuille1.mp3",PASSIVE_AMBIENCE_ROOT+"feuille2.mp3"],
  breeze:PASSIVE_AMBIENCE_ROOT+"vent-leger.mp3",
  feathers:[PASSIVE_AMBIENCE_ROOT+"plume1.png",PASSIVE_AMBIENCE_ROOT+"plume 2.png"],
  seed:PASSIVE_AMBIENCE_ROOT+"graine.png",
  birds:[PASSIVE_AMBIENCE_ROOT+"oiseau1.mp3",PASSIVE_AMBIENCE_ROOT+"oiseau2.mp3",PASSIVE_AMBIENCE_ROOT+"oiseau 3.mp3"],
  insects:[PASSIVE_AMBIENCE_ROOT+"insecte1.mp3",PASSIVE_AMBIENCE_ROOT+"insect2.mp3"],
  branch:PASSIVE_AMBIENCE_ROOT+"branche.mp3",
  drops:[PASSIVE_AMBIENCE_ROOT+"goute1.mp3",PASSIVE_AMBIENCE_ROOT+"goute2.mp3"]
};
const passiveState={
  active:false,current:null,currentType:null,
  timer:null,visualTimer:null,soundTimer:null,endTimer:null,endAt:0,
  visualCooldownUntil:0,soundCooldownUntil:0,
  visualQueue:[],soundQueue:[],audios:[]
};

function passiveLayer(){return $("#passiveAmbienceLayer")}
function passiveVisualCooldownMs(){return 120000+Math.floor(Math.random()*180000)}
function passiveSoundCooldownMs(){return 480000+Math.floor(Math.random()*420000)}
function passiveCanRun(){
  return !document.hidden && !performanceModeActive() && livingIsDesktop() && data?.settings?.passiveAmbience!==false;
}
function passiveShuffle(list){
  const copy=[...list];
  for(let i=copy.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [copy[i],copy[j]]=[copy[j],copy[i]];
  }
  return copy;
}
function passiveQueueFor(type){
  const key=type==="sound"?"soundQueue":"visualQueue";
  const source=PASSIVE_AMBIENCE_EVENTS.filter(item=>item.type===type);
  if(!passiveState[key].length)passiveState[key]=passiveShuffle(source.map(item=>item.id));
  return passiveState[key];
}
function passivePick(type){
  const queue=passiveQueueFor(type);
  return PASSIVE_AMBIENCE_EVENTS.find(item=>item.id===queue.shift());
}
function passiveScheduleVisual(delay=null){
  clearTimeout(passiveState.visualTimer);
  passiveState.visualTimer=null;
  if(!passiveCanRun())return;
  const wait=delay!==null?delay:passiveVisualCooldownMs();
  passiveState.visualCooldownUntil=Date.now()+wait;
  passiveState.visualTimer=setTimeout(()=>passiveStart(null,{type:"visual"}),wait);
}
function passiveScheduleSound(delay=null){
  clearTimeout(passiveState.soundTimer);
  passiveState.soundTimer=null;
  if(!passiveCanRun())return;
  const wait=delay!==null?delay:passiveSoundCooldownMs();
  passiveState.soundCooldownUntil=Date.now()+wait;
  passiveState.soundTimer=setTimeout(()=>passiveStart(null,{type:"sound"}),wait);
}
function passiveSchedule(delay=null){
  passiveScheduleVisual(delay);
  passiveScheduleSound(delay===null?null:delay+4000);
}
function passiveStop({reschedule=false,clearSchedules=true}={}){
  clearTimeout(passiveState.timer);
  if(clearSchedules){
    clearTimeout(passiveState.visualTimer);
    clearTimeout(passiveState.soundTimer);
    passiveState.visualTimer=null;
    passiveState.soundTimer=null;
  }
  clearTimeout(passiveState.endTimer);
  passiveState.timer=null;
  passiveState.endTimer=null;
  passiveState.active=false;
  passiveState.current=null;
  passiveState.currentType=null;
  passiveState.endAt=0;
  passiveState.audios.forEach(audio=>{
    try{audio.pause();audio.currentTime=0}catch(e){}
  });
  passiveState.audios=[];
  const layer=passiveLayer();
  if(layer)layer.innerHTML="";
  if(reschedule)passiveSchedule();
  livingRenderAdmin();
}
function passivePlay(srcs,volume=.08){
  if(!data?.settings?.sound)return null;
  passiveState.audios.forEach(audio=>{try{audio.pause();audio.currentTime=0}catch(e){}});
  passiveState.audios=[];
  const list=Array.isArray(srcs)?srcs:[srcs];
  const src=list[Math.floor(Math.random()*list.length)];
  if(!src)return null;
  const audio=new Audio(src);
  audio.volume=volume*soundVolumeRatio();
  audio.onerror=()=>console.warn("[Ambiance passive] Asset audio introuvable:",src);
  passiveState.audios.push(audio);
  audio.play().catch(()=>{});
  return audio;
}
function passiveAdd(el){
  const layer=passiveLayer();
  if(!layer)return null;
  layer.appendChild(el);
  return el;
}
function passiveStart(id=null,{type=null,manual=false,variant=null}={}){
  if(!passiveCanRun())return false;
  if(livingState.active){
    if(!manual)(type==="sound"?passiveScheduleSound(60000):passiveScheduleVisual(60000));
    return false;
  }
  if(passiveState.active){
    if(!manual)(type==="sound"?passiveScheduleSound(60000):passiveScheduleVisual(60000));
    return false;
  }
  const event=id
    ? PASSIVE_AMBIENCE_EVENTS.find(item=>item.id===id)
    : passivePick(type||"visual");
  if(!event)return false;
  passiveStop({reschedule:false,clearSchedules:false});
  passiveState.active=true;
  passiveState.current=event.id;
  passiveState.currentType=event.type;
  passiveState.endAt=Date.now()+event.duration;
  event.run(variant);
  passiveState.endTimer=setTimeout(()=>{
    passiveStop({reschedule:false,clearSchedules:false});
    if(event.type==="sound")passiveScheduleSound();
    else passiveScheduleVisual();
  },event.duration);
  livingRenderAdmin();
  return true;
}
function passiveLeaf(){
  const el=document.createElement("span");
  el.className="passive-leaf";
  const y=18+Math.random()*52;
  const fromLeft=Math.random()>.35;
  el.style.setProperty("--sx",fromLeft?"-8vw":"108vw");
  el.style.setProperty("--mx",fromLeft?`${28+Math.random()*34}vw`:`${66-Math.random()*34}vw`);
  el.style.setProperty("--ex",fromLeft?`${72+Math.random()*22}vw`:`${10-Math.random()*18}vw`);
  el.style.setProperty("--sy",`${y}vh`);
  el.style.setProperty("--wave",`${18+Math.random()*32}px`);
  el.style.setProperty("--drop",`${38+Math.random()*44}px`);
  el.style.setProperty("--dur",`${12000+Math.random()*4000}ms`);
  passiveAdd(el);
}
function passiveBreeze(){
  const count=9+Math.floor(Math.random()*6);
  for(let i=0;i<count;i++){
    const el=document.createElement("span");
    el.className="passive-breeze-particle";
    el.style.setProperty("--y",`${18+Math.random()*62}vh`);
    el.style.setProperty("--dy",`${(Math.random()-.5)*54}px`);
    el.style.setProperty("--w",`${78+Math.random()*100}px`);
    el.style.setProperty("--h",`${2+Math.random()*2}px`);
    el.style.setProperty("--dur",`${5600+Math.random()*2800}ms`);
    el.style.animationDelay=`${i*180}ms`;
    passiveAdd(el);
  }
}
function passiveFeather(){
  const el=document.createElement("img");
  el.className="passive-feather";
  el.alt="";
  el.src=PASSIVE_AMBIENCE_ASSETS.feathers[Math.floor(Math.random()*PASSIVE_AMBIENCE_ASSETS.feathers.length)];
  el.onerror=()=>console.warn("[Ambiance passive] Asset plume introuvable:",el.src);
  const y=20+Math.random()*56;
  el.style.setProperty("--sx","-8vw");
  el.style.setProperty("--mx",`${32+Math.random()*28}vw`);
  el.style.setProperty("--ex",`${76+Math.random()*20}vw`);
  el.style.setProperty("--sy",`${y}vh`);
  el.style.setProperty("--dur",`${14000+Math.random()*5000}ms`);
  passiveAdd(el);
}
function passiveSeed(){
  const el=document.createElement("img");
  el.className="passive-seed";
  el.alt="";
  el.src=PASSIVE_AMBIENCE_ASSETS.seed;
  el.onerror=()=>console.warn("[Ambiance passive] Asset graine introuvable:",el.src);
  const y=32+Math.random()*44;
  el.style.setProperty("--sx","-7vw");
  el.style.setProperty("--mx",`${36+Math.random()*30}vw`);
  el.style.setProperty("--ex",`${76+Math.random()*18}vw`);
  el.style.setProperty("--sy",`${y}vh`);
  el.style.setProperty("--dur",`${12000+Math.random()*4500}ms`);
  passiveAdd(el);
}
function passiveBird(){passivePlay(PASSIVE_AMBIENCE_ASSETS.birds,.075)}
function passiveInsects(){passivePlay(PASSIVE_AMBIENCE_ASSETS.insects,.052)}
function passiveBranch(){passivePlay(PASSIVE_AMBIENCE_ASSETS.branch,.07)}
function passiveDrops(){
  const count=8+Math.floor(Math.random()*6);
  for(let i=0;i<count;i++){
    const el=document.createElement("span");
    el.className="passive-drop";
    el.style.setProperty("--x",`${7+Math.random()*86}vw`);
    el.style.setProperty("--y",`${6+Math.random()*58}vh`);
    el.style.setProperty("--w",`${5+Math.random()*4}px`);
    el.style.setProperty("--h",`${14+Math.random()*10}px`);
    el.style.setProperty("--dur",`${1500+Math.random()*900}ms`);
    el.style.animationDelay=`${i*190}ms`;
    passiveAdd(el);
  }
}
function passiveDust(){
  const orb=$(".pykur-orb")?.getBoundingClientRect();
  const count=16+Math.floor(Math.random()*9);
  for(let i=0;i<count;i++){
    const el=document.createElement("span");
    el.className="passive-dust";
    const nearPykur=orb && Math.random()<.45;
    el.style.setProperty("--x",nearPykur?`${orb.left+Math.random()*orb.width}px`:`${8+Math.random()*84}vw`);
    el.style.setProperty("--y",nearPykur?`${orb.top+Math.random()*orb.height}px`:`${22+Math.random()*58}vh`);
    el.style.setProperty("--dx",`${(Math.random()-.5)*66}px`);
    el.style.setProperty("--dy",`${-22-Math.random()*64}px`);
    el.style.setProperty("--s",`${4+Math.random()*5}px`);
    el.style.setProperty("--dur",`${6200+Math.random()*4200}ms`);
    el.style.animationDelay=`${i*130}ms`;
    passiveAdd(el);
  }
}
function passiveLeafShadows(){
  for(let i=0;i<6;i++){
    const el=document.createElement("span");
    el.className="passive-leaf-shadow";
    el.style.setProperty("--sx",`${-18-Math.random()*18}vw`);
    el.style.setProperty("--ex",`${104+Math.random()*20}vw`);
    el.style.setProperty("--y",`${10+Math.random()*62}vh`);
    el.style.setProperty("--dy",`${(Math.random()-.5)*42}px`);
    el.style.setProperty("--w",`${105+Math.random()*110}px`);
    el.style.setProperty("--h",`${34+Math.random()*34}px`);
    el.style.setProperty("--r",`${-22+Math.random()*32}deg`);
    el.style.setProperty("--dur",`${9000+Math.random()*4500}ms`);
    el.style.animationDelay=`${i*520}ms`;
    passiveAdd(el);
  }
}
function passiveGlint(){
  const el=document.createElement("span");
  el.className="passive-glint";
  el.style.setProperty("--sx","-26vw");
  el.style.setProperty("--ex","108vw");
  el.style.setProperty("--y",`${28+Math.random()*38}vh`);
  el.style.setProperty("--rot",`${-18+Math.random()*12}deg`);
  passiveAdd(el);
}
function passiveMicroWind(){
  const count=8+Math.floor(Math.random()*5);
  for(let i=0;i<count;i++){
    const el=document.createElement("span");
    el.className="passive-breeze-particle";
    el.style.setProperty("--y",`${24+Math.random()*48}vh`);
    el.style.setProperty("--dy",`${(Math.random()-.5)*34}px`);
    el.style.setProperty("--w",`${68+Math.random()*86}px`);
    el.style.setProperty("--h",`${2+Math.random()*2}px`);
    el.style.setProperty("--dur",`${4100+Math.random()*2000}ms`);
    el.style.animationDelay=`${i*150}ms`;
    passiveAdd(el);
  }
}
function passivePykurBubble(text,orb,{x=.58,y=8,dur=4700}={}){
  const bubble=document.createElement("span");
  bubble.className="passive-pykur-bubble";
  bubble.textContent=text;
  bubble.style.setProperty("--x",`${orb.left+orb.width*x}px`);
  bubble.style.setProperty("--y",`${Math.max(12,orb.top+y)}px`);
  bubble.style.setProperty("--dur",`${dur}ms`);
  passiveAdd(bubble);
}
function passivePykurRing(orb){
  const ring=document.createElement("span");
  ring.className="passive-pykur-ring";
  const size=Math.max(96,Math.min(150,orb.width+34));
  ring.style.setProperty("--size",`${size}px`);
  ring.style.setProperty("--x",`${orb.left+(orb.width-size)/2}px`);
  ring.style.setProperty("--y",`${orb.top+(orb.height-size)/2}px`);
  passiveAdd(ring);
}
function passivePykurLife(variant=null){
  const orb=$(".pykur-orb")?.getBoundingClientRect();
  if(!orb)return;
  if($(".pykur-reacting,.live-pykur-sleeping-img,.live-pykur-tired-img"))return;
  const actions={
    curious:()=>{
      triggerPykurReaction("idle");
      passivePykurBubble("?",orb,{x:.62,y:12,dur:5000});
    },
    thinking:()=>{
      passivePykurBubble("...",orb,{x:.56,y:16,dur:5400});
    },
    surprise:()=>{
      triggerPykurReaction("happy");
      passivePykurBubble("!",orb,{x:.64,y:12,dur:4300});
    },
    sleepy:()=>{
      passivePykurBubble("z",orb,{x:.60,y:10,dur:5600});
    },
    magic:()=>{
      triggerPykurReaction("milestone");
      passivePykurRing(orb);
    }
  };
  const keys=Object.keys(actions);
  const key=actions[variant] ? variant : keys[Math.floor(Math.random()*keys.length)];
  actions[key]();
}
const PASSIVE_AMBIENCE_EVENTS=[
  {id:"dust",label:"Poussières lumineuses",type:"visual",duration:9000,run:passiveDust},
  {id:"leafShadows",label:"Ombres de feuilles",type:"visual",duration:12000,run:passiveLeafShadows},
  {id:"glint",label:"Reflet doux",type:"visual",duration:5200,run:passiveGlint},
  {id:"microWind",label:"Micro souffle de vent",type:"visual",duration:6200,run:passiveMicroWind},
  {id:"pykurLife",label:"Vie du familier",type:"visual",duration:5600,run:passivePykurLife,variants:[
    {id:"curious",label:"Pykur ?"},
    {id:"thinking",label:"Pykur ..."},
    {id:"surprise",label:"Pykur !"},
    {id:"sleepy",label:"Pykur z"},
    {id:"magic",label:"Anneau Pykur"}
  ]},
  {id:"leaf",label:"Feuille portée",type:"visual",duration:17000,run:passiveLeaf},
  {id:"breeze",label:"Petite brise",type:"visual",duration:9500,run:passiveBreeze},
  {id:"feather",label:"Plume errante",type:"visual",duration:19000,run:passiveFeather},
  {id:"seed",label:"Graine portée par le vent",type:"visual",duration:17000,run:passiveSeed},
  {id:"drops",label:"Gouttes isolées",type:"visual",duration:4500,run:passiveDrops},
  {id:"bird",label:"Oiseaux lointains",type:"sound",duration:6500,run:passiveBird},
  {id:"insects",label:"Insectes",type:"sound",duration:7000,run:passiveInsects},
  {id:"branch",label:"Branche qui craque",type:"sound",duration:4500,run:passiveBranch},
  {id:"leafSound",label:"Feuille sonore",type:"sound",duration:4500,run:()=>passivePlay(PASSIVE_AMBIENCE_ASSETS.leafSounds,.06)},
  {id:"breezeSound",label:"Vent léger sonore",type:"sound",duration:6500,run:()=>passivePlay(PASSIVE_AMBIENCE_ASSETS.breeze,.055)},
  {id:"dropSound",label:"Gouttes sonores",type:"sound",duration:4500,run:()=>passivePlay(PASSIVE_AMBIENCE_ASSETS.drops,.055)}
];

LIVING_EVENT_DEFS.splice(0,LIVING_EVENT_DEFS.length,
  {id:"rain",label:"Pluie",message:"Une pluie légère commence à tomber.",endMessage:"La pluie s'est arrêtée.",duration:20000,sound:LIVE_ASSETS.rainSound,run:livingRain},
  {id:"wind",label:"Vent",message:"Une bourrasque traverse la région.",endMessage:"Le vent retombe.",duration:13000,sound:LIVE_ASSETS.windSound,run:livingWind},
  {id:"heat",label:"Canicule",message:"L'air devient étouffant.",endMessage:"L'air redevient respirable.",duration:15000,sound:null,run:livingHeat},
  {id:"storm",label:"Orage",message:"Le ciel gronde au loin.",endMessage:"Le ciel retrouve son calme.",duration:10000,sound:LIVE_ASSETS.thunderSound,run:livingStorm},
  {id:"fog",label:"Brouillard",message:"Un brouillard étrange recouvre les environs.",endMessage:"Le brouillard se dissipe.",duration:23000,sound:null,run:livingFog},
  {id:"nightfall",label:"Nuit tombante",message:"Les ombres s'allongent.",endMessage:"Les premières lueurs réapparaissent.",duration:20000,sound:null,run:livingNight},
  {id:"sunray",label:"Rayon de soleil",message:"Une éclaircie perce les nuages.",endMessage:"Le rayon de soleil disparaît doucement.",duration:14000,sound:null,run:livingSunray},
  {id:"keph",label:"Fantôme de Keph",message:"Une présence familière traverse les lieux...",endMessage:"Keph retourne dans sa tombe.",duration:46000,sound:null,run:livingKeph},
{id:"shadow",label:"Ombre mystérieuse",message:"Quelqu'un semblait observer le tracker.",endMessage:"L'ombre s'est dissipée.",duration:22000,sound:null,run:livingShadow},
  {id:"butterfly",label:"Papillon doré",message:"Un papillon lumineux apparaît brièvement.",endMessage:"Le papillon doré s'éloigne.",duration:22000,sound:null,run:livingButterfly},
  {id:"corbac",label:"Corbac de passage",message:"Un corbac traverse le ciel.",endMessage:"Le corbac disparaît à l'horizon.",duration:6200,sound:null,run:livingCorbac},
  {id:"chacha",label:"Chacha perdu",message:"Un Chacha semble chercher son chemin.",endMessage:"Le Chacha repart avec sa trouvaille.",duration:19000,sound:null,run:livingChacha},
  {id:"larva",label:"Larve errante",message:"Une larve traverse discrètement la zone.",endMessage:"La larve poursuit sa route.",duration:26000,sound:null,run:livingLarva},
  {id:"tofu",label:"Tofu paniqué",message:"Un Tofu passe en courant.",endMessage:"Le Tofu reprend sa fuite.",duration:11200,sound:null,run:livingTofu},
  {id:"poop",label:"Crotte",message:"Quelqu'un a laissé une surprise.",duration:120000,sound:null,interactive:true,run:livingPoop},
  {id:"coin",label:"Pièce oubliée",message:"Quelque chose brille dans un coin.",duration:120000,sound:null,interactive:true,run:livingCoin},
  {id:"fragment",label:"Fragment perdu",message:"Un fragment de prospection semble avoir été abandonné.",duration:120000,sound:null,interactive:true,run:livingFragment},
  {id:"chest",label:"Coffre abandonné",message:"Un vieux coffre est apparu.",duration:120000,sound:null,interactive:true,run:livingChest},
  {id:"bottle",label:"Bouteille à la mer",message:"Une étrange bouteille s'est échouée.",duration:120000,sound:null,interactive:true,run:livingBottle},
  {id:"resonance",label:"Résonance du familier",message:"Le familier réagit étrangement.",endMessage:"Le calme revient autour du familier.",duration:38000,sound:null,run:livingResonance},
  {id:"unstableAura",label:"Aura instable",message:"Une énergie inhabituelle se manifeste.",endMessage:"L'énergie du familier se stabilise.",duration:15000,sound:null,run:livingAura},
  {id:"shootingStar",label:"Étoile filante",message:"Un éclat traverse le ciel.",endMessage:"L'éclat disparaît à l'horizon.",duration:5400,sound:LIVE_ASSETS.starSound,run:livingStar},
  {id:"sleepy",label:"Familier endormi",message:"Le familier semble fatigué.",endMessage:"Le familier se réveille doucement.",duration:17000,sound:LIVE_ASSETS.yawnSound,run:livingSleepy},
  {id:"comet",label:"Comète",message:"Un présage traverse le ciel.",duration:4000,sound:LIVE_ASSETS.starSound,legendary:true,run:livingComet},
  {id:"awakening",label:"Éveil spontané",message:"Le familier libère une énergie ancienne.",duration:8000,sound:LIVE_ASSETS.energySound,legendary:true,run:livingAwakening},
  {id:"fakeBug",label:"Faux bug",message:"Erreur 404 : Motivation introuvable.",duration:2000,sound:"error",legendary:true,run:livingFakeBug}
);

function livingSound(key){
  if(!data?.settings?.sound)return;
  if(!key)return;
  if(typeof key==="string" && (key.startsWith("./") || key.includes("/"))){
    const audio=new Audio(key);
    audio.volume=.25*soundVolumeRatio();
    audio.play().catch(err=>console.warn("[Evenements vivants] Son indisponible",key,err));
    return;
  }
  const sound=sounds[key]||sounds.click;
  if(!sound){playSound(key||"click");return}
  const previous=sound.volume;
  sound.volume=.24*soundVolumeRatio();
  sound.currentTime=0;
  sound.play().catch(()=>{}).finally(()=>{sound.volume=previous});
}
function livingStopHeatSound(){
  const audio=livingState.heatAudio;
  if(audio){
    audio.onended=null;
    try{audio.pause();audio.currentTime=0}catch(e){}
  }
  livingState.heatAudio=null;
  livingState.heatAudioPlays=0;
}
function livingStopKephSound(){
  const audio=livingState.kephAudio;
  if(audio){
    audio.onended=null;
    try{audio.pause();audio.currentTime=0}catch(e){}
  }
  livingState.kephAudio=null;
}
function livingStopResonanceSound(){
  const audio=livingState.resonanceAudio;
  if(audio){
    audio.onended=null;
    try{audio.pause();audio.currentTime=0}catch(e){}
  }
  livingState.resonanceAudio=null;
}
function livingStartKephSound(){
  livingStopKephSound();
  if(!data?.settings?.sound)return;
  const audio=new Audio(LIVE_ASSETS.ghostSound);
  livingState.kephAudio=audio;
  audio.loop=true;
  audio.volume=.22*soundVolumeRatio();
  audio.play().catch(err=>console.warn("[Evenements vivants] Son Keph indisponible",err));
}
function livingStartResonanceSound(){
  livingStopResonanceSound();
  if(!data?.settings?.sound)return;
  const audio=new Audio(LIVE_ASSETS.energySound);
  livingState.resonanceAudio=audio;
  audio.loop=true;
  audio.volume=.22*soundVolumeRatio();
  audio.play().catch(err=>console.warn("[Evenements vivants] Son résonance indisponible",err));
}
function livingRestoreSleepyImage(){
  const img=$("#pykurImg");
  if(img && livingState.sleepyOriginalSrc){
    img.src=livingState.sleepyOriginalSrc;
    if(livingState.sleepyOriginalAlt!==null)img.alt=livingState.sleepyOriginalAlt;
  }
  livingState.sleepyOriginalSrc=null;
  livingState.sleepyOriginalAlt=null;
}
function livingStartHeatSound(){
  livingStopHeatSound();
  if(!data?.settings?.sound)return;
  const audio=new Audio(LIVE_ASSETS.heatSound);
  livingState.heatAudio=audio;
  livingState.heatAudioPlays=0;
  audio.volume=.25*soundVolumeRatio();
  const playOnce=()=>{
    if(livingState.current!=="heat" || livingState.heatAudio!==audio || livingState.heatAudioPlays>=2)return;
    livingState.heatAudioPlays++;
    audio.currentTime=0;
    audio.play().catch(err=>console.warn("[Evenements vivants] Son canicule indisponible",err));
  };
  audio.onended=()=>playOnce();
  playOnce();
}
function livingTestSounds(){
  const keys=[...new Set(LIVING_EVENT_DEFS.map(ev=>ev.sound).filter(Boolean))];
  if(!keys.length)return toast("Aucun son d'événement à tester.","info","click");
  if(!data?.settings?.sound)return toast("Active le son global pour tester les sons.","warning","warning");
  (livingState.soundTimers||[]).forEach(clearTimeout);
  livingState.soundTimers=[];
  keys.slice(0,10).forEach((key,index)=>{
    livingState.soundTimers.push(setTimeout(()=>livingSound(key),index*850));
  });
  toast("Test des sons d'événements lancé.","info","click");
}
function livingImg(src,className,style={},alt=""){
  const img=document.createElement("img");
  img.className=`live-scene-img ${className||""}`.trim();
  img.src=src;
  img.alt=alt;
  Object.assign(img.style,style);
  img.onerror=()=>{
    console.warn("[Evenements vivants] Asset introuvable, evenement ignore:",src);
    img.remove();
  };
  return img;
}
function livingPykurRect(){return $(".pykur-orb")?.getBoundingClientRect() || $("#pykurImg")?.getBoundingClientRect() || {left:220,top:130,width:150,height:150}}
window.addEventListener("scroll",livingRequestPykurAnchorUpdate,{passive:true});
window.addEventListener("resize",livingRequestPykurAnchorUpdate,{passive:true});
function livingSidePoint(){
  const leftSide=Math.random()<.5;
  return {x:leftSide?`${livingRandom(4,12)}vw`:`${livingRandom(84,91)}vw`,y:`${livingRandom(60,78)}vh`};
}
function livingRandomPoint(){return livingSidePoint()}
function livingRain(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-rain-mode");
  livingAdd(livingEl("live-rain-mist"));
  const sheet=livingEl("live-rain-sheet");
  const width=Math.max(window.innerWidth||1200,900);
  const baseCount=Math.round(width/10);
  const count=Math.max(85,Math.min(145,baseCount));
  for(let i=0;i<count;i++){
    const x=Math.random()*100;
    const isCentral=x>28 && x<76;
    if(isCentral && Math.random()<.34)continue;
    const drop=livingEl("live-rain-line","",{left:`${x}vw`});
    drop.style.setProperty("--top",`${livingRandom(-30,-6)}vh`);
    drop.style.setProperty("--h",`${livingRandom(20,38)}px`);
    drop.style.setProperty("--dur",`${livingRandom(850,1550)}ms`);
    drop.style.setProperty("--delay",`${Math.random()*-2.8}s`);
    drop.style.setProperty("--drift",`${livingRandom(32,62)}px`);
    drop.style.setProperty("--alpha",`${isCentral?Math.random()*.12+.36:Math.random()*.18+.52}`);
    drop.style.setProperty("--o",`${isCentral?Math.random()*.16+.38:Math.random()*.22+.56}`);
    sheet.appendChild(drop);
  }
  livingAdd(sheet);
}
function livingWind(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-wind-mode");
  const sheet=livingEl("live-wind-sheet");
  const width=Math.max(window.innerWidth||1200,900);
  const streakCount=Math.max(34,Math.min(72,Math.round(width/24)));
  for(let i=0;i<streakCount;i++){
    const streak=livingEl("live-wind-streak");
    streak.style.setProperty("--top",`${livingRandom(10,82)}vh`);
    streak.style.setProperty("--w",`${livingRandom(70,220)}px`);
    streak.style.setProperty("--h",`${Math.random()<.52?2:3}px`);
    streak.style.setProperty("--dur",`${livingRandom(1500,3300)}ms`);
    streak.style.setProperty("--delay",`${Math.random()*3.2}s`);
    streak.style.setProperty("--wave",`${livingRandom(-22,24)}px`);
    streak.style.setProperty("--out",`${livingRandom(-20,22)}px`);
    streak.style.setProperty("--alpha",`${Math.random()*.18+.28}`);
    streak.style.setProperty("--o",`${Math.random()*.20+.30}`);
    sheet.appendChild(streak);
  }
  livingAdd(sheet);
  const count=livingRandom(4,8);
  for(let i=0;i<count;i++)livingAdd(livingImg(LIVE_ASSETS.leaves[i%LIVE_ASSETS.leaves.length],"live-wind-leaf",{
    "--w":`${livingRandom(38,62)}px`,left:"-8vw",top:`${livingRandom(16,74)}vh`,"--dur":`${livingRandom(9000,14500)}ms`,"--delay":`${1.2+i*.55}s`,"--mid":`${livingRandom(-48,58)}px`,"--end":`${livingRandom(-44,54)}px`,"--out":`${livingRandom(-38,42)}px`
  },"Feuille"));
}
function livingHeat(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-heat");
  livingStartHeatSound();
  const haze=livingEl("live-heat-haze");
  for(let i=0;i<4;i++){
    const wave=livingEl("live-heat-wave");
    wave.style.top=`${livingRandom(18,78)}vh`;
    wave.style.setProperty("--dur",`${livingRandom(4200,6800)}ms`);
    wave.style.setProperty("--delay",`${i*.55}s`);
    wave.style.setProperty("--rise",`${livingRandom(-14,10)}px`);
    haze.appendChild(wave);
  }
  livingAdd(haze);
  const orb=livingPykurRect();
  const drop=livingImg(LIVE_ASSETS.sweat,"live-heat-drop",{
    "--w":"30px",
    left:`${orb.left+orb.width*.64}px`,
    top:`${orb.top+orb.height*.26}px`,
    "--delay":".35s"
  },"Goutte de sueur");
  livingAnchorToPykur(drop,{xRatio:.64,yRatio:.26});
  livingAdd(drop);
}
function livingStorm(){
  livingLayer().classList.add("live-dim");
  livingRain();
  livingAdd(livingEl("live-storm-flash"));
}
function livingFog(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-fog-mode");
  $(".pykur-orb")?.classList.add("pykur-fogged");
  $("#pykurImg")?.classList.add("pykur-fogged");
  livingAdd(livingEl("live-fog-veil"));
  const configs=[
    {top:"7vh",h:"34vh",dur:"24000ms",o:".58",from:"-24vw",mid:"-3vw",to:"18vw",blur:"22px",a:".22",b:".095",d:".16",e:".060"},
    {top:"34vh",h:"30vh",dur:"25500ms",o:".42",from:"18vw",mid:"2vw",to:"-20vw",blur:"20px",a:".18",b:".075",d:".13",e:".050"},
    {top:"63vh",h:"25vh",dur:"22000ms",o:".34",from:"-16vw",mid:"5vw",to:"22vw",blur:"18px",a:".15",b:".060",d:".10",e:".045"}
  ];
  configs.forEach((cfg,i)=>{
    const fog=livingEl("live-fog-band");
    fog.style.top=cfg.top;
    fog.style.setProperty("--h",cfg.h);
    fog.style.setProperty("--dur",cfg.dur);
    fog.style.setProperty("--delay",`${i*.35}s`);
    fog.style.setProperty("--o",cfg.o);
    fog.style.setProperty("--from",cfg.from);
    fog.style.setProperty("--mid",cfg.mid);
    fog.style.setProperty("--to",cfg.to);
    fog.style.setProperty("--blur",cfg.blur);
    fog.style.setProperty("--a",cfg.a);
    fog.style.setProperty("--b",cfg.b);
    fog.style.setProperty("--c",i===0?".082":".060");
    fog.style.setProperty("--d",cfg.d);
    fog.style.setProperty("--e",cfg.e);
    fog.style.setProperty("--y0",`${livingRandom(-8,8)}px`);
    fog.style.setProperty("--y1",`${livingRandom(-18,14)}px`);
    fog.style.setProperty("--y2",`${livingRandom(-10,16)}px`);
    livingAdd(fog);
  });
  for(let i=0;i<7;i++){
    const wisp=livingEl("live-fog-wisp");
    const side=i%2===0;
    wisp.style.left=side?`${livingRandom(-12,16)}vw`:`${livingRandom(58,98)}vw`;
    wisp.style.top=`${livingRandom(12,78)}vh`;
    wisp.style.setProperty("--w",`${livingRandom(18,36)}vw`);
    wisp.style.setProperty("--h",`${livingRandom(8,16)}vh`);
    wisp.style.setProperty("--dur",`${livingRandom(14500,23000)}ms`);
    wisp.style.setProperty("--delay",`${livingRandom(0,2600)}ms`);
    wisp.style.setProperty("--o",`${Math.random()*.18+.28}`);
    wisp.style.setProperty("--a",`${Math.random()*.08+.16}`);
    wisp.style.setProperty("--b",`${Math.random()*.05+.055}`);
    wisp.style.setProperty("--blur",`${livingRandom(10,18)}px`);
    wisp.style.setProperty("--from",side?"-12vw":"10vw");
    wisp.style.setProperty("--mid",side?"6vw":"-6vw");
    wisp.style.setProperty("--to",side?"22vw":"-20vw");
    wisp.style.setProperty("--wave",`${livingRandom(-24,18)}px`);
    wisp.style.setProperty("--out",`${livingRandom(-16,18)}px`);
    livingAdd(wisp);
  }
}
function livingNight(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-night-mode");
  $(".pykur-orb")?.classList.add("pykur-night-glow");
  $("#pykurImg")?.classList.add("pykur-night-glow");
  livingAdd(livingEl("live-night-glaze"));
  const w=window.innerWidth||1200;
  const starCount=Math.max(5,Math.min(12,Math.round(w/150)));
  const starZones=[
    ()=>({left:`${livingRandom(3,18)}vw`,top:`${livingRandom(6,34)}vh`}),
    ()=>({left:`${livingRandom(82,96)}vw`,top:`${livingRandom(7,36)}vh`}),
    ()=>({left:`${livingRandom(2,12)}vw`,top:`${livingRandom(38,70)}vh`}),
    ()=>({left:`${livingRandom(88,97)}vw`,top:`${livingRandom(38,72)}vh`})
  ];
  for(let i=0;i<starCount;i++){
    const pos=starZones[i%starZones.length]();
    const star=livingEl("live-night-star","",pos);
    star.style.setProperty("--s",`${livingRandom(2,5)}px`);
    star.style.setProperty("--dur",`${livingRandom(2200,5200)}ms`);
    star.style.setProperty("--delay",`${Math.random()*2.6}s`);
    star.style.setProperty("--o",`${Math.random()*.34+.52}`);
    livingAdd(star);
  }
  const fireflyCount=livingRandom(3,6);
  for(let i=0;i<fireflyCount;i++){
    const side=i%2===0;
    const fly=livingEl("live-firefly","",{
      left:side?`${livingRandom(5,22)}vw`:`${livingRandom(78,93)}vw`,
      top:`${livingRandom(66,84)}vh`
    });
    fly.style.setProperty("--s",`${livingRandom(5,8)}px`);
    fly.style.setProperty("--dur",`${livingRandom(8000,15000)}ms`);
    fly.style.setProperty("--delay",`${Math.random()*2.4}s`);
    fly.style.setProperty("--o",`${Math.random()*.28+.50}`);
    fly.style.setProperty("--x1",`${livingRandom(-18,26)}px`);
    fly.style.setProperty("--y1",`${livingRandom(-24,-8)}px`);
    fly.style.setProperty("--x2",`${livingRandom(-28,22)}px`);
    fly.style.setProperty("--y2",`${livingRandom(-8,18)}px`);
    fly.style.setProperty("--x3",`${livingRandom(-20,30)}px`);
    fly.style.setProperty("--y3",`${livingRandom(-28,-10)}px`);
    livingAdd(fly);
  }
}
function livingSunray(){
  const layer=livingLayer();
  if(!layer)return;
  layer.classList.add("live-sunray-mode");
  $(".pykur-orb")?.classList.add("pykur-sunray-glow");
  $("#pykurImg")?.classList.add("pykur-sunray-glow");
  const beams=[
    {x:"10vw",w:"34vw",rot:"15deg",o:".74",from:"-18vw",mid:"10vw",to:"28vw",blur:"12px",a:".48"},
    {x:"42vw",w:"28vw",rot:"18deg",o:".52",from:"-8vw",mid:"8vw",to:"20vw",blur:"15px",a:".32"}
  ];
  beams.forEach((cfg,i)=>{
    const beam=livingEl("live-sunray-beam");
    beam.style.setProperty("--x",cfg.x);
    beam.style.setProperty("--w",cfg.w);
    beam.style.setProperty("--rot",cfg.rot);
    beam.style.setProperty("--o",cfg.o);
    beam.style.setProperty("--from",cfg.from);
    beam.style.setProperty("--mid",cfg.mid);
    beam.style.setProperty("--to",cfg.to);
    beam.style.setProperty("--blur",cfg.blur);
    beam.style.setProperty("--a",cfg.a);
    beam.style.animationDelay=`${i*.35}s`;
    livingAdd(beam);
  });
  triggerPykurReaction("energy");
  const orb=livingPykurRect();
  for(let i=0;i<12;i++){
    const offsetX=livingRandom(-20,Math.max(60,orb.width+100));
    const offsetY=livingRandom(-18,Math.max(60,orb.height+80));
    const dust=livingEl("live-sunray-dust","",{
      left:`${orb.left+offsetX}px`,
      top:`${orb.top+offsetY}px`
    });
    livingAnchorToPykur(dust,{x:offsetX,y:offsetY});
    dust.style.setProperty("--s",`${livingRandom(2,5)}px`);
    dust.style.setProperty("--dur",`${livingRandom(5200,9800)}ms`);
    dust.style.setProperty("--delay",`${Math.random()*2.5}s`);
    dust.style.setProperty("--o",`${Math.random()*.28+.46}`);
    dust.style.setProperty("--dx",`${livingRandom(-28,32)}px`);
    dust.style.setProperty("--dy",`${livingRandom(-52,-18)}px`);
    livingAdd(dust);
  }
}
function livingKeph(){
  livingStartKephSound();
  livingAdd(livingImg(LIVE_ASSETS.tomb,"live-keph-tomb",{"--w":"106px",left:"6.6vw",top:"70vh"},"Tombe"));
  const unit=livingEl("live-keph-unit");
  const ghost=livingImg(LIVE_ASSETS.keph,"live-keph-ghost",{},"Fantome de Keph");
  const name=livingImg(LIVE_ASSETS.kephName,"live-keph-name",{},"Keph");
  unit.appendChild(ghost);
  unit.appendChild(name);
  livingAdd(unit);
}
function livingShadow(){
  const right=Math.random()<.5;
  const secondRight=!right;
  const shadow=livingImg(LIVE_ASSETS.shadow,"live-shadow-img",{
    left:right?"auto":"-250px",
    right:right?"-250px":"auto",
    top:`${livingRandom(18,44)}vh`,
    opacity:".88",
    filter:"drop-shadow(0 18px 32px rgba(0,0,0,.42)) drop-shadow(0 0 28px rgba(0,0,0,.30))"
  },"Ombre");
  shadow.style.setProperty("--w","clamp(920px,78vw,1320px)");
  shadow.style.setProperty("--enter",right?"410px":"-410px");
  shadow.style.setProperty("--peek",right?"168px":"-168px");
  shadow.style.setProperty("--watch",right?"98px":"-98px");
  shadow.style.setProperty("--exit",right?"460px":"-460px");
  shadow.style.setProperty("--x2",secondRight?"auto":"-250px");
  shadow.style.setProperty("--r2",secondRight?"-250px":"auto");
  shadow.style.setProperty("--y2",`${livingRandom(14,42)}vh`);
  shadow.style.setProperty("--enter2",secondRight?"410px":"-410px");
  shadow.style.setProperty("--peek2",secondRight?"168px":"-168px");
  shadow.style.setProperty("--watch2",secondRight?"98px":"-98px");
  shadow.style.setProperty("--exit2",secondRight?"460px":"-460px");
  livingAdd(shadow);
}
function livingButterflyTargetSelectors(){
  return [
    "#plus",
    "#minus",
    "#optionsButton",
    "#projectionButton",
    "#monsterLauncher",
    ".pykur-orb",
    ".progress-title"
  ];
}
function livingButterflyPointFromElement(el,fallback){
  const rect=el?.getBoundingClientRect?.();
  if(!rect || rect.width<=0 || rect.height<=0)return fallback;
  const x=Math.max(36,Math.min(window.innerWidth-120,rect.left+rect.width*.5+livingRandom(-28,28)));
  const y=Math.max(52,Math.min(window.innerHeight-120,rect.top+rect.height*.25+livingRandom(-26,18)));
  return {x,y};
}
function livingButterfly(){
  const selectors=livingButterflyTargetSelectors()
    .map(selector=>document.querySelector(selector))
    .filter(Boolean)
    .sort(()=>Math.random()-.5);
  const fallback=[
    {x:window.innerWidth*.34,y:window.innerHeight*.38},
    {x:window.innerWidth*.56,y:window.innerHeight*.52},
    {x:window.innerWidth*.72,y:window.innerHeight*.35},
  ];
  const nectar=[
    livingButterflyPointFromElement(selectors[0],fallback[0]),
    livingButterflyPointFromElement(selectors[1],fallback[1]),
    livingButterflyPointFromElement(selectors[2],fallback[2]),
  ];
  const startY=livingRandom(22,62);
  const butterfly=livingImg(LIVE_ASSETS.butterfly,"live-butterfly-img",{
    left:"0",
    top:"0"
  },"Papillon dore");
  butterfly.style.setProperty("--w","clamp(72px,5.2vw,96px)");
  butterfly.style.setProperty("--start-x","-10vw");
  butterfly.style.setProperty("--start-y",`${startY}vh`);
  butterfly.style.setProperty("--p1-x",`${livingRandom(10,22)}vw`);
  butterfly.style.setProperty("--p1-y",`${livingRandom(18,48)}vh`);
  butterfly.style.setProperty("--p2-x",`${livingRandom(20,34)}vw`);
  butterfly.style.setProperty("--p2-y",`${livingRandom(24,62)}vh`);
  butterfly.style.setProperty("--nectar1-x",`${nectar[0].x}px`);
  butterfly.style.setProperty("--nectar1-y",`${nectar[0].y}px`);
  butterfly.style.setProperty("--p3-x",`${livingRandom(42,56)}vw`);
  butterfly.style.setProperty("--p3-y",`${livingRandom(16,50)}vh`);
  butterfly.style.setProperty("--nectar2-x",`${nectar[1].x}px`);
  butterfly.style.setProperty("--nectar2-y",`${nectar[1].y}px`);
  butterfly.style.setProperty("--p4-x",`${livingRandom(62,76)}vw`);
  butterfly.style.setProperty("--p4-y",`${livingRandom(22,58)}vh`);
  butterfly.style.setProperty("--nectar3-x",`${nectar[2].x}px`);
  butterfly.style.setProperty("--nectar3-y",`${nectar[2].y}px`);
  butterfly.style.setProperty("--end-x","112vw");
  butterfly.style.setProperty("--end-y",`${livingRandom(16,54)}vh`);
  livingAdd(butterfly);
  const dustPoints=[...nectar,{x:window.innerWidth*.46,y:window.innerHeight*.32},{x:window.innerWidth*.66,y:window.innerHeight*.48}];
  dustPoints.forEach((point,index)=>{
    for(let i=0;i<4;i++){
      const dust=livingEl("live-butterfly-dust","",{
        left:`${point.x+livingRandom(-20,26)}px`,
        top:`${point.y+livingRandom(-18,18)}px`,
        animationDelay:`${3.5+index*3.7+i*.28}s`
      });
      dust.style.setProperty("--dx",`${livingRandom(-26,28)}px`);
      dust.style.setProperty("--dy",`${livingRandom(-42,-16)}px`);
      dust.style.setProperty("--dur",`${livingRandom(1800,3200)}ms`);
      livingAdd(dust);
    }
  });
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="butterfly")livingToast("Le papillon doré semble attiré par l'énergie du tracker.","info",null);
  },livingRandom(6200,9200)));
}
function livingCorbac(){
  const entryY=livingRandom(8,18);
  const bird=livingImg(LIVE_ASSETS.corbac,"live-corbac-img",{
    left:"0",
    top:"0"
  },"Corbac");
  bird.style.setProperty("--w","clamp(92px,7vw,126px)");
  bird.style.setProperty("--dur","6200ms");
  bird.style.setProperty("--start-x","-14vw");
  bird.style.setProperty("--start-y",`${entryY+livingRandom(-2,4)}vh`);
  bird.style.setProperty("--entry-y",`${entryY}vh`);
  bird.style.setProperty("--mid1-y",`${entryY+livingRandom(-5,2)}vh`);
  bird.style.setProperty("--mid2-y",`${entryY+livingRandom(2,9)}vh`);
  bird.style.setProperty("--mid3-y",`${entryY+livingRandom(-3,5)}vh`);
  bird.style.setProperty("--end-y",`${entryY+livingRandom(1,8)}vh`);
  livingAdd(bird);
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="corbac")livingSound(LIVE_ASSETS.corbacSound);
  },560));
  const featherCount=livingRandom(4,7);
  for(let i=0;i<featherCount;i++){
    const feather=livingEl("live-corbac-feather","",{
      left:`${livingRandom(12,88)}vw`,
      top:`${entryY+livingRandom(-1,8)}vh`,
      animationDelay:`${livingRandom(900,4400)}ms`
    });
    feather.style.setProperty("--dx",`${livingRandom(-74,-28)}px`);
    feather.style.setProperty("--dy",`${livingRandom(12,42)}px`);
    feather.style.setProperty("--rot",`${livingRandom(-42,38)}deg`);
    feather.style.setProperty("--dur",`${livingRandom(1400,2400)}ms`);
    livingAdd(feather);
  }
}
function livingChacha(){
  const groundY=livingRandom(68,78);
  const woolX=livingRandom(48,58);
  const chacha=livingImg(LIVE_ASSETS.chacha,"live-chacha-img",{
    left:"0",
    top:"0"
  },"Chacha");
  chacha.style.setProperty("--w","clamp(104px,7.2vw,132px)");
  chacha.style.setProperty("--ground-y",`${groundY}vh`);
  chacha.style.setProperty("--wool-x",`${woolX}vw`);
  livingAdd(chacha);

  const wool=livingImg(LIVE_ASSETS.bouftouWool,"live-chacha-wool",{
    left:`${woolX+2}vw`,
    top:`${groundY+3}vh`
  },"Laine de Bouftou");
  wool.style.setProperty("--w","clamp(42px,3.4vw,62px)");
  livingAdd(wool);

  for(let i=0;i<5;i++){
    const dust=livingEl("live-chacha-dust","",{
      left:`${livingRandom(10,74)}vw`,
      top:`${groundY+livingRandom(8,13)}vh`,
      animationDelay:`${livingRandom(1200,14200)}ms`
    });
    dust.style.setProperty("--dx",`${livingRandom(-30,-10)}px`);
    dust.style.setProperty("--dy",`${livingRandom(3,12)}px`);
    dust.style.setProperty("--dur",`${livingRandom(850,1350)}ms`);
    livingAdd(dust);
  }

  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="chacha")livingToast("Le Chacha a trouvé une laine de Bouftou.","info",null);
  },livingRandom(9000,10500)));
}
function livingLarva(){
  const groundY=livingRandom(74,82);
  const eggX=livingRandom(44,55);
  const larva=livingImg(LIVE_ASSETS.larva,"live-larva-img",{
    left:"0",
    top:"0"
  },"Larve");
  larva.style.setProperty("--w","clamp(82px,6.2vw,112px)");
  larva.style.setProperty("--ground-y",`${groundY}vh`);
  larva.style.setProperty("--egg-x",`${eggX}vw`);
  livingAdd(larva);

  const egg=livingImg(LIVE_ASSETS.larvaEgg,"live-larva-egg",{
    left:`${eggX+3}vw`,
    top:`${groundY+2}vh`
  },"Oeuf de larve");
  egg.style.setProperty("--w","clamp(42px,3.4vw,60px)");
  livingAdd(egg);

  for(let i=0;i<5;i++){
    const dust=livingEl("live-larva-dust","",{
      left:`${livingRandom(14,78)}vw`,
      top:`${groundY+livingRandom(8,13)}vh`,
      animationDelay:`${livingRandom(1800,15000)}ms`
    });
    dust.style.setProperty("--dx",`${livingRandom(-24,-8)}px`);
    dust.style.setProperty("--dy",`${livingRandom(4,13)}px`);
    dust.style.setProperty("--dur",`${livingRandom(950,1500)}ms`);
    livingAdd(dust);
  }

  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="larva")livingToast("La larve enterre un œuf étrange.","info",null);
  },livingRandom(10300,11800)));
}
function livingTofuTarget(){
  const selectors=["#plus","#minus","#optionsButton","#projectionButton","#monsterLauncher","#chronoStart","#chronoPause"];
  const candidates=selectors
    .map(selector=>document.querySelector(selector))
    .filter(el=>{
      const rect=el?.getBoundingClientRect?.();
      return rect && rect.width>0 && rect.height>0;
    });
  const target=candidates[Math.floor(Math.random()*candidates.length)];
  const rect=target?.getBoundingClientRect?.();
  if(rect){
    return {
      x:Math.max(120,Math.min(window.innerWidth-180,rect.left+rect.width*.5)),
      y:Math.max(100,Math.min(window.innerHeight-150,rect.top+rect.height*.2))
    };
  }
  return {x:window.innerWidth*.44,y:window.innerHeight*.56};
}
function livingTofu(){
  const hit=livingTofuTarget();
  const tofu=livingImg(LIVE_ASSETS.tofu,"live-tofu-img",{
    left:"0",
    top:"0"
  },"Tofu");
  tofu.style.setProperty("--w","clamp(76px,5.6vw,104px)");
  tofu.style.setProperty("--start-y",`${livingRandom(50,70)}vh`);
  tofu.style.setProperty("--p1-y",`${livingRandom(46,68)}vh`);
  tofu.style.setProperty("--p2-y",`${livingRandom(52,72)}vh`);
  tofu.style.setProperty("--hit-x",`${hit.x}px`);
  tofu.style.setProperty("--hit-y",`${hit.y}px`);
  tofu.style.setProperty("--escape-y",`${livingRandom(42,64)}vh`);
  tofu.style.setProperty("--end-y",`${livingRandom(36,68)}vh`);
  livingAdd(tofu);

  for(let i=0;i<5;i++){
    const star=livingEl("live-tofu-stun","",{
      left:`${hit.x+livingRandom(-10,16)}px`,
      top:`${hit.y-36+livingRandom(-8,10)}px`,
      animationDelay:`${3600+i*180}ms`
    });
    star.style.setProperty("--radius",`${livingRandom(18,34)}px`);
    star.style.setProperty("--turn",`${livingRandom(260,520)}deg`);
    livingAdd(star);
  }

  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="tofu")livingToast("Le Tofu s'est pris un bouton.","warning",null);
  },livingRandom(3300,3900)));
}
function livingInteractive(src,extra={}){
  const point=livingRandomPoint();
  const el=livingImg(src,`live-ground-object live-click-img ${extra.className||""}`,{left:point.x,top:point.y,"--w":extra.size||"76px"},extra.alt||"Objet");
  livingAdd(el);
  return el;
}
function livingPoop(){
  const orb=livingPykurRect();
  const bubble=livingEl("live-pykur-oops","Oups",{
    left:`${orb.left+orb.width*.5-28}px`,
    top:`${Math.max(24,orb.top-28)}px`
  });
  livingAnchorToPykur(bubble,{xRatio:.5,x:-28,y:-28,minTop:24});
  livingAdd(bubble);

  const el=livingInteractive(LIVE_ASSETS.poop,{alt:"Crotte",size:"clamp(76px,5.6vw,102px)",className:"live-poop-img"});
  el.style.setProperty("--poop-delay","1500ms");

  const baseLeft=el.style.left;
  const baseTop=el.style.top;
  for(let i=0;i<5;i++){
    const smell=livingEl("live-poop-smell","",{
      left:`calc(${baseLeft} + ${livingRandom(16,58)}px)`,
      top:`calc(${baseTop} - ${livingRandom(18,38)}px)`
    });
    smell.style.setProperty("--delay",`${1500+i*420}ms`);
    smell.style.setProperty("--dur",`${livingRandom(2800,3900)}ms`);
    livingAdd(smell);
  }

  el.onclick=()=>{
    livingSound(LIVE_ASSETS.poopSound);
    el.classList.add("collecting");
    livingToast("La surprise a été nettoyée.","info",null);
    setTimeout(()=>livingStop({silent:true,schedule:true}),520);
  };
}
function livingCoin(){
  const el=livingInteractive(LIVE_ASSETS.coin,{alt:"Kamas",size:"clamp(64px,4.8vw,86px)",className:"live-coin-img"});
  const baseLeft=el.style.left;
  const baseTop=el.style.top;
  const shine=livingEl("live-coin-shine","",{
    left:`calc(${baseLeft} + 12px)`,
    top:`calc(${baseTop} - 7px)`
  });
  livingAdd(shine);
  for(let i=0;i<6;i++){
    const spark=livingEl("live-coin-spark","",{
      left:`calc(${baseLeft} + ${livingRandom(8,64)}px)`,
      top:`calc(${baseTop} - ${livingRandom(12,36)}px)`
    });
    spark.style.setProperty("--delay",`${i*430}ms`);
    spark.style.setProperty("--dur",`${livingRandom(2200,3400)}ms`);
    spark.style.setProperty("--dx",`${livingRandom(-18,22)}px`);
    spark.style.setProperty("--dy",`${livingRandom(-46,-22)}px`);
    livingAdd(spark);
  }
  el.onclick=()=>{
    el.classList.add("collecting");
    livingToast("Dommage, ce kamas ne pourra pas être utilisé.","info",null);
    setTimeout(()=>livingStop({silent:true,schedule:true}),560);
  };
}
function livingFragment(){
  const el=livingInteractive(LIVE_ASSETS.fragment,{alt:"Fragment",size:"72px"});
  el.onclick=()=>{
    const orb=livingPykurRect();
    livingSound("pp");
    triggerPykurReaction("energy");
    livingToast("Le familier a déjà trop mangé, impossible pour lui de prendre de la progression.","info",null);
    el.style.setProperty("--target-x",`${orb.left+orb.width*.45}px`);
    el.style.setProperty("--target-y",`${orb.top+orb.height*.42}px`);
    el.classList.add("live-fragment-fly");
    setTimeout(()=>livingStop({silent:true,schedule:true}),900);
  };
}
function livingChest(){
  const el=livingInteractive(LIVE_ASSETS.chest,{alt:"Coffre",size:"clamp(132px,10vw,182px)",className:"live-chest-img"});
  el.style.setProperty("--w","clamp(132px,10vw,182px)");
  el.onclick=()=>{
    el.onclick=null;
    livingSound(LIVE_ASSETS.chestSound);
    livingChestResult(el);
    el.classList.add("live-chest-open");
    setTimeout(()=>livingStop({silent:true,schedule:true}),1650);
  };
}
function livingChestResult(chest){
  const x=chest.style.left;
  const y=chest.style.top;
  const rare=Math.random()<.08;
  const results=[
    {message:"Le coffre contenait quelques kamas… inutilisables.",kind:"gold",count:12},
    {message:"Le coffre était vide. Classique.",kind:"empty",count:7},
    {message:"Une vieille poussière s'échappe du coffre.",kind:"dust",count:9},
    {message:"Une faible énergie magique s'en échappe.",kind:"magic",count:10},
    {message:"Le trésor était surtout dans ton imagination.",kind:"gold",count:18},
  ];
  const result=rare ? {message:"Le coffre te juge silencieusement.",kind:"curse",count:10} : results[Math.floor(Math.random()*results.length)];
  const flashColor=result.kind==="magic"?"rgba(96,165,250,.42)":result.kind==="curse"?"rgba(168,85,247,.38)":"rgba(250,204,21,.42)";
  const flash=livingEl("live-chest-flash","",{left:`calc(${x} + 20px)`,top:`calc(${y} + 8px)`});
  flash.style.setProperty("--color",flashColor);
  livingAdd(flash);
  const isDust=result.kind==="empty" || result.kind==="dust";
  for(let i=0;i<result.count;i++){
    const node=livingEl(isDust?"live-chest-puff":"live-chest-burst","",{
      left:`calc(${x} + ${livingRandom(28,112)}px)`,
      top:`calc(${y} + ${livingRandom(18,82)}px)`,
      animationDelay:`${i*45}ms`
    });
    if(!isDust){
      const color=result.kind==="magic"?"#93c5fd":result.kind==="curse"?"#c084fc":"#facc15";
      const glow=result.kind==="magic"?"rgba(96,165,250,.65)":result.kind==="curse"?"rgba(168,85,247,.65)":"rgba(250,204,21,.65)";
      node.style.setProperty("--color",color);
      node.style.setProperty("--glow",glow);
      node.style.setProperty("--size",`${livingRandom(6,12)}px`);
    }
    node.style.setProperty("--dx",`${livingRandom(-80,90)}px`);
    node.style.setProperty("--dy",`${livingRandom(-112,-24)}px`);
    node.style.setProperty("--dur",`${livingRandom(950,1550)}ms`);
    livingAdd(node);
  }
  livingToast(result.message,result.kind==="curse"?"warning":"info",null);
}
function livingBottle(){
  const messages=[
    "Brako affirme avoir vu un Minotot voler.",
    "Raj prétend qu’il aurait gagné sans l’intervention de Brako.",
    "Le familier refuse de commenter cette découverte.",
    "Selon cette note, il suffirait de 3 Tynril pour atteindre 90 PP.",
    "Happios surveille cette bouteille depuis trois jours.",
    "Toom réclame toujours sa NRG 500.",
    "Aina dit que le Dofus Ivoire était mérité.",
    "Un message indique : ‘Arrête de reset à 89%.’",
    "La bouteille contient une facture de réparation du tracker.",
    "Charlie aurait mâchouillé le bouchon.",
    "Le message est illisible, probablement écrit par un Tofu.",
    "Quelqu’un a dessiné un Pykur avec des lunettes.",
    "Le parchemin sent étrangement la laine de Bouftou.",
    "Raj-Pah demande à être débanni. Refusé.",
    "Brako conseille de régler le problème à coups de baguette."
  ];
  const el=livingInteractive(LIVE_ASSETS.bottle,{alt:"Bouteille",size:"clamp(132px,10vw,182px)",className:"live-bottle-img"});
  el.style.setProperty("--w","clamp(132px,10vw,182px)");
  const baseLeft=el.style.left;
  const baseTop=el.style.top;
  for(let i=0;i<8;i++){
    const drop=livingEl("live-water-particle","",{
      left:`calc(${baseLeft} + ${livingRandom(10,118)}px)`,
      top:`calc(${baseTop} + ${livingRandom(38,118)}px)`
    });
    drop.style.setProperty("--size",`${livingRandom(5,11)}px`);
    drop.style.setProperty("--delay",`${i*360}ms`);
    drop.style.setProperty("--dur",`${livingRandom(2900,5200)}ms`);
    drop.style.setProperty("--dx",`${livingRandom(-24,28)}px`);
    drop.style.setProperty("--dy",`${livingRandom(-34,-10)}px`);
    livingAdd(drop);
  }
  el.onclick=async()=>{
    el.onclick=null;
    el.classList.add("opening");
    livingSound("click");
    await new Promise(resolve=>setTimeout(resolve,360));
    const dialog=$("#appDialog");
    dialog?.classList.add("bottle-parchment-dialog");
    try{
      await showDialog(messages[Math.floor(Math.random()*messages.length)],{title:"Message trouvé",okLabel:"Fermer",okClass:"btn-orange"});
      livingToast("Le message a été rangé.","info",null);
    }finally{
      dialog?.classList.remove("bottle-parchment-dialog");
      livingStop({silent:true,schedule:true});
    }
  };
}
function livingResonance(){
  livingStartResonanceSound();
  const orb=livingPykurRect();
  const cx=orb.left+orb.width*.5;
  const cy=orb.top+orb.height*.5;
  $(".pykur-orb")?.classList.add("live-resonating");
  $("#pykurImg")?.classList.add("live-resonating");

  const aura=livingEl("live-resonance-aura","",{
    left:`${orb.left-42}px`,
    top:`${orb.top-42}px`,
    width:`${orb.width+84}px`,
    height:`${orb.height+84}px`
  });
  livingAnchorToPykur(aura,{x:-42,y:-42,widthOffset:84,heightOffset:84});
  livingAdd(aura);
  triggerPykurReaction("energy");

  const addWave=({delay=0,strong=false}={})=>{
    const wave=livingEl("live-resonance-wave","",{
      left:`${orb.left-26}px`,
      top:`${orb.top-26}px`,
      width:`${orb.width+52}px`,
      height:`${orb.height+52}px`
    });
    wave.style.setProperty("--delay",`${delay}ms`);
    wave.style.setProperty("--dur",strong?"4400ms":"3600ms");
    if(strong)wave.style.borderColor="rgba(250,204,21,.62)";
    livingAnchorToPykur(wave,{x:-26,y:-26,widthOffset:52,heightOffset:52});
    livingAdd(wave);
  };
  [900,4300,8200,12600,16800,21200,25400,29400,32000].forEach((delay,index)=>addWave({delay,strong:index>=6}));

  for(let i=0;i<22;i++){
    const p=livingEl("live-resonance-particle orbit","",{
      left:`${cx}px`,
      top:`${cy}px`
    });
    livingAnchorToPykur(p,{xRatio:.5,yRatio:.5});
    p.style.setProperty("--size",`${livingRandom(5,10)}px`);
    p.style.setProperty("--radius",`${livingRandom(62,128)}px`);
    p.style.setProperty("--start",`${livingRandom(0,360)}deg`);
    p.style.setProperty("--turn",`${livingRandom(320,820)}deg`);
    p.style.setProperty("--dur",`${livingRandom(16000,34000)}ms`);
    p.style.setProperty("--delay",`${livingRandom(600,8200)}ms`);
    livingAdd(p);
  }

  for(let i=0;i<24;i++){
    const p=livingEl("live-resonance-particle absorb","",{
      left:`${cx}px`,
      top:`${cy}px`
    });
    livingAnchorToPykur(p,{xRatio:.5,yRatio:.5});
    p.style.setProperty("--size",`${livingRandom(4,9)}px`);
    p.style.setProperty("--sx",`${livingRandom(-240,240)}px`);
    p.style.setProperty("--sy",`${livingRandom(-180,190)}px`);
    p.style.setProperty("--dur",`${livingRandom(4200,7200)}ms`);
    p.style.setProperty("--delay",`${livingRandom(800,31000)}ms`);
    livingAdd(p);
  }

  const startPeak=()=>{
    if(livingState.current!=="resonance")return;
    $(".pykur-orb")?.classList.add("live-resonance-peak");
    $("#pykurImg")?.classList.add("live-resonance-peak");
    const flare=livingEl("live-resonance-peak-flare","",{
      left:`${orb.left-58}px`,
      top:`${orb.top-58}px`,
      width:`${orb.width+116}px`,
      height:`${orb.height+116}px`
    });
    livingAnchorToPykur(flare,{x:-58,y:-58,widthOffset:116,heightOffset:116});
    livingAdd(flare);
    for(let i=0;i<7;i++){
      addWave({delay:i*620,strong:true});
    }
    for(let i=0;i<18;i++){
      const burst=livingEl("live-resonance-particle absorb","",{
        left:`${cx}px`,
        top:`${cy}px`
      });
      livingAnchorToPykur(burst,{xRatio:.5,yRatio:.5});
      burst.style.setProperty("--size",`${livingRandom(6,12)}px`);
      burst.style.setProperty("--sx",`${livingRandom(-170,170)}px`);
      burst.style.setProperty("--sy",`${livingRandom(-150,150)}px`);
      burst.style.setProperty("--dur",`${livingRandom(1200,2600)}ms`);
      burst.style.setProperty("--delay",`${livingRandom(0,4300)}ms`);
      livingAdd(burst);
    }
    triggerPykurReaction("milestone");
  };

  const secondary=[
    "Une énergie ancienne semble traverser le familier.",
    "Le familier semble particulièrement concentré.",
    "Une étrange vibration parcourt le tracker."
  ];
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(startPeak,31000));
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current==="resonance")livingToast(secondary[Math.floor(Math.random()*secondary.length)],"info",null);
  },livingRandom(11500,18500)));
}
function livingAura(){
  const orb=livingPykurRect();
  const cx=orb.left+orb.width*.5;
  const cy=orb.top+orb.height*.5;
  $(".pykur-orb")?.classList.add("live-unstable-aura");
  $("#pykurImg")?.classList.add("live-unstable-aura");
  const halo=livingEl("live-unstable-halo","",{
    left:`${orb.left-38}px`,
    top:`${orb.top-38}px`,
    width:`${orb.width+76}px`,
    height:`${orb.height+76}px`
  });
  livingAnchorToPykur(halo,{x:-38,y:-38,widthOffset:76,heightOffset:76});
  livingAdd(halo);

  const addWave=delay=>{
    const wave=livingEl("live-unstable-wave","",{
      left:`${orb.left-20}px`,
      top:`${orb.top-20}px`,
      width:`${orb.width+40}px`,
      height:`${orb.height+40}px`
    });
    livingAnchorToPykur(wave,{x:-20,y:-20,widthOffset:40,heightOffset:40});
    wave.style.setProperty("--delay",`${delay}ms`);
    wave.style.setProperty("--dur",`${livingRandom(2200,2900)}ms`);
    livingAdd(wave);
  };
  [900,3600,6500,9500,12300].forEach(addWave);

  const count=livingRandom(9,14);
  for(let i=0;i<count;i++){
    const particle=livingImg(LIVE_ASSETS.energyParticle,"live-unstable-particle",{
      left:`${cx}px`,
      top:`${cy}px`
    },"Particule d'énergie");
    livingAnchorToPykur(particle,{xRatio:.5,yRatio:.5});
    particle.style.setProperty("--w",`${livingRandom(15,28)}px`);
    particle.style.setProperty("--radius",`${livingRandom(54,118)}px`);
    particle.style.setProperty("--start",`${livingRandom(0,360)}deg`);
    particle.style.setProperty("--turn",`${livingRandom(390,850)}deg`);
    particle.style.setProperty("--jitter",`${livingRandom(-46,46)}px`);
    particle.style.setProperty("--dur",`${livingRandom(11200,14800)}ms`);
    particle.style.setProperty("--delay",`${livingRandom(0,1400)}ms`);
    particle.style.setProperty("--opacity",`${livingRandom(58,92)/100}`);
    livingAdd(particle);
  }

  for(let i=0;i<8;i++){
    const spark=livingEl("live-unstable-spark","",{
      left:`${cx+livingRandom(-62,62)}px`,
      top:`${cy+livingRandom(-54,58)}px`
    });
    livingAnchorToPykur(spark,{xRatio:.5,yRatio:.5,x:livingRandom(-62,62),y:livingRandom(-54,58)});
    spark.style.setProperty("--size",`${livingRandom(3,6)}px`);
    spark.style.setProperty("--delay",`${livingRandom(0,1600)}ms`);
    spark.style.setProperty("--dur",`${livingRandom(1200,2200)}ms`);
    spark.style.setProperty("--dx",`${livingRandom(-24,24)}px`);
    spark.style.setProperty("--dy",`${livingRandom(-30,18)}px`);
    livingAdd(spark);
  }

  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current!=="unstableAura")return;
    $(".pykur-orb")?.classList.add("live-unstable-chaos");
    $("#pykurImg")?.classList.add("live-unstable-chaos");
    livingToast("L'énergie devient incontrôlable.","warning",null);
  },4200));
  livingState.soundTimers.push(setTimeout(()=>{
    $(".pykur-orb")?.classList.remove("live-unstable-chaos");
    $("#pykurImg")?.classList.remove("live-unstable-chaos");
  },10400));
}
function livingStar(){
  const rare=Math.random()<.1;
  const fromLeft=Math.random()<.5;
  const size=rare ? "clamp(92px,7vw,118px)" : "clamp(76px,5.8vw,104px)";
  const duration=rare ? "4800ms" : "4300ms";
  const sx=fromLeft ? "-16vw" : "116vw";
  const ex=fromLeft ? "116vw" : "-18vw";
  const sy=`${livingRandom(-10,5)}vh`;
  const ey=`${livingRandom(46,64)}vh`;
  const rot=fromLeft ? "28deg" : "152deg";
  const glow=livingEl("live-star-sky-glow","",{"--gx":fromLeft?"24%":"76%","--gy":"12%"});
  livingAdd(glow);
  const trail=livingEl("live-shooting-star-trail","",{
    left:"0",
    top:"0",
    "--sx":sx,
    "--sy":sy,
    "--ex":ex,
    "--ey":ey,
    "--rot":rot,
    "--dur":duration
  });
  trail.style.setProperty("--trail-w",rare?"340px":"260px");
  livingAdd(trail);
  const star=livingImg(LIVE_ASSETS.star,"live-shooting-star-img",{
    left:"0",
    top:"0",
    "--sx":sx,
    "--sy":sy,
    "--ex":ex,
    "--ey":ey,
    "--rot":rot,
    "--dur":duration,
    "--scale":rare?"1.14":"1",
  },"Etoile filante");
  star.style.setProperty("--w",size);
  livingAdd(star);
  const dustCount=rare?8:5;
  for(let i=0;i<dustCount;i++){
    const progress=(i+1)/(dustCount+2);
    const x=fromLeft ? 10+progress*72 : 90-progress*72;
    const y=8+progress*42+livingRandom(-5,6);
    const dust=livingEl("live-star-dust","",{
      left:`${x}vw`,
      top:`${y}vh`
    });
    dust.style.setProperty("--size",`${livingRandom(4,8)}px`);
    dust.style.setProperty("--delay",`${livingRandom(650,2500)}ms`);
    dust.style.setProperty("--dur",`${livingRandom(1200,2200)}ms`);
    dust.style.setProperty("--dx",`${fromLeft?livingRandom(-36,-12):livingRandom(12,36)}px`);
    dust.style.setProperty("--dy",`${livingRandom(16,44)}px`);
    livingAdd(dust);
  }
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current!=="shootingStar")return;
    $(".pykur-orb")?.classList.add("live-star-wish");
    $("#pykurImg")?.classList.add("live-star-wish");
    livingToast("Le familier fait un vœu.","info",null);
  },1500));
  livingState.soundTimers.push(setTimeout(()=>{
    $(".pykur-orb")?.classList.remove("live-star-wish");
    $("#pykurImg")?.classList.remove("live-star-wish");
  },3500));
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current!=="shootingStar")return;
    const finalFromLeft=Math.random()<.5;
    const finalSx=finalFromLeft ? "-18vw" : "118vw";
    const finalEx=finalFromLeft ? "118vw" : "-20vw";
    const finalY=`${livingRandom(16,34)}vh`;
    const finalRot=finalFromLeft ? "18deg" : "162deg";
    const finalTrail=livingEl("live-shooting-star-trail","",{
      left:"0",
      top:"0",
      "--sx":finalSx,
      "--sy":finalY,
      "--ex":finalEx,
      "--ey":`${livingRandom(24,42)}vh`,
      "--rot":finalRot,
      "--dur":"1050ms"
    });
    finalTrail.style.setProperty("--trail-w",rare?"390px":"310px");
    livingAdd(finalTrail);
    const finalStar=livingImg(LIVE_ASSETS.star,"live-shooting-star-img",{
      left:"0",
      top:"0",
      "--sx":finalSx,
      "--sy":finalY,
      "--ex":finalEx,
      "--ey":`${livingRandom(24,42)}vh`,
      "--rot":finalRot,
      "--dur":"1050ms",
      "--scale":rare?"1.18":"1.04",
    },"Etoile filante");
    finalStar.style.setProperty("--w",rare?"clamp(96px,7.4vw,124px)":"clamp(82px,6.2vw,110px)");
    livingAdd(finalStar);
  },3950));
  if(rare){
    livingState.soundTimers.push(setTimeout(()=>{
      if(livingState.current==="shootingStar")livingToast("Cette étoile semblait différente...","rare",null);
    },700));
  }
}
function livingSleepy(){
  const img=$("#pykurImg");
  if(img && !livingState.sleepyOriginalSrc){
    livingState.sleepyOriginalSrc=img.getAttribute("src") || img.src;
    livingState.sleepyOriginalAlt=img.getAttribute("alt");
  }
  img?.classList.add("live-pykur-tired-img");
  if(!livingState.soundTimers)livingState.soundTimers=[];
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current!=="sleepy")return;
    const currentImg=$("#pykurImg");
    if(currentImg){
      currentImg.classList.remove("live-pykur-tired-img");
      currentImg.classList.add("live-pykur-sleeping-img");
      currentImg.src=activeFamiliar().sleepingImage || LIVE_ASSETS.sleepyPykur;
      currentImg.alt=`${activeFamiliar().shortLabel} endormi`;
    }
    livingToast(`${activeFamiliar().shortLabel} s'est endormi.`,"info",null);
    for(let i=0;i<3;i++){
      const orb=livingPykurRect();
      const z=livingImg(LIVE_ASSETS.zzz,"live-sleep-zzz",{
        "--w":`${livingRandom(42,58)}px`,
        left:`${orb.left+orb.width*.58+i*16}px`,
        top:`${orb.top-16-i*9}px`
      },"ZZZ");
      livingAnchorToPykur(z,{xRatio:.58,x:i*16,y:-16-i*9});
      z.style.setProperty("--delay",`${i*1.25}s`);
      livingAdd(z);
    }
  },2000));
  livingState.soundTimers.push(setTimeout(()=>{
    if(livingState.current!=="sleepy")return;
    $$(".live-sleep-zzz").forEach(el=>el.style.animationIterationCount="1");
  },14500));
}
function livingComet(){livingAdd(livingImg(LIVE_ASSETS.star,"live-star-img",{"--w":"230px",left:"-18vw",top:"16vh","--dur":"4000ms",filter:"drop-shadow(0 0 22px rgba(250,204,21,.85))"},"Comete"))}
function livingAwakening(){
  livingAdd(livingEl("live-pykur-glow"));
  const orb=livingPykurRect();
  const pulse=livingEl("live-ancient-pulse","",{left:`${orb.left-34}px`,top:`${orb.top-34}px`,width:`${orb.width+68}px`,height:`${orb.height+68}px`});
  livingAnchorToPykur(pulse,{x:-34,y:-34,widthOffset:68,heightOffset:68});
  livingAdd(pulse);
  triggerPykurReaction("milestone");
}
function livingFakeBug(){livingAdd(livingEl("live-fake-bug","Erreur 404 : Motivation introuvable."))}

function handleSecretKeys(e){
  if(e.ctrlKey || e.metaKey || e.altKey)return false;
  if(e.target?.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable='']"))return false;
  if(e.key.length!==1)return false;
  secretBuffer=(secretBuffer+e.key.toLowerCase()).slice(-16);
  charlieBuffer=secretBuffer;
  if(secretBuffer.endsWith("adminoeuf")){
    secretBuffer="";
    charlieBuffer="";
    resetHiddenSecretEgg();
    return true;
  }
  if(secretBuffer.endsWith("ester eggs")){
    secretBuffer="";
    charlieBuffer="";
    toast("Une coquille murmure : cherche l'œuf caché sur le site.","info","click");
    return true;
  }
  if(secretBuffer.endsWith("pc")){
    secretBuffer="";
    charlieBuffer="";
    goToVersion("desktop");
    return true;
  }
  if(secretBuffer.endsWith("tel")){
    secretBuffer="";
    charlieBuffer="";
    goToVersion("mobile");
    return true;
  }
  if(secretBuffer.endsWith("raj")){
    secretBuffer="";
    charlieBuffer="";
    toggleRajEasterEgg();
    return true;
  }
  if(secretBuffer.endsWith("brako")){
    secretBuffer="";
    charlieBuffer="";
    toggleBrakoEasterEgg();
    return true;
  }
  if(secretBuffer.endsWith("capy")){
    secretBuffer="";
    charlieBuffer="";
    toggleCapyMode();
    return true;
  }
  if(secretBuffer.endsWith("toom")){
    secretBuffer="";
    charlieBuffer="";
    toggleToom();
    return true;
  }
  if(secretBuffer.endsWith("aina")){
    secretBuffer="";
    charlieBuffer="";
    toggleAina();
    return true;
  }
  if(secretBuffer.endsWith("charlie")){
    secretBuffer="";
    charlieBuffer="";
    toggleCharlieCursor();
    return true;
  }
  if(secretBuffer.endsWith("alhass")){
    secretBuffer="";
    charlieBuffer="";
    toggleAlhass();
    return true;
  }
  return false;
}

function clone(x){return JSON.parse(JSON.stringify(x))}
function today(){return new Date().toISOString().split("T")[0]}

function ensureDay(date=today()){
  if(!data.stats)data.stats=defaultData().stats;
  if(!data.stats.days)data.stats.days={};

  if(!data.stats.days[date]){
    data.stats.days[date]=Object.assign(
      Object.fromEntries(activeFarmKeys().map(key=>[key,0])),
      {pp:0,startPP:currentPP()}
    );
  }

  if(data.stats.days[date].startPP===undefined){
    data.stats.days[date].startPP=Math.max(0,currentPP()-(data.stats.days[date].pp||0));
  }

  return data.stats.days[date];
}

function addDailyRun(farm,delta,ppDelta=0){
  const d=ensureDay();

  d[farm]=(d[farm]||0)+delta;
  if(d[farm]<0)d[farm]=0;

  d.pp=(d.pp||0)+ppDelta;
  if(d.pp<0)d.pp=0;
}

function syncTodayPPGain(){
  const d=ensureDay();
  d.pp=Math.max(0,currentPP()-(d.startPP||0));
}

function dayTotal(day){
  return activeFarmKeys().reduce((sum,key)=>sum+(day?.[key]||0),0);
}

function sortedActiveDays(){
  if(!data.stats?.days)return [];
  return Object.keys(data.stats.days)
    .filter(d=>dayTotal(data.stats.days[d])>0)
    .sort();
}

function calcCurrentStreak(){
  const days=sortedActiveDays();
  if(!days.length)return 0;

  let streak=0;
  let cursor=new Date(today()+"T00:00:00");

  while(true){
    const key=cursor.toISOString().split("T")[0];
    if(dayTotal(data.stats.days[key])>0){
      streak++;
      cursor.setDate(cursor.getDate()-1);
    }else{
      break;
    }
  }
  return streak;
}

function calcBestStreak(){
  const days=sortedActiveDays();
  if(!days.length)return 0;
  let best=1,cur=1;
  for(let i=1;i<days.length;i++){
    const prev=new Date(days[i-1]+"T00:00:00");
    const now=new Date(days[i]+"T00:00:00");
    const diff=Math.round((now-prev)/86400000);
    if(diff===1){
      cur++;
      best=Math.max(best,cur);
    }else{
      cur=1;
    }
  }
  return best;
}

function calcBestDay(){
  const entries=Object.entries(data.stats?.days||{});
  if(!entries.length)return null;
  let best=null;
  for(const [date,day] of entries){
    const total=dayTotal(day);
    if(total<=0)continue;
    if(!best || total>best.total){
      best={date,day,total};
    }
  }
  return best;
}

function calcAveragePerActiveDay(){
  const days=sortedActiveDays();
  if(!days.length)return 0;
  const total=days.reduce((sum,d)=>sum+dayTotal(data.stats.days[d]),0);
  return total/days.length;
}

function ensureData(){
  data.familiarId=normalizeFamiliarId(data.familiarId);
  refreshFamiliarRuntime();
  const farmKeys=activeFarmKeys();
  const defaultFarm=farmKeys[0]||"morose";
  if(!data.stats)data.stats=defaultData().stats;
  if(!data.stats.days)data.stats.days={};
  data.session=Object.assign(defaultData().session,data.session||{});
  data.session.runs=Object.assign(Object.fromEntries(farmKeys.map(key=>[key,0])),data.session.runs||{});
  const pausedSessionHasProgress=!data.session.active && (
    (parseInt(data.session.totalSeconds,10)||0)>0 ||
    farmKeys.some(key=>(data.session.runs?.[key]||0)>0)
  );
  if(!data.session.active && !pausedSessionHasProgress){
    data.session.startedAt=null;
    data.session.sessionStartedAt=null;
    data.session.totalSeconds=0;
    data.session.runs=Object.fromEntries(farmKeys.map(key=>[key,0]));
    data.session.ppStart=currentPP();
    data.session.ppGain=0;
  }
  data.hud=Object.assign(defaultData().hud,data.hud||{});
  data.hud.windows=Object.assign({},data.hud.windows||{});
  data.achievements=normalizeAchievements(data.achievements);
  data.gallery=normalizeGallery(data.gallery);
  data.dofusDetection=Object.assign(defaultData().dofusDetection,data.dofusDetection||{});
  data.dofusDetection.refs=Object.assign({},data.dofusDetection.refs||{});
  farmKeys.forEach(farm=>{
    data.dofusDetection.refs[farm]=Object.assign({imageKey:null,zone:null,threshold:82},data.dofusDetection.refs[farm]||{});
  });
  if(!data.createdAt)data.createdAt=new Date().toISOString();
  if(!data.special)data.special={};
  if(activeFamiliarId()==="abra-kadabra"){
    data.special=Object.assign({salleAbrakneSetupDone:false,salleAbrakneActive:false,salleAbrakneLastActivity:null},data.special||{});
  }
  data.settings=Object.assign(defaultData().settings,data.settings||{});
  data.settings.keybinds=Object.assign(defaultKeybinds(),data.settings.keybinds||{});
  if(data.settings.shortcutsEnabled===undefined)data.settings.shortcutsEnabled=true;
  data.ui=Object.assign(defaultData().ui,data.ui||{});
  farmKeys.forEach(farm=>{
    const key=farmAverageKey(farm);
    if(data.stats[key]===undefined)data.stats[key]=farmDefaultAverage(farm);
  });
  if(!farmKeys.includes(data.ui.farm))data.ui.farm=defaultFarm;
  if(![...farmKeys,"zone","all"].includes(data.ui.tab))data.ui.tab=defaultFarm;
  if(data.ui.capyMode===undefined)data.ui.capyMode=false;
  data.chrono=Object.assign(defaultData().chrono,data.chrono||{});
  data.chrono.lastMarkSeconds=Math.max(0,parseInt(data.chrono.lastMarkSeconds,10)||0);
  if(!data.chrono.running)data.chrono.lastMarkSeconds=Math.min(data.chrono.lastMarkSeconds,parseInt(data.chrono.seconds,10)||data.chrono.lastMarkSeconds);
  data.chrono.marks=Array.isArray(data.chrono.marks)?data.chrono.marks:[];
  if(!data.mobs)data.mobs={zone:{}};
  for(const area of [...farmKeys,"zone"]){
    if(!data.mobs[area])data.mobs[area]={};
  }
  data.runs=Object.assign(Object.fromEntries(farmKeys.map(key=>[key,0])),data.runs||{});
  farmKeys.forEach(farm=>data.runs[farm]=clampRunsToLimit(farm,data.runs[farm]||0));
  for(const id in mobs){
    for(const area of [...farmKeys,"zone"]){
      if(data.mobs[area][id]===undefined)data.mobs[area][id]=0;
      data.mobs[area][id]=Math.max(0,parseInt(data.mobs[area][id],10)||0);
    }
  }
  farmKeys.forEach(farm=>{
    const farmGains=effectiveFarmGains(farm);
    const hasRecordedMobs=Object.keys(farmGains).some(id=>(data.mobs[farm]?.[id]||0)>0);
    if(!hasRecordedMobs && (data.runs[farm]||0)>0){
      for(const id in farmGains){
        data.mobs[farm][id]=(data.runs[farm]||0)*farmGains[id];
      }
    }
  });
  data.special=Object.assign({},data.special||{});
  if(activeFamiliarId()==="abra-kadabra"){
    data.special=Object.assign({salleAbrakneSetupDone:false,salleAbrakneActive:false,salleAbrakneLastActivity:null},data.special||{});
  }
  if(activeFamiliarId()==="gelutin"){
    data.special=Object.assign({blopBoss:"blopCocoRoyal"},data.special||{});
    if(!GELUTIN_BLOP_BOSS_GAINS[data.special.blopBoss])data.special.blopBoss="blopCocoRoyal";
  }
}

function makeStore(){
  return {active:null,needsFamiliarChoice:true,galleryShared:true,sharedGallery:defaultData().gallery,optionsShared:false,sharedSettings:defaultData().settings,achievementsShared:true,achievementAccountMode:1,sharedAchievements:defaultData().achievements,deletedProfiles:{},profiles:{}};
}

function hasActiveProfile(){
  return !!(store?.profiles && activeProfile && store.profiles[activeProfile]);
}

function normalizeSettings(settings){
  const normalized=Object.assign(defaultData().settings,settings||{});
  normalized.keybinds=Object.assign(defaultKeybinds(),normalized.keybinds||{});
  return normalized;
}

function normalizeGallery(gallery){
  const base=defaultData().gallery;
  const normalized=Object.assign({},base,gallery||{});
  normalized.completedPykurs=Array.isArray(normalized.completedPykurs)?normalized.completedPykurs:[];
  normalized.completedPykurs=normalized.completedPykurs.map((item,index)=>item&&typeof item==="object"?normalizeGalleryArchive({...item,image:assetPath(item.image)},index):item);
  normalized.eventsDiscovered=Object.assign({},normalized.eventsDiscovered||{});
  normalized.removedPykurs=Object.assign({},normalized.removedPykurs||{});
  normalized.removedEvents=Object.assign({},normalized.removedEvents||{});
  normalized.completedPykurs=normalized.completedPykurs.filter(item=>!normalized.removedPykurs[String(item?.id||"")]);
  Object.keys(normalized.removedEvents).forEach(id=>delete normalized.eventsDiscovered[id]);
  normalized.currentCycleArchived=!!normalized.currentCycleArchived;
  normalized.currentCycleCompletionSeen=!!normalized.currentCycleCompletionSeen;
  return normalized;
}

function mergeGalleries(baseGallery, extraGallery){
  const base=normalizeGallery(baseGallery);
  const extra=normalizeGallery(extraGallery);
  base.removedPykurs=Object.assign({},base.removedPykurs||{},extra.removedPykurs||{});
  base.removedEvents=Object.assign({},base.removedEvents||{},extra.removedEvents||{});
  const removedPykurs=new Set(Object.keys(base.removedPykurs));
  base.completedPykurs=base.completedPykurs.filter(item=>!removedPykurs.has(String(item?.id||"")));
  const seen=new Set(base.completedPykurs.map(item=>item.id).filter(Boolean));
  extra.completedPykurs.forEach(item=>{
    if(removedPykurs.has(String(item?.id||"")) || (item?.id && seen.has(item.id)))return;
    base.completedPykurs.push(item);
    if(item?.id)seen.add(item.id);
  });
  base.completedPykurs=base.completedPykurs.map((item,index)=>({...item,number:index+1}));
  Object.entries(extra.eventsDiscovered||{}).forEach(([id,item])=>{
    if(base.removedEvents[id])return;
    const current=base.eventsDiscovered[id];
    if(!current){
      base.eventsDiscovered[id]=Object.assign({},item);
      return;
    }
    current.count=(current.count||0)+(item.count||0);
    if(item.firstSeen && (!current.firstSeen || new Date(item.firstSeen)<new Date(current.firstSeen)))current.firstSeen=item.firstSeen;
    if(item.lastSeen && (!current.lastSeen || new Date(item.lastSeen)>new Date(current.lastSeen)))current.lastSeen=item.lastSeen;
  });
  Object.keys(base.removedEvents).forEach(id=>delete base.eventsDiscovered[id]);
  return base;
}

function normalizeAchievements(achievements){
  const base=defaultData().achievements;
  const normalized=Object.assign({},base,achievements||{});
  normalized.unlocked=Object.assign({},normalized.unlocked||{});
  normalized.removedUnlocked=Object.assign({},normalized.removedUnlocked||{});
  Object.keys(normalized.removedUnlocked).forEach(id=>delete normalized.unlocked[id]);
  normalized.counters=Object.assign({happiosHover:0},normalized.counters||{});
  normalized.secretCategoriesUnlocked=!!normalized.secretCategoriesUnlocked;
  normalized.eggCollected=!!normalized.eggCollected;
  return normalized;
}

function mergeAchievements(baseAchievements, extraAchievements){
  const base=normalizeAchievements(baseAchievements);
  const extra=normalizeAchievements(extraAchievements);
  base.removedUnlocked=Object.assign({},base.removedUnlocked||{},extra.removedUnlocked||{});
  Object.entries(extra.unlocked||{}).forEach(([id,item])=>{
    if(!item || base.removedUnlocked[id])return;
    const current=base.unlocked[id];
    if(!current || (item.date && current.date && new Date(item.date)<new Date(current.date))){
      base.unlocked[id]=Object.assign({},item);
    }else if(!current){
      base.unlocked[id]=Object.assign({},item);
    }
  });
  Object.entries(extra.counters||{}).forEach(([key,value])=>{
    base.counters[key]=Math.max(parseInt(base.counters[key],10)||0,parseInt(value,10)||0);
  });
  base.secretCategoriesUnlocked=!!(base.secretCategoriesUnlocked || extra.secretCategoriesUnlocked);
  base.eggCollected=!!(base.eggCollected || extra.eggCollected);
  return base;
}

function ensureStoreGallery(){
  if(!store)return;
  const hadSharedGallery=!!store.sharedGallery;
  if(store.galleryShared===undefined)store.galleryShared=true;
  store.sharedGallery=normalizeGallery(store.sharedGallery);
  if(!hadSharedGallery){
    Object.values(store.profiles||{}).forEach(profile=>{
      if(profile?.data?.gallery)store.sharedGallery=mergeGalleries(store.sharedGallery,profile.data.gallery);
    });
  }
}

function ensureStoreOptionsSharing(){
  if(!store)return;
  if(store.optionsShared===undefined)store.optionsShared=false;
  const activeSettings=store.profiles?.[store.active]?.data?.settings || data?.settings || defaultData().settings;
  store.sharedSettings=normalizeSettings(store.sharedSettings || activeSettings);
}

function ensureStoreAchievementSharing(){
  if(!store)return;
  const needsMigration=store.achievementAccountMode!==1;
  let accountAchievements=normalizeAchievements(store.sharedAchievements || data?.achievements || defaultData().achievements);
  if(needsMigration){
    Object.values(store.profiles||{}).forEach(profile=>{
      if(profile?.data?.achievements)accountAchievements=mergeAchievements(accountAchievements,profile.data.achievements);
    });
    if(data?.achievements)accountAchievements=mergeAchievements(accountAchievements,data.achievements);
    store.achievementAccountMode=1;
  }
  store.sharedAchievements=accountAchievements;
  store.achievementsShared=true;
}

function applySharedSettingsToData(){
  ensureStoreOptionsSharing();
  if(store?.optionsShared){
    data.settings=normalizeSettings(store.sharedSettings);
  }
}

function applySharedAchievementsToData(){
  ensureStoreAchievementSharing();
  if(store)data.achievements=normalizeAchievements(store.sharedAchievements);
}

function syncSharedSettingsFromData(){
  ensureStoreOptionsSharing();
  if(!store?.optionsShared)return;
  store.sharedSettings=normalizeSettings(data.settings);
  Object.values(store.profiles||{}).forEach(profile=>{
    if(profile?.data)profile.data.settings=clone(store.sharedSettings);
  });
}

function syncSharedAchievementsFromData(){
  ensureStoreAchievementSharing();
  if(!store)return;
  store.sharedAchievements=normalizeAchievements(data.achievements);
  store.achievementsShared=true;
  Object.values(store.profiles||{}).forEach(profile=>{
    if(profile?.data)profile.data.achievements=clone(store.sharedAchievements);
  });
}

function activeGallery(){
  ensureStoreGallery();
  return store?.galleryShared!==false ? store.sharedGallery : data.gallery;
}

function syncActiveGallery(gallery){
  if(store?.galleryShared!==false)store.sharedGallery=normalizeGallery(gallery);
  else data.gallery=normalizeGallery(gallery);
}

function syncChronoTimerForProfile(){
  if(chronoTimer){
    clearInterval(chronoTimer);
    chronoTimer=null;
  }

  if(data.chrono?.running){
    if(!data.chrono.startedAt)data.chrono.startedAt=Date.now();
    startChrono(false);
  }
}

function load(){
  try{
    store=JSON.parse(localStorage.getItem("pykur_clean_v1"))||makeStore();
  }catch(e){store=makeStore()}
  if(!store.profiles)store.profiles={};
  store.deletedProfiles=Object.assign({},store.deletedProfiles||{});
  Object.keys(store.deletedProfiles).forEach(profileId=>{
    if(store.profiles)delete store.profiles[profileId];
  });
  Object.values(store.profiles||{}).forEach(profile=>{
    if(!profile.data)profile.data=defaultDataForFamiliar("pykur");
    profile.data.familiarId=normalizeFamiliarId(profile.data.familiarId);
  });
  ensureStoreGallery();
  ensureStoreOptionsSharing();
  ensureStoreAchievementSharing();
  if(!store.active || !store.profiles[store.active])store.active=Object.keys(store.profiles)[0]||null;
  activeProfile=store.active;
  data=activeProfile ? Object.assign(defaultData(), store.profiles[activeProfile]?.data||{}) : defaultDataForFamiliar("pykur");
  refreshFamiliarRuntime();
  data.runs=Object.assign(Object.fromEntries(activeFarmKeys().map(key=>[key,0])),data.runs||{});
  data.mobs=Object.assign({zone:{}},data.mobs||{});
  data.settings=Object.assign(defaultData().settings,data.settings||{});
  data.settings.keybinds=Object.assign(defaultKeybinds(),data.settings.keybinds||{});
  if(data.settings.shortcutsEnabled===undefined)data.settings.shortcutsEnabled=true;
  applySharedSettingsToData();
  data.stats=Object.assign(defaultData().stats,data.stats||{}); if(!data.stats.days)data.stats.days={};
  data.chrono=Object.assign(defaultData().chrono,data.chrono||{}); if(data.chrono.running && !data.chrono.startedAt)data.chrono.startedAt=Date.now();
  data.session=Object.assign(defaultData().session,data.session||{}); data.session.runs=Object.assign(Object.fromEntries(activeFarmKeys().map(key=>[key,0])),data.session.runs||{});
  data.ui=Object.assign(defaultData().ui,data.ui||{});
  data.ui.monsterFavs=Array.isArray(data.ui.monsterFavs)?data.ui.monsterFavs:[];
  data.ui.collapsedActivityDays=Array.isArray(data.ui.collapsedActivityDays)?data.ui.collapsedActivityDays:[];
  data.hud=Object.assign(defaultData().hud,data.hud||{}); data.hud.windows=Object.assign({},data.hud.windows||{});
  data.achievements=normalizeAchievements(data.achievements);
  applySharedAchievementsToData();
  data.gallery=normalizeGallery(data.gallery);
  if(!data.createdAt)data.createdAt=new Date().toISOString();
  syncGlobalSoundSetting();
  data.activity=data.activity||[];
  data.undo=data.undo||[];
  ensureData();
  data.ui.capyMode=false;
  document.body.classList.remove("capy-mode");
  toomEnabled=false;
  document.body.classList.remove("toom-mode");
  $("#toomOverlay")?.classList.remove("toom-active");
  $("#toomOverlay")?.removeAttribute("style");
  ainaEnabled=false;
  document.body.classList.remove("aina-mode");
  $("#ainaOverlay")?.classList.remove("aina-active");
  $("#ainaOverlay")?.removeAttribute("style");
  applySettings();
  renderProfiles();
  achievementNotificationMuted=true;
  renderAll();
  achievementNotificationMuted=false;
  syncChronoTimerForProfile();
  setTimeout(()=>maybePromptInitialFamiliarChoice(),400);
}

function save(){
  try{
    ensureData();
    ensureStoreGallery();
    ensureStoreOptionsSharing();
    ensureStoreAchievementSharing();
    syncSharedSettingsFromData();
    syncSharedAchievementsFromData();
    store.active=activeProfile;
    if(!hasActiveProfile()){
      store.active=null;
      store.updatedAt=new Date().toISOString();
      store.lastSavedAt=store.updatedAt;
      localStorage.setItem("pykur_clean_v1",JSON.stringify(store));
      markSaveStatus(true);
      return;
    }
    const savedData=clone(data);
    if(store.optionsShared)savedData.settings=clone(store.sharedSettings);
    savedData.achievements=clone(store.sharedAchievements||data.achievements);
    if(savedData.ui)savedData.ui.capyMode=false;
    store.profiles[activeProfile].data=savedData;
    store.updatedAt=new Date().toISOString();
    store.lastSavedAt=store.updatedAt;
    syncSharedSettingsFromData();
    syncSharedAchievementsFromData();
    localStorage.setItem("pykur_clean_v1",JSON.stringify(store));
    markSaveStatus(true);
    scheduleCloudSave();
  }catch(err){
    console.error("Erreur de sauvegarde",err);
    markSaveStatus(false);
    toast("Erreur de sauvegarde","error","error");
  }
}

function formatSaveAge(date){
  if(!date)return "Sauvegarde en attente";
  const diff=Math.max(0,Date.now()-date.getTime());
  const seconds=Math.floor(diff/1000);
  if(seconds<5)return "Sauvegardé à l'instant";
  if(seconds<60)return `Sauvegardé il y a ${seconds} secondes`;
  const minutes=Math.floor(seconds/60);
  if(minutes<60)return `Sauvegardé il y a ${minutes} minute${minutes>1?"s":""}`;
  const hours=Math.floor(minutes/60);
  return `Sauvegardé il y a ${hours} heure${hours>1?"s":""}`;
}

function renderSaveStatus(){
  const el=$("#saveStatus");
  if(!el)return;
  el.classList.toggle("error",!!lastSaveError);
  el.classList.toggle("saved",!!lastSaveAt && !lastSaveError);
  el.textContent=lastSaveError?"Erreur de sauvegarde":formatSaveAge(lastSaveAt);
}

function markSaveStatus(success){
  lastSaveError=!success;
  if(success)lastSaveAt=new Date();
  renderSaveStatus();
}

function syncGlobalSoundSetting(){
  const muted=localStorage.getItem("pykur_global_muted");
  if(muted!==null)data.settings.sound=muted!=="1";
  const storedVolume=localStorage.getItem("pykur_global_volume");
  if(storedVolume!==null)data.settings.soundVolume=Math.max(0,Math.min(100,parseInt(storedVolume,10)||0));
}

function soundVolumeRatio(){
  return Math.max(0,Math.min(100,parseInt(data.settings.soundVolume,10)||0))/100;
}

function applySoundVolume(){
  const ratio=soundVolumeRatio();
  Object.values(sounds||{}).forEach(sound=>{
    if(sound)sound.volume=.14*ratio;
  });
  renderSoundSettings();
}

function setGlobalSound(enabled){
  data.settings.sound=!!enabled;
  localStorage.setItem("pykur_global_muted",enabled?"0":"1");
  applySettings();
  save();
}

function setGlobalSoundVolume(value){
  data.settings.soundVolume=Math.max(0,Math.min(100,parseInt(value,10)||0));
  if(data.settings.soundVolume>0)data.settings.sound=true;
  localStorage.setItem("pykur_global_volume",String(data.settings.soundVolume));
  localStorage.setItem("pykur_global_muted",data.settings.sound?"0":"1");
  applySoundVolume();
  applySettings();
  save();
}

function renderSoundSettings(){
  const value=Math.max(0,Math.min(100,parseInt(data.settings?.soundVolume,10)||0));
  if($("#soundVolumeRange"))$("#soundVolumeRange").value=value;
  if($("#soundVolumeValue"))$("#soundVolumeValue").textContent=`${value}%`;
  if($("#soundSettingsState"))$("#soundSettingsState").textContent=data.settings?.sound ? "Sons activés" : "Sons coupés";
  if($("#soundMuteButton"))$("#soundMuteButton").textContent=data.settings?.sound ? "Couper" : "Réactiver";
}

function openSoundSettings(){
  renderSoundSettings();
  openModal("soundSettingsModal");
}

const dofusState={
  stream:null,
  video:null,
  timer:null,
  cooldownUntil:0,
  configFarm:null,
  selectedFamiliar:null,
  configImage:null,
  configZone:null,
  dragging:false,
  dragStart:null,
  lastScore:null
};

function dofusSelectedFamiliarId(){
  return normalizeFamiliarId(dofusState.selectedFamiliar || activeFamiliarId());
}

function dofusSelectedFamiliar(){
  return FAMILIARS[dofusSelectedFamiliarId()] || activeFamiliar();
}

function dofusFarmKeys(){
  return dofusSelectedFamiliar().dungeons.map(dungeon=>dungeon.key);
}

function dofusDefaultConfig(){
  return clone(defaultData().dofusDetection);
}

function dofusRefKey(profileId,farm){
  return `dofus_ref_${profileId||activeProfile}_${farm}`;
}

function dofusOpenDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("pykur-dofus-detection",1);
    req.onupgradeneeded=()=>req.result.createObjectStore("refs");
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

async function dofusPutImage(key,dataUrl){
  const db=await dofusOpenDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("refs","readwrite");
    tx.objectStore("refs").put(dataUrl,key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

async function dofusGetImage(key){
  if(!key)return null;
  const db=await dofusOpenDB();
  const value=await new Promise((resolve,reject)=>{
    const tx=db.transaction("refs","readonly");
    const req=tx.objectStore("refs").get(key);
    req.onsuccess=()=>resolve(req.result||null);
    req.onerror=()=>reject(req.error);
  });
  db.close();
  return value;
}

async function dofusDeleteImage(key){
  if(!key)return;
  const db=await dofusOpenDB();
  await new Promise((resolve,reject)=>{
    const tx=db.transaction("refs","readwrite");
    tx.objectStore("refs").delete(key);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
  db.close();
}

function dofusSetStatus(status,detail=status){
  if(data?.dofusDetection)data.dofusDetection.status=status;
  const el=$("#dofusDetectionStatus");
  const detailEl=$("#dofusDetectionDetail");
  if(el){
    el.textContent=status;
    el.classList.remove("dofus-status-active","dofus-status-wait","dofus-status-stop");
    if(status==="Détection active")el.classList.add("dofus-status-active");
    if(status==="En attente" || status==="Cooldown")el.classList.add("dofus-status-wait");
    if(status==="Partage arrêté" || status==="Inactif")el.classList.add("dofus-status-stop");
  }
  if(detailEl)detailEl.textContent=detail;
}

function dofusCooldownMinimum(){
  return parseInt(dofusSelectedFamiliar().dofusCooldownMin,10)||10;
}

function dofusEffectiveCooldown(){
  const min=dofusCooldownMinimum();
  return Math.max(min,parseInt(data?.dofusDetection?.cooldownSeconds,10)||min);
}

function dofusRefreshOptions(){
  if(!data.dofusDetection)data.dofusDetection=dofusDefaultConfig();
  if(!dofusState.selectedFamiliar || !FAMILIARS[dofusState.selectedFamiliar])dofusState.selectedFamiliar=activeFamiliarId();
  if(!data.dofusDetection.refs)data.dofusDetection.refs={};
  let changed=false;
  const minCooldown=dofusCooldownMinimum();
  if(!data.dofusDetection.cooldownSeconds || Number(data.dofusDetection.cooldownSeconds)<minCooldown){
    data.dofusDetection.cooldownSeconds=minCooldown;
    changed=true;
  }
  const select=$("#dofusFamiliarSelect");
  if(select){
    select.innerHTML=Object.entries(FAMILIARS).map(([id,familiar])=>`<option value="${id}">${escapeHtml(familiar.label)}</option>`).join("");
    select.value=dofusSelectedFamiliarId();
  }
  const selectedFamiliar=dofusSelectedFamiliar();
  const selectedId=dofusSelectedFamiliarId();
  const summary=$("#dofusFamiliarSummary");
  if(summary){
    const followsActive=selectedId===activeFamiliarId();
    const dungeonCount=selectedFamiliar.dungeons.length;
    summary.innerHTML=`<div class="dofus-familiar-card">
      <img data-src="${assetPath(selectedFamiliar.logo||selectedFamiliar.image)}" alt="" decoding="async">
      <div>
        <strong>${escapeHtml(selectedFamiliar.label)}</strong>
        <small>${dungeonCount===1?"1 donjon à configurer":`${dungeonCount} donjons à configurer`} · cooldown minimum ${minCooldown}s</small>
        <div class="dofus-familiar-meta">
          <span class="dofus-familiar-pill">${escapeHtml(selectedFamiliar.objectiveLabel)}</span>
          <span class="dofus-familiar-pill">${followsActive?"Profil actif":"Configuration manuelle"}</span>
        </div>
      </div>
      ${followsActive?"":`<button class="btn btn-gray tooltip" type="button" data-dofus-use-active="1" data-tooltip="Revient au familier du profil actuellement sélectionné.">Revenir au profil actif</button>`}
    </div>`;
    if($("#optionsModal")?.classList.contains("show"))hydrateDeferredImages(summary);
    summary.querySelector("[data-dofus-use-active]")?.addEventListener("click",()=>{
      dofusState.selectedFamiliar=activeFamiliarId();
      dofusRefreshOptions();
    });
  }
  dofusFarmKeys().forEach(farm=>{
    if(!data.dofusDetection.refs[farm]){
      data.dofusDetection.refs[farm]={imageKey:null,zone:null,threshold:82};
      changed=true;
    }
  });
  const rows=$("#dofusReferenceRows");
  if(rows){
    const isSingle=selectedFamiliar.dungeons.length===1;
    rows.innerHTML=selectedFamiliar.dungeons.map(dungeon=>{
      const label=dungeon.fullLabel||dungeon.label;
      const ref=data.dofusDetection.refs[dungeon.key]||{};
      const ready=!!(ref.imageKey && ref.zone);
      const threshold=parseInt(ref.threshold,10)||82;
      return `<div class="option-row dynamic-dofus-ref-row ${isSingle?"is-single":""}">
        <div>
          <div class="dofus-ref-title"><strong>${escapeHtml(label)}</strong><span class="dofus-ref-status ${ready?"ready":"missing"}">${ready?"Référence prête":"À configurer"}</span></div>
          <small class="dofus-ref-summary">${ready?`Zone enregistrée · seuil ${threshold}%`:`Capturez une petite zone stable du dialogue ou de l'écran de fin.`}</small>
        </div>
        <button class="btn btn-blue tooltip" type="button" data-dofus-config-farm="${dungeon.key}" data-tooltip="Configure la référence personnalisée ${escapeHtml(label)}.">Configurer</button>
      </div>`;
    }).join("");
    rows.querySelectorAll("[data-dofus-config-farm]").forEach(btn=>btn.addEventListener("click",()=>dofusOpenConfig(btn.dataset.dofusConfigFarm)));
  }
  setToggleText("toggleDofusDetection",!!data.dofusDetection.enabled);
  if($("#dofusCooldownInput")){
    $("#dofusCooldownInput").min=String(minCooldown);
    $("#dofusCooldownInput").value=data.dofusDetection.cooldownSeconds||minCooldown;
  }
  if($("#dofusScanIntervalSelect"))$("#dofusScanIntervalSelect").value=String(data.dofusDetection.scanIntervalMs||1000);
  if($("#editDofusShortcut")){
    const key=keybinds().toggleDofusDetection;
    $("#editDofusShortcut").textContent=editingKeybind==="toggleDofusDetection"?"En attente":(key?formatShortcutLabel(key):"Désactivé");
    $("#editDofusShortcut").classList.toggle("btn-orange",editingKeybind==="toggleDofusDetection");
    $("#editDofusShortcut").classList.toggle("btn-blue",editingKeybind!=="toggleDofusDetection");
  }
  const hasStream=!!dofusState.stream;
  if(!data.dofusDetection.enabled)dofusSetStatus("Inactif","La détection automatique est désactivée.");
  else if(!hasStream)dofusSetStatus("Partage arrêté","Choisissez une fenêtre Dofus pour démarrer.");
  else if(Date.now()<dofusState.cooldownUntil)dofusSetStatus("Cooldown","Détection en pause pour éviter les doublons.");
  else dofusSetStatus("Détection active","Analyse périodique de la fenêtre partagée.");
  if(changed)save();
}

async function dofusChooseWindow(){
  if(!navigator.mediaDevices?.getDisplayMedia){
    toast("Partage de fenêtre non disponible dans ce navigateur.","error","error");
    return;
  }
  try{
    dofusStopStream(false);
    const stream=await navigator.mediaDevices.getDisplayMedia({video:{cursor:"never"},audio:false});
    const video=document.createElement("video");
    video.muted=true;
    video.playsInline=true;
    video.srcObject=stream;
    await video.play();
    dofusState.stream=stream;
    dofusState.video=video;
    stream.getVideoTracks().forEach(track=>{
      track.onended=()=>{
        dofusStopStream(true);
        data.dofusDetection.enabled=false;
        save();
        dofusRefreshOptions();
        toast("Partage Dofus arrêté.","warning","warning");
      };
    });
    dofusRefreshOptions();
    dofusStartLoop();
    toast("Fenêtre Dofus sélectionnée.","success","click");
  }catch(err){
    console.error(err);
    toast("Partage de fenêtre annulé.","warning","warning");
  }
}

function dofusStopStream(markStopped=true){
  dofusStopLoop();
  if(dofusState.stream){
    dofusState.stream.getTracks().forEach(track=>track.stop());
  }
  dofusState.stream=null;
  dofusState.video=null;
  if(markStopped)dofusSetStatus("Partage arrêté","Le partage de fenêtre est arrêté.");
}

function dofusStartLoop(){
  dofusStopLoop();
  if(!data.dofusDetection?.enabled || !dofusState.video)return dofusRefreshOptions();
  dofusState.timer=setInterval(dofusDetectionTick,parseInt(data.dofusDetection.scanIntervalMs,10)||1000);
  dofusRefreshOptions();
}

function dofusStopLoop(){
  if(dofusState.timer){
    clearInterval(dofusState.timer);
    dofusState.timer=null;
  }
}

function dofusCurrentFrame(){
  const video=dofusState.video;
  if(!video || !video.videoWidth || !video.videoHeight)return null;
  const canvas=document.createElement("canvas");
  canvas.width=video.videoWidth;
  canvas.height=video.videoHeight;
  canvas.getContext("2d").drawImage(video,0,0);
  return canvas.toDataURL("image/png");
}

function dofusLoadImage(dataUrl){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=dataUrl;
  });
}

function dofusCropDataUrlFromImage(img,zone){
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.round(zone.w));
  canvas.height=Math.max(1,Math.round(zone.h));
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,zone.x,zone.y,zone.w,zone.h,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/png");
}

async function dofusOpenConfig(farm){
  dofusState.configFarm=farm;
  dofusState.configZone=null;
  dofusState.configImage=null;
  $("#dofusConfigTitle").textContent=`Configurer ${familiarFarmLabel(farm)}`;
  $("#dofusThresholdInput").value=data.dofusDetection.refs[farm]?.threshold||82;
  $("#dofusConfigReadout").textContent="Capture ou importe une image, puis trace une zone.";
  dofusClearCanvas();
  const saved=await dofusGetImage(data.dofusDetection.refs[farm]?.imageKey);
  if(saved){
    dofusState.configImage=saved;
    dofusState.configZone=data.dofusDetection.refs[farm]?.zone||null;
    await dofusDrawConfigCanvas();
  }
  unlockAchievement("configure_dofus_detection");
  openModal("dofusConfigModal");
}

function dofusClearCanvas(){
  const canvas=$("#dofusConfigCanvas");
  if(!canvas)return;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#20160d";
  ctx.fillRect(0,0,canvas.width,canvas.height);
}

async function dofusDrawConfigCanvas(){
  const canvas=$("#dofusConfigCanvas");
  if(!canvas || !dofusState.configImage)return;
  const img=await dofusLoadImage(dofusState.configImage);
  canvas.width=img.naturalWidth;
  canvas.height=img.naturalHeight;
  const ctx=canvas.getContext("2d");
  ctx.drawImage(img,0,0);
  if(dofusState.configZone){
    const z=dofusState.configZone;
    ctx.save();
    ctx.strokeStyle="#facc15";
    ctx.lineWidth=Math.max(2,Math.round(canvas.width/500));
    ctx.fillStyle="rgba(250,204,21,.16)";
    ctx.fillRect(z.x,z.y,z.w,z.h);
    ctx.strokeRect(z.x,z.y,z.w,z.h);
    ctx.restore();
  }
  dofusUpdateConfigReadout();
}

function dofusCanvasPoint(event){
  const canvas=$("#dofusConfigCanvas");
  const rect=canvas.getBoundingClientRect();
  return {
    x:Math.max(0,Math.min(canvas.width,(event.clientX-rect.left)*canvas.width/rect.width)),
    y:Math.max(0,Math.min(canvas.height,(event.clientY-rect.top)*canvas.height/rect.height))
  };
}

function dofusUpdateConfigReadout(){
  const farm=dofusState.configFarm;
  const z=dofusState.configZone;
  const threshold=$("#dofusThresholdInput")?.value || data.dofusDetection.refs[farm]?.threshold || 82;
  $("#dofusConfigReadout").textContent=z
    ? `Zone ${Math.round(z.w)}x${Math.round(z.h)} - seuil ${threshold}%`
    : `Aucune zone sélectionnée - seuil ${threshold}%`;
}

async function dofusSetConfigImage(dataUrl){
  dofusState.configImage=dataUrl;
  dofusState.configZone=null;
  await dofusDrawConfigCanvas();
}

function dofusCaptureReference(){
  const frame=dofusCurrentFrame();
  if(!frame){
    toast("Choisissez d'abord la fenêtre Dofus.","warning","warning");
    return;
  }
  dofusSetConfigImage(frame);
  toast("Capture récupérée depuis Dofus.","success","click");
}

function dofusImportReference(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>dofusSetConfigImage(reader.result);
  reader.onerror=()=>toast("Impossible de lire l'image.","error","error");
  reader.readAsDataURL(file);
}

async function dofusSaveReference(){
  const farm=dofusState.configFarm;
  const zone=dofusState.configZone;
  if(!farm || !dofusState.configImage || !zone || zone.w<8 || zone.h<8){
    toast("Sélectionne une zone stable avant de sauvegarder.","warning","warning");
    return;
  }
  const img=await dofusLoadImage(dofusState.configImage);
  const key=dofusRefKey(activeProfile,farm);
  await dofusPutImage(key,dofusState.configImage);
  data.dofusDetection.refs[farm]={
    imageKey:key,
    zone:{x:Math.round(zone.x),y:Math.round(zone.y),w:Math.round(zone.w),h:Math.round(zone.h),sourceW:img.naturalWidth,sourceH:img.naturalHeight},
    threshold:parseInt($("#dofusThresholdInput").value,10)||82
  };
  save();
  dofusRefreshOptions();
  toast(`Référence ${familiarFarmLabel(farm)} sauvegardée.`,"success","click");
}

async function dofusScoreForFarm(farm){
  const ref=data.dofusDetection.refs[farm];
  if(!ref?.imageKey || !ref.zone || !dofusState.video)return null;
  const refData=await dofusGetImage(ref.imageKey);
  if(!refData)return null;
  const video=dofusState.video;
  const refImg=await dofusLoadImage(refData);
  const refCrop=dofusCropDataUrlFromImage(refImg,ref.zone);
  const scaleX=video.videoWidth/(ref.zone.sourceW||video.videoWidth);
  const scaleY=video.videoHeight/(ref.zone.sourceH||video.videoHeight);
  const zone={x:ref.zone.x*scaleX,y:ref.zone.y*scaleY,w:ref.zone.w*scaleX,h:ref.zone.h*scaleY};
  const currentCanvas=document.createElement("canvas");
  currentCanvas.width=Math.max(1,Math.round(zone.w));
  currentCanvas.height=Math.max(1,Math.round(zone.h));
  currentCanvas.getContext("2d").drawImage(video,zone.x,zone.y,zone.w,zone.h,0,0,currentCanvas.width,currentCanvas.height);
  const currentData=currentCanvas.toDataURL("image/png");
  const score=await dofusCompareImages(refCrop,currentData);
  return {farm,score,threshold:(ref.threshold||82)/100};
}

async function dofusCompareImages(aUrl,bUrl){
  const [a,b]=await Promise.all([dofusLoadImage(aUrl),dofusLoadImage(bUrl)]);
  const size=48;
  const canvas=document.createElement("canvas");
  canvas.width=size;
  canvas.height=size;
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(a,0,0,size,size);
  const aData=ctx.getImageData(0,0,size,size).data;
  ctx.clearRect(0,0,size,size);
  ctx.drawImage(b,0,0,size,size);
  const bData=ctx.getImageData(0,0,size,size).data;
  let diff=0;
  for(let i=0;i<aData.length;i+=4){
    const ag=(aData[i]+aData[i+1]+aData[i+2])/3;
    const bg=(bData[i]+bData[i+1]+bData[i+2])/3;
    diff+=Math.abs(ag-bg);
  }
  const max=(aData.length/4)*255;
  return Math.max(0,Math.min(1,1-(diff/max)));
}

async function dofusTestDetection(){
  if(!dofusState.video){
    toast("Choisissez d'abord la fenêtre Dofus.","warning","warning");
    return;
  }
  const scores=(await Promise.all(dofusFarmKeys().map(dofusScoreForFarm))).filter(Boolean);
  if(!scores.length){
    toast("Configure au moins une référence de donjon.","warning","warning");
    return;
  }
  scores.sort((a,b)=>b.score-a.score);
  const best=scores[0];
  const ok=best.score>=best.threshold;
  toast(`Score ${familiarFarmLabel(best.farm)} : ${Math.round(best.score*100)}% - ${ok?"Réussie":"Échec"}`,ok?"success":"warning",ok?"success":"warning");
  dofusSetStatus(data.dofusDetection.enabled?"Détection active":"En attente",`Dernier test : ${Math.round(best.score*100)}%`);
}

async function dofusDetectionTick(){
  if(!data.dofusDetection?.enabled || !dofusState.video)return;
  if(Date.now()<dofusState.cooldownUntil){
    dofusSetStatus("Cooldown",`${Math.ceil((dofusState.cooldownUntil-Date.now())/1000)}s restantes`);
    return;
  }
  const scores=(await Promise.all(dofusFarmKeys().map(dofusScoreForFarm))).filter(Boolean).sort((a,b)=>b.score-a.score);
  if(!scores.length){
    dofusSetStatus("En attente","Aucune référence configurée.");
    return;
  }
  const best=scores[0];
  dofusState.lastScore=best;
  if(best.score>=best.threshold){
    dofusState.cooldownUntil=Date.now()+(dofusEffectiveCooldown()*1000);
    dofusAutoAddRun(best.farm);
  }else{
    dofusSetStatus("Détection active",`Meilleur score : ${Math.round(best.score*100)}%`);
  }
}

function dofusAutoAddRun(farm){
  const previous=data.ui.farm||activeFarmKeys()[0]||"morose";
  const select=$("#farmSelect");
  data.ui.farm=farm;
  if(select)select.value=farm;
  addRun(1);
  data.ui.farm=previous;
  if(select)select.value=previous;
  save();
  renderAll();
  toast(`Fin de donjon détectée : +1 ${familiarFarmLabel(farm)}`,"success","pp");
  dofusSetStatus("Cooldown",`Cooldown ${dofusEffectiveCooldown()}s`);
}

function pushUndo(){
  data.undo.unshift(clone({runs:data.runs,mobs:data.mobs}));
  data.undo=data.undo.slice(0,20);
}

function addActivity(message,type="info"){
  data.activity.unshift({message,type,date:new Date().toISOString()});
  data.activity=data.activity.slice(0,80);
}

function galleryEventIds(){
  return ["rain","wind","heat","storm","fog","nightfall","sunray","keph","shadow","butterfly","corbac","chacha","larva","tofu","poop","coin","fragment","chest","bottle","resonance","unstableAura","shootingStar","sleepy","comet","awakening","fakeBug"];
}

const GALLERY_EVENT_EMOJIS={rain:"🌧️",wind:"🍃",heat:"☀️",storm:"⛈️",fog:"🌫️",nightfall:"🌙",sunray:"🌤️",keph:"👻",shadow:"👁️",butterfly:"🦋",corbac:"🐦",chacha:"🐾",larva:"🪱",tofu:"🐥",poop:"💩",coin:"🪙",fragment:"🔹",chest:"📦",bottle:"🍾",resonance:"✨",unstableAura:"🌀",shootingStar:"🌠",sleepy:"💤",comet:"☄️",awakening:"🌟",fakeBug:"⚠️"};
function galleryEventGroups(){
  const known=new Set();
  const groups=LIVING_ADMIN_GROUPS.map(group=>{
    group.ids.forEach(id=>known.add(id));
    return {title:group.title,ids:group.ids.filter(id=>galleryEventIds().includes(id))};
  }).filter(group=>group.ids.length);
  const extra=galleryEventIds().filter(id=>!known.has(id));
  if(extra.length)groups.push({title:"Autres",ids:extra});
  return groups;
}

function showGalleryTab(tab="archives"){
  const selected=["archives","events","settings"].includes(tab)?tab:"archives";
  if(selected==="archives" && (activeGallery()?.completedPykurs||[]).length)unlockAchievement("view_archive");
  if(selected==="events")unlockAchievement("view_event_collection");
  $$('[data-gallery-panel]').forEach(panel=>panel.classList.toggle("hidden",panel.dataset.galleryPanel!==selected));
  $$('[data-gallery-tab]').forEach(button=>{
    const active=button.dataset.galleryTab===selected;
    button.classList.toggle("active",active);
    button.setAttribute("aria-selected",String(active));
  });
  const body=$("#galleryModal .modal-body");
  if(body)body.scrollTop=0;
}

function showGalleryEvents(show){
  showGalleryTab(show?"events":"archives");
}

function markGalleryEventDiscovered(id){
  ensureData();
  if(!galleryEventIds().includes(id))return;
  const gallery=activeGallery();
  if(gallery.removedEvents)delete gallery.removedEvents[id];
  const now=new Date().toISOString();
  const item=gallery.eventsDiscovered[id]||{count:0,firstSeen:now,lastSeen:null};
  item.count=(item.count||0)+1;
  item.lastSeen=now;
  if(!item.firstSeen)item.firstSeen=now;
  gallery.eventsDiscovered[id]=item;
  syncActiveGallery(gallery);
  save();
}

function galleryMethod(){
  const farmKeys=activeFarmKeys();
  const activeRuns=farmKeys.map(farm=>({farm,value:data.runs?.[farm]||0}));
  const used=activeRuns.filter(item=>item.value>0);
  if(activeFamiliarId()==="pykur"){
    const m=data.runs?.morose||0,t=data.runs?.tynril||0;
    if(m>0 && t>0)return "Mixte";
    if(t>0)return "Tynril";
    return "Morose";
  }
  if(used.length>1)return "Mixte";
  if(used.length===1)return familiarFarmLabel(used[0].farm);
  return activeFamiliar().progressLabel || activeFamiliar().label;
}

function completedPykurStats(){
  const marks=(data.chrono?.marks||[]).map(m=>parseInt(m.time,10)).filter(t=>Number.isFinite(t)&&t>0);
  const totalChrono=marks.reduce((a,b)=>a+b,0);
  const best=marks.length?Math.min(...marks):0;
  const avg=marks.length?Math.round(totalChrono/marks.length):0;
  const finishedAt=new Date().toISOString();
  const startedAt=data.createdAt||finishedAt;
  const durationSeconds=Math.max(0,Math.floor((new Date(finishedAt)-new Date(startedAt))/1000));
  const runDetails=activeFarmKeys().map(farm=>({key:farm,label:familiarFarmLabel(farm),value:data.runs?.[farm]||0}));
  const morose=data.runs?.morose||0;
  const tynril=data.runs?.tynril||0;
  const method=galleryMethod();
  const pp=currentPP();
  return {
    familiarId:activeFamiliarId(),
    familiarLabel:activeFamiliar().label,
    progressLabel:activeProgressShort(),
    objectiveMax:activeProgressMax(),
    profileName:store?.profiles?.[activeProfile]?.name||"Profil",
    createdAt:startedAt,
    finishedAt,
    durationSeconds,
    runDetails,
    morose,
    tynril,
    pp,
    totalChrono,
    bestRun:best,
    avgRun:avg,
    method,
    image:getPykurImageSrc(pp),
    title:completedPykurTitle({durationSeconds,morose,tynril,totalChrono,bestRun:best,avgRun:avg,method})
  };
}

function galleryArchiveFamiliarId(item){
  return normalizeFamiliarId(item?.familiarId || "pykur");
}

function galleryArchiveFamiliar(item){
  return FAMILIARS[galleryArchiveFamiliarId(item)] || FAMILIARS.pykur;
}

function normalizeGalleryArchive(item,index=0){
  if(!item || typeof item!=="object")return item;
  const familiarId=galleryArchiveFamiliarId(item);
  const familiar=FAMILIARS[familiarId] || FAMILIARS.pykur;
  const progressLabel=item.progressLabel || familiar.progressShort || "PP";
  const objectiveMax=item.objectiveMax || familiar.objectiveMax || PP_MAX;
  const runLabel=key=>familiar.dungeons.find(dungeon=>dungeon.key===key)?.label || key;
  const runDetails=Array.isArray(item.runDetails) && item.runDetails.length
    ? item.runDetails.map(run=>({key:run.key,label:run.label||runLabel(run.key),value:parseInt(run.value,10)||0}))
    : familiar.dungeons.map(dungeon=>({key:dungeon.key,label:dungeon.label,value:parseInt(item[dungeon.key],10)||0}));
  return {
    ...item,
    number:item.number || index+1,
    familiarId,
    familiarLabel:item.familiarLabel || familiar.label,
    progressLabel,
    objectiveMax,
    pp:parseInt(item.pp,10)||0,
    runDetails
  };
}

function galleryArchiveRunTotal(item,key){
  const found=(item.runDetails||[]).find(run=>run.key===key);
  if(found)return parseInt(found.value,10)||0;
  return parseInt(item?.[key],10)||0;
}

function galleryArchiveMethod(item){
  if(item.method)return item.method;
  const runs=(item.runDetails||[]).filter(run=>(parseInt(run.value,10)||0)>0);
  if(item.familiarId==="pykur"){
    if((item.morose||0)>0 && (item.tynril||0)>0)return "Mixte";
    if((item.tynril||0)>0)return "Tynril";
    return "Morose";
  }
  if(runs.length>1)return "Mixte";
  return runs[0]?.label || item.progressLabel || "Progression";
}

function galleryArchiveFilter(){
  return data?.ui?.galleryFamiliarFilter || "all";
}

function setGalleryArchiveFilter(value){
  const allowed=["all",...Object.keys(FAMILIARS)];
  data.ui=data.ui||{};
  data.ui.galleryFamiliarFilter=allowed.includes(value)?value:"all";
  save();
  renderGallery();
}

function completedPykurTitle(stats){
  const totalRuns=(stats.morose||0)+(stats.tynril||0);
  if((activeGallery()?.completedPykurs||[]).length===0)return "Le Premier Éveil";
  if(stats.totalChrono && stats.avgRun && stats.avgRun<=120)return "Le Rapide";
  if(totalRuns>=350)return "Le Vétéran";
  if(stats.method==="Mixte")return "Le Méthodique";
  if(stats.tynril>0 && stats.tynril>=stats.morose)return "Le Stratège";
  if(stats.durationSeconds>=14*86400)return "Le Persévérant";
  return "Le Farmer";
}

function methodClass(method){
  const value=(method||"Mixte").toLowerCase();
  if(value.includes("morose"))return "method-morose";
  if(value.includes("tynril"))return "method-tynril";
  return "method-mixte";
}

function titleEmoji(title){
  if((title||"").includes("Stratège"))return "⚔️";
  if((title||"").includes("Persévérant"))return "📜";
  if((title||"").includes("Méthodique"))return "🎯";
  if((title||"").includes("Rapide"))return "⚡";
  if((title||"").includes("Éveil"))return "🏆";
  if((title||"").includes("Vétéran"))return "🏆";
  return "🏆";
}

let pykurCompletionLocked=false;

function formatLongDuration(seconds){
  seconds=Math.max(0,Math.floor(seconds||0));
  const days=Math.floor(seconds/86400);
  const hours=Math.floor((seconds%86400)/3600);
  const minutes=Math.floor((seconds%3600)/60);
  const parts=[];
  if(days)parts.push(`${days} jour${days>1?"s":""}`);
  if(hours)parts.push(`${hours} heure${hours>1?"s":""}`);
  if(minutes || !parts.length)parts.push(`${minutes} minute${minutes>1?"s":""}`);
  return parts.join(" ");
}

function completionLock(active){
  pykurCompletionLocked=!!active;
  ["plus","minus","resetButton","deleteProfile","createProfile","editRuns","editMobs","saveMobs"].forEach(id=>{
    const el=$("#"+id);
    if(el)el.disabled=pykurCompletionLocked;
  });
}

function isCompletionLocked(){
  return pykurCompletionLocked;
}

function renderCompletionModal(){
  const stats=completedPykurStats();
  const familiar=FAMILIARS[stats.familiarId] || activeFamiliar();
  const progressLabel=stats.progressLabel || familiar.progressShort || "PP";
  const heading=$("#completionModalTitle");
  if(heading)heading.textContent=`${familiar.label} terminé !`;
  const img=$("#completionPykurImage");
  if(img){
    img.src=assetPath(stats.image)||assetPath(familiar.image)||"./assets/images/aurapykur.png";
    img.alt=`${familiar.label} terminé`;
  }
  const title=$("#completionTitle");
  if(title)title.textContent=stats.title.toUpperCase();
  const box=$("#completionStats");
  if(box){
    const runCards=(stats.runDetails||[]).map(run=>({label:run.label,value:parseInt(run.value,10)||0}));
    box.innerHTML=[
      {label:"Créé le",value:formatDateShort(stats.createdAt)},
      {label:"Terminé le",value:formatDateShort(stats.finishedAt)},
      {label:"Temps réel écoulé",value:formatLongDuration(stats.durationSeconds)},
      ...runCards,
      {label:"Temps total farm",value:stats.totalChrono?formatDuration(stats.totalChrono):"-"},
      {label:`${progressLabel} finale`,value:`${stats.pp} ${progressLabel}`,featured:true},
      {label:"Meilleur run",value:stats.bestRun?formatDuration(stats.bestRun):"-"},
      {label:"Run moyen",value:stats.avgRun?formatDuration(stats.avgRun):"-"},
      {label:"Méthode dominante",value:`<span class="gallery-badge method-pill ${methodClass(stats.method)}">${stats.method}</span>`,html:true}
    ].map(item=>`<article class="completion-stat${item.featured?" featured":""}"><span>${item.label}</span><strong>${item.html?item.value:item.value}</strong></article>`).join("");
  }
  const stage=$("#completionPykurStage");
  if(stage && !stage.dataset.sparkles){
    stage.dataset.sparkles="1";
    for(let i=0;i<10;i++){
      const s=document.createElement("span");
      s.className="completion-sparkle";
      s.style.left=`${18+Math.random()*64}%`;
      s.style.top=`${14+Math.random()*68}%`;
      s.style.animationDelay=`${Math.random()*2.2}s`;
      stage.appendChild(s);
    }
  }
}

function maybeShowCompletionModal(){
  if(!data?.gallery || data.gallery.currentCycleArchived || data.gallery.currentCycleCompletionSeen || currentPP()<activeProgressMax())return;
  data.gallery.currentCycleCompletionSeen=true;
  renderCompletionModal();
  completionLock(true);
  openModal("pykurCompletionModal");
  save();
}

function closeCompletionModal(){
  completionLock(false);
  closeModal("pykurCompletionModal");
}

async function archiveAndRestartPykur(){
  if(currentPP()<activeProgressMax())return closeCompletionModal();
  const archived=maybeArchiveCompletedPykur();
  const settings=clone(data.settings||defaultData().settings);
  const achievements=clone(data.achievements||defaultData().achievements);
  const gallery=clone(data.gallery||defaultData().gallery);
  const dofusDetection=clone(data.dofusDetection||defaultData().dofusDetection);
  const familiarId=activeFamiliarId();
  data=defaultDataForFamiliar(familiarId);
  data.settings=settings;
  data.achievements=achievements;
  data.gallery=gallery;
  data.dofusDetection=dofusDetection;
  data.gallery.currentCycleArchived=false;
  data.gallery.currentCycleCompletionSeen=false;
  data.createdAt=new Date().toISOString();
  completionLock(false);
  save();
  closeModal("pykurCompletionModal");
  applySettings();
  renderAll();
  renderGallery();
  unlockAchievement("restart_after_completion");
  toast(archived?`${activeFamiliar().shortLabel} #${archived.number} archivé. Nouvelle aventure lancée.`:"Nouvelle aventure lancée.","success","unlock");
  if(archived)shareCommunityMilestone("familiar",{number:archived.number,title:archived.title,pp:archived.pp,progressLabel:archived.progressLabel,familiarId:archived.familiarId,familiarLabel:archived.familiarLabel,method:archived.method,createdAt:archived.createdAt,finishedAt:archived.finishedAt});
}

function maybeArchiveCompletedPykur(){
  if(!data?.gallery || data.gallery.currentCycleArchived || currentPP()<activeProgressMax())return null;
  const gallery=activeGallery();
  const stats=completedPykurStats();
  const count=(gallery.completedPykurs||[]).length+1;
  gallery.completedPykurs.push({
    id:`${activeFamiliarId()}_${Date.now()}`,
    number:count,
    ...stats
  });
  syncActiveGallery(gallery);
  data.gallery.currentCycleArchived=true;
  data.gallery.currentCycleCompletionSeen=true;
  addActivity(`${activeFamiliar().label} #${count} archivé dans la galerie`,"success");
  return gallery.completedPykurs[gallery.completedPykurs.length-1];
}

function renderGallery(){
  ensureData();
  const completed=$("#completedPykurGallery");
  const events=$("#discoveredEventsGallery");
  if(!completed || !events)return;
  const gallery=activeGallery();
  const archives=(gallery.completedPykurs||[]).map((item,index)=>normalizeGalleryArchive(item,index)).filter(Boolean);
  let filter=galleryArchiveFilter();
  const discovered=gallery.eventsDiscovered||{};
  const eventIds=galleryEventIds();
  const found=eventIds.filter(id=>discovered[id]).length;
  const sharedToggle=$("#gallerySharedToggle");
  if(sharedToggle)sharedToggle.checked=store?.galleryShared!==false;
  const globalStats=$("#galleryGlobalStats");
  const firstFinished=archives.map(item=>item.finishedAt).filter(Boolean).sort((a,b)=>new Date(a)-new Date(b))[0];
  const lastFinished=archives.map(item=>item.finishedAt).filter(Boolean).sort((a,b)=>new Date(b)-new Date(a))[0];
  const chronoTotal=archives.reduce((sum,item)=>sum+(parseInt(item.totalChrono,10)||0),0);
  const familiarCounts=archives.reduce((acc,item)=>{
    const familiarId=galleryArchiveFamiliarId(item);
    acc[familiarId]=(acc[familiarId]||0)+1;
    return acc;
  },{});
  if(filter!=="all" && !familiarCounts[filter]){
    filter="all";
    data.ui=data.ui||{};
    data.ui.galleryFamiliarFilter="all";
  }
  const filteredArchives=filter==="all" ? archives : archives.filter(item=>galleryArchiveFamiliarId(item)===filter);
  const topFamiliarEntries=Object.entries(familiarCounts).sort((a,b)=>b[1]-a[1] || (FAMILIARS[a[0]]?.label||a[0]).localeCompare(FAMILIARS[b[0]]?.label||b[0])).slice(0,4);
  if($("#galleryGlobalBadge"))$("#galleryGlobalBadge").textContent=archives.length+" familier"+(archives.length>1?"s":"");
  if(globalStats){
    const stats=[
      {label:"Familiers terminés",value:archives.length,important:true},
      ...topFamiliarEntries.map(([id,count])=>({label:FAMILIARS[id]?.label||id,value:count,important:true})),
      {label:"Temps total farm",value:chronoTotal?formatDuration(chronoTotal):"-"},
      {label:"Événements découverts",value:found+" / "+eventIds.length,important:true},
      {label:"Premier familier terminé",value:firstFinished?formatDateShort(firstFinished):"-"},
      {label:"Dernier familier terminé",value:lastFinished?formatDateShort(lastFinished):"-"}
    ];
    globalStats.innerHTML=stats.map(item=>'<article class="gallery-global-card'+(item.important?" important":"")+'"><span>'+item.label+'</span><strong>'+item.value+'</strong></article>').join("");
  }
  const filterBox=$("#galleryFamiliarFilters");
  if(filterBox){
    const familyOptions=Object.entries(familiarCounts)
      .sort((a,b)=>(FAMILIARS[a[0]]?.label||a[0]).localeCompare(FAMILIARS[b[0]]?.label||b[0]))
      .map(([id,count])=>({id,label:FAMILIARS[id]?.label||id,count}));
    const selectedFamily=filter;
    filterBox.innerHTML=`<button class="gallery-familiar-filter ${selectedFamily==="all"?"active":""}" type="button" data-gallery-familiar-filter="all">Tous <span>${archives.length}</span></button>`
      + (familyOptions.length?`<select class="gallery-familiar-select" id="galleryFamiliarSelect" aria-label="Choisir un familier dans la galerie"><option value="all">Choisir un familier</option>${familyOptions.map(option=>`<option value="${option.id}" ${selectedFamily===option.id?"selected":""}>${escapeHtml(option.label)} (${option.count})</option>`).join("")}</select>`:"");
  }
  $("#galleryPykurCount").textContent=filter==="all" ? archives.length : `${filteredArchives.length} / ${archives.length}`;
  completed.innerHTML=filteredArchives.length?filteredArchives.map(item=>{
    const familiar=galleryArchiveFamiliar(item);
    const chrono=item.totalChrono?formatDuration(item.totalChrono):"-";
    const best=item.bestRun?formatDuration(item.bestRun):"-";
    const avg=item.avgRun?formatDuration(item.avgRun):"-";
    const method=galleryArchiveMethod(item);
    const title=item.title||"Aventure terminee";
    const progressLabel=item.progressLabel||familiar.progressShort||"PP";
    const progressValue=parseInt(item.pp,10)||0;
    const runStats=(item.runDetails||[]).slice(0,4).map(run=>'<span>'+escapeHtml(run.label)+' <strong>'+(parseInt(run.value,10)||0)+'</strong></span>').join("");
    const archiveLabel=familiar.label+" #"+(item.number||"?");
    const image=assetPath(item.image)||assetPath(familiar.image)||"./assets/images/aurapykur.png";
    return '<article class="gallery-card gallery-pykur-card">'
      + '<img src="'+image+'" alt="" loading="lazy" decoding="async">'
      + '<div><h4 class="gallery-pykur-title">'+escapeHtml(archiveLabel)+'</h4>'
      + '<p class="gallery-title-badge"><strong>'+titleEmoji(title)+' '+title+'</strong></p>'
      + '<p><strong>'+(item.profileName||"Profil")+'</strong></p>'
      + '<p>Créé le '+formatDateShort(item.createdAt)+'</p>'
      + '<p>Terminé le '+formatDateShort(item.finishedAt)+'</p></div>'
      + '<div class="gallery-pykur-stats">'
      + '<span>Durée <strong>'+formatLongDuration(item.durationSeconds||0)+'</strong></span>'
      + runStats
      + '<span class="gallery-stat-pp">'+escapeHtml(progressLabel)+' finale <strong>'+progressValue+' '+escapeHtml(progressLabel)+'</strong></span>'
      + '<span>Farm <strong>'+chrono+'</strong></span>'
      + '<span>Best <strong>'+best+'</strong></span>'
      + '<span>Moyenne <strong>'+avg+'</strong></span>'
      + '</div>'
      + '<span class="gallery-badge '+methodClass(method)+'">'+method+'</span>'
      + '<button class="btn btn-red" type="button" data-gallery-delete-pykur="'+item.id+'">Supprimer</button>'
      + '</article>';
  }).join(""):'<div class="gallery-empty empty-state-card"><strong>Aucun familier archivé</strong><span>Les familiers terminés apparaîtront ici après leur archivage.</span></div>';
  const progress=$("#galleryEventProgress");
  if(progress)progress.style.width=eventIds.length?Math.round(found/eventIds.length*100)+"%":"0%";
  $("#galleryEventCount").textContent=found+" / "+eventIds.length+" d\u00e9couverts";
  events.innerHTML=galleryEventGroups().map(group=>{
    const discoveredInGroup=group.ids.filter(id=>discovered[id]).length;
    const cards=group.ids.map(id=>{
      const def=LIVING_EVENT_DEFS.find(ev=>ev.id===id);
      const item=discovered[id];
      if(!item)return '<article class="gallery-card locked">'
        + '<h4>❓ Événement inconnu</h4>'
        + '<p>Non découvert</p>'
        + '<button class="btn btn-gray" type="button" disabled>🔒 Non découvert</button>'
        + '</article>';
      return '<article class="gallery-card gallery-event-card">'
        + '<h4>'+(GALLERY_EVENT_EMOJIS[id]||"✨")+' '+(def?.label||id)+'</h4>'
        + '<p>Vu : '+(item.count||1)+' fois</p>'
        + '<p>Première apparition : '+formatDateShort(item.firstSeen)+'</p>'
        + '<p>Dernière apparition : '+formatDateShort(item.lastSeen)+'</p>'
        + '<div class="gallery-card-actions">'
        + '<button class="btn btn-blue" type="button" data-gallery-replay="'+id+'">Rejouer</button>'
        + '</div>'
        + '</article>';
    }).join("");
    return '<details class="gallery-event-category" open>'
      + '<summary><span>'+group.title+'</span><span>'+discoveredInGroup+' / '+group.ids.length+'</span></summary>'
      + '<div class="gallery-grid events">'+cards+'</div>'
      + '</details>';
  }).join("");
}

function replayGalleryEvent(id){
  if(!activeGallery()?.eventsDiscovered?.[id])return toast("Evenement non decouvert.","warning","warning");
  unlockAchievement("replay_gallery_event");
  livingStart(id,{admin:true,replay:true});
}

async function resetGallery(){
  const before=clone(activeGallery());
  if(!await showConfirm("",{
    title:"Réinitialiser la galerie",
    subtitle:"Tous les familiers archivés et événements découverts seront supprimés.",
    danger:true,
    okLabel:"Réinitialiser",
    html:`<p>Tous les familiers archivés et événements découverts seront supprimés.</p><p><strong>Cette action est irréversible.</strong></p>`
  }))return;
  const gallery=clone(defaultData().gallery);
  gallery.removedPykurs=Object.assign({},before.removedPykurs||{});
  (before.completedPykurs||[]).forEach(item=>{if(item?.id)gallery.removedPykurs[item.id]=new Date().toISOString()});
  gallery.removedEvents=Object.assign({},before.removedEvents||{});
  Object.keys(before.eventsDiscovered||{}).forEach(id=>gallery.removedEvents[id]=new Date().toISOString());
  gallery.currentCycleArchived=currentPP()>=activeProgressMax();
  gallery.currentCycleCompletionSeen=currentPP()>=activeProgressMax();
  syncActiveGallery(gallery);
  save();
  renderGallery();
  toastUndo("Galerie réinitialisée.","Annuler",()=>{
    syncActiveGallery(before);
    save();
    renderGallery();
    toast("Réinitialisation de la galerie annulée.","undo","undo");
  });
}

async function deleteGalleryPykur(id){
  if(!id || !await showConfirm("Supprimer ce familier de la galerie ?",{title:"Supprimer le familier",danger:true,okLabel:"Supprimer"}))return;
  const gallery=activeGallery();
  gallery.completedPykurs=(gallery.completedPykurs||[]).filter(item=>item.id!==id).map((item,index)=>({...item,number:index+1}));
  gallery.removedPykurs=Object.assign({},gallery.removedPykurs||{},{[id]:new Date().toISOString()});
  syncActiveGallery(gallery);
  save();
  renderGallery();
  toast("Familier supprimé de la galerie.","info","click");
}

function setSharedGallery(enabled){
  ensureStoreGallery();
  if(enabled && store.galleryShared===false)store.sharedGallery=mergeGalleries(store.sharedGallery,data.gallery);
  store.galleryShared=enabled;
  save();
  renderGallery();
  applySettings();
  toast(enabled?"Galerie partagee activee.":"Galerie locale activee.","info","click");
}

function toggleSharedGallery(event){
  const enabled=event?.target?.type==="checkbox" ? !!event.target.checked : !(store?.galleryShared!==false);
  setSharedGallery(enabled);
}

function setSharedOptions(enabled){
  ensureStoreOptionsSharing();
  store.optionsShared=!!enabled;
  if(store.optionsShared){
    store.sharedSettings=normalizeSettings(data.settings);
    syncSharedSettingsFromData();
  }
  save();
  applySettings();
  toast(store.optionsShared?"Options et raccourcis partagés entre profils.":"Options et raccourcis propres à chaque profil.","info","click");
}

function toggleSharedOptions(){
  setSharedOptions(!store?.optionsShared);
}

function formatDateShort(value){
  const d=new Date(value);
  if(isNaN(d))return "date inconnue";
  return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
}

function playSound(type="click"){
  if(!data.settings.sound)return;
  const s=sounds[type]||sounds.click;
  if(!s)return;
  try{
    s.volume=.14*soundVolumeRatio();
    s.currentTime=0;
    s.play().catch(()=>{});
  }catch(e){}
}

function playFinalAchievementSound(){
  if(!data?.settings?.sound)return;
  const s=sounds.final;
  if(!s)return;
  try{
    s.pause();
    s.currentTime=0;
    s.volume=.24*soundVolumeRatio();
    s.play().catch(err=>console.warn("[Succès FINAL] Son indisponible",err));
  }catch(e){}
}

function toast(msg,type="info",soundType=null){
  const visualType=type||"info";
  if(soundType!==false)playSound(soundType||visualType);

  if(!data.settings.notifications)return;
  const minorTypes=["info","system","blue","pause","undo","gray","profile"];
  if(data.settings.disableMinorNotifications && minorTypes.includes(visualType))return;

  const wrap=$("#toastWrap");

  while(wrap.children.length >= 6){
    wrap.firstElementChild?.remove();
  }

  const t=document.createElement("div");
  t.className="toast "+visualType;
  t.textContent=msg;
  if(data.settings.notificationsPersistent)t.title="Cliquer pour fermer";
  t.addEventListener("click",()=>t.remove());
  wrap.appendChild(t);

  const duration=parseInt(data.settings.notificationDuration,10)||3200;
  if(!data.settings.notificationsPersistent)setTimeout(()=>t.remove(),duration);
}

function toastUndo(message,undoLabel,onUndo,{duration=10000}={}){
  playSound("undo");
  const wrap=$("#toastWrap");
  if(!wrap)return;
  while(wrap.children.length >= 6)wrap.firstElementChild?.remove();
  const t=document.createElement("div");
  t.className="toast undo action";
  t.innerHTML=`<div class="toast-action-row"><span>${message}</span><button type="button">${undoLabel||"Annuler"}</button></div>`;
  const btn=t.querySelector("button");
  let used=false;
  const timer=setTimeout(()=>t.remove(),duration);
  btn.addEventListener("click",e=>{
    e.stopPropagation();
    if(used)return;
    used=true;
    clearTimeout(timer);
    t.remove();
    onUndo?.();
  });
  t.addEventListener("click",e=>{if(e.target===t)t.remove()});
  wrap.appendChild(t);
}

function createSafetyBackup(reason="import"){
  try{
    save();
    const key=`pykur_safety_backup_${Date.now()}`;
    localStorage.setItem(key,JSON.stringify({createdAt:new Date().toISOString(),reason,store}));
    localStorage.setItem("pykur_safety_backup_latest",key);
    return key;
  }catch(err){
    console.warn("Sauvegarde de sécurité impossible",err);
    return null;
  }
}

let activeAchievementCategory="PREMIERS PAS";
let achievementNotificationMuted=false;
let secretGateClicks=0;
let adminAchievementSounds=false;
let adminQuickReopenUntil=0;
let adminQuickReopenTimer=null;
const SECRET_FINAL_ACHIEVEMENTS=["master_secrets","true_100"];
const SECRET_COMPLETION_CATEGORIES=["EASTER EGGS","SECRETS"];

function achievementList({mainOnly=false,includeFinal=true}={}){
  return Object.entries(ACHIEVEMENTS||{}).filter(([,achievement])=>{
    if(!achievementAppliesToActiveFamiliar(achievement))return false;
    if(mainOnly)return MAIN_ACHIEVEMENT_CATEGORIES.includes(achievement.category);
    if(!includeFinal && achievement.category==="FINAL")return false;
    return true;
  });
}

function achievementAppliesToActiveFamiliar(achievement){
  return !!achievement;
}

function isSecretFinalAchievement(id){
  return SECRET_FINAL_ACHIEVEMENTS.includes(id);
}

function isAchievementVisibleToPlayer(id,achievement){
  ensureAchievements();
  if(!achievementAppliesToActiveFamiliar(achievement))return false;
  if(isSecretFinalAchievement(id) && !data.achievements.secretCategoriesUnlocked)return false;
  if((achievement.category==="EASTER EGGS" || achievement.category==="SECRETS") && !data.achievements.secretCategoriesUnlocked)return false;
  return true;
}

function isAchievementUnlocked(id){
  return !!data?.achievements?.unlocked?.[id];
}

function ensureAchievements(){
  if(!data.achievements)data.achievements=defaultData().achievements;
  data.achievements.unlocked=Object.assign({},data.achievements.unlocked||{});
  data.achievements.counters=Object.assign({happiosHover:0},data.achievements.counters||{});
  data.achievements.eggCollected=!!data.achievements.eggCollected;
  data.achievements.secretCategoriesUnlocked=!!data.achievements.secretCategoriesUnlocked;
}

function getMainAchievementsProgress(){
  ensureAchievements();
  const main=achievementList({mainOnly:true});
  const done=main.filter(([id])=>isAchievementUnlocked(id)).length;
  return {done,total:main.length};
}

function getSecretAchievementsProgress(){
  ensureAchievements();
  const secret=achievementList().filter(([,achievement])=>SECRET_COMPLETION_CATEGORIES.includes(achievement.category));
  const done=secret.filter(([id])=>isAchievementUnlocked(id)).length;
  return {done,total:secret.length};
}

function showAchievementToast(id){
  const achievement=ACHIEVEMENTS[id];
  if(!achievement || !data.settings.notifications)return;
  const wrap=$("#toastWrap");
  if(!wrap)return;
  while(wrap.children.length>=6)wrap.firstElementChild?.remove();
  const node=document.createElement("div");
  node.className="toast achievement-toast";
  const icon=achievement.icon
      ? `<img class="achievement-icon" src="${assetPath(achievement.icon)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'achievement-placeholder',textContent:'🏆'}))">`
    : `<span class="achievement-placeholder">🏆</span>`;
  node.innerHTML=`${icon}<span>Succès débloqué : <strong>${achievement.title}</strong></span>`;
  node.addEventListener("click",()=>node.remove());
  wrap.appendChild(node);
  const duration=parseInt(data.settings.notificationDuration,10)||3600;
  if(!data.settings.notificationsPersistent)setTimeout(()=>node.remove(),duration+900);
}

function checkTrackerAbsolute({silent=false}={}){
  const progress=getMainAchievementsProgress();
  if(progress.done<progress.total && isAchievementUnlocked("tracker_absolute")){
    delete data.achievements.unlocked.tracker_absolute;
    save();
    renderAchievements();
  }
  if(progress.total && progress.done>=progress.total && !isAchievementUnlocked("tracker_absolute")){
    unlockAchievement("tracker_absolute",{silent});
  }
}

function checkMasterSecrets({silent=false,removeInvalid=false}={}){
  const progress=getSecretAchievementsProgress();
  const complete=progress.total>0 && progress.done>=progress.total;
  if(!complete && removeInvalid && isAchievementUnlocked("master_secrets")){
    delete data.achievements.unlocked.master_secrets;
    return false;
  }
  if(!data.achievements.secretCategoriesUnlocked)return false;
  if(complete && !isAchievementUnlocked("master_secrets")){
    return unlockAchievement("master_secrets",{silent});
  }
  return false;
}

function checkTrue100({silent=false,removeInvalid=false,celebrate=!silent}={}){
  const complete=isAchievementUnlocked("tracker_absolute") && isAchievementUnlocked("master_secrets");
  if(!complete && removeInvalid && isAchievementUnlocked("true_100")){
    delete data.achievements.unlocked.true_100;
    return false;
  }
  if(!data.achievements.secretCategoriesUnlocked)return false;
  if(complete && !isAchievementUnlocked("true_100")){
    return unlockAchievement("true_100",{silent,celebrate});
  }
  return false;
}

function recalculateAchievements({silent=true}={}){
  ensureAchievements();
  const previousMute=achievementNotificationMuted;
  if(silent)achievementNotificationMuted=true;
  checkProgressAchievements();
  checkDungeonAchievements();
  checkTrackerAbsolute({silent});
  checkMasterSecrets({silent,removeInvalid:true});
  checkTrue100({silent,removeInvalid:true,celebrate:false});
  achievementNotificationMuted=previousMute;
  save();
  renderAchievements();
  adminRenderAchievements();
}

function triggerFinalFireworks(){
  const old=$(".final-fireworks-layer");
  if(old)old.remove();
  const layer=document.createElement("div");
  layer.className="final-fireworks-layer";
  const colors=["#ffd60a","#ff7a00","#00b4ff","#ff2d95","#22c55e","#a855f7","#f43f5e","#ffffff"];
  const bursts=[
    {x:20,y:24,d:.05},{x:78,y:22,d:.32},{x:50,y:34,d:.68},
    {x:28,y:56,d:1.05},{x:72,y:54,d:1.38},{x:44,y:18,d:1.82},
    {x:16,y:42,d:2.25},{x:84,y:42,d:2.58},{x:54,y:66,d:3.02},
    {x:34,y:30,d:3.46},{x:66,y:30,d:3.9},{x:24,y:68,d:4.36},
    {x:76,y:68,d:4.78},{x:50,y:48,d:5.2},{x:40,y:72,d:5.72}
  ];
  bursts.forEach((burst,index)=>{
    const core=document.createElement("div");
    core.className="final-firework-burst";
    core.style.setProperty("--x",`${burst.x}%`);
    core.style.setProperty("--y",`${burst.y}%`);
    core.style.setProperty("--delay",`${burst.d}s`);
    core.style.setProperty("--c",colors[index%colors.length]);
    layer.appendChild(core);
    const count=index%3===0?28:22;
    for(let i=0;i<count;i++){
      const p=document.createElement("span");
      p.className="final-firework-particle";
      const angle=((Math.PI*2)/count)*i+(Math.random()*.22);
      const distance=118+Math.random()*128;
      const size=7+Math.random()*7;
      p.style.setProperty("--x",`${burst.x}%`);
      p.style.setProperty("--y",`${burst.y}%`);
      p.style.setProperty("--dx",`${Math.cos(angle)*distance}px`);
      p.style.setProperty("--dy",`${Math.sin(angle)*distance}px`);
      p.style.setProperty("--delay",`${burst.d}s`);
      p.style.setProperty("--c",colors[(i+index)%colors.length]);
      p.style.width=`${size}px`;
      p.style.height=`${size}px`;
      layer.appendChild(p);
    }
  });
  document.body.appendChild(layer);
  layer.getBoundingClientRect();
  setTimeout(()=>layer.remove(),8400);
}

function unlockAchievement(id,{silent=false,celebrate=!silent}={}){
  if(achievementNotificationMuted)silent=true;
  ensureAchievements();
  const achievement=ACHIEVEMENTS[id];
  if(!achievement || isAchievementUnlocked(id))return false;
  if(!achievementAppliesToActiveFamiliar(achievement))return false;
  if(data.achievements.removedUnlocked)delete data.achievements.removedUnlocked[id];
  data.achievements.unlocked[id]={date:new Date().toISOString()};
  if(!silent){
    showAchievementToast(id);
    if(achievement.category==="FINAL")playFinalAchievementSound();
    else playSound("unlock");
    addActivity(`Succès débloqué : ${achievement.title}`,"success");
    shareCommunityMilestone("achievement",{id,title:achievement.title,category:achievement.category});
  }
  if(id==="true_100" && celebrate)triggerFinalFireworks();
  save();
  renderAchievements();
  if(achievement.category!=="FINAL")checkTrackerAbsolute({silent});
  if(achievement.category!=="FINAL" || SECRET_COMPLETION_CATEGORIES.includes(achievement.category))checkMasterSecrets({silent});
  checkTrue100({silent,celebrate});
  adminRenderAchievements();
  return true;
}

function unlockSecretCategories(){
  ensureAchievements();
  if(data.achievements.secretCategoriesUnlocked){
    renderAchievements();
    return false;
  }
  if(!data.achievements.eggCollected){
    toast("L'œuf scellé refuse de s'ouvrir : retrouve d'abord l'œuf caché sur le site.","error","error");
    return false;
  }
  data.achievements.secretCategoriesUnlocked=true;
  checkMasterSecrets({silent:false});
  checkTrue100({silent:false});
  save();
  renderAchievements();
  toast("🥚 Catégories secrètes débloquées.","rare","unlock");
  addActivity("Catégories secrètes débloquées","success");
  return true;
}

function tickSecretGate(){
  if(data.achievements?.secretCategoriesUnlocked){
    toast("Les archives secrètes sont déjà ouvertes.","info","click");
    return;
  }
  ensureAchievements();
  if(!data.achievements.eggCollected){
    toast("L'œuf scellé est vide. Trouve l'œuf caché sur le site avant de l'ouvrir.","error","error");
    document.body.classList.add("secret-gate-pulse");
    setTimeout(()=>document.body.classList.remove("secret-gate-pulse"),420);
    return;
  }
  unlockSecretCategories();
}

function collectHiddenSecretEgg(){
  ensureAchievements();
  if(data.achievements.eggCollected)return;
  data.achievements.eggCollected=true;
  save();
  renderHiddenSecretEgg();
  renderAchievements();
  toast("🥚 Œuf secret récupéré. Le sceau peut maintenant être ouvert.","rare","unlock");
  addActivity("Œuf secret récupéré","success");
}

function resetHiddenSecretEgg(){
  ensureAchievements();
  data.achievements.eggCollected=false;
  data.achievements.secretCategoriesUnlocked=false;
  save();
  renderHiddenSecretEgg();
  renderAchievements();
  toast("Commande admin : l'œuf secret a été remis en place.","warning","warning");
}

function renderHiddenSecretEgg(){
  const egg=$("#hiddenSecretEgg");
  if(!egg || !data)return;
  ensureAchievements();
  egg.classList.toggle("hidden",!!data.achievements.eggCollected);
}

function tickSecretGateOld(){
  secretGateClicks++;
  document.body.classList.add("secret-gate-pulse");
  setTimeout(()=>document.body.classList.remove("secret-gate-pulse"),420);
  if(secretGateClicks===1){
    toast("🥚 L'œuf réagit... Il attend une incantation.","info","click");
    return;
  }
  if(secretGateClicks===2){
    toast("Une gravure apparaît : ester eggs","rare","unlock");
    return;
  }
  secretGateClicks=0;
  unlockSecretCategories();
}

function accountProfileEntries(){
  return Object.values(store?.profiles||{}).filter(profile=>profile?.data);
}

function accountFamiliarProgress(profileData){
  const familiarId=normalizeFamiliarId(profileData?.familiarId||"pykur");
  const familiar=FAMILIARS[familiarId]||FAMILIARS.pykur;
  const runtime=familiarRuntime(familiarId);
  const mobsBySource=profileData?.mobs||{};
  let value=0;
  Object.entries(runtime.mobs||{}).forEach(([mobId,mob])=>{
    const need=parseInt(mob?.ppNeed,10)||0;
    if(!need || mob?.noProgress)return;
    const total=Object.values(mobsBySource).reduce((sum,source)=>sum+(parseInt(source?.[mobId],10)||0),0);
    const gainValue=Math.max(1,parseInt(mob?.gainValue,10)||1);
    value+=Math.floor(total/need)*gainValue;
  });
  return Math.min(value,parseInt(familiar?.objectiveMax,10)||90);
}

function sumNumericDeep(value){
  if(typeof value==="number")return Number.isFinite(value)?value:0;
  if(!value || typeof value!=="object")return 0;
  return Object.values(value).reduce((sum,item)=>sum+sumNumericDeep(item),0);
}

function accountAchievementStats(){
  const profiles=accountProfileEntries();
  const gallery=activeGallery();
  const archives=Array.isArray(gallery?.completedPykurs)?gallery.completedPykurs:[];
  const profileProgress=profiles.map(profile=>{
    const familiarId=normalizeFamiliarId(profile.data?.familiarId||"pykur");
    const familiar=FAMILIARS[familiarId]||FAMILIARS.pykur;
    const progress=accountFamiliarProgress(profile.data);
    const max=parseInt(familiar?.objectiveMax,10)||90;
    return {profile,familiarId,familiar,progress,max,ratio:max?progress/max:0};
  });
  const totalRuns=profiles.reduce((sum,profile)=>sum+sumNumericDeep(profile.data?.runs||{}),0);
  const distinctDungeons=new Set();
  const farmMethods=new Set();
  profiles.forEach(profile=>{
    const familiarId=normalizeFamiliarId(profile.data?.familiarId||"pykur");
    Object.entries(profile.data?.runs||{}).forEach(([key,value])=>{
      if((parseInt(value,10)||0)>0){
        distinctDungeons.add(key);
        farmMethods.add(familiarId+":"+key);
      }
    });
  });
  const totalMonsters=profiles.reduce((sum,profile)=>sum+sumNumericDeep(profile.data?.mobs||{}),0);
  const progressed=profileProgress.filter(item=>item.progress>0);
  const progressedFamilies=new Set(progressed.map(item=>item.familiarId));
  const progressedBonuses=new Set(progressed.map(item=>String(item.familiar?.progressShort||item.familiar?.progressLabel||"").toLowerCase()).filter(Boolean));
  const activeDays=new Set();
  let dailyMax=0;
  profiles.forEach(profile=>{
    const days=profile.data?.stats?.days||{};
    Object.entries(days).forEach(([day,details])=>{
      activeDays.add(day);
      dailyMax=Math.max(dailyMax,sumNumericDeep(details?.runs||details));
    });
  });
  return {profileCount:profiles.length,archivesCount:archives.length,maxProgressRatio:profileProgress.reduce((max,item)=>Math.max(max,item.ratio),0),totalRuns,distinctDungeons:distinctDungeons.size,farmMethods:farmMethods.size,totalMonsters,progressedFamilies:progressedFamilies.size,progressedBonuses:progressedBonuses.size,activeDays:activeDays.size,dailyMax};
}

function checkThresholds(value,pairs){
  pairs.forEach(([threshold,id])=>{
    if(value>=threshold)unlockAchievement(id);
  });
}

async function resetAchievements(){
  if(!await showConfirm("Remettre tous les succès à zéro ? Les catégories secrètes seront à nouveau masquées.",{title:"Reset succès",danger:true,okLabel:"Reset"}))return;
  const eggCollected=!!data.achievements?.eggCollected;
  const removedUnlocked=Object.assign({},data.achievements?.removedUnlocked||{});
  Object.keys(data.achievements?.unlocked||{}).forEach(id=>removedUnlocked[id]=new Date().toISOString());
  data.achievements=clone(defaultData().achievements);
  data.achievements.removedUnlocked=removedUnlocked;
  data.achievements.eggCollected=eggCollected;
  if(store){
    store.sharedAchievements=normalizeAchievements(data.achievements);
    store.achievementAccountMode=1;
    store.achievementsShared=true;
    Object.values(store.profiles||{}).forEach(profile=>{
      if(profile?.data)profile.data.achievements=clone(store.sharedAchievements);
    });
  }
  save();
  renderHiddenSecretEgg();
  renderAchievements();
  toast("Succès remis à zéro.","warning","warning");
  addActivity("Succès remis à zéro","warning");
  save();
}

function checkProgressAchievements(){
  const stats=accountAchievementStats();
  if(stats.profileCount>=1)unlockAchievement("create_profile");
  if(stats.maxProgressRatio>=0.10)unlockAchievement("progress_10");
  if(stats.maxProgressRatio>=0.50)unlockAchievement("progress_50");
  if(stats.maxProgressRatio>=0.90)unlockAchievement("progress_90");
  checkThresholds(stats.archivesCount,[[1,"complete_1"],[2,"complete_2"],[5,"complete_5"],[10,"complete_10"],[20,"complete_20"],[1,"archive_1"],[3,"archive_3"],[10,"archive_10"]]);
  checkThresholds(stats.progressedFamilies,[[2,"familiar_variety_2"],[5,"familiar_variety_5"]]);
  if(stats.profileCount>=5)unlockAchievement("profiles_5");
  checkThresholds(stats.progressedBonuses,[[3,"bonus_variety_3"],[5,"bonus_variety_5"]]);
  if(stats.farmMethods>=3)unlockAchievement("farm_methods_3");
  checkThresholds(stats.totalMonsters,[[1,"monster_1"],[100,"monster_100"],[1000,"monster_1000"],[5000,"monster_5000"],[10000,"monster_10000"]]);
  checkThresholds(stats.activeDays,[[2,"active_2_days"],[7,"active_7_days"],[30,"active_30_days"]]);
  checkThresholds(stats.dailyMax,[[10,"daily_runs_10"],[25,"daily_runs_25"],[50,"daily_runs_50"]]);
}

function checkDungeonAchievements(){
  const stats=accountAchievementStats();
  checkThresholds(stats.totalRuns,[[1,"dungeon_1"],[10,"dungeon_10"],[50,"dungeon_50"],[100,"dungeon_100"],[250,"dungeon_250"],[500,"dungeon_500"]]);
  checkThresholds(stats.distinctDungeons,[[3,"dungeon_variety_3"],[5,"dungeon_variety_5"],[10,"dungeon_variety_10"]]);
}

function visibleAchievementCategories(){
  ensureAchievements();
  return ACHIEVEMENT_CATEGORIES.filter(category=>{
    if(category==="EASTER EGGS" || category==="SECRETS")return data.achievements.secretCategoriesUnlocked;
    if(category==="FINAL"){
      return achievementList().some(([id,achievement])=>achievement.category==="FINAL" && isAchievementVisibleToPlayer(id,achievement));
    }
    return achievementList().some(([id,achievement])=>achievement.category===category && isAchievementVisibleToPlayer(id,achievement));
  });
}

function renderAchievements(){
  const cats=$("#achievementCategories");
  const list=$("#achievementList");
  const progressText=$("#achievementProgressText");
  if(!cats || !list || !progressText || !data)return;
  ensureAchievements();
  const visible=visibleAchievementCategories();
  if(!visible.includes(activeAchievementCategory))activeAchievementCategory=visible[0]||"PREMIERS PAS";
  const mainProgress=getMainAchievementsProgress();
  progressText.textContent=`Progression principale : ${mainProgress.done}/${mainProgress.total}`;
  const secretBtn=$("#unlockSecretAchievements");
  if(secretBtn){
    secretBtn.textContent=data.achievements.secretCategoriesUnlocked?"Secrets débloqués":"Œuf scellé";
    secretBtn.disabled=!!data.achievements.secretCategoriesUnlocked;
  }
  cats.innerHTML=visible.map(category=>{
    const entries=achievementList().filter(([id,achievement])=>achievement.category===category && isAchievementVisibleToPlayer(id,achievement));
    const done=entries.filter(([id])=>isAchievementUnlocked(id)).length;
    const percent=entries.length?Math.round(done/entries.length*100):0;
    return `<button class="achievement-cat ${category===activeAchievementCategory?"active":""}" type="button" data-achievement-category="${category}">
      <span>${category}</span><small>${done}/${entries.length}</small>
      <i style="--cat-progress:${percent}%"></i>
    </button>`;
  }).join("");
  const entries=achievementList().filter(([id,achievement])=>achievement.category===activeAchievementCategory && isAchievementVisibleToPlayer(id,achievement));
  list.innerHTML=entries.map(([id,achievement])=>{
    const unlocked=data.achievements.unlocked[id];
    const date=unlocked?.date ? new Date(unlocked.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "Verrouillé";
    const icon=achievement.icon
      ? `<img data-src="${assetPath(achievement.icon)}" alt="" decoding="async" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'achievement-placeholder',textContent:'🏆'}))">`
      : `<span class="achievement-placeholder">🏆</span>`;
    return `<article class="achievement-card ${unlocked?"unlocked":"locked"}">
      <div class="achievement-art">${icon}</div>
      <div>
        <h3>${achievement.title}</h3>
        <p>${achievement.description}</p>
        <span class="achievement-date">${date}</span>
      </div>
    </article>`;
  }).join("");
}

function setupSmartTooltips(){
  const tip=$("#smartTooltip");
  if(!tip)return;
  let active=null;

  function unlinkTarget(target){
    if(!target)return;
    const ids=(target.getAttribute("aria-describedby")||"").split(/\s+/).filter(id=>id && id!==tip.id);
    if(ids.length)target.setAttribute("aria-describedby",ids.join(" "));
    else target.removeAttribute("aria-describedby");
  }

  function linkTarget(target){
    const ids=new Set((target.getAttribute("aria-describedby")||"").split(/\s+/).filter(Boolean));
    ids.add(tip.id);
    target.setAttribute("aria-describedby",Array.from(ids).join(" "));
  }

  function place(target){
    if(window.innerWidth<760 || matchMedia("(hover: none)").matches){
      hide();
      return;
    }
    if(!target || !target.dataset.tooltip || !data.settings.tooltips)return;
    if(active!==target)unlinkTarget(active);
    active=target;
    const isDungeonEstimate=target.id==="moroseEstimateBox" || target.id==="tynrilEstimateBox";
    tip.classList.toggle("is-dungeon-estimate",isDungeonEstimate);
    tip.replaceChildren();
    if(target.dataset.tooltipTitle){
      const title=document.createElement("strong");
      title.className="smart-tooltip-title";
      title.textContent=target.dataset.tooltipTitle;
      tip.appendChild(title);
    }
    const text=document.createElement("span");
    text.className="smart-tooltip-text";
    text.textContent=target.dataset.tooltip;
    tip.appendChild(text);
    tip.setAttribute("aria-label",[target.dataset.tooltipTitle,target.dataset.tooltip].filter(Boolean).join(". "));
    tip.setAttribute("aria-hidden","false");
    linkTarget(target);
    tip.classList.add("show");

    const rect=target.getBoundingClientRect();
    const margin=12;
    const gap=10;
    const viewportW=window.innerWidth;
    const viewportH=window.innerHeight;

    tip.style.left="0px";
    tip.style.top="0px";
    tip.style.maxWidth=Math.min(isDungeonEstimate?390:360,viewportW-(margin*2))+"px";

    const tipRect=tip.getBoundingClientRect();
    const side=(rect.top-tipRect.height-gap>margin)?"top":"bottom";
    let left=rect.left+(rect.width/2)-(tipRect.width/2);
    left=Math.max(margin,Math.min(left,viewportW-tipRect.width-margin));

    let top=side==="top"
      ? rect.top-tipRect.height-gap
      : rect.bottom+gap;

    if(top+tipRect.height>viewportH-margin){
      top=Math.max(margin,viewportH-tipRect.height-margin);
    }

    const arrowX=Math.max(16,Math.min(rect.left+(rect.width/2)-left,tipRect.width-16));
    tip.dataset.side=side;
    tip.style.left=left+"px";
    tip.style.top=top+"px";
    tip.style.setProperty("--arrow-x",arrowX+"px");
  }

  function hide(){
    unlinkTarget(active);
    active=null;
    tip.classList.remove("show");
    tip.setAttribute("aria-hidden","true");
    tip.removeAttribute("aria-label");
  }

  document.addEventListener("pointerover",e=>{
    const target=e.target.closest(".tooltip[data-tooltip]");
    if(target)place(target);
  });

  document.addEventListener("pointerout",e=>{
    if(active && !e.relatedTarget?.closest?.(".tooltip[data-tooltip]"))hide();
  });

  document.addEventListener("focusin",e=>{
    const target=e.target.closest(".tooltip[data-tooltip]");
    if(target)place(target);
  });

  document.addEventListener("focusout",hide);
  window.addEventListener("scroll",()=>{if(active)place(active)},{passive:true});
  window.addEventListener("resize",()=>{if(active)place(active)});
}

const helpSteps=[
  {
    selector:".progress-title",
    title:"Progression du familier",
    text:"Cette zone montre votre progression globale vers l'objectif du familier actif. Quand vous gagnez de la progression, la barre et le pourcentage se mettent à jour."
  },
  {
    selector:".chrono-card",
    title:"Temps de run",
    text:"C’est le chrono pour un seul donjon. Lancez-le au début d’un donjon, puis enregistrez le temps à la fin pour suivre vos meilleurs temps."
  },
  {
    selector:".session-card",
    title:"Session de farm",
    text:"La session mesure toute votre séance de jeu : durée totale, nombre de donjons et progression gagnée. Elle accompagne le chrono du donjon en cours."
  },
  {
    selector:".farm-toggle",
    title:"Donjon actif",
    text:"Choisissez Morose ou Tynril ici. Le bouton + Run utilisera toujours le donjon actif."
  },
  {
    selector:".run-command-grid",
    title:"Ajouter ou retirer une run",
    text:"+ Run ajoute un donjon et met automatiquement à jour les monstres, la progression, les statistiques et la session. Le bouton - corrige un clic de trop."
  },
  {
    selector:".action-groups",
    title:"Actions secondaires",
    text:"Stats, Historique, Modifier donjon, Annuler et Reset sont regroupés ici. Les actions dangereuses restent séparées pour éviter les erreurs."
  },
  {
    selector:".dungeon-summary",
    title:"Résumé des donjons",
    text:"Ces cartes montrent ce qui est déjà fait, ce qu’il reste et le temps estimé. La carte dorée indique le donjon actif."
  },
  {
    selector:".quick-projection",
    title:"Projection rapide",
    text:"Cette carte estime combien de donjons il faut pour obtenir le prochain gain de progression. Le bouton Projection ouvre les prévisions complètes."
  },
  {
    selector:"#monsterLauncher",
    title:"Monstres",
    text:"Ouvre le détail des monstres tués par source. C'est cette base qui sert au calcul de la progression."
  }
];

const legacyGuideHelpSteps=[
  {
    title:"Objectif du tracker",
    html:`<p><strong>Pykur Tracker</strong> sert à suivre votre progression RPG autour du Pykur : donjons Morose/Tynril, PP, temps chrono, projections, historique, monstres et sauvegardes.</p><p>L'idée simple : vous choisissez le donjon actif, vous ajoutez un donjon terminé, et le tracker synchronise le reste.</p>`
  },
  {
    title:"Demarrage rapide",
    html:`<ol><li>Choisissez ou créez votre <strong>profil</strong>.</li><li>Sélectionnez le donjon actif : <strong>Morose</strong> ou <strong>Tynril</strong>.</li><li>Cliquez sur <strong>+ Run</strong> après un donjon terminé.</li><li>Utilisez <strong>-</strong> seulement pour corriger une erreur.</li><li>Surveillez la barre de progression, les PP, les restants et l'historique.</li></ol>`
  },
  {
    title:"Progression et PP",
    html:`<p>La progression indique votre avancement vers l'objectif du familier actif. Les donjons ajoutent les monstres associés, puis les gains sont recalculés automatiquement.</p><p>À 100%, le familier est considéré terminé : l'ajout de donjons est bloqué pour éviter de fausser la sauvegarde. Vous pouvez retirer un donjon si vous devez corriger et repasser sous 100%.</p>`
  },
  {
    title:"Donjons actifs",
    html:`<p>Chaque familier possède ses propres donjons, compteurs, monstres, statistiques et estimations. Le donjon actif contrôle ce que font + Run, -, le chrono et les projections rapides.</p><p>Chaque ajout ou retrait synchronise progression, historique, statistiques et sauvegarde.</p>`
  },
  {
    title:"Chronometre",
    html:`<p>Le chrono mesure une run precise. Lance-le au debut du donjon, mets-le en pause si besoin, puis clique sur <strong>Enregistrer</strong> a la fin pour garder le temps.</p><p>Ces temps servent aux statistiques et peuvent alimenter le <strong>calcul automatique des donjons restants</strong> quand l'option est active.</p>`
  },
  {
    title:"Calcul automatique",
    html:`<p>Cette option est une <strong>estimation non destructive</strong>. Elle combine le chrono, les temps moyens Morose/Tynril et les donjons déjà faits pour afficher combien de donjons restent probablement.</p><p>Elle se remet à jour après +, -, changement de donjon, chrono, modification des temps moyens, import, changement de profil et rechargement de page.</p>`
  },
  {
    title:"Projections",
    html:`<p>Les projections vous aident à anticiper : prochain gain, objectif 100%, temps estimé et rendement. Ce sont des prévisions basées sur vos compteurs et vos temps moyens, pas une modification de vos données.</p>`
  },
  {
    title:"Historique et statistiques",
    html:`<p>L'historique conserve les événements importants : donjons ajoutés ou retirés, gains obtenus, chrono, imports, resets et modifications. Les statistiques regroupent les tendances du profil : donjons, sessions, monstres et temps.</p><p>Utilisez les filtres de l'historique pour retrouver rapidement un type d'action.</p>`
  },
  {
    title:"Monstres",
    html:`<p>Le panneau Monstres montre les valeurs et les quantités par source : donjons, zone et total. Il sert à comprendre d'où viennent vos gains et à corriger manuellement les compteurs si nécessaire.</p>`
  },
  {
    title:"Options et confort",
    html:`<p>Options regroupe les reglages utiles : mode nuit, animations, infobulles, HUD, chrono, notifications, accessibilite et sauvegarde cloud.</p><p>Le bouton son global coupe ou reactive les sons du tracker, y compris notifications, chrono, milestones et futurs sons.</p>`
  },
  {
    title:"Profils et sauvegardes",
    html:`<p>Chaque profil conserve ses propres donjons, monstres, historique, chrono, statistiques et options de profil. Le changement de profil recharge ses données sans les mélanger.</p><p>Les membres synchronisent automatiquement leur progression avec la sauvegarde cloud. En mode invité, la sauvegarde reste locale au navigateur et peut être perdue si le cache est supprimé.</p>`
  },
  {
    title:"Raccourcis utiles",
    html:`<ul><li><strong>+</strong> ajoute une run au donjon actif.</li><li><strong>-</strong> retire une run du donjon actif.</li><li><strong>Tab</strong> alterne Morose/Tynril.</li><li><strong>S</strong> lance ou met en pause le chrono, <strong>R</strong> le remet a zero.</li><li><strong>H</strong>, <strong>O</strong>, <strong>P</strong>, <strong>B</strong> ouvrent historique, options, projections et monstres.</li><li>Les raccourcis sont configurables dans Options > Raccourcis clavier et ne se declenchent pas dans les champs texte.</li><li><strong>Echap</strong> ferme l'aide, les modales ou une confirmation. <strong>Entree</strong> valide l'action principale dans les dialogues.</li></ul>`
  }
];

const modernHelpSteps=[
  {
    icon:"📖",
    title:"Bienvenue sur Pykur Tracker",
    html:`<p><strong>Familier Tracker</strong> est un outil de suivi conçu pour accompagner votre progression autour de vos familiers.</p><div class="help-card-grid"><div class="help-card"><strong>Progression</strong><span>Suivez vos donjons, vos gains de caractéristique et vos objectifs.</span></div><div class="help-card"><strong>Analyse</strong><span>Consultez vos statistiques, votre historique et vos projections.</span></div><div class="help-card"><strong>Souvenirs</strong><span>Retrouvez vos familiers terminés et votre collection dans la galerie.</span></div></div>`
  },
  {
    icon:"⚡",
    title:"Comment utiliser le tracker ?",
    html:`<p>Le fonctionnement du tracker est volontairement simple.</p><ol><li>Choisissez le donjon actif.</li><li>Lancez votre session de farm.</li><li>Effectuez vos donjons.</li><li>Cliquez sur <strong>+ Run</strong> après chaque donjon terminé.</li><li>Le tracker met automatiquement à jour votre progression.</li></ol><div class="help-flow"><span>Morose / Tynril</span><em>↓</em><span>+ Run</span><em>↓</em><span>Progression automatique</span></div>`
  },
  {
    icon:"🏰",
    title:"Choisir le donjon actif",
    html:`<p>Le tracker peut suivre <strong>Morose</strong> et <strong>Tynril</strong>.</p><p>Le donjon sélectionné détermine le compteur utilisé, les projections, les statistiques enregistrées et la progression associée.</p><div class="help-card-grid"><div class="help-card"><strong>Morose</strong><span>Utilisé pour les donjons Morose et les estimations correspondantes.</span></div><div class="help-card"><strong>Tynril</strong><span>Utilisé pour les donjons Tynril, avec ses propres compteurs et limites.</span></div></div>`
  },
  {
    icon:"➕",
    title:"Ajouter un donjon terminé",
    html:`<p>Le bouton <strong>+ Run</strong> permet d'ajouter un donjon terminé.</p><p>Après chaque donjon, la progression, les statistiques, l'historique, les projections et les réactions du familier sont mis à jour automatiquement.</p><div class="help-card"><strong>Exemple</strong><span>Vous terminez le donjon actif, vous cliquez sur <strong>+ Run</strong>, puis le tracker s'occupe du reste.</span></div>`
  },
  {
    icon:"➖",
    title:"Corriger une erreur",
    html:`<p>Le bouton <strong>- Run</strong> permet de retirer un donjon ajouté par erreur.</p><p>Utilisez-le uniquement pour corriger une mauvaise saisie. Toutes les statistiques sont automatiquement recalculées.</p>`
  },
  {
    icon:"⏱️",
    title:"Mesurer votre farm",
    html:`<p>Le chronomètre permet de mesurer un donjon, calculer des estimations et suivre vos sessions.</p><p>Il reste facultatif : le tracker fonctionne également sans lui.</p>`
  },
  {
    icon:"🔮",
    title:"Suivre votre progression",
    html:`<p>La progression représente l'objectif principal du tracker.</p><p>Les projections permettent d'estimer le nombre de donjons restants, le temps restant et la progression future. Elles vous aident à planifier votre farm.</p>`
  },
  {
    icon:"✨",
    title:"Votre compagnon de progression",
    html:`<p>Le Pykur évolue avec votre progression.</p><p>Il peut réagir à vos actions, gagner en progression, déclencher des événements et atteindre son objectif final. Le Pykur constitue le cœur du tracker.</p>`
  },
  {
    icon:"👥",
    title:"Gérer plusieurs progressions",
    html:`<p>Les profils permettent de suivre plusieurs familiers indépendants.</p><div class="help-card-grid"><div class="help-card"><strong>Création</strong><span>Commencez une nouvelle progression.</span></div><div class="help-card"><strong>Renommage</strong><span>Identifiez clairement chaque profil.</span></div><div class="help-card"><strong>Sauvegarde individuelle</strong><span>Chaque profil conserve ses propres données.</span></div></div>`
  },
  {
    icon:"📊",
    title:"Analyser votre progression",
    html:`<p>Les statistiques regroupent vos donjons, vos performances et votre progression.</p><p>L'historique conserve vos actions importantes afin de comprendre ce qui a changé sur votre profil.</p>`
  },
  {
    icon:"🏆",
    title:"Débloquer des objectifs",
    html:`<p>Les succès récompensent votre progression.</p><p>Ils sont organisés en catégories : progression, utilisation, événements, secrets et finaux. Certains succès nécessitent plusieurs étapes avant d'être obtenus.</p>`
  },
  {
    icon:"🖼️",
    title:"Conserver vos aventures",
    html:`<p>La galerie archive automatiquement les familiers terminés.</p><p>Vous pouvez consulter les anciennes progressions, les titres obtenus, les statistiques finales et les événements découverts. La galerie constitue la mémoire du tracker.</p>`
  },
  {
    icon:"🌙",
    title:"Donner vie au tracker",
    html:`<p>Le tracker contient des événements spéciaux, des apparitions, des animations et une ambiance passive.</p><p>Les événements découverts sont ensuite conservés dans la galerie. Les ambiances passives restent décoratives et discrètes.</p>`
  },
  {
    icon:"🧭",
    title:"Automatiser le suivi",
    html:`<p>La détection Dofus permet d'ajouter automatiquement des runs.</p><p>Elle fonctionne avec un partage de fenêtre, une capture de référence, une analyse automatique et la détection du dialogue final. Cette fonctionnalité est totalement facultative.</p>`
  },
  {
    icon:"💾",
    title:"Conserver votre progression",
    html:`<p>Le tracker dispose de sauvegardes, d'export, d'import et d'une compatibilité PC/Web.</p><p>Vous pouvez transférer votre progression entre différentes versions du tracker.</p>`
  }
];

const helpFinalStep={
  icon:"🌟",
  title:"Bonne aventure",
  html:`<p>Votre familier est désormais prêt à évoluer.</p><p>Nous vous souhaitons un excellent farm, de nombreux gains et beaucoup de familiers terminés.</p>`
};

function activeHelpSteps(){
  return buildModernHelpSteps();
}

function buildModernHelpSteps(){
  const familiar=activeFamiliar();
  const dungeons=familiar.dungeons||[];
  const dungeonNames=dungeons.map(dungeon=>dungeon.fullLabel||dungeon.label).join(", ");
  const firstDungeon=dungeons[0]?.fullLabel || dungeons[0]?.label || "le donjon actif";
  const unit=familiar.progressShort || "progression";
  const progressLabel=familiar.progressLabel || "Progression";
  const farmMethods=(familiar.farmMethods||dungeons.map(dungeon=>dungeon.fullLabel||dungeon.label)).join(" · ");
  const specialDungeon=dungeons.find(dungeon=>dungeon.special==="salleAbrakne");
  const dungeonCopy=dungeons.length>1
    ? `Ce profil peut suivre plusieurs méthodes : <strong>${escapeHtml(dungeonNames)}</strong>. Le choix actif détermine le compteur utilisé, le chrono, les projections et les monstres ajoutés.`
    : `Ce profil suit principalement <strong>${escapeHtml(firstDungeon)}</strong>. Le choix actif reste affiché pour garder le même fonctionnement entre tous les familiers.`;
  const specialCopy=specialDungeon
    ? `<div class="help-card"><strong>${escapeHtml(specialDungeon.fullLabel)}</strong><span>Pour la boucle spéciale, cliquez sur <strong>Arrivé à la salle Abrakne</strong> après les premières salles. Ensuite, <strong>+ Run</strong> ajoute les boucles Abrakne jusqu'à ce que vous sortiez de la salle.</span></div>`
    : "";
  return [
    {
      icon:"📖",
      title:"Bienvenue sur Familier Tracker",
      html:`<p><strong>Familier Tracker</strong> accompagne votre progression autour du profil actif : <strong>${escapeHtml(familiar.label)}</strong>.</p><div class="help-card-grid"><div class="help-card"><strong>${escapeHtml(progressLabel)}</strong><span>Suivez vos gains de ${escapeHtml(unit)}, votre objectif et vos méthodes de farm.</span></div><div class="help-card"><strong>Donjons</strong><span>${escapeHtml(farmMethods)}</span></div><div class="help-card"><strong>Souvenirs</strong><span>Conservez vos familiers terminés, vos statistiques et votre collection.</span></div></div>`
    },
    {
      icon:"⚡",
      title:"Utilisation rapide",
      html:`<p>Le fonctionnement reste simple, quel que soit le familier.</p><ol><li>Choisissez le donjon ou la méthode active.</li><li>Lancez votre session de farm si vous utilisez le chrono.</li><li>Effectuez votre combat ou votre donjon.</li><li>Cliquez sur <strong>+ Run</strong> après validation.</li><li>Le tracker met à jour les monstres, la ${escapeHtml(progressLabel.toLowerCase())}, les projections et la sauvegarde.</li></ol><div class="help-flow"><span>${escapeHtml(firstDungeon)}</span><em>↓</em><span>+ Run</span><em>↓</em><span>${escapeHtml(progressLabel)} automatique</span></div>`
    },
    {
      icon:"🏰",
      title:"Choisir le donjon actif",
      html:`<p>${dungeonCopy}</p>${specialCopy}<div class="help-card-grid">${dungeons.map(dungeon=>`<div class="help-card"><strong>${escapeHtml(dungeon.label)}</strong><span>${escapeHtml(dungeon.fullLabel||dungeon.label)}</span></div>`).join("")}</div>`
    },
    {
      icon:"➕",
      title:"Ajouter une progression",
      html:`<p>Le bouton <strong>+ Run</strong> ajoute la méthode active et met à jour les monstres associés.</p><p>Si une progression est gagnée, le badge <strong>${escapeHtml(formatProgressGain(1))}</strong> apparaît près de votre familier et les statistiques sont recalculées.</p>`
    },
    {
      icon:"➖",
      title:"Corriger une erreur",
      html:`<p>Le bouton <strong>- Run</strong> retire la dernière saisie de la méthode active.</p><p>Utilisez-le pour corriger un clic de trop. Les monstres, la ${escapeHtml(progressLabel.toLowerCase())}, les statistiques et l'historique sont recalculés.</p>`
    },
    {
      icon:"⏱️",
      title:"Chronomètre et session",
      html:`<p>Le chronomètre mesure le combat ou le donjon en cours. La session mesure votre séance complète de farm.</p><p>Ces temps restent facultatifs, mais ils améliorent les estimations et les moyennes.</p>`
    },
    {
      icon:"🔮",
      title:"Projections",
      html:`<p>La projection estime le prochain gain de ${escapeHtml(unit)}, l'objectif final et le temps restant selon vos compteurs actuels.</p><p>Le simulateur de donjons ne modifie pas vos données : il sert uniquement à tester des scénarios.</p>`
    },
    {
      icon:"✨",
      title:"Votre familier",
      html:`<p>${escapeHtml(familiar.label)} réagit à vos actions et affiche sa progression vers <strong>${escapeHtml(familiar.objectiveLabel)}</strong>.</p><p>Les événements vivants, les animations et les ambiances restent visuels et ne bloquent pas l'utilisation du tracker.</p>`
    },
    {
      icon:"👥",
      title:"Profils",
      html:`<p>Chaque profil possède son familier, son nom, ses donjons, ses monstres, son chrono, ses statistiques et son historique.</p><p>Quand vous créez un nouveau profil, choisissez d'abord le familier puis donnez un nom clair à votre progression.</p>`
    },
    {
      icon:"📊",
      title:"Statistiques et monstres",
      html:`<p>Les statistiques résument vos runs, vos temps et vos performances.</p><p>Le panneau Monstres détaille les paliers de ${escapeHtml(unit)} et les monstres restants avant le prochain gain.</p>`
    },
    {
      icon:"🏆",
      title:"Succès",
      html:`<p>Les succès récompensent votre progression et votre utilisation du tracker.</p><p>Certains succès sont communs, tandis que les succès propres à chaque familier seront adaptés à son objectif.</p>`
    },
    {
      icon:"🖼️",
      title:"Galerie",
      html:`<p>La galerie devient la mémoire de vos familiers terminés.</p><p>Elle affiche les anciens profils, leurs titres, leurs statistiques finales et les événements découverts.</p>`
    },
    {
      icon:"🌙",
      title:"Événements et ambiance",
      html:`<p>Les événements vivants peuvent apparaître autour du familier actif. Les ambiances passives restent discrètes et décoratives.</p><p>Ces systèmes sont séparés de votre progression et ne modifient pas vos données.</p>`
    },
    {
      icon:"🧭",
      title:"Détection Dofus",
      html:`<p>La détection Dofus peut ajouter automatiquement une progression après reconnaissance d'une fenêtre partagée.</p><p>Dans les options, choisissez le familier et le donjon à configurer. Par défaut, le sélecteur suit le familier du profil actif.</p>`
    },
    {
      icon:"💾",
      title:"Sauvegarde",
      html:`<p>Les membres synchronisent automatiquement leur progression avec le cloud.</p><p>En mode invité, les données restent locales au navigateur. Elles peuvent être perdues si le cache est supprimé.</p>`
    }
  ];
}

function applyHelpfulTooltips(){
  const copy={
    helpButton:"Ouvre le guide complet : objectif, premiers pas, donjons, chrono, progression, projections, profils et sauvegardes.",
    optionsButton:"Personnalise l'interface, les notifications, le chrono, l'accessibilité et les sauvegardes.",
    soundToggle:"Active ou coupe tous les sons du tracker : notifications, chrono, milestones et futurs sons.",
    chronoStart:"Démarre la session de farm et le chrono du donjon en cours.",
    chronoPause:"Met en pause la session et le donjon en cours sans modifier vos donjons, progression ou statistiques.",
    chronoReset:"Remet la session et le donjon en cours à zéro. Les donjons, progression et temps déjà enregistrés restent conservés.",
    markTime:"Enregistre le temps du donjon en cours. Sert aux temps moyens et aux estimations chrono.",
    chronoOptionsShortcut:"Ouvre directement Options > Chrono.",
    openRunTimes:"Affiche les temps enregistrés par donjon pour comparer et corriger vos chronos.",
    sessionEnd:"Termine la session active et affiche un résumé de votre séance de farm.",
    createProfile:"Crée un profil vide avec ses propres donjons, monstres, chrono, historique et sauvegarde.",
    renameProfile:"Renomme le profil actuel sans modifier ses données.",
    deleteProfile:"Supprime le profil actuel après confirmation. Action sensible si vous n'avez pas exporté.",
    plus:"Ajoute un donjon au suivi actif et met à jour monstres, progression, statistiques et historique.",
    minus:"Retire un donjon du suivi actif pour corriger une erreur. Les monstres et la progression sont ajustés.",
    statsButton:"Ouvre les statistiques du profil : progression, donjons, sessions, monstres et temps chrono.",
    activityButton:"Ouvre l'historique des actions : donjons, progression, chrono, imports, resets et modifications.",
    editRuns:"Corrige manuellement le nombre de donjons du suivi actif si vous reprenez un suivi déjà commencé.",
    undoButton:"Annule la dernière modification de donjons ou de monstres quand c'est possible.",
    resetButton:"Remet le profil actuel à zéro après confirmation. Les options sont conservées.",
    projectionButton:"Ouvre les prévisions : prochain gain, objectif 100%, temps estimé et rendement.",
    monsterLauncher:"Consulte les monstres, leurs valeurs et les gains par donjon.",
    toggleNight:"Active ou desactive le mode nuit pour reduire la luminosite.",
    toggleAnim:"Active ou coupe les transitions et effets visuels legers.",
    toggleTooltips:"Affiche ou masque les infobulles d'aide au survol et au focus.",
    toggleHud:"Active le mode HUD avec des fenetres deplacables et redimensionnables.",
    resetHudLayout:"Replace les fenetres HUD a une taille et une position confortables.",
    toggleMilliseconds:"Affiche les dixiemes de seconde pendant que le chrono tourne.",
    toggleAutoDungeonEstimate:"Active l'estimation automatique des donjons restants avec chrono et temps moyens.",
    toggleChronoAutoStart:"Demarre automatiquement Session & Chrono au premier + Run.",
    toggleSound:"Active ou coupe les sons lies au tracker.",
    toggleAutoMark:"Quand le chrono tourne, + Run enregistre aussi automatiquement le temps du donjon.",
    toggleNotif:"Active ou masque les notifications d'action.",
    toggleMinorNotif:"Masque les notifications mineures tout en gardant erreurs et milestones.",
    togglePersistentNotif:"Garde les notifications visibles jusqu'au clic.",
    exportSave:"Action de secours réservée aux anciennes sauvegardes JSON.",
    importSave:"Action de secours réservée aux anciennes sauvegardes JSON.",
    toggleHighContrast:"Renforce le contraste des textes et panneaux.",
    toggleReducedSaturation:"Reduit la saturation pour une interface plus calme.",
    toggleLargeFont:"Augmente la taille generale du texte.",
    toggleLivingEvents:"Active ou desactive les apparitions et phenomenes cosmetiques rares sur PC.",
    toggleSharedOptions:"Lie ou separe les options et raccourcis clavier entre tous les profils.",
    toggleShortcuts:"Active ou desactive les raccourcis clavier configurables.",
    resetKeybinds:"Restaure les raccourcis clavier par defaut."
  };

  for(const id in copy){
    const el=$("#"+id);
    if(el){
      el.dataset.tooltip=copy[id];
      el.dataset.tooltipBase=copy[id];
    }
  }

  $$("[data-farm-choice='morose']").forEach(el=>el.dataset.tooltip="Sélectionnez Morose : + Run, -, chrono et projections rapides utiliseront Morose.");
  $$("[data-farm-choice='tynril']").forEach(el=>el.dataset.tooltip="Sélectionnez Tynril : + Run, -, chrono et projections rapides utiliseront Tynril, limite 48.");
  $$("#monsterModal [data-tab='morose'],[data-tab='morose']").forEach(el=>{if(el.closest("#monstersModal"))el.dataset.tooltip="Affiche les monstres et gains issus du Donjon Morose."});
  $$("#monsterModal [data-tab='tynril'],[data-tab='tynril']").forEach(el=>{if(el.closest("#monstersModal"))el.dataset.tooltip="Affiche les monstres et gains issus du Donjon Tynril."});
  $$("#monsterModal [data-tab='zone'],[data-tab='zone']").forEach(el=>{if(el.closest("#monstersModal"))el.dataset.tooltip="Affiche les monstres ajoutes depuis la zone hors donjon."});
  $$("#monsterModal [data-tab='all'],[data-tab='all']").forEach(el=>{if(el.closest("#monstersModal"))el.dataset.tooltip="Affiche le total des monstres toutes sources confondues."});
  $("#editMobs")?.setAttribute("data-tooltip","Corrige manuellement les compteurs de monstres si une sauvegarde ou un suivi est incomplet.");
}

const HUD_MIN={
  optionsModal:{width:740,height:520},
  monstersModal:{width:760,height:460},
  editMobsModal:{width:640,height:420},
  statsModal:{width:620,height:420},
  activityModal:{width:620,height:420},
  projectionModal:{width:620,height:420},
  runTimesPanel:{width:620,height:390},
  sessionModal:{width:520,height:360}
};

let helpIndex=0;
let helpToken=0;
let helpScroll=null;

function placeHelpPopover(target){
  const pop=$("#helpPopover");
  if(!pop)return;
  if(!target){
    pop.style.left="50%";
    pop.style.top="50%";
    pop.style.transform="translate(-50%,-50%)";
    return;
  }
  pop.style.transform="";
  const rect=target.getBoundingClientRect();
  const margin=12,gap=12;
  const popRect=pop.getBoundingClientRect();
  let left=rect.right+gap;
  let top=rect.top;

  if(left+popRect.width>window.innerWidth-margin){
    left=rect.left-popRect.width-gap;
  }
  if(left<margin){
    left=Math.min(Math.max(margin,rect.left),window.innerWidth-popRect.width-margin);
    top=rect.bottom+gap;
  }
  if(top+popRect.height>window.innerHeight-margin){
    top=window.innerHeight-popRect.height-margin;
  }
  if(top<margin)top=margin;

  pop.style.left=left+"px";
  pop.style.top=top+"px";
}

function renderHelpStep(){
  const steps=activeHelpSteps();
  const isFinal=helpIndex>=steps.length;
  const step=isFinal ? helpFinalStep : steps[helpIndex];
  if(!step)return;
  const target=step.selector ? $(step.selector) : null;
  const progress=isFinal ? 100 : Math.round(((helpIndex+1)/steps.length)*100);

  $$(".help-highlight").forEach(el=>el.classList.remove("help-highlight"));
  document.body.classList.add("help-active");
  helpToken++;
  const token=helpToken;
  setTimeout(()=>{
    if(token!==helpToken || !document.body.classList.contains("help-active"))return;
    if(target && step.spotlight)target.classList.add("help-highlight");
    $("#helpIcon").textContent=step.icon || "📖";
    $("#helpStep").textContent=isFinal ? "Guide terminé" : `Étape ${helpIndex+1} / ${steps.length}`;
    $("#helpTitle").textContent=step.title;
    $("#helpText").innerHTML=step.html || `<p>${step.text || ""}</p>`;
    $("#helpProgressFill").style.width=progress+"%";
    $("#helpProgressText").textContent=isFinal ? "Progression complète" : `Étape ${helpIndex+1} sur ${steps.length}`;
    $("#helpNoAuto").checked=true;
    $("#helpPrev").style.visibility=helpIndex===0?"hidden":"visible";
    $("#helpNext").textContent=isFinal?"Commencer l'aventure":"Suivant";
    $("#helpBackdrop").classList.add("show");
    $("#helpPopover").classList.add("show");
    placeHelpPopover(target);
  },180);
}

function startHelp(){
  helpScroll={x:window.scrollX,y:window.scrollY};
  helpIndex=0;
  renderHelpStep();
}

function closeHelp(){
  if(data?.ui){
    if(data.settings && $("#helpNoAuto")){
      data.settings.helpAutoDisabled=!!$("#helpNoAuto").checked;
    }
    data.ui.helpSeen=true;
    save();
  }
  helpToken++;
  $$(".help-highlight").forEach(el=>el.classList.remove("help-highlight"));
  $("#helpBackdrop")?.classList.remove("show");
  $("#helpPopover")?.classList.remove("show");
  document.body.classList.remove("help-active");
  $("#helpPopover")?.removeAttribute("style");
  resetPykurVisualState();
  if(helpScroll){
    const targetScroll={x:helpScroll.x,y:helpScroll.y};
    window.scrollTo(targetScroll.x,targetScroll.y);
    requestAnimationFrame(()=>window.scrollTo(targetScroll.x,targetScroll.y));
    setTimeout(()=>window.scrollTo(targetScroll.x,targetScroll.y),80);
    helpScroll=null;
  }
  setTimeout(()=>maybePromptInitialFamiliarChoice(),120);
}

function resetPykurVisualState(){
  const img=$("#pykurImg");
  const orb=$(".pykur-orb");
  const side=$(".side");
  if(side){
    side.style.position="static";
    void side.offsetHeight;
    side.style.removeProperty("position");
  }
  [img,orb,$(".side > .card:first-child")].forEach(el=>{
    if(!el)return;
    el.classList.remove("help-highlight");
    el.style.removeProperty("transform");
    el.style.removeProperty("translate");
    el.style.removeProperty("scale");
  });
  if(img){
    img.classList.remove("pop");
    img.style.animation="none";
    void img.offsetWidth;
    img.style.removeProperty("animation");
  }
}

function nextHelp(){
  const steps=activeHelpSteps();
  if(helpIndex>=steps.length){
    closeHelp();
    return;
  }
  helpIndex++;
  renderHelpStep();
}

function prevHelp(){
  if(helpIndex<=0)return;
  helpIndex--;
  renderHelpStep();
}

function setupHudWindows(){
  const selectors=[".modal-bg",".side-panel-bg"];
  selectors.forEach(sel=>{
    $$(sel).forEach(bg=>{
      const win=hudTarget(bg);
      const head=bg.querySelector(".modal-head,.side-panel-head");
      if(!win || !head)return;
      let hudGestureActive=false;

      bg.addEventListener("pointerdown",()=>{if(data.settings.hudMode)bringHudToFront(bg.id)});

      const startDrag=e=>{
        if(!data.settings.hudMode)return;
        if(e.target.closest("button"))return;
        if(hudGestureActive)return;
        hudGestureActive=true;
        e.preventDefault();
        bringHudToFront(bg.id);
        const startX=e.clientX,startY=e.clientY;
        const rect=win.getBoundingClientRect();
        const isPointer=e.type.startsWith("pointer");
        const pointerId=e.pointerId;
        if(isPointer)head.setPointerCapture?.(pointerId);

        const onMove=ev=>{
          const next=clampHudRect({
            left:rect.left+(ev.clientX-startX),
            top:rect.top+(ev.clientY-startY),
            width:rect.width,
            height:rect.height
          },bg.id);
          win.style.setProperty("--hud-left",next.left+"px");
          win.style.setProperty("--hud-top",next.top+"px");
          win.style.setProperty("--hud-width",next.width+"px");
          win.style.setProperty("--hud-height",next.height+"px");
        };

        const onUp=()=>{
          if(isPointer)head.releasePointerCapture?.(pointerId);
          window.removeEventListener(isPointer?"pointermove":"mousemove",onMove);
          window.removeEventListener(isPointer?"pointerup":"mouseup",onUp);
          hudGestureActive=false;
          saveHudRect(bg.id);
        };

        window.addEventListener(isPointer?"pointermove":"mousemove",onMove);
        window.addEventListener(isPointer?"pointerup":"mouseup",onUp,{once:true});
      };

      head.addEventListener("pointerdown",startDrag);
      head.addEventListener("mousedown",startDrag);

      if(!win.querySelector(".hud-resize-handle")){
        const handle=document.createElement("div");
        handle.className="hud-resize-handle";
        handle.setAttribute("aria-hidden","true");
        win.appendChild(handle);

        const startResize=e=>{
          if(!data.settings.hudMode)return;
          if(hudGestureActive)return;
          hudGestureActive=true;
          e.preventDefault();
          e.stopPropagation();
          bringHudToFront(bg.id);
          const startX=e.clientX,startY=e.clientY;
          const rect=win.getBoundingClientRect();
          const isPointer=e.type.startsWith("pointer");
          const pointerId=e.pointerId;
          if(isPointer)handle.setPointerCapture?.(pointerId);

          const onMove=ev=>{
            const next=clampHudRect({
              left:rect.left,
              top:rect.top,
              width:rect.width+(ev.clientX-startX),
              height:rect.height+(ev.clientY-startY)
            },bg.id);
            win.style.setProperty("--hud-left",next.left+"px");
            win.style.setProperty("--hud-top",next.top+"px");
            win.style.setProperty("--hud-width",next.width+"px");
            win.style.setProperty("--hud-height",next.height+"px");
          };

          const onUp=()=>{
            if(isPointer)handle.releasePointerCapture?.(pointerId);
            window.removeEventListener(isPointer?"pointermove":"mousemove",onMove);
            window.removeEventListener(isPointer?"pointerup":"mouseup",onUp);
            hudGestureActive=false;
            saveHudRect(bg.id);
          };

          window.addEventListener(isPointer?"pointermove":"mousemove",onMove);
          window.addEventListener(isPointer?"pointerup":"mouseup",onUp,{once:true});
        };

        handle.addEventListener("pointerdown",startResize);
        handle.addEventListener("mousedown",startResize);
      }

      const observer=new ResizeObserver(()=>saveHudRect(bg.id));
      observer.observe(win);
    });
  });
}

function resetHudLayout(){
  if(!data.hud)data.hud=defaultData().hud;
  data.hud.windows={};
  $$(".modal-bg.show,.side-panel-bg.show").forEach(bg=>applyHudRect(bg.id));
  save();
  toast("Disposition HUD réinitialisée","reset","reset");
}

function applySettings(){
  const performanceActive=performanceModeActive();
  document.body.classList.toggle("night",data.settings.night);
  document.body.classList.toggle("no-anim",!data.settings.animations);
  document.body.classList.toggle("no-tooltips",!data.settings.tooltips);
  document.body.classList.toggle("hud-mode",!!data.settings.hudMode);
  document.body.classList.toggle("high-contrast",!!data.settings.highContrast);
  document.body.classList.toggle("reduced-saturation",!!data.settings.reducedSaturation);
  document.body.classList.toggle("large-font",!!data.settings.largeFont);
  document.body.classList.toggle("performance-mode",performanceActive);
  document.body.dataset.fx=data.settings.visualIntensity||"standard";
  document.body.dataset.opacity=data.settings.uiOpacity||"medium";
  document.body.dataset.dashboardMode=data.settings.dashboardMode||"tryhard";
  document.body.dataset.chronoStyle=data.settings.chronoStyle||"technical";
  document.body.dataset.notificationSize=data.settings.notificationSize||"normal";
  document.body.dataset.activityDensity=data.ui?.activityDensity||"compact";
  document.body.dataset.monsterView=data.ui?.monsterView||"comfortable";
  if(!data.settings.tooltips)$("#smartTooltip")?.classList.remove("show");
  $("#toggleNight").textContent=data.settings.night?"Activé":"Désactivé";
  $("#toggleAnim").textContent=data.settings.animations?"Activées":"Désactivées";
  if($("#togglePerformanceMode")){
    const mode=data.settings.performanceMode||"auto";
    $("#togglePerformanceMode").textContent=mode==="on"?"Activé":mode==="off"?"Désactivé":performanceActive?"Auto (actif)":"Auto";
  }
  $("#toggleTooltips").textContent=data.settings.tooltips?"Activées":"Désactivées";
  $("#toggleNotif").textContent=data.settings.notifications?"Activées":"Désactivées";
  if($("#toggleSound"))$("#toggleSound").textContent=data.settings.sound?"Activés":"Désactivés";
  applySoundVolume();
  if(data.settings.sound===false && typeof passiveState!=="undefined"){
    passiveState.audios.forEach(audio=>{try{audio.pause();audio.currentTime=0}catch(e){}});
    passiveState.audios=[];
  }
  if($("#soundToggle")){
    $("#soundToggle").dataset.tooltip=data.settings.sound?`Son activé (${Math.round(soundVolumeRatio()*100)}%) : clique pour régler le volume.`:"Son désactivé : clique pour régler ou réactiver.";
    $("#soundToggle").dataset.tooltipBase=$("#soundToggle").dataset.tooltip;
    $("#soundToggle").setAttribute("aria-label",data.settings.sound?"Son activé":"Son désactivé");
    $("#soundToggle").classList.toggle("muted",!data.settings.sound);
    if($("#soundToggleIcon"))$("#soundToggleIcon").src=data.settings.sound?"./assets/optimized/ui/son.webp":"./assets/optimized/ui/sonoff.webp";
  }
  if($("#toggleHud"))$("#toggleHud").textContent=data.settings.hudMode?"Activé":"Désactivé";

  if($("#toggleAutoMark"))$("#toggleAutoMark").textContent=data.settings.autoMarkOnPlus?"Activé":"Désactivé";
  setToggleText("toggleChronoAutoStart",!!data.settings.chronoAutoStartOnRun);
  setSelectValue("visualIntensitySelect",data.settings.visualIntensity||"standard");
  setSelectValue("uiOpacitySelect",data.settings.uiOpacity||"medium");
  setSelectValue("dashboardModeSelect",data.settings.dashboardMode||"tryhard");
  setSelectValue("chronoStyleSelect",data.settings.chronoStyle||"technical");
  setSelectValue("notificationSizeSelect",data.settings.notificationSize||"normal");
  setSelectValue("notificationDurationSelect",String(data.settings.notificationDuration||3200));
  setToggleText("toggleMilliseconds",data.settings.showMilliseconds);
  setToggleText("toggleAutoDungeonEstimate",data.settings.autoDungeonEstimate);
  setToggleText("toggleMinorNotif",data.settings.disableMinorNotifications);
  setToggleText("togglePersistentNotif",data.settings.notificationsPersistent);
  setToggleText("toggleHighContrast",data.settings.highContrast);
  setToggleText("toggleReducedSaturation",data.settings.reducedSaturation);
  setToggleText("toggleLargeFont",data.settings.largeFont);
  setToggleText("toggleLivingEvents",data.settings.livingEvents!==false);
  setToggleText("togglePassiveAmbience",data.settings.passiveAmbience!==false);
  setToggleText("toggleShortcuts",data.settings.shortcutsEnabled);
  setToggleText("toggleSharedOptions",!!store?.optionsShared);
  setToggleText("toggleSharedGalleryOption",store?.galleryShared!==false);
  if($("#gallerySharedToggle"))$("#gallerySharedToggle").checked=store?.galleryShared!==false;
  dofusRefreshOptions();
  if(data.dofusDetection?.enabled)dofusStartLoop();
  else dofusStopLoop();
  if(data.settings.passiveAmbience===false)passiveStop({reschedule:false});
  else if(passiveCanRun() && !passiveState.visualTimer && !passiveState.soundTimer && !passiveState.active)passiveSchedule();
  if(data.settings.livingEvents===false){
    livingStop({silent:true,schedule:false});
    livingStopServerSync({resetSequence:true});
  }else if(livingIsDesktop() && !livingState.serverPollTimer){
    livingResetScheduler();
  }
  renderShortcutOptions();
  updateShortcutLabels();
  filterOptionsSearch();
}

function setSelectValue(id,value){
  const el=$("#"+id);
  if(el)el.value=value;
}

function setToggleText(id,value){
  const el=$("#"+id);
  if(el)el.textContent=value?"Activé":"Désactivé";
}

function keybinds(){
  if(!data.settings)data.settings=defaultData().settings;
  data.settings.keybinds=Object.assign(defaultKeybinds(),data.settings.keybinds||{});
  return data.settings.keybinds;
}

function formatShortcutLabel(value){
  if(String(value||"").trim()==="+")return "+";
  return String(value||"").replace(/\+/g," + ");
}

function normalizeKeyEvent(event){
  if(!event || event.isComposing)return "";
  let key=event.key;
  if(!key)return "";
  if(key===" " || key==="Spacebar")key="Space";
  if(key==="Esc")key="Escape";
  if(key==="+" || key==="=")key="+";
  else if(key==="-" || key==="_")key="-";
  else if(key.length===1)key=key.toUpperCase();
  else key=key[0].toUpperCase()+key.slice(1);

  const modifiers=[];
  if(event.ctrlKey)modifiers.push("Ctrl");
  if(event.altKey)modifiers.push("Alt");
  if(event.shiftKey && !["+", "-"].includes(key))modifiers.push("Shift");
  if(event.metaKey)modifiers.push("Meta");

  return [...modifiers,key].join("+");
}

function normalizeKeybindValue(value){
  if(!value)return "";
  if(String(value).trim()==="+")return "+";
  return String(value)
    .split("+")
    .map(part=>{
      const trimmed=part.trim();
      const lower=trimmed.toLowerCase();
      if(lower==="ctrl")return "Ctrl";
      if(lower==="alt")return "Alt";
      if(lower==="shift")return "Shift";
      if(lower==="meta")return "Meta";
      if(trimmed.length===1)return trimmed.toUpperCase();
      return trimmed[0]?.toUpperCase()+trimmed.slice(1);
    })
    .join("+")
    .replace(/^=$/,"+");
}

function findShortcutConflict(value,exceptId=null){
  const normalized=normalizeKeybindValue(value);
  return SHORTCUT_ACTIONS.find(action=>
    action.id!==exceptId && normalizeKeybindValue(keybinds()[action.id])===normalized
  );
}

function isTypingTarget(target){
  if(!target)return false;
  return !!target.closest?.("input,textarea,select,[contenteditable='true'],[contenteditable=''],.dialog-input");
}

function hasBlockingShortcutLayer(){
  if(activeDialog)return true;
  if(document.body.classList.contains("help-active"))return true;
  return $$(".modal-bg.show,.side-panel-bg.show").some(layer=>layer.id!=="optionsModal" || !editingKeybind);
}

function switchActiveDungeon(){
  const farms=activeFarmKeys();
  const currentIndex=Math.max(0,farms.indexOf(data.ui.farm));
  data.ui.farm=farms[(currentIndex+1)%farms.length] || data.ui.farm;
  data.ui.tab=data.ui.farm;
  const select=$("#farmSelect");
  if(select)select.value=data.ui.farm;
  save();
  renderAll();
  toast(`Donjon actif : ${familiarFarmLabel(data.ui.farm)}`,"info","click");
}

function toggleChronoShortcut(){
  if(data.chrono.running)pauseChrono();
  else startChrono();
}

function openHistoryShortcut(){
  unlockAchievement("open_history");
  if($("#activitySearch"))$("#activitySearch").value="";
  activityFilter="all";
  $$("[data-activity-filter]").forEach(b=>b.classList.toggle("active",b.dataset.activityFilter==="all"));
  renderActivity();
  openModal("activityModal");
}

function openOptionsShortcut(){
  unlockAchievement("open_options");
  applySettings();
  renderCloudStatus();
  if($("#optionsSearch")){
    $("#optionsSearch").value="";
    filterOptionsSearch();
  }
  openModal("optionsModal");
}

function openChronoOptions(){
  openOptionsShortcut();
  const tabName="chrono";
  $$("[data-options-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.optionsTab===tabName));
  $$("[data-options-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.optionsPanel===tabName));
}

function toggleNightShortcut(){
  data.settings.night=!data.settings.night;
  applySettings();
  save();
  toast(data.settings.night?"Mode nuit active":"Mode nuit desactive","info","click");
}

function toggleDofusDetectionShortcut(){
  data.dofusDetection.enabled=!data.dofusDetection.enabled;
  applySettings();
  save();
  toast(data.dofusDetection.enabled?"Détection : Activée":"Détection : Désactivée","info","click");
  if(data.dofusDetection.enabled && !dofusState.video)toast("Fenêtre Dofus non sélectionnée.","warning","warning");
}

function runShortcutAction(actionId){
  const actions={
    addRun:()=>addRun(1),
    removeRun:()=>addRun(-1),
    switchDungeon:switchActiveDungeon,
    chronoToggle:toggleChronoShortcut,
    chronoReset:resetChrono,
    openHistory:openHistoryShortcut,
    openOptions:openOptionsShortcut,
    openProjection:()=>{unlockAchievement("open_projection");unlockAchievement("view_time_estimate");setProjectionView("summary",false);renderProjection();openModal("projectionModal")},
    openMonsters:()=>{unlockAchievement("open_monsters");unlockAchievement("open_monster_threshold");renderMonsterTable();openModal("monstersModal")},
    openGallery:()=>{unlockAchievement("open_gallery");renderGallery();openModal("galleryModal")},
    toggleSound:()=>{setGlobalSound(!data.settings.sound);playSound("click")},
    toggleNight:toggleNightShortcut,
    toggleDofusDetection:toggleDofusDetectionShortcut,
    openHelp:startHelp
  };
  actions[actionId]?.();
}

function captureShortcutKey(event){
  if(!editingKeybind)return false;
  if(event.key==="Escape"){
    event.preventDefault();
    editingKeybind=null;
    renderShortcutOptions();
    dofusRefreshOptions();
    return true;
  }
  if(["Backspace","Delete"].includes(event.key)){
    event.preventDefault();
    keybinds()[editingKeybind]="";
    editingKeybind=null;
    save();
    renderShortcutOptions();
    updateShortcutLabels();
    dofusRefreshOptions();
    toast("Raccourci désactivé","info","click");
    return true;
  }

  const value=normalizeKeyEvent(event);
  if(!value || value==="Shift" || value==="Ctrl" || value==="Alt" || value==="Meta")return true;

  event.preventDefault();
  const conflict=findShortcutConflict(value,editingKeybind);
  if(conflict){
    toast(`Raccourci deja utilise : ${conflict.label}`,"warning","warning");
    return true;
  }

  keybinds()[editingKeybind]=normalizeKeybindValue(value);
  editingKeybind=null;
  save();
  renderShortcutOptions();
  updateShortcutLabels();
  dofusRefreshOptions();
  unlockAchievement("edit_shortcuts");
  toast("Raccourci mis a jour","success","click");
  return true;
}

function handleShortcut(event){
  if(editingKeybind)return captureShortcutKey(event);
  if(!data.settings.shortcutsEnabled)return false;
  if(isTypingTarget(event.target))return false;
  if(hasBlockingShortcutLayer())return false;

  const value=normalizeKeyEvent(event);
  if(!value)return false;
  const action=SHORTCUT_ACTIONS.find(item=>normalizeKeybindValue(keybinds()[item.id])===value);
  if(!action)return false;

  event.preventDefault();
  runShortcutAction(action.id);
  return true;
}

function renderShortcutOptions(){
  const list=$("#shortcutList");
  if(!list)return;
  const current=keybinds();
  list.innerHTML=SHORTCUT_ACTIONS.map(action=>{
    const isEditing=editingKeybind===action.id;
    const key=isEditing?"Appuie sur une touche":(current[action.id]?formatShortcutLabel(current[action.id]):"Désactivé");
    return `
      <div class="shortcut-item" data-shortcut-row="${action.id}">
        <div class="shortcut-copy"><strong>${action.label}</strong><small>${action.description}</small></div>
        <span class="shortcut-key ${isEditing?"capturing":""}">${key}</span>
        <button class="btn btn-blue tooltip" type="button" data-shortcut-edit="${action.id}" data-tooltip="Changer la touche de ce raccourci.">${isEditing?"En attente":"Modifier"}</button>
      </div>
    `;
  }).join("");
}

function resetKeybindsToDefault(){
  data.settings.keybinds=defaultKeybinds();
  editingKeybind=null;
  save();
  renderShortcutOptions();
  updateShortcutLabels();
  toast("Raccourcis reinitialises","reset","reset");
}

function updateShortcutLabels(){
  if(!data?.settings)return;
  const current=keybinds();
  SHORTCUT_ACTIONS.forEach(action=>{
    $$(action.target).forEach(el=>{
      if(!el)return;
      if(!el.dataset.tooltipBase)el.dataset.tooltipBase=el.dataset.tooltip||"";
      const base=el.dataset.tooltipBase || el.dataset.tooltip || "";
      const key=current[action.id];
      el.dataset.tooltip=key ? `${base} (${formatShortcutLabel(key)})` : base;
    });
  });
}

function normalizeSearchText(value){
  return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}

function filterOptionsSearch(){
  const input=$("#optionsSearch");
  if(!input)return;
  const query=normalizeSearchText(input.value.trim());
  const active=!!query;
  let matchCount=0;
  let panelCount=0;
  const empty=$("#optionsEmptySearch");
  const count=$("#optionsSearchCount");

  $$("[data-options-panel]").forEach(panel=>{
    let panelMatched=false;
    const items=panel.querySelectorAll(".options-panel-head,.option-row,.option-control,.backup-panel,.options-note,.shortcut-item,.shortcut-actions");
    items.forEach(item=>{
      const matches=!active || normalizeSearchText(item.textContent+" "+Array.from(item.querySelectorAll("[data-tooltip]")).map(el=>el.dataset.tooltip).join(" ")).includes(query);
      item.classList.toggle("options-search-hidden",active && !matches);
      if(active && matches && !item.classList.contains("options-panel-head")){
        matchCount++;
        panelMatched=true;
      }
      if(active && matches && item.classList.contains("options-panel-head"))panelMatched=true;
    });
    const tab=$(`[data-options-tab="${panel.dataset.optionsPanel}"]`);
    panel.classList.toggle("search-match",active && panelMatched);
    panel.classList.toggle("options-search-hidden",active && !panelMatched);
    tab?.classList.toggle("options-search-hidden",active && !panelMatched);
    if(active && panelMatched)panelCount++;
  });

  if(!active){
    $$(".options-search-hidden,.search-match").forEach(el=>el.classList.remove("options-search-hidden","search-match"));
    empty?.classList.remove("show");
    if(count)count.textContent="Toutes les options";
    return;
  }

  empty?.classList.toggle("show",panelCount===0);
  if(count)count.textContent=matchCount ? `${matchCount} résultat${matchCount>1?"s":""}` : "Aucun résultat";
}

function totalMobs(){
  const t={};
  const sources=[...activeFarmKeys(),"zone"];
  for(const id in mobs){
    t[id]=sources.reduce((sum,source)=>sum+(data.mobs?.[source]?.[id]||0),0);
  }
  return t;
}

function ppFrom(src){
  let pp=0;
  for(const id in mobs){
    const need=parseInt(mobs[id]?.ppNeed,10)||0;
    if(!need || mobs[id]?.noProgress)continue;
    const gainValue=Math.max(1,parseInt(mobs[id]?.gainValue,10)||1);
    pp+=Math.floor((src[id]||0)/need)*gainValue;
  }
  return Math.min(pp,activeProgressMax());
}

function ppContributionBySource(){
  const farmKeys=activeFarmKeys();
  const byFarm=Object.fromEntries(farmKeys.map(farm=>[farm,ppFrom(data.mobs[farm]||{})]));
  const zonePP=ppFrom(data.mobs.zone||{});
  const total=Object.values(byFarm).reduce((sum,value)=>sum+value,0)+zonePP;

  return {
    ...byFarm,
    zone:zonePP,
    total
  };
}

function percentPart(value,total){
  if(!total || total<=0)return 0;
  return Math.round((value/total)*100);
}

function currentPP(){return ppFrom(totalMobs())}

function clampRunsToLimit(farm,value){
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  const n=parseInt(value,10);
  if(Number.isNaN(n))return data.runs[farm]||0;
  return Math.min(limit,Math.max(0,n));
}

function runLimitReached(farm){
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  return (data.runs[farm]||0)>=limit;
}

function syncMobsFromRuns(farm){
  const runs=clampRunsToLimit(farm,data.runs[farm]||0);
  data.runs[farm]=runs;
  const farmGains=effectiveFarmGains(farm);
  if(!data.mobs[farm])data.mobs[farm]={};
  for(const id in mobs)data.mobs[farm][id]=0;
  for(const id in farmGains){
    data.mobs[farm][id]=runs*farmGains[id];
  }
}

function simulateRemaining(farm){
  const max=activeProgressMax();
  if(currentPP()>=max)return 0;
  const sim=clone(totalMobs());
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  const capacity=Math.max(0,limit-(data.runs[farm]||0));
  let count=0;
  while(ppFrom(sim)<max && count<capacity){
    count++;
    const farmGains=effectiveFarmGains(farm);
    for(const id in farmGains)sim[id]=(sim[id]||0)+farmGains[id];
  }
  return count;
}

function simulatePPAfterRuns(farm,runs){
  if(runs===null || runs===undefined || runs<=0)return currentPP();
  const sim=clone(totalMobs());
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  const capacity=Math.max(0,limit-(data.runs[farm]||0));
  const count=Math.min(runs,capacity);
  const farmGains=effectiveFarmGains(farm);
  for(let i=0;i<count;i++){
    for(const id in farmGains)sim[id]=(sim[id]||0)+farmGains[id];
  }
  return ppFrom(sim);
}

function applyRunDelta(farm,delta){
  data.runs[farm]+=delta;
  if(data.runs[farm]<0)data.runs[farm]=0;

  const farmGains=effectiveFarmGains(farm);
  for(const id in farmGains){
    data.mobs[farm][id]=(data.mobs[farm][id]||0)+(farmGains[id]*delta);
    if(data.mobs[farm][id]<0)data.mobs[farm][id]=0;
  }
}

function setRunsSynced(farm,value){
  const old=data.runs[farm]||0;
  const raw=parseInt(value,10);
  const next=clampRunsToLimit(farm,value);

  if(next===old)return false;

  data.runs[farm]=next;

  const farmGains=effectiveFarmGains(farm);
  if(!data.mobs[farm])data.mobs[farm]={};
  for(const id in mobs)data.mobs[farm][id]=0;
  for(const id in farmGains){
    data.mobs[farm][id]=next*farmGains[id];
  }

  if(!Number.isNaN(raw) && raw>next){
    toast(`${familiarFarmLabel(farm)} limité à ${RUN_LIMITS[farm]} donjons maximum.`,"warning","warning");
  }

  return next-old;
}

function addMobBundleToZone(bundle){
  if(!data.mobs.zone)data.mobs.zone={};
  Object.entries(bundle||{}).forEach(([id,count])=>{
    data.mobs.zone[id]=Math.max(0,(data.mobs.zone[id]||0)+(parseInt(count,10)||0));
  });
}

function markAbraRoomReached(){
  if(activeFamiliarId()!=="abra-kadabra")return;
  if(!data.special)data.special={};
  if(data.special.salleAbrakneActive){
    data.special.salleAbrakneActive=false;
    data.special.salleAbrakneSetupDone=false;
    data.special.salleAbrakneLastActivity=null;
    addActivity("Sortie de la salle Abrakne","system");
    save();
    renderAll();
    toast("Boucle Abrakne terminée.","info","click");
    return;
  }
  const oldPower=currentPP();
  pushUndo();
  let addedSetup=false;
  if(!data.special.salleAbrakneSetupDone){
    data.special.salleAbrakneSetupDone=true;
    addedSetup=true;
    addMobBundleToZone(ABRA_SPECIAL_GAINS.salleAbrakneSetup);
  }
  data.special.salleAbrakneActive=true;
  data.special.salleAbrakneLastActivity=Date.now();
  data.ui.farm="salleAbrakne";
  data.ui.tab="salleAbrakne";
  const newPower=currentPP();
  addActivity(`Boucle salle Abrakne démarrée`,"success");
  notifyPPProgress(oldPower,newPower);
  save();
  renderAll();
  toast(addedSetup ? "Salle Abrakne prête : les 4 premières salles sont ajoutées." : "Boucle Abrakne reprise.","success","pp");
}

function expireAbraRoomIfInactive(){
  if(activeFamiliarId()!=="abra-kadabra" || !data.special?.salleAbrakneActive)return false;
  const last=parseInt(data.special.salleAbrakneLastActivity,10)||0;
  if(last && Date.now()-last<3600000)return false;
  data.special.salleAbrakneActive=false;
  data.special.salleAbrakneSetupDone=false;
  data.special.salleAbrakneLastActivity=null;
  addActivity("Boucle Abrakne terminée automatiquement après inactivité","system");
  save();
  toast("Boucle Abrakne arrêtée après 1h d'inactivité.","info","click");
  return true;
}

function resetMilestonesIfNeeded(){
  const pp=currentPP();
  if(!data.stats.milestones)data.stats.milestones={};
  [10,20,30,40,50,60,70,80,90,100].forEach(p=>{
    const target=Math.round(activeProgressMax()*p/100);
    if(pp<target)data.stats.milestones[p]=false;
  });
}

function addRun(delta){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  const selectedFarm=data.ui.farm;
  expireAbraRoomIfInactive();
  if(delta>0 && activeFamiliarId()==="abra-kadabra" && selectedFarm==="salleAbrakne" && !data.special?.salleAbrakneActive){
    markAbraRoomReached();
    return;
  }
  if(delta>0 && runLimitReached(selectedFarm)){
    toast(`${familiarFarmLabel(selectedFarm)} est déjà au maximum (${RUN_LIMITS[selectedFarm]} donjons).`,"warning","warning");
    alhassReact("guard",true);
    addActivity(`Ajout bloqué : ${familiarFarmLabel(selectedFarm)} déjà au maximum`,"warning");
    return;
  }

  const farm=$("#farmSelect").value;
  if(delta<0 && data.runs[farm]<=0)return;
  if(delta>0 && data.settings.chronoAutoStartOnRun && !data.session?.active && !data.chrono?.running){
    startChrono(false);
    addActivity("Session & chrono démarrés automatiquement au + Run","chrono");
  }
  const oldPP=currentPP();
  pushUndo();
  applyRunDelta(farm,delta);
  if(delta>0 && activeFamiliarId()==="abra-kadabra" && farm==="salleAbrakne" && data.special?.salleAbrakneActive){
    data.special.salleAbrakneLastActivity=Date.now();
  }
  recordSessionRun(farm,delta);
  resetMilestonesIfNeeded();
  const farmLabel=familiarFarmLabel(farm);
  addActivity(`${delta>0?"+1":"-1"} donjon ${farmLabel}`,delta>0?"success":"warning");

  if(delta>0 && data.settings.autoMarkOnPlus && data.chrono.running && chronoTimer){
    const autoMarked=markTime({silent:true,auto:true,farm});
    if(autoMarked!==false){
      toast(`Run tryhard ${farmLabel} : ${formatChrono(autoMarked)}`,"mark","mark");
    }
  }

  const newPP=currentPP();
  const ppDelta=newPP-oldPP;
  addDailyRun(farm,delta,ppDelta);
  syncTodayPPGain();
  notifyPPProgress(oldPP,newPP);
  if(delta>0){
    unlockAchievement("first_run");
  }

  if(ppDelta>0){
    addActivity(`${activeFamiliar().shortLabel} gagne +${ppDelta} ${activeProgressShort()} (${oldPP} → ${newPP})`,"success");
  }else if(ppDelta<0){
    addActivity(`${activeFamiliar().shortLabel} perd ${Math.abs(ppDelta)} ${activeProgressShort()} (${oldPP} → ${newPP})`,"warning");
  }

  checkMilestones(oldPP,newPP);
  toast(delta>0?`Donjon ${farmLabel} ajouté`:`Donjon ${farmLabel} retiré`,delta>0?"run":"orange",delta>0?"pp":"warning");
  if(delta>0)alhassReact("run");
  triggerRunEnergyTransfer(delta);
  triggerPykurMood(delta>0?"happy":"grumpy");
  save();
  renderAll();
  maybeShowCompletionModal();
}

function formatDuration(sec){
  sec=Math.max(0,Math.round(sec||0));
  const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  if(h>0)return `${h}h ${String(m).padStart(2,"0")}min`;
  if(m>0)return `${m}min ${String(s).padStart(2,"0")}s`;
  return `${s}s`;
}

function sessionElapsedSeconds(){
  const base=parseInt(data.session?.totalSeconds,10)||0;
  if(!data.session?.active)return base;
  if(!data.session?.active || !data.session.startedAt)return base;
  return base+Math.max(0,Math.floor((Date.now()-data.session.startedAt)/1000));
}

function formatRate(value,suffix){
  if(!Number.isFinite(value) || value<=0)return "—";
  return `${value.toFixed(value>=10?1:2)} ${suffix}`;
}

function updateSessionPP(){
  if(!data.session)return;
  if(!data.session.active){
    const hasProgress=(parseInt(data.session.totalSeconds,10)||0)>0 || activeFarmKeys().some(farm=>(data.session.runs?.[farm]||0)>0);
    if(!hasProgress)data.session.ppGain=0;
    return;
  }
  data.session.ppGain=Math.max(0,currentPP()-(data.session.ppStart||0));
}

function recordSessionRun(farm,delta){
  if(!data.session?.active)return;
  data.session.runs[farm]=Math.max(0,(data.session.runs[farm]||0)+delta);
}

function currentSessionChronoMarks(){
  const session=data.session||{};
  const startedValue=session.sessionStartedAt || session.startedAt;
  if(!startedValue)return [];
  const started=new Date(startedValue);
  if(Number.isNaN(started.getTime()))return [];
  return (data.chrono?.marks||[]).filter(mark=>{
    const date=new Date(mark.date);
    return !Number.isNaN(date.getTime()) && date>=started;
  });
}

function renderSession(){
  const session=data.session||defaultData().session;
  updateSessionPP();
  const elapsed=sessionElapsedSeconds();
  const runSeconds=getChronoSplitSeconds(getChronoSeconds());
  const totalRuns=activeFarmKeys().reduce((sum,farm)=>sum+(session.runs?.[farm]||0),0);
  const hasPausedProgress=!session.active && (elapsed>0 || totalRuns>0);
  const scopedMarks=currentSessionChronoMarks();
  const hasChronoSplit=scopedMarks.length>0;
  $("#sessionState").textContent=session.active?"En cours":hasPausedProgress?"En pause":"Prête";
  $("#sessionTime").textContent=formatChrono(elapsed);
  $(".unified-time-main")?.classList.toggle("show-total",hasChronoSplit && elapsed>0 && Math.abs(elapsed-runSeconds)>1);
  $("#sessionRuns").textContent=totalRuns;
  $("#sessionPP").textContent=`+${(session.active || hasPausedProgress) ? (session.ppGain||0) : 0}`;
  $("#sessionLiveDot").classList.toggle("active",!!session.active);
  const times=scopedMarks.map(mark=>parseInt(mark.time,10)||0).filter(time=>time>0);
  const best=times.length ? Math.min(...times) : 0;
  const avg=times.length ? Math.round(times.reduce((sum,time)=>sum+time,0)/times.length) : 0;
  if($("#sessionBestRun"))$("#sessionBestRun").textContent=best?formatChrono(best):"—";
  if($("#sessionAvgRun"))$("#sessionAvgRun").textContent=avg?formatChrono(avg):"—";
  if($("#chronoStart"))$("#chronoStart").textContent=hasPausedProgress?"Reprendre":"Démarrer";
  if($("#chronoPause"))$("#chronoPause").disabled=!session.active && !data.chrono?.running;
  if($("#sessionEnd"))$("#sessionEnd").disabled=!session.active && !hasPausedProgress;
}

function startSession(options={}){
  const silent=!!options.silent;
  if(data.session?.active)return;
  const now=Date.now();
  data.session={
    active:true,
    startedAt:now,
    sessionStartedAt:now,
    totalSeconds:0,
    runs:Object.fromEntries(activeFarmKeys().map(farm=>[farm,0])),
    ppStart:currentPP(),
    ppGain:0,
    lastSummary:null
  };
  if(!silent)addActivity("Session de farm démarrée","system");
  if(!silent)unlockAchievement("start_session");
  save();
  renderSession();
  if(!silent)toast("Session démarrée","success");
}

function pauseSession(){
  if(!data.session?.active)return;
  data.session.totalSeconds=sessionElapsedSeconds();
  data.session.active=false;
  if(!data.session.sessionStartedAt)data.session.sessionStartedAt=data.session.startedAt;
  data.session.startedAt=null;
}

function resumeSession(){
  if(data.session?.active)return;
  if(!data.session)data.session=clone(defaultData().session);
  data.session.active=true;
  data.session.startedAt=Date.now();
  if(!data.session.sessionStartedAt)data.session.sessionStartedAt=Date.now();
  if(!data.session.runs)data.session.runs=Object.fromEntries(activeFarmKeys().map(farm=>[farm,0]));
  activeFarmKeys().forEach(farm=>{if(data.session.runs[farm]===undefined)data.session.runs[farm]=0});
  if(data.session.ppStart===undefined)data.session.ppStart=currentPP();
}

function buildSessionSummary(session=data.session){
  const elapsed=sessionElapsedSeconds();
  const farmRuns=Object.fromEntries(activeFarmKeys().map(farm=>[farm,session.runs?.[farm]||0]));
  const totalRuns=Object.values(farmRuns).reduce((sum,value)=>sum+value,0);
  const pp=session.ppGain||0;
  const hours=elapsed/3600;
  return {
    elapsed,
    farmRuns,
    totalRuns,
    pp,
    runsHour:hours>0?totalRuns/hours:0,
    ppHour:hours>0?pp/hours:0,
    status:session.active?"En cours":"Terminée"
  };
}

function renderSessionSummary(summary){
  const box=$("#sessionSummary");
  if(!box)return;
  box.innerHTML=`
    <section class="session-summary-hero">
      <div>
        <span>Durée</span>
        <strong>${formatChrono(summary.elapsed)}</strong>
      </div>
      <div>
        <span>Rendement</span>
        <strong>${formatRate(summary.ppHour,`${activeProgressShort()}/h`)}</strong>
      </div>
    </section>
    <section class="session-summary-grid">
      <div><span>Donjons suivis</span><strong>${summary.totalRuns}</strong></div>
      ${activeFarmKeys().map(farm=>`<div><span>${escapeHtml(familiarFarmLabel(farm))}</span><strong>${summary.farmRuns?.[farm]||0}</strong></div>`).join("")}
      <div><span>${escapeHtml(activeProgressShort())} gagnée</span><strong>+${summary.pp}</strong></div>
      <div><span>Donjons / heure</span><strong>${formatRate(summary.runsHour,"dj/h")}</strong></div>
      <div><span>Statut</span><strong>${summary.totalRuns>0?summary.status:"Aucun donjon"}</strong></div>
    </section>
  `;
}

function endSession(){
  if(!data.session)return;
  updateSessionPP();
  const summary=buildSessionSummary();
  if(data.chrono?.running)pauseChrono({silent:true});
  summary.status="Terminée";
  data.session.lastSummary=summary;
  data.session.active=false;
  data.session.totalSeconds=0;
  data.session.startedAt=null;
  data.session.sessionStartedAt=null;
  data.session.runs=Object.fromEntries(activeFarmKeys().map(farm=>[farm,0]));
  data.session.ppStart=currentPP();
  data.session.ppGain=0;
  data.chrono.seconds=0;
  data.chrono.running=false;
  data.chrono.startedAt=null;
  data.chrono.lastMarkSeconds=0;
  addActivity(`Session terminée : ${summary.totalRuns} donjon${summary.totalRuns>1?"s":""}, +${summary.pp} ${activeProgressShort()}`,"system");
  save();
  renderSession();
  renderChrono();
  renderSessionSummary(summary);
  openModal("sessionModal");
}

async function resetSession(){
  data.session=clone(defaultData().session);
  if(data.chrono){
    data.chrono.seconds=0;
    data.chrono.running=false;
    data.chrono.startedAt=null;
    data.chrono.lastMarkSeconds=0;
  }
  if(chronoTimer){
    clearInterval(chronoTimer);
    chronoTimer=null;
  }
  addActivity("Session effacée","system");
  save();
  renderSession();
  renderChrono();
  toast("Session effacée","reset","reset");
}


function notifyPPProgress(oldPP,newPP){
  const diff=newPP-oldPP;
  if(diff===0)return;

  const max=activeProgressMax();
  const oldPct=Math.min(100,(oldPP/max)*100);
  const newPct=Math.min(100,(newPP/max)*100);

  if(diff>0){
    triggerPykurReaction("energy");
    showPPFloat(diff);
    toast(`${activeFamiliar().shortLabel} gagne ${formatProgressGain(diff)} · ${oldPct.toFixed(1)}% → ${newPct.toFixed(1)}%`,"pp-progress","pp");
  }else{
    toast(`${activeFamiliar().shortLabel} perd ${Math.abs(diff)} ${activeProgressShort()} · ${oldPct.toFixed(1)}% → ${newPct.toFixed(1)}%`,"pp-loss","warning");
  }
}

function showPPFloat(amount=1){
  if(document.body.classList.contains("no-anim"))return;
  const target=$("#progressPercent") || $(".pykur-orb") || $("#prospection") || $(".pp-row");
  if(!target)return;
  const rect=target.getBoundingClientRect();
  const pop=document.createElement("div");
  pop.className="pp-float";
  pop.textContent=formatProgressGain(amount);
  pop.style.left=`${rect.left+rect.width/2}px`;
  pop.style.top=`${Math.max(18,rect.top-36)}px`;
  document.body.appendChild(pop);
  setTimeout(()=>pop.remove(),1900);
}

function centerOf(el){
  const rect=el?.getBoundingClientRect?.();
  if(!rect)return null;
  return {x:rect.left+rect.width/2,y:rect.top+rect.height/2};
}

function triggerRunEnergyTransfer(delta){
  if(document.body.classList.contains("no-anim"))return;
  const plus=$("#plus");
  const minus=$("#minus");
  const orb=$(".pykur-orb");
  if(!plus || !minus || !orb)return;
  const from=delta>0 ? centerOf(plus) : centerOf(orb);
  const to=delta>0 ? centerOf(orb) : centerOf(minus);
  if(!from || !to)return;
  const count=12+Math.floor(Math.random()*5);
  const duration=900+Math.random()*260;
  for(let i=0;i<count;i++){
    const p=document.createElement("span");
    p.className=`run-energy-particle${delta<0?" drain":""}`;
    const jitterStart={x:(Math.random()-.5)*54,y:(Math.random()-.5)*38};
    const jitterEnd={x:(Math.random()-.5)*58,y:(Math.random()-.5)*44};
    const startX=from.x+jitterStart.x;
    const startY=from.y+jitterStart.y;
    const endX=to.x+jitterEnd.x;
    const endY=to.y+jitterEnd.y;
    const angle=Math.atan2(endY-startY,endX-startX)*180/Math.PI;
    p.style.setProperty("--x",`${startX}px`);
    p.style.setProperty("--y",`${startY}px`);
    p.style.setProperty("--tx",`${endX-startX}px`);
    p.style.setProperty("--ty",`${endY-startY}px`);
    p.style.setProperty("--trail-angle",`${angle}deg`);
    p.style.setProperty("--size",`${8+Math.random()*6}px`);
    p.style.setProperty("--dur",`${duration+Math.random()*220}ms`);
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),duration+260);
  }
  setTimeout(()=>{
    if(delta>0)triggerPykurReaction("energy");
    else triggerPykurReaction("drain");
  },Math.max(420,duration-120));
}

function spawnPykurSparkles(count=5){
  if(document.body.classList.contains("no-anim"))return;
  const orb=$(".pykur-orb");
  if(!orb)return;
  const rect=orb.getBoundingClientRect();
  for(let i=0;i<count;i++){
    const p=document.createElement("span");
    p.className="pykur-sparkle";
    const angle=Math.random()*Math.PI*2;
    const radius=36+Math.random()*54;
    const x=rect.left+rect.width/2+Math.cos(angle)*radius;
    const y=rect.top+rect.height/2+Math.sin(angle)*radius;
    p.style.left=`${x}px`;
    p.style.top=`${y}px`;
    p.style.setProperty("--dx",`${(Math.random()-.5)*34}px`);
    p.style.setProperty("--dy",`${-18-Math.random()*28}px`);
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),760);
  }
}


function milestoneFlash(){
  const app=$(".app");
  if(!app || document.body.classList.contains("no-anim"))return;
  app.classList.add("milestone-flash");
  setTimeout(()=>app.classList.remove("milestone-flash"),900);
}

function triggerPykurReaction(kind="energy"){
  if(document.body.classList.contains("no-anim"))return;
  const orb=$(".pykur-orb");
  const card=$(".side > .card:first-child");
  const img=$("#pykurImg");
  if(!orb || !img)return;
  const orbClass=kind==="finish" ? "pykur-finish" : kind==="milestone" ? "pykur-milestone" : kind==="drain" ? "pykur-drain" : "pykur-energize";
  orb.classList.remove("pykur-energize","pykur-milestone","pykur-finish","pykur-drain");
  card?.classList.remove("pykur-milestone");
  img.classList.remove("pop");
  void orb.offsetWidth;
  orb.classList.add(orbClass);
  if(kind==="milestone")card?.classList.add("pykur-milestone");
  img.classList.add("pop");
  if(kind==="milestone")spawnPykurSparkles(5);
  if(kind==="finish")spawnPykurSparkles(10);
  setTimeout(()=>{
    orb.classList.remove(orbClass);
    if(kind==="milestone")card?.classList.remove("pykur-milestone");
  },kind==="finish" ? 1250 : kind==="milestone" ? 1150 : 900);
}

function triggerPykurMood(kind){
  if(document.body.classList.contains("no-anim"))return;
  const img=$("#pykurImg");
  if(!img)return;
  const cls=kind==="grumpy" ? "pykur-grumpy" : "pykur-happy";
  img.classList.remove("pykur-happy","pykur-grumpy");
  void img.offsetWidth;
  img.classList.add(cls);
  setTimeout(()=>img.classList.remove(cls),320);
}

function schedulePykurMicroLife(){
  clearTimeout(schedulePykurMicroLife.timer);
  const delay=30000+Math.random()*60000;
  schedulePykurMicroLife.timer=setTimeout(runPykurMicroLife,delay);
}

function runPykurMicroLife(){
  const img=$("#pykurImg");
  if(!img || document.body.classList.contains("no-anim") || document.hidden){
    schedulePykurMicroLife();
    return;
  }
  if(img.classList.contains("pykur-happy") || img.classList.contains("pykur-grumpy") || img.classList.contains("pop") || $(".pykur-orb")?.classList.contains("pykur-milestone")){
    schedulePykurMicroLife();
    return;
  }
  const choices=["pykur-life-blink","pykur-life-left","pykur-life-right","pykur-life-tilt","pykur-life-breathe"];
  const cls=choices[Math.floor(Math.random()*choices.length)];
  img.classList.remove(...choices);
  void img.offsetWidth;
  img.classList.add(cls);
  setTimeout(()=>img.classList.remove(cls),1200);
  schedulePykurMicroLife();
}

function checkMilestones(oldPP,newPP){
  if(!data.stats.milestones)data.stats.milestones={};
  [10,20,30,40,50,60,70,80,90,100].forEach(p=>{
    const target=Math.round(activeProgressMax()*p/100);
    if(oldPP<target && newPP>=target && !data.stats.milestones[p]){
      data.stats.milestones[p]=true;
      toast(`🏆 ${activeFamiliar().shortLabel} a atteint ${p}% de progression !`,"milestone","unlock");
      alhassReact("milestone",p>=100);
      milestoneFlash();
      triggerPykurReaction(p>=100 ? "finish" : "milestone");
      addActivity(`Palier atteint : ${p}% de progression`,"success");
    }
  });
}




function updatePykurImageByPP(pp){
  const img=$("#pykurImg");
  if(!img)return;

  img.classList.toggle("aura-active", pp >= activeProgressMax() && !data.ui?.capyMode);

  if(data.ui?.capyMode){
    img.onerror=()=>{
      img.onerror=null;
      if(data.ui)data.ui.capyMode=false;
      document.body.classList.remove("capy-mode");
      updateProgressTitle();
      setPykurImageSafely(getPykurImageSrc(pp), pp >= activeProgressMax() ? `Aura ${activeFamiliar().shortLabel}` : activeFamiliar().shortLabel);
      toast("Capy est introuvable dans ./assets/images/capy.png. Retour du Pykur pour éviter un bug.","error","error");
      save();
    };
    setPykurImageSafely(CAPY_IMAGE_SRC,"Capykur");
    return;
  }

  img.onerror=null;
  setPykurImageSafely(getPykurImageSrc(pp), pp >= activeProgressMax() ? `Aura ${activeFamiliar().shortLabel}` : activeFamiliar().shortLabel);
}

function renderFamiliarContext(){
  const familiar=activeFamiliar();
  const unit=activeProgressShort();
  if(!dofusState.selectedFamiliar)dofusState.selectedFamiliar=activeFamiliarId();
  document.body.dataset.familiar=activeFamiliarId();
  document.documentElement.style.setProperty("--familiar-bg",`url("${familiar.background||"./assets/images/fond.webp"}")`);
  document.documentElement.style.setProperty("--familiar-bg-size","cover");
  $$(".pp-summary-label").forEach(el=>el.textContent=familiar.progressLabel);
  $$(".pp-summary-goal").forEach(el=>el.textContent=`/ ${familiar.objectiveLabel}`);
  const ppIcon=$(".pp-summary-icon img");
  if(ppIcon){
    ppIcon.onerror=()=>{
      ppIcon.onerror=null;
      ppIcon.src=assetPath(familiar.icon||"./assets/images/prospection.png");
    };
    ppIcon.src=`./assets/optimized/catalog/${familiar.id}-icon.webp`;
  }
  const quickLabel=$(".quick-projection-label");
  if(quickLabel)quickLabel.textContent=`Prochaine ${unit}`;
  const sessionProgressLabel=$("#sessionPP")?.previousElementSibling;
  if(sessionProgressLabel)sessionProgressLabel.textContent=unit;
  const tooltipCopy={
    sessionEnd:`Termine la session et affiche un résumé : durée, donjons, ${unit} gagnée et rendement.`,
    plus:`Ajoute un parcours au suivi actif. Les monstres, la ${unit}, les statistiques et la session en cours sont mis à jour automatiquement.`,
    minus:`Retire un parcours du suivi actif pour corriger une erreur. Les monstres et la ${unit} sont ajustés.`,
    statsButton:`Ouvre le tableau de bord du profil : donjons du jour, séries, ${unit}, monstres et temps chrono.`,
    activityButton:`Affiche les dernières actions enregistrées : donjons ajoutés, ${unit} gagnée, chrono, sauvegardes et modifications.`,
    projectionButton:`Ouvre les prévisions : parcours restants pour la prochaine ${unit}, objectif 100%, temps estimé et rendement.`
  };
  Object.entries(tooltipCopy).forEach(([id,text])=>{
    const el=$("#"+id);
    if(el)el.dataset.tooltip=text;
  });
  const progressCaption=$(".side .card:first-child small");
  if(progressCaption)progressCaption.textContent=`Progression du ${familiar.label}`;
  const farmToggle=$(".farm-toggle");
  if(farmToggle){
    farmToggle.innerHTML=familiar.dungeons.map(dungeon=>`<button class="farm-choice tooltip" type="button" data-farm-choice="${dungeon.key}" data-tooltip="Sélectionne ${escapeHtml(dungeon.label)} pour que + Run ajoute ce parcours et ses monstres associés.">${dungeon.asset?`<img src="${assetPath(dungeon.asset)}" alt="">`:""}<span>${escapeHtml(dungeon.label)}</span></button>`).join("");
    farmToggle.querySelectorAll("[data-farm-choice]").forEach(btn=>btn.addEventListener("click",()=>{
      data.ui.farm=btn.dataset.farmChoice;
      data.ui.tab=btn.dataset.farmChoice;
      save();
      renderAll();
    }));
  }
  const farmSelect=$("#farmSelect");
  if(farmSelect){
    farmSelect.innerHTML=familiar.dungeons.map(dungeon=>`<option value="${dungeon.key}">${escapeHtml(dungeon.fullLabel)}</option>`).join("");
  }
  const dungeonSummary=$(".dungeon-summary");
  if(dungeonSummary){
    dungeonSummary.innerHTML=familiar.dungeons.map(dungeon=>{
      const id=farmDomId(dungeon.key);
      const art=dungeon.asset ? ` style="--dungeon-art:url('${assetPath(dungeon.asset).replace(/'/g,"%27")}')"` : "";
      return `<div class="card dungeon-card dungeon-${dungeon.key}" data-dungeon-card="${dungeon.key}"${art}>
        <h3>${escapeHtml(dungeon.fullLabel)}</h3>
        ${dungeon.special==="salleAbrakne"?`<button class="btn ${data.special?.salleAbrakneActive?"btn-red":"btn-orange"} abra-room-button" type="button" id="abraRoomSetup" data-tooltip="${data.special?.salleAbrakneActive?"Termine la boucle Abrakne active.":"Ajoute les monstres des 4 premières salles avant la boucle Abrakne."}">${data.special?.salleAbrakneActive?"Sortir de la salle Abrakne":"Arrivé à la salle Abrakne"}</button>`:""}
        ${dungeon.special==="blopBoss"?`<label class="dungeon-variant-select"><span>Boss affronté</span><select class="gelutin-blop-boss-select" data-farm="${dungeon.key}">${gelutinBlopBossOptions().map(([value,label])=>`<option value="${value}" ${gelutinSelectedBoss()===value?"selected":""}>${label}</option>`).join("")}</select></label>`:""}
        <div class="dungeon-mini">
          <div class="dungeon-label">Effectués</div>
          <div class="dungeon-value green-text" id="done${id}">0</div>
        </div>
        <div class="dungeon-mini">
          <div class="dungeon-label">Restants</div>
          <div class="dungeon-value red-text" id="remain${id}">0</div>
        </div>
        <div class="dungeon-mini full tooltip" id="${dungeon.key}EstimateBox" data-tooltip="Cliquez pour renseigner votre temps moyen.">
          <div class="dungeon-label">Temps estimé restant</div>
          <div class="dungeon-value blue-text" id="time${id}">≈ 0s</div>
        </div>
      </div>`;
    }).join("");
    $("#abraRoomSetup")?.addEventListener("click",markAbraRoomReached);
    $$(".gelutin-blop-boss-select").forEach(select=>{
      select.addEventListener("change",event=>{
        if(!data.special)data.special={};
        data.special.blopBoss=GELUTIN_BLOP_BOSS_GAINS[event.target.value] ? event.target.value : "blopCocoRoyal";
        ["donjonBlops","antreBlopMulticolore"].forEach(farm=>{
          if((data.runs?.[farm]||0)>0)syncMobsFromRuns(farm);
        });
        save();
        renderAll();
        toast(`Boss Blop sélectionné : ${event.target.options[event.target.selectedIndex]?.textContent||"Blop"}`,"info","click");
      });
    });
    familiar.dungeons.forEach(dungeon=>{
      $(`#${dungeon.key}EstimateBox`)?.addEventListener("click",()=>setAverageTime(dungeon.key));
    });
  }
  const createButton=$("#createProfile");
  if(createButton){
    createButton.dataset.tooltip="Crée un nouveau profil et choisissez le familier à suivre.";
  }
  const projectionTitle=$("#projectionModal .modal-head h2 span");
  if(projectionTitle)projectionTitle.textContent=`Projection du ${familiar.shortLabel}`;
  const monsterTabs=$("#monstersModal .monster-tabs");
  if(monsterTabs){
    monsterTabs.innerHTML=[
      ...familiar.dungeons.map(dungeon=>`<button class="btn btn-blue tooltip" data-tab="${dungeon.key}" data-tooltip="Affiche les monstres comptés en ${escapeHtml(dungeon.fullLabel)}.">${escapeHtml(dungeon.label)}</button>`),
      `<button class="btn btn-blue tooltip" data-tab="zone" data-tooltip="Affiche les monstres ajoutés hors run direct.">Zone</button>`,
      `<button class="btn btn-blue tooltip" data-tab="all" data-tooltip="Affiche tous les monstres et le total par source.">Tous</button>`,
      `<button class="btn btn-orange tooltip" id="editMobs" data-tooltip="Corrige manuellement les compteurs de monstres.">Modifier</button>`
    ].join("");
    monsterTabs.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
      data.ui.tab=btn.dataset.tab;
      save();
      renderMonsterTable();
    }));
    $("#editMobs")?.addEventListener("click",()=>{buildMobEditor();openModal("editMobsModal")});
  }
}

function renderAll(){
  const pp=currentPP();
  const max=activeProgressMax();
  const pct=Math.min(100,(pp/max)*100);
  const awaken=pct>=100?"complete":pct>=75?"surge":pct>=50?"pulse":pct>=25?"spark":"seed";
  document.body.dataset.awaken=awaken;
  document.body.dataset.farmActive=data.ui?.farm||"morose";
  renderFamiliarContext();
  $("#progressFill").style.width=pct+"%";
  $("#progressPercent").textContent=pct.toFixed(2)+" %";
  $("#prospection").textContent=pp;
  updateProgressTitle();
  document.body.classList.toggle("capy-mode",!!data.ui?.capyMode);
  updatePykurImageByPP(pp);
  activeFarmKeys().forEach(farm=>{
    const id=farmDomId(farm);
    const doneEl=$(`#done${id}`);
    if(doneEl)doneEl.textContent=data.runs[farm]||0;
  });
  renderDungeonEstimates();
  $("#farmSelect").value=data.ui.farm;
  updateFarmUI();
  updateQuickProjection();
  renderSession();
  renderMonsterTable();
  renderStats();
  renderActivity();
  renderChrono();
  renderChronoHistory();
  renderRunTimesPanel();
  checkProgressAchievements();
  checkDungeonAchievements();
  renderHiddenSecretEgg();
  renderAchievements();
  setTimeout(()=>maybeShowCompletionModal(),0);
}

function updateFarmUI(){
  const farms=activeFarmKeys();
  const farm=farms.includes(data.ui.farm)?data.ui.farm:(farms[0]||"morose");
  $$(".farm-choice").forEach(btn=>{
    const active=btn.dataset.farmChoice===farm;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-pressed",active?"true":"false");
  });
  $$("[data-dungeon-card]").forEach(card=>card.classList.toggle("active-farm",card.dataset.dungeonCard===farm));
}

function updateQuickProjection(){
  const target=$("#nextPPSummary");
  if(!target)return;
  const quickCard=target.closest(".quick-projection");
  quickCard?.classList.toggle("quick-projection-multi",activeFarmKeys().length>=3);
  const pp=currentPP();
  const max=activeProgressMax();
  if(pp>=max){
    target.textContent="Objectif atteint";
    return;
  }
  const nextTarget=Math.min(max,Math.floor(pp)+1);
  const lines=activeFarmKeys().map(farm=>{
    const runs=simulateRunsForPP(farm,nextTarget);
    const gain=runs===null || runs===undefined ? null : Math.max(0,simulatePPAfterRuns(farm,runs)-pp);
    return `
      <div class="quick-projection-run">
        <span>${escapeHtml(familiarFarmLabel(farm))} ${formatProjectionRuns(runs)}</span>
        <span class="quick-projection-gain">${formatProgressGain(gain)} (${formatProgressValue(pp)} → ${formatProgressValue(pp+(gain||0))})</span>
      </div>`;
  }).join("");
  target.innerHTML=`
    <div class="quick-projection-lines">
      ${lines}
    </div>
  `;
  renderChronoEstimate();
}

function dungeonEstimateFor(farm){
  const baseRemaining=simulateRemaining(farm);
  const avgKey=farmAverageKey(farm);
  const rawAvg=parseInt(data.stats[avgKey],10)||0;
  const avg=rawAvg || farmDefaultAverage(farm);
  const auto=!!data.settings.autoDungeonEstimate;
  const canUseAuto=auto && rawAvg>0;
  const remaining=baseRemaining;
  return {
    farm,
    auto,
    canUseAuto,
    baseRemaining,
    chronoRuns:0,
    remaining,
    avg,
    rawAvg,
    missingAverage:auto && rawAvg<=0
  };
}

function averageTimeLabel(seconds){
  const value=Math.max(0,Math.round(seconds||0));
  if(value<=0)return "non défini";
  const minutes=Math.floor(value/60);
  const secs=value%60;
  return `${minutes}:${String(secs).padStart(2,"0")}`;
}

function renderDungeonEstimates(){
  for(const farm of activeFarmKeys()){
    const estimate=dungeonEstimateFor(farm);
    const id=farmDomId(farm);
    const remainEl=$(`#remain${id}`);
    const timeEl=$(`#time${id}`);
    const boxEl=$(`#${farm}EstimateBox`);
    const label=familiarFarmLabel(farm);

    if(remainEl){
      remainEl.textContent=estimate.remaining;
      remainEl.classList.toggle("auto-estimated",estimate.canUseAuto);
      remainEl.title=estimate.canUseAuto
        ? "Nombre basé uniquement sur la progression validée."
        : "";
    }

    if(timeEl){
      timeEl.textContent="≈ "+formatDuration(estimate.remaining*estimate.avg);
      timeEl.classList.toggle("auto-estimated",estimate.canUseAuto);
      timeEl.title=estimate.canUseAuto
        ? `Temps recalculé avec le chrono et le temps moyen ${label}`
        : "";
    }

    if(boxEl){
      const baseTooltip=`Clique pour ajuster le temps estimé restant ${label}.`;
      const currentLine=`Temps moyen actuel : ${averageTimeLabel(estimate.rawAvg)}`;
      boxEl.dataset.tooltip=estimate.canUseAuto
        ? `${baseTooltip}\n\nLe nombre de donjons restants ne baisse qu'après une run validée.\n\n${currentLine}`
        : estimate.missingAverage
          ? `${baseTooltip}\n\nTemps moyen manquant pour l'estimation automatique.\n\n${currentLine}`
          : `${baseTooltip}\n\n${currentLine}`;
    }
  }
}

function buildChronoEstimate(){
  if(!data.settings.autoDungeonEstimate)return null;
  const elapsed=getChronoSeconds();
  if(elapsed<=0)return null;
  const missing=activeFarmKeys().filter(farm=>(parseInt(data.stats[farmAverageKey(farm)],10)||0)<=0);
  if(missing.length)return {message:`Configure les temps moyens ${missing.map(farm=>familiarFarmLabel(farm)).join(", ")} pour activer l'estimation.`};
  const possible=Object.fromEntries(activeFarmKeys().map(farm=>[farm,Math.floor(elapsed/(parseInt(data.stats[farmAverageKey(farm)],10)||1))]));
  return {
    ...possible,
    message:`Estimation chrono : ${activeFarmKeys().map(farm=>`${possible[farm]} ${familiarFarmLabel(farm)}`).join(" ou ")} possibles sur ${formatChrono(elapsed)}.`
  };
}

function renderChronoEstimate(){
  const box=$("#chronoEstimate");
  if(!box)return;
  box.classList.remove("show");
  box.innerHTML="";
}

async function chooseFamiliarForProfile(defaultId="pykur"){
  let selected=normalizeFamiliarId(defaultId);
  const cards=Object.values(FAMILIARS).map((familiar,index)=>{
    const search=[familiar.label,familiar.progressLabel,familiar.progressShort,familiar.description,...(familiar.farmMethods||[]),familiar.difficultyLabel].join(" ").toLowerCase();
    const stars="★".repeat(Math.max(1,Math.min(3,Number(familiar.difficultyStars)||1)));
    return `
    <label class="familiar-choice-card ${familiar.id===selected?"selected":""}" data-familiar-card data-card-index="${index}" data-search="${escapeHtml(search)}">
      <input type="radio" name="newProfileFamiliar" value="${familiar.id}" ${familiar.id===selected?"checked":""}>
      <span class="familiar-choice-portrait">
        <img class="familiar-choice-art" data-src="./assets/optimized/catalog/${familiar.id}.webp" data-fallback="${assetPath(familiar.logo||familiar.image)}" alt="" decoding="async">
        <span class="familiar-choice-bonus"><img data-src="./assets/optimized/catalog/${familiar.id}-icon.webp" data-fallback="${assetPath(familiar.icon)}" alt="" decoding="async"> ${familiar.bonusAmount||familiar.objectiveMax} ${escapeHtml(familiar.progressShort)}</span>
      </span>
      <span class="familiar-choice-content">
        <strong>${escapeHtml(familiar.label)}</strong>
        <small>${escapeHtml(familiar.description)}</small>
        ${familiar.estimateNote?`<span class="familiar-choice-note">${escapeHtml(familiar.estimateNote)}</span>`:""}
        <span class="familiar-choice-meta">
          <span>Farm : ${escapeHtml((familiar.farmMethods||familiar.dungeons.map(d=>d.fullLabel)).join(" · "))}</span>
          <span>Difficulté : ${escapeHtml((familiar.difficultyLabel||"Facile").toLowerCase())}<b class="familiar-choice-stars" aria-label="${stars.length} étoiles">${stars}</b></span>
        </span>
      </span>
    </label>
  `}).join("");
  const ok=await showConfirm("",{
    title:"Choisir un familier",
    subtitle:"Sélectionnez le familier à suivre pour ce profil.",
    okLabel:"Continuer",
    dialogClass:"familiar-choice-dialog",
    html:`<input class="familiar-choice-search" id="familiarChoiceSearch" type="search" placeholder="Rechercher un familier..."><div class="familiar-choice-toolbar"><span id="familiarChoiceCount"></span><span class="familiar-choice-pages"><button class="btn btn-gray" id="familiarChoicePrev" type="button">Précédent</button><span class="familiar-choice-page-label" id="familiarChoicePageLabel"></span><button class="btn btn-gray" id="familiarChoiceNext" type="button">Suivant</button></span></div><div class="familiar-choice-grid" id="familiarChoiceGrid">${cards}<div class="familiar-choice-empty hidden" id="familiarChoiceEmpty">Aucun familier trouvé.</div></div>`,
    onRender:({msg})=>{
      const perPage=4;
      let page=0;
      const update=()=>{
        msg.querySelectorAll(".familiar-choice-card").forEach(card=>{
          card.classList.toggle("selected",card.querySelector("input")?.checked);
        });
        selected=msg.querySelector("input[name='newProfileFamiliar']:checked")?.value || "pykur";
      };
      msg.querySelectorAll("input[name='newProfileFamiliar']").forEach(input=>input.addEventListener("change",update));
      const searchInput=msg.querySelector("#familiarChoiceSearch");
      const empty=msg.querySelector("#familiarChoiceEmpty");
      const countEl=msg.querySelector("#familiarChoiceCount");
      const pageLabel=msg.querySelector("#familiarChoicePageLabel");
      const prevBtn=msg.querySelector("#familiarChoicePrev");
      const nextBtn=msg.querySelector("#familiarChoiceNext");
      const filterCards=()=>{
        const query=(searchInput?.value||"").trim().toLowerCase();
        const matched=[];
        msg.querySelectorAll("[data-familiar-card]").forEach(card=>{
          const match=!query || (card.dataset.search||"").includes(query);
          if(match)matched.push(card);
        });
        const totalPages=Math.max(1,Math.ceil(matched.length/perPage));
        page=Math.min(page,totalPages-1);
        const start=page*perPage;
        const end=start+perPage;
        msg.querySelectorAll("[data-familiar-card]").forEach(card=>card.classList.add("hidden"));
        matched.forEach((card,index)=>{
          card.classList.toggle("hidden",index<start || index>=end);
          if(index>=start && index<end)card.querySelectorAll("img[data-src]").forEach(img=>{
            img.onerror=()=>{if(img.dataset.fallback && img.src!==img.dataset.fallback)img.src=img.dataset.fallback};
            img.src=img.dataset.src;
            delete img.dataset.src;
          });
        });
        if(empty)empty.classList.toggle("hidden",matched.length>0);
        if(countEl)countEl.textContent=matched.length ? `${matched.length} familier${matched.length>1?"s":""} disponible${matched.length>1?"s":""}` : "Aucun résultat";
        if(pageLabel)pageLabel.textContent=`Page ${matched.length ? page+1 : 0}/${matched.length ? totalPages : 0}`;
        if(prevBtn)prevBtn.disabled=page<=0 || matched.length<=perPage;
        if(nextBtn)nextBtn.disabled=page>=totalPages-1 || matched.length<=perPage;
      };
      searchInput?.addEventListener("input",()=>{page=0;filterCards();});
      prevBtn?.addEventListener("click",()=>{page=Math.max(0,page-1);filterCards();});
      nextBtn?.addEventListener("click",()=>{page+=1;filterCards();});
      update();
      filterCards();
    }
  });
  return ok ? normalizeFamiliarId(selected) : null;
}

async function maybePromptInitialFamiliarChoice(){
  if(!store?.needsFamiliarChoice)return;
  const ids=Object.keys(store.profiles||{});
  if(ids.length===0){
    await createProfileFromChoice({initial:true});
    return;
  }
  if(ids.length!==1)return;
  const profile=store.profiles[ids[0]];
  if(!profile?.data)return;
  const hasProgress=(profile.data.runs?.morose||0)>0 || (profile.data.runs?.tynril||0)>0 || currentPP()>0;
  if(hasProgress){
    store.needsFamiliarChoice=false;
    save();
    return;
  }
  const familiarId=await chooseFamiliarForProfile(profile.data.familiarId||"pykur");
  if(!familiarId)return;
  const familiar=FAMILIARS[familiarId]||FAMILIARS.pykur;
  const name=((await showPrompt("Nom du profil :",{title:"Créer un profil",defaultValue:familiar.defaultProfileName,okLabel:"Créer"}))||"").trim();
  if(!name)return;
  profile.name=name;
  profile.data=defaultDataForFamiliar(familiar.id);
  profile.data.settings.helpAutoDisabled=true;
  profile.data.ui.helpSeen=false;
  activeProfile=ids[0];
  store.active=activeProfile;
  data=clone(profile.data);
  ensureData();
  store.needsFamiliarChoice=false;
  save();
  renderProfiles();
  renderAll();
  toast(`${familiar.label} sélectionné pour ce profil.`,"success","click");
  setTimeout(()=>startHelp(),220);
}

function renderProfiles(){
  const select=$("#profileSelect");
  select.innerHTML="";
  const ids=Object.keys(store.profiles||{});
  if(!ids.length){
    const opt=document.createElement("option");
    opt.value="";
    opt.textContent="Aucun profil";
    select.appendChild(opt);
    select.value="";
    return;
  }
  for(const id in store.profiles){
    const profile=store.profiles[id];
    const familiar=FAMILIARS[normalizeFamiliarId(profile?.data?.familiarId)]||FAMILIARS.pykur;
    const opt=document.createElement("option");
    opt.value=id;
    opt.textContent=familiar.id==="pykur" ? profile.name : `${profile.name} · ${familiar.label}`;
    select.appendChild(opt);
  }
  select.value=activeProfile;
}

async function createProfile(){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  await createProfileFromChoice({initial:false});
}

async function createProfileFromChoice({initial=false}={}){
  const familiarId=await chooseFamiliarForProfile("pykur");
  if(!familiarId)return;
  const familiar=FAMILIARS[familiarId]||FAMILIARS.pykur;
  const name=((await showPrompt("Nom du profil :",{title:"Créer un profil",defaultValue:familiar.defaultProfileName,okLabel:"Créer"}))||"").trim();
  if(!name)return;
  if(hasActiveProfile())save();
  const id="p_"+Date.now();
  store.profiles[id]={name,data:defaultDataForFamiliar(familiarId)};
  if(initial){
    store.profiles[id].data.settings.helpAutoDisabled=true;
    store.profiles[id].data.ui.helpSeen=false;
  }
  store.needsFamiliarChoice=false;
  activeProfile=id;store.active=id;data=clone(store.profiles[id].data);
  applySharedSettingsToData();
  applySharedAchievementsToData();
  syncGlobalSoundSetting();
  ensureData();syncChronoTimerForProfile();save();renderProfiles();renderAll();
  unlockAchievement("create_profile");
  toast(`Profil ${familiar.label} créé`,"success");
  if(initial)setTimeout(()=>startHelp(),220);
}

async function renameProfile(){
  const current=store.profiles[activeProfile].name;
  const name=((await showPrompt("Nouveau nom :",{title:"Renommer le profil",defaultValue:current,okLabel:"Renommer"}))||"").trim();
  if(!name)return;
  store.profiles[activeProfile].name=name;
  save();renderProfiles();toast("Profil renommé","info");
}

async function deleteProfile(){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  if(Object.keys(store.profiles).length<=1){toast("Impossible de supprimer le dernier profil","error");return}
  const beforeStore=clone(store);
  const beforeActive=activeProfile;
  const profileName=store.profiles[activeProfile]?.name || "Profil";
  if(!await showConfirm("",{
    title:"Supprimer le profil",
    subtitle:"Toutes les données associées à ce profil seront supprimées.",
    danger:true,
    okLabel:"Supprimer",
    html:`<p><strong>Profil :</strong></p><p>${escapeHtml(profileName)}</p><p>Toutes les données associées seront supprimées :</p><ul><li>progression</li><li>statistiques</li><li>historique</li><li>galerie locale</li></ul><p><strong>Cette action est irréversible.</strong></p>`
  }))return;
  store.deletedProfiles=Object.assign({},store.deletedProfiles||{});
  store.deletedProfiles[activeProfile]=new Date().toISOString();
  delete store.profiles[activeProfile];
  activeProfile=Object.keys(store.profiles)[0];
  store.active=activeProfile;
  data=clone(store.profiles[activeProfile].data);
  applySharedSettingsToData();
  applySharedAchievementsToData();
  ensureData();syncChronoTimerForProfile();save();renderProfiles();renderAll();
  toastUndo("Profil supprimé.","Annuler",()=>{
    store=clone(beforeStore);
    store.deletedProfiles=Object.assign({},store.deletedProfiles||{});
    delete store.deletedProfiles[beforeActive];
    activeProfile=beforeActive;
    store.active=activeProfile;
    data=clone(store.profiles[activeProfile].data);
    ensureStoreGallery();
    ensureStoreOptionsSharing();
    ensureStoreAchievementSharing();
    applySharedSettingsToData();
    applySharedAchievementsToData();
    ensureData();
    syncChronoTimerForProfile();
    save();
    applySettings();
    renderProfiles();
    renderAll();
    toast("Suppression du profil annulée.","undo","undo");
  });
}

function switchProfile(id){
  if(!store.profiles?.[id])return;
  save();
  activeProfile=id;
  data=clone(store.profiles[activeProfile].data);
  ensureData();
  applySharedSettingsToData();
  applySharedAchievementsToData();
  syncGlobalSoundSetting();
  applySettings();
  syncChronoTimerForProfile();
  renderProfiles();
  renderAll();
  save();
  toast(`Profil changé : ${store.profiles[activeProfile].name}`,"profile","success");
}

function renderMonsterTable(){
  const validTabs=[...activeFarmKeys(),"zone","all"];
  if(!validTabs.includes(data.ui.tab))data.ui.tab=activeFarmKeys()[0]||"all";
  const tab=data.ui.tab;
  const table=$("#monsterTable");
  ensureMonsterTools();
  table.innerHTML="";
  $$("#monstersModal [data-tab]").forEach(btn=>btn.classList.toggle("active",btn.dataset.tab===tab));
  const header=document.createElement("div");
  header.className="monster-row header "+(tab==="all"?"all":"");
  if(tab==="all"){
    header.innerHTML=`<span></span><span>Monstre</span>${activeFarmKeys().map(farm=>`<span>${escapeHtml(familiarFarmLabel(farm))}</span>`).join("")}<span>Zone</span><span>Total</span>`;
    header.style.gridTemplateColumns=`56px minmax(0,1fr) repeat(${activeFarmKeys().length+2},minmax(54px,auto)) 36px`;
  }else{
    header.innerHTML="<span></span><span>Monstre</span><span>Total</span>";
  }
  table.appendChild(header);

  const search=(data.ui.monsterSearch||"").toLowerCase();
  const favs=data.ui.monsterFavs||[];
  const totals=totalMobs();
  let ids=Object.keys(mobs).filter(id=>{
    if(tab==="all")return true;
    if(tab==="zone")return zoneIds.includes(id);
    return mobs[id].cat.includes(tab);
  });

  if(search){
    ids=ids.filter(id=>mobs[id].name.toLowerCase().includes(search));
  }

  ids.sort((a,b)=>{
    const favDelta=(favs.includes(b)?1:0)-(favs.includes(a)?1:0);
    if(favDelta)return favDelta;
    if(data.ui.monsterSort==="name")return mobs[a].name.localeCompare(mobs[b].name,"fr");
    if(data.ui.monsterSort==="pp")return mobs[a].ppNeed-mobs[b].ppNeed;
    if(data.ui.monsterSort==="frequency"){
      const gainA=Math.max(1,parseInt(mobs[a]?.gainValue,10)||1);
      const gainB=Math.max(1,parseInt(mobs[b]?.gainValue,10)||1);
      return (((totals[b]||0)/mobs[b].ppNeed)*gainB)-(((totals[a]||0)/mobs[a].ppNeed)*gainA);
    }
    return (totals[b]||0)-(totals[a]||0);
  });
  renderMonsterSummary(ids,totals,favs);

  if(!ids.length){
    const empty=document.createElement("div");
    empty.className="empty-state-card";
    empty.innerHTML="<strong>Aucun monstre trouvé</strong><span>Modifiez la recherche ou changez de catégorie pour retrouver vos monstres suivis.</span>";
    table.appendChild(empty);
    return;
  }

  ids.forEach((id,index)=>{
    const m=mobs[id];
    const row=document.createElement("div");
    const sourceClass=tab==="all"?"":`source-${tab}`;
    const rankClass=data.ui.monsterSort==="total" && index<3 ? `rank-${index+1}` : "";
    const favActive=favs.includes(id);
    const total=[...activeFarmKeys(),"zone"].reduce((sum,source)=>sum+(data.mobs?.[source]?.[id]||0),0);
    const progressNote=monsterProgressNote(id,total);
    row.className=["monster-row",tab==="all"?"all":"",sourceClass,m.cat.includes(data.ui.farm)?"current-farm":"",favActive?"is-favorite":"",rankClass].filter(Boolean).join(" ");
    const favBtn=`<button class="btn monster-fav ${favActive?"is-active":""}" type="button" data-monster-fav="${id}" aria-label="Favori ${m.name}">${favActive?"★":"☆"}</button>`;
    const imgSrc=m.imgPath || `./assets/images/${m.img}`;
    if(tab==="all"){
      row.style.gridTemplateColumns=`56px minmax(0,1fr) repeat(${activeFarmKeys().length+2},minmax(54px,auto)) 36px`;
      row.innerHTML=`<img class="monster-icon" src="${imgSrc}" alt="" loading="lazy" decoding="async"><span class="monster-name">${m.name}<small class="monster-progress-note">${progressNote}</small></span>${activeFarmKeys().map(farm=>`<span class="monster-value">${data.mobs?.[farm]?.[id]||0}</span>`).join("")}<span class="monster-value">${data.mobs.zone[id]||0}</span><span class="monster-value">${total}</span>${favBtn}`;
    }else{
      row.innerHTML=`<img class="monster-icon" src="${imgSrc}" alt="" loading="lazy" decoding="async"><span class="monster-name">${m.name}<small class="monster-progress-note">${progressNote}</small></span><span class="monster-value">${data.mobs?.[tab]?.[id]||0}</span>${favBtn}`;
    }
    table.appendChild(row);
  });
}

function monsterProgressNote(id,totalKills=null){
  const monster=mobs[id];
  const need=parseInt(monster?.ppNeed,10)||0;
  const total=totalKills!==null ? (parseInt(totalKills,10)||0) : ([...activeFarmKeys(),"zone"].reduce((sum,source)=>sum+(data.mobs?.[source]?.[id]||0),0));
  if(!need)return `${total} tués • palier ${activeProgressShort()} inconnu`;
  const rest=total%need;
  const remaining=rest===0 ? need : need-rest;
  return `<span class="kill-count">${total} tués</span><span class="pp-rate">+1 ${activeProgressShort()} / ${need}</span><span class="next-pp">${remaining} restant${remaining>1?"s":""}</span>`;
}

function renderMonsterSummary(ids,totals,favs){
  const box=$("#monsterSummary");
  if(!box)return;
  const totalCount=Object.values(totals||{}).reduce((sum,value)=>sum+(parseInt(value,10)||0),0);
  const topId=Object.keys(totals||{}).sort((a,b)=>(totals[b]||0)-(totals[a]||0))[0];
  const topName=topId && totals[topId]>0 ? mobs[topId].name : "-";
  box.innerHTML=[
    ["Monstres suivis",ids.length],
    ["Favoris",favs.length],
    ["Monstre le plus tué",topName],
    ["Total comptabilisé",totalCount]
  ].map(([label,value])=>`<article class="monster-quick-stat"><span>${label}</span><strong>${value}</strong></article>`).join("");
}

function ensureMonsterTools(){
  const modal=$("#monstersModal .modal-body");
  if(!modal || $("#monsterTools"))return;
  const tools=document.createElement("div");
  tools.className="monster-tools";
  tools.id="monsterTools";
  tools.innerHTML=`
    <input id="monsterSearch" type="search" placeholder="Rechercher un monstre...">
    <select id="monsterSort">
      <option value="total">Tri rentabilité</option>
      <option value="frequency">Tri fréquence</option>
      <option value="pp">Tri PP requis</option>
      <option value="name">Tri nom</option>
    </select>
    <select id="monsterView">
      <option value="comfortable">Vue détaillée</option>
      <option value="compact">Vue compacte</option>
      <option value="analytics">Vue analytics</option>
    </select>
  `;
  modal.insertBefore(tools,$("#monsterTable"));
  const summary=document.createElement("div");
  summary.className="monster-quick-stats";
  summary.id="monsterSummary";
  modal.insertBefore(summary,$("#monsterTable"));
  $("#monsterSearch").value=data.ui.monsterSearch||"";
  $("#monsterSort").value=data.ui.monsterSort||"total";
  $("#monsterView").value=data.ui.monsterView||"comfortable";
  $("#monsterSearch").addEventListener("input",e=>{data.ui.monsterSearch=e.target.value;save();renderMonsterTable()});
  $("#monsterSort").addEventListener("change",e=>{data.ui.monsterSort=e.target.value;save();renderMonsterTable()});
  $("#monsterView").addEventListener("change",e=>{data.ui.monsterView=e.target.value;applySettings();save();renderMonsterTable()});
}

function hudTarget(bg){
  return bg?.querySelector(".modal,.side-panel");
}

function defaultHudRect(id){
  const preferred={
    optionsModal:{width:820,height:640},
    monstersModal:{width:900,height:620},
    editMobsModal:{width:780,height:560},
    statsModal:{width:760,height:560},
    activityModal:{width:760,height:560},
    projectionModal:{width:760,height:560},
    runTimesPanel:{width:760,height:520},
    sessionModal:{width:620,height:440}
  };
  const size=preferred[id]||{width:820,height:560};
  const w=Math.min(size.width,window.innerWidth-32);
  const h=Math.min(size.height,window.innerHeight-32);
  const offsets={
    statsModal:[24,24],
    projectionModal:[72,54],
    monstersModal:[120,84],
    activityModal:[48,96],
    runTimesPanel:[96,126],
    optionsModal:[144,36],
    sessionModal:[168,156],
    editMobsModal:[192,108]
  };
  const [ox,oy]=offsets[id]||[0,0];
  return {
    left:Math.max(16,Math.round((window.innerWidth-w)/2)+ox),
    top:Math.max(16,Math.round((window.innerHeight-h)/2)+oy),
    width:w,
    height:h
  };
}

function hudMin(id){
  return HUD_MIN[id]||{width:420,height:300};
}

function clampHudRect(rect,id=null){
  const min=hudMin(id);
  const minW=Math.min(min.width,window.innerWidth-24);
  const minH=Math.min(min.height,window.innerHeight-24);
  const margin=12;
  const width=Math.max(minW,Math.min(rect.width,window.innerWidth-margin*2));
  const height=Math.max(minH,Math.min(rect.height,window.innerHeight-margin*2));
  const left=Math.max(margin,Math.min(rect.left,window.innerWidth-width-margin));
  const top=Math.max(margin,Math.min(rect.top,window.innerHeight-height-margin));
  return {left,top,width,height};
}

function applyHudRect(id){
  const bg=$("#"+id);
  const win=hudTarget(bg);
  if(!bg || !win)return;
  const saved=data.hud?.windows?.[id] || defaultHudRect(id);
  const min=hudMin(id);
  win.style.setProperty("--hud-min-width",Math.min(min.width,window.innerWidth-24)+"px");
  win.style.setProperty("--hud-min-height",Math.min(min.height,window.innerHeight-24)+"px");
  const rect=clampHudRect(saved,id);
  win.style.setProperty("--hud-left",rect.left+"px");
  win.style.setProperty("--hud-top",rect.top+"px");
  win.style.setProperty("--hud-width",rect.width+"px");
  win.style.setProperty("--hud-height",rect.height+"px");
}

function saveHudRect(id){
  if(!data.settings.hudMode)return;
  const bg=$("#"+id);
  const win=hudTarget(bg);
  if(!bg?.classList.contains("show"))return;
  if(!win)return;
  const rect=win.getBoundingClientRect();
  if(!data.hud)data.hud=defaultData().hud;
  if(!data.hud.windows)data.hud.windows={};
  data.hud.windows[id]=clampHudRect({
    left:Math.round(rect.left),
    top:Math.round(rect.top),
    width:Math.round(rect.width),
    height:Math.round(rect.height)
  },id);
  save();
}

function bringHudToFront(id){
  const bg=$("#"+id);
  if(!bg)return;
  if(!data.hud)data.hud=defaultData().hud;
  data.hud.z=(data.hud.z||10050)+1;
  bg.style.zIndex=data.hud.z;
  $$(".hud-front").forEach(el=>el.classList.remove("hud-front"));
  bg.classList.add("hud-front");
}

let modalZIndexSeed=3000;
const modalFocusOrigins=new WeakMap();

function setupModalAccessibility(){
  $$(".modal-bg,.side-panel-bg").forEach((bg,index)=>{
    bg.setAttribute("aria-hidden",bg.classList.contains("show")?"false":"true");
    const panel=bg.querySelector(".modal,.side-panel");
    if(!panel)return;
    panel.setAttribute("role","dialog");
    panel.setAttribute("aria-modal","true");
    panel.setAttribute("tabindex","-1");
    const heading=panel.querySelector("h1,h2,h3");
    if(heading){
      if(!heading.id)heading.id=`${bg.id||`trackerModal${index}`}Title`;
      panel.setAttribute("aria-labelledby",heading.id);
    }else if(!panel.hasAttribute("aria-label")){
      panel.setAttribute("aria-label","Fenêtre du tracker");
    }
    const title=heading?.textContent?.trim()||"la fenêtre";
    panel.querySelectorAll("[data-close],.modal-close").forEach(button=>{
      if(!button.hasAttribute("aria-label"))button.setAttribute("aria-label",`Fermer ${title}`);
    });
  });
}

function openModal(id){
  const bg=$("#"+id);
  if(!bg)return;
  if(document.activeElement instanceof HTMLElement)modalFocusOrigins.set(bg,document.activeElement);
  const isStacked=["dofusConfigModal","dofusTutorialModal"].includes(id) && $("#optionsModal")?.classList.contains("show");
  bg.classList.toggle("stacked-modal",isStacked);
  bg.style.zIndex=String(++modalZIndexSeed);
  bg.classList.add("show");
  bg.setAttribute("aria-hidden","false");
  hydrateDeferredImages(bg);
  if(data.settings.hudMode){
    applyHudRect(id);
    bringHudToFront(id);
  }
  requestAnimationFrame(()=>{
    const focusTarget=bg.querySelector("[autofocus],.modal-close,[data-close],button,input,select,textarea,[tabindex]:not([tabindex='-1'])")||bg.querySelector(".modal,.side-panel");
    if(focusTarget instanceof HTMLElement)focusTarget.focus({preventScroll:true});
  });
}

function closeModal(id){
  if(id==="pykurCompletionModal" && pykurCompletionLocked){
    completionLock(false);
  }
  if(id==="dofusTutorialModal")resetDofusTutorialVideo();
  if(id==="projectionModal")resetProjectionSimulation();
  if(id==="chatboxModal")stopChatboxPolling();
  if(id==="communityProfileModal")clearCommunityProfileUrl();
  saveHudRect(id);
  const bg=$("#"+id);
  bg?.classList.remove("show","hud-front","stacked-modal");
  const previous=bg?modalFocusOrigins.get(bg):null;
  if(previous instanceof HTMLElement && previous.isConnected)previous.focus({preventScroll:true});
  bg?.setAttribute("aria-hidden","true");
  if(bg)modalFocusOrigins.delete(bg);
}

function clearCommunityProfileUrl(){
  const url=new URL(location.href);
  const hadProfile=url.searchParams.has("user")||url.searchParams.has("profil")||url.searchParams.has("profile");
  if(!hadProfile)return;
  url.searchParams.delete("user");
  url.searchParams.delete("profil");
  url.searchParams.delete("profile");
  history.replaceState(null,"",url.toString());
}

function resetDofusTutorialVideo(){
  const frame=$("#dofusVideoFrame");
  if(!frame)return;
  const video=frame.querySelector("video");
  if(video){
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  frame.innerHTML=`
    <button class="dofus-video-thumb" id="dofusVideoThumb" type="button" aria-label="Lancer le tutoriel vidéo">
      <img src="./assets/tuto/miniature.png" alt="Miniature du tutoriel vidéo de détection Dofus">
      <span class="dofus-play-badge" aria-hidden="true">▶</span>
    </button>
  `;
}

function playDofusTutorialVideo(){
  const frame=$("#dofusVideoFrame");
  if(!frame)return;
  frame.innerHTML=`
    <video controls autoplay preload="metadata" title="Tutoriel vidéo de configuration de la détection Dofus">
      <source src="./assets/tuto/tutoriel-detection-dofus.mp4" type="video/mp4">
      Votre navigateur ne peut pas lire cette vidéo.
    </video>
  `;
  frame.querySelector("video")?.play?.().catch(()=>{});
}

function simulateRunsForPP(farm,targetPP){
  const originalRuns=data.runs[farm]||0;
  const limit=typeof RUN_LIMITS!=="undefined" ? RUN_LIMITS[farm] : 999999;
  const current=currentPP();
  if(current>=targetPP)return 0;
  if(originalRuns>=limit)return null;

  const originalMobs=clone(data.mobs[farm]);
  let runs=0;

  for(let r=originalRuns+1;r<=limit;r++){
    data.runs[farm]=r;
    if(typeof syncMobsFromRuns==="function"){
      syncMobsFromRuns(farm);
    }else{
      const farmGains=effectiveFarmGains(farm);
      for(const id in farmGains)data.mobs[farm][id]=r*farmGains[id];
    }
    runs++;
    if(currentPP()>=targetPP){
      data.runs[farm]=originalRuns;
      data.mobs[farm]=originalMobs;
      return runs;
    }
  }

  data.runs[farm]=originalRuns;
  data.mobs[farm]=originalMobs;
  return null;
}

function formatProjectionRuns(value){
  if(value===null || value===undefined)return "Impossible";
  if(value<=0)return "Maintenant";
  return `${value} donjon${value>1?"s":""}`;
}

function estimateTimeForRuns(farm,runs){
  if(runs===null || runs===undefined || runs<=0)return "—";
  const avg=data.stats[farmAverageKey(farm)]||0;
  if(!avg)return "Temps moyen manquant";
  return formatDuration(avg*runs);
}

let projectionSimulation={morose:0,tynril:0};
let projectionView="summary";

function resetProjectionSimulation(){
  projectionSimulation=Object.fromEntries(activeFarmKeys().map(farm=>[farm,0]));
}

function setProjectionView(view="summary",shouldRender=true){
  projectionView=["summary","simulator","details"].includes(view)?view:"summary";
  document.querySelectorAll("[data-projection-view]").forEach(button=>{
    const active=button.dataset.projectionView===projectionView;
    button.classList.toggle("active",active);
    button.setAttribute("aria-selected",active?"true":"false");
  });
  if(shouldRender)renderProjection();
}

function simulatedProjectionMobs(){
  const sim=clone(totalMobs());
  activeFarmKeys().forEach(farm=>{
    const runs=projectionSimulation[farm]||0;
    const farmGains=effectiveFarmGains(farm);
    for(const id in farmGains)sim[id]=(sim[id]||0)+(farmGains[id]*runs);
  });
  return sim;
}

function simulateRunsForPPFromMobs(farm,targetPP,baseMobs,virtualRuns){
  if(ppFrom(baseMobs)>=targetPP)return 0;
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  const capacity=Math.max(0,limit-(virtualRuns[farm]||0));
  if(capacity<=0)return null;
  const sim=clone(baseMobs);
  const farmGains=effectiveFarmGains(farm);
  for(let count=1;count<=capacity;count++){
    for(const id in farmGains)sim[id]=(sim[id]||0)+farmGains[id];
    if(ppFrom(sim)>=targetPP)return count;
  }
  return null;
}

function adjustProjectionSimulation(farm,delta){
  const limit=RUN_LIMITS[farm]??Number.MAX_SAFE_INTEGER;
  const max=Math.max(0,limit-(data.runs[farm]||0));
  projectionSimulation[farm]=Math.max(0,Math.min(max,(projectionSimulation[farm]||0)+delta));
  renderProjection();
}

function renderProjection(){
  const box=$("#projectionContent");
  if(!box)return;

  const pp=currentPP();
  const max=activeProgressMax();
  const pct=Math.min(100,(pp/max)*100);
  const nextTarget=Math.min(max,Math.floor(pp)+1);
  const farmKeys=activeFarmKeys();
  const farmProjection=farmKeys.map(farm=>{
    const next=simulateRunsForPP(farm,nextTarget);
    const nextGain=next===null || next===undefined ? null : Math.max(0,simulatePPAfterRuns(farm,next)-pp);
    const full=simulateRunsForPP(farm,max);
    const rate=next && next>0 ? (1/next).toFixed(3) : "—";
    return {farm,next,nextGain,full,rate};
  });
  const chronoEstimate=buildChronoEstimate();
  const simMobs=simulatedProjectionMobs();
  const simPP=ppFrom(simMobs);
  const simGain=Math.max(0,simPP-pp);
  const simPct=Math.min(100,(simPP/max)*100);
  const virtualRuns=Object.fromEntries(farmKeys.map(farm=>[farm,(data.runs[farm]||0)+(projectionSimulation[farm]||0)]));
  const simLeft=farmKeys.map(farm=>({farm,left:simulateRunsForPPFromMobs(farm,max,simMobs,virtualRuns)}));
  const progressUnit=activeProgressShort();

  box.innerHTML=`
    <div class="projection-view-panel ${projectionView==="summary"?"active":""}" data-projection-panel="summary">
      <section class="projection-card wide">
        <div class="projection-head"><h3>Progression actuelle</h3><span class="projection-badge">${pct.toFixed(1)}%</span></div>
        <div class="projection-big">${formatProgressValue(pp)} / ${max} ${progressUnit}</div>
        <div class="projection-sub">Projection basée sur vos monstres et donjons actuels.</div>
        <div class="projection-progress"><span style="width:${pct}%"></span></div>
      </section>
      <section class="projection-card">
        <div class="projection-head"><h3>Prochain palier</h3><span class="projection-badge">Gain réel</span></div>
        <div class="projection-lines">
          ${farmProjection.map(item=>`
            <div class="projection-line"><span>${escapeHtml(familiarFarmLabel(item.farm))}</span><strong>${formatProjectionRuns(item.next)}</strong></div>
            <div class="projection-line gain-line"><span>Gain prévu</span><strong>${formatProgressGain(item.nextGain)} (${formatProgressValue(pp)} → ${formatProgressValue(pp+(item.nextGain||0))})</strong></div>
          `).join("")}
        </div>
      </section>
      <section class="projection-card">
        <div class="projection-head"><h3>Objectif 100%</h3><span class="projection-badge">${max} ${progressUnit}</span></div>
        <div class="projection-lines">
          ${farmProjection.map(item=>`<div class="projection-line"><span>${escapeHtml(familiarFarmLabel(item.farm))} restant</span><strong>${formatProjectionRuns(item.full)}</strong></div>`).join("")}
        </div>
        <div class="projection-summary-note">Consultez l'onglet Détails pour les estimations de temps et les rendements.</div>
        ${activeFamiliar().estimateNote?`<div class="projection-summary-note">${escapeHtml(activeFamiliar().estimateNote)}</div>`:""}
      </section>
    </div>

    <div class="projection-view-panel ${projectionView==="simulator"?"active":""}" data-projection-panel="simulator">
      <section class="projection-card wide">
        <div class="projection-head"><h3>Simulateur de donjons</h3><span class="projection-badge">Simulateur</span></div>
        <div class="projection-sub">Ces valeurs ne modifient pas votre ${escapeHtml(activeFamiliar().shortLabel)}, ne sauvegardent rien et ne débloquent aucun succès.</div>
        <div class="projection-sim-grid">
          ${farmKeys.map(farm=>`<div class="projection-sim-control">
            <span>${escapeHtml(familiarFarmLabel(farm))}</span>
            <span class="projection-sim-count">${projectionSimulation[farm]||0}</span>
            <button class="btn btn-gray" type="button" data-projection-sim="${farm}" data-delta="-1">-</button>
            <button class="btn btn-blue" type="button" data-projection-sim="${farm}" data-delta="1">+</button>
          </div>`).join("")}
        </div>
        <div class="projection-sim-grid">
          ${farmKeys.map(farm=>`<button class="btn btn-blue" type="button" data-projection-sim="${farm}" data-delta="10">+10 ${escapeHtml(familiarFarmLabel(farm))}</button>`).join("")}
        </div>
        <div class="projection-sim-summary">
          <div class="projection-sim-pill"><span>${escapeHtml(activeProgressShort())} simulée</span><strong>${formatProgressValue(pp)} → ${formatProgressValue(simPP)}</strong></div>
          <div class="projection-sim-pill"><span>Gain simulé</span><strong>+${formatProgressValue(simGain)} ${progressUnit}</strong></div>
          <div class="projection-sim-pill"><span>Progression</span><strong>${simPct.toFixed(1)}%</strong></div>
          <div class="projection-sim-pill"><span>Restant 100%</span><strong>${simLeft.map(item=>`${escapeHtml(familiarFarmLabel(item.farm))} ${formatProjectionRuns(item.left)}`).join(" · ")}</strong></div>
        </div>
        <div class="projection-sim-note">
          <button class="btn btn-gray" type="button" data-projection-sim-reset>Reset simulation</button>
        </div>
      </section>
    </div>

    <div class="projection-view-panel ${projectionView==="details"?"active":""}" data-projection-panel="details">
      <div class="projection-detail-intro">Les calculs ci-dessous utilisent vos temps moyens actuels sans modifier votre progression.</div>
      <section class="projection-card">
        <div class="projection-head"><h3>Temps prochaine ${escapeHtml(progressUnit)}</h3><span class="projection-badge">Prochain palier</span></div>
        <div class="projection-lines">
          ${farmProjection.map(item=>`<div class="projection-line"><span>${escapeHtml(familiarFarmLabel(item.farm))}</span><strong>${estimateTimeForRuns(item.farm,item.next)}</strong></div>`).join("")}
        </div>
      </section>
      <section class="projection-card">
        <div class="projection-head"><h3>Temps objectif 100%</h3><span class="projection-badge">${max} ${progressUnit}</span></div>
        <div class="projection-lines">
          ${farmProjection.map(item=>`<div class="projection-line"><span>${escapeHtml(familiarFarmLabel(item.farm))}</span><strong>${estimateTimeForRuns(item.farm,item.full)}</strong></div>`).join("")}
        </div>
      </section>
      <section class="projection-card wide">
        <div class="projection-head"><h3>Rendement et calcul</h3><span class="projection-badge">Optimisation</span></div>
        <div class="projection-lines">
          ${farmProjection.map(item=>`<div class="projection-line"><span>Rendement ${escapeHtml(familiarFarmLabel(item.farm))}</span><strong>${item.rate} ${progressUnit}/run</strong></div>`).join("")}
          <div class="projection-line"><span>Mode tryhard auto</span><strong>${data.settings.autoMarkOnPlus?'<span class="tryhard-chip">Activé</span>':'Désactivé'}</strong></div>
          <div class="projection-line"><span>Calcul chrono</span><strong>${chronoEstimate?chronoEstimate.message:"Désactivé"}</strong></div>
        </div>
      </section>
    </div>
  `;
  setProjectionView(projectionView,false);
}

let statsView="overview";

function setStatsView(view="overview",shouldRender=true){
  statsView=["overview","dungeons","timing"].includes(view)?view:"overview";
  document.querySelectorAll("[data-stats-view]").forEach(button=>{
    const active=button.dataset.statsView===statsView;
    button.classList.toggle("active",active);
    button.setAttribute("aria-selected",active?"true":"false");
  });
  if(shouldRender)renderStats();
}

function renderStats(){
  const content=$("#statsContent");
  const days=data.stats?.days||{};
  syncTodayPPGain();
  const todayStats=ensureDay();
  const todayTotal=dayTotal(todayStats);

  const activeDays=sortedActiveDays();
  const currentStreak=calcCurrentStreak();
  const bestStreak=calcBestStreak();
  const avgPerDay=calcAveragePerActiveDay();
  const bestDay=calcBestDay();

  const farmKeys=activeFarmKeys();
  const progressUnit=activeProgressShort();
  const totalRuns=farmKeys.reduce((sum,farm)=>sum+(data.runs[farm]||0),0);
  const farmRunParts=farmKeys.map(farm=>{
    const value=data.runs[farm]||0;
    return {
      farm,
      label:familiarFarmLabel(farm),
      fullLabel:familiarFarmLabel(farm,"full"),
      value,
      pct:totalRuns?percentPart(value,totalRuns):0,
      color:farm==="tynril"||farm==="cheneMou"?"stats-purple":farm==="salleAbrakne"?"stats-blue":"stats-orange"
    };
  });
  const ppSource=ppContributionBySource();
  const progressParts=[
    ...farmKeys.map(farm=>({
      farm,
      label:familiarFarmLabel(farm),
      value:ppSource[farm]||0,
      pct:percentPart(ppSource[farm]||0,ppSource.total),
      color:farm==="tynril"||farm==="cheneMou"?"tynril":farm==="salleAbrakne"?"zone":"morose",
      valueColor:farm==="tynril"||farm==="cheneMou"?"stats-purple":farm==="salleAbrakne"?"stats-blue":"stats-orange"
    })),
    {farm:"zone",label:"Zone / manuel",value:ppSource.zone||0,pct:percentPart(ppSource.zone||0,ppSource.total),color:"zone",valueColor:"stats-green"}
  ];

  const totalMonsters=Object.values(totalMobs()).reduce((a,b)=>a+b,0);
  const marks=data.chrono.marks||[];
  const markParts=farmKeys.map(farm=>({
    farm,
    label:familiarFarmLabel(farm),
    marks:marks.filter(m=>m.farm===farm),
    color:farm==="tynril"||farm==="cheneMou"?"stats-purple":farm==="salleAbrakne"?"stats-blue":"stats-orange"
  }));

  const bestTime=list=>{
    const valid=list.map(m=>m.time||0).filter(Boolean);
    if(!valid.length)return "—";
    return formatChrono(Math.min(...valid));
  };

  const avgReal=list=>{
    const valid=list.map(m=>m.time||0).filter(Boolean);
    if(!valid.length)return "—";
    const sum=valid.reduce((a,b)=>a+b,0);
    return formatDuration(Math.round(sum/valid.length));
  };

  const bestDayText=bestDay
    ? `${bestDay.total} donjon${bestDay.total>1?"s":""}`
    : "—";

  const bestDaySub=bestDay
    ? `${bestDay.date.split("-").reverse().join("/")} · ${farmKeys.map(farm=>`${familiarFarmLabel(farm)} ${bestDay.day[farm]||0}`).join(" / ")}`
    : "Aucune journée active";

  content.innerHTML=`
    <div class="stats-view-panel ${statsView==="overview"?"active":""}" data-stats-panel="overview">
    <section class="stats-fantasy-card wide">
      <div class="stats-fantasy-head">
        <h3>📅 Aujourd’hui</h3>
        <div class="stats-fantasy-badge">${todayTotal} donjon${todayTotal>1?"s":""}</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-kpi-grid">
          ${farmRunParts.map(part=>`
          <div class="stats-kpi">
            <div class="stats-kpi-label">${escapeHtml(part.label)} aujourd’hui</div>
            <div class="stats-kpi-value ${part.color}">${todayStats[part.farm]||0}</div>
            <div class="stats-kpi-sub">donjons enregistrés</div>
          </div>`).join("")}
          <div class="stats-kpi">
            <div class="stats-kpi-label">${escapeHtml(progressUnit)} gagnée aujourd’hui</div>
            <div class="stats-kpi-value stats-green">+${todayStats.pp||0}</div>
            <div class="stats-kpi-sub">via actions du jour</div>
          </div>
        </div>
      </div>
    </section>

    <section class="stats-fantasy-card">
      <div class="stats-fantasy-head">
        <h3>🔥 Régularité</h3>
        <div class="stats-fantasy-badge">${activeDays.length} jour${activeDays.length>1?"s":""}</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-lines">
          <div class="stats-clean-line"><span>Série actuelle</span><strong class="stats-orange">${currentStreak} j</strong></div>
          <div class="stats-clean-line"><span>Meilleure série</span><strong class="stats-red">${bestStreak} j</strong></div>
          <div class="stats-clean-line"><span>Moyenne / jour actif</span><strong class="stats-blue">${avgPerDay.toFixed(1)}</strong></div>
        </div>
      </div>
    </section>

    <section class="stats-fantasy-card">
      <div class="stats-fantasy-head">
        <h3>🏆 Records</h3>
        <div class="stats-fantasy-badge">Profil</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-record-box">
          <div>
            <div class="stats-record-label">Meilleure journée</div>
            <div class="stats-record-value stats-green">${bestDayText}</div>
          </div>
          <div class="stats-kpi-sub">${bestDaySub}</div>
        </div>
        <div class="stats-record-box">
          <div>
            <div class="stats-record-label">Monstres totaux tués</div>
            <div class="stats-record-value stats-orange">${totalMonsters}</div>
          </div>
          <div class="stats-kpi-sub">toutes sources</div>
        </div>
      </div>
    </section>
    </div>

    <div class="stats-view-panel ${statsView==="dungeons"?"active":""}" data-stats-panel="dungeons">
    <div class="stats-section-intro">Comparez le volume de donjons et leur contribution réelle à votre ${activeFamiliar().progressLabel.toLowerCase()}.</div>
    <section class="stats-fantasy-card wide">
      <div class="stats-fantasy-head">
        <h3>Répartition des parcours</h3>
        <div class="stats-fantasy-badge">${totalRuns} au total</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-kpi-grid">
          ${farmRunParts.map(part=>`
          <div class="stats-kpi">
            <div class="stats-kpi-label">${escapeHtml(part.label)}</div>
            <div class="stats-kpi-value ${part.color}">${part.value}</div>
            <div class="stats-kpi-sub">${part.pct}% des donjons</div>
          </div>`).join("")}
          <div class="stats-kpi">
            <div class="stats-kpi-label">Total</div>
            <div class="stats-kpi-value stats-blue">${totalRuns}</div>
            <div class="stats-kpi-sub">profil actuel</div>
          </div>
        </div>
        <div class="stats-mini-bar">
          ${farmRunParts.map(part=>`<span style="width:${part.pct}%"></span>`).join("")}
        </div>
      </div>
    </section>

    <section class="stats-fantasy-card wide">
      <div class="stats-fantasy-head">
        <h3>Contribution ${escapeHtml(progressUnit)}</h3>
        <div class="stats-fantasy-badge">${ppSource.total} ${escapeHtml(progressUnit)} brute${ppSource.total>1?"s":""}</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-kpi-grid">
          ${progressParts.map(part=>`
          <div class="stats-kpi">
            <div class="stats-kpi-label">${escapeHtml(part.label)}</div>
            <div class="stats-kpi-value ${part.valueColor}">${part.pct}%</div>
            <div class="stats-kpi-sub">${part.value} ${escapeHtml(progressUnit)} générée${part.value>1?"s":""}</div>
          </div>`).join("")}
        </div>
        <div class="stats-mini-bar pp-contribution-bar">
          ${progressParts.map(part=>`<span class="${part.color}" style="width:${part.pct}%"></span>`).join("")}
        </div>
      </div>
    </section>
    </div>

    <div class="stats-view-panel ${statsView==="timing"?"active":""}" data-stats-panel="timing">
    <div class="stats-section-intro">Retrouvez vos meilleurs temps, vos moyennes réelles et le volume de runs chronométrés.</div>
    <section class="stats-fantasy-card wide">
      <div class="stats-fantasy-head">
        <h3>⏱ Chrono</h3>
        <div class="stats-fantasy-badge">${marks.length} run${marks.length>1?"s":""}</div>
      </div>
      <div class="stats-fantasy-body">
        <div class="stats-kpi-grid">
          ${markParts.map(part=>`
          <div class="stats-kpi">
            <div class="stats-kpi-label">Meilleur ${escapeHtml(part.label)}</div>
            <div class="stats-kpi-value ${part.color}">${bestTime(part.marks)}</div>
            <div class="stats-kpi-sub">Moyenne réelle : ${avgReal(part.marks)}</div>
          </div>`).join("")}
          <div class="stats-kpi">
            <div class="stats-kpi-label">Donjons chronométrés</div>
            <div class="stats-kpi-value stats-blue">${marks.length}</div>
            <div class="stats-kpi-sub">${markParts.map(part=>`${escapeHtml(part.label)} ${part.marks.length}`).join(" · ")}</div>
          </div>
        </div>
      </div>
    </section>
    </div>
  `;
  setStatsView(statsView,false);
}

let activityFilter="all";

function getActivityKind(message,type="info"){
  const msg=(message||"").toLowerCase();

  if(type==="error" || msg.includes("erreur") || msg.includes("invalide"))return "error";
  if(msg.includes("palier") || msg.includes("100%") || msg.includes("progression !"))return "milestone";
  if(
    msg.includes("renomm") ||
    msg.includes("modifi") ||
    msg.includes("corrig") ||
    msg.includes("import") ||
    msg.includes("export")
  )return "edit";

  if(
    msg.includes("chrono") ||
    msg.includes("chronométr") ||
    msg.includes("temps marqué") ||
    msg.includes("temps renommé") ||
    msg.includes("temps supprimé") ||
    msg.includes("run marquée") ||
    msg.includes("temps moyen")
  )return "chrono";

  if(
    msg.includes("run") ||
    msg.includes("donjon") ||
    msg.includes("monstre") ||
    msg.includes("prospection") ||
    msg.includes("pykur gagne") ||
    msg.includes("pykur perd")
  )return "progression";

  return "system";
}

function getActivityIcon(kind,type){
  if(type==="error")return "!";
  if(kind==="milestone")return "★";
  if(kind==="edit")return "~";
  if(kind==="error")return "!";
  if(kind==="progression")return "+";
  if(kind==="chrono")return "⏱";
  return "⚙";
}

function compactActivities(entries){
  const sorted=[...entries].sort((a,b)=>new Date(b.date)-new Date(a.date));
  const compact=[];

  function parseRunMessage(message){
    const msg=message||"";
    const m=msg.match(/^([+-]1) (?:run|donjon) (Morose|Tynril)$/i);
    if(!m)return null;
    return {
      delta:m[1]==="+1"?1:-1,
      farm:m[2]
    };
  }

  for(const entry of sorted){
    const d=new Date(entry.date);
    const minuteKey=isNaN(d)?"":d.toISOString().slice(0,16);
    const kind=getActivityKind(entry.message,entry.type);
    const run=parseRunMessage(entry.message);
    const last=compact[compact.length-1];

    if(
      last &&
      run &&
      last.run &&
      last.run.farm===run.farm &&
      last.run.delta===run.delta &&
      last.minuteKey===minuteKey
    ){
      last.count++;
      last.run.total+=run.delta;
      const abs=Math.abs(last.run.total);
      const sign=last.run.total>0?"+":"-";
      last.message=`${sign}${abs} donjon${abs>1?"s":""} ${run.farm}`;
      continue;
    }

    if(last && !run && last.message===entry.message && last.type===entry.type && last.kind===kind && last.minuteKey===minuteKey){
      last.count++;
      continue;
    }

    compact.push({
      ...entry,
      kind,
      minuteKey,
      count:1,
      run:run ? {farm:run.farm,delta:run.delta,total:run.delta} : null
    });
  }

  return compact;
}

function formatActivityDay(day){
  if(day==="unknown")return "Date inconnue";
  const d=new Date(day+"T00:00:00");
  const t=new Date(today()+"T00:00:00");
  const diff=Math.round((t-d)/86400000);

  if(diff===0)return "📅 Aujourd’hui";
  if(diff===1)return "📅 Hier";

  return "📅 "+d.toLocaleDateString("fr-FR",{weekday:"long",day:"2-digit",month:"long"});
}

function renderActivity(){
  const content=$("#activityContent");
  const summary=$("#activitySummary");
  const search=($("#activitySearch")?.value||"").trim().toLowerCase();

  if(!content)return;

  let entries=data.activity||[];
  const todayKey=today();
  const todayEntries=entries.filter(a=>(a.date||"").startsWith(todayKey));

  if(summary){
    summary.innerHTML=`
      <div class="activity-summary-card">
        <div>
          <div class="activity-summary-label">Actions aujourd’hui</div>
          <div class="stats-kpi-sub">Toutes catégories confondues</div>
        </div>
        <div class="activity-summary-value stats-blue">${todayEntries.length}</div>
      </div>
    `;
  }

  if(activityFilter!=="all"){
    entries=entries.filter(a=>getActivityKind(a.message,a.type)===activityFilter);
  }

  if(search){
    entries=entries.filter(a=>(a.message||"").toLowerCase().includes(search));
  }

  const compact=compactActivities(entries);

  if(!compact.length){
    content.innerHTML='<div class="activity-empty empty-state-card"><strong>Aucune action trouvée</strong><span>Les donjons validés, temps marqués et changements importants apparaîtront ici.</span></div>';
    return;
  }

  const groups={};

  compact.forEach(entry=>{
    const d=new Date(entry.date);
    const key=isNaN(d)?"unknown":d.toISOString().split("T")[0];
    if(!groups[key])groups[key]=[];
    groups[key].push(entry);
  });

  content.innerHTML=Object.keys(groups)
    .sort((a,b)=>b.localeCompare(a))
    .map(day=>{
      const rows=groups[day].map(entry=>{
        const d=new Date(entry.date);
        const time=isNaN(d)?"--:--":d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
        const icon=getActivityIcon(entry.kind,entry.type);
        const repeat=entry.count>1?`<div class="activity-repeat">×${entry.count}</div>`:"";

        return `
          <div class="activity-row ${entry.kind} ${entry.type||"info"}">
            <div class="activity-time">${time}</div>
            <div class="activity-dot">${icon}</div>
            <div class="activity-message" title="${entry.message}">${entry.message}</div>
            ${repeat}
          </div>
        `;
      }).join("");

      return `
        <section class="activity-day-group ${(data.ui.collapsedActivityDays||[]).includes(day)?"collapsed":""}" data-activity-day="${day}">
          <div class="activity-day-title">
            <span>${formatActivityDay(day)}</span>
            <span class="activity-day-count">${groups[day].reduce((s,e)=>s+(e.count||1),0)}</span>
          </div>
          <div class="activity-timeline-list">${rows}</div>
        </section>
      `;
    })
    .join("");
}

function renderChronoHistory(){
  const smallTargets={morose:$("#historyMorose"),tynril:$("#historyTynril")};

  for(const k in smallTargets){
    if(!smallTargets[k])continue;
    const marks=(data.chrono.marks||[]).filter(m=>m.farm===k).slice(0,8);
    if(!marks.length){
      smallTargets[k].innerHTML='<div class="chrono-empty">Aucun temps marqué</div>';
      continue;
    }
    smallTargets[k].innerHTML=marks.map(m=>{
      const d=new Date(m.date);
      const time=isNaN(d)?"--:--":d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
      return `<div class="chrono-mark"><span>${formatChrono(m.time)}</span><span>${time}</span></div>`;
    }).join("");
  }

  renderRunTimesPanel();
}

function renderRunTimesPanel(){
  const columns=$("#runTimesPanel .run-time-columns");
  if(columns){
    columns.innerHTML=activeFarmKeys().map(farm=>{
      const id=farmDomId(farm);
      return `<section class="run-time-category">
        <div class="run-time-category-head">
          <h3>${escapeHtml(familiarFarmLabel(farm,"full"))}</h3>
          <div class="run-time-stats" id="runStats${id}">0 temps</div>
        </div>
        <div class="run-time-table" id="runTimes${id}"></div>
      </section>`;
    }).join("");
  }
  const targets=Object.fromEntries(activeFarmKeys().map(farm=>[farm,$(`#runTimes${farmDomId(farm)}`)]));
  const statTargets=Object.fromEntries(activeFarmKeys().map(farm=>[farm,$(`#runStats${farmDomId(farm)}`)]));

  for(const farm in targets){
    const box=targets[farm];
    if(!box)continue;

    const marks=(data.chrono.marks||[])
      .map((mark,index)=>({...mark,index}))
      .filter(mark=>mark.farm===farm);

    if(statTargets[farm]){
      statTargets[farm].textContent=marks.length+" temps";
    }

    if(!marks.length){
      box.innerHTML="<div class=\"run-time-empty empty-state-card\"><strong>Aucun temps marqué</strong><span>Démarrez Session & Chrono, puis utilisez Marquer run à la fin d'un donjon.</span></div>";
      continue;
    }

    box.innerHTML=marks.map(mark=>{
      const d=new Date(mark.date);
      const date=isNaN(d)?"--":d.toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"})+" "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
      const name=mark.name || `Temps ${formatChrono(mark.time)}`;
      return `
        <div class="run-time-row">
          <div class="run-time-name" title="${name}">${name}</div>
          <div class="run-time-time">${formatChrono(mark.time)}</div>
          <div class="run-time-date">${date}</div>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="btn btn-orange" data-rename-mark="${mark.index}">Renommer</button>
            <button class="btn btn-red" data-delete-mark="${mark.index}">Suppr.</button>
          </div>
        </div>
      `;
    }).join("");
  }
}

async function renameMarkedTime(index){
  const mark=data.chrono.marks[index];
  if(!mark)return;
  const oldName=mark.name || `Temps ${formatChrono(mark.time)}`;
  const name=await showPrompt("Nom du temps marqué :", {title:"Renommer le temps",defaultValue:oldName,okLabel:"Renommer"});
  if(name===null)return;
  const newName=name.trim() || oldName;
  mark.name=newName;
  addActivity(`Temps renommé : ${oldName} → ${newName}`,"info");
  save();
  renderRunTimesPanel();
  renderActivity();
  toast("Temps renommé","success");
}

async function deleteMarkedTime(index){
  const mark=data.chrono.marks[index];
  if(!mark)return;
  const label=mark.name || `${mark.farm==="morose"?"Morose":"Tynril"} ${formatChrono(mark.time)}`;
  if(!await showConfirm("Supprimer ce temps marqué ?", {title:"Supprimer le temps",danger:true,okLabel:"Supprimer"}))return;
  data.chrono.marks.splice(index,1);
  recomputeChronoLastMark();
  if(data.settings.autoDungeonEstimate)syncAverageFromChronoMarks(mark.farm);
  addActivity(`Temps supprimé : ${label}`,"warning");
  save();
  renderRunTimesPanel();
  renderStats();
  renderDungeonEstimates();
  renderChronoEstimate();
  renderDungeonEstimates();
  renderChronoEstimate();
  toast("Temps supprimé","warning");
}

async function clearMarkedTimes(){
  if(!data.chrono.marks.length){toast("Aucun temps à vider","warning");return}
  if(!await showConfirm("Supprimer tous les temps marqués ?", {title:"Vider les temps chrono",danger:true,okLabel:"Vider"}))return;
  data.chrono.marks=[];
  data.chrono.lastMarkSeconds=0;
  addActivity("Tous les temps marqués ont été supprimés","warning");
  save();
  renderRunTimesPanel();
  renderStats();
  toast("Temps vidés","warning");
}

function formatChrono(sec){
  const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function renderChrono(){
  const display=$("#chronoDisplay");
  if(!display)return;
  const seconds=getChronoSeconds();
  const splitSeconds=getChronoSplitSeconds(seconds);
  if(data.settings.showMilliseconds && data.chrono.running && data.chrono.startedAt){
    const tenths=Math.floor(((Date.now()-data.chrono.startedAt)%1000)/100);
    display.textContent=`${formatChrono(splitSeconds)}.${tenths}`;
  }else{
    display.textContent=formatChrono(splitSeconds);
  }
  $(".chrono-card")?.classList.toggle("is-running",!!data.chrono.running);
  renderDungeonEstimates();
  renderChronoEstimate();
  renderSession();
}


function getChronoSeconds(){
  const base=parseInt(data.chrono.seconds,10)||0;

  if(!data.chrono.running || !data.chrono.startedAt){
    return base;
  }

  const elapsed=Math.max(0,Math.floor((Date.now()-data.chrono.startedAt)/1000));
  return base+elapsed;
}

function syncChronoSeconds(){
  data.chrono.seconds=getChronoSeconds();
  data.chrono.startedAt=Date.now();
}

function getChronoSplitSeconds(totalSeconds=getChronoSeconds()){
  const sessionMarks=typeof currentSessionChronoMarks==="function" ? currentSessionChronoMarks() : [];
  if(!sessionMarks.length)return Math.max(0,totalSeconds);
  const lastMarked=sessionMarks
    .map(mark=>parseInt(mark.totalTime,10)||0)
    .filter(total=>Number.isFinite(total) && total>0 && total<=totalSeconds)
    .sort((a,b)=>b-a)[0] || 0;
  return Math.max(0,totalSeconds-lastMarked);
}

function recomputeChronoLastMark(){
  const totals=(data.chrono.marks||[])
    .map(mark=>parseInt(mark.totalTime,10)||0)
    .filter(total=>Number.isFinite(total) && total>0);
  const current=getChronoSeconds();
  data.chrono.lastMarkSeconds=totals.length
    ? Math.min(current,Math.max(...totals))
    : 0;
}

function startChrono(saveNow=true){
  if(chronoTimer)return;
  if(!data.session?.active){
    if(data.session?.totalSeconds>0)resumeSession();
    else startSession({silent:!saveNow});
  }

  data.chrono.running=true;
  data.chrono.startedAt=Date.now();

  chronoTimer=setInterval(()=>{
    renderChrono();
  },data.settings.showMilliseconds?100:250);

  if(saveNow){
    addActivity("Chrono lancé","chrono");
    unlockAchievement("start_chrono");
    save();
    toast("Session & chrono lancés","chrono","chrono");
  }

  renderChrono();
  renderSession();
}

function pauseChrono(options={}){
  const silent=!!options.silent;
  if(chronoTimer){
    clearInterval(chronoTimer);
    chronoTimer=null;
  }

  if(data.chrono.running){
    data.chrono.seconds=getChronoSeconds();
  }

  data.chrono.running=false;
  data.chrono.startedAt=null;
  pauseSession();

  if(!silent)addActivity(`Session & chrono en pause : ${formatChrono(data.chrono.seconds)}`,"chrono");
  save();
  renderChrono();
  renderSession();
  if(!silent)toast("Session & chrono en pause","pause","chrono");
}

function resetChrono(){
  if(chronoTimer){
    clearInterval(chronoTimer);
    chronoTimer=null;
  }

  data.chrono.seconds=0;
  data.chrono.running=false;
  data.chrono.startedAt=null;
  data.chrono.lastMarkSeconds=0;
  data.session=clone(defaultData().session);

  addActivity("Session & chrono réinitialisés","warning");
  renderChrono();
  renderSession();
  save();
  toast("Session & chrono remis à zéro","reset","reset");
}

function syncAverageFromChronoMarks(farm){
  const key=farmAverageKey(farm);
  const marks=(data.chrono.marks||[])
    .map(mark=>mark && mark.farm===farm ? parseInt(mark.time,10) : 0)
    .filter(time=>Number.isFinite(time) && time>0)
    .slice(0,20);

  if(!marks.length)return false;

  const average=Math.round(marks.reduce((total,time)=>total+time,0)/marks.length);
  if(!average || data.stats[key]===average)return false;

  data.stats[key]=average;
  return true;
}

function markTime(options={}){
  const silent=!!options.silent;
  const auto=!!options.auto;
  const farm=options.farm || data.ui.farm || "morose";

  if(!data.chrono.running || !chronoTimer){
    if(!silent)toast("Le chrono doit être lancé pour marquer une run.","error","error");
    return false;
  }

  const totalSeconds=typeof getChronoSeconds==="function" ? getChronoSeconds() : data.chrono.seconds;
  const markedSeconds=getChronoSplitSeconds(totalSeconds);

  if(markedSeconds<=0){
    if(!silent)toast("Impossible de marquer une run à 00:00:00.","error","error");
    return false;
  }

  data.chrono.marks.unshift({
    farm:farm,
    time:markedSeconds,
    totalTime:totalSeconds,
    date:new Date().toISOString(),
    name:`${familiarFarmLabel(farm)} ${formatChrono(markedSeconds)}`,
    mode:auto?"tryhard":"manual"
  });

  addActivity(`${auto?"Run tryhard":"Temps marqué"} ${familiarFarmLabel(farm)} : ${formatChrono(markedSeconds)}`,"success");

  data.chrono.lastMarkSeconds=totalSeconds;
  unlockAchievement("chrono_mark");
  const averageUpdated=data.settings.autoDungeonEstimate
    ? syncAverageFromChronoMarks(farm)
    : false;

  if(!silent){
    save();
    renderAll();
    if(averageUpdated)renderChronoEstimate();
    toast(auto?"Run tryhard marquée":"Run marquée","mark","mark");
  }

  return markedSeconds;
}

function buildMobEditor(){
  const c=$("#mobEditList");
  c.innerHTML="";
  const header=$("#editMobsModal .mob-edit-grid.header");
  if(header){
    header.innerHTML=`<span></span><span>Monstre</span>${activeFarmKeys().map(farm=>`<span>${escapeHtml(familiarFarmLabel(farm))}</span>`).join("")}<span>Zone</span>`;
    header.style.gridTemplateColumns=`52px 1fr repeat(${activeFarmKeys().length+1},minmax(82px,100px))`;
  }
  for(const id in mobs){
    const row=document.createElement("div");
    row.className="mob-edit-card";
    row.style.gridTemplateColumns=`52px 1fr repeat(${activeFarmKeys().length+1},minmax(82px,100px))`;
    const imgSrc=mobs[id].imgPath || `./assets/images/${mobs[id].img}`;
    row.innerHTML=`
      <img src="${imgSrc}" alt="" loading="lazy" decoding="async">
      <span>${mobs[id].name}</span>
      ${activeFarmKeys().map(farm=>`<input type="number" min="0" data-mob="${id}" data-area="${farm}" value="${data.mobs?.[farm]?.[id]||0}">`).join("")}
      <input type="number" min="0" data-mob="${id}" data-area="zone" value="${data.mobs.zone[id]||0}">
    `;
    c.appendChild(row);
  }
}

function saveMobEditor(){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  const oldPP=currentPP();
  pushUndo();
  $$("#mobEditList input").forEach(input=>{
    const area=input.dataset.area,id=input.dataset.mob;
    data.mobs[area][id]=Math.max(0,parseInt(input.value||"0",10));
  });
  resetMilestonesIfNeeded();
  const newPP=currentPP();
  const ppDelta=newPP-oldPP;
  addDailyRun(data.ui.farm||"morose",0,ppDelta);
  syncTodayPPGain();
  notifyPPProgress(oldPP,newPP);

  if(ppDelta>0){
    addActivity(`${activeFamiliar().shortLabel} gagne +${ppDelta} ${activeProgressShort()} (${oldPP} → ${newPP})`,"success");
  }else if(ppDelta<0){
    addActivity(`${activeFamiliar().shortLabel} perd ${Math.abs(ppDelta)} ${activeProgressShort()} (${oldPP} → ${newPP})`,"warning");
  }

  checkMilestones(oldPP,newPP);
  addActivity("Monstres modifiés manuellement","warning");
  save();renderAll();closeModal("editMobsModal");toast("Monstres sauvegardés","success");maybeShowCompletionModal();
}

async function editRuns(){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  const farm=data.ui.farm;
  const label=familiarFarmLabel(farm);
  const val=await showPrompt(`Nombre de donjons ${label} :`, {title:"Modifier le donjon",defaultValue:String(data.runs[farm]),okLabel:"Modifier"});
  if(val===null)return;

  const oldPP=currentPP();
  pushUndo();

  const delta=setRunsSynced(farm,val);
  if(delta===false){
    data.undo.shift();
    toast("Aucun changement","info");
    return;
  }

  resetMilestonesIfNeeded();
  const newPP=currentPP();
  const ppDelta=newPP-oldPP;
  addDailyRun(farm,delta,ppDelta);
  syncTodayPPGain();

  if(ppDelta>0){
    addActivity(`${activeFamiliar().shortLabel} gagne ${formatProgressGain(ppDelta)} (${oldPP} → ${newPP})`,"success");
  }else if(ppDelta<0){
    addActivity(`${activeFamiliar().shortLabel} perd ${Math.abs(ppDelta)} ${activeProgressShort()} (${oldPP} → ${newPP})`,"warning");
  }

  checkMilestones(oldPP,newPP);
  unlockAchievement("manual_adjustments");

  addActivity(`Runs ${label} modifiés : ${data.runs[farm]} (${delta>0?"+":""}${delta})`,"warning");
  save();
  renderAll();
  toast("Donjon synchronisé","edit");
  maybeShowCompletionModal();
}

function undo(){
  const last=data.undo.shift();
  if(!last){toast("Rien à annuler","warning");return}
  data.runs=last.runs;
  data.mobs=last.mobs;
  resetMilestonesIfNeeded();
  addActivity("Dernière action annulée","warning");
  save();renderAll();toast("Action annulée","undo","undo");
}

async function resetAll(){
  if(isCompletionLocked())return toast("Termine d'abord l'écran de fin du familier.","warning","warning");
  const before=clone(data);
  if(!await showConfirm("",{
    title:"Réinitialiser le profil",
    subtitle:"Cette action supprimera la progression du profil sélectionné.",
    danger:true,
    okLabel:"Réinitialiser",
    html:`<p>Cette action supprimera la progression du profil sélectionné.</p><p><strong>Cette action est irréversible.</strong></p>`
  }))return;
  const settings=clone(data.settings);
  const achievements=clone(data.achievements||defaultData().achievements);
  const gallery=clone(data.gallery||defaultData().gallery);
  const dofusDetection=clone(data.dofusDetection||defaultData().dofusDetection);
  const familiarId=activeFamiliarId();
  gallery.currentCycleArchived=false;
  gallery.currentCycleCompletionSeen=false;
  data=defaultDataForFamiliar(familiarId);data.settings=settings;data.achievements=achievements;data.gallery=gallery;data.dofusDetection=dofusDetection;data.createdAt=new Date().toISOString();
  ensureData();addActivity("Profil remis à zéro","error");
  unlockAchievement("reset_pykur");
  save();applySettings();renderAll();
  toastUndo("Profil réinitialisé.","Annuler",()=>{
    data=clone(before);
    ensureData();
    save();
    applySettings();
    renderAll();
    toast("Réinitialisation du profil annulée.","undo","undo");
  });
}

async function setAverageTime(farm){
  const key=farmAverageKey(farm);
  const label=familiarFarmLabel(farm);
  const estimate=dungeonEstimateFor(farm);
  const currentValue=estimate.rawAvg>0 ? averageTimeLabel(estimate.rawAvg) : "";

  const msg =
    `Temps moyen par donjon ${label}\n\n` +
    `Format attendu : minutes:secondes\n\n` +
    `Ce temps sert à calculer le temps estimé restant.`;

  const v=await showPrompt(msg,{
    title:`Temps moyen ${label}`,
    defaultValue:currentValue,
    placeholder:"Exemple : 2:00",
    okLabel:"Enregistrer"
  });

  if(v===null)return;

  const value=String(v).trim();
  if(!value)return;

  const average=parseAverageTimeInput(value);
  if(average===null || average<=0){
    toast("Format invalide. Utilise par exemple 2:00","error","error");
    return;
  }

  data.stats[key]=average;
  unlockAchievement("edit_average_time");

  addActivity(
    `Temps moyen ${label} réglé : ${averageTimeLabel(average)}`,
    "info"
  );

  save();
  renderAll();

  toast("Temps moyen enregistré","success");
}

function parseAverageTimeInput(value){
  const text=String(value||"").trim().toLowerCase().replace(/,/g,".");
  if(!text)return null;
  const colon=text.match(/^(\d{1,4}):([0-5]\d)$/);
  if(colon){
    return (parseInt(colon[1],10)*60)+parseInt(colon[2],10);
  }
  const minute=text.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|m)$/);
  if(minute)return Math.round(parseFloat(minute[1])*60);
  const second=text.match(/^(\d+(?:\.\d+)?)\s*(?:sec|s)$/);
  if(second)return Math.round(parseFloat(second[1]));
  const numeric=parseFloat(text);
  return Number.isFinite(numeric) ? Math.round(numeric*60) : null;
}

async function dofusExportImages(){
  const keys=new Set();
  Object.values(store?.profiles||{}).forEach(profile=>{
    const refs=profile?.data?.dofusDetection?.refs||{};
    Object.values(refs).forEach(ref=>{if(ref?.imageKey)keys.add(ref.imageKey)});
  });
  const images={};
  for(const key of keys){
    try{
      const value=await dofusGetImage(key);
      if(value)images[key]=value;
    }catch(err){console.warn("Export référence Dofus impossible",key,err)}
  }
  return images;
}

async function dofusImportImages(images){
  if(!images || typeof images!=="object")return;
  for(const [key,value] of Object.entries(images)){
    if(typeof value==="string" && value.startsWith("data:image/")){
      try{await dofusPutImage(key,value)}catch(err){console.warn("Import référence Dofus impossible",key,err)}
    }
  }
}

async function exportSave(){
  save();

  const payload={
    version:2,
    exportedAt:new Date().toISOString(),
    app:"pykur-tracker",
    store,
    dofusDetectionImages:await dofusExportImages()
  };

  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);

  const a=document.createElement("a");
  a.href=url;
  a.download="pykur-sauvegarde.json";
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(()=>URL.revokeObjectURL(url),250);

  toast("Sauvegarde exportée","export","export");
  addActivity("Sauvegarde exportée","system");
}

function summarizeImportedStore(importedStore){
  const profiles=Object.values(importedStore?.profiles||{});
  const profileCount=profiles.length;
  const pykurIds=new Set();
  const eventIds=new Set();
  const achievementIds=new Set();
  const collectGallery=gallery=>{
    if(!gallery)return;
    (gallery.completedPykurs||[]).forEach((item,index)=>pykurIds.add(item?.id || `pykur_${pykurIds.size}_${index}`));
    Object.entries(gallery.eventsDiscovered||{}).forEach(([id,item])=>{if(item)eventIds.add(id)});
  };
  collectGallery(importedStore.sharedGallery);
  profiles.forEach(profile=>{
    collectGallery(profile?.data?.gallery);
    Object.entries(profile?.data?.achievements?.unlocked||{}).forEach(([id,item])=>{if(item)achievementIds.add(id)});
  });
  return {profileCount,pykurCount:pykurIds.size,achievementCount:achievementIds.size,eventCount:eventIds.size};
}

function importSaveFile(file){
  if(!file)return;

  const reader=new FileReader();

  reader.onload=async ()=>{
    try{
      const imported=JSON.parse(reader.result);
      const importedStore=imported.store || imported;

      if(!importedStore || !importedStore.profiles || !importedStore.active){
        throw new Error("Format invalide");
      }

      const summary=summarizeImportedStore(importedStore);
      const ok=await showConfirm(
        "",
        {
          title:"Import de sauvegarde",
          subtitle:"Cette opération remplacera les données actuellement chargées.",
          danger:true,
          okLabel:"Importer quand même",
          html:`<p>Cette opération remplacera les données actuellement chargées.</p><p>Il est fortement recommandé d'exporter une sauvegarde avant de continuer.</p><p>Les données remplacées ne pourront pas être récupérées automatiquement.</p><p><strong>Contenu détecté :</strong></p><ul><li>${summary.profileCount} profil${summary.profileCount>1?"s":""}</li><li>${summary.pykurCount} familier${summary.pykurCount>1?"s":""} archivé${summary.pykurCount>1?"s":""}</li><li>${summary.achievementCount} succès</li><li>${summary.eventCount} événement${summary.eventCount>1?"s":""} découvert${summary.eventCount>1?"s":""}</li></ul>`,
          extraHtml:`<button class="btn btn-orange dialog-inline-action" id="exportBeforeImport" type="button">Exporter une sauvegarde avant import</button><label class="dialog-check"><input id="importSafetyBackup" type="checkbox" checked> Créer une sauvegarde de sécurité avant l'import</label>`,
          onRender:()=>$("#exportBeforeImport")?.addEventListener("click",e=>{
            e.preventDefault();
            exportSave();
          })
        }
      );
      if(!ok)return;
      if($("#importSafetyBackup")?.checked)createSafetyBackup("import");

      store=importedStore;
      ensureStoreGallery();
      ensureStoreOptionsSharing();
      ensureStoreAchievementSharing();
      await dofusImportImages(imported.dofusDetectionImages);

      if(!store.profiles[store.active]){
        store.active=Object.keys(store.profiles)[0];
      }

      activeProfile=store.active;
      data=clone(store.profiles[activeProfile].data || defaultData());

      applySharedSettingsToData();
      applySharedAchievementsToData();
      ensureData();
      syncSharedSettingsFromData();
      syncSharedAchievementsFromData();
      syncGlobalSoundSetting();
      localStorage.setItem("pykur_clean_v1",JSON.stringify(store));

      applySettings();
      syncChronoTimerForProfile();
      renderProfiles();
      achievementNotificationMuted=true;
      renderAll();
      achievementNotificationMuted=false;

      toast("Sauvegarde importée","import","import");
      addActivity("Sauvegarde importée","system");
    }catch(err){
      console.error(err);
      toast("Sauvegarde invalide","error","error");
    }finally{
      const input=$("#importSaveInput");
      if(input)input.value="";
    }
  };

  reader.onerror=()=>{
    toast("Impossible de lire le fichier","error","error");
  };

  reader.readAsText(file);
}

function bindSettingSelect(id,key,transform=value=>value){
  const el=$("#"+id);
  if(!el)return;
  el.addEventListener("change",()=>{
    data.settings[key]=transform(el.value);
    applySettings();
    save();
    if(key==="autoDungeonEstimate")renderAll();
    else renderDungeonEstimates();
    toast("Préférence mise à jour","info","click");
  });
}

function bindSettingToggle(id,key){
  const el=$("#"+id);
  if(!el)return;
  el.addEventListener("click",()=>{
    data.settings[key]=!data.settings[key];
    if(key==="showMilliseconds" && chronoTimer){
      clearInterval(chronoTimer);
      chronoTimer=setInterval(()=>renderChrono(),data.settings.showMilliseconds?100:250);
    }
    applySettings();
    save();
    toast("Préférence mise à jour","info","click");
  });
}

document.addEventListener("click",e=>{
  const close=e.target.closest("[data-close]");
  if(close)closeModal(close.dataset.close);
  if(e.target.classList.contains("modal-bg") && !data.settings.hudMode)closeModal(e.target.id);
  if(e.target.id==="appDialog")closeDialog(activeDialog?.type==="prompt"?null:false);
});

document.addEventListener("pointerdown",e=>animateCharlieClick(e.clientX,e.clientY),true);

document.addEventListener("pointerdown",e=>{
  if(!document.body.classList.contains("help-active"))return;
  if(e.target.closest("#helpPopover,#helpButton,.help-highlight"))return;
  closeHelp();
},true);

document.addEventListener("keydown",e=>{
  if(adminPanelTryQuickReopen(e)){
    e.preventDefault();
    return;
  }
  if(handleSecretKeys(e)){
    e.preventDefault();
    return;
  }
  if(editingKeybind){
    captureShortcutKey(e);
    return;
  }
  if(activeDialog){
    if(e.key==="Enter" && !e.isComposing && e.target?.tagName!=="TEXTAREA"){
      e.preventDefault();
      submitDialog();
    }
    if(e.key==="Escape")closeDialog(activeDialog.type==="prompt"?null:false);
    return;
  }
  if(e.key==="Escape"){
    closeHelp();
    $$(".modal-bg.show").forEach(m=>closeModal(m.id));
    if($("#runTimesPanel"))closeModal("runTimesPanel");
    return;
  }
  handleShortcut(e);
});

$("#plus").onclick=()=>addRun(1);
$("#minus").onclick=()=>addRun(-1);
$("#farmSelect").onchange=e=>{data.ui.farm=e.target.value;save();renderAll()};
$$(".farm-choice").forEach(btn=>{
  btn.addEventListener("click",()=>{
    data.ui.farm=btn.dataset.farmChoice;
    $("#farmSelect").value=data.ui.farm;
    save();
    renderAll();
  });
});
$("#editRuns").onclick=editRuns;
$("#undoButton").onclick=undo;
$("#resetButton").onclick=resetAll;

$("#statsButton").onclick=()=>{unlockAchievement("open_stats");setStatsView("overview",false);renderStats();openModal("statsModal")};
$("#helpButton").onclick=()=>{unlockAchievement("open_help");startHelp()};
$("#helpNext").onclick=nextHelp;
$("#helpPrev").onclick=prevHelp;
$("#helpClose").onclick=closeHelp;
$("#helpBackdrop").onclick=closeHelp;
if($("#helpNoAuto"))$("#helpNoAuto").onchange=e=>{
  data.settings.helpAutoDisabled=!!e.target.checked;
  save();
};
$("#optionsButton").onclick=openOptionsShortcut;
$("#activityButton").onclick=()=>{unlockAchievement("open_history");if($("#activitySearch"))$("#activitySearch").value=""; activityFilter="all"; $$("[data-activity-filter]").forEach(b=>b.classList.toggle("active",b.dataset.activityFilter==="all")); renderActivity();openModal("activityModal")};
if($("#monsterLauncher"))$("#monsterLauncher").onclick=()=>{unlockAchievement("open_monsters");unlockAchievement("open_monster_threshold");renderMonsterTable();openModal("monstersModal")};
const CHANGELOG_ENTRIES={
  "1.6":{
    title:"Version 1.6",
    date:"18 juin 2026",
    summary:"Version multi-familiers : Abra Kadabra rejoint le tracker avec une progression Puissance, des profils cloud adaptés et un socle plus générique.",
    items:[
      ["Abra Kadabra","Ajout du familier Abra Kadabra avec ses parcours Abraknyde, Chêne Mou et Salle Abrakne."],
      ["Progression Puissance","Les gains, badges, projections et notifications s'adaptent maintenant à la Puissance au lieu de la PP."],
      ["Salle Abrakne","Gestion spéciale de l'arrivée en salle, de la sortie et de l'arrêt automatique après inactivité."],
      ["Détection Dofus multi-familiers","Les configurations de détection s'adaptent au familier et aux donjons concernés."],
      ["Profils et modération","Les profils cloud, profils publics et outils de modération affichent les données du bon familier."],
      ["Événements généralisés","Les événements qui parlaient du Pykur parlent désormais du familier actif."],
      ["Changelog et version","Passage officiel du tracker en version 1.6."]
    ]
  },
  "1.5":{
    title:"Version 1.5",
    date:"12 juin 2026",
    summary:"Première version connectée officielle : comptes cloud, communauté, modération et événements synchronisés rejoignent le tracker complet.",
    items:[
      ["Hébergement officiel","Mise en ligne sur VPS, domaine familier-tracker.fr et connexion HTTPS."],
      ["Comptes et cloud","Inscription, validation par email, récupération de mot de passe et sauvegarde cloud automatique."],
      ["Profils communautaires","Recherche de membres, profils publics, confidentialité, avatars et consultation des profils familiers autorisés."],
      ["Espace social","Amis, messages privés, chat global, mentions, notifications et présence en ligne."],
      ["Partages communautaires","Publication contrôlée des succès et des Pykurs terminés dans le chat."],
      ["Modération complète","Signalements, avertissements, mutes, bans, journaux et centre de contrôle avec permissions."],
      ["Événements synchronisés","Planning des événements vivants géré par le serveur pour tous les joueurs."],
      ["Stabilité des données","Synchronisation renforcée des profils, succès et galeries, avec suppressions persistantes."],
      ["Interface modernisée","Boutons illustrés, panneaux sociaux remaniés et meilleure adaptation aux différentes résolutions."],
      ["Préparation multi-familiers","Base de profils par familier avec Abra Kadabra préparé pour une future intégration."]
    ]
  },
  "1.4":{
    title:"Version 1.4",
    date:"04 juin 2026",
    summary:"Version de finition centrée sur la stabilité, la lisibilité et le confort avant publication.",
    items:[
      ["Stabilité générale","Audit, corrections et nettoyage avant la publication officielle."],
      ["Interfaces mieux organisées","Galerie, succès, admin panel et options gagnent en lisibilité."],
      ["Chronos harmonisés","Fusion et nettoyage des chronos sur PC et mobile."],
      ["Projections plus claires","Les gains de PP à venir sont mieux affichés et plus fiables."],
      ["Simulation de donjons","Ajout d'un simulateur non destructif dans la projection."],
      ["Finition visuelle","Améliorations du Pykur, des monstres et des modales."],
      ["Compatibilité renforcée","Corrections de sauvegarde locale, cloud et compatibilité PC/Web."]
    ]
  },
  "1.3":{
    title:"Version 1.3",
    date:"03 juin 2026",
    summary:"Version centrée sur la mémoire du tracker, l'automatisation et les outils de test.",
    items:[
      ["Galerie","Ajout des Pykurs terminés et de la collection d'événements."],
      ["Fin de cycle","Écran de fin avec archivage et résumé de progression."],
      ["Détection automatique","Ajout du système de détection d'un donjon terminé."],
      ["Admin panel","Outils de test pour événements, ambiances et succès."],
      ["Événements vivants","Animations améliorées et nettoyages plus fiables."]
    ]
  },
  "1.2":{
    title:"Version 1.2",
    date:"02 juin 2026",
    summary:"Version d'amélioration du suivi quotidien et des systèmes de confort.",
    items:[
      ["Chrono & session","Refonte du système de chrono et de session de farm."],
      ["Détection Dofus","Configuration personnalisée et optionnelle."],
      ["Ambiances passives","Système indépendant des événements vivants."],
      ["Pykur plus vivant","Premières réactions visuelles aux actions du joueur."],
      ["Confort général","Options, raccourcis et sauvegarde améliorés."]
    ]
  }
};

function renderChangelog(version="1.6"){
  const entry=CHANGELOG_ENTRIES[version]||CHANGELOG_ENTRIES["1.6"];
  const box=$("#changelogContent");
  if(!box)return;
  const selector=$("#changelogVersionSelect");
  if(selector)selector.value=version;
  box.innerHTML=`
    <h3>${entry.title}</h3>
    <span class="changelog-date">${entry.date}</span>
    <p class="changelog-summary">${entry.summary||""}</p>
    <div class="changelog-items">
      ${entry.items.map((item,index)=>{
        const title=Array.isArray(item)?item[0]:item;
        const text=Array.isArray(item)?item[1]:"";
        return `<div class="changelog-item"><span class="changelog-item-icon">${index+1}</span><span><strong>${title}</strong><span>${text}</span></span></div>`;
      }).join("")}
    </div>
  `;
}

if($("#changelogButton"))$("#changelogButton").onclick=()=>{renderChangelog("1.6");openModal("changelogModal")};
if($("#achievementsButton"))$("#achievementsButton").onclick=()=>{renderAchievements();openModal("achievementsModal")};
if($("#galleryButton"))$("#galleryButton").onclick=()=>{unlockAchievement("open_gallery");renderGallery();showGalleryTab("archives");openModal("galleryModal")};
if($("#resetGallery"))$("#resetGallery").onclick=resetGallery;
if($("#gallerySharedToggle"))$("#gallerySharedToggle").onchange=toggleSharedGallery;
if($("#openGalleryEvents"))$("#openGalleryEvents").onclick=()=>showGalleryEvents(true);
if($("#openGalleryEventsBottom"))$("#openGalleryEventsBottom").onclick=()=>showGalleryEvents(true);
if($("#backGalleryMemory"))$("#backGalleryMemory").onclick=()=>showGalleryEvents(false);
$$('[data-gallery-tab]').forEach(button=>button.addEventListener("click",()=>showGalleryTab(button.dataset.galleryTab)));
if($("#changelogVersionSelect"))$("#changelogVersionSelect").onchange=event=>renderChangelog(event.target.value);
if($("#toggleSharedOptions"))$("#toggleSharedOptions").onclick=toggleSharedOptions;
if($("#toggleSharedGalleryOption"))$("#toggleSharedGalleryOption").onclick=()=>setSharedGallery(!(store?.galleryShared!==false));
if($("#completionArchiveRestart"))$("#completionArchiveRestart").onclick=archiveAndRestartPykur;
if($("#unlockSecretAchievements"))$("#unlockSecretAchievements").onclick=tickSecretGate;
if($("#resetAchievements"))$("#resetAchievements").onclick=resetAchievements;
if($("#authLoginTab"))$("#authLoginTab").onclick=()=>authSetMode("login");
if($("#authRegisterTab"))$("#authRegisterTab").onclick=()=>authSetMode("register");
if($("#authForm"))$("#authForm").onsubmit=authSubmit;
if($("#forgotPasswordButton"))$("#forgotPasswordButton").onclick=openPasswordResetRequest;
if($("#passwordResetRequestForm"))$("#passwordResetRequestForm").onsubmit=requestPasswordReset;
if($("#passwordResetConfirmForm"))$("#passwordResetConfirmForm").onsubmit=confirmPasswordReset;
if($("#accountEmailForm"))$("#accountEmailForm").onsubmit=saveAccountEmail;
if($("#accountPasswordForm"))$("#accountPasswordForm").onsubmit=saveAccountPassword;
if($("#accountAvatarForm"))$("#accountAvatarForm").onsubmit=saveAccountAvatar;
if($("#closeAccountRequest"))$("#closeAccountRequest").onclick=closeOwnAccount;
$$("#accountSectionTabs [data-account-section-tab]").forEach(button=>{
  button.addEventListener("click",()=>setAccountProfileSection(button.dataset.accountSectionTab));
});
if($("#accountAvatarInput"))$("#accountAvatarInput").addEventListener("input",e=>{
  const preview=$("#accountAvatarPreview");
  if(!preview)return;
  const value=(e.target.value||"").trim();
  if(value)preview.style.setProperty("--avatar-url",`url("${value.replace(/"/g,"%22")}")`);
  else preview.style.removeProperty("--avatar-url");
});
if($("#accountAvatarFile"))$("#accountAvatarFile").addEventListener("change",event=>{
  const file=event.target.files?.[0];
  if(!file)return;
  if(file.size>450*1024){
    toast("Image trop lourde : choisissez une image de moins de 450 Ko.","error","error");
    event.target.value="";
    return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    const value=String(reader.result||"");
    if($("#accountAvatarInput"))$("#accountAvatarInput").value=value;
    const preview=$("#accountAvatarPreview");
    if(preview)preview.style.setProperty("--avatar-url",`url("${value}")`);
  };
  reader.readAsDataURL(file);
});
if($("#previewCommunityProfile"))$("#previewCommunityProfile").onclick=openCommunityProfilePreview;
if($("#openCommunitySearch"))$("#openCommunitySearch").onclick=openCommunityDirectory;
if($("#openFriendsPanel"))$("#openFriendsPanel").onclick=openFriendsPanel;
if($("#openMessagesPanel"))$("#openMessagesPanel").onclick=()=>openMessagesPanel();
if($("#openChatboxPanel"))$("#openChatboxPanel").onclick=openChatboxPanel;
if($("#chatboxComposeForm"))$("#chatboxComposeForm").onsubmit=sendChatMessage;
if($("#chatboxInput"))$("#chatboxInput").addEventListener("keydown",submitMessageOnEnter);
if($("#chatHideShares"))$("#chatHideShares").onchange=e=>{chatState.hideShares=!!e.target.checked;renderChatbox()};
if($("#chatHideText"))$("#chatHideText").onchange=e=>{chatState.hideText=!!e.target.checked;renderChatbox()};
if($("#copyMyCommunityLink"))$("#copyMyCommunityLink").onclick=async()=>{
  if(!authState.user)return authOpen("login");
  if(!accountPreferences().publicProfile){
    toast("Activez Profil public pour partager votre page.","warning","warning");
    return;
  }
  try{
    await copyTextToClipboard(communityProfileUrl(authState.user.pseudo));
    toast("Lien de votre profil public copié.","success","click");
  }catch{
    toast("Impossible de copier le lien automatiquement.","warning","warning");
  }
};
if($("#communitySearchForm"))$("#communitySearchForm").onsubmit=event=>{
  event.preventDefault();
  runCommunitySearch();
};
if($("#messageComposeForm"))$("#messageComposeForm").onsubmit=sendPrivateMessage;
if($("#messageComposeInput"))$("#messageComposeInput").addEventListener("keydown",submitMessageOnEnter);
if($("#communitySearchInput"))$("#communitySearchInput").addEventListener("input",()=>{
  clearTimeout(communitySearchTimer);
  communitySearchTimer=setTimeout(runCommunitySearch,280);
});
if($("#hiddenSecretEgg"))$("#hiddenSecretEgg").onclick=collectHiddenSecretEgg;
if($("#openRunTimes"))$("#openRunTimes").onclick=()=>{renderRunTimesPanel();openModal("runTimesPanel")};
if($("#closeRunTimes"))$("#closeRunTimes").onclick=()=>closeModal("runTimesPanel");
if($("#closeRunTimesBottom"))$("#closeRunTimesBottom").onclick=()=>closeModal("runTimesPanel");
if($("#clearRunTimes"))$("#clearRunTimes").onclick=clearMarkedTimes;
if($("#runTimesPanel"))$("#runTimesPanel").addEventListener("click",e=>{if(e.target.id==="runTimesPanel" && !data.settings.hudMode)closeModal("runTimesPanel")});
document.addEventListener("click",e=>{
  const statsTab=e.target.closest("[data-stats-view]");
  if(statsTab){
    setStatsView(statsTab.dataset.statsView);
    return;
  }
  const projectionTab=e.target.closest("[data-projection-view]");
  if(projectionTab){
    if(projectionTab.dataset.projectionView==="simulator")unlockAchievement("use_projection_simulator");
    setProjectionView(projectionTab.dataset.projectionView);
    return;
  }
  const rename=e.target.closest("[data-rename-mark]");
  if(rename)renameMarkedTime(parseInt(rename.dataset.renameMark,10));
  const del=e.target.closest("[data-delete-mark]");
  if(del)deleteMarkedTime(parseInt(del.dataset.deleteMark,10));
  if(e.target.closest("#dofusVideoThumb"))playDofusTutorialVideo();
  const simBtn=e.target.closest("[data-projection-sim]");
  if(simBtn){
    adjustProjectionSimulation(simBtn.dataset.projectionSim,parseInt(simBtn.dataset.delta,10)||0);
    return;
  }
  if(e.target.closest("[data-projection-sim-reset]")){
    resetProjectionSimulation();
    renderProjection();
    return;
  }
  const fav=e.target.closest("[data-monster-fav]");
  if(fav){
    const id=fav.dataset.monsterFav;
    const list=data.ui.monsterFavs||[];
    data.ui.monsterFavs=list.includes(id)?list.filter(x=>x!==id):[...list,id];
    save();
    renderMonsterTable();
  }
  const dayTitle=e.target.closest(".activity-day-title");
  if(dayTitle){
    const group=dayTitle.closest("[data-activity-day]");
    const day=group?.dataset.activityDay;
    if(day){
      const list=data.ui.collapsedActivityDays||[];
      data.ui.collapsedActivityDays=list.includes(day)?list.filter(d=>d!==day):[...list,day];
      save();
      renderActivity();
    }
  }
  const shortcutEdit=e.target.closest("[data-shortcut-edit]");
  if(shortcutEdit){
    editingKeybind=shortcutEdit.dataset.shortcutEdit;
    renderShortcutOptions();
    dofusRefreshOptions();
    toast("Appuie sur la nouvelle touche","info","click");
  }
  const achievementCat=e.target.closest("[data-achievement-category]");
  if(achievementCat){
    activeAchievementCategory=achievementCat.dataset.achievementCategory;
    renderAchievements();
  }
  const replay=e.target.closest("[data-gallery-replay]");
  if(replay){
    replayGalleryEvent(replay.dataset.galleryReplay);
  }
  const familiarFilter=e.target.closest("[data-gallery-familiar-filter]");
  if(familiarFilter){
    setGalleryArchiveFilter(familiarFilter.dataset.galleryFamiliarFilter);
    return;
  }
  const deletePykur=e.target.closest("[data-gallery-delete-pykur]");
  if(deletePykur){
    deleteGalleryPykur(deletePykur.dataset.galleryDeletePykur);
  }
});

document.addEventListener("change",e=>{
  const gallerySelect=e.target.closest("#galleryFamiliarSelect");
  if(gallerySelect){
    setGalleryArchiveFilter(gallerySelect.value);
    return;
  }
});

$("#createProfile").onclick=createProfile;
$("#renameProfile").onclick=renameProfile;
$("#deleteProfile").onclick=deleteProfile;
$("#profileSelect").onchange=e=>switchProfile(e.target.value);

$("#toggleNight").onclick=()=>{data.settings.night=!data.settings.night;applySettings();save()};
$("#toggleAnim").onclick=()=>{data.settings.animations=!data.settings.animations;applySettings();save()};
$("#togglePerformanceMode").onclick=()=>{
  const modes=["auto","on","off"];
  const current=modes.indexOf(data.settings.performanceMode||"auto");
  data.settings.performanceMode=modes[(current+1)%modes.length];
  applySettings();
  passiveStop({reschedule:false});
  if(!performanceModeActive())passiveSchedule();
  livingResetScheduler();
  save();
};
$("#toggleTooltips").onclick=()=>{data.settings.tooltips=!data.settings.tooltips;applySettings();save()};
$("#toggleHud").onclick=()=>{
  data.settings.hudMode=!data.settings.hudMode;
  applySettings();
  save();
  $$(".modal-bg.show,.side-panel-bg.show").forEach(bg=>{
    if(data.settings.hudMode){
      applyHudRect(bg.id);
      bringHudToFront(bg.id);
    }else{
      const win=hudTarget(bg);
      if(win){
        win.style.removeProperty("--hud-left");
        win.style.removeProperty("--hud-top");
        win.style.removeProperty("--hud-width");
        win.style.removeProperty("--hud-height");
      }
    }
  });
  toast(data.settings.hudMode?"Mode HUD activé":"Mode HUD désactivé","info","click");
};
$("#toggleNotif").onclick=()=>{data.settings.notifications=!data.settings.notifications;applySettings();save()};
$("#toggleSound").onclick=()=>{openSoundSettings();playSound("click")};
if($("#soundToggle"))$("#soundToggle").onclick=()=>{openSoundSettings();playSound("click")};
if($("#soundVolumeRange"))$("#soundVolumeRange").oninput=e=>setGlobalSoundVolume(e.target.value);
if($("#soundMuteButton"))$("#soundMuteButton").onclick=()=>{setGlobalSound(!data.settings.sound);renderSoundSettings();playSound("click")};
if($("#soundTestButton"))$("#soundTestButton").onclick=()=>playSound("success");
if($("#ainaDofus"))$("#ainaDofus").onclick=handleAinaDofusClick;
bindSettingSelect("visualIntensitySelect","visualIntensity");
bindSettingSelect("uiOpacitySelect","uiOpacity");
bindSettingSelect("dashboardModeSelect","dashboardMode");
bindSettingSelect("chronoStyleSelect","chronoStyle");
bindSettingSelect("notificationSizeSelect","notificationSize");
bindSettingSelect("notificationDurationSelect","notificationDuration",value=>parseInt(value,10)||3200);
bindSettingToggle("toggleMilliseconds","showMilliseconds");
bindSettingToggle("toggleAutoDungeonEstimate","autoDungeonEstimate");
bindSettingToggle("toggleChronoAutoStart","chronoAutoStartOnRun");
bindSettingToggle("toggleMinorNotif","disableMinorNotifications");
bindSettingToggle("togglePersistentNotif","notificationsPersistent");
bindSettingToggle("toggleHighContrast","highContrast");
bindSettingToggle("toggleReducedSaturation","reducedSaturation");
bindSettingToggle("toggleLargeFont","largeFont");
bindSettingToggle("toggleLivingEvents","livingEvents");
bindSettingToggle("togglePassiveAmbience","passiveAmbience");
bindSettingToggle("toggleShortcuts","shortcutsEnabled");
if($("#toggleDofusDetection"))$("#toggleDofusDetection").onclick=()=>{
  data.dofusDetection.enabled=!data.dofusDetection.enabled;
  if(data.dofusDetection.enabled && !dofusState.video)toast("Choisissez une fenêtre Dofus pour démarrer la détection.","warning","warning");
  applySettings();
  save();
};
if($("#chooseDofusWindow"))$("#chooseDofusWindow").onclick=dofusChooseWindow;
if($("#dofusFamiliarSelect"))$("#dofusFamiliarSelect").onchange=e=>{
  dofusState.selectedFamiliar=normalizeFamiliarId(e.target.value);
  dofusRefreshOptions();
};
if($("#testDofusDetection"))$("#testDofusDetection").onclick=()=>{unlockAchievement("test_dofus_detection");dofusTestDetection()};
if($("#openDofusTutorial"))$("#openDofusTutorial").onclick=()=>openModal("dofusTutorialModal");
if($("#dofusCooldownInput"))$("#dofusCooldownInput").onchange=e=>{
  const min=dofusCooldownMinimum();
  data.dofusDetection.cooldownSeconds=Math.max(min,Math.min(300,parseInt(e.target.value,10)||min));
  e.target.value=data.dofusDetection.cooldownSeconds;
  save();
  dofusRefreshOptions();
};
if($("#dofusScanIntervalSelect"))$("#dofusScanIntervalSelect").onchange=e=>{
  data.dofusDetection.scanIntervalMs=parseInt(e.target.value,10)||1000;
  save();
  dofusStartLoop();
  dofusRefreshOptions();
  toast("Fréquence de détection mise à jour","info","click");
};
if($("#dofusCaptureReference"))$("#dofusCaptureReference").onclick=dofusCaptureReference;
if($("#dofusImportReference"))$("#dofusImportReference").onclick=()=>$("#dofusImportInput")?.click();
if($("#dofusImportInput"))$("#dofusImportInput").onchange=e=>dofusImportReference(e.target.files[0]);
if($("#dofusSaveReference"))$("#dofusSaveReference").onclick=dofusSaveReference;
if($("#dofusThresholdInput"))$("#dofusThresholdInput").oninput=e=>{
  const farm=dofusState.configFarm;
  if(farm && data.dofusDetection?.refs?.[farm])data.dofusDetection.refs[farm].threshold=parseInt(e.target.value,10)||82;
  dofusUpdateConfigReadout();
};
if($("#cloudSyncNow"))$("#cloudSyncNow").onclick=()=>cloudSyncNow({silent:false});
if($("#cloudInspectNow"))$("#cloudInspectNow").onclick=()=>cloudInspectNow({silent:false});
if($("#cloudUploadNow"))$("#cloudUploadNow").onclick=cloudUploadNow;
if($("#cloudDownloadNow"))$("#cloudDownloadNow").onclick=cloudDownloadNow;
if($("#exportSave"))$("#exportSave").onclick=exportSave;
if($("#importSave"))$("#importSave").onclick=()=>$("#importSaveInput")?.click();
if($("#resetHudLayout"))$("#resetHudLayout").onclick=resetHudLayout;
if($("#resetKeybinds"))$("#resetKeybinds").onclick=resetKeybindsToDefault;
if($("#livingStopEvent"))$("#livingStopEvent").onclick=()=>{livingStop({silent:false,schedule:true});adminPanelAfterAction()};
if($("#livingStopAll"))$("#livingStopAll").onclick=()=>{livingStopAll();adminPanelAfterAction()};
if($("#livingSkipCooldown"))$("#livingSkipCooldown").onclick=()=>{livingPollServer();livingRenderAdmin();toast("Planning serveur actualisé.","info","click");adminPanelAfterAction()};
if($("#livingTestSounds"))$("#livingTestSounds").onclick=()=>{livingTestSounds();adminPanelAfterAction()};
if($("#passiveToggleAdmin"))$("#passiveToggleAdmin").onclick=()=>{passiveToggleAdmin();adminPanelAfterAction()};
if($("#passiveStopAdmin"))$("#passiveStopAdmin").onclick=()=>{passiveStop({reschedule:true});toast("Ambiance passive arrêtée.","info","click");adminPanelAfterAction()};
if($("#passiveTestSoundsAdmin"))$("#passiveTestSoundsAdmin").onclick=()=>{passiveTestSoundAdmin();adminPanelAfterAction()};
if($("#livingRefreshAdmin"))$("#livingRefreshAdmin").onclick=()=>livingPollServer();
$$('[data-admin-console-tab]').forEach(button=>button.addEventListener("click",()=>adminConsoleSelectTab(button.dataset.adminConsoleTab)));
if($("#adminTargetSearch"))$("#adminTargetSearch").onclick=searchAdminTarget;
if($("#adminTargetPseudo"))$("#adminTargetPseudo").addEventListener("keydown",event=>{
  if(event.key!=="Enter")return;
  event.preventDefault();
  searchAdminTarget();
});
if($("#adminAchievementSounds"))$("#adminAchievementSounds").onchange=e=>{
  adminAchievementSounds=!!e.target.checked;
  toast(adminAchievementSounds?"Sons admin activés pour les succès.":"Sons admin désactivés pour les succès.","info","click");
};
if($("#adminAutoCloseAfterAction"))$("#adminAutoCloseAfterAction").onchange=e=>{
  data.settings.adminAutoCloseAfterAction=!!e.target.checked;
  save();
  livingRenderAdmin();
  toast(data.settings.adminAutoCloseAfterAction?"Fermeture auto du panel activée.":"Fermeture auto du panel désactivée.","info","click");
};
if($("#adminQuickReopenSeconds"))$("#adminQuickReopenSeconds").onchange=e=>{
  data.settings.adminQuickReopenSeconds=Math.max(5,Math.min(300,parseInt(e.target.value,10)||45));
  save();
  livingRenderAdmin();
  toast(`Réouverture rapide réglée sur ${adminPanelReopenSeconds()}s.`,"info","click");
};
if($("#importSaveInput"))$("#importSaveInput").onchange=e=>importSaveFile(e.target.files[0]);
if($("#dofusConfigCanvas")){
  const canvas=$("#dofusConfigCanvas");
  canvas.addEventListener("pointerdown",e=>{
    if(!dofusState.configImage)return;
    dofusState.dragging=true;
    dofusState.dragStart=dofusCanvasPoint(e);
    dofusState.configZone={x:dofusState.dragStart.x,y:dofusState.dragStart.y,w:1,h:1};
  });
  canvas.addEventListener("pointermove",e=>{
    if(!dofusState.dragging || !dofusState.dragStart)return;
    const p=dofusCanvasPoint(e);
    dofusState.configZone={
      x:Math.min(dofusState.dragStart.x,p.x),
      y:Math.min(dofusState.dragStart.y,p.y),
      w:Math.abs(p.x-dofusState.dragStart.x),
      h:Math.abs(p.y-dofusState.dragStart.y)
    };
    dofusDrawConfigCanvas();
  });
  ["pointerup","pointerleave"].forEach(type=>canvas.addEventListener(type,()=>{
    if(!dofusState.dragging)return;
    dofusState.dragging=false;
    dofusUpdateConfigReadout();
  }));
}
$$("[data-options-tab]").forEach(tabBtn=>{
  tabBtn.addEventListener("click",()=>{
    if($("#optionsSearch")?.value){
      $("#optionsSearch").value="";
      filterOptionsSearch();
    }
    const tabName=tabBtn.dataset.optionsTab;
    if(tabName==="dofusDetection")unlockAchievement("open_dofus_detection");
    $$("[data-options-tab]").forEach(btn=>btn.classList.toggle("active",btn===tabBtn));
    $$("[data-options-panel]").forEach(panel=>panel.classList.toggle("active",panel.dataset.optionsPanel===tabName));
  });
});

if($("#optionsSearch"))$("#optionsSearch").addEventListener("input",filterOptionsSearch);
$("#moroseEstimateBox").onclick=()=>setAverageTime("morose");
$("#tynrilEstimateBox").onclick=()=>setAverageTime("tynril");

$("#chronoStart").onclick=()=>startChrono();
$("#chronoPause").onclick=()=>pauseChrono();
$("#chronoReset").onclick=resetChrono;
$("#markTime").onclick=markTime;
if($("#chronoOptionsShortcut"))$("#chronoOptionsShortcut").onclick=openChronoOptions;
if($("#sessionEnd"))$("#sessionEnd").onclick=endSession;

$("#clearActivity").onclick=async ()=>{
  if(await showConfirm("Vider l’historique du profil actif ?",{title:"Vider l'historique",danger:true,okLabel:"Vider"})){
    data.activity=[];
    save();
    renderActivity();
    toast("Historique vidé","reset","reset");
  }
};

$$(".monster-tabs [data-tab]").forEach(btn=>{
  btn.onclick=()=>{
    data.ui.tab=btn.dataset.tab;
    $$(".monster-tabs [data-tab]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    save();renderMonsterTable();
  };
});

$("#editMobs").onclick=()=>{buildMobEditor();openModal("editMobsModal")};
$("#saveMobs").onclick=saveMobEditor;

document.addEventListener("click",async e=>{
  if(e.target.closest("button,.dungeon-mini.full"))playSound("click");
  const globalEventBtn=e.target.closest("[data-admin-force-event]");
  if(globalEventBtn){
    try{
      await authFetch("/admin/events/force",{method:"POST",body:JSON.stringify({eventId:globalEventBtn.dataset.adminForceEvent})});
      toast("Événement global lancé pour tous les joueurs.","success","success");
      await loadAdminConsole();
      await livingPollServer();
      adminPanelAfterAction();
    }catch(error){toast(error.message||"Lancement global impossible.","error","error")}
    return;
  }
  const cancelCommandBtn=e.target.closest("[data-admin-cancel-command]");
  if(cancelCommandBtn){
    if(!await showConfirm("Annuler cette commande avant son exécution ?",{title:"Annuler la commande",danger:true,okLabel:"Annuler"}))return;
    try{
      await authFetch(`/admin/commands/${encodeURIComponent(cancelCommandBtn.dataset.adminCancelCommand)}/cancel`,{method:"POST",body:JSON.stringify({reason:"Annulée depuis le centre de contrôle"})});
      toast("Commande annulée.","info","click");
      await loadAdminConsole();
      if(adminConsoleTarget)await searchAdminTarget();
    }catch(error){toast(error.message||"Annulation impossible.","error","error")}
    return;
  }
  const livingBtn=e.target.closest("[data-living-event]");
  if(livingBtn){
    const started=livingStart(livingBtn.dataset.livingEvent,{admin:true});
    if(started)adminPanelAfterAction();
    return;
  }
  const eggBtn=e.target.closest("[data-admin-easter]");
  if(eggBtn){
    livingRunAdminEasterEgg(eggBtn.dataset.adminEaster);
    adminPanelAfterAction();
    return;
  }
  const adminCommand=e.target.closest("[data-admin-command]");
  if(adminCommand){
    await adminPanelRunCommand(adminCommand.dataset.adminCommand);
    adminPanelAfterAction();
    return;
  }
  const passiveBtn=e.target.closest("[data-passive-ambience]");
  if(passiveBtn){
    adminPanelRunPassiveAmbience(passiveBtn.dataset.passiveAmbience,passiveBtn.dataset.passiveVariant||null);
    adminPanelAfterAction();
    return;
  }
  const adminAchievementGive=e.target.closest("[data-admin-achievement-give]");
  if(adminAchievementGive){
    adminGiveAchievement(adminAchievementGive.dataset.adminAchievementGive);
    adminAchievementSaveAndRender("Succès donné.","success");
    adminPanelAfterAction();
    return;
  }
  const adminAchievementRemove=e.target.closest("[data-admin-achievement-remove]");
  if(adminAchievementRemove){
    adminRemoveAchievement(adminAchievementRemove.dataset.adminAchievementRemove);
    adminAchievementSaveAndRender("Succès retiré.","warning");
    adminPanelAfterAction();
    return;
  }
  const adminAchievementCatGive=e.target.closest("[data-admin-achievement-cat-give]");
  if(adminAchievementCatGive){
    const category=adminAchievementCatGive.dataset.adminAchievementCatGive;
    achievementList().filter(([,achievement])=>achievement.category===category).forEach(([id])=>adminGiveAchievement(id));
    adminAchievementSaveAndRender(`Catégorie ${adminAchievementCategoryLabel(category)} donnée.`,"success");
    adminPanelAfterAction();
    return;
  }
  const adminAchievementCatRemove=e.target.closest("[data-admin-achievement-cat-remove]");
  if(adminAchievementCatRemove){
    const category=adminAchievementCatRemove.dataset.adminAchievementCatRemove;
    achievementList().filter(([,achievement])=>achievement.category===category).forEach(([id])=>adminRemoveAchievement(id));
    adminAchievementSaveAndRender(`Catégorie ${adminAchievementCategoryLabel(category)} retirée.`,"warning");
    adminPanelAfterAction();
    return;
  }
  const adminAchievementGlobal=e.target.closest("[data-admin-achievement-action]");
  if(adminAchievementGlobal){
    await adminAchievementAction(adminAchievementGlobal.dataset.adminAchievementAction);
    adminPanelAfterAction();
    return;
  }
});


if($("#activitySearch")){
  $("#activitySearch").addEventListener("input",renderActivity);
}

$$("[data-activity-filter]").forEach(btn=>{
  btn.addEventListener("click",()=>{
    activityFilter=btn.dataset.activityFilter;
    $$("[data-activity-filter]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    renderActivity();
  });
});


window.addEventListener("beforeunload",()=>{
  if(data?.chrono?.running){
    syncChronoSeconds();
    save();
  }
});


if($("#toggleAutoMark"))$("#toggleAutoMark").onclick=()=>{
  data.settings.autoMarkOnPlus=!data.settings.autoMarkOnPlus;
  save();
  applySettings();
  toast(data.settings.autoMarkOnPlus?"Run tryhard auto activé":"Run tryhard auto désactivé","info","click");
  addActivity(data.settings.autoMarkOnPlus?"Run tryhard auto activé":"Run tryhard auto désactivé","info");
};

if($("#projectionButton"))$("#projectionButton").onclick=()=>{unlockAchievement("open_projection");unlockAchievement("view_time_estimate");setProjectionView("summary",false);renderProjection();openModal("projectionModal")};
applyHelpfulTooltips();
load();
authRefresh();
checkPasswordResetLink();
checkEmailVerificationLink();
checkCommunityProfileLink();
livingBuildAdmin();
livingResetScheduler();
passiveSchedule();
schedulePykurMicroLife();
setupModalAccessibility();
setupSmartTooltips();
setupHudWindows();
renderSaveStatus();
setInterval(renderSaveStatus,10000);
if(!data.settings.helpAutoDisabled && !data.ui.helpSeen){
  setTimeout(()=>{
    if(!data.settings.helpAutoDisabled && !data.ui.helpSeen && !activeDialog && !$(".modal-bg.show"))startHelp();
  },700);
}
setInterval(()=>{if(data?.session?.active)renderSession()},1000);

/* ===== Easter Egg Dimeh ===== */
const DIMEH_IMAGES=[
'./assets/images/trottoir1.png',
'./assets/images/trottoir2.png',
'./assets/images/trottoir3.png',
'./assets/images/trottoir4.png',
'./assets/images/trottoir5.png'
];

let dimehMode=false;
let dimehPopups=[];

function randomDimehImage(){
  return DIMEH_IMAGES[Math.floor(Math.random()*DIMEH_IMAGES.length)];
}

function createDimehPopup(reopen=false){
  if(!dimehMode)return;

  const bg=document.createElement("div");
  bg.style.cssText=`
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.55);
    display:flex;
    align-items:center;
    justify-content:center;
    z-index:999999;
    padding:20px;
  `;

  const box=document.createElement("div");
  box.style.cssText=`
    position:relative;
    background:#2b1f14;
    border:3px solid #facc15;
    border-radius:18px;
    padding:14px;
    max-width:min(92vw,850px);
    box-shadow:0 18px 40px rgba(0,0,0,.5);
  `;

  const close=document.createElement("button");
  close.innerHTML="✕";
  close.style.cssText=`
    position:absolute;
    top:8px;
    right:8px;
    width:40px;
    height:40px;
    border:none;
    border-radius:12px;
    cursor:pointer;
    font-size:18px;
    font-weight:900;
    color:white;
    background:linear-gradient(#dc2626,#7f1d1d);
  `;

  const img=document.createElement("img");
  img.src=randomDimehImage();
  img.style.cssText=`
    display:block;
    max-width:100%;
    max-height:75vh;
    border-radius:12px;
  `;

  close.onclick=()=>{
    bg.remove();
    dimehPopups=dimehPopups.filter(p=>p!==bg);

    if(dimehMode){
      toast("Toujours plus de trottoir","warning");
      setTimeout(()=>createDimehPopup(true),120);
    }
  };

  box.appendChild(close);
  box.appendChild(img);
  bg.appendChild(box);
  document.body.appendChild(bg);

  dimehPopups.push(bg);

  toast(
    reopen ? "Encore une livraison de trottoir" : "Livraison de trottoir immédiate",
    "warning"
  );
}

function toggleDimehMode(){
  dimehMode=!dimehMode;

  if(dimehMode){
    unlockAchievement("egg_dimeh");
    createDimehPopup();
  }else{
    dimehPopups.forEach(p=>p.remove());
    dimehPopups=[];
    toast("Reçu, retour à la normale, fin du chantier","info");
  }
}

(function(){
  let buffer="";
  document.addEventListener("keydown",e=>{
    if(e.ctrlKey||e.altKey||e.metaKey)return;
    if(e.key.length!==1)return;

    buffer=(buffer+e.key.toLowerCase()).slice(-20);

    if(buffer.includes("dimeh")){
      buffer="";
      toggleDimehMode();
    }
  });
})();
