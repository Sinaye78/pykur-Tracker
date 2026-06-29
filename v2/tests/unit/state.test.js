import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createDefaultProfileData, createDefaultState } from "../../js/state/defaults.js";
import { migrateState } from "../../js/state/migrations.js";
import {
  selectAchievements,
  selectActiveProfile,
  selectGallery,
  selectNeedsFamiliarChoice,
  selectProfileCount,
  selectSettings
} from "../../js/state/selectors.js";
import { assertStateShape, serializeState } from "../../js/state/schema.js";
import { createStateStore } from "../../js/state/store.js";

const FIXED_NOW = "2026-06-28T12:00:00.000Z";
const fixtureUrl = new URL("../fixtures/legacy-state.json", import.meta.url);
const legacyState = JSON.parse(await readFile(fixtureUrl, "utf8"));

const definitions = {
  pykur: { id: "pykur", dungeons: [{ key: "morose", defaultAverage: 125 }, { key: "tynril", defaultAverage: 600 }] },
  "abra-kadabra": {
    id: "abra-kadabra",
    dungeons: [
      { key: "donjonAbraknyde", defaultAverage: 900 },
      { key: "cheneMou", defaultAverage: 1800 },
      { key: "salleAbrakne", defaultAverage: 10 }
    ],
    dofusCooldownMin: 3,
    specialDefaults: { salleAbrakneSetupDone: false, salleAbrakneActive: false, salleAbrakneLastActivity: null }
  }
};
const resolveFamiliar = (id) => definitions[id];

test("l'état par défaut n'impose aucun profil", () => {
  const state = createDefaultState({ now: FIXED_NOW });
  assert.equal(state.active, null);
  assert.equal(Object.keys(state.profiles).length, 0);
  assert.equal(state.needsFamiliarChoice, true);
  assert.deepEqual(assertStateShape(state), []);
});

test("les défauts d'un familier suivent ses donjons", () => {
  const data = createDefaultProfileData(definitions["abra-kadabra"], { now: FIXED_NOW });
  assert.deepEqual(Object.keys(data.runs), ["donjonAbraknyde", "cheneMou", "salleAbrakne"]);
  assert.equal(data.stats.avgSalleAbrakne, 10);
  assert.equal(data.dofusDetection.cooldownSeconds, 3);
  assert.equal(data.ui.farm, "donjonAbraknyde");
});

test("une sauvegarde V1 est migrée sans mutation ni perte", () => {
  const source = structuredClone(legacyState);
  const before = structuredClone(source);
  const state = migrateState(source, { resolveFamiliar, now: FIXED_NOW });

  assert.deepEqual(source, before);
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.active, "p_abra");
  assert.equal(state.legacyTopLevel, "conserver");
  assert.equal(state.profiles.p_pykur.data.runs.morose, 12);
  assert.equal(state.profiles.p_pykur.data.legacyProfileField.value, 17);
  assert.equal(state.profiles.p_abra.data.runs.salleAbrakne, 30);
  assert.equal(state.profiles.p_deleted, undefined);
  assert.deepEqual(state.sharedGallery.completedPykurs.map((item) => item.id), ["archive_1", "archive_2"]);
  assert.ok(state.sharedAchievements.unlocked.first_run);
  assert.ok(state.sharedAchievements.unlocked.projection_opened);
  assert.equal(state.sharedAchievements.eggCollected, true);
  assert.deepEqual(assertStateShape(state), []);
});

test("la sérialisation est stable quel que soit l'ordre des clés", () => {
  const a = createDefaultState({ now: FIXED_NOW });
  const b = { ...a, profiles: {}, active: null, schemaVersion: 1 };
  assert.equal(serializeState(a), serializeState(b));
});

test("les sélecteurs respectent les modes de partage", () => {
  const state = migrateState(legacyState, { resolveFamiliar, now: FIXED_NOW });
  assert.equal(selectProfileCount(state), 2);
  assert.equal(selectActiveProfile(state).name, "Abra principal");
  assert.equal(selectNeedsFamiliarChoice(state), false);
  assert.equal(selectSettings(state).animations, false);
  assert.equal(selectGallery(state).completedPykurs.length, 2);
  assert.ok(selectAchievements(state).unlocked.first_run);
});

test("le store notifie sans exposer un état mutable", () => {
  const store = createStateStore(createDefaultState({ now: FIXED_NOW }), { now: FIXED_NOW });
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  store.updateState((draft) => { draft.needsFamiliarChoice = false; });
  unsubscribe();
  assert.equal(store.getState().needsFamiliarChoice, true);
  assert.equal(notifications, 1);
  assert.equal(Object.isFrozen(store.getState()), true);
});
