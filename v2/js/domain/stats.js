import { cloneValue, farmAverageKey } from "../state/defaults.js";
import { progressFromMonsters, totalMonsters } from "./monsters.js";
import { getProfileProgress, getProgressPercent } from "./progression.js";

function integer(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value, total) {
  return total > 0 ? Math.round(value / total * 100) : 0;
}

function dayTotal(day, farmKeys) {
  return farmKeys.reduce((sum, key) => sum + Math.max(0, integer(day?.[key])), 0);
}

function dateKey(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function previousDay(key) {
  const date = new Date(`${key}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function validMarks(profileData, farmKey = null) {
  return (Array.isArray(profileData?.chrono?.marks) ? profileData.chrono.marks : []).filter((mark) => {
    return (!farmKey || mark.farm === farmKey) && Number(mark.time) > 0;
  });
}

export function recordDailyRun(state, profileId, farmKey, delta, oldProgress, newProgress, options = {}) {
  const profile = state?.profiles?.[profileId];
  if (!profile) throw new RangeError("Profil introuvable pour les statistiques.");
  const day = options.dayKey || dateKey(options.now || new Date()) || new Date().toISOString().slice(0, 10);
  const next = cloneValue(state);
  const data = next.profiles[profileId].data;
  data.stats = { ...(data.stats || {}), days: { ...(data.stats?.days || {}) } };
  const current = { ...(data.stats.days[day] || {}) };
  if (!Number.isFinite(Number(current.startPP))) current.startPP = Math.max(0, Number(oldProgress) || 0);
  current[farmKey] = Math.max(0, integer(current[farmKey]) + Math.trunc(Number(delta) || 0));
  current.pp = Math.max(0, (Number(newProgress) || 0) - Number(current.startPP || 0));
  data.stats.days[day] = current;
  next.updatedAt = options.nowIso || new Date(options.now || Date.now()).toISOString();
  return next;
}

export function buildProfileStatistics(profileData, familiar, runtime, options = {}) {
  const farmKeys = familiar.dungeons.map((dungeon) => dungeon.key);
  const progress = getProfileProgress(profileData, familiar, runtime);
  const runs = Object.fromEntries(farmKeys.map((key) => [key, Math.max(0, integer(profileData?.runs?.[key]))]));
  const totalRuns = Object.values(runs).reduce((sum, value) => sum + value, 0);
  const days = profileData?.stats?.days && typeof profileData.stats.days === "object" ? profileData.stats.days : {};
  const todayKey = options.today || new Date().toISOString().slice(0, 10);
  const todaySource = days[todayKey] || {};
  const today = {
    key: todayKey,
    runs: Object.fromEntries(farmKeys.map((key) => [key, Math.max(0, integer(todaySource[key]))])),
    totalRuns: dayTotal(todaySource, farmKeys),
    progressGain: Math.max(0, Number(todaySource.pp) || 0)
  };

  const activeDayKeys = Object.keys(days).filter((key) => dayTotal(days[key], farmKeys) > 0).sort();
  let currentStreak = 0;
  let cursor = todayKey;
  while (dayTotal(days[cursor], farmKeys) > 0) {
    currentStreak += 1;
    cursor = previousDay(cursor);
  }
  let bestStreak = activeDayKeys.length ? 1 : 0;
  let runningStreak = activeDayKeys.length ? 1 : 0;
  for (let index = 1; index < activeDayKeys.length; index += 1) {
    if (previousDay(activeDayKeys[index]) === activeDayKeys[index - 1]) runningStreak += 1;
    else runningStreak = 1;
    bestStreak = Math.max(bestStreak, runningStreak);
  }
  const activeRuns = activeDayKeys.reduce((sum, key) => sum + dayTotal(days[key], farmKeys), 0);
  const bestDay = activeDayKeys.reduce((best, key) => {
    const total = dayTotal(days[key], farmKeys);
    return !best || total > best.totalRuns ? { key, totalRuns: total, runs: Object.fromEntries(farmKeys.map((farm) => [farm, Math.max(0, integer(days[key]?.[farm]))])) } : best;
  }, null);

  const sourceKeys = [...farmKeys, "zone"];
  const contributions = Object.fromEntries(sourceKeys.map((source) => {
    const value = progressFromMonsters(profileData?.mobs?.[source] || {}, familiar, runtime);
    return [source, value];
  }));
  const contributionTotal = Object.values(contributions).reduce((sum, value) => sum + value, 0);
  const monsterTotals = totalMonsters(profileData, familiar, runtime);
  const totalMonsterCount = Object.values(monsterTotals).reduce((sum, value) => sum + Math.max(0, integer(value)), 0);

  const dungeons = familiar.dungeons.map((dungeon) => {
    const marks = validMarks(profileData, dungeon.key);
    const times = marks.map((mark) => Math.max(0, integer(mark.time))).filter(Boolean);
    const contribution = contributions[dungeon.key] || 0;
    return Object.freeze({
      key: dungeon.key,
      label: dungeon.label,
      fullLabel: dungeon.fullLabel,
      runs: runs[dungeon.key],
      runShare: percent(runs[dungeon.key], totalRuns),
      contribution,
      contributionShare: percent(contribution, contributionTotal),
      markCount: times.length,
      bestTime: times.length ? Math.min(...times) : null,
      averageTime: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null,
      configuredAverage: Math.max(0, integer(profileData?.stats?.[farmAverageKey(dungeon.key)] || dungeon.defaultAverage))
    });
  });
  const allMarks = validMarks(profileData);

  return Object.freeze({
    progress,
    progressPercent: getProgressPercent(progress, familiar),
    totalRuns,
    totalMonsterCount,
    runs,
    dungeons,
    contributions: Object.freeze({ ...contributions, total: contributionTotal, zoneShare: percent(contributions.zone || 0, contributionTotal) }),
    today: Object.freeze(today),
    activity: Object.freeze({
      activeDays: activeDayKeys.length,
      currentStreak,
      bestStreak,
      averageRunsPerActiveDay: activeDayKeys.length ? activeRuns / activeDayKeys.length : 0,
      bestDay
    }),
    timing: Object.freeze({
      markCount: allMarks.length,
      totalSeconds: allMarks.reduce((sum, mark) => sum + Math.max(0, integer(mark.time)), 0)
    })
  });
}
