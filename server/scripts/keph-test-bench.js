#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const BASE_URL = process.env.KEPH_TEST_BASE_URL || "https://familier-tracker.fr";
const REQUEST_TIMEOUT_MS = Number(process.env.KEPH_TEST_TIMEOUT_MS || 12000);
const PAUSE_MS = Number(process.env.KEPH_TEST_PAUSE_MS || 850);
const RETRY_429_MS = Number(process.env.KEPH_TEST_RETRY_429_MS || 4500);
const LIMIT = Number(process.env.KEPH_TEST_LIMIT || 0);
const MIN_QUALITY_AVG = Number(process.env.KEPH_TEST_MIN_QUALITY_AVG || 1.72);
const ALLOW_QUALITY_ONE = process.env.KEPH_TEST_ALLOW_QUALITY_ONE === "1";

const context = {
  currentCandidate: "Kinza",
  nextParticipant: "Maz",
  activeSection: "show",
  configOpen: true,
  availableLots: 8,
  soundMuted: false,
  queueRemaining: 4,
  stage: "ready",
  queue: ["Kinza", "Maz", "Capy"],
  lots: [
    { name: "Dofus Cawotte +40 mini", enabled: true, stockEnabled: true, stock: 3, available: true, rate: 5 },
    { name: "Bourse 200.000k", enabled: true, stockEnabled: false, stock: 0, available: true, rate: 10 }
  ],
  dialogues: [
    { id: "d1", index: 1, trigger: "presentation", speaker: "charlie", kind: "dialogue", text: "Bienvenue dans la Charlie Roulette.", emote: "smile", fx: "confetti", audioId: "snd1" },
    { id: "d2", index: 2, trigger: "jingle", speaker: "victoria", kind: "dialogue", text: "Le jingle est lance.", emote: "star", fx: "spotlights", audioId: "" }
  ],
  audioAssets: [{ id: "snd1", name: "applause.mp3" }],
  settingsSnapshot: { showEnabled: true, defaultDialoguesEnabled: true, autoNextShow: false }
};

