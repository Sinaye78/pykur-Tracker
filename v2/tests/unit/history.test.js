import assert from "node:assert/strict";
import test from "node:test";

import { resolveFamiliar } from "../../js/config/familiars.js";
import { createProfile } from "../../js/domain/profiles.js";
import {
  appendHistoryEntry,
  clearHistory,
  compactHistoryEntries,
  groupHistoryByDay,
  inferHistoryKind,
  selectHistoryEntries,
  summarizeHistory
} from "../../js/domain/history.js";
import { createDefaultState } from "../../js/state/defaults.js";

const NOW = "2026-06-29T18:30:00.000Z";

function stateWithProfile(id = "history-profile") {
  return createProfile(createDefaultState({ now: NOW }), { familiarId: "pykur", name: "Historique" }, {
    resolveFamiliar,
    idFactory: () => id,
    now: NOW
  }).state;
}

test("ajouter une entrée conserve l'état d'origine et structure les données", () => {
  const original = stateWithProfile();
  const result = appendHistoryEntry(original, "history-profile", { message: "+1 donjon Morose.", kind: "progression" }, {
    now: NOW,
    idFactory: () => "entry-1"
  });
  assert.equal(original.profiles["history-profile"].data.activity.length, 0);
  assert.equal(result.entry.id, "entry-1");
  assert.equal(result.entry.kind, "progression");
  assert.equal(result.state.profiles["history-profile"].data.activity.length, 1);
});

test("la limite d'historique évite une croissance sans borne", () => {
  let state = stateWithProfile();
  for (let index = 0; index < 25; index += 1) {
    state = appendHistoryEntry(state, "history-profile", { message: `Action ${index}` }, {
      now: new Date(Date.parse(NOW) + index * 1000).toISOString(),
      idFactory: () => `entry-${index}`,
      limit: 20
    }).state;
  }
  assert.equal(state.profiles["history-profile"].data.activity.length, 20);
  assert.equal(state.profiles["history-profile"].data.activity[0].message, "Action 24");
});

test("les anciennes entrées V1 restent filtrables", () => {
  const data = { activity: [
    { message: "Chrono démarré", type: "info", date: NOW },
    { message: "+1 donjon Morose", type: "info", date: "2026-06-29T18:31:00.000Z" }
  ] };
  assert.equal(selectHistoryEntries(data, { kind: "chrono" }).length, 1);
  assert.equal(selectHistoryEntries(data, { kind: "progression" }).length, 1);
  assert.equal(inferHistoryKind("Profil principal renommé"), "profile");
});

test("recherche, catégorie et donjon peuvent être combinés", () => {
  const data = { activity: [
    { id: "a", message: "+1 donjon Morose", kind: "progression", farmKey: "morose", date: NOW },
    { id: "b", message: "+1 donjon Tynril", kind: "progression", farmKey: "tynril", date: NOW },
    { id: "c", message: "Session terminée", kind: "chrono", date: NOW }
  ] };
  const result = selectHistoryEntries(data, { kind: "progression", query: "morose", farmKey: "morose" });
  assert.deepEqual(result.map((entry) => entry.id), ["a"]);
});

test("les actions identiques de la même minute sont compactées", () => {
  const entries = compactHistoryEntries([
    { id: "a", message: "+1 donjon Morose", kind: "progression", date: "2026-06-29T18:30:05.000Z" },
    { id: "b", message: "+1 donjon Morose", kind: "progression", date: "2026-06-29T18:30:45.000Z" },
    { id: "c", message: "+1 donjon Morose", kind: "progression", date: "2026-06-29T18:31:00.000Z" }
  ]);
  assert.equal(entries.length, 2);
  assert.equal(entries[1].count, 2);
});

test("le regroupement par jour trie du plus récent au plus ancien", () => {
  const groups = groupHistoryByDay(compactHistoryEntries([
    { message: "Ancienne", date: "2026-06-28T10:00:00.000Z" },
    { message: "Récente", date: "2026-06-29T10:00:00.000Z" }
  ]));
  assert.deepEqual(groups.map((group) => group.date), ["2026-06-29", "2026-06-28"]);
});

test("le résumé sépare les actions du jour et les catégories principales", () => {
  const data = { activity: [
    { message: "+1 donjon", kind: "progression", date: NOW },
    { message: "Session terminée", kind: "chrono", date: NOW },
    { message: "Hier", kind: "system", date: "2026-06-28T18:00:00.000Z" }
  ] };
  assert.deepEqual(summarizeHistory(data, { today: "2026-06-29" }), { total: 3, today: 2, progression: 1, chrono: 1 });
});

test("effacer l'historique reste isolé au profil ciblé", () => {
  let state = stateWithProfile("p1");
  state = createProfile(state, { familiarId: "pykur", name: "Deux" }, { resolveFamiliar, idFactory: () => "p2", now: NOW }).state;
  state = appendHistoryEntry(state, "p1", { message: "P1" }, { now: NOW }).state;
  state = appendHistoryEntry(state, "p2", { message: "P2" }, { now: NOW }).state;
  state = clearHistory(state, "p1", { now: NOW });
  assert.equal(state.profiles.p1.data.activity.length, 0);
  assert.equal(state.profiles.p2.data.activity.length, 1);
});
