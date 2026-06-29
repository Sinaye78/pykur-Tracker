import assert from "node:assert/strict";
import test from "node:test";

import { resolveFamiliar, resolveFamiliarRuntime } from "../../js/config/familiars.js";
import { markChronoRun, startChrono } from "../../js/domain/chrono.js";
import { createProfile } from "../../js/domain/profiles.js";
import { applyRunDelta } from "../../js/domain/runs.js";
import { buildProfileStatistics, recordDailyRun } from "../../js/domain/stats.js";
import { createDefaultState } from "../../js/state/defaults.js";

const DAY = "2026-06-29";
const BASE = Date.parse(`${DAY}T10:00:00.000Z`);
const dependencies = { resolveFamiliar, resolveRuntime: resolveFamiliarRuntime, gelutinBossGains: {} };

function profileState(id = "stats-profile") {
  return createProfile(createDefaultState({ now: new Date(BASE).toISOString() }), { familiarId: "pykur", name: "Stats" }, {
    resolveFamiliar,
    idFactory: () => id,
    now: new Date(BASE).toISOString()
  }).state;
}

function statistics(state, id = "stats-profile", today = DAY) {
  const data = state.profiles[id].data;
  const familiar = resolveFamiliar(data.familiarId);
  const runtime = resolveFamiliarRuntime(data.familiarId);
  return buildProfileStatistics(data, familiar, runtime, { today });
}

test("les totaux de runs et leurs répartitions sont dérivés du profil", () => {
  let state = profileState();
  state = applyRunDelta(state, "stats-profile", 1, dependencies).state;
  state = applyRunDelta(state, "stats-profile", 1, dependencies).state;
  state.profiles["stats-profile"].data.ui.farm = "tynril";
  state = applyRunDelta(state, "stats-profile", 1, dependencies).state;
  const stats = statistics(state);
  assert.equal(stats.totalRuns, 3);
  assert.deepEqual(stats.dungeons.map((item) => [item.key, item.runs, item.runShare]), [["morose", 2, 67], ["tynril", 1, 33]]);
});

test("un run quotidien enregistre le donjon et le gain sans muter l'original", () => {
  const original = profileState();
  const state = recordDailyRun(original, "stats-profile", "morose", 1, 3, 5, { dayKey: DAY, now: BASE });
  assert.equal(original.profiles["stats-profile"].data.stats.days[DAY], undefined);
  assert.equal(state.profiles["stats-profile"].data.stats.days[DAY].morose, 1);
  assert.equal(state.profiles["stats-profile"].data.stats.days[DAY].pp, 2);
});

test("retirer un run ne rend jamais les statistiques quotidiennes négatives", () => {
  let state = profileState();
  state = recordDailyRun(state, "stats-profile", "morose", 1, 0, 2, { dayKey: DAY, now: BASE });
  state = recordDailyRun(state, "stats-profile", "morose", -2, 2, 0, { dayKey: DAY, now: BASE + 1000 });
  const day = state.profiles["stats-profile"].data.stats.days[DAY];
  assert.equal(day.morose, 0);
  assert.equal(day.pp, 0);
});

test("les séries, la moyenne et la meilleure journée respectent les jours actifs", () => {
  const state = profileState();
  state.profiles["stats-profile"].data.stats.days = {
    "2026-06-26": { morose: 1 },
    "2026-06-27": { morose: 2 },
    "2026-06-28": { morose: 3 },
    "2026-06-29": { morose: 5 }
  };
  const stats = statistics(state);
  assert.equal(stats.activity.currentStreak, 4);
  assert.equal(stats.activity.bestStreak, 4);
  assert.equal(stats.activity.averageRunsPerActiveDay, 2.75);
  assert.equal(stats.activity.bestDay.key, DAY);
});

test("une interruption sépare correctement les séries", () => {
  const state = profileState();
  state.profiles["stats-profile"].data.stats.days = {
    "2026-06-20": { morose: 1 },
    "2026-06-21": { morose: 1 },
    "2026-06-28": { morose: 1 },
    "2026-06-29": { morose: 1 }
  };
  const stats = statistics(state);
  assert.equal(stats.activity.currentStreak, 2);
  assert.equal(stats.activity.bestStreak, 2);
});

test("les contributions par source et le total de monstres restent cohérents", () => {
  const state = profileState();
  state.profiles["stats-profile"].data.mobs.morose.floribonde = 40;
  state.profiles["stats-profile"].data.mobs.zone.floribonde = 40;
  const stats = statistics(state);
  assert.equal(stats.contributions.morose > 0, true);
  assert.equal(stats.contributions.zone, 1);
  assert.equal(stats.totalMonsterCount > 40, true);
});

test("les meilleurs temps et moyennes sont calculés par donjon", () => {
  let state = profileState();
  state = startChrono(state, "stats-profile", { nowMs: BASE });
  state = markChronoRun(state, "stats-profile", "morose", { nowMs: BASE + 120_000, farmLabel: "Morose" }).state;
  state = markChronoRun(state, "stats-profile", "morose", { nowMs: BASE + 300_000, farmLabel: "Morose" }).state;
  const stats = statistics(state);
  const morose = stats.dungeons.find((item) => item.key === "morose");
  assert.equal(morose.markCount, 2);
  assert.equal(morose.bestTime, 120);
  assert.equal(morose.averageTime, 150);
  assert.equal(stats.timing.markCount, 2);
});

test("le sélecteur statistique ne modifie jamais les données", () => {
  const state = profileState();
  const before = JSON.stringify(state.profiles["stats-profile"].data);
  statistics(state);
  assert.equal(JSON.stringify(state.profiles["stats-profile"].data), before);
});
