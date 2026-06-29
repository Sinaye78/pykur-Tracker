import assert from "node:assert/strict";
import test from "node:test";

import {
  FAMILIAR_CATALOG,
  GELUTIN_BOSS_GAINS,
  resolveFamiliar,
  resolveFamiliarRuntime
} from "../../js/config/familiars.js";
import { createProfile } from "../../js/domain/profiles.js";
import { getProfileProgress, normalizeProgressionState } from "../../js/domain/progression.js";
import { effectiveDungeonGains, setMonsterCount } from "../../js/domain/monsters.js";
import { applyRunDelta, setActiveDungeon, setGelutinBoss, setRunCount, toggleAbraRoom } from "../../js/domain/runs.js";
import { createDefaultState } from "../../js/state/defaults.js";

const ISO_NOW = "2026-06-28T19:00:00.000Z";
const NOW_MS = Date.parse(ISO_NOW);
const dependencies = {
  resolveFamiliar,
  resolveRuntime: resolveFamiliarRuntime,
  gelutinBossGains: GELUTIN_BOSS_GAINS,
  now: () => ISO_NOW,
  nowMs: () => NOW_MS
};

function profileState(familiarId, profileId = `p_${familiarId}`) {
  return createProfile(createDefaultState({ now: ISO_NOW }), { familiarId, name: familiarId }, {
    resolveFamiliar,
    idFactory: () => profileId,
    now: ISO_NOW
  }).state;
}

function independentProgress(data, familiar, runtime) {
  const sources = [...familiar.dungeons.map((dungeon) => dungeon.key), "zone"];
  let total = 0;
  for (const [mobId, monster] of Object.entries(runtime.mobs)) {
    if (!monster.ppNeed || monster.noProgress) continue;
    const count = sources.reduce((sum, source) => sum + (data.mobs[source]?.[mobId] || 0), 0);
    total += Math.floor(count / monster.ppNeed) * Math.max(1, monster.gainValue || 1);
  }
  return Math.min(total, familiar.objectiveMax);
}

test("chaque donjon des 20 familiers applique exactement son bundle de monstres", () => {
  for (const familiar of FAMILIAR_CATALOG) {
    const runtime = resolveFamiliarRuntime(familiar.id);
    assert.ok(runtime, `runtime manquant pour ${familiar.id}`);
    for (const dungeon of familiar.dungeons) {
      const profileId = `p_${familiar.id}`;
      let state = profileState(familiar.id, profileId);
      state = setActiveDungeon(state, profileId, dungeon.key, dependencies);
      if (familiar.id === "abra-kadabra" && dungeon.key === "salleAbrakne") {
        state = toggleAbraRoom(state, profileId, dependencies);
      }
      const before = state.profiles[profileId].data;
      const expectedGains = effectiveDungeonGains(familiar.id, dungeon.key, before, runtime, GELUTIN_BOSS_GAINS);
      const result = applyRunDelta(state, profileId, 1, dependencies);
      const data = result.state.profiles[profileId].data;
      assert.equal(result.applied, 1, `${familiar.id}/${dungeon.key}`);
      assert.equal(data.runs[dungeon.key], 1, `${familiar.id}/${dungeon.key} run`);
      for (const [mobId, count] of Object.entries(expectedGains)) {
        assert.equal(data.mobs[dungeon.key][mobId], count, `${familiar.id}/${dungeon.key}/${mobId}`);
      }
      assert.equal(getProfileProgress(data, familiar, runtime), independentProgress(data, familiar, runtime));
    }
  }
});

test("ajouter puis retirer une run restaure les compteurs", () => {
  let state = profileState("pykur", "p_test");
  const added = applyRunDelta(state, "p_test", 1, dependencies);
  const removed = applyRunDelta(added.state, "p_test", -1, dependencies);
  const data = removed.state.profiles.p_test.data;
  assert.equal(data.runs.morose, 0);
  assert.ok(Object.values(data.mobs.morose).every((value) => value === 0));
  assert.equal(removed.newProgress, 0);
});

test("les limites de runs sont respectées", () => {
  let state = profileState("pykur", "p_limit");
  state = setRunCount(state, "p_limit", "morose", 99999, dependencies);
  assert.equal(state.profiles.p_limit.data.runs.morose, 640);
  const result = applyRunDelta(state, "p_limit", 1, dependencies);
  assert.equal(result.applied, 0);
  assert.equal(result.state, state);
});

test("la salle Abrakne ajoute le parcours à chaque nouvelle entrée puis les Abraknes en boucle", () => {
  let state = profileState("abra-kadabra", "p_abra");
  state = setActiveDungeon(state, "p_abra", "salleAbrakne", dependencies);
  const entered = applyRunDelta(state, "p_abra", 1, dependencies);
  assert.equal(entered.applied, 0);
  assert.equal(entered.specialAction, "abra-room-entered");
  assert.equal(entered.state.profiles.p_abra.data.mobs.zone.abraknyde, 4);
  const loop = applyRunDelta(entered.state, "p_abra", 1, dependencies);
  assert.equal(loop.state.profiles.p_abra.data.runs.salleAbrakne, 1);
  assert.equal(loop.state.profiles.p_abra.data.mobs.salleAbrakne.abrakne, 1);
  state = toggleAbraRoom(loop.state, "p_abra", dependencies);
  state = toggleAbraRoom(state, "p_abra", dependencies);
  assert.equal(state.profiles.p_abra.data.mobs.zone.abraknyde, 8);
});

