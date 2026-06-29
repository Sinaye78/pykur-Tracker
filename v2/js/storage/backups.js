import { migrateState } from "../state/migrations.js";
import { serializeState } from "../state/schema.js";
import { checksumText, isQuotaError, StorageOperationError } from "./local.js";

export const V2_BACKUP_INDEX_KEY = "familier_tracker_v2_backup_index";
export const V2_BACKUP_PREFIX = "familier_tracker_v2_backup_";

function safeIndex(storage, indexKey) {
  try {
    const value = JSON.parse(storage.getItem(indexKey) || "[]");
    return Array.isArray(value) ? value.filter((entry) => entry?.id && entry?.key) : [];
  } catch {
    return [];
  }
}

export function createBackupStorage(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const indexKey = options.indexKey || V2_BACKUP_INDEX_KEY;
  const prefix = options.prefix || V2_BACKUP_PREFIX;
  const maxEntries = Math.max(1, Number(options.maxEntries) || 5);
  const now = options.now || (() => new Date().toISOString());
  const idFactory = options.idFactory || (() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const migrateOptions = options.migrateOptions || {};
  const onError = options.onError;

  if (!storage) throw new StorageOperationError("UNAVAILABLE", "Le stockage des backups est indisponible.");

  function list() {
    return safeIndex(storage, indexKey).filter((entry) => storage.getItem(entry.key));
  }

  function remove(id) {
    const entries = safeIndex(storage, indexKey);
    const target = entries.find((entry) => entry.id === id);
    if (!target) return false;
    storage.removeItem(target.key);
    storage.setItem(indexKey, JSON.stringify(entries.filter((entry) => entry.id !== id)));
    return true;
  }

  function create(state, reason = "manual") {
    const createdAt = now();
    const id = idFactory();
    const key = `${prefix}${id}`;
    const payload = serializeState(state);
    const record = JSON.stringify({
      format: "familier-tracker-v2-backup",
      id,
      createdAt,
      reason,
      checksum: checksumText(payload),
      payload
    });
    const previous = safeIndex(storage, indexKey);
    const next = [{ id, key, createdAt, reason }, ...previous].slice(0, maxEntries);

    try {
      storage.setItem(key, record);
      storage.setItem(indexKey, JSON.stringify(next));
      for (const stale of previous.filter((entry) => !next.some((item) => item.id === entry.id))) {
        storage.removeItem(stale.key);
      }
      return { ok: true, backup: next[0] };
    } catch (cause) {
      storage.removeItem(key);
      const error = new StorageOperationError(
        isQuotaError(cause) ? "QUOTA_EXCEEDED" : "BACKUP_FAILED",
        "La sauvegarde de sécurité a échoué.",
        { cause, userMessage: "Impossible de créer la sauvegarde de sécurité." }
      );
      if (typeof onError === "function") onError(error);
      return { ok: false, error };
    }
  }

  function restore(id) {
    const entry = safeIndex(storage, indexKey).find((item) => item.id === id);
    if (!entry) throw new StorageOperationError("BACKUP_NOT_FOUND", "Sauvegarde de sécurité introuvable.");
    try {
      const record = JSON.parse(storage.getItem(entry.key));
      if (record?.format !== "familier-tracker-v2-backup" || typeof record.payload !== "string") {
        throw new Error("Format de backup invalide.");
      }
      if (checksumText(record.payload) !== record.checksum) throw new Error("Checksum invalide.");
      return migrateState(JSON.parse(record.payload), migrateOptions);
    } catch (cause) {
      throw new StorageOperationError("CORRUPT_BACKUP", "La sauvegarde de sécurité est corrompue.", {
        cause,
        userMessage: "Cette sauvegarde de sécurité ne peut pas être restaurée."
      });
    }
  }

  return Object.freeze({ create, list, restore, remove, indexKey, prefix });
}
