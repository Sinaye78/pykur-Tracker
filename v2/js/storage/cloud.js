import { migrateState } from "../state/migrations.js";
import { serializeState } from "../state/schema.js";
import { checksumText, StorageOperationError } from "./local.js";

function timestamp(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createCloudEnvelope(state, options = {}) {
  const payloadText = serializeState(state);
  return {
    format: "familier-tracker-v2-cloud",
    schemaVersion: state.schemaVersion,
    savedAt: options.savedAt || new Date().toISOString(),
    deviceId: options.deviceId || "unknown-device",
    baseRevision: options.baseRevision ?? null,
    checksum: checksumText(payloadText),
    store: JSON.parse(payloadText)
  };
}

export function readCloudEnvelope(envelope, migrateOptions = {}) {
  if (!envelope || envelope.format !== "familier-tracker-v2-cloud" || !envelope.store) {
    throw new StorageOperationError("INVALID_CLOUD_PAYLOAD", "Sauvegarde cloud invalide.");
  }
  const payloadText = serializeState(migrateState(envelope.store, migrateOptions));
  if (checksumText(payloadText) !== envelope.checksum) {
    throw new StorageOperationError("CORRUPT_CLOUD_PAYLOAD", "Sauvegarde cloud corrompue.");
  }
  return migrateState(envelope.store, migrateOptions);
}

export function compareCloudEnvelopes(localEnvelope, remoteEnvelope) {
  if (!localEnvelope && !remoteEnvelope) return { status: "empty", preferred: null, requiresConfirmation: false };
  if (!remoteEnvelope) return { status: "local-only", preferred: "local", requiresConfirmation: false };
  if (!localEnvelope) return { status: "cloud-only", preferred: "cloud", requiresConfirmation: true };
  if (localEnvelope.checksum === remoteEnvelope.checksum) {
    return { status: "identical", preferred: "local", requiresConfirmation: false };
  }
  const localTime = timestamp(localEnvelope.savedAt);
  const remoteTime = timestamp(remoteEnvelope.savedAt);
  if (localTime === remoteTime) return { status: "conflict", preferred: null, requiresConfirmation: true };
  return localTime > remoteTime
    ? { status: "local-newer", preferred: "local", requiresConfirmation: true }
    : { status: "cloud-newer", preferred: "cloud", requiresConfirmation: true };
}

export function prepareCloudTransfer(localState, remoteEnvelope, options = {}) {
  const localEnvelope = localState ? createCloudEnvelope(localState, options) : null;
  return Object.freeze({
    localEnvelope,
    remoteEnvelope: remoteEnvelope || null,
    decision: compareCloudEnvelopes(localEnvelope, remoteEnvelope),
    applyAutomatically: false
  });
}