test("le choix du boss Gelutin adapte les deux parcours Blop", () => {
  let state = profileState("gelutin", "p_gelutin");
  state = setGelutinBoss(state, "p_gelutin", "blopGriotteRoyal", dependencies);
  for (const dungeonKey of ["donjonBlops", "antreBlopMulticolore"]) {
    let scenario = setActiveDungeon(state, "p_gelutin", dungeonKey, dependencies);
    scenario = applyRunDelta(scenario, "p_gelutin", 1, dependencies).state;
    assert.ok(scenario.profiles.p_gelutin.data.mobs[dungeonKey].blopGriotteRoyal >= 1);
  }
});

test("les anciennes runs Miniminotot reconstruisent leurs monstres sans écraser les données connues", () => {
  let state = profileState("miniminotot", "p_mino");
  state.profiles.p_mino.data.runs.labyrintheDuMinotoror = 2;
  const normalized = normalizeProgressionState(state, dependencies).state;
  assert.equal(normalized.profiles.p_mino.data.mobs.labyrintheDuMinotoror.minotoror, 2);
  normalized.profiles.p_mino.data.mobs.labyrintheDuMinotoror.minotoror = 9;
  const preserved = normalizeProgressionState(normalized, dependencies).state;
  assert.equal(preserved.profiles.p_mino.data.mobs.labyrintheDuMinotoror.minotoror, 9);
});

test("les monstres de zone contribuent au bonus et le plafond reste strict", () => {
  const familiar = resolveFamiliar("dragoune-noir");
  const runtime = resolveFamiliarRuntime("dragoune-noir");
  let state = profileState("dragoune-noir", "p_zone");
  let data = state.profiles.p_zone.data;
  data = setMonsterCount(data, familiar, runtime, "zone", "aerotrugoburMalveillant", 5, {
    gelutinBossGains: GELUTIN_BOSS_GAINS
  });
  assert.equal(getProfileProgress(data, familiar, runtime), 1);
  for (const mobId of Object.keys(runtime.mobs)) {
    data = setMonsterCount(data, familiar, runtime, "zone", mobId, 999999, {
      gelutinBossGains: GELUTIN_BOSS_GAINS
    });
  }
  assert.equal(getProfileProgress(data, familiar, runtime), familiar.objectiveMax);
});

test("modifier un nombre de runs reconstruit exactement chaque donjon", () => {
  for (const familiar of FAMILIAR_CATALOG) {
    const runtime = resolveFamiliarRuntime(familiar.id);
    for (const dungeon of familiar.dungeons) {
      const profileId = `p_edit_${familiar.id}`;
      let state = profileState(familiar.id, profileId);
      state = setRunCount(state, profileId, dungeon.key, 3, dependencies);
      const data = state.profiles[profileId].data;
      const gains = effectiveDungeonGains(familiar.id, dungeon.key, data, runtime, GELUTIN_BOSS_GAINS);
      assert.equal(data.runs[dungeon.key], Math.min(3, runtime.runLimits?.[dungeon.key] ?? 3));
      for (const [mobId, count] of Object.entries(gains)) {
        assert.equal(data.mobs[dungeon.key][mobId], data.runs[dungeon.key] * count, `${familiar.id}/${dungeon.key}/${mobId}`);
      }
    }
  }
});

test("une correction manuelle conserve les runs et ne mute pas les données d'origine", () => {
  const familiar = resolveFamiliar("pykur");
  const runtime = resolveFamiliarRuntime("pykur");
  let state = profileState("pykur", "p_manual");
  state = setRunCount(state, "p_manual", "morose", 2, dependencies);
  const original = state.profiles.p_manual.data;
  const updated = setMonsterCount(original, familiar, runtime, "zone", "floribonde", 40, {
    gelutinBossGains: GELUTIN_BOSS_GAINS
  });
  assert.equal(original.mobs.zone.floribonde, 0);
  assert.equal(updated.mobs.zone.floribonde, 40);
  assert.equal(updated.runs.morose, 2);
  assert.equal(getProfileProgress(updated, familiar, runtime), getProfileProgress(original, familiar, runtime) + 1);
});

test("les corrections manuelles rejettent une source ou un monstre inconnu", () => {
  const familiar = resolveFamiliar("pykur");
  const runtime = resolveFamiliarRuntime("pykur");
  const data = profileState("pykur", "p_invalid").profiles.p_invalid.data;
  assert.throws(() => setMonsterCount(data, familiar, runtime, "ailleurs", "floribonde", 1), /Source/);
  assert.throws(() => setMonsterCount(data, familiar, runtime, "zone", "inconnu", 1), /Monstre/);
});
