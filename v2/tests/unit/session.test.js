import assert from "node:assert/strict";
import test from "node:test";

import { resolveFamiliar } from "../../js/config/familiars.js";
import { createProfile } from "../../js/domain/profiles.js";
import {
  buildSessionSummary,
  finishSession,
  getSessionSeconds,
  getSessionStats,
  pauseSession,
  recordSessionRun,
  resetSession,
  startSession
} from "../../js/domain/session.js";
import { createDefaultState } from "../../js/state/defaults.js";

const BASE_MS = Date.parse("2026-06-29T14:00:00.000Z");
const FARMS = ["morose", "tynril"];

function profileState(id = "p_session") {
  return createProfile(createDefaultState({ now: new Date(BASE_MS).toISOString() }), {
    familiarId: "pykur",
    name: "Session"
  }, {
    resolveFamiliar,
    idFactory: () => id,
    now: new Date(BASE_MS).toISOString()
  }).state;
}

test("une nouvelle session mémorise le bonus de départ et ses donjons", () => {
  const original = profileState();
  const state = startSession(original, "p_session", FARMS, 12, { nowMs: BASE_MS });
  const session = state.profiles.p_session.data.session;
  assert.equal(original.profiles.p_session.data.session.active, false);
  assert.equal(session.active, true);
  assert.equal(session.ppStart, 12);
  assert.deepEqual(session.runs, { morose: 0, tynril: 0 });
  assert.equal(session.sessionStartedAt, BASE_MS);
});

test("la durée de session survit à la pause, à la reprise et au reload", () => {
  let state = startSession(profileState(), "p_session", FARMS, 0, { nowMs: BASE_MS });
  assert.equal(getSessionSeconds(state.profiles.p_session.data.session, BASE_MS + 25_900), 25);
  state = pauseSession(state, "p_session", FARMS, { nowMs: BASE_MS + 25_900 });
  assert.equal(getSessionSeconds(state.profiles.p_session.data.session, BASE_MS + 80_000), 25);
  const reloaded = JSON.parse(JSON.stringify(state));
  state = startSession(reloaded, "p_session", FARMS, 0, { nowMs: BASE_MS + 40_000 });
  assert.equal(getSessionSeconds(state.profiles.p_session.data.session, BASE_MS + 50_000), 35);
});

test("les runs et le bonus gagné suivent uniquement une session active", () => {
  let state = profileState();
  const inactive = recordSessionRun(state, "p_session", FARMS, "morose", 1, 4, { nowMs: BASE_MS });
  assert.equal(inactive, state);
  state = startSession(state, "p_session", FARMS, 3, { nowMs: BASE_MS });
  state = recordSessionRun(state, "p_session", FARMS, "morose", 1, 5, { nowMs: BASE_MS + 5_000 });
  state = recordSessionRun(state, "p_session", FARMS, "tynril", 1, 7, { nowMs: BASE_MS + 8_000 });
  let stats = getSessionStats(state.profiles.p_session.data, FARMS, BASE_MS + 8_000);
  assert.equal(stats.totalRuns, 2);
  assert.deepEqual(stats.farmRuns, { morose: 1, tynril: 1 });
  assert.equal(stats.progressGain, 4);
  assert.equal(getSessionStats(state.profiles.p_session.data, FARMS, BASE_MS + 8_000, { currentProgress: 8 }).progressGain, 5);
  state = recordSessionRun(state, "p_session", FARMS, "morose", -1, 4, { nowMs: BASE_MS + 9_000 });
  stats = getSessionStats(state.profiles.p_session.data, FARMS, BASE_MS + 9_000);
  assert.equal(stats.totalRuns, 1);
  assert.equal(stats.progressGain, 1);
});

test("une reprise conserve les compteurs et le bonus de départ", () => {
  let state = startSession(profileState(), "p_session", FARMS, 10, { nowMs: BASE_MS });
  state = recordSessionRun(state, "p_session", FARMS, "morose", 1, 13, { nowMs: BASE_MS + 10_000 });
  state = pauseSession(state, "p_session", FARMS, { nowMs: BASE_MS + 12_000 });
  state = startSession(state, "p_session", FARMS, 99, { nowMs: BASE_MS + 20_000 });
  const session = state.profiles.p_session.data.session;
  assert.equal(session.ppStart, 10);
  assert.equal(session.ppGain, 3);
  assert.equal(session.runs.morose, 1);
});

test("le résumé calcule la durée, les rendements et remet la session à zéro", () => {
  let state = startSession(profileState(), "p_session", FARMS, 2, { nowMs: BASE_MS });
  state = recordSessionRun(state, "p_session", FARMS, "morose", 2, 6, { nowMs: BASE_MS + 1_800_000 });
  const result = finishSession(state, "p_session", FARMS, 6, "PP", { nowMs: BASE_MS + 3_600_000 });
  assert.equal(result.summary.elapsed, 3600);
  assert.equal(result.summary.totalRuns, 2);
  assert.equal(result.summary.progressGain, 4);
  assert.equal(result.summary.runsHour, 2);
  assert.equal(result.summary.progressHour, 4);
  const session = result.state.profiles.p_session.data.session;
  assert.equal(session.active, false);
  assert.equal(session.totalSeconds, 0);
  assert.deepEqual(session.runs, { morose: 0, tynril: 0 });
  assert.deepEqual(session.lastSummary, result.summary);
});

test("reset efface aussi le dernier résumé", () => {
  let state = startSession(profileState(), "p_session", FARMS, 0, { nowMs: BASE_MS });
  state = finishSession(state, "p_session", FARMS, 0, "PP", { nowMs: BASE_MS + 10_000 }).state;
  state = resetSession(state, "p_session", FARMS, 0, { nowMs: BASE_MS + 11_000 });
  assert.equal(state.profiles.p_session.data.session.lastSummary, null);
});

test("les sessions sont isolées entre profils", () => {
  let state = profileState("p1");
  state = createProfile(state, { familiarId: "pykur", name: "Deux" }, {
    resolveFamiliar,
    idFactory: () => "p2",
    now: new Date(BASE_MS).toISOString()
  }).state;
  state = startSession(state, "p1", FARMS, 0, { nowMs: BASE_MS });
  assert.equal(state.profiles.p1.data.session.active, true);
  assert.equal(state.profiles.p2.data.session.active, false);
});

test("le constructeur de résumé ne modifie pas la session", () => {
  const state = startSession(profileState(), "p_session", FARMS, 0, { nowMs: BASE_MS });
  const session = state.profiles.p_session.data.session;
  const before = JSON.stringify(session);
  buildSessionSummary(session, FARMS, "PP", BASE_MS + 5_000);
  assert.equal(JSON.stringify(session), before);
});
