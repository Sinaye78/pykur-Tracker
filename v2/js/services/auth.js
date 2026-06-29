import { createApiClient } from "./api.js";

export const V2_AUTH_TOKEN_KEY = "familier_tracker_v2_auth_token";

export function createAuthService(options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const listeners = new Set();
  let token = storage?.getItem?.(V2_AUTH_TOKEN_KEY) || "";
  let user = null;
  let loading = false;
  let apiOnline = null;

  const api = options.api || createApiClient({
    storage,
    fetchImpl: options.fetchImpl,
    baseUrl: options.baseUrl,
    location: options.location,
    tokenProvider: () => token
  });

  function snapshot() {
    return Object.freeze({ token, user, loading, apiOnline, authenticated: !!(token && user) });
  }

  function emit() {
    const current = snapshot();
    for (const listener of listeners) listener(current);
    return current;
  }

  function setSession(payload) {
    token = String(payload?.token || "");
    user = payload?.user || null;
    if (token) storage?.setItem?.(V2_AUTH_TOKEN_KEY, token);
    else storage?.removeItem?.(V2_AUTH_TOKEN_KEY);
    return emit();
  }

  async function run(action) {
    loading = true;
    emit();
    try {
      const result = await action();
      apiOnline = true;
      return result;
    } catch (error) {
      if (!error.status || error.status >= 500) apiOnline = false;
      throw error;
    } finally {
      loading = false;
      emit();
    }
  }

  async function initialize() {
    if (!token) return snapshot();
    try {
      const result = await run(() => api.request("/auth/me"));
      user = result.user || null;
      emit();
    } catch (error) {
      if (error.status === 401 || error.status === 403) setSession(null);
    }
    return snapshot();
  }

  async function login(identifier, password) {
    const result = await run(() => api.request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    }));
    setSession(result);
    return result;
  }

  async function register(pseudo, email, password) {
    return run(() => api.request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ pseudo, email, password, client: "v2" })
    }));
  }

  async function confirmEmail(verificationToken) {
    const result = await run(() => api.request("/auth/verify-email/confirm", {
      method: "POST",
      body: JSON.stringify({ token: verificationToken })
    }));
    setSession(result);
    return result;
  }

  async function requestPasswordReset(identifier) {
    return run(() => api.request("/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify({ identifier, client: "v2" })
    }));
  }

  async function confirmPasswordReset(resetToken, newPassword) {
    const result = await run(() => api.request("/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, newPassword })
    }));
    setSession(result);
    return result;
  }

  async function logout() {
    try {
      if (token) await run(() => api.request("/auth/logout", { method: "POST" }));
    } finally {
      setSession(null);
    }
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(snapshot());
    return () => listeners.delete(listener);
  }

  return Object.freeze({
    initialize,
    login,
    register,
    confirmEmail,
    requestPasswordReset,
    confirmPasswordReset,
    logout,
    subscribe,
    getState: snapshot,
    getToken: () => token,
    api
  });
}
