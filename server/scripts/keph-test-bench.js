#!/usr/bin/env node
const BASE_URL = process.env.KEPH_TEST_BASE_URL || "https://familier-tracker.fr";
const MAX_MS = Number(process.env.KEPH_MAX_MS || 2500);
const REQUEST_TIMEOUT_MS = Number(process.env.KEPH_TEST_TIMEOUT_MS || 9000);
const LIMIT = Number(process.env.KEPH_TEST_LIMIT || 0);

const context = {
  currentCandidate: "Kinza",
  activeSection: "show",
  configOpen: true,
  availableLots: 8,
  soundMuted: false,
  queueRemaining: 4,
  stage: "ready",
  lots: [
    { name: "Dofus Cawotte", enabled: true, stockEnabled: true, stock: 3, available: true, weight: 5 },
    { name: "Bourse 200.000k", enabled: true, stockEnabled: false, stock: 0, available: true, weight: 10 }
  ],
  dialogues: [
    { id: "d1", index: 1, trigger: "presentation", speaker: "charlie", kind: "dialogue", text: "Bienvenue", emote: "smile", fx: "confetti", audioId: "snd1" }
  ],
  audioAssets: [{ id: "snd1", name: "applause.mp3" }],
  settingsSnapshot: { showEnabled: true, defaultDialoguesEnabled: true, autoNextShow: false }
};

