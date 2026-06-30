import assert from "node:assert/strict";
import test from "node:test";

import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORIES,
  MAIN_ACHIEVEMENT_CATEGORIES,
  SECRET_ACHIEVEMENT_CATEGORIES
} from "../../js/config/achievements.js";
import { GELUTIN_BOSS_GAINS, resolveFamiliar, resolveFamiliarRuntime } from "../../js/config/familiars.js";
import {
  automaticAchievementIds,
  recalculateAchievements,
  resetAchievements,
  unlockAchievements,
  unlockSecretCategories
} from "../../js/domain/achievements.js";
import { createProfile } from "../../js/domain/profiles.js";
import { applyRunDelta } from "../../js/domain/runs.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { createAchievementsController } from "../../js/ui/achievements.js";

const NOW = "2026-06-30T12:00:00.000Z";
const dependencies = { resolveFamiliar, resolveRuntime: resolveFamiliarRuntime, gelutinBossGains: GELUTIN_BOSS_GAINS };

function pykurState() {
  return createProfile(createDefaultState({ now: NOW }), { familiarId: "pykur", name: "Test" }, {
    resolveFamiliar,
    idFactory: () => "p_test",
    now: NOW
  }).state;
}

test("le catalogue V2 conserve les 81 succes et toutes leurs categories", () => {
  assert.equal(Object.keys(ACHIEVEMENTS).length, 81);
  assert.equal(ACHIEVEMENT_CATEGORIES.length, 12);
  assert.equal(MAIN_ACHIEVEMENT_CATEGORIES.length, 9);
});

test("un premier run debloque les succes quantitatifs sans muter la source", () => {
  const source = pykurState();
  const run = applyRunDelta(source, "p_test", 1, dependencies).state;
  const ids = automaticAchievementIds(run, dependencies);
  assert.ok(ids.includes("create_profile"));
  assert.ok(ids.includes("first_run"));
  assert.ok(ids.includes("dungeon_1"));
  assert.equal(source.profiles.p_test.data.runs.morose, 0);
  const result = recalculateAchievements(run, dependencies, { now: NOW });
  assert.ok(result.state.sharedAchievements.unlocked.first_run);
  assert.ok(result.state.sharedAchievements.unlocked.dungeon_1);
});

test("Tracker accompli ignore les categories finales et secretes", () => {
  const state = pykurState();
  const mainIds = Object.entries(ACHIEVEMENTS)
    .filter(([, item]) => MAIN_ACHIEVEMENT_CATEGORIES.includes(item.category))
    .map(([id]) => id);
  const result = unlockAchievements(state, mainIds, { now: NOW });
  assert.ok(result.state.sharedAchievements.unlocked.tracker_absolute);
  assert.equal(result.state.sharedAchievements.unlocked.master_secrets, undefined);
});

test("Le vrai 100 exige le sceau secret et tous les secrets", () => {
  let state = pykurState();
  state.sharedAchievements.eggCollected = true;
  state = unlockSecretCategories(state, { now: NOW });
  const mainIds = Object.entries(ACHIEVEMENTS)
    .filter(([, item]) => MAIN_ACHIEVEMENT_CATEGORIES.includes(item.category))
    .map(([id]) => id);
  const secretIds = Object.entries(ACHIEVEMENTS)
    .filter(([, item]) => SECRET_ACHIEVEMENT_CATEGORIES.includes(item.category))
    .map(([id]) => id);
  const result = unlockAchievements(state, [...mainIds, ...secretIds], { now: NOW });
  assert.ok(result.state.sharedAchievements.unlocked.master_secrets);
  assert.ok(result.state.sharedAchievements.unlocked.true_100);
});

test("le reset conserve l'oeuf et pose des tombstones", () => {
  let state = pykurState();
  state.sharedAchievements.eggCollected = true;
  state = unlockAchievements(state, ["create_profile", "first_run"], { now: NOW }).state;
  const reset = resetAchievements(state, { now: "2026-06-30T13:00:00.000Z" });
  assert.equal(reset.sharedAchievements.eggCollected, true);
  assert.deepEqual(reset.sharedAchievements.unlocked, {});
  assert.ok(reset.sharedAchievements.removedUnlocked.create_profile);
  assert.ok(reset.sharedAchievements.removedUnlocked.first_run);
});

test("un recalcul automatique ne restaure pas un succes retire", () => {
  let state = pykurState();
  state = unlockAchievements(state, ["create_profile"], { now: NOW }).state;
  state = resetAchievements(state, { now: NOW });
  const result = recalculateAchievements(state, dependencies, { now: NOW });
  assert.equal(result.state.sharedAchievements.unlocked.create_profile, undefined);
  assert.ok(result.state.sharedAchievements.removedUnlocked.create_profile);
});

test("une nouvelle run permet de regagner les succes retires", () => {
  let state = pykurState();
  state = unlockAchievements(state, ["first_run", "dungeon_1"], { now: NOW }).state;
  state = resetAchievements(state, { now: NOW });
  state = applyRunDelta(state, "p_test", 1, dependencies).state;
  const result = recalculateAchievements(state, dependencies, { now: "2026-06-30T12:01:00.000Z", allowRemoved: true });
  assert.ok(result.state.sharedAchievements.unlocked.first_run);
  assert.ok(result.state.sharedAchievements.unlocked.dungeon_1);
});

test("le controleur transmet l'autorisation de regagner un succes", () => {
  let current = pykurState();
  current = unlockAchievements(current, ["first_run", "dungeon_1"], { now: NOW }).state;
  current = resetAchievements(current, { now: NOW });
  current = applyRunDelta(current, "p_test", 1, dependencies).state;
  const listeners = new Set();
  const store = {
    getState: () => current,
    replaceState(next) { current = next; listeners.forEach((listener) => listener()); },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); }
  };
  const previousDocument = globalThis.document;
  globalThis.document = { querySelector: () => null };
  try {
    const controller = createAchievementsController({
      store,
      persistence: { save: () => ({ ok: true }) },
      modal: {},
      resolveFamiliar,
      resolveRuntime: resolveFamiliarRuntime
    });
    controller.evaluate({ allowRemoved: true });
    assert.ok(current.sharedAchievements.unlocked.first_run);
    assert.ok(current.sharedAchievements.unlocked.dungeon_1);
    controller.destroy();
  } finally {
    globalThis.document = previousDocument;
  }
});
