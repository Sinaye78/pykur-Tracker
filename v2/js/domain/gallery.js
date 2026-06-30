import { createDefaultGallery, createDefaultProfileData, cloneValue } from "../state/defaults.js";
import { getProfileProgress } from "./progression.js";

export class GalleryOperationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GalleryOperationError";
    this.code = code;
  }
}

function profileOrThrow(state, profileId) {
  const profile = state?.profiles?.[profileId];
  if (!profile) throw new GalleryOperationError("PROFILE_NOT_FOUND", "Profil introuvable.");
  return profile;
}

function galleryTarget(state, profileId) {
  profileOrThrow(state, profileId);
  return state.sharedGallery;
}

function normalizedGallery(source = {}) {
  const gallery = { ...createDefaultGallery(), ...cloneValue(source || {}) };
  gallery.completedPykurs = Array.isArray(gallery.completedPykurs) ? gallery.completedPykurs : [];
  gallery.eventsDiscovered = { ...(gallery.eventsDiscovered || {}) };
  gallery.removedPykurs = { ...(gallery.removedPykurs || {}) };
  gallery.removedEvents = { ...(gallery.removedEvents || {}) };
  gallery.completedPykurs = gallery.completedPykurs
    .filter((item) => item && !gallery.removedPykurs[String(item.id || "")])
    .map((item, index) => ({ ...item, number: index + 1 }));
  for (const eventId of Object.keys(gallery.removedEvents)) delete gallery.eventsDiscovered[eventId];
  return gallery;
}

function replaceGallery(state, profileId, gallery) {
  profileOrThrow(state, profileId);
  state.sharedGallery = gallery;
  state.galleryShared = true;
}

function archiveTitle(gallery, stats) {
  if (!gallery.completedPykurs.length) return "Le Premier Éveil";
  if (stats.avgRun > 0 && stats.avgRun <= 120) return "Le Rapide";
  if (stats.totalRuns >= 350) return "Le Vétéran";
  if (stats.usedDungeons > 1) return "Le Méthodique";
  if (stats.durationSeconds >= 14 * 86400) return "Le Persévérant";
  return "Le Farmer";
}

export function selectGalleryForProfile(state, profileId = state?.active) {
  if (!profileId || !state?.profiles?.[profileId]) return createDefaultGallery();
  return normalizedGallery(galleryTarget(state, profileId));
}

export function buildFamiliarArchive(state, profileId, dependencies, options = {}) {
  const profile = profileOrThrow(state, profileId);
  const familiar = dependencies.resolveFamiliar(profile.data.familiarId);
  const runtime = dependencies.resolveRuntime(profile.data.familiarId);
  if (!familiar || !runtime) throw new GalleryOperationError("FAMILIAR_NOT_FOUND", "Familier introuvable.");
  const progress = getProfileProgress(profile.data, familiar, runtime);
  if (progress < familiar.objectiveMax) {
    throw new GalleryOperationError("OBJECTIVE_INCOMPLETE", "Ce familier n'a pas encore atteint son objectif.");
  }
  const nowMs = options.nowMs ?? Date.now();
  const finishedAt = options.nowIso || new Date(nowMs).toISOString();
  const createdAt = profile.data.createdAt || finishedAt;
  const durationSeconds = Math.max(0, Math.floor((nowMs - new Date(createdAt).getTime()) / 1000));
  const marks = (profile.data.chrono?.marks || []).map((mark) => Number(mark.time)).filter((value) => value > 0);
  const totalChrono = marks.reduce((sum, value) => sum + value, 0);
  const runDetails = familiar.dungeons.map((dungeon) => ({
    key: dungeon.key,
    label: dungeon.label,
    value: Math.max(0, Number(profile.data.runs?.[dungeon.key]) || 0)
  }));
  const totalRuns = runDetails.reduce((sum, item) => sum + item.value, 0);
  const usedDungeons = runDetails.filter((item) => item.value > 0).length;
  const method = usedDungeons > 1 ? "Mixte" : runDetails.find((item) => item.value > 0)?.label || familiar.progressLabel;
  const gallery = selectGalleryForProfile(state, profileId);
  const stats = {
    totalRuns,
    usedDungeons,
    durationSeconds,
    avgRun: marks.length ? Math.round(totalChrono / marks.length) : 0
  };
  return Object.freeze({
    id: options.id || `${familiar.id}_${nowMs}`,
    number: gallery.completedPykurs.length + 1,
    familiarId: familiar.id,
    familiarLabel: familiar.label,
    progressLabel: familiar.progressShort,
    objectiveMax: familiar.objectiveMax,
    profileName: profile.name,
    createdAt,
    finishedAt,
    durationSeconds,
    runDetails,
    pp: progress,
    totalChrono,
    bestRun: marks.length ? Math.min(...marks) : 0,
    avgRun: stats.avgRun,
    method,
    image: familiar.auraImage || familiar.image,
    title: archiveTitle(gallery, stats)
  });
}

