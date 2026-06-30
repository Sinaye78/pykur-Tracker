import { compareCloudEnvelopes, createCloudEnvelope, readCloudEnvelope } from "../storage/cloud.js";

export const V2_CLOUD_OWNER_KEY = "familier_tracker_v2_cloud_owner";
export const V2_CLOUD_DEVICE_KEY = "familier_tracker_v2_cloud_device";

function time(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function deviceId(storage, cryptoLike = globalThis.crypto) {
  let value = storage?.getItem?.(V2_CLOUD_DEVICE_KEY) || "";
  if (value) return value;
  value = cryptoLike?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  storage?.setItem?.(V2_CLOUD_DEVICE_KEY, value);
  return value;
}

export function createCloudSyncService(options) {
  const {
    auth,
    store,
    localStorage = globalThis.localStorage,
    migrateOptions = {},
    saveLocal,
    createBackup,
    onRemoteApplying,
    onRemoteApplied,
    onStatus,
    createEmptyState,
    now = () => new Date().toISOString(),
    debounceMs = 500,
    pollMs = 15000
  } = options;
  const api = options.api || auth.api;
  const device = deviceId(localStorage, options.crypto);
  let revision = 0;
  let activeUserId = null;
  let timer = null;
  let pollTimer = null;
  let pendingState = null;
  let syncing = null;
  let suppressNextSchedule = false;
  let lastChecksum = "";

  function status(value, details = {}) {
    onStatus?.({ value, revision, ...details });
  }

  function owner() {
    return localStorage?.getItem?.(V2_CLOUD_OWNER_KEY) || "";
  }

  function setOwner(userId) {
    if (userId) localStorage?.setItem?.(V2_CLOUD_OWNER_KEY, String(userId));
  }

  function localEnvelope(state = store.getState()) {
    return createCloudEnvelope(state, {
      savedAt: state.updatedAt || now(),
      deviceId: device,
      baseRevision: revision
    });
  }

  function applyRemote(envelope, reason = "cloud") {
    const remoteState = readCloudEnvelope(envelope, migrateOptions);
    createBackup?.(store.getState(), `avant-${reason}`);
    onRemoteApplying?.();
    suppressNextSchedule = true;
    store.replaceState(remoteState);
    saveLocal?.(remoteState);
    suppressNextSchedule = false;
    lastChecksum = envelope.checksum;
    onRemoteApplied?.(remoteState);
    return remoteState;
  }

  async function putEnvelope(envelope, expectedRevision = revision) {
    const result = await api.request("/cloud/v2/save", {
      method: "PUT",
      body: JSON.stringify({ payload: envelope, expectedRevision })
    });
    revision = Number(result.revision || revision + 1);
    lastChecksum = result.payload?.checksum || envelope.checksum;
    setOwner(activeUserId);
    status("synced", { savedAt: result.payload?.savedAt || now() });
    return result;
  }

  async function resolveConflict(local, error) {
    const remoteEnvelope = error.body?.payload || null;
    revision = Number(error.body?.revision || revision);
    if (!remoteEnvelope) return putEnvelope(local, revision);
    const remoteTime = time(remoteEnvelope.store?.updatedAt || remoteEnvelope.savedAt);
    const localTime = time(local.store?.updatedAt || local.savedAt);
    if (localTime > remoteTime) return putEnvelope(local, revision);
    applyRemote(remoteEnvelope, "conflit-cloud");
    status("synced", { savedAt: remoteEnvelope.savedAt, remoteApplied: true });
    return { ok: true, payload: remoteEnvelope, revision };
  }

  async function flush(state = pendingState || store.getState()) {
    if (!activeUserId || !auth.getState().authenticated) return null;
    pendingState = null;
    clearTimeout(timer);
    timer = null;
    const envelope = localEnvelope(state);
    if (envelope.checksum === lastChecksum) return null;
    if (syncing) {
      pendingState = state;
      return syncing;
    }
    status("syncing");
    syncing = putEnvelope(envelope).catch(async (error) => {
      if (error.status === 409 && error.code === "CLOUD_REVISION_CONFLICT") {
        return resolveConflict(envelope, error);
      }
      status("error", { error });
      throw error;
    }).finally(() => {
      syncing = null;
      if (pendingState) schedule(pendingState);
    });
    return syncing;
  }

  function schedule(state = store.getState()) {
    if (suppressNextSchedule || !activeUserId || !auth.getState().authenticated) return;
    pendingState = state;
    clearTimeout(timer);
    timer = setTimeout(() => flush().catch(() => {}), debounceMs);
  }

  async function pullLatest({ initial = false } = {}) {
    if (!activeUserId || !auth.getState().authenticated) return null;
    if (!initial && syncing) await syncing;
    if (!initial && pendingState) await flush();
    status(initial ? "loading" : "checking");
    try {
      const result = await api.request("/cloud/v2/save");
      const remote = result.payload || null;
      revision = Number(result.revision || 0);
      if (!remote) {
        if (owner() && owner() !== String(activeUserId) && createEmptyState) {
          const emptyState = createEmptyState();
          createBackup?.(store.getState(), "avant-changement-compte");
          onRemoteApplying?.();
          suppressNextSchedule = true;
          store.replaceState(emptyState);
          saveLocal?.(emptyState);
          suppressNextSchedule = false;
          onRemoteApplied?.(emptyState);
        }
        await putEnvelope(localEnvelope(), revision);
        return { source: "local", uploaded: true };
      }

      const local = localEnvelope();
      const sameOwner = owner() === String(activeUserId);
      if (!sameOwner) {
        applyRemote(remote, owner() ? "changement-compte" : "premiere-connexion");
        setOwner(activeUserId);
        status("synced", { remoteApplied: true, savedAt: remote.savedAt });
        return { source: "cloud", remoteApplied: true };
      }

      const decision = compareCloudEnvelopes(local, remote);
      if (decision.status === "identical") {
        lastChecksum = remote.checksum;
        status("synced", { savedAt: remote.savedAt });
        return { source: "identical" };
      }
      const localTime = time(local.store?.updatedAt || local.savedAt);
      const remoteTime = time(remote.store?.updatedAt || remote.savedAt);
      if (localTime > remoteTime) {
        await putEnvelope(local, revision);
        return { source: "local", uploaded: true };
      }
      applyRemote(remote, "synchronisation-cloud");
      status("synced", { remoteApplied: true, savedAt: remote.savedAt });
      return { source: "cloud", remoteApplied: true };
    } catch (error) {
      status("error", { error });
      throw error;
    }
  }

  function stop() {
    clearTimeout(timer);
    clearInterval(pollTimer);
    timer = null;
    pollTimer = null;
    pendingState = null;
    activeUserId = null;
    revision = 0;
    lastChecksum = "";
    status("idle");
  }

  async function start(user) {
    const userId = user?.id;
    if (!userId) return stop();
    if (String(activeUserId) === String(userId) && pollTimer) return null;
    stop();
    activeUserId = userId;
    const result = await pullLatest({ initial: true });
    pollTimer = setInterval(() => pullLatest().catch(() => {}), pollMs);
    pollTimer.unref?.();
    return result;
  }

  return Object.freeze({ start, stop, schedule, flush, pullLatest, getRevision: () => revision });
}
