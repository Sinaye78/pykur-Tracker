import { cloneValue } from "../state/defaults.js";

export class SessionOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "SessionOperationError";
    this.code = code;
  }
}

function requireProfile(state, profileId) {
  const profile = state?.profiles?.[profileId];
  if (!profile) throw new SessionOperationError("PROFILE_NOT_FOUND", "Profil introuvable.");
  return profile;
}

function emptyRuns(farmKeys) {
  return Object.fromEntries(farmKeys.map((key) => [key, 0]));
}

function normalizeSession(session = {}, farmKeys = []) {
  const runs = emptyRuns(farmKeys);
  for (const key of farmKeys) runs[key] = Math.max(0, Math.floor(Number(session.runs?.[key]) || 0));
  return {
    active: Boolean(session.active),
    startedAt: Number.isFinite(Number(session.startedAt)) ? Number(session.startedAt) : null,
    sessionStartedAt: Number.isFinite(Number(session.sessionStartedAt)) ? Number(session.sessionStartedAt) : null,
    totalSeconds: Math.max(0, Math.floor(Number(session.totalSeconds) || 0)),
    runs,
    ppStart: Math.max(0, Number(session.ppStart) || 0),
    ppGain: Math.max(0, Number(session.ppGain) || 0),
    lastSummary: session.lastSummary ? cloneValue(session.lastSummary) : null
  };
}

function updateSession(state, profileId, farmKeys, updater, nowIso) {
  requireProfile(state, profileId);
  const next = cloneValue(state);
  const profile = next.profiles[profileId];
  profile.data.session = updater(normalizeSession(profile.data.session, farmKeys));
  next.updatedAt = nowIso;
  return next;
}

export function getSessionSeconds(session, nowMs = Date.now()) {
  const current = normalizeSession(session, Object.keys(session?.runs || {}));
  if (!current.active || current.startedAt === null) return current.totalSeconds;
  return current.totalSeconds + Math.max(0, Math.floor((nowMs - current.startedAt) / 1000));
}

export function sessionHasProgress(session, farmKeys = Object.keys(session?.runs || {})) {
  const current = normalizeSession(session, farmKeys);
  return current.totalSeconds > 0 || Object.values(current.runs).some((value) => value > 0);
}

export function startSession(state, profileId, farmKeys, currentProgress, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const current = normalizeSession(requireProfile(state, profileId).data.session, farmKeys);
  if (current.active) return state;
  const resume = sessionHasProgress(current, farmKeys);
  return updateSession(state, profileId, farmKeys, (session) => resume ? {
    ...session,
    active: true,
    startedAt: nowMs,
    sessionStartedAt: session.sessionStartedAt ?? nowMs
  } : {
    active: true,
    startedAt: nowMs,
    sessionStartedAt: nowMs,
    totalSeconds: 0,
    runs: emptyRuns(farmKeys),
    ppStart: Math.max(0, Number(currentProgress) || 0),
    ppGain: 0,
    lastSummary: null
  }, nowIso);
}

export function pauseSession(state, profileId, farmKeys, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const current = normalizeSession(requireProfile(state, profileId).data.session, farmKeys);
  if (!current.active) return state;
  return updateSession(state, profileId, farmKeys, (session) => ({
    ...session,
    active: false,
    totalSeconds: getSessionSeconds(session, nowMs),
    startedAt: null,
    sessionStartedAt: session.sessionStartedAt ?? session.startedAt ?? nowMs
  }), nowIso);
}

export function recordSessionRun(state, profileId, farmKeys, farmKey, delta, currentProgress, options = {}) {
  if (!farmKeys.includes(farmKey)) throw new SessionOperationError("FARM_NOT_FOUND", "Donjon introuvable dans cette session.");
  const current = normalizeSession(requireProfile(state, profileId).data.session, farmKeys);
  if (!current.active) return state;
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  return updateSession(state, profileId, farmKeys, (session) => ({
    ...session,
    runs: {
      ...session.runs,
      [farmKey]: Math.max(0, session.runs[farmKey] + Math.trunc(Number(delta) || 0))
    },
    ppGain: Math.max(0, (Number(currentProgress) || 0) - session.ppStart)
  }), nowIso);
}

export function resetSession(state, profileId, farmKeys, currentProgress = 0, options = {}) {
  const nowIso = options.nowIso || new Date(options.nowMs ?? Date.now()).toISOString();
  return updateSession(state, profileId, farmKeys, () => ({
    active: false,
    startedAt: null,
    sessionStartedAt: null,
    totalSeconds: 0,
    runs: emptyRuns(farmKeys),
    ppStart: Math.max(0, Number(currentProgress) || 0),
    ppGain: 0,
    lastSummary: null
  }), nowIso);
}

export function buildSessionSummary(session, farmKeys, progressShort, nowMs = Date.now()) {
  const current = normalizeSession(session, farmKeys);
  const elapsed = getSessionSeconds(current, nowMs);
  const totalRuns = Object.values(current.runs).reduce((sum, value) => sum + value, 0);
  const hours = elapsed / 3600;
  return Object.freeze({
    elapsed,
    farmRuns: cloneValue(current.runs),
    totalRuns,
    progressGain: current.ppGain,
    progressShort,
    runsHour: hours > 0 ? totalRuns / hours : 0,
    progressHour: hours > 0 ? current.ppGain / hours : 0,
    status: "Terminée"
  });
}

export function finishSession(state, profileId, farmKeys, currentProgress, progressShort, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  const nowIso = options.nowIso || new Date(nowMs).toISOString();
  const profile = requireProfile(state, profileId);
  const current = normalizeSession(profile.data.session, farmKeys);
  const synced = { ...current, ppGain: Math.max(0, (Number(currentProgress) || 0) - current.ppStart) };
  const summary = buildSessionSummary(synced, farmKeys, progressShort, nowMs);
  const next = updateSession(state, profileId, farmKeys, () => ({
    active: false,
    startedAt: null,
    sessionStartedAt: null,
    totalSeconds: 0,
    runs: emptyRuns(farmKeys),
    ppStart: Math.max(0, Number(currentProgress) || 0),
    ppGain: 0,
    lastSummary: cloneValue(summary)
  }), nowIso);
  return { state: next, summary };
}

export function getSessionStats(profileData, farmKeys, nowMs = Date.now(), options = {}) {
  const session = normalizeSession(profileData?.session, farmKeys);
  const totalRuns = Object.values(session.runs).reduce((sum, value) => sum + value, 0);
  const currentProgress = Number(options.currentProgress);
  const progressGain = Number.isFinite(currentProgress) && (session.active || sessionHasProgress(session, farmKeys))
    ? Math.max(0, currentProgress - session.ppStart)
    : session.ppGain;
  return Object.freeze({
    active: session.active,
    elapsed: getSessionSeconds(session, nowMs),
    totalRuns,
    farmRuns: cloneValue(session.runs),
    progressGain,
    hasProgress: sessionHasProgress(session, farmKeys),
    sessionStartedAt: session.sessionStartedAt,
    lastSummary: session.lastSummary
  });
}
