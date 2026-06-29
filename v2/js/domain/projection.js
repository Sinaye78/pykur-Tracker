import { farmAverageKey } from "../state/defaults.js";
import { effectiveDungeonGains, progressFromMonsters, totalMonsters } from "./monsters.js";

function integer(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function addGains(totals, gains, multiplier = 1) {
  for (const [mobId, count] of Object.entries(gains || {})) {
    totals[mobId] = Math.max(0, integer(totals[mobId]) + integer(count) * multiplier);
  }
}

function dungeonCapacity(profileData, runtime, dungeonKey, virtualRuns = {}) {
  const limit = runtime.runLimits?.[dungeonKey] ?? Number.MAX_SAFE_INTEGER;
  const current = integer(profileData.runs?.[dungeonKey]);
  const virtual = integer(virtualRuns[dungeonKey]);
  return Math.max(0, limit - current - virtual);
}

export function simulateDungeonRuns(profileData, familiar, runtime, dungeonKey, requestedRuns, options = {}) {
  if (!familiar.dungeons.some((dungeon) => dungeon.key === dungeonKey)) throw new RangeError("Donjon inconnu.");
  const totals = { ...(options.baseTotals || totalMonsters(profileData, familiar, runtime)) };
  const capacity = dungeonCapacity(profileData, runtime, dungeonKey, options.virtualRuns);
  const runs = Math.min(capacity, Math.max(0, integer(requestedRuns)));
  const gains = effectiveDungeonGains(familiar.id, dungeonKey, profileData, runtime, options.gelutinBossGains);
  addGains(totals, gains, runs);
  return Object.freeze({
    dungeonKey,
    requestedRuns: Math.max(0, integer(requestedRuns)),
    runs,
    capacity,
    totals: Object.freeze(totals),
    progress: progressFromMonsters(totals, familiar, runtime)
  });
}

export function runsToProgressTarget(profileData, familiar, runtime, dungeonKey, target, options = {}) {
  const totals = { ...(options.baseTotals || totalMonsters(profileData, familiar, runtime)) };
  const targetProgress = Math.min(familiar.objectiveMax, Math.max(0, Number(target) || 0));
  if (progressFromMonsters(totals, familiar, runtime) >= targetProgress) return 0;
  const capacity = dungeonCapacity(profileData, runtime, dungeonKey, options.virtualRuns);
  if (capacity <= 0) return null;
  const gains = effectiveDungeonGains(familiar.id, dungeonKey, profileData, runtime, options.gelutinBossGains);
  for (let count = 1; count <= capacity; count += 1) {
    addGains(totals, gains);
    if (progressFromMonsters(totals, familiar, runtime) >= targetProgress) return count;
  }
  return null;
}

export function averageSeconds(profileData, dungeon) {
  const recorded = Math.max(0, integer(profileData.stats?.[farmAverageKey(dungeon.key)]));
  return recorded || Math.max(0, integer(dungeon.defaultAverage));
}

export function projectProfile(profileData, familiar, runtime, options = {}) {
  const totals = totalMonsters(profileData, familiar, runtime);
  const progress = progressFromMonsters(totals, familiar, runtime);
  const nextTarget = Math.min(familiar.objectiveMax, Math.floor(progress) + 1);
  const complete = progress >= familiar.objectiveMax;
  const dungeons = familiar.dungeons.map((dungeon) => {
    const nextRuns = complete ? 0 : runsToProgressTarget(profileData, familiar, runtime, dungeon.key, nextTarget, {
      ...options,
      baseTotals: totals
    });
    const nextSimulation = nextRuns === null
      ? null
      : simulateDungeonRuns(profileData, familiar, runtime, dungeon.key, nextRuns, { ...options, baseTotals: totals });
    const fullRuns = complete ? 0 : runsToProgressTarget(profileData, familiar, runtime, dungeon.key, familiar.objectiveMax, {
      ...options,
      baseTotals: totals
    });
    const seconds = averageSeconds(profileData, dungeon);
    return Object.freeze({
      key: dungeon.key,
      label: dungeon.label,
      fullLabel: dungeon.fullLabel,
      nextRuns,
      nextProgress: nextSimulation?.progress ?? progress,
      nextGain: nextSimulation ? Math.max(0, nextSimulation.progress - progress) : null,
      fullRuns,
      averageSeconds: seconds,
      nextSeconds: nextRuns === null ? null : nextRuns * seconds,
      fullSeconds: fullRuns === null ? null : fullRuns * seconds,
      rate: nextRuns && nextRuns > 0 ? 1 / nextRuns : null
    });
  });
  return Object.freeze({
    familiarId: familiar.id,
    progress,
    maximum: familiar.objectiveMax,
    percent: Math.min(100, progress / Math.max(1, familiar.objectiveMax) * 100),
    nextTarget,
    complete,
    dungeons: Object.freeze(dungeons)
  });
}

export function simulateProjectionPlan(profileData, familiar, runtime, additions = {}, options = {}) {
  const baseTotals = totalMonsters(profileData, familiar, runtime);
  const currentProgress = progressFromMonsters(baseTotals, familiar, runtime);
  const totals = { ...baseTotals };
  const appliedRuns = {};
  for (const dungeon of familiar.dungeons) {
    const capacity = dungeonCapacity(profileData, runtime, dungeon.key);
    const runs = Math.min(capacity, Math.max(0, integer(additions[dungeon.key])));
    appliedRuns[dungeon.key] = runs;
    addGains(totals, effectiveDungeonGains(familiar.id, dungeon.key, profileData, runtime, options.gelutinBossGains), runs);
  }
  const progress = progressFromMonsters(totals, familiar, runtime);
  const remaining = familiar.dungeons.map((dungeon) => Object.freeze({
    key: dungeon.key,
    label: dungeon.label,
    runs: progress >= familiar.objectiveMax ? 0 : runsToProgressTarget(profileData, familiar, runtime, dungeon.key, familiar.objectiveMax, {
      ...options,
      baseTotals: totals,
      virtualRuns: appliedRuns
    })
  }));
  return Object.freeze({
    currentProgress,
    progress,
    gain: Math.max(0, progress - currentProgress),
    percent: Math.min(100, progress / Math.max(1, familiar.objectiveMax) * 100),
    appliedRuns: Object.freeze(appliedRuns),
    remaining: Object.freeze(remaining),
    totals: Object.freeze(totals)
  });
}
