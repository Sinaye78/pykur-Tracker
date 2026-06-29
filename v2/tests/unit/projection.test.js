import assert from "node:assert/strict";
import test from "node:test";

import {
  FAMILIAR_CATALOG,
  GELUTIN_BOSS_GAINS,
  resolveFamiliar,
  resolveFamiliarRuntime
} from "../../js/config/familiars.js";
import { createProfile } from "../../js/domain/profiles.js";
import {
  projectProfile,
  runsToProgressTarget,
  simulateDungeonRuns,
  simulateProjectionPlan
} from "../../js/domain/projection.js";
import { createDefaultState } from "../../js/state/defaults.js";

const options = { gelutinBossGains: GELUTIN_BOSS_GAINS };

function profileData(familiarId) {
  return createProfile(createDefaultState({ now: "2026-06-29T08:00:00.000Z" }), {
    familiarId,
    name: familiarId
  }, {
    resolveFamiliar,
    idFactory: () => `p_${familiarId}`,
    now: "2026-06-29T08:00:00.000Z"
  }).state.profiles[`p_${familiarId}`].data;
}

test("les projections des 20 familiers atteignent réellement leur prochain palier", () => {
  for (const familiar of FAMILIAR_CATALOG) {
    const runtime = resolveFamiliarRuntime(familiar.id);
    const data = profileData(familiar.id);
    const projection = projectProfile(data, familiar, runtime, options);
    assert.equal(projection.progress, 0, familiar.id);
    for (const dungeon of projection.dungeons) {
      if (dungeon.nextRuns === null) continue;
      const reached = simulateDungeonRuns(data, familiar, runtime, dungeon.key, dungeon.nextRuns, options);
      assert.ok(reached.progress >= projection.nextTarget, `${familiar.id}/${dungeon.key}`);
      if (dungeon.nextRuns > 0) {
        const previous = simulateDungeonRuns(data, familiar, runtime, dungeon.key, dungeon.nextRuns - 1, options);
        assert.ok(previous.progress < projection.nextTarget, `${familiar.id}/${dungeon.key} minimal`);
      }
      assert.equal(dungeon.nextGain, reached.progress);
    }
  }
});

test("la projection et le simulateur ne modifient jamais le profil", () => {
  for (const familiar of FAMILIAR_CATALOG) {
    const runtime = resolveFamiliarRuntime(familiar.id);
    const data = profileData(familiar.id);
    const before = JSON.stringify(data);
    projectProfile(data, familiar, runtime, options);
    simulateProjectionPlan(data, familiar, runtime, Object.fromEntries(familiar.dungeons.map((dungeon) => [dungeon.key, 10])), options);
    assert.equal(JSON.stringify(data), before, familiar.id);
  }
});

test("le simulateur borne les ajouts selon la capacité restante", () => {
  const familiar = resolveFamiliar("pykur");
  const runtime = resolveFamiliarRuntime("pykur");
  const data = profileData("pykur");
  data.runs.morose = runtime.runLimits.morose - 2;
  const simulation = simulateProjectionPlan(data, familiar, runtime, { morose: 99999 }, options);
  assert.equal(simulation.appliedRuns.morose, 2);
  assert.equal(simulation.appliedRuns.tynril, 0);
});

test("les temps projetés utilisent les moyennes du profil", () => {
  const familiar = resolveFamiliar("pykur");
  const runtime = resolveFamiliarRuntime("pykur");
  const data = profileData("pykur");
  data.stats.avgMorose = 120;
  const projection = projectProfile(data, familiar, runtime, options);
  const morose = projection.dungeons.find((dungeon) => dungeon.key === "morose");
  assert.equal(morose.averageSeconds, 120);
  assert.equal(morose.nextSeconds, morose.nextRuns * 120);
});

test("un objectif déjà atteint retourne zéro run restant", () => {
  const familiar = resolveFamiliar("pykur");
  const runtime = resolveFamiliarRuntime("pykur");
  const data = profileData("pykur");
  for (const mobId of Object.keys(runtime.mobs)) data.mobs.zone[mobId] = 999999;
  const projection = projectProfile(data, familiar, runtime, options);
  assert.equal(projection.complete, true);
  assert.ok(projection.dungeons.every((dungeon) => dungeon.nextRuns === 0 && dungeon.fullRuns === 0));
  assert.equal(runsToProgressTarget(data, familiar, runtime, "morose", familiar.objectiveMax, options), 0);
});
