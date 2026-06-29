import { StorageOperationError } from "./local.js";

export const V2_ASSET_DB_NAME = "familier-tracker-v2-assets";
export const V2_ASSET_STORE = "dofusReferences";
export const V1_ASSET_DB_NAME = "pykur-dofus-detection";
export const V1_ASSET_STORE = "refs";

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Requête IndexedDB échouée."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Transaction IndexedDB échouée."));
    transaction.onabort = () => reject(transaction.error || new Error("Transaction IndexedDB annulée."));
  });
}

function openDatabase(indexedDb, name, version, onUpgrade) {
  return new Promise((resolve, reject) => {
    const request = indexedDb.open(name, version);
    request.onupgradeneeded = () => onUpgrade?.(request.result, request.transaction);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error(`Ouverture IndexedDB impossible : ${name}`));
  });
}

export function createIndexedDbAssetStorage(options = {}) {
  const indexedDb = options.indexedDB ?? globalThis.indexedDB;
  const dbName = options.dbName || V2_ASSET_DB_NAME;
  const storeName = options.storeName || V2_ASSET_STORE;
  const now = options.now || (() => new Date().toISOString());

  function supported() {
    return Boolean(indexedDb?.open);
  }

  async function open() {
    if (!supported()) throw new StorageOperationError("INDEXED_DB_UNAVAILABLE", "IndexedDB est indisponible.");
    return openDatabase(indexedDb, dbName, 1, (db) => {
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName, { keyPath: "key" });
    });
  }

  async function withStore(mode, operation) {
    const db = await open();
    try {
      const transaction = db.transaction(storeName, mode);
      const result = await operation(transaction.objectStore(storeName));
      await transactionDone(transaction);
      return result;
    } catch (cause) {
      throw new StorageOperationError("INDEXED_DB_OPERATION_FAILED", "Opération IndexedDB impossible.", { cause });
    } finally {
      db.close();
    }
  }

  async function put(key, value, metadata = {}) {
    if (!key) throw new TypeError("Une clé d'asset est requise.");
    const record = { key, value, updatedAt: now(), ...metadata };
    await withStore("readwrite", (store) => requestValue(store.put(record)));
    return record;
  }

  async function get(key) {
    if (!key) return null;
    return (await withStore("readonly", (store) => requestValue(store.get(key)))) || null;
  }

  async function remove(key) {
    await withStore("readwrite", (store) => requestValue(store.delete(key)));
  }

  async function list() {
    return (await withStore("readonly", (store) => requestValue(store.getAll()))) || [];
  }

  async function migrateLegacy(optionsLegacy = {}) {
    if (!supported()) return { migrated: 0, skipped: 0, mapping: {} };
    const legacyDbName = optionsLegacy.dbName || V1_ASSET_DB_NAME;
    const legacyStoreName = optionsLegacy.storeName || V1_ASSET_STORE;
    let legacyDb;
    try {
      legacyDb = await openDatabase(indexedDb, legacyDbName);
      if (!legacyDb.objectStoreNames.contains(legacyStoreName)) return { migrated: 0, skipped: 0, mapping: {} };
      const transaction = legacyDb.transaction(legacyStoreName, "readonly");
      const store = transaction.objectStore(legacyStoreName);
      const [keys, values] = await Promise.all([requestValue(store.getAllKeys()), requestValue(store.getAll())]);
      await transactionDone(transaction);
      let migrated = 0;
      let skipped = 0;
      const mapping = {};
      for (let index = 0; index < keys.length; index += 1) {
        const legacyKey = String(keys[index]);
        const targetKey = optionsLegacy.mapKey?.(legacyKey) || legacyKey;
        mapping[legacyKey] = targetKey;
        if (await get(targetKey)) {
          skipped += 1;
          continue;
        }
        await put(targetKey, values[index], { migratedFrom: `${legacyDbName}/${legacyKey}` });
        migrated += 1;
      }
      return { migrated, skipped, mapping };
    } catch (cause) {
      throw new StorageOperationError("INDEXED_DB_MIGRATION_FAILED", "Migration IndexedDB impossible.", { cause });
    } finally {
      legacyDb?.close();
    }
  }

  return Object.freeze({ supported, put, get, remove, list, migrateLegacy, dbName, storeName });
}
