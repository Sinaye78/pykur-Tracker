import { createDefaultState } from "../../js/state/defaults.js";
import { createIndexedDbAssetStorage } from "../../js/storage/indexedDb.js";
import { createLocalStateStorage } from "../../js/storage/local.js";

const result = document.querySelector("#result");
const assetKey = "storage-smoke-reference";
const local = createLocalStateStorage({
  storage: localStorage,
  key: "familier_tracker_v2_smoke_state",
  stagingKey: "familier_tracker_v2_smoke_staging",
  legacyKeys: []
});
const assets = createIndexedDbAssetStorage();

try {
  const state = createDefaultState({ now: "2026-06-28T16:00:00.000Z" });
  if (!local.save(state).ok || local.load().state?.schemaVersion !== 1) throw new Error("localStorage");
  await assets.put(assetKey, "data:image/png;base64,AA==", { profileId: "smoke" });
  const stored = await assets.get(assetKey);
  const listed = await assets.list();
  if (stored?.value !== "data:image/png;base64,AA==") throw new Error("IndexedDB get");
  if (!listed.some((entry) => entry.key === assetKey)) throw new Error("IndexedDB list");
  await assets.remove(assetKey);
  if (await assets.get(assetKey)) throw new Error("IndexedDB remove");
  result.value = "PASS";
  result.textContent = "PASS";
  document.documentElement.dataset.storageSmoke = "pass";
} catch (error) {
  result.value = `FAIL: ${error.message}`;
  result.textContent = `FAIL: ${error.message}`;
  document.documentElement.dataset.storageSmoke = "fail";
  console.error(error);
} finally {
  local.clearV2();
}
