#!/usr/bin/env node
const BASE_URL = process.env.KEPH_TEST_BASE_URL || "https://familier-tracker.fr";
const REQUEST_TIMEOUT_MS = Number(process.env.KEPH_TEST_TIMEOUT_MS || 12000);
const LIMIT = Number(process.env.KEPH_TEST_LIMIT || 0);

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

const cases = [
  { q: "salut la forme ?", expect: ["salut"], avoid: ["documentation", "dialogue cible"], noActions: true },
  { q: "tu t appelles comment ?", expect: ["keph"], avoid: ["je peux t aider sur la regie"], noActions: true },
  { q: "qui suis-je ?", expectAny: ["je ne peux pas savoir", "candidat actuellement"], noActions: false },
  { q: "qui a cree Harry Potter ?", expect: ["rowling"], noActions: true },
  { q: "il est quelle heure ?", expectAny: ["il est", "heure"], noActions: true },

  { q: "je suis nouveau sur le site, je fais quoi ?", expect: ["preparer", "lots", "simulation"], action: "open_prepare", avoid: ["je ne vois pas"] },
  { q: "a quoi sert le site ?", expect: ["tirage", "live", "discord"], action: "open_prepare" },
  { q: "par quoi je dois commencer avant un live ?", expect: ["preparer", "lots", "simulation"], action: "open_prepare" },
  { q: "ça se trouve ou ?", expectAny: ["quel bouton", "quelle option", "precise"], noActions: true },

  { q: "a quoi sert le bouton lancer ?", expect: ["vrai tirage", "stock", "historique"], action: "open_prepare", avoid: ["charlie roulette sert"] },
  { q: "a quoi sert stop ?", expect: ["arrete", "roue"], action: "open_prepare" },
  { q: "tu peux faire un tirage test ?", expect: ["tirage test", "sans toucher"], actionType: "start_test_draw" },
  { q: "a quoi sert tirage test ?", expect: ["sans", "stock", "historique"], action: "open_prepare" },

  { q: "ça sert à quoi de mettre des participants ?", expect: ["qui passe", "ordre", "lancers"], action: "open_prepare", avoid: ["pour ajouter"] },
  { q: "comment j'ajoute des candidats ?", expect: ["preparer", "pseudo", "charger"], action: "open_prepare" },
  { q: "tu peux ajouter le candidat Capy a la fin de la liste", expect: ["capy"], actionType: "add_participant" },
  { q: "mets tous les candidats a 5 lancers", expect: ["commande", "controlee"], actionType: "command_batch" },

  { q: "salut, tu peux m'aider comment je peux ajouter un lot dans la roue ?", expect: ["studio", "poids", "stock"], action: "open_wheel_studio_lots", noInternalCommands: true },
  { q: "on peut changer les couleurs des cases de la roulette ?", expect: ["couleur", "design"], action: "open_wheel_studio_design" },
  { q: "il y a un nombre théorique de lot maximum dans la roue ?", expectAny: ["8", "12", "lisible"], action: "open_wheel_studio_lots", avoid: ["poids est une chance"] },
  { q: "a quoi sert le poid dans la roue ?", expect: ["chance relative", "20", "10"], action: "open_wheel_studio_lots" },
  { q: "modifie le lot Dofus Cawotte et mets son poids a 10", expect: ["poids", "10"], actionType: "update_lot_rate" },

  { q: "comment créer un dialogue ?", expect: ["studio", "replique", "etape"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "Comment modifier les dialogues de présentation", expect: ["presentation", "modifier", "studio"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "tu sais créer les dialogues toi ?", expect: ["oui", "idees", "confirmer"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "tu ferais quoi comme dialogue pour un jingle drôle, donne moi juste des idées ne créer rien", expect: ["jingle", "idees"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "quand créer un dialogue il y a des boutons Candidat actuel Lot etc ça sert à quoi ?", expect: ["variables", "contexte", "candidat"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "dialogue parlé ou indication scénique ?", expect: ["bulle", "action", "scene"], action: "open_scenario_studio" },
  { q: "c'est quoi un /me ?", expect: ["indication scenique", "action"], action: "open_scenario_studio", avoid: ["discord"] },
  { q: "comment ajouter un bruitage mp3 sur une replique ?", expect: ["bruitage", "mp3", "replique"], action: "open_scenario_studio" },
  { q: "comment mettre des effets spéciaux ?", expect: ["effet", "replique", "studio"], action: "open_scenario_studio", noInternalCommands: true },
  { q: "c'est quoi la liste des effets spéciaux ?", expect: ["confettis", "flash"], action: "open_scenario_studio" },

  { q: "a quoi sert le jingle ?", expect: ["ouverture", "ambiance", "sans lancer la roue"], actionAny: ["open_scenario_studio", "open_audio"] },
  { q: "a quoi sert d'activer le charlie show ?", expect: ["interventions", "charlie", "victoria"], action: "open_scenario_studio" },
  { q: "a quoi ça sert d'activer l'option dialogue inclus", expect: ["defaut", "personnalise"], action: "open_scenario_studio" },
  { q: "a quoi sert l'option cochable annoncer le candidat suivant ?", expect: ["annonce", "apres un tirage"], action: "open_scenario_studio" },

  { q: "Dans profile ça sert à quoi d'importer ?", expect: ["recharger", "configuration", "remplace"], action: "open_data", avoid: ["participants a la file"] },
  { q: "a quoi sert exporter le profil ?", expect: ["fichier", "sauvegarde", "configuration"], action: "open_data" },
  { q: "d'accord, donc si je change d'ordinateur je peux exporter et importer sur le nouveau pc ?", expect: ["oui", "export", "import"], action: "open_data" },
  { q: "a quoi sert l historique ?", expect: ["vrais tirages", "gagnant"], action: "open_data" },
  { q: "que faire si je me trompe de tirage ?", expect: ["corriger", "dernier tirage"], action: "open_data" },

  { q: "comment faire une scene Discord propre ?", expect: ["discord", "capture", "regie"], actionAny: ["highlight_discord", "detach_control"] },
  { q: "pourquoi detacher la regie ?", expect: ["fenetre", "capture"], action: "detach_control" },
  { q: "comment activer le mode dragon laser dans le site ?", expect: ["je ne vois pas", "documentation"] }
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

function hasTerm(answer, term) {
  return normalize(answer).includes(normalize(term));
}

async function ask(question) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/charlie-keph/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: question, context }),
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  const elapsed = Date.now() - started;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { elapsed, payload: await response.json() };
}

(async () => {
  const selected = LIMIT > 0 ? cases.slice(0, LIMIT) : cases;
  const failures = [];
  for (const test of selected) {
    try {
      const { elapsed, payload } = await ask(test.q);
      const answer = payload.answer || "";
      const actions = Array.isArray(payload.actions) ? payload.actions : [];
      const missing = (test.expect || []).filter((term) => !hasTerm(answer, term));
      const missingAny = test.expectAny?.length && !test.expectAny.some((term) => hasTerm(answer, term)) ? test.expectAny : [];
      const forbidden = (test.avoid || []).filter((term) => hasTerm(answer, term));
      const internalCommands = test.noInternalCommands && /(^|\n)\s*\/(?:add_lot|setpoids|setstock|add_dialogue|clear_lots|set_queue|setlance)\b/i.test(answer);
      const actionMissing = test.action && !actions.some((action) => action.id === test.action);
      const actionAnyMissing = test.actionAny?.length && !actions.some((action) => test.actionAny.includes(action.id));
      const actionTypeMissing = test.actionType && !actions.some((action) => action.type === test.actionType);
      const noActionsFailed = test.noActions && actions.length > 0;
      const tooShort = answer.trim().length < 18;
      const ok = !missing.length && !missingAny.length && !forbidden.length && !internalCommands && !actionMissing && !actionAnyMissing && !actionTypeMissing && !noActionsFailed && !tooShort;
      console.log(`${ok ? "OK" : "FAIL"} ${elapsed}ms [${payload.source || "?"}/${payload.intent || "?"}] ${test.q}`);
      if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
      if (missingAny.length) console.log(`  missing any of: ${missingAny.join(", ")}`);
      if (forbidden.length) console.log(`  forbidden: ${forbidden.join(", ")}`);
      if (internalCommands) console.log("  forbidden internal command syntax in help answer");
      if (actionMissing) console.log(`  missing action: ${test.action}`);
      if (actionAnyMissing) console.log(`  missing one action of: ${test.actionAny.join(", ")}`);
      if (actionTypeMissing) console.log(`  missing action type: ${test.actionType}`);
      if (noActionsFailed) console.log(`  unexpected actions: ${actions.map((a) => a.id).join(", ")}`);
      if (tooShort) console.log("  answer too short");
      if (!ok) failures.push({ test, elapsed, source: payload.source, intent: payload.intent, answer, actions });
    } catch (error) {
      failures.push({ test, error: error.message });
      console.log(`FAIL ---- ${test.q}`);
      console.log(`  ${error.message}`);
    }
  }
  console.log(`\n${selected.length - failures.length}/${selected.length} OK`);
  if (failures.length) {
    console.log(JSON.stringify(failures.slice(0, 12), null, 2));
    process.exitCode = 1;
  }
})();
