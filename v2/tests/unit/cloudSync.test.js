import assert from "node:assert/strict";
import test from "node:test";

import { resolveFamiliar } from "../../js/config/familiars.js";
import { createCloudSyncService, V2_CLOUD_OWNER_KEY } from "../../js/services/cloudSync.js";
import { createDefaultState } from "../../js/state/defaults.js";
import { createStateStore } from "../../js/state/store.js";
import { createCloudEnvelope } from "../../js/storage/cloud.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

function authStub(userId = 7) {
  return {
    api: null,
    getState: () => ({ authenticated: true, user: { id: userId } })
  };
}

test("un cloud vide reçoit automatiquement l'état local", async () => {
  const state = createDefaultState({ now: "2026-06-30T08:00:00.000Z" });
  const store = createStateStore(state, { resolveFamiliar });
  const storage = memoryStorage();
  const calls = [];
  const api = {
    request: async (path, options) => {
      calls.push({ path, options });
      if (!options) return { payload: null, revision: 0 };
      return { payload: JSON.parse(options.body).payload, revision: 1 };
    }
  };
  const sync = createCloudSyncService({ auth: authStub(), api, store, localStorage: storage, migrateOptions: { resolveFamiliar }, pollMs: 60000 });
  await sync.start({ id: 7 });
  sync.stop();
  assert.equal(calls[0].path, "/cloud/v2/save");
  assert.equal(calls[1].path, "/cloud/v2/save");
  assert.equal(JSON.parse(calls[1].options.body).expectedRevision, 0);
  assert.equal(storage.getItem(V2_CLOUD_OWNER_KEY), "7");
});

test("la première connexion applique le cloud existant sans écraser le local", async () => {
  const local = createDefaultState({ now: "2026-06-30T08:00:00.000Z" });
  const remoteState = { ...local, updatedAt: "2026-06-30T09:00:00.000Z", marker: "remote" };
  const remote = createCloudEnvelope(remoteState, { savedAt: remoteState.updatedAt, deviceId: "remote" });
  const store = createStateStore(local, { resolveFamiliar });
  const backups = [];
  const sync = createCloudSyncService({
    auth: authStub(),
    api: { request: async () => ({ payload: remote, revision: 4 }) },
    store,
    localStorage: memoryStorage(),
    migrateOptions: { resolveFamiliar },
    saveLocal: () => ({ ok: true }),
    createBackup: (state, reason) => backups.push({ state, reason }),
    pollMs: 60000
  });
  await sync.start({ id: 7 });
  sync.stop();
  assert.equal(store.getState().marker, "remote");
  assert.equal(backups.length, 1);
  assert.equal(backups[0].reason, "avant-premiere-connexion");
});

test("un changement local utilise la dernière révision serveur", async () => {
  const state = createDefaultState({ now: "2026-06-30T08:00:00.000Z" });
  const remote = createCloudEnvelope(state, { savedAt: state.updatedAt, deviceId: "remote" });
  const store = createStateStore(state, { resolveFamiliar });
  const storage = memoryStorage({ [V2_CLOUD_OWNER_KEY]: "7" });
  const writes = [];
  const api = {
    request: async (path, options) => {
      if (!options) return { payload: remote, revision: 8 };
      writes.push(JSON.parse(options.body));
      return { payload: writes.at(-1).payload, revision: 9 };
    }
  };
  const sync = createCloudSyncService({ auth: authStub(), api, store, localStorage: storage, migrateOptions: { resolveFamiliar }, pollMs: 60000 });
  await sync.start({ id: 7 });
  const changed = { ...store.getState(), updatedAt: "2026-06-30T10:00:00.000Z", marker: "changed" };
  store.replaceState(changed);
  await sync.flush(store.getState());
  sync.stop();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].expectedRevision, 8);
  assert.equal(writes[0].payload.store.marker, "changed");
});

test("un conflit plus récent côté serveur est appliqué après backup", async () => {
  const local = createDefaultState({ now: "2026-06-30T08:00:00.000Z" });
  const initialRemote = createCloudEnvelope(local, { savedAt: local.updatedAt, deviceId: "remote" });
  const newerState = { ...local, updatedAt: "2026-06-30T11:00:00.000Z", marker: "newer-remote" };
  const newerRemote = createCloudEnvelope(newerState, { savedAt: newerState.updatedAt, deviceId: "other-device" });
  const store = createStateStore(local, { resolveFamiliar });
  const storage = memoryStorage({ [V2_CLOUD_OWNER_KEY]: "7" });
  let putCount = 0;
  const api = {
    request: async (path, options) => {
      if (!options) return { payload: initialRemote, revision: 2 };
      putCount += 1;
      const error = Object.assign(new Error("Conflit"), {
        status: 409,
        code: "CLOUD_REVISION_CONFLICT",
        body: { payload: newerRemote, revision: 3 }
      });
      throw error;
    }
  };
  const backups = [];
  const sync = createCloudSyncService({
    auth: authStub(), api, store, localStorage: storage, migrateOptions: { resolveFamiliar },
    saveLocal: () => ({ ok: true }), createBackup: (_, reason) => backups.push(reason), pollMs: 60000
  });
  await sync.start({ id: 7 });
  const changed = { ...store.getState(), updatedAt: "2026-06-30T10:00:00.000Z", marker: "local" };
  store.replaceState(changed);
  await sync.flush(store.getState());
  sync.stop();
  assert.equal(putCount, 1);
  assert.equal(store.getState().marker, "newer-remote");
  assert.ok(backups.includes("avant-conflit-cloud"));
});

test("un nouveau compte vide ne recoit jamais les donnees du compte precedent", async () => {
  const previous = { ...createDefaultState({ now: "2026-06-30T08:00:00.000Z" }), marker: "ancien-compte" };
  const empty = { ...createDefaultState({ now: "2026-06-30T09:00:00.000Z" }), marker: "nouveau-compte" };
  const store = createStateStore(previous, { resolveFamiliar });
  const storage = memoryStorage({ [V2_CLOUD_OWNER_KEY]: "8" });
  const writes = [];
  const backups = [];
  const api = {
    request: async (path, options) => {
      if (!options) return { payload: null, revision: 0 };
      const body = JSON.parse(options.body);
      writes.push(body);
      return { payload: body.payload, revision: 1 };
    }
  };
  const sync = createCloudSyncService({
    auth: authStub(7), api, store, localStorage: storage, migrateOptions: { resolveFamiliar },
    createEmptyState: () => empty,
    createBackup: (_, reason) => backups.push(reason),
    saveLocal: () => ({ ok: true }),
    pollMs: 60000
  });
  await sync.start({ id: 7 });
  sync.stop();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].payload.store.marker, "nouveau-compte");
  assert.equal(store.getState().marker, "nouveau-compte");
  assert.ok(backups.includes("avant-changement-compte"));
});
