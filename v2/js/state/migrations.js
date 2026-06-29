import {
  cloneValue,
  createDefaultAchievements,
  createDefaultGallery,
  createDefaultProfileData,
  createDefaultSettings,
  createDefaultState,
  DEFAULT_PYKUR_STATE_DEFINITION
} from "./defaults.js";
import { CURRENT_STATE_VERSION, isRecord } from "./schema.js";

function mergeDefaults(defaults, value) {
  if (value === undefined) return cloneValue(defaults);
  if (Array.isArray(defaults)) return Array.isArray(value) ? cloneValue(value) : cloneValue(defaults);
  if (!isRecord(defaults) || !isRecord(value)) return cloneValue(value);
  const result = cloneValue(defaults);
  for (const [key, entry] of Object.entries(value)) {
    result[key] = key in defaults ? mergeDefaults(defaults[key], entry) : cloneValue(entry);
  }
  return result;
}

function derivedDefinition(data, resolveFamiliar) {
  const familiarId = typeof data?.familiarId === "string" && data.familiarId ? data.familiarId : "pykur";
  const configured = resolveFamiliar?.(familiarId);
  if (configured) return configured;
  const farmKeys = Object.keys(isRecord(data?.runs) ? data.runs : {}).filter((key) => key !== "zone");
  if (!farmKeys.length && familiarId === "pykur") return DEFAULT_PYKUR_STATE_DEFINITION;
  return {
    id: familiarId,
    dungeons: farmKeys.map((key) => ({ key, defaultAverage: 120 })),
    specialDefaults: isRecord(data?.special) ? data.special : {}
  };
}

function normalizeProfile(profile, profileId, options) {
  const source = isRecord(profile) ? profile : {};
  const sourceData = isRecord(source.data) ? source.data : {};
  const definition = derivedDefinition(sourceData, options.resolveFamiliar);
  const defaults = createDefaultProfileData(definition, { now: options.now });
  const data = mergeDefaults(defaults, sourceData);
  data.familiarId = definition.id || sourceData.familiarId || "pykur";
  return {
    ...cloneValue(source),
    name: typeof source.name === "string" && source.name.trim() ? source.name : `Profil ${profileId}`,
    data
  };
}

function mergeLegacyGalleries(galleries) {
  const merged = createDefaultGallery();
  const archiveIds = new Set();
  for (const gallery of galleries.filter(isRecord)) {
    Object.assign(merged.removedPykurs, cloneValue(gallery.removedPykurs || {}));
    Object.assign(merged.removedEvents, cloneValue(gallery.removedEvents || {}));
    for (const archive of Array.isArray(gallery.completedPykurs) ? gallery.completedPykurs : []) {
      const id = archive?.id ? String(archive.id) : "";
      if (id && archiveIds.has(id)) continue;
      merged.completedPykurs.push(cloneValue(archive));
      if (id) archiveIds.add(id);
    }
    for (const [id, event] of Object.entries(gallery.eventsDiscovered || {})) {
      if (!(id in merged.eventsDiscovered)) merged.eventsDiscovered[id] = cloneValue(event);
    }
    merged.currentCycleArchived ||= Boolean(gallery.currentCycleArchived);
    merged.currentCycleCompletionSeen ||= Boolean(gallery.currentCycleCompletionSeen);
  }
  merged.completedPykurs = merged.completedPykurs.filter((archive) => !merged.removedPykurs[String(archive?.id || "")]);
  for (const id of Object.keys(merged.removedEvents)) delete merged.eventsDiscovered[id];
  return merged;
}

function mergeLegacyAchievements(entries) {
  const merged = createDefaultAchievements();
  for (const achievements of entries.filter(isRecord)) {
    Object.assign(merged.removedUnlocked, cloneValue(achievements.removedUnlocked || {}));
    Object.assign(merged.unlocked, cloneValue(achievements.unlocked || {}));
    for (const [key, value] of Object.entries(achievements.counters || {})) {
      merged.counters[key] = Math.max(Number(merged.counters[key]) || 0, Number(value) || 0);
    }
    merged.secretCategoriesUnlocked ||= Boolean(achievements.secretCategoriesUnlocked);
    merged.eggCollected ||= Boolean(achievements.eggCollected);
  }
  for (const id of Object.keys(merged.removedUnlocked)) delete merged.unlocked[id];
  return merged;
}

export function migrateState(input, options = {}) {
  const now = options.now || new Date().toISOString();
  const source = isRecord(input) ? cloneValue(input) : {};
  if (Number(source.schemaVersion || 0) > CURRENT_STATE_VERSION) {
    throw new RangeError(`Schéma ${source.schemaVersion} plus récent que la V2.`);
  }

  const defaults = createDefaultState({ now });
  const migrated = mergeDefaults(defaults, source);
  migrated.schemaVersion = CURRENT_STATE_VERSION;
  migrated.deletedProfiles = isRecord(source.deletedProfiles) ? cloneValue(source.deletedProfiles) : {};
  migrated.profiles = {};

  for (const [id, profile] of Object.entries(isRecord(source.profiles) ? source.profiles : {})) {
    if (migrated.deletedProfiles[id]) continue;
    migrated.profiles[id] = normalizeProfile(profile, id, { ...options, now });
  }

  const profileEntries = Object.values(migrated.profiles);
  const activeId = typeof source.active === "string" && migrated.profiles[source.active]
    ? source.active
    : Object.keys(migrated.profiles)[0] || null;
  migrated.active = activeId;
  migrated.needsFamiliarChoice = activeId ? Boolean(source.needsFamiliarChoice) : true;

  if (!isRecord(source.sharedGallery)) {
    migrated.sharedGallery = mergeLegacyGalleries(profileEntries.map((profile) => profile.data.gallery));
  }
  if (!isRecord(source.sharedSettings)) {
    migrated.sharedSettings = mergeDefaults(createDefaultSettings(), activeId ? migrated.profiles[activeId].data.settings : {});
  }
  if (!isRecord(source.sharedAchievements) || source.achievementAccountMode !== 1) {
    migrated.sharedAchievements = mergeLegacyAchievements([
      source.sharedAchievements,
      ...profileEntries.map((profile) => profile.data.achievements)
    ]);
  }
  migrated.achievementsShared = true;
  migrated.achievementAccountMode = 1;
  migrated.updatedAt = typeof source.updatedAt === "string" ? source.updatedAt : now;
  return migrated;
}
