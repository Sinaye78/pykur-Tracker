import assert from "node:assert/strict";
import test from "node:test";

import {
  ChronoOperationError,
  clearChronoMarks,
  finishChrono,
  formatChrono,
  getChronoSeconds,
  getChronoSplitSeconds,
  getChronoStats,
  markChronoRun,
  pauseChrono,
  removeChronoMark,
  resetChrono,
  startChrono
} from "../../js/domain/chrono.js";
import { resolveFamiliar } from "../../js/config/familiars.js";
import { createProfile } from "../../js/domain/profiles.js";
import { createDefaultState } from "../../js/state/defaults.js";

const BASE_MS = Date.parse("2026-06-29T12:00:00.000Z");

function profileState(id = "p_chrono") {
  return createProfile(createDefaultState({ now: new Date(BASE_MS).toISOString() }), {
    familiarId: "pykur",
    name: "Chrono"
  }, {
    resolveFamiliar,
    idFactory: () => id,
    now: new Date(BASE_MS).toISOString()
  }).state;
}

test("le chrono démarre, se met en pause et reprend sans perdre le temps", () => {
  let state = profileState();
  const original = state;
  state = startChrono(state, "p_chrono", { nowMs: BASE_MS });
  assert.notEqual(state, original);
  assert.equal(original.profiles.p_chrono.data.chrono.running, false);
  assert.equal(getChronoSeconds(state.profiles.p_chrono.data.chrono, BASE_MS + 12_900), 12);

  state = pauseChrono(state, "p_chrono", { nowMs: BASE_MS + 12_900 });
  assert.equal(state.profiles.p_chrono.data.chrono.seconds, 12);
  assert.equal(state.profiles.p_chrono.data.chrono.running, false);
  assert.equal(getChronoSeconds(state.profiles.p_chrono.data.chrono, BASE_MS + 99_000), 12);

  state = startChrono(state, "p_chrono", { nowMs: BASE_MS + 20_000 });
  assert.equal(getChronoSeconds(state.profiles.p_chrono.data.chrono, BASE_MS + 25_500), 17);
});

test("un chrono actif reprend correctement après un rechargement simulé", () => {
  const state = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  const reloaded = JSON.parse(JSON.stringify(state));
  assert.equal(getChronoSeconds(reloaded.profiles.p_chrono.data.chrono, BASE_MS + 65_000), 65);
});

test("les runs marqués sont des segments successifs", () => {
  let state = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  const first = markChronoRun(state, "p_chrono", "morose", {
    nowMs: BASE_MS + 15_000,
    farmLabel: "Morose",
    idFactory: () => "m1"
  });
  state = first.state;
  assert.equal(first.mark.time, 15);
  assert.equal(getChronoSplitSeconds(state.profiles.p_chrono.data.chrono, BASE_MS + 22_000), 7);

  const second = markChronoRun(state, "p_chrono", "morose", {
    nowMs: BASE_MS + 24_000,
    farmLabel: "Morose",
    idFactory: () => "m2"
  });
  assert.equal(second.mark.time, 9);
  assert.deepEqual(second.state.profiles.p_chrono.data.chrono.marks.map((mark) => mark.id), ["m2", "m1"]);
});

test("marquer un run exige un chrono actif et un segment non vide", () => {
  assert.throws(() => markChronoRun(profileState(), "p_chrono", "morose", { nowMs: BASE_MS }), (error) => {
    assert.ok(error instanceof ChronoOperationError);
    return error.code === "CHRONO_STOPPED";
  });
  const running = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  assert.throws(() => markChronoRun(running, "p_chrono", "morose", { nowMs: BASE_MS }), { code: "EMPTY_MARK" });
});

test("les statistiques sont filtrées par donjon", () => {
  let state = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  state = markChronoRun(state, "p_chrono", "morose", { nowMs: BASE_MS + 10_000, idFactory: () => "m1" }).state;
  state = markChronoRun(state, "p_chrono", "tynril", { nowMs: BASE_MS + 40_000, idFactory: () => "t1" }).state;
  state = markChronoRun(state, "p_chrono", "morose", { nowMs: BASE_MS + 60_000, idFactory: () => "m2" }).state;
  const stats = getChronoStats(state.profiles.p_chrono.data, "morose", BASE_MS + 60_000);
  assert.equal(stats.markCount, 2);
  assert.equal(stats.best, 10);
  assert.equal(stats.average, 15);
});

test("terminer et reset remettent le chrono courant à zéro sans effacer l'historique", () => {
  let state = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  state = markChronoRun(state, "p_chrono", "morose", { nowMs: BASE_MS + 10_000, idFactory: () => "m1" }).state;
  const finished = finishChrono(state, "p_chrono", { nowMs: BASE_MS + 18_000 });
  assert.equal(finished.elapsed, 18);
  assert.equal(finished.state.profiles.p_chrono.data.chrono.seconds, 0);
  assert.equal(finished.state.profiles.p_chrono.data.chrono.running, false);
  assert.equal(finished.state.profiles.p_chrono.data.chrono.marks.length, 1);
  const reset = resetChrono(state, "p_chrono", { nowMs: BASE_MS + 18_000 });
  assert.equal(reset.profiles.p_chrono.data.chrono.marks.length, 1);
});

test("l'historique peut supprimer une entrée ou être entièrement vidé", () => {
  let state = startChrono(profileState(), "p_chrono", { nowMs: BASE_MS });
  state = markChronoRun(state, "p_chrono", "morose", { nowMs: BASE_MS + 10_000, idFactory: () => "m1" }).state;
  state = markChronoRun(state, "p_chrono", "morose", { nowMs: BASE_MS + 20_000, idFactory: () => "m2" }).state;
  state = removeChronoMark(state, "p_chrono", "m2", { nowMs: BASE_MS + 20_000 });
  assert.deepEqual(state.profiles.p_chrono.data.chrono.marks.map((mark) => mark.id), ["m1"]);
  assert.equal(state.profiles.p_chrono.data.chrono.lastMarkSeconds, 10);
  state = clearChronoMarks(state, "p_chrono", { nowMs: BASE_MS + 20_000 });
  assert.equal(state.profiles.p_chrono.data.chrono.marks.length, 0);
  assert.equal(state.profiles.p_chrono.data.chrono.lastMarkSeconds, 0);
});

test("les chronos restent isolés entre profils", () => {
  let state = profileState("p1");
  state = createProfile(state, { familiarId: "pykur", name: "Deux" }, {
    resolveFamiliar,
    idFactory: () => "p2",
    now: new Date(BASE_MS).toISOString()
  }).state;
  state = startChrono(state, "p1", { nowMs: BASE_MS });
  assert.equal(state.profiles.p1.data.chrono.running, true);
  assert.equal(state.profiles.p2.data.chrono.running, false);
});

test("le format du chrono reste stable", () => {
  assert.equal(formatChrono(0), "00:00:00");
  assert.equal(formatChrono(3661), "01:01:01");
});
