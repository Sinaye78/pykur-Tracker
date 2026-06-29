import assert from "node:assert/strict";
import test from "node:test";

import { createDefaultState } from "../../js/state/defaults.js";
import { createBackupStorage } from "../../js/storage/backups.js";
import { compareCloudEnvelopes, createCloudEnvelope, prepareCloudTransfer, readCloudEnvelope } from "../../js/storage/cloud.js";
import { createIndexedDbAssetStorage } from "../../js/storage/indexedDb.js";
import { createLocalStateStorage, V1_STATE_KEYS } from "../../js/storage/local.js";

const FIXED_NOW = "2026-06-28T16:00:00.000Z";

function createMemoryStorage(options = {}) {
  const values = new Map(Object.entries(options.initial || {}));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) {
      if (options.failOnKey === key) {
        const error = new Error("Quota reached");
        error.name = "QuotaExceededError";
        throw error;
      }
      values.set(key, String(value));
    },
    removeItem(key) { values.delete(key); },
    dump() { return Object.fromEntries(values); }
  };
}

function stateWithTombstone() {
  const state = createDefaultState({ now: FIXED_NOW });
  state.deletedProfiles.deleted_1 = { deletedAt: FIXED_NOW };
  state.updatedAt = FIXED_NOW;
  return state;
}

test("la sauvegarde locale V2 se recharge sans toucher à la clé V1", () => {
  const v1Raw = JSON.stringify({ active: null, profiles: {}, marker: "v1" });
  const storage = createMemoryStorage({ initial: { [V1_STATE_KEYS[0]]: v1Raw } });
  const adapter = createLocalStateStorage({ storage, now: () => FIXED_NOW });
  const state = stateWithTombstone();

  assert.equal(adapter.save(state).ok, true);
  const loaded = adapter.load();
  assert.equal(loaded.source, "v2");
  assert.deepEqual(loaded.state.deletedProfiles, state.deletedProfiles);
  assert.equal(storage.getItem(V1_STATE_KEYS[0]), v1Raw);
  assert.equal(storage.getItem(adapter.stagingKey), null);
});

test("une sauvegarde V1 seule est lue mais jamais réécrite automatiquement", () => {
  const v1Raw = JSON.stringify({ active: null, profiles: {}, deletedProfiles: { old: { deletedAt: FIXED_NOW } } });
  const storage = createMemoryStorage({ initial: { [V1_STATE_KEYS[0]]: v1Raw } });
  const adapter = createLocalStateStorage({ storage, now: () => FIXED_NOW });
  const loaded = adapter.load();

  assert.equal(loaded.source, "v1");
  assert.ok(loaded.state.deletedProfiles.old);
  assert.equal(storage.getItem(adapter.key), null);
  assert.equal(storage.getItem(V1_STATE_KEYS[0]), v1Raw);
});

test("un échec de quota est signalé et laisse une copie de préparation récupérable", () => {
  const storage = createMemoryStorage({ failOnKey: "main" });
  const errors = [];
  const adapter = createLocalStateStorage({
    storage,
    key: "main",
    stagingKey: "staging",
    legacyKeys: [],
    now: () => FIXED_NOW,
    onError: (error) => errors.push(error)
  });
  const result = adapter.save(stateWithTombstone());

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "QUOTA_EXCEEDED");
  assert.equal(result.staged, true);
  assert.equal(errors[0].userMessage.includes("Espace"), true);
  const recovered = adapter.load();
  assert.equal(recovered.source, "staging");
  assert.equal(recovered.recovered, true);
  assert.ok(recovered.state.deletedProfiles.deleted_1);
});

test("une sauvegarde principale corrompue bascule sur la préparation valide", () => {
  const storage = createMemoryStorage();
  const adapter = createLocalStateStorage({ storage, key: "main", stagingKey: "staging", legacyKeys: [], now: () => FIXED_NOW });
  adapter.save(stateWithTombstone());
  const valid = storage.getItem("main");
  storage.setItem("main", "{invalide");
  storage.setItem("staging", valid);

  const loaded = adapter.load();
  assert.equal(loaded.source, "staging");
  assert.equal(loaded.failures.length, 0);
  assert.ok(loaded.state.deletedProfiles.deleted_1);
});

test("une préparation plus récente est préférée à l'ancienne sauvegarde validée", () => {
  const base = createMemoryStorage();
  const initial = createLocalStateStorage({
    storage: base,
    key: "main",
    stagingKey: "staging",
    legacyKeys: [],
    now: () => "2026-06-28T15:00:00.000Z"
  });
  initial.save(createDefaultState({ now: FIXED_NOW }));
  const quotaStorage = {
    getItem: base.getItem,
    removeItem: base.removeItem,
    setItem(key, value) {
      if (key === "main") {
        const error = new Error("Quota reached");
        error.name = "QuotaExceededError";
        throw error;
      }
      base.setItem(key, value);
    }
  };
  const retry = createLocalStateStorage({
    storage: quotaStorage,
    key: "main",
    stagingKey: "staging",
    legacyKeys: [],
    now: () => "2026-06-28T16:00:00.000Z"
  });
  retry.save(stateWithTombstone());

  const loaded = retry.load();
  assert.equal(loaded.source, "staging");
  assert.ok(loaded.state.deletedProfiles.deleted_1);
});

test("les backups sont bornés, listés et restaurables avec les tombstones", () => {
  const storage = createMemoryStorage();
  let counter = 0;
  const backups = createBackupStorage({
    storage,
    maxEntries: 2,
    now: () => FIXED_NOW,
    idFactory: () => `backup-${++counter}`
  });
  const state = stateWithTombstone();
  backups.create(state, "avant-cloud");
  backups.create({ ...state, updatedAt: "2026-06-28T17:00:00.000Z" }, "manuel");
  backups.create({ ...state, updatedAt: "2026-06-28T18:00:00.000Z" }, "avant-import");

  const entries = backups.list();
  assert.deepEqual(entries.map((entry) => entry.id), ["backup-3", "backup-2"]);
  assert.equal(storage.getItem("familier_tracker_v2_backup_backup-1"), null);
  const restored = backups.restore("backup-3");
  assert.ok(restored.deletedProfiles.deleted_1);
  assert.equal(backups.remove("backup-3"), true);
  assert.equal(backups.list().length, 1);
});

test("une sauvegarde cloud est validée et n'est jamais appliquée automatiquement", () => {
  const local = stateWithTombstone();
  const remote = { ...local, updatedAt: "2026-06-28T17:00:00.000Z" };
  const localEnvelope = createCloudEnvelope(local, { savedAt: FIXED_NOW, deviceId: "local" });
  const remoteEnvelope = createCloudEnvelope(remote, { savedAt: "2026-06-28T17:00:00.000Z", deviceId: "remote" });

  assert.ok(readCloudEnvelope(localEnvelope).deletedProfiles.deleted_1);
  assert.equal(compareCloudEnvelopes(localEnvelope, remoteEnvelope).status, "cloud-newer");
  const transfer = prepareCloudTransfer(local, remoteEnvelope, { savedAt: FIXED_NOW });
  assert.equal(transfer.applyAutomatically, false);
  assert.equal(transfer.decision.requiresConfirmation, true);
});

test("l'adaptateur IndexedDB échoue proprement lorsque l'API est absente", async () => {
  const assets = createIndexedDbAssetStorage({ indexedDB: null });
  assert.equal(assets.supported(), false);
  await assert.rejects(() => assets.get("ref"), (error) => error.code === "INDEXED_DB_UNAVAILABLE");
});