const cases = [
  { q: "coucou la forme ?", must: ["salut"], noActions: true },
  { q: "tu t appelles comment ?", must: ["keph", "assistant"], noActions: true },
  { q: "quel est l ocean le plus grand au monde ?", must: ["pacifique"], noActions: true },
  { q: "qui a créé Harry Potter ?", must: ["rowling"], noActions: true },
  { q: "a quoi sert le site ?", must: ["tirage", "live"], action: "open_prepare" },
  { q: "par quoi je dois commencer avant un live ?", must: ["preparer", "lots"], action: "open_prepare" },
  { q: "a quoi sert le bouton lancer ?", must: ["vrai tirage", "stock"], action: "open_prepare" },
  { q: "comment lancer la roue ?", must: ["participant", "lancer"], action: "open_prepare" },
  { q: "a quoi sert stop ?", must: ["arreter", "roue"], action: "open_prepare" },
  { q: "pourquoi stop est grisé ?", must: ["tirage", "cours"], action: "open_prepare" },
  { q: "a quoi sert suivant ?", must: ["prochain", "participant"], action: "open_prepare" },
  { q: "tu peux faire un tirage test ?", must: ["tirage test", "sans"], actionType: "start_test_draw" },
  { q: "a quoi sert tirage test ?", must: ["sans", "stock", "historique"], action: "open_prepare" },
  { q: "a quoi sert la regie ?", must: ["controle", "live"], action: "open_prepare" },
  { q: "a quoi sert la configuration ?", must: ["preparer", "lots"], action: "open_prepare" },
  { q: "a quoi sert le studio ?", must: ["roulette", "scenarios"], actionAny: ["open_wheel_studio_lots", "open_scenario_studio"] },
  { q: "a quoi sert le studio de scenarios ?", must: ["repliques", "charlie", "victoria"], action: "open_scenario_studio" },
  { q: "a quoi sert le studio de la roulette ?", must: ["lots", "poids", "stocks"], action: "open_wheel_studio_lots" },
  { q: "on peut modifier le poids d une case de la roue ?", must: ["poids", "chance"], action: "open_wheel_studio_lots" },
  { q: "pourquoi un lot devient indisponible ?", must: ["stock", "zero"], action: "open_wheel_studio_lots" },
  { q: "comment regler les stocks des lots ?", must: ["stock", "lot"], action: "open_wheel_studio_lots" },
  { q: "comment modifier l image d une case ?", must: ["design", "png"], action: "open_wheel_studio_design" },
  { q: "comment modifier la taille du texte des lots de la roue ?", must: ["design", "taille"], action: "open_wheel_studio_design" },
  { q: "comment créer un dialogue ?", must: ["studio", "replique"], action: "open_scenario_studio" },
  { q: "comment je met un dialogue ?", must: ["studio", "replique"], action: "open_scenario_studio" },
  { q: "comment créer un dialogue pour le jingle ?", must: ["jingle", "replique"], action: "open_scenario_studio", forbidden: ["section sons"] },
  { q: "je peux modifier les dialogues de presenter les candidats ?", must: ["presentation", "repliques"], action: "open_scenario_studio" },
  { q: "dans les dialogues ça sert à quoi de cibler un candidat ?", must: ["ciblage", "candidat"], action: "open_scenario_studio" },
  { q: "a quoi sert dialogue parlé ou indication scénique ?", must: ["bulle", "action"], action: "open_scenario_studio" },
  { q: "comment ajouter un bruitage mp3 sur une replique ?", must: ["bruitage", "mp3"], action: "open_scenario_studio" },
  { q: "on peut mettre du son sur les dialogues ?", must: ["bruitage", "replique"], action: "open_scenario_studio" },
  { q: "a quoi ça sert le jingle ?", must: ["jingle", "ouverture"], actionAny: ["open_scenario_studio", "open_audio"], forbidden: ["mute global"] },
  { q: "liste les effets speciaux", must: ["confettis", "flash"], action: "open_scenario_studio" },
  { q: "c est quoi les effets spéciaux ?", must: ["animations", "scene"], action: "open_scenario_studio" },
  { q: "comment rendre le show plus vivant ?", must: ["dialogues", "emote", "effet"], action: "open_scenario_studio" },
  { q: "a quoi sert Charlie Show ?", must: ["interventions", "charlie"], action: "open_scenario_studio" },
  { q: "a quoi sert dialogues inclus ?", must: ["defaut"], action: "open_scenario_studio" },
  { q: "a quoi sert l option cochable annoncer le candidat suivant ?", must: ["annonce", "tirage"], action: "open_scenario_studio" },
  { q: "qui est Victoria ?", must: ["victoria", "personnage"], action: "open_scenario_studio" },
  { q: "qui est Charlie ?", must: ["charlie", "personnage"], action: "open_scenario_studio" },
  { q: "comment faire une scene Discord propre ?", must: ["discord", "capture"], actionAny: ["highlight_discord", "detach_control"] },
  { q: "pourquoi detacher la regie ?", must: ["fenetre", "capture"], action: "detach_control" },
  { q: "a quoi sert simuler un passage ?", must: ["sans", "stock", "historique"], action: "highlight_rehearsal" },
  { q: "a quoi sert la checklist pre live ?", must: ["verifie", "participants"], action: "highlight_rehearsal" },
  { q: "pourquoi le son est muet ?", must: ["son"], action: "open_audio" },
  { q: "comment regler le volume de la roulette ?", must: ["volume", "roulette"], action: "open_audio" },
  { q: "ou exporter le profil ?", must: ["export", "profil"], action: "open_data" },
  { q: "a quoi sert l historique ?", must: ["tirages", "gagnant"], action: "open_data" },
  { q: "comment corriger le dernier tirage ?", must: ["corriger", "dernier"], action: "open_data" },
  { q: "a quoi sert les likes dislikes de Keph ?", must: ["dislike", "documentation"] },
  { q: "comment activer le mode dragon laser dans le site ?", must: ["je ne vois pas", "documentation"], source: "verified", noActions: false },
  { q: "ça se trouve ou ?", mustAny: ["precise", "quelle fonction", "quel bouton"], noActions: true },
  { q: "tu peux ajouter le candidat Capy a la fin de la liste", must: ["capy"], actionType: "add_participant" },
  { q: "modifie le lot Dofus Cawotte et mets son poids a 10", must: ["poids", "10"], actionType: "update_lot_rate" }
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
      const missing = (test.must || []).filter((term) => !hasTerm(answer, term));
      const missingAny = test.mustAny?.length && !test.mustAny.some((term) => hasTerm(answer, term)) ? test.mustAny : [];
      const forbidden = (test.forbidden || []).filter((term) => hasTerm(answer, term));
      const actionMissing = test.action && !actions.some((action) => action.id === test.action);
      const actionAnyMissing = test.actionAny?.length && !actions.some((action) => test.actionAny.includes(action.id));
      const actionTypeMissing = test.actionType && !actions.some((action) => action.type === test.actionType);
      const noActionsFailed = test.noActions && actions.length > 0;
      const sourceFailed = test.source && payload.source !== test.source;
      const slow = elapsed > MAX_MS;
      const ok = !missing.length && !missingAny.length && !forbidden.length && !actionMissing && !actionAnyMissing && !actionTypeMissing && !noActionsFailed && !sourceFailed && !slow;
      console.log(`${ok ? "OK" : "FAIL"} ${elapsed}ms [${payload.source || "?"}/${payload.intent || "?"}] ${test.q}`);
      if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
      if (missingAny.length) console.log(`  missing any of: ${missingAny.join(", ")}`);
      if (forbidden.length) console.log(`  forbidden: ${forbidden.join(", ")}`);
      if (actionMissing) console.log(`  missing action: ${test.action}`);
      if (actionAnyMissing) console.log(`  missing one action of: ${test.actionAny.join(", ")}`);
      if (actionTypeMissing) console.log(`  missing action type: ${test.actionType}`);
      if (noActionsFailed) console.log(`  unexpected actions: ${actions.map((a) => a.id).join(", ")}`);
      if (sourceFailed) console.log(`  expected source: ${test.source}`);
      if (slow) console.log(`  slow: ${elapsed}ms > ${MAX_MS}ms`);
      if (!ok) failures.push({ test, elapsed, source: payload.source, intent: payload.intent, answer, actions });
    } catch (error) {
      failures.push({ test, error: error.message });
      console.log(`FAIL ---- ${test.q}`);
      console.log(`  ${error.message}`);
    }
  }
  console.log(`\n${selected.length - failures.length}/${selected.length} OK`);
  if (failures.length) {
    console.log(JSON.stringify(failures.slice(0, 10), null, 2));
    process.exitCode = 1;
  }
})();
