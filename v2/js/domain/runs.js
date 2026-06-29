import { cloneValue } from "../state/defaults.js";
import { effectiveDungeonGains, normalizeMonsterData } from "./monsters.js";
import { getProfileProgress } from "./progression.js";

function context(state, profileId, options) {
  const profile = state.profiles?.[profileId];
  if (!profile) throw new RangeError("Profil introuvable.");
  const familiar = options.resolveFamiliar(profile.data?.familiarId);
  const runtime = options.resolveRuntime(profile.data?.familiarId);
  if (!familiar || !runtime) throw new RangeError("Configuration du familier introuvable.");
  return { profile, familiar, runtime };
}

function addBundle(target, bundle, delta = 1) {
  for (const [mobId, count] of Object.entries(bundle || {})) {
    target[mobId] = Math.max(0, (target[mobId] || 0) + Number(count || 0) * delta);
  }
}

function enterAbraRoom(data, runtime, options) {
  data.special = { salleAbrakneSetupDone: false, salleAbrakneActive: false, salleAbrakneLastActivity: null, ...(data.special || {}) };
  if (!data.special.salleAbrakneSetupDone) {
    data.special.salleAbrakneSetupDone = true;
    addBundle(data.mobs.zone, runtime.specialGains?.salleAbrakneSetup);
  }
  data.special.salleAbrakneActive = true;
  data.special.salleAbrakneLastActivity = options.nowMs?.() ?? Date.now();
  data.ui.farm = "salleAbrakne";
}

export function toggleAbraRoom(state, profileId, options) {
  const next = cloneValue(state);
  const { profile, familiar, runtime } = context(next, profileId, options);
  profile.data = normalizeMonsterData(profile.data, familiar, runtime, { gelutinBossGains: options.gelutinBossGains });
  if (profile.data.special?.salleAbrakneActive) {
    profile.data.special.salleAbrakneActive = false;
    profile.data.special.salleAbrakneSetupDone = false;
    profile.data.special.salleAbrakneLastActivity = null;
  } else {
    enterAbraRoom(profile.data, runtime, options);
  }
  next.updatedAt = options.now?.() || new Date().toISOString();
  return next;
}

export function setGelutinBoss(state, profileId, bossId, options) {
  if (!options.gelutinBossGains?.[bossId]) throw new RangeError("Boss Blop inconnu.");
  const next = cloneValue(state);
  const { profile, familiar, runtime } = context(next, profileId, options);
  if (familiar.id !== "gelutin") throw new RangeError("Ce profil n'est pas un Gelutin.");
  profile.data = normalizeMonsterData(profile.data, familiar, runtime, { gelutinBossGains: options.gelutinBossGains });
  profile.data.special = { ...(profile.data.special || {}), blopBoss: bossId };
  next.updatedAt = options.now?.() || new Date().toISOString();
  return next;
}

export function setActiveDungeon(state, profileId, dungeonKey, options) {
  const next = cloneValue(state);
  const { profile, familiar } = context(next, profileId, options);
  if (!familiar.dungeons.some((dungeon) => dungeon.key === dungeonKey)) throw new RangeError("Donjon inconnu.");
  profile.data.ui = { ...(profile.data.ui || {}), farm: dungeonKey, tab: dungeonKey };
  next.updatedAt = options.now?.() || new Date().toISOString();
  return next;
}

export function applyRunDelta(state, profileId, delta, options) {
  const next = cloneValue(state);
  const { profile, familiar, runtime } = context(next, profileId, options);
  profile.data = normalizeMonsterData(profile.data, familiar, runtime, { gelutinBossGains: options.gelutinBossGains });
  const data = profile.data;
  const dungeonKey = data.ui?.farm || familiar.dungeons[0]?.key;
  if (!runtime.gains?.[dungeonKey]) throw new RangeError("Gains du donjon introuvables.");

  if (familiar.id === "abra-kadabra" && dungeonKey === "salleAbrakne" && delta > 0 && !data.special?.salleAbrakneActive) {
    const oldProgress = getProfileProgress(data, familiar, runtime);
    enterAbraRoom(data, runtime, options);
    next.updatedAt = options.now?.() || new Date().toISOString();
    return { state: next, applied: 0, specialAction: "abra-room-entered", oldProgress, newProgress: getProfileProgress(profile.data, familiar, runtime) };
  }

  const oldProgress = getProfileProgress(data, familiar, runtime);
  const oldRuns = data.runs[dungeonKey] || 0;
  const limit = runtime.runLimits?.[dungeonKey] ?? Number.MAX_SAFE_INTEGER;
  const requested = oldRuns + (delta > 0 ? 1 : -1);
  const newRuns = Math.min(limit, Math.max(0, requested));
  const applied = newRuns - oldRuns;
  if (!applied) return { state, applied: 0, specialAction: null, oldProgress, newProgress: oldProgress };

  data.runs[dungeonKey] = newRuns;
  const gains = effectiveDungeonGains(familiar.id, dungeonKey, data, runtime, options.gelutinBossGains);
  addBundle(data.mobs[dungeonKey], gains, applied);
  if (familiar.id === "abra-kadabra" && dungeonKey === "salleAbrakne" && data.special?.salleAbrakneActive) {
    data.special.salleAbrakneLastActivity = options.nowMs?.() ?? Date.now();
  }
  const newProgress = getProfileProgress(data, familiar, runtime);
  next.updatedAt = options.now?.() || new Date().toISOString();
  return { state: next, applied, specialAction: null, oldProgress, newProgress };
}

export function setRunCount(state, profileId, dungeonKey, value, options) {
  const next = cloneValue(state);
  const { profile, familiar, runtime } = context(next, profileId, options);
  profile.data = normalizeMonsterData(profile.data, familiar, runtime, { gelutinBossGains: options.gelutinBossGains });
  if (!familiar.dungeons.some((dungeon) => dungeon.key === dungeonKey)) throw new RangeError("Donjon inconnu.");
  const limit = runtime.runLimits?.[dungeonKey] ?? Number.MAX_SAFE_INTEGER;
  const runs = Math.min(limit, Math.max(0, Number.parseInt(value, 10) || 0));
  profile.data.runs[dungeonKey] = runs;
  for (const mobId of Object.keys(runtime.mobs || {})) profile.data.mobs[dungeonKey][mobId] = 0;
  for (const [mobId, count] of Object.entries(effectiveDungeonGains(familiar.id, dungeonKey, profile.data, runtime, options.gelutinBossGains))) {
    profile.data.mobs[dungeonKey][mobId] = runs * Number(count || 0);
  }
  next.updatedAt = options.now?.() || new Date().toISOString();
  return next;
}
