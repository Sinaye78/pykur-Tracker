import { migrateState } from "../state/migrations.js";
import { serializeState } from "../state/schema.js";

export const V2_STATE_KEY = "familier_tracker_v2_state";
export const V2_STAGING_KEY = "familier_tracker_v2_state_staging";
export const V1_STATE_KEYS = Object.freeze(["pykur_clean_v1"]);

export class StorageOperationError extends Error {
  constructor(code, message, options = {}) {
    super(message, { cause: options.cause });
    this.name = "StorageOperationError";
    this.code = code;
    this.userMessage = options.userMessage || message;
    this.recoverable = options.recoverable !== false;
  }
}

export function checksumText(text) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function isQuotaError(error) {
  return error?.name === "QuotaExceededError"
    || error?.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || error?.code === 22
    || error?.code === 1014;
}

function encodeEnvelope(state, now) {
  const payload = serializeState(state);
  return JSON.stringify({
    format: "familier-tracker-v2-state",
    writtenAt: now(),
    checksum: checksumText(payload),
    payload
  });
}

function decodeEnvelope(raw, migrateOptions) {
  const parsed = JSON.parse(raw);
  if (parsed?.format !== "familier-tracker-v2-state") {
    return migrateState(parsed, migrateOptions);
  }
  if (typeof parsed.payload !== "string" || checksumText(parsed.payload) !== parsed.checksum) {
    throw new StorageOperationError(
      "CORRUPT_STATE",
      "La sauvegarde locale est incomplète ou corrompue.",
      { userMessage: "Sauvegarde locale corrompue. Une copie de secours va être recherchée." }
    );
  }
  return migrateState(JSON.parse(parsed.payload), migrateOptions);
}

function report(onError, error) {
  if (typeof onError === "function") onError(error);
}

function envelopeTime(raw) {
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw);
    return parsed?.format === "familier-tracker-v2-state" ? Date.parse(parsed.writtenAt || "") || 0 : 0;
  } catch {
    return 0;
  }
}

export function createLocalStateStorage(options = {}) {
  const storage = options.storage ?? globalThis.localStorage;
  const key = options.key || V2_STATE_KEY;
  const stagingKey = options.stagingKey || V2_STAGING_KEY;
  const legacyKeys = options.legacyKeys || V1_STATE_KEYS;
  const now = options.now || (() => new Date().toISOString());
  const migrateOptions = options.migrateOptions || {};
  const onError = options.onError;

  if (!storage) {
    throw new StorageOperationError("UNAVAILABLE", "Le stockage local est indisponible.", {
      userMessage: "Sauvegarde locale indisponible dans ce navigateur.",
      recoverable: false
    });
  }

  function save(state) {
    let encoded;
    try {
      encoded = encodeEnvelope(state, now);
      storage.setItem(stagingKey, encoded);
      storage.setItem(key, encoded);
      storage.removeItem(stagingKey);
      return { ok: true, key, savedAt: JSON.parse(encoded).writtenAt };
    } catch (cause) {
      const quota = isQuotaError(cause);
      const error = new StorageOperationError(
        quota ? "QUOTA_EXCEEDED" : "WRITE_FAILED",
        quota ? "Le quota du stockage local est dépassé." : "La sauvegarde locale a échoué.",
        {
          cause,
          userMessage: quota
            ? "Espace de sauvegarde insuffisant. Vos dernières données restent en mémoire."
            : "Erreur de sauvegarde locale. Vos dernières données restent en mémoire."
        }
      );
      report(onError, error);
      return { ok: false, error, staged: Boolean(encoded && storage.getItem(stagingKey)) };
    }
  }

  function load() {
    const mainRaw = storage.getItem(key);
    const stagingRaw = storage.getItem(stagingKey);
    const localCandidates = envelopeTime(stagingRaw) > envelopeTime(mainRaw)
      ? [
        { key: stagingKey, source: "staging", recovered: true, raw: stagingRaw },
        { key, source: "v2", recovered: false, raw: mainRaw }
      ]
      : [
        { key, source: "v2", recovered: false, raw: mainRaw },
        { key: stagingKey, source: "staging", recovered: true, raw: stagingRaw }
      ];
    const candidates = [
      ...localCandidates,
      ...legacyKeys.map((legacyKey) => ({ key: legacyKey, source: "v1", recovered: false }))
    ];
    const failures = [];

    for (const candidate of candidates) {
      const raw = candidate.raw ?? storage.getItem(candidate.key);
      if (!raw) continue;
      try {
        return {
          ok: true,
          state: decodeEnvelope(raw, migrateOptions),
          source: candidate.source,
          sourceKey: candidate.key,
          recovered: candidate.recovered,
          failures
        };
      } catch (cause) {
        const error = cause instanceof StorageOperationError
          ? cause
          : new StorageOperationError("READ_FAILED", `Lecture impossible pour ${candidate.key}.`, {
            cause,
            userMessage: "Une sauvegarde locale illisible a été ignorée."
          });
        failures.push({ key: candidate.key, error });
        report(onError, error);
      }
    }
    return { ok: true, state: null, source: "empty", sourceKey: null, recovered: false, failures };
  }

  function commitRecoveredState(state) {
    const result = save(state);
    if (result.ok) storage.removeItem(stagingKey);
    return result;
  }

  function clearV2() {
    storage.removeItem(key);
    storage.removeItem(stagingKey);
  }

  return Object.freeze({ save, load, commitRecoveredState, clearV2, key, stagingKey, legacyKeys });
}
