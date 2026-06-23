(function(){
  "use strict";
  const copyObject=(obj)=>Object.assign({},obj||{});

const PP_MAX=90;
const ABRA_OBJECTIVE_MAX=55;
const DRAGOUNE_OBJECTIVE_MAX=55;
const TOFOUDRE_OBJECTIVE_MAX=11;
const CROUM_OBJECTIVE_MAX=90;
const VITALITY_OBJECTIVE_MAX=165;
const PYKUR_RUN_LIMITS={morose:640,tynril:48};
const ABRA_RUN_LIMITS={donjonAbraknyde:9999,cheneMou:9999,salleAbrakne:9999};
const DRAGOUNE_RUN_LIMITS={sanctuaireDragoeufs:9999};
const TOFOUDRE_RUN_LIMITS={ratsAmakna:9999,ratsBrakmar:9999,ratsBonta:9999};
const CROUM_RUN_LIMITS={gouletRasboul:9999};
const BOULOUTE_RUN_LIMITS={donjonBouftous:9999};
const VAMPYRETTE_RUN_LIMITS={donjonSquelettes:9999};
const GELUTIN_RUN_LIMITS={donjonBlops:9999,antreBlopMulticolore:9999};
function createCroumFamiliar({id,label,defaultProfileName,progressLabel,progressShort,icon,basePath,difficultyStars=2}){
  const progressIntro=["agilité","intelligence"].includes(progressShort) ? `d'${progressShort}` : `de ${progressShort}`;
  return {
    id,
    label,
    shortLabel:label,
    defaultProfileName,
    progressLabel,
    progressShort,
    objectiveMax:CROUM_OBJECTIVE_MAX,
    objectiveLabel:`90 ${progressShort}`,
    icon:`../croum oto/${basePath}/${icon}.png`,
    logo:`../croum oto/${basePath}/${basePath}.png`,
    image:`../croum oto/${basePath}/${basePath}.png`,
    auraImage:`../croum oto/${basePath}/${basePath}-aura.png`,
    sleepingImage:`../croum oto/${basePath}/${basePath}-z.png`,
    background:"../croum oto/fond/fond.png",
    status:"active",
    statusLabel:"",
    description:`Suivi ${progressIntro} sur le Goulet du Rasboul.`,
    bonusAmount:90,
    difficultyLabel:difficultyStars===1 ? "Facile" : difficultyStars===2 ? "Moyen" : "Dur",
    difficultyStars,
    dofusCooldownMin:10,
    farmMethods:["Goulet du Rasboul"],
    dungeons:[
      {key:"gouletRasboul",label:"Rasboul",fullLabel:"Goulet du Rasboul",asset:"../croum oto/donjon/goulet-du-rasboul.png",defaultAverage:1500}
    ]
  };
}
function createBoulouteFamiliar({id,label,basePath,backgroundBasePath=basePath}){
  return {
    id,
    label,
    shortLabel:label,
    defaultProfileName:`${label} principale`,
    progressLabel:"Vitalité",
    progressShort:"vitalité",
    objectiveMax:VITALITY_OBJECTIVE_MAX,
    objectiveLabel:"165 vitalité",
    icon:"../vitalité/vitalite.png",
    logo:`../vitalité/${basePath}/${basePath}.png`,
    image:`../vitalité/${basePath}/${basePath}.png`,
    auraImage:`../vitalité/${basePath}/${basePath}-aura.png`,
    sleepingImage:`../vitalité/${basePath}/${basePath}-z.png`,
    background:`../vitalité/${backgroundBasePath}/fond/fond.png`,
    status:"active",
    statusLabel:"",
    description:"Suivi de vitalité sur le Donjon des Bouftous.",
    bonusAmount:165,
    difficultyLabel:"Facile",
    difficultyStars:1,
    dofusCooldownMin:10,
    farmMethods:["Donjon des Bouftous"],
    dungeons:[
      {key:"donjonBouftous",label:"Bouftous",fullLabel:"Donjon des Bouftous",asset:"../vitalité/donjon des bouftous/bouftou-royal.png",defaultAverage:600}
    ]
  };
}
const FAMILIARS={
  pykur:{
    id:"pykur",
    label:"Pykur",
    shortLabel:"Pykur",
    defaultProfileName:"Pykur principal",
    progressLabel:"Prospection",
    progressShort:"PP",
    objectiveMax:PP_MAX,
    objectiveLabel:"90 PP",
    icon:"./assets/images/prospection.png",
    logo:"./assets/images/pykur.png",
    image:"./assets/images/pykur.png",
    auraImage:"./assets/images/aurapykur.png",
    sleepingImage:"./assets/images/evenement/25. Pykur endormi/pykurz.png",
    background:"./assets/images/fond.png",
    status:"complete",
    statusLabel:"",
    description:"Suivi de prospection sur Donjon Morose et Donjon Tynril.",
    bonusAmount:90,
    difficultyLabel:"Moyen",
    difficultyStars:2,
    dofusCooldownMin:10,
    farmMethods:["Donjon Morose","Donjon Tynril"],
    dungeons:[
      {key:"morose",label:"Morose",fullLabel:"Donjon Morose",asset:"./assets/images/dj actif/morose.png",defaultAverage:125},
      {key:"tynril",label:"Tynril",fullLabel:"Donjon Tynril",asset:"./assets/images/dj actif/tynril.png",defaultAverage:600}
    ]
  },
  "abra-kadabra":{
    id:"abra-kadabra",
    label:"Abra Kadabra",
    shortLabel:"Abra Kadabra",
    defaultProfileName:"Abra Kadabra principal",
    progressLabel:"Puissance",
    progressShort:"puissance",
    objectiveMax:ABRA_OBJECTIVE_MAX,
    objectiveLabel:"55 puissance",
    icon:"../abra-kadabra/assets/images/puissance.png",
    logo:"../abra-kadabra/assets/images/abra-kadabra.png",
    image:"../abra-kadabra/assets/images/abra-kadabra.png",
    auraImage:"../abra-kadabra/assets/images/abra-kadabra-aura.png",
    sleepingImage:"../abra-kadabra/assets/images/abraz.png",
    background:"../abra-kadabra/assets/images/fond.png",
    status:"active",
    statusLabel:"",
    description:"Suivi de puissance sur Donjon Abraknyde, Donjon Chêne Mou et boucle de la salle Abrakne.",
    bonusAmount:55,
    difficultyLabel:"Facile",
    difficultyStars:1,
    dofusCooldownMin:3,
    specialDefaults:{salleAbrakneSetupDone:false,salleAbrakneActive:false,salleAbrakneLastActivity:null},
    farmMethods:["Donjon Abraknyde","Donjon Chêne Mou","Boucle salle Abrakne"],
    dungeons:[
      {key:"donjonAbraknyde",label:"Abraknyde",fullLabel:"Donjon Abraknyde",asset:"../abra-kadabra/assets/images/donjons/donjon abraknyde.png",defaultAverage:900},
      {key:"cheneMou",label:"Chêne Mou",fullLabel:"Donjon Chêne Mou",asset:"../abra-kadabra/assets/images/donjons/donjon chêne mou.png",defaultAverage:1800},
      {key:"salleAbrakne",label:"Salle Abrakne",fullLabel:"Salle Abrakne",asset:"../abra-kadabra/assets/images/donjons/salle abrakne.png",special:"salleAbrakne",defaultAverage:10}
    ]
  },
  "dragoune-noir":{
    id:"dragoune-noir",
    label:"Dragoune Noir",
    shortLabel:"Dragoune Noir",
    defaultProfileName:"Dragoune Noir principale",
    progressLabel:"Sagesse",
    progressShort:"sagesse",
    objectiveMax:DRAGOUNE_OBJECTIVE_MAX,
    objectiveLabel:"55 sagesse",
    icon:"../dragoune-noir/assets/images/sagesse.png",
    logo:"../dragoune-noir/assets/images/dragoune-noir.png",
    image:"../dragoune-noir/assets/images/dragoune-noir.png",
    auraImage:"../dragoune-noir/assets/images/dragoune-noir-aura.png",
    sleepingImage:"../dragoune-noir/assets/images/dragounenoirz.png",
    background:"../dragoune-noir/assets/images/fond/fond.png",
    status:"active",
    statusLabel:"",
    description:"Suivi de sagesse sur le Sanctuaire des Dragoeufs.",
    bonusAmount:55,
    difficultyLabel:"Moyen",
    difficultyStars:2,
    dofusCooldownMin:10,
    farmMethods:["Sanctuaire des Dragoeufs"],
    dungeons:[
      {key:"sanctuaireDragoeufs",label:"Sanctuaire",fullLabel:"Sanctuaire des Dragoeufs",asset:"../dragoune-noir/assets/images/donjon/crocabulia.png",defaultAverage:1800}
    ]
  },
  tofoudre:{
    id:"tofoudre",
    label:"Tofoudre",
    shortLabel:"Tofoudre",
    defaultProfileName:"Tofoudre principal",
    progressLabel:"Dommages",
    progressShort:"dommages",
    objectiveMax:TOFOUDRE_OBJECTIVE_MAX,
    objectiveLabel:"11 dommages",
    icon:"../tofoudre/assets/images/dommage.png",
    logo:"../tofoudre/assets/images/tofoudre.png",
    image:"../tofoudre/assets/images/tofoudre.png",
    auraImage:"../tofoudre/assets/images/tofoudre-aura.png",
    sleepingImage:"../tofoudre/assets/images/tofoudrez.png",
    background:"../tofoudre/assets/images/fond/fond.png",
    status:"active",
    statusLabel:"",
    description:"Suivi de dommages sur les donjons des Rats d'Amakna, de Brâkmar et de Bonta.",
    bonusAmount:11,
    difficultyLabel:"Moyen",
    difficultyStars:2,
    dofusCooldownMin:10,
    farmMethods:["Donjon des Rats du Château d'Amakna","Donjon des Rats de Brâkmar","Donjon des Rats de Bonta"],
    dungeons:[
      {key:"ratsAmakna",label:"Rats Amakna",fullLabel:"Donjon des Rats du Château d'Amakna",asset:"../tofoudre/assets/images/donjon/donjon-des-rats-du-chateau-d-amakna.png",defaultAverage:1500},
      {key:"ratsBrakmar",label:"Rats Brâkmar",fullLabel:"Donjon des Rats de Brâkmar",asset:"../tofoudre/assets/images/donjon/donjon-des-rats-de-brakmar.png",defaultAverage:1200},
      {key:"ratsBonta",label:"Rats Bonta",fullLabel:"Donjon des Rats de Bonta",asset:"../tofoudre/assets/images/donjon/donjon-des-rats-de-bonta.png",defaultAverage:1200}
    ]
  },
  "croum-aqueux":createCroumFamiliar({
    id:"croum-aqueux",
    label:"Croum Aqueux",
    defaultProfileName:"Croum Aqueux principal",
    progressLabel:"Chance",
    progressShort:"chance",
    icon:"chance",
    basePath:"croum-aqueux",
    difficultyStars:2
  }),
  "croum-volatile":createCroumFamiliar({
    id:"croum-volatile",
    label:"Croum Volatile",
    defaultProfileName:"Croum Volatile principal",
    progressLabel:"Agilité",
    progressShort:"agilité",
    icon:"agilite",
    basePath:"croum-volatile",
    difficultyStars:2
  }),
  "croum-igne":createCroumFamiliar({
    id:"croum-igne",
    label:"Croum Igné",
    defaultProfileName:"Croum Igné principal",
    progressLabel:"Intelligence",
    progressShort:"intelligence",
    icon:"intelligence",
    basePath:"croum-igne",
    difficultyStars:2
  }),
  "croum-vegetal":createCroumFamiliar({
    id:"croum-vegetal",
    label:"Croum Végétal",
    defaultProfileName:"Croum Végétal principal",
    progressLabel:"Force",
    progressShort:"force",
    icon:"force",
    basePath:"croum-vegetal",
    difficultyStars:2
  }),
  bouloute:createBoulouteFamiliar({
    id:"bouloute",
    label:"Bouloute",
    basePath:"bouloute"
  }),
  "bouloute-du-parrain":createBoulouteFamiliar({
    id:"bouloute-du-parrain",
    label:"Bouloute du parrain",
    basePath:"bouloute-du-parrain",
    backgroundBasePath:"bouloute"
  }),
  vampyrette:{
    id:"vampyrette",
    label:"Vampyrette",
    shortLabel:"Vampyrette",
    defaultProfileName:"Vampyrette principale",
    progressLabel:"Vitalité",
    progressShort:"vitalité",
    objectiveMax:VITALITY_OBJECTIVE_MAX,
    objectiveLabel:"165 vitalité",
    icon:"../vitalité/vitalite.png",
    logo:"../vitalité/vampyrette/vampyrette.png",
    image:"../vitalité/vampyrette/vampyrette.png",
    auraImage:"../vitalité/vampyrette/vampyrette-aura.png",
    sleepingImage:"../vitalité/vampyrette/vampyrette-z.png",
    background:"../vitalité/vampyrette/fond/fond.png",
    status:"active",
    statusLabel:"",
    description:"Suivi de vitalité sur le Donjon des Squelettes.",
    bonusAmount:165,
    difficultyLabel:"Facile",
    difficultyStars:1,
    dofusCooldownMin:10,
    farmMethods:["Donjon des Squelettes"],
    dungeons:[
      {key:"donjonSquelettes",label:"Squelettes",fullLabel:"Donjon des Squelettes",asset:"../vitalité/vampyrette/monstre/chafer.png",defaultAverage:600}
    ]
  },
  gelutin:{
    id:"gelutin",
    label:"Gelutin",
    shortLabel:"Gelutin",
    defaultProfileName:"Gelutin principal",
    progressLabel:"Vitalité",
    progressShort:"vitalité",
    objectiveMax:VITALITY_OBJECTIVE_MAX,
    objectiveLabel:"165 vitalité",
    icon:"../vitalité/vitalite.png",
    logo:"../vitalité/gelutin/gelutin.png",
    image:"../vitalité/gelutin/gelutin.png",
    auraImage:"../vitalité/gelutin/gelutin-aura.png",
    sleepingImage:"../vitalité/gelutin/gelutin-z.png",
    background:"../vitalité/gelutin/fond/fond.png",
    status:"active",
    statusLabel:"",
    description:"Suivi de vitalité sur le Donjon des Blops et l'Antre du Blop Multicolore.",
    bonusAmount:165,
    difficultyLabel:"Moyen",
    difficultyStars:2,
    dofusCooldownMin:10,
    specialDefaults:{blopBoss:"blopCocoRoyal"},
    farmMethods:["Donjon des Blops","Antre du Blop Multicolore"],
    dungeons:[
      {key:"donjonBlops",label:"Blops",fullLabel:"Donjon des Blops",asset:"../vitalité/gelutin/donjon/gloutoblop.png",special:"blopBoss",defaultAverage:900},
      {key:"antreBlopMulticolore",label:"Blop Multi",fullLabel:"Antre du Blop Multicolore",asset:"../vitalité/gelutin/donjon/blop-multicolore-royal.png",special:"blopBoss",defaultAverage:600}
    ]
  }
};

const PYKUR_MOBS={
  chiendent:{name:"Chiendent",img:"chiendent.png",ppNeed:80,cat:["morose","tynril","zone"]},
  nerbe:{name:"Nerbe",img:"nerbe.png",ppNeed:80,cat:["morose","tynril","zone"]},
  fecorce:{name:"Fécorce",img:"fecorce.png",ppNeed:60,cat:["morose","tynril","zone"]},
  abrakleur:{name:"Abrakleur Sombre",img:"abrakleur.png",ppNeed:40,cat:["morose","tynril","zone"]},
  bitouf:{name:"Bitouf Sombre",img:"bitouf.png",ppNeed:40,cat:["morose","tynril","zone"]},
  floribonde:{name:"Floribonde",img:"floribonde.png",ppNeed:40,cat:["morose","tynril","zone"]},
  brouture:{name:"Brouture",img:"brouture.png",ppNeed:60,cat:["tynril","zone"]},
  tynrilAhuri:{name:"Tynril Ahuri",img:"tynril-ahuri.png",ppNeed:3,cat:["tynril"]},
  tynrilPerfide:{name:"Tynril Perfide",img:"tynril-perfide.png",ppNeed:3,cat:["tynril"]},
  tynrilDeconcerte:{name:"Tynril Déconcerté",img:"tynril-deconcerte.png",ppNeed:3,cat:["tynril"]},
  tynrilConsterne:{name:"Tynril Consterné",img:"tynril-consterne.png",ppNeed:3,cat:["tynril"]}
};

const ABRA_MOBS={
  cheneMou:{name:"Chêne Mou",imgPath:"../abra-kadabra/assets/images/monstre/chêne mou.png",ppNeed:1,cat:["cheneMou"]},
  abraknydeAncestral:{name:"Abraknyde Ancestral",imgPath:"../abra-kadabra/assets/images/monstre/abraknyde ancestral.png",ppNeed:10,cat:["donjonAbraknyde"]},
  abraknydeSombre:{name:"Abraknyde Sombre",imgPath:"../abra-kadabra/assets/images/monstre/abraknyde sombre.png",ppNeed:20,cat:["donjonAbraknyde","cheneMou"]},
  abrakneSombre:{name:"Abrakne Sombre",imgPath:"../abra-kadabra/assets/images/monstre/abrakne sombre.png",ppNeed:20,cat:["cheneMou"]},
  abraknyde:{name:"Abraknyde",imgPath:"../abra-kadabra/assets/images/monstre/abraknyde.png",ppNeed:50,cat:["donjonAbraknyde","cheneMou","zone"]},
  abraknydeVenerable:{name:"Abraknyde Vénérable",imgPath:"../abra-kadabra/assets/images/monstre/abraknyde venerable.png",ppNeed:50,cat:["donjonAbraknyde","cheneMou","zone"]},
  abrakne:{name:"Abrakne",imgPath:"../abra-kadabra/assets/images/monstre/abrakne.png",ppNeed:50,cat:["donjonAbraknyde","cheneMou","salleAbrakne","zone"]},
  tronknyde:{name:"Tronknyde",imgPath:"../abra-kadabra/assets/images/monstre/tronknyde.png",ppNeed:150,cat:["donjonAbraknyde","cheneMou","zone"]}
};

const DRAGOUNE_MOBS={
  crocabulia:{name:"Crocabulia",imgPath:"../dragoune-noir/assets/images/monstre/crocabulia.png",ppNeed:1,cat:["sanctuaireDragoeufs"]},
  aerotrugoburMalveillant:{name:"Aerotrugobur le Malveillant",imgPath:"../dragoune-noir/assets/images/monstre/aerotrugobur-le-malveillant.png",ppNeed:5,cat:["zone"]},
  aqualikrosImpitoyable:{name:"Aqualikros l'Impitoyable",imgPath:"../dragoune-noir/assets/images/monstre/aqualikros-l-impitoyable.png",ppNeed:5,cat:["zone"]},
  aerohouctorGuerrier:{name:"Aerohouctor le Guerrier",imgPath:"../dragoune-noir/assets/images/monstre/aerohouctor-le-guerrier.png",ppNeed:5,cat:["zone"]},
  aquabralakGuerrier:{name:"Aquabralak le Guerrier",imgPath:"../dragoune-noir/assets/images/monstre/aquabralak-le-guerrier.png",ppNeed:5,cat:["zone"]},
  terrakoubiakGuerrier:{name:"Terrakoubiak le Guerrier",imgPath:"../dragoune-noir/assets/images/monstre/terrakoubiak-le-Guerrier.png",ppNeed:10,cat:["zone"]},
  ignelicroburGuerrier:{name:"Ignelicrobur le Guerrier",imgPath:"../dragoune-noir/assets/images/monstre/ignelicrobur le-guerrier.png",ppNeed:10,cat:["zone"]},
  terraburkalPerfide:{name:"Terraburkal le Perfide",imgPath:"../dragoune-noir/assets/images/monstre/terraburkal-le-perfide.png",ppNeed:10,cat:["zone"]},
  ignerkocroposAffame:{name:"Ignerkocropos l'Affamé",imgPath:"../dragoune-noir/assets/images/monstre/ignerkocropos-l-affame.png",ppNeed:10,cat:["zone"]},
  dragossNoir:{name:"Dragoss Noir",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-noir.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossBlanc:{name:"Dragoss Blanc",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-blanc.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossSaphir:{name:"Dragoss de Saphir",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-de-saphir.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossDoreEveille:{name:"Dragoss Doré Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-dore-eveille.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossNoirEveille:{name:"Dragoss Noir Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-noir-eveille.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossBlancEveille:{name:"Dragoss Blanc Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-blanc-eveille.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossSaphirEveille:{name:"Dragoss de Saphir Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-de-saphir-eveille.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragossDore:{name:"Dragoss Doré",imgPath:"../dragoune-noir/assets/images/monstre/dragoss-dore.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragoeufVolant:{name:"Dragoeuf Volant",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-volant.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragoeufGuerrier:{name:"Dragoeuf Guerrier",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-guerrier.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragueuse:{name:"Dragueuse",imgPath:"../dragoune-noir/assets/images/monstre/dragueuse.png",ppNeed:15,cat:["sanctuaireDragoeufs","zone"]},
  dragoeufDoreImmature:{name:"DragOeuf Doré immature",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-dore-immature.png",ppNeed:50,cat:["zone"]},
  dragoeufNoirImmature:{name:"DragOeuf Noir immature",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-noir-immature.png",ppNeed:50,cat:["zone"]},
  dragoeufBlancImmature:{name:"DragOeuf Blanc immature",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-blanc-immature.png",ppNeed:50,cat:["zone"]},
  dragoeufSaphirImmature:{name:"DragOeuf de Saphir immature",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-de-saphir-immature.png",ppNeed:50,cat:["zone"]},
  dragoeufDore:{name:"DragOeuf Doré",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-dore.png",ppNeed:50,cat:["zone"]},
  dragoeufNoir:{name:"DragOeuf Noir",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-noir.png",ppNeed:50,cat:["zone"]},
  dragoeufBlanc:{name:"DragOeuf Blanc",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-blanc.png",ppNeed:50,cat:["zone"]},
  dragoeufSaphir:{name:"DragOeuf de Saphir",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-de-saphir.png",ppNeed:50,cat:["zone"]},
  dragoeufDoreEveille:{name:"DragOeuf Doré Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-dore-eveille.png",ppNeed:50,cat:["zone"]},
  dragoeufNoirEveille:{name:"DragOeuf Noir Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-noir-eveille.png",ppNeed:50,cat:["zone"]},
  dragoeufBlancEveille:{name:"DragOeuf Blanc Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-blanc-eveille.png",ppNeed:50,cat:["zone"]},
  dragoeufSaphirEveille:{name:"DragOeuf de Saphir Eveillé",imgPath:"../dragoune-noir/assets/images/monstre/dragoeuf-de-saphir-eveille.png",ppNeed:50,cat:["zone"]},
  coquilleSoignante:{name:"Coquille Soignante",imgPath:"../dragoune-noir/assets/images/monstre/coquille-soignante.png",ppNeed:100,cat:["zone"]},
  coquilleExplosive:{name:"Coquille Explosive",imgPath:"../dragoune-noir/assets/images/monstre/coquille-explosive.png",ppNeed:100,cat:["zone"]}
};

const TOFOUDRE_MOBS={
  sphincterCell:{name:"Sphincter Cell",imgPath:"../tofoudre/assets/images/monstre/sphincter-cell.png",ppNeed:5,cat:["ratsAmakna"]},
  ratNoir:{name:"Rat Noir",imgPath:"../tofoudre/assets/images/monstre/rat-noir.png",ppNeed:25,cat:["ratsAmakna","ratsBrakmar"]},
  ratBlanc:{name:"Rat Blanc",imgPath:"../tofoudre/assets/images/monstre/rat-blanc.png",ppNeed:25,cat:["ratsAmakna","ratsBonta"]},
  ratCroc:{name:"Rat Croc",imgPath:"../tofoudre/assets/images/monstre/rat-croc.png",ppNeed:150,cat:["ratsAmakna","ratsBonta"]},
  ratBajoie:{name:"Rat Bajoie",imgPath:"../tofoudre/assets/images/monstre/rat-bajoie.png",ppNeed:150,cat:["ratsAmakna","ratsBonta"]},
  ratBasher:{name:"Rat Basher",imgPath:"../tofoudre/assets/images/monstre/rat-basher.png",ppNeed:150,cat:["ratsAmakna","ratsBonta"]},
  ratKlure:{name:"Rat Klure",imgPath:"../tofoudre/assets/images/monstre/rat-klure.png",ppNeed:150,cat:["ratsAmakna","ratsBrakmar"]},
  ratBatteur:{name:"Rat Batteur",imgPath:"../tofoudre/assets/images/monstre/rat-batteur.png",ppNeed:150,cat:["ratsAmakna","ratsBrakmar"]},
  ratDeMarais:{name:"Rat de Marais",imgPath:"../tofoudre/assets/images/monstre/rat-de-marais.png",ppNeed:150,cat:["ratsAmakna","ratsBrakmar"]},
  ratHyoactif:{name:"Rat d'Hyoactif",imgPath:"../tofoudre/assets/images/monstre/rat-d-hyoactif.png",ppNeed:200,cat:["zone"]},
  chamanEgoutant:{name:"Chaman d'Egoutant",imgPath:"../tofoudre/assets/images/monstre/chaman-d-egoutant.png",ppNeed:250,cat:["ratsAmakna","ratsBrakmar","ratsBonta"]},
  ratEgoutant:{name:"Rat d'Egoutant",imgPath:"../tofoudre/assets/images/monstre/rat-d-egoutant.png",ppNeed:300,cat:["ratsAmakna","ratsBrakmar","ratsBonta"]},
  ratEgoutantMalade:{name:"Rat d'Egoutant malade",imgPath:"../tofoudre/assets/images/monstre/rat-d-egoutant-malade.png",ppNeed:300,cat:["zone"]},
  miliratEgoutantMalade:{name:"Milirat d'Egoutant malade",imgPath:"../tofoudre/assets/images/monstre/milirat-d-egoutant-malade.png",ppNeed:400,cat:["zone"]}
};

const CROUM_MOBS={
  silfRasboul:{name:"Silf le Rasboul Majeur",imgPath:"../croum oto/monstre/rasboul.png",ppNeed:1,cat:["gouletRasboul"]},
  mufafah:{name:"Mufafah",imgPath:"../croum oto/monstre/mufafah.png",ppNeed:40,cat:["gouletRasboul"]},
  craqueboulePoli:{name:"Craqueboule Poli",imgPath:"../croum oto/monstre/craqueboule-poli.png",ppNeed:40,cat:["gouletRasboul"]},
  kido:{name:"Kido",imgPath:"../croum oto/monstre/kido.png",ppNeed:50,cat:["gouletRasboul"]},
  kilibriss:{name:"Kilibriss",imgPath:"../croum oto/monstre/kilibriss.png",ppNeed:50,cat:["gouletRasboul"]},
  bitoufPlaines:{name:"Bitouf des Plaines",imgPath:"../croum oto/monstre/bitouf-des-plaines.png",ppNeed:50,cat:["gouletRasboul"]},
  craqueleurPoli:{name:"Craqueleur Poli",imgPath:"../croum oto/monstre/craqueleur-poli.png",ppNeed:60,cat:["gouletRasboul"]}
};
const BOULOUTE_MOBS={
  bouftouRoyal:{name:"Bouftou Royal",imgPath:"../vitalité/monstre bouloute/bouftou-royal.png",ppNeed:5,cat:["donjonBouftous"]},
  chefBouftou:{name:"Chef de Guerre Bouftou",imgPath:"../vitalité/monstre bouloute/chef-de-guerre-bouftou.png",ppNeed:20,cat:["donjonBouftous"]},
  bouftouHalouine:{name:"Bouftou d'Halouine",imgPath:"../vitalité/monstre bouloute/bouftou-d-hallowen.png",ppNeed:25,cat:["zone"]},
  ballotinBouftou:{name:"Ballotin le Bouftou",imgPath:"../vitalité/monstre bouloute/ballotin-le-bouftou.png",ppNeed:25,cat:["zone"]},
  bouftou:{name:"Bouftou",imgPath:"../vitalité/monstre bouloute/bouftou.png",ppNeed:50,cat:["donjonBouftous"]},
  bouftonBlanc:{name:"Boufton Blanc",imgPath:"../vitalité/monstre bouloute/boufton-blanc.png",ppNeed:100,cat:["donjonBouftous"]},
  bouftonNoir:{name:"Boufton Noir",imgPath:"../vitalité/monstre bouloute/boufton-noir.png",ppNeed:100,cat:["donjonBouftous"]}
};
const VAMPYRETTE_MOBS={
  chaferElite:{name:"Chafer d'élite",imgPath:"../vitalité/vampyrette/monstre/chafer-d-elite.png",ppNeed:10,cat:["zone"]},
  chaferLancier:{name:"Chafer Lancier",imgPath:"../vitalité/vampyrette/monstre/chafer-lancier.png",ppNeed:15,cat:["zone"]},
  rib:{name:"Rib",imgPath:"../vitalité/vampyrette/monstre/rib.png",ppNeed:20,cat:["donjonSquelettes"]},
  chaferInvisible:{name:"Chafer Invisible",imgPath:"../vitalité/vampyrette/monstre/chafer-invisible.png",ppNeed:20,cat:["donjonSquelettes"]},
  chaferArcher:{name:"Chafer Archer",imgPath:"../vitalité/vampyrette/monstre/chafer-archer.png",ppNeed:20,cat:["zone"]},
  chaferFantassin:{name:"Chafer Fantassin",imgPath:"../vitalité/vampyrette/monstre/chafer-fantassin.png",ppNeed:20,cat:["donjonSquelettes"]},
  chafer:{name:"Chafer",imgPath:"../vitalité/vampyrette/monstre/chafer.png",ppNeed:30,cat:["donjonSquelettes"]},
  kwoan:{name:"Kwoan",imgPath:"../vitalité/vampyrette/monstre/kwoan.png",ppNeed:30,cat:["zone"]},
  chaferPrepubere:{name:"Chafer Prépubère",imgPath:"../vitalité/vampyrette/monstre/chafer-prepubere.png",ppNeed:30,cat:["zone"]}
};
const GELUTIN_MOBS={
  blopMulticoloreRoyal:{name:"Blop Multicolore Royal",imgPath:"../vitalité/gelutin/monstre/blop-multicolore-royal.png",ppNeed:1,cat:["antreBlopMulticolore"]},
  blopReinetteRoyal:{name:"Blop Reinette Royal",imgPath:"../vitalité/gelutin/monstre/blop-reneitte-royal.png",ppNeed:2,cat:["donjonBlops","antreBlopMulticolore"]},
  blopIndigoRoyal:{name:"Blop Indigo Royal",imgPath:"../vitalité/gelutin/monstre/blop-indigo-royal.png",ppNeed:2,cat:["donjonBlops","antreBlopMulticolore"]},
  blopGriotteRoyal:{name:"Blop Griotte Royal",imgPath:"../vitalité/gelutin/monstre/blop-griotte-royal.png",ppNeed:2,cat:["donjonBlops","antreBlopMulticolore"]},
  blopCocoRoyal:{name:"Blop Coco Royal",imgPath:"../vitalité/gelutin/monstre/blop-coco-royal.png",ppNeed:2,cat:["donjonBlops","antreBlopMulticolore"]},
  gloutoblop:{name:"Gloutoblop",imgPath:"../vitalité/gelutin/monstre/gloutoblop.png",ppNeed:15,cat:["donjonBlops","antreBlopMulticolore"]},
  tronkoblop:{name:"Tronkoblop",imgPath:"../vitalité/gelutin/monstre/tronkblop.png",ppNeed:25,cat:["donjonBlops","antreBlopMulticolore"]},
  blopReinette:{name:"Blop Reinette",imgPath:"../vitalité/gelutin/monstre/blop-reinette.png",ppNeed:50,cat:["donjonBlops","antreBlopMulticolore"]},
  blopGriotte:{name:"Blop Griotte",imgPath:"../vitalité/gelutin/monstre/blop-griotte.png",ppNeed:50,cat:["donjonBlops","antreBlopMulticolore"]},
  blopIndigo:{name:"Blop Indigo",imgPath:"../vitalité/gelutin/monstre/blop-indigo.png",ppNeed:50,cat:["donjonBlops","antreBlopMulticolore"]},
  blopCoco:{name:"Blop Coco",imgPath:"../vitalité/gelutin/monstre/blop-coco.png",ppNeed:50,cat:["donjonBlops","antreBlopMulticolore"]},
  biblopReinette:{name:"Biblop Reinette",imgPath:"../vitalité/gelutin/monstre/biblop-reinette.png",ppNeed:100,cat:["zone"]},
  biblopGriotte:{name:"Biblop Griotte",imgPath:"../vitalité/gelutin/monstre/biblop-griotte.png",ppNeed:100,cat:["zone"]},
  biblopCoco:{name:"Biblop Coco",imgPath:"../vitalité/gelutin/monstre/biblop-coco.png",ppNeed:100,cat:["zone"]},
  biblopIndigo:{name:"Biblop Indigo",imgPath:"../vitalité/gelutin/monstre/biblop-indigo.png",ppNeed:100,cat:["zone"]}
};

const PYKUR_GAINS={
  morose:{chiendent:1,nerbe:1,fecorce:1,abrakleur:1,bitouf:1,floribonde:2},
  tynril:{tynrilConsterne:1,tynrilDeconcerte:1,tynrilPerfide:1,tynrilAhuri:1,fecorce:2,abrakleur:3,brouture:3,chiendent:5,nerbe:6,floribonde:6,bitouf:10}
};
const ABRA_GAINS={
  donjonAbraknyde:{abraknyde:5,abraknydeVenerable:14,abraknydeSombre:2,abraknydeAncestral:1,abrakne:11,tronknyde:4},
  cheneMou:{cheneMou:1,abraknyde:4,tronknyde:3,abraknydeVenerable:1,abraknydeSombre:13,abrakne:1,abrakneSombre:14},
  salleAbrakne:{abrakne:1}
};
const DRAGOUNE_GAINS={
  sanctuaireDragoeufs:{
    crocabulia:1,
    dragossBlanc:5,
    dragossDore:5,
    dragossNoir:5,
    dragossSaphir:5,
    dragueuse:7,
    dragoeufGuerrier:5,
    dragoeufVolant:8,
    dragossBlancEveille:5,
    dragossDoreEveille:5,
    dragossNoirEveille:5,
    dragossSaphirEveille:5
  }
};
const TOFOUDRE_GAINS={
  ratsAmakna:{
    sphincterCell:1,
    ratBlanc:1,
    ratNoir:1,
    ratCroc:4,
    ratEgoutant:5,
    ratBatteur:6,
    ratBajoie:7,
    chamanEgoutant:10,
    ratDeMarais:7,
    ratKlure:10,
    ratBasher:11
  },
  ratsBrakmar:{
    ratNoir:1,
    ratBatteur:9,
    ratKlure:7,
    chamanEgoutant:13,
    ratDeMarais:16,
    ratEgoutant:17
  },
  ratsBonta:{
    ratBlanc:1,
    ratBajoie:9,
    ratBasher:7,
    chamanEgoutant:13,
    ratCroc:16,
    ratEgoutant:17
  }
};
const CROUM_GAINS={
  gouletRasboul:{
    silfRasboul:1,
    craqueboulePoli:1,
    craqueleurPoli:6,
    mufafah:5,
    kido:7,
    bitoufPlaines:11,
    kilibriss:11
  }
};
const BOULOUTE_GAINS={
  donjonBouftous:{
    bouftouRoyal:1,
    chefBouftou:9,
    bouftonBlanc:14,
    bouftonNoir:13,
    bouftou:37
  }
};
const VAMPYRETTE_GAINS={
  donjonSquelettes:{
    chaferFantassin:4,
    chaferInvisible:10,
    rib:10,
    chafer:17
  }
};
const GELUTIN_BLOP_BOSS_GAINS={
  blopCocoRoyal:{blopCocoRoyal:1,blopCoco:1},
  blopGriotteRoyal:{blopGriotteRoyal:1,blopGriotte:1},
  blopIndigoRoyal:{blopIndigoRoyal:1,blopIndigo:1},
  blopReinetteRoyal:{blopReinetteRoyal:1,blopReinette:1}
};
const GELUTIN_DONJON_BLOPS_BASE={
  blopGriotte:2,
  blopReinette:2,
  blopCoco:3,
  blopIndigo:3,
  gloutoblop:12,
  tronkoblop:16
};
const GELUTIN_ANTRE_FINAL_GAINS={
  blopMulticoloreRoyal:1,
  blopCocoRoyal:1,
  blopGriotteRoyal:1,
  blopIndigoRoyal:1,
  blopReinetteRoyal:1,
  tronkoblop:2
};
const GELUTIN_GAINS={
  donjonBlops:copyObject(GELUTIN_DONJON_BLOPS_BASE),
  antreBlopMulticolore:Object.entries(GELUTIN_ANTRE_FINAL_GAINS).reduce((acc,[id,count])=>{
    acc[id]=(acc[id]||0)+count;
    return acc;
  },copyObject(GELUTIN_DONJON_BLOPS_BASE))
};
const ABRA_SPECIAL_GAINS={
  salleAbrakneSetup:{abraknyde:4,tronknyde:3,abraknydeVenerable:1,abrakne:1}
};
const PYKUR_ZONE_IDS=["abrakleur","bitouf","brouture","chiendent","fecorce","floribonde","nerbe"];
const ABRA_ZONE_IDS=["abraknyde","tronknyde","abraknydeVenerable","abrakne"];
const DRAGOUNE_ZONE_IDS=Object.keys(DRAGOUNE_MOBS).filter(id=>DRAGOUNE_MOBS[id].cat.includes("zone"));
const TOFOUDRE_ZONE_IDS=Object.keys(TOFOUDRE_MOBS).filter(id=>TOFOUDRE_MOBS[id].cat.includes("zone"));
const CROUM_ZONE_IDS=[];
const BOULOUTE_ZONE_IDS=Object.keys(BOULOUTE_MOBS).filter(id=>BOULOUTE_MOBS[id].cat.includes("zone"));
const VAMPYRETTE_ZONE_IDS=Object.keys(VAMPYRETTE_MOBS).filter(id=>VAMPYRETTE_MOBS[id].cat.includes("zone"));
const GELUTIN_ZONE_IDS=Object.keys(GELUTIN_MOBS).filter(id=>GELUTIN_MOBS[id].cat.includes("zone"));
const CROUM_RUNTIME={runLimits:CROUM_RUN_LIMITS,mobs:CROUM_MOBS,gains:CROUM_GAINS,zoneIds:CROUM_ZONE_IDS};
const BOULOUTE_RUNTIME={runLimits:BOULOUTE_RUN_LIMITS,mobs:BOULOUTE_MOBS,gains:BOULOUTE_GAINS,zoneIds:BOULOUTE_ZONE_IDS};
const FAMILIAR_RUNTIME={
  pykur:{runLimits:PYKUR_RUN_LIMITS,mobs:PYKUR_MOBS,gains:PYKUR_GAINS,zoneIds:PYKUR_ZONE_IDS},
  "abra-kadabra":{runLimits:ABRA_RUN_LIMITS,mobs:ABRA_MOBS,gains:ABRA_GAINS,zoneIds:ABRA_ZONE_IDS,specialGains:ABRA_SPECIAL_GAINS},
  "dragoune-noir":{runLimits:DRAGOUNE_RUN_LIMITS,mobs:DRAGOUNE_MOBS,gains:DRAGOUNE_GAINS,zoneIds:DRAGOUNE_ZONE_IDS},
  tofoudre:{runLimits:TOFOUDRE_RUN_LIMITS,mobs:TOFOUDRE_MOBS,gains:TOFOUDRE_GAINS,zoneIds:TOFOUDRE_ZONE_IDS},
  "croum-aqueux":CROUM_RUNTIME,
  "croum-volatile":CROUM_RUNTIME,
  "croum-igne":CROUM_RUNTIME,
  "croum-vegetal":CROUM_RUNTIME,
  bouloute:BOULOUTE_RUNTIME,
  "bouloute-du-parrain":BOULOUTE_RUNTIME,
  vampyrette:{runLimits:VAMPYRETTE_RUN_LIMITS,mobs:VAMPYRETTE_MOBS,gains:VAMPYRETTE_GAINS,zoneIds:VAMPYRETTE_ZONE_IDS},
  gelutin:{runLimits:GELUTIN_RUN_LIMITS,mobs:GELUTIN_MOBS,gains:GELUTIN_GAINS,zoneIds:GELUTIN_ZONE_IDS}
};

  window.PYKUR_FAMILIAR_DATA={
    PP_MAX,
    ABRA_OBJECTIVE_MAX,
    DRAGOUNE_OBJECTIVE_MAX,
    TOFOUDRE_OBJECTIVE_MAX,
    CROUM_OBJECTIVE_MAX,
    VITALITY_OBJECTIVE_MAX,
    PYKUR_RUN_LIMITS,
    ABRA_RUN_LIMITS,
    DRAGOUNE_RUN_LIMITS,
    TOFOUDRE_RUN_LIMITS,
    CROUM_RUN_LIMITS,
    BOULOUTE_RUN_LIMITS,
    VAMPYRETTE_RUN_LIMITS,
    GELUTIN_RUN_LIMITS,
    FAMILIARS,
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
  };
})();
