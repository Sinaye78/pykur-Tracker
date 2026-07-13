#!/usr/bin/env node
const BASE_URL = process.env.KEPH_TEST_BASE_URL || "https://familier-tracker.fr";
const MAX_FAST_MS = Number(process.env.KEPH_MAX_FAST_MS || 900);

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
  ["coucou la forme ?", ["salut", "aider"]],
  ["salut ca va ?", ["salut", "regie"]],
  ["tu t appelles comment ?", ["keph", "assistant"]],
  ["quel est l ocean le plus grand au monde ?", ["pacifique"]],
  ["a quoi sert le site ?", ["tirage", "live", "regie"]],
  ["a quoi sert le bouton lancer ?", ["vrai tirage", "stock", "historique"]],
  ["a quoi sert stop ?", ["arrete", "roue"]],
  ["a quoi sert suivant ?", ["prochain", "participant"]],
  ["a quoi sert tirage test ?", ["sans", "stock", "historique"]],
  ["a quoi sert la regie ?", ["controle", "live"]],
  ["a quoi sert la configuration ?", ["preparer", "participants", "lots"]],
  ["a quoi sert le studio ?", ["studio", "roulette", "scenarios"]],
  ["a quoi sert le studio de scenarios ?", ["repliques", "charlie", "victoria"]],
  ["a quoi sert le studio de la roulette ?", ["lots", "poids", "stocks"]],
  ["par quoi je dois commencer avant un live ?", ["preparer", "lots", "checklist"]],
  ["comment faire une scene Discord propre ?", ["discord", "regie", "capture"]],
  ["pourquoi detacher la regie ?", ["fenetre", "discord", "obs"]],
  ["on peut modifier le poids d une case de la roue ?", ["poids", "chances"]],
  ["pourquoi un lot devient indisponible ?", ["stock", "zero", "indisponible"]],
  ["comment regler les stocks des lots ?", ["stock", "lots"]],
  ["comment desactiver un lot ?", ["desactive", "lot"]],
  ["a quoi sert le poids d un lot ?", ["chance", "relative"]],
  ["comment modifier l image d une case ?", ["design", "png"]],
  ["comment changer le texte d une case ?", ["design", "texte"]],
  ["comment ajouter un dialogue ?", ["studio", "replique"]],
  ["je peux modifier les dialogues de presenter les candidats ?", ["presentation", "repliques"]],
  ["qui est Victoria ?", ["victoria", "personnage"]],
  ["qui est Charlie ?", ["charlie"]],
  ["a quoi sert dialogue parle ?", ["bulle", "parole"]],
  ["a quoi sert indication scenique ?", ["action", "scene"]],
  ["a quoi sert le ciblage d une replique ?", ["ciblage", "candidat"]],
  ["comment ajouter un bruitage mp3 sur une replique ?", ["bruitage", "mp3", "importer"]],
  ["on peut mettre du son sur les dialogues ?", ["bruitage", "replique"]],
  ["liste les effets speciaux", ["confettis", "flash"]],
  ["comment rendre le show plus vivant ?", ["dialogues", "emote", "effet"]],
  ["a quoi sert Charlie Show ?", ["interventions", "charlie"]],
  ["a quoi sert dialogues inclus ?", ["defaut", "personnalise"]],
  ["a quoi sert annoncer automatiquement le candidat suivant ?", ["annonce", "tirage"]],
  ["a quoi sert jingle debut ?", ["ouverture", "show"]],
  ["a quoi sert scene finale ?", ["cloture", "finale"]],
  ["a quoi sert simuler un passage ?", ["sans", "stocks", "historique"]],
  ["a quoi sert la checklist pre live ?", ["verifie", "participants"]],
  ["pourquoi le son est muet ?", ["son"]],
  ["comment regler le volume de la roulette ?", ["volume", "roulette"]],
  ["ou exporter le profil ?", ["export", "profil"]],
  ["a quoi sert l historique ?", ["tirages", "gagnant"]],
  ["comment corriger le dernier tirage ?", ["corriger", "dernier"]],
  ["a quoi sert les likes dislikes de Keph ?", ["dislike", "documentation"]],
  ["tu peux ajouter le candidat Capy a la fin de la liste", ["capy"]],
  ["modifie le lot Dofus Cawotte et mets son poids a 10", ["confirmation", "poids"]]
];

const normalize = (value) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

async function ask(question) {
  const started = Date.now();
  const response = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/charlie-keph/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: question, context })
  });
  const elapsed = Date.now() - started;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { elapsed, payload: await response.json() };
}

(async () => {
  const failures = [];
  for (const [question, expected] of cases) {
    try {
      const { elapsed, payload } = await ask(question);
      const answer = normalize(payload.answer);
      const missing = expected.filter((term) => !answer.includes(normalize(term)));
      const slow = payload.source !== "ollama" && elapsed > MAX_FAST_MS;
      const ok = !missing.length && !slow;
      console.log(`${ok ? "OK" : "FAIL"} ${elapsed}ms [${payload.source || "?"}/${payload.intent || "?"}] ${question}`);
      if (missing.length) console.log(`  missing: ${missing.join(", ")}`);
      if (slow) console.log(`  slow verified answer: ${elapsed}ms`);
      if (!ok) failures.push({ question, missing, elapsed, source: payload.source, intent: payload.intent, answer: payload.answer });
    } catch (error) {
      failures.push({ question, error: error.message });
      console.log(`FAIL ---- ${question}`);
      console.log(`  ${error.message}`);
    }
  }
  console.log(`\n${cases.length - failures.length}/${cases.length} OK`);
  if (failures.length) {
    console.log(JSON.stringify(failures.slice(0, 12), null, 2));
    process.exitCode = 1;
  }
})();
