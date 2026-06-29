import assert from "node:assert/strict";
import test from "node:test";

import { createApiClient, ensureBrowserId, resolveApiBase } from "../../js/services/api.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("la base API reste locale en développement et relative en production", () => {
  assert.equal(resolveApiBase({ hostname: "127.0.0.1" }, memoryStorage()), "http://127.0.0.1:3000/api");
  assert.equal(resolveApiBase({ hostname: "familier-tracker.fr" }, memoryStorage()), "/api");
});

test("l'identifiant navigateur est stable", () => {
  const storage = memoryStorage();
  const cryptoLike = { randomUUID: () => "browser-security-id-1234" };
  assert.equal(ensureBrowserId(storage, cryptoLike), "browser-security-id-1234");
  assert.equal(ensureBrowserId(storage, { randomUUID: () => "different-value-1234" }), "browser-security-id-1234");
});

test("le client transmet session, navigateur et identifiant de requête", async () => {
  const calls = [];
  const storage = memoryStorage();
  const api = createApiClient({
    baseUrl: "https://example.test/api",
    storage,
    tokenProvider: () => "token-v2",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ ok: true }), headers: { get: () => null } };
    }
  });
  await api.request("/auth/me");
  assert.equal(calls[0].url, "https://example.test/api/auth/me");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-v2");
  assert.ok(calls[0].options.headers["X-Browser-Id"]);
  assert.ok(calls[0].options.headers["X-Request-Id"]);
});
