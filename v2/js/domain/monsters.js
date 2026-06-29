import { cloneValue } from "../state/defaults.js";

function integer(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function effectiveDungeonGains(familiarId, dungeonKey, profileData, runtime, gelutinBossGains = {}) {
  const gains = { ...(runtime?.gains?.[dungeonKey] || {}) };
  if (familiarId === "gelutin" && ["donjonBlops", "antreBlopMulticolore"].includes(dungeonKey)) {
    const boss = profileData?.special?.blopBoss || "blopCocoRoyal";
    for (const [mobId, count] of Object.entries(gelutinBossGains[boss] || gelutinBossGains.blopCocoRoyal || {})) {
      gains[mobId] = (gains[mobId] || 0) + integer(count);
    }
  }
  return gains;
}

export function normalizeMonsterData(profileData, familiar, runtime, options = {}) {
  const data = cloneValue(profileData);
  const dungeonKeys = familiar.dungeons.map((dungeon) => dungeon.key);
  data.runs = { ...Object.fromEntries(dungeonKeys.map((key) => [key, 0])), ...(data.runs || {}) };
  data.mobs = { ...(data.mobs || {}) };
  for (const area of [...dungeonKeys, "zone"]) {
    data.mobs[area] = { ...(data.mobs[area] || {}) };
    for (const mobId of Object.keys(runtime.mobs || {})) {
      data.mobs[area][mobId] = Math.max(0, integer(data.mobs[area][mobId]));
    }
  }
  for (const dungeonKey of dungeonKeys) {
    const limit = runtime.runLimits?.[dungeonKey] ?? Number.MAX_SAFE_INTEGER;
    data.runs[dungeonKey] = Math.min(limit, Math.max(0, integer(data.runs[dungeonKey])));
    const gains = effectiveDungeonGains(familiar.id, dungeonKey, data, runtime, options.gelutinBossGains);
    const hasRecordedMonsters = Object.keys(gains).some((mobId) => data.mobs[dungeonKey][mobId] > 0);
    if (!hasRecordedMonsters && data.runs[dungeonKey] > 0) {
      for (const [mobId, count] of Object.entries(gains)) {
        data.mobs[dungeonKey][mobId] = data.runs[dungeonKey] * integer(count);
      }
    }
  }
  return data;
}

export function totalMonsters(profileData, familiar, runtime) {
  const totals = {};
  const sources = [...familiar.dungeons.map((dungeon) => dungeon.key), "zone"];
  for (const mobId of Object.keys(runtime.mobs || {})) {
    totals[mobId] = sources.reduce((sum, source) => sum + Math.max(0, integer(profileData.mobs?.[source]?.[mobId])), 0);
  }
  return totals;
}

export function progressFromMonsters(counts, familiar, runtime) {
  let progress = 0;
  for (const [mobId, monster] of Object.entries(runtime.mobs || {})) {
    const need = Math.max(0, integer(monster.ppNeed));
    if (!need || monster.noProgress) continue;
    const gainValue = Math.max(1, integer(monster.gainValue) || 1);
    progress += Math.floor(Math.max(0, integer(counts[mobId])) / need) * gainValue;
  }
  return Math.min(progress, Math.max(0, Number(familiar.objectiveMax) || 0));
}

export function setMonsterCount(profileData, familiar, runtime, area, mobId, value, options = {}) {
  const validAreas = new Set([...familiar.dungeons.map((dungeon) => dungeon.key), "zone"]);
  if (!validAreas.has(area)) throw new RangeError("Source de monstre invalide.");
  if (!runtime.mobs?.[mobId]) throw new RangeError("Monstre inconnu.");
  const data = normalizeMonsterData(profileData, familiar, runtime, options);
  data.mobs[area][mobId] = Math.max(0, integer(value));
  return data;
}