export function archiveAndRestartFamiliar(state, profileId, dependencies, options = {}) {
  const profile = profileOrThrow(state, profileId);
  const familiar = dependencies.resolveFamiliar(profile.data.familiarId);
  const archive = buildFamiliarArchive(state, profileId, dependencies, options);
  const nowIso = options.nowIso || new Date(options.nowMs ?? Date.now()).toISOString();
  const next = cloneValue(state);
  const gallery = normalizedGallery(galleryTarget(next, profileId));
  delete gallery.removedPykurs[archive.id];
  gallery.completedPykurs.push(cloneValue(archive));
  gallery.completedPykurs = gallery.completedPykurs.map((item, index) => ({ ...item, number: index + 1 }));
  replaceGallery(next, profileId, gallery);

  const oldData = next.profiles[profileId].data;
  const fresh = createDefaultProfileData(familiar, { now: nowIso });
  fresh.settings = cloneValue(oldData.settings);
  fresh.achievements = cloneValue(oldData.achievements);
  fresh.dofusDetection = cloneValue(oldData.dofusDetection);
  fresh.ui = { ...fresh.ui, ...cloneValue(oldData.ui), farm: familiar.dungeons[0]?.key || fresh.ui.farm };
  fresh.gallery = cloneValue(oldData.gallery);
  fresh.gallery.currentCycleArchived = false;
  fresh.gallery.currentCycleCompletionSeen = false;
  next.profiles[profileId].data = fresh;
  next.updatedAt = nowIso;
  return Object.freeze({ state: next, archive });
}

export function removeGalleryArchive(state, profileId, archiveId, options = {}) {
  const next = cloneValue(state);
  const gallery = normalizedGallery(galleryTarget(next, profileId));
  const id = String(archiveId || "");
  if (!gallery.completedPykurs.some((item) => String(item.id) === id)) return state;
  gallery.completedPykurs = gallery.completedPykurs
    .filter((item) => String(item.id) !== id)
    .map((item, index) => ({ ...item, number: index + 1 }));
  gallery.removedPykurs[id] = options.nowIso || new Date().toISOString();
  replaceGallery(next, profileId, gallery);
  next.updatedAt = options.nowIso || new Date().toISOString();
  return next;
}

export function removeGalleryEvent(state, profileId, eventId, options = {}) {
  const next = cloneValue(state);
  const gallery = normalizedGallery(galleryTarget(next, profileId));
  const id = String(eventId || "");
  if (!gallery.eventsDiscovered[id]) return state;
  delete gallery.eventsDiscovered[id];
  gallery.removedEvents[id] = options.nowIso || new Date().toISOString();
  replaceGallery(next, profileId, gallery);
  next.updatedAt = options.nowIso || new Date().toISOString();
  return next;
}

export function resetGallery(state, profileId, options = {}) {
  const next = cloneValue(state);
  const current = normalizedGallery(galleryTarget(next, profileId));
  const nowIso = options.nowIso || new Date().toISOString();
  const reset = createDefaultGallery();
  reset.removedPykurs = { ...current.removedPykurs };
  reset.removedEvents = { ...current.removedEvents };
  for (const archive of current.completedPykurs) if (archive.id) reset.removedPykurs[String(archive.id)] = nowIso;
  for (const eventId of Object.keys(current.eventsDiscovered)) reset.removedEvents[eventId] = nowIso;
  replaceGallery(next, profileId, reset);
  next.updatedAt = nowIso;
  return next;
}

export function discoverGalleryEvent(state, profileId, eventId, options = {}) {
  profileOrThrow(state, profileId);
  const next = cloneValue(state);
  const gallery = normalizedGallery(galleryTarget(next, profileId));
  const id = String(eventId || "").trim();
  if (!id) return state;
  const nowIso = options.nowIso || new Date().toISOString();
  delete gallery.removedEvents[id];
  const current = gallery.eventsDiscovered[id] || { count: 0, firstSeen: nowIso, lastSeen: null };
  gallery.eventsDiscovered[id] = {
    ...current,
    count: Math.max(0, Number(current.count) || 0) + 1,
    firstSeen: current.firstSeen || nowIso,
    lastSeen: nowIso
  };
  replaceGallery(next, profileId, gallery);
  next.updatedAt = nowIso;
  return next;
}
