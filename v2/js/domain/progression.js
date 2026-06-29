import { cloneValue } from "../state/defaults.js";
import { normalizeMonsterData, progressFromMonsters, totalMonsters } from "./monsters.js";

export function getProfileProgress(profileData, familiar, runtime) {
  return progressFromMonsters(totalMonsters(profileData, familiar, runtime), familiar, runtime);
}

export function getProgressPercent(value, familiar) {
  const maximum = Math.max(1, Number(familiar.objectiveMax) || 1);
  return Math.min(100, Math.max(0, (Number(value) || 0) / maximum * 100));
}

export function normalizeProgressionState(state, options) {
  const next = cloneValue(state);
  let changed = false;
  for (const profile of Object.values(next.profiles || {})) {
    const familiar = options.resolveFamiliar(profile.data?.familiarId);
    const runtime = options.resolveRuntime(profile.data?.familiarId);
    if (!familiar || !runtime) continue;
    const normalized = normalizeMonsterData(profile.data, familiar, runtime, {
      gelutinBossGains: options.gelutinBossGains
    });
    if (JSON.stringify(normalized.runs) !== JSON.stringify(profile.data.runs)
      || JSON.stringify(normalized.mobs) !== JSON.stringify(profile.data.mobs)) changed = true;
    profile.data = normalized;
  }
  return { state: next, changed };
}
