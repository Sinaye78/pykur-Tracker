import { cloneValue } from "../state/defaults.js";

export const HISTORY_KINDS = Object.freeze([
  "progression",
  "chrono",
  "profile",
  "edit",
  "milestone",
  "system",
  "error"
]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr");
}

export function inferHistoryKind(message, type = "info") {
  const text = normalizeText(message);
  if (type === "error" || text.includes("erreur") || text.includes("invalide")) return "error";
  if (text.includes("palier") || text.includes("objectif atteint") || text.includes("100%")) return "milestone";
  if (text.includes("chrono") || text.includes("session") || text.includes("temps marque")) return "chrono";
  if (text.includes("profil") && (text.includes("cree") || text.includes("renomm") || text.includes("supprim"))) return "profile";
  if (text.includes("modifi") || text.includes("corrig") || text.includes("compteur")) return "edit";
  if (text.includes("run") || text.includes("donjon") || text.includes("monstre") || text.includes("progression")) return "progression";
  return "system";
}

export function normalizeHistoryEntry(entry, index = 0) {
  const source = entry && typeof entry === "object" ? entry : { message: String(entry || "") };
  const date = Number.isNaN(new Date(source.date).getTime()) ? null : new Date(source.date).toISOString();
  const message = String(source.message || "Action sans description").trim() || "Action sans description";
  const kind = HISTORY_KINDS.includes(source.kind) ? source.kind : inferHistoryKind(message, source.type);
  return {
    id: String(source.id || `legacy-${date || "unknown"}-${index}`),
    message,
    kind,
    type: source.type === "error" ? "error" : source.type === "success" ? "success" : "info",
    date,
    farmKey: source.farmKey || source.farm || null,
    meta: source.meta && typeof source.meta === "object" ? cloneValue(source.meta) : {}
  };
}

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `history-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createHistoryEntry(input, options = {}) {
  const message = String(input?.message || "").trim();
  if (!message) throw new TypeError("Une entrée d'historique doit contenir un message.");
  const kind = HISTORY_KINDS.includes(input.kind) ? input.kind : inferHistoryKind(message, input.type);
  return normalizeHistoryEntry({
    ...input,
    id: input.id || options.idFactory?.() || createId(),
    date: input.date || options.now || new Date().toISOString(),
    kind
  });
}

export function appendHistoryEntry(state, profileId, input, options = {}) {
  if (!state?.profiles?.[profileId]) throw new RangeError("Profil introuvable pour l'historique.");
  const next = cloneValue(state);
  const current = Array.isArray(next.profiles[profileId].data.activity)
    ? next.profiles[profileId].data.activity
    : [];
  const entry = createHistoryEntry(input, options);
  const limit = Math.max(20, Number(options.limit) || 200);
  next.profiles[profileId].data.activity = [entry, ...current].slice(0, limit);
  next.updatedAt = entry.date || options.now || new Date().toISOString();
  return { state: next, entry };
}

export function clearHistory(state, profileId, options = {}) {
  if (!state?.profiles?.[profileId]) throw new RangeError("Profil introuvable pour l'historique.");
  const next = cloneValue(state);
  next.profiles[profileId].data.activity = [];
  next.updatedAt = options.now || new Date().toISOString();
  return next;
}

export function compactHistoryEntries(entries) {
  const sorted = (Array.isArray(entries) ? entries : [])
    .map(normalizeHistoryEntry)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  const compact = [];
  for (const entry of sorted) {
    const minute = entry.date?.slice(0, 16) || "unknown";
    const previous = compact[compact.length - 1];
    if (previous && previous.message === entry.message && previous.kind === entry.kind && previous.minute === minute) {
      previous.count += 1;
      continue;
    }
    compact.push({ ...entry, minute, count: 1 });
  }
  return compact;
}

export function selectHistoryEntries(profileData, filters = {}) {
  const query = normalizeText(filters.query);
  const kind = HISTORY_KINDS.includes(filters.kind) ? filters.kind : "all";
  const entries = compactHistoryEntries(profileData?.activity);
  return entries.filter((entry) => {
    if (kind !== "all" && entry.kind !== kind) return false;
    if (filters.farmKey && entry.farmKey !== filters.farmKey) return false;
    return !query || normalizeText(entry.message).includes(query);
  });
}

export function groupHistoryByDay(entries) {
  const groups = new Map();
  for (const entry of entries || []) {
    const key = entry.date?.slice(0, 10) || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => ({ date, entries: items }));
}

export function summarizeHistory(profileData, options = {}) {
  const entries = (Array.isArray(profileData?.activity) ? profileData.activity : []).map(normalizeHistoryEntry);
  const today = options.today || new Date().toISOString().slice(0, 10);
  return {
    total: entries.length,
    today: entries.filter((entry) => entry.date?.startsWith(today)).length,
    progression: entries.filter((entry) => entry.kind === "progression").length,
    chrono: entries.filter((entry) => entry.kind === "chrono").length
  };
}