const coreCases = [
  { q: "salut la forme ?", expect: ["salut"], avoid: ["documentation", "dialogue cible"], noActions: true },
  { q: "salut la forme ?", mode: "discussion", expect: ["salut"], expectMode: "discussion", avoid: ["documentation", "studio", "regie"], noActions: true },
  { q: "tu t appelles comment ?", expect: ["keph"], avoid: ["je peux t aider sur la regie"], noActions: true },
  { q: "tu connais Keph ?", expect: ["keph", "assistant"], avoid: ["je ne vois pas"], noActions: true },
  { q: "qui suis-je ?", expectAny: ["je ne peux pas savoir", "candidat actuellement"], noActions: false },
  { q: "qui a cree Harry Potter ?", expect: ["rowling"], noActions: true },
  { q: "il est quelle heure ?", expectAny: ["il est", "heure"], noActions: true },

  { q: "je suis nouveau sur le site, je fais quoi ?", expect: ["preparer", "lots"], expectAny: ["simulation", "simuler"], action: "open_prepare", avoid: ["je ne vois pas"] },
  { q: "a quoi sert le site ?", expect: ["tirage", "live", "discord"], action: "open_prepare" },
  { q: "a quoi sert le site ?", mode: "help", expect: ["tirage", "live"], expectMode: "help", action: "open_prepare", avoid: ["je peux t aider"] },
  { q: "par quoi je dois commencer avant un live ?", expect: ["preparer", "lots"], expectAny: ["simulation", "simuler"], action: "open_prepare" },
  { q: "ça se trouve ou ?", expectAny: ["quel bouton", "quelle option", "precise"], noActions: true },

  { q: "a quoi sert le bouton lancer ?", expect: ["vrai tirage", "stock", "historique"], action: "open_prepare", avoid: ["charlie roulette sert"] },
  { q: "a quoi sert le bouton lancer ?", mode: "help", expect: ["vrai tirage", "stock", "historique"], expectMode: "help", action: "open_prepare", avoid: ["charlie roulette sert"] },
  { q: "a quoi sert stop ?", expect: ["arrete", "roue"], action: "open_prepare" },
  { q: "stop ca change quoi ?", expect: ["arrete", "roue"], action: "open_prepare", avoid: ["lancer demarre"] },
  { q: "suivant consomme un stock ?", expect: ["non", "prochain participant"], action: "open_prepare", avoid: ["stocks servent"] },
  { q: "tu peux faire un tirage test ?", expect: ["tirage test", "sans toucher"], actionType: "start_test_draw" },
  { q: "a quoi sert tirage test ?", expect: ["sans", "stock", "historique"], action: "open_prepare" },

  { q: "ça sert à quoi de mettre des participants ?", expect: ["qui passe", "ordre", "lancers"], action: "open_prepare", avoid: ["pour ajouter"] },
  { q: "comment j'ajoute des candidats ?", expect: ["preparer", "pseudo", "charger"], action: "open_prepare" },
  { q: "tu peux mettre le candidat Miette en premiere position sans supprimer les autres?", expect: ["set_queue", "Miette"], actionType: "command_batch", avoid: ["add_player"] },
  { q: "tu peux mettre le candidat Miette en premiere position sans supprimer les autres?", mode: "action", expect: ["set_queue", "Miette"], expectMode: "action", actionType: "command_batch", avoid: ["add_player"] },
  { q: "comment je peux mettre Miette en premiere position ?", mode: "help", expectAny: ["file", "preparer", "ordre"], expectMode: "help", noInternalCommands: true, avoid: ["set_queue"] },
  { q: "tu peux ajouter le candidat Capy a la fin de la liste", expect: ["capy"], actionType: "command_batch", avoid: ["capy a la fin"] },
  { q: "mets tous les candidats a 5 lancers", expect: ["commande", "controlee"], actionType: "command_batch" },

  { q: "salut, tu peux m'aider comment je peux ajouter un lot dans la roue ?", expect: ["studio", "poids", "stock"], action: "open_wheel_studio_lots", noInternalCommands: true },
  { q: "salut, tu peux m'aider comment je peux ajouter un lot dans la roue ?", mode: "help", expect: ["studio", "poids", "stock"], expectMode: "help", action: "open_wheel_studio_lots", noInternalCommands: true, avoid: ["add_lot", "setpoids"] },
  { q: "on peut changer les couleurs des cases de la roulette ?", expect: ["couleur", "design"], action: "open_wheel_studio_design" },
  { q: "il y a un nombre théorique de lot maximum dans la roue ?", expectAny: ["8", "12", "lisible"], action: "open_wheel_studio_lots", avoid: ["poids est une chance"] },
  { q: "a quoi sert le poid dans la roue ?", expect: ["chance relative", "20", "10"], action: "open_wheel_studio_lots" },
  { q: "modifie le lot Dofus Cawotte et mets son poids a 10", expect: ["setpoids", "Dofus Cawotte", "10"], actionType: "command_batch" },

  { q: "comment créer un dialogue ?", expect: ["studio", "replique", "etape"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "Comment modifier les dialogues de présentation", expect: ["presentation", "studio"], expectAny: ["modifier", "modifie"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "tu sais créer les dialogues toi ?", expect: ["oui", "idees", "confirmer"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "tu ferais quoi comme dialogue pour un jingle drôle, donne moi juste des idées ne créer rien", expect: ["jingle"], expectAny: ["idees", "exemples", "phrases"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "tu ferais quoi comme dialogue pour un jingle drole, donne moi juste des idees ne creer rien", mode: "creative", expect: ["jingle"], expectAny: ["idee", "phrase", "exemple"], expectMode: "creative", noInternalCommands: true, avoid: ["add_dialogue"] },
  { q: "Tu peux me créer un dialogue qui va présenter les 5 candidats un peu drôle, il doit y avoir 1 dialogue pour un candidat et libre à toi de choisir qui parle Charlie ou Victoria, les emotes et les effets", expect: ["add_dialogue", "presentation"], actionType: "command_batch", avoid: ["set_queue"] },
  { q: "quand créer un dialogue il y a des boutons Candidat actuel Lot etc ça sert à quoi ?", expect: ["variables", "contexte", "candidat"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "dialogue parlé ou indication scénique ?", expect: ["bulle", "action", "scene"], action: "open_scenario_studio" },
  { q: "c'est quoi un /me ?", expect: ["indication scenique", "action"], action: "open_scenario_studio", avoid: ["discord"] },
  { q: "comment ajouter un bruitage mp3 sur une replique ?", expect: ["bruitage", "mp3", "replique"], action: "open_scenario_studio" },
  { q: "comment mettre des effets spéciaux ?", expect: ["effet", "replique", "studio"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "c'est quoi la liste des effets spéciaux ?", expect: ["confettis", "flash"], action: "open_scenario_studio" },

  { q: "a quoi sert le jingle ?", expect: ["ouverture", "ambiance", "sans lancer la roue"], actionAny: ["open_scenario_studio", "open_audio"] },
  { q: "est ce que le jingle lance la roue ?", expect: ["non", "ne lance pas la roue"], actionAny: ["open_scenario_studio", "open_audio"], avoid: ["je peux lancer"] },
  { q: "a quoi sert presenter les candidats ?", expect: ["intro", "candidats"], action: "open_scenario_studio", avoid: ["participants servent"] },
  { q: "a quoi sert d'activer le charlie show ?", expect: ["interventions", "charlie", "victoria"], action: "open_scenario_studio" },
  { q: "a quoi ça sert d'activer l'option dialogue inclus", expect: ["defaut", "personnalise"], action: "open_scenario_studio" },
  { q: "a quoi sert l'option cochable annoncer le candidat suivant ?", expect: ["annonce", "apres un tirage"], action: "open_scenario_studio" },

  { q: "Dans profile ça sert à quoi d'importer ?", expect: ["recharger", "configuration", "remplace"], action: "open_data", avoid: ["participants a la file"] },
  { q: "Dans profil, importer sert a quoi exactement ?", mode: "help", expect: ["recharger", "configuration"], expectAny: ["remplace", "charge"], expectMode: "help", action: "open_data", avoid: ["sauvegarde regroupe"] },
  { q: "a quoi sert exporter le profil ?", expect: ["fichier", "sauvegarde", "configuration"], action: "open_data" },
  { q: "d'accord, donc si je change d'ordinateur je peux exporter et importer sur le nouveau pc ?", expect: ["oui", "export", "import"], action: "open_data" },
  { q: "a quoi sert l historique ?", expect: ["vrais tirages", "gagnant"], action: "open_data" },
  { q: "merci aurevoir !", expectAny: ["avec plaisir", "a bientot", "bonne"], noActions: true },
  { q: "ca sert a quoi ?", context: { activeSection: "show", activePanel: "Studio de scenarios", activeControl: "Bruitage" }, expect: ["bruitage", "replique"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "que faire si je me trompe de tirage ?", expect: ["corriger", "dernier tirage"], action: "open_data" },

  { q: "comment faire une scene Discord propre ?", expect: ["discord", "capture", "regie"], actionAny: ["highlight_discord", "detach_control"] },
  { q: "pourquoi detacher la regie ?", expect: ["fenetre", "capture"], action: "detach_control" },
  { q: "comment activer le mode dragon laser dans le site ?", expect: ["je ne vois pas", "documentation"] }
];

function loadRealCases() {
  try {
    const file = path.join(__dirname, "..", "keph-docs", "feedback-cases.json");
    const payload = JSON.parse(fs.readFileSync(file, "utf8"));
    return (payload.cases || []).map((item) => ({
      q: item.question,
      mode: item.mode || "",
      expect: item.expect || [],
      expectAny: item.expectAny || [],
      avoid: item.avoid || [],
      noInternalCommands: !!item.noInternalCommands,
      qualityHint: item.ideal || "",
      realCaseId: item.id,
      category: item.category
    }));
  } catch (error) {
    console.warn(`WARN unable to load real feedback cases: ${error.message}`);
    return [];
  }
}

const cases = [...coreCases, ...loadRealCases()];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function hasTerm(answer, term) {
  return normalize(answer).includes(normalize(term));
}

function qualityScore({ test, answer, actions, payload }) {
  const norm = normalize(answer);
  let score = 2;
  const reasons = [];
  const genericPhrases = [
    "je peux t aider mais il me manque",
    "donne moi le nom exact",
    "charlie roulette sert a animer",
    "sauvegarde regroupe",
    "le studio de scenarios sert a organiser"
  ];
  const internalCommand = /(^|\n)\s*\/(?:add_lot|setpoids|setstock|add_dialogue|clear_lots|set_queue|setlance|set_lot_color)\b/i.test(answer);
  const isHelpLike = (test.mode || payload.replyMode) === "help" || /^(?:comment|a quoi|pourquoi|ou|où|c est quoi|ça sert|ca sert)/i.test(test.q || "");
  const asksYesNo = /\b(?:d accord|du coup|est ce que|je peux|on peut|tu sais|possible)\b/i.test(test.q || "");
  const asksNext = /\b(?:apres|après|ensuite|une fois|termin[eé])\b/i.test(test.q || "");
  if (internalCommand && (test.noInternalCommands || isHelpLike)) {
    score = 0;
    reasons.push("commandes internes dans une réponse d'aide");
  }
  if (genericPhrases.some((phrase) => norm.includes(phrase)) && !test.allowGeneric) {
    score = Math.min(score, 1);
    reasons.push("formulation trop générique ou fiche recopiée");
  }
  if (asksYesNo && !/\b(?:oui|non)\b/.test(norm) && !actions.some((action) => action.type === "command_batch")) {
    score = Math.min(score, 1);
    reasons.push("question oui/non sans réponse directe");
  }
  if (asksNext && /\b(?:sert a|sert à|pseudo par ligne|file d attente sert)\b/i.test(answer)) {
    score = Math.min(score, 1);
    reasons.push("répond par une définition au lieu de guider la suite");
  }
  if (answer.length > 900 && !actions.some((action) => action.type === "command_batch")) {
    score = Math.min(score, 1);
    reasons.push("réponse trop longue pour une aide live");
  }
  if (payload.intent === "unverified_site_question" && !/dragon|fonction.*documentation/i.test(test.q || "")) {
    score = Math.min(score, 1);
    reasons.push("refus non vérifié sur une question probablement couverte");
  }
  if (score === 2 && answer.trim().length < 35) {
    score = 1;
    reasons.push("réponse trop courte");
  }
  return { score, reasons };
}

async function ask(question, extraContext = {}, mode = "") {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/charlie-keph/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: question, context: { ...context, ...extraContext, kephMode: mode || extraContext.kephMode || "auto" }, mode }),
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  const elapsed = Date.now() - started;
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_429_MS));
    return ask(question, extraContext, mode);
  }
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { elapsed, payload: await response.json() };
}

(async () => {
  const selected = LIMIT > 0 ? cases.slice(0, LIMIT) : cases;
  const failures = [];
  let qualityTotal = 0;
  let qualityOne = 0;
  for (const test of selected) {
    try {
      if (PAUSE_MS) await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
      const { elapsed, payload } = await ask(test.q, test.context || {}, test.mode || "");
      const answer = payload.answer || "";
      const actions = Array.isArray(payload.actions) ? payload.actions : [];
      const missing = (test.expect || []).filter((term) => !hasTerm(answer, term));
      const missingAny = test.expectAny?.length && !test.expectAny.some((term) => hasTerm(answer, term)) ? test.expectAny : [];
      const forbidden = (test.avoid || []).filter((term) => hasTerm(answer, term));
      const internalCommands = test.noInternalCommands && /(^|\n)\s*\/(?:add_lot|setpoids|setstock|add_dialogue|clear_lots|set_queue|setlance)\b/i.test(answer);
      const modeMissing = test.expectMode && payload.replyMode !== test.expectMode;
      const actionMissing = test.action && !actions.some((action) => action.id === test.action);
      const actionAnyMissing = test.actionAny?.length && !actions.some((action) => test.actionAny.includes(action.id));
      const actionTypeMissing = test.actionType && !actions.some((action) => action.type === test.actionType);
      const noActionsFailed = test.noActions && actions.length > 0;
      const tooShort = answer.trim().length < 18;
      const quality = qualityScore({ test, answer, actions, payload });
      qualityTotal += quality.score;
      if (quality.score === 1) qualityOne++;
      const qualityFailed = quality.score === 0 || (!ALLOW_QUALITY_ONE && test.realCaseId && quality.score < 2);
      const ok = !missing.length && !missingAny.length && !forbidden.length && !internalCommands && !modeMissing && !actionMissing && !actionAnyMissing && !actionTypeMissing && !noActionsFailed && !tooShort && !qualityFailed;
      console.log(`${ok ? "OK" : "FAIL"} q${quality.score}/2 ${elapsed}ms [${payload.source || "?"}/${payload.replyMode || "?"}/${payload.intent || "?"}] ${test.realCaseId ? `[${test.realCaseId}] ` : ""}${test.q}`);
      if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
      if (missingAny.length) console.log(`  missing any of: ${missingAny.join(", ")}`);
      if (forbidden.length) console.log(`  forbidden: ${forbidden.join(", ")}`);
      if (internalCommands) console.log("  forbidden internal command syntax in help answer");
      if (modeMissing) console.log(`  wrong mode: expected ${test.expectMode}, got ${payload.replyMode || "?"}`);
      if (actionMissing) console.log(`  missing action: ${test.action}`);
      if (actionAnyMissing) console.log(`  missing one action of: ${test.actionAny.join(", ")}`);
      if (actionTypeMissing) console.log(`  missing action type: ${test.actionType}`);
      if (noActionsFailed) console.log(`  unexpected actions: ${actions.map((a) => a.id).join(", ")}`);
      if (tooShort) console.log("  answer too short");
      if (quality.reasons.length) console.log(`  quality: ${quality.reasons.join("; ")}`);
      if (!ok) failures.push({ test, elapsed, source: payload.source, mode: payload.replyMode, intent: payload.intent, quality, answer, actions });
    } catch (error) {
      failures.push({ test, error: error.message });
      console.log(`FAIL ---- ${test.q}`);
      console.log(`  ${error.message}`);
    }
  }
  const qualityAverage = selected.length ? qualityTotal / selected.length : 0;
  console.log(`\n${selected.length - failures.length}/${selected.length} OK`);
  console.log(`Quality average: ${qualityAverage.toFixed(2)}/2 (${qualityOne} response(s) at 1/2)`);
  if (qualityAverage < MIN_QUALITY_AVG) {
    failures.push({ error: `Quality average ${qualityAverage.toFixed(2)} below ${MIN_QUALITY_AVG}` });
  }
  if (failures.length) {
    console.log(JSON.stringify(failures.slice(0, 12), null, 2));
    process.exitCode = 1;
  }
})();
