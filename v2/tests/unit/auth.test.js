import assert from "node:assert/strict";
import test from "node:test";

import { createAuthService, V2_AUTH_TOKEN_KEY } from "../../js/services/auth.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key)
  };
}

test("l'inscription V2 demande un lien email vers la V2", async () => {
  const calls = [];
  const auth = createAuthService({
    storage: memoryStorage(),
    api: { request: async (path, options) => { calls.push({ path, options }); return { ok: true }; } }
  });
  await auth.register("Testeur", "test@example.test", "motdepasse");
  assert.equal(calls[0].path, "/auth/register");
  assert.equal(JSON.parse(calls[0].options.body).client, "v2");
});

test("une connexion conserve une session V2 séparée", async () => {
  const storage = memoryStorage();
  const auth = createAuthService({
    storage,
    api: { request: async () => ({ token: "jwt-v2", user: { pseudo: "Testeur", role: "user" } }) }
  });
  await auth.login("Testeur", "motdepasse");
  assert.equal(storage.getItem(V2_AUTH_TOKEN_KEY), "jwt-v2");
  assert.equal(auth.getState().user.pseudo, "Testeur");
  assert.equal(auth.getState().authenticated, true);
});

test("une session serveur refusée est supprimée au démarrage", async () => {
  const storage = memoryStorage({ [V2_AUTH_TOKEN_KEY]: "expired" });
  const error = Object.assign(new Error("Session expirée"), { status: 401 });
  const auth = createAuthService({ storage, api: { request: async () => { throw error; } } });
  await auth.initialize();
  assert.equal(storage.getItem(V2_AUTH_TOKEN_KEY), null);
  assert.equal(auth.getState().authenticated, false);
});

test("la récupération de mot de passe demande un lien V2", async () => {
  const calls = [];
  const auth = createAuthService({
    storage: memoryStorage(),
    api: { request: async (path, options) => { calls.push({ path, options }); return { ok: true }; } }
  });
  await auth.requestPasswordReset("Testeur");
  assert.equal(calls[0].path, "/auth/password-reset/request");
  assert.equal(JSON.parse(calls[0].options.body).client, "v2");
});
