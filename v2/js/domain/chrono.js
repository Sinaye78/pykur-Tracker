import { cloneValue } from "../state/defaults.js";

export class ChronoOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ChronoOperationError";
    this.code = code;
  }
}

function requireProfile(state, profileId) {
  const profile = state?.profiles?.[profileId];
  if (!profile) throw new ChronoOperationError("PROFILE_NOT_FOUND", "Profil introuvable.");
  return profile;
}

function normalizedChrono(chrono = {}) {
  return {
    seconds: Math.max(0, Math.floor(Number(chrono.seconds) || 0)),
    running: Boolean(chrono.running),
    startedAt: Number.isFinite(Number(chrono.startedAt)) ? Number(chrono.startedAt) : null,
    lastMarkSeconds: Math.max(0, Math.floor(Number(chrono.lastMarkSeconds) || 0)),
    marks: Array.isArray(chrono.marks) ? chrono.marks.map((mark, index) => ({
      ...cloneValue(mark),
      id: mark?.id || `legacy_${mark?.date || "unknown"}_${index}`
    })) : []
  };
}

function updateChrono(state, profileId, updater, nowIso) {
  requireProfile(state, profileId);
  const next = cloneValue(state);
  const profile = next.profiles[profileId];
  profile.data.chrono = updater(normalizedChrono(profile.data.chrono));
  next.updatedAt = nowIso;
  return next;
}

export function getChronoSeconds(chrono, nowMs = Date.now()) {
  const current = normalizedChrono(chrono);
  if (!current.running || current.startedAt === null) return current.seconds;
  return current.seconds + Math.max(0, Math.floor((nowMs - current.startedAt) / 1000));
}

export function getChronoSplitSeconds(chrono, nowMs = Date.now()) {
  const current = normalizedChrono(chrono);
  return Math.max(0, getChronoSeconds(current, nowMs) - Math.min(current.lastMarkSeconds, getChronoSeconds(current, nowMs)));
}

export function startChrono(state, profileId, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const current = normalizedChrono(requireProfile(state, profileId).data.chrono);
  if (current.running) return state;
  return updateChrono(state, profileId, (chrono) => ({ ...chrono, running: true, startedAt: nowMs }), nowIso);
}

export function pauseChrono(state, profileId, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const current = normalizedChrono(requireProfile(state, profileId).data.chrono);
  if (!current.running) return state;
  return updateChrono(state, profileId, (chrono) => ({
    ...chrono,
    seconds: getChronoSeconds(chrono, nowMs),
    running: false,
    startedAt: null
  }), nowIso);
}

export function resetChrono(state, profileId, options = {}) {
  const nowIso = options.nowIso || new Date(options.nowMs ?? Date.now()).toISOString();
  return updateChrono(state, profileId, (chrono) => ({
    ...chrono,
    seconds: 0,
    running: false,
    startedAt: null,
    lastMarkSeconds: 0
  }), nowIso);
}

export function finishChrono(state, profileId, options = {}) {
  const profile = requireProfile(state, profileId);
  const elapsed = getChronoSeconds(profile.data.chrono, options.nowMs ?? Date.now());
  return { state: resetChrono(state, profileId, options), elapsed };
}

export function markChronoRun(state, profileId, farmKey, options = {}) {
  const profile = requireProfile(state, profileId);
  const chrono = normalizedChrono(profile.data.chrono);
  if (!chrono.running) throw new ChronoOperationError("CHRONO_STOPPED", "Le chrono doit être lancé pour marquer un run.");
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const totalTime = getChronoSeconds(chrono, nowMs);
  const time = getChronoSplitSeconds(chrono, nowMs);
  if (time <= 0) throw new ChronoOperationError("EMPTY_MARK", "Impossible de marquer un run à 00:00:00.");
  const label = options.farmLabel || farmKey;
  const mark = {
    id: options.idFactory?.() || `chrono_${nowMs}_${chrono.marks.length}`,
    farm: farmKey,
    time,
    totalTime,
    date: nowIso,
    name: `${label} ${formatChrono(time)}`,
    mode: options.mode || "manual"
  };
  const next = updateChrono(state, profileId, (value) => ({
    ...value,
    lastMarkSeconds: totalTime,
    marks: [mark, ...value.marks]
  }), nowIso);
  return { state: next, mark };
}

export function clearChronoMarks(state, profileId, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  return updateChrono(state, profileId, (chrono) => ({
    ...chrono,
    marks: [],
    lastMarkSeconds: 0
  }), nowIso);
}

export function removeChronoMark(state, profileId, markId, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(options.nowMs ?? Date.now()).toISOString();
  return updateChrono(state, profileId, (chrono) => {
    const marks = chrono.marks.filter((mark) => mark.id !== markId);
    const elapsed = getChronoSeconds(chrono, nowMs);
    const lastMarkSeconds = marks.reduce((latest, mark) => {
      const total = Math.floor(Number(mark.totalTime) || 0);
      return total > latest && total <= elapsed ? total : latest;
    }, 0);
    return { ...chrono, marks, lastMarkSeconds };
  }, nowIso);
}

export function getChronoStats(profileData, farmKey, nowMs = Date.now(), options = {}) {
  const chrono = normalizedChrono(profileData?.chrono);
  const sinceMs = Number(options.sinceMs) || 0;
  const marks = chrono.marks.filter((mark) => {
    if (mark.farm !== farmKey || Number(mark.time) <= 0) return false;
    if (!sinceMs) return true;
    const markMs = Date.parse(mark.date);
    return Number.isFinite(markMs) && markMs >= sinceMs;
  });
  const times = marks.map((mark) => Math.floor(Number(mark.time)));
  return Object.freeze({
    running: chrono.running,
    elapsed: getChronoSeconds(chrono, nowMs),
    split: getChronoSplitSeconds(chrono, nowMs),
    markCount: marks.length,
    best: times.length ? Math.min(...times) : null,
    average: times.length ? Math.round(times.reduce((sum, value) => sum + value, 0) / times.length) : null,
    marks
  });
}

export function formatChrono(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor(value % 3600 / 60);
  const secs = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
