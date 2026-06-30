import {
  ACHIEVEMENTS,
  MAIN_ACHIEVEMENT_CATEGORIES,
  SECRET_ACHIEVEMENT_CATEGORIES
} from "../config/achievements.js";
import { getProfileProgress } from "./progression.js";
import { cloneValue, createDefaultAchievements } from "../state/defaults.js";

function sumNumericDeep(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value || typeof value !== "object") return 0;
  return Object.values(value).reduce((sum, item) => sum + sumNumericDeep(item), 0);
}

function normalizedAchievements(state) {
  const source = state?.sharedAchievements || {};
  return {
    ...createDefaultAchievements(),
    ...cloneValue(source),
    unlocked: { ...(source.unlocked || {}) },
    removedUnlocked: { ...(source.removedUnlocked || {}) },
    counters: { ...createDefaultAchievements().counters, ...(source.counters || {}) }
  };
}

function archiveCount(state) {
  const archives = [];
  if (Array.isArray(state?.sharedGallery?.completedPykurs)) archives.push(...state.sharedGallery.completedPykurs);
  for (const profile of Object.values(state?.profiles || {})) {
    if (Array.isArray(profile.data?.gallery?.completedPykurs)) archives.push(...profile.data.gallery.completedPykurs);
  }
  const ids = new Set();
  let anonymous = 0;
  for (const archive of archives) {
    if (archive?.id) ids.add(String(archive.id));
    else anonymous += 1;
  }
  return ids.size + anonymous;
}

export function getAchievementStats(state, dependencies) {
  const profiles = Object.values(state?.profiles || {}).filter((profile) => profile?.data);
  let maxProgressRatio = 0;
  let totalRuns = 0;
  let totalMonsters = 0;
  let dailyMax = 0;
  const distinctDungeons = new Set();
  const farmMethods = new Set();
  const progressedFamiliars = new Set();
  const progressedBonuses = new Set();
  const activeDays = new Set();

  for (const profile of profiles) {
    const familiar = dependencies.resolveFamiliar(profile.data.familiarId);
    const runtime = dependencies.resolveRuntime(profile.data.familiarId);
    if (familiar && runtime) {
      const progress = getProfileProgress(profile.data, familiar, runtime);
      const maximum = Math.max(1, Number(familiar.objectiveMax) || 1);
      maxProgressRatio = Math.max(maxProgressRatio, progress / maximum);
      if (progress > 0) {
        progressedFamiliars.add(familiar.id);
        progressedBonuses.add(String(familiar.progressShort || familiar.progressLabel || "").toLocaleLowerCase("fr"));
      }
    }
    for (const [dungeon, value] of Object.entries(profile.data.runs || {})) {
      const count = Math.max(0, Number(value) || 0);
      totalRuns += count;
      if (count > 0) {
        distinctDungeons.add(dungeon);
        farmMethods.add(`${profile.data.familiarId}:${dungeon}`);
      }
    }
    totalMonsters += sumNumericDeep(profile.data.mobs || {});
    for (const [day, details] of Object.entries(profile.data.stats?.days || {})) {
      activeDays.add(day);
      dailyMax = Math.max(dailyMax, sumNumericDeep(details?.runs || details));
    }
  }

  return Object.freeze({
    profileCount: profiles.length,
    archiveCount: archiveCount(state),
    maxProgressRatio,
    totalRuns,
    totalMonsters,
    distinctDungeons: distinctDungeons.size,
    farmMethods: farmMethods.size,
    progressedFamiliars: progressedFamiliars.size,
    progressedBonuses: progressedBonuses.size,
    activeDays: activeDays.size,
    dailyMax
  });
}

function thresholdIds(value, entries) {
  return entries.filter(([threshold]) => value >= threshold).map(([, id]) => id);
}

