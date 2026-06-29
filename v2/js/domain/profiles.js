import { cloneValue, createDefaultProfileData } from "../state/defaults.js";

export class ProfileOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProfileOperationError";
    this.code = code;
  }
}

export function normalizeProfileName(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function createProfileCleanupRegistry(options = {}) {
  const cleanups = new Set();
  function register(cleanup) {
    if (typeof cleanup !== "function") throw new TypeError("Le nettoyage doit être une fonction.");
    cleanups.add(cleanup);
    return () => cleanups.delete(cleanup);
  }
  function run() {
    for (const cleanup of cleanups) {
      try { cleanup(); } catch (error) { options.onError?.(error); }
    }
    cleanups.clear();
  }
  return Object.freeze({ register, run, size: () => cleanups.size });
}

function requireProfile(state, profileId) {
  const profile = state.profiles?.[profileId];
  if (!profile) throw new ProfileOperationError("PROFILE_NOT_FOUND", "Profil introuvable.");
  return profile;
}

export function createProfile(state, input, options = {}) {
  const familiar = options.resolveFamiliar?.(input.familiarId);
  if (!familiar) throw new ProfileOperationError("FAMILIAR_NOT_FOUND", "Familier introuvable.");
  const name = normalizeProfileName(input.name || familiar.defaultProfileName);
  if (!name) throw new ProfileOperationError("INVALID_NAME", "Le nom du profil est requis.");
  const profileId = options.idFactory?.() || `p_${Date.now()}`;
  if (state.profiles?.[profileId] || state.deletedProfiles?.[profileId]) {
    throw new ProfileOperationError("PROFILE_ID_CONFLICT", "Cet identifiant de profil a déjà été utilisé.");
  }
  const now = options.now || new Date().toISOString();
  const next = cloneValue(state);
  next.profiles[profileId] = {
    name,
    data: createDefaultProfileData(familiar, { now })
  };
  next.active = profileId;
  next.needsFamiliarChoice = false;
  next.updatedAt = now;
  return { state: next, profileId };
}

export function renameProfile(state, profileId, name, options = {}) {
  requireProfile(state, profileId);
  const normalized = normalizeProfileName(name);
  if (!normalized) throw new ProfileOperationError("INVALID_NAME", "Le nom du profil est requis.");
  const next = cloneValue(state);
  next.profiles[profileId].name = normalized;
  next.updatedAt = options.now || new Date().toISOString();
  return next;
}

export function switchProfile(state, profileId, options = {}) {
  requireProfile(state, profileId);
  if (state.active === profileId) return state;
  const next = cloneValue(state);
  next.active = profileId;
  next.needsFamiliarChoice = false;
  next.updatedAt = options.now || new Date().toISOString();
  return next;
}

export function deleteProfile(state, profileId, options = {}) {
  const profile = requireProfile(state, profileId);
  const profileIds = Object.keys(state.profiles || {});
  if (profileIds.length <= 1 && options.allowLastProfile !== true) {
    throw new ProfileOperationError("LAST_PROFILE", "Le dernier profil ne peut pas être supprimé.");
  }
  const now = options.now || new Date().toISOString();
  const next = cloneValue(state);
  next.deletedProfiles[profileId] = {
    deletedAt: now,
    name: profile.name,
    familiarId: profile.data?.familiarId || null
  };
  delete next.profiles[profileId];
  if (next.active === profileId) next.active = Object.keys(next.profiles)[0] || null;
  next.needsFamiliarChoice = next.active === null;
  next.updatedAt = now;
  return next;
}

export function pageFamiliars(entries, page = 0, pageSize = 4) {
  const size = Math.max(1, Number(pageSize) || 4);
  const pageCount = Math.max(1, Math.ceil(entries.length / size));
  const currentPage = Math.max(0, Math.min(Number(page) || 0, pageCount - 1));
  return {
    entries: entries.slice(currentPage * size, currentPage * size + size),
    page: currentPage,
    pageCount,
    total: entries.length
  };
}
