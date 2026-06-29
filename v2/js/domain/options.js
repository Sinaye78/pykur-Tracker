import { cloneValue, createDefaultSettings } from "../state/defaults.js";

const SETTING_RULES = Object.freeze({
  night: "boolean", animations: "boolean", tooltips: "boolean", sound: "boolean",
  autoMarkOnPlus: "boolean", chronoAutoStartOnRun: "boolean", hudMode: "boolean",
  showMilliseconds: "boolean", autoDungeonEstimate: "boolean", notifications: "boolean",
  notificationsPersistent: "boolean", disableMinorNotifications: "boolean",
  highContrast: "boolean", reducedSaturation: "boolean", largeFont: "boolean",
  shortcutsEnabled: "boolean", livingEvents: "boolean", passiveAmbience: "boolean",
  visualIntensity: ["minimal", "standard", "premium"],
  uiOpacity: ["opaque", "medium", "glass"],
  dashboardMode: ["simple", "focus", "tryhard", "analytics"],
  performanceMode: ["auto", "on", "off"],
  chronoStyle: ["technical", "fantasy", "compact", "overlay"],
  notificationSize: ["small", "normal", "large"]
});

function validateSetting(key, value) {
  const rule = SETTING_RULES[key];
  if (!rule) throw new Error(`Option inconnue : ${key}.`);
  if (rule === "boolean") return Boolean(value);
  if (Array.isArray(rule) && rule.includes(value)) return value;
  throw new Error(`Valeur invalide pour l'option ${key}.`);
}

function activeSettings(state) {
  return state.optionsShared
    ? state.sharedSettings
    : state.profiles?.[state.active]?.data?.settings;
}

export function updateSetting(state, key, value) {
  const next = cloneValue(state);
  const normalized = validateSetting(key, value);
  if (next.optionsShared) {
    next.sharedSettings = { ...createDefaultSettings(), ...(next.sharedSettings || {}), [key]: normalized };
    for (const profile of Object.values(next.profiles || {})) profile.data.settings = cloneValue(next.sharedSettings);
  } else {
    const profile = next.profiles?.[next.active];
    if (!profile) throw new Error("Aucun profil actif.");
    profile.data.settings = { ...createDefaultSettings(), ...(profile.data.settings || {}), [key]: normalized };
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

export function updateNotificationDuration(state, value) {
  const duration = [1800, 3200, 5200].includes(Number(value)) ? Number(value) : 3200;
  const next = cloneValue(state);
  if (next.optionsShared) {
    next.sharedSettings = { ...createDefaultSettings(), ...(next.sharedSettings || {}), notificationDuration: duration };
    for (const profile of Object.values(next.profiles || {})) profile.data.settings = cloneValue(next.sharedSettings);
  } else {
    const profile = next.profiles?.[next.active];
    if (!profile) throw new Error("Aucun profil actif.");
    profile.data.settings = { ...createDefaultSettings(), ...(profile.data.settings || {}), notificationDuration: duration };
  }
  return next;
}

export function updateSoundVolume(state, value) {
  const volume = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const next = cloneValue(state);
  const settings = { ...(activeSettings(next) || createDefaultSettings()), soundVolume: volume };
  if (next.optionsShared) {
    next.sharedSettings = settings;
    for (const profile of Object.values(next.profiles || {})) profile.data.settings = cloneValue(settings);
  } else if (next.profiles?.[next.active]) next.profiles[next.active].data.settings = settings;
  return next;
}

export function updateKeybind(state, actionId, value) {
  const next = cloneValue(state);
  const settings = { ...(activeSettings(next) || createDefaultSettings()) };
  settings.keybinds = { ...createDefaultSettings().keybinds, ...(settings.keybinds || {}), [actionId]: String(value || "") };
  if (next.optionsShared) {
    next.sharedSettings = settings;
    for (const profile of Object.values(next.profiles || {})) profile.data.settings = cloneValue(settings);
  } else if (next.profiles?.[next.active]) next.profiles[next.active].data.settings = settings;
  return next;
}

export function resetKeybinds(state) {
  const defaults = createDefaultSettings().keybinds;
  let next = cloneValue(state);
  for (const [key, value] of Object.entries(defaults)) next = updateKeybind(next, key, value);
  return next;
}

export function setOptionsShared(state, enabled) {
  const next = cloneValue(state);
  next.optionsShared = Boolean(enabled);
  if (next.optionsShared) {
    const source = next.profiles?.[next.active]?.data?.settings || next.sharedSettings || createDefaultSettings();
    next.sharedSettings = { ...createDefaultSettings(), ...cloneValue(source) };
    for (const profile of Object.values(next.profiles || {})) profile.data.settings = cloneValue(next.sharedSettings);
  }
  return next;
}

function mergeGallery(base = {}, extra = {}) {
  const merged = cloneValue(base);
  merged.completedPykurs = Array.isArray(merged.completedPykurs) ? merged.completedPykurs : [];
  merged.eventsDiscovered = { ...(merged.eventsDiscovered || {}) };
  merged.removedPykurs = { ...(merged.removedPykurs || {}), ...(extra.removedPykurs || {}) };
  merged.removedEvents = { ...(merged.removedEvents || {}), ...(extra.removedEvents || {}) };
  const seen = new Set(merged.completedPykurs.map((item) => item?.id).filter(Boolean));
  for (const item of extra.completedPykurs || []) {
    if (!item?.id || seen.has(item.id) || merged.removedPykurs[item.id]) continue;
    merged.completedPykurs.push(cloneValue(item));
    seen.add(item.id);
  }
  for (const [id, event] of Object.entries(extra.eventsDiscovered || {})) {
    if (!merged.removedEvents[id]) merged.eventsDiscovered[id] ||= cloneValue(event);
  }
  merged.completedPykurs = merged.completedPykurs
    .filter((item) => !merged.removedPykurs[item?.id])
    .map((item, index) => ({ ...item, number: index + 1 }));
  for (const id of Object.keys(merged.removedEvents)) delete merged.eventsDiscovered[id];
  return merged;
}

export function setGalleryShared(state, enabled) {
  const next = cloneValue(state);
  if (enabled && next.galleryShared === false) {
    for (const profile of Object.values(next.profiles || {})) next.sharedGallery = mergeGallery(next.sharedGallery, profile.data?.gallery);
  }
  next.galleryShared = Boolean(enabled);
  return next;
}