export function automaticAchievementIds(state, dependencies) {
  const stats = getAchievementStats(state, dependencies);
  const ids = [];
  if (stats.profileCount >= 1) ids.push("create_profile");
  if (stats.totalRuns >= 1) ids.push("first_run");
  if (stats.maxProgressRatio >= 0.10) ids.push("progress_10");
  if (stats.maxProgressRatio >= 0.50) ids.push("progress_50");
  if (stats.maxProgressRatio >= 0.90) ids.push("progress_90");
  ids.push(...thresholdIds(stats.archiveCount, [[1, "complete_1"], [2, "complete_2"], [5, "complete_5"], [10, "complete_10"], [20, "complete_20"], [1, "archive_1"], [3, "archive_3"], [10, "archive_10"]]));
  ids.push(...thresholdIds(stats.totalRuns, [[1, "dungeon_1"], [10, "dungeon_10"], [50, "dungeon_50"], [100, "dungeon_100"], [250, "dungeon_250"], [500, "dungeon_500"]]));
  ids.push(...thresholdIds(stats.distinctDungeons, [[3, "dungeon_variety_3"], [5, "dungeon_variety_5"], [10, "dungeon_variety_10"]]));
  ids.push(...thresholdIds(stats.progressedFamiliars, [[2, "familiar_variety_2"], [5, "familiar_variety_5"]]));
  if (stats.profileCount >= 5) ids.push("profiles_5");
  ids.push(...thresholdIds(stats.progressedBonuses, [[3, "bonus_variety_3"], [5, "bonus_variety_5"]]));
  if (stats.farmMethods >= 3) ids.push("farm_methods_3");
  ids.push(...thresholdIds(stats.totalMonsters, [[1, "monster_1"], [100, "monster_100"], [1000, "monster_1000"], [5000, "monster_5000"], [10000, "monster_10000"]]));
  ids.push(...thresholdIds(stats.activeDays, [[2, "active_2_days"], [7, "active_7_days"], [30, "active_30_days"]]));
  ids.push(...thresholdIds(stats.dailyMax, [[10, "daily_runs_10"], [25, "daily_runs_25"], [50, "daily_runs_50"]]));

  for (const profile of Object.values(state?.profiles || {})) {
    if (profile.data?.chrono?.running || Number(profile.data?.chrono?.seconds) > 0) ids.push("start_chrono");
    if (profile.data?.chrono?.marks?.length) ids.push("chrono_mark");
    if (profile.data?.session?.active || profile.data?.session?.lastSummary) ids.push("start_session");
  }
  return Array.from(new Set(ids));
}

function setUnlock(achievements, id, date, unlocked, options = {}) {
  if (!ACHIEVEMENTS[id] || achievements.unlocked[id]) return;
  if (options.respectRemoved && achievements.removedUnlocked[id]) return;
  delete achievements.removedUnlocked[id];
  achievements.unlocked[id] = { date };
  unlocked.push(id);
}

function reconcileFinalAchievements(achievements, date, unlocked, options = {}) {
  const mainIds = Object.entries(ACHIEVEMENTS)
    .filter(([, item]) => MAIN_ACHIEVEMENT_CATEGORIES.includes(item.category))
    .map(([id]) => id);
  const secrets = Object.entries(ACHIEVEMENTS)
    .filter(([, item]) => SECRET_ACHIEVEMENT_CATEGORIES.includes(item.category))
    .map(([id]) => id);
  const mainComplete = mainIds.length > 0 && mainIds.every((id) => achievements.unlocked[id]);
  const secretsComplete = secrets.length > 0 && secrets.every((id) => achievements.unlocked[id]);
  if (mainComplete) setUnlock(achievements, "tracker_absolute", date, unlocked, options);
  else delete achievements.unlocked.tracker_absolute;
  if (achievements.secretCategoriesUnlocked && secretsComplete) setUnlock(achievements, "master_secrets", date, unlocked, options);
  else delete achievements.unlocked.master_secrets;
  if (achievements.secretCategoriesUnlocked && achievements.unlocked.tracker_absolute && achievements.unlocked.master_secrets) {
    setUnlock(achievements, "true_100", date, unlocked, options);
  } else delete achievements.unlocked.true_100;
}

function withAchievements(state, achievements, now) {
  const next = cloneValue(state);
  next.sharedAchievements = achievements;
  next.achievementsShared = true;
  next.achievementAccountMode = 1;
  next.updatedAt = now;
  return next;
}

export function unlockAchievements(state, ids, options = {}) {
  const now = options.now || new Date().toISOString();
  const achievements = normalizedAchievements(state);
  const previous = JSON.stringify(achievements);
  const unlocked = [];
  for (const id of ids) setUnlock(achievements, id, now, unlocked, options);
  reconcileFinalAchievements(achievements, now, unlocked, options);
  const changed = previous !== JSON.stringify(achievements);
  return Object.freeze({ state: changed ? withAchievements(state, achievements, now) : state, unlocked });
}

export function recalculateAchievements(state, dependencies, options = {}) {
  return unlockAchievements(state, automaticAchievementIds(state, dependencies), { ...options, respectRemoved: true });
}

export function resetAchievements(state, options = {}) {
  const now = options.now || new Date().toISOString();
  const current = normalizedAchievements(state);
  const reset = createDefaultAchievements();
  reset.eggCollected = current.eggCollected;
  reset.removedUnlocked = { ...current.removedUnlocked };
  for (const id of Object.keys(current.unlocked)) reset.removedUnlocked[id] = now;
  return withAchievements(state, reset, now);
}

export function unlockSecretCategories(state, options = {}) {
  const current = normalizedAchievements(state);
  if (!current.eggCollected || current.secretCategoriesUnlocked) return state;
  current.secretCategoriesUnlocked = true;
  const now = options.now || new Date().toISOString();
  const unlocked = [];
  reconcileFinalAchievements(current, now, unlocked);
  return withAchievements(state, current, now);
}

export function achievementProgress(state, category = null) {
  const achievements = normalizedAchievements(state);
  const entries = Object.entries(ACHIEVEMENTS).filter(([, item]) => !category || item.category === category);
  return Object.freeze({ total: entries.length, done: entries.filter(([id]) => achievements.unlocked[id]).length });
}
