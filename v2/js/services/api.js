export const V2_API_BASE_KEY = "familier_tracker_v2_api_base";
export const BROWSER_ID_KEY = "familier_tracker_browser_id";

export class ApiRequestError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "ApiRequestError";
    this.status = Number(details.status || 0);
    this.code = details.code || "API_ERROR";
    this.path = details.path || "";
    this.requestId = details.requestId || "";
    this.body = details.body || null;
  }
}

export function resolveApiBase(locationLike = globalThis.location, storage = globalThis.localStorage) {
  const override = storage?.getItem?.(V2_API_BASE_KEY);
  if (override) return String(override).replace(/\/$/, "");
  const hostname = String(locationLike?.hostname || "").toLowerCase();
  return hostname === "127.0.0.1" || hostname === "localhost"
    ? "http://127.0.0.1:3000/api"
    : "/api";
}

export function ensureBrowserId(storage = globalThis.localStorage, cryptoLike = globalThis.crypto) {
  let value = storage?.getItem?.(BROWSER_ID_KEY) || "";
  if (/^[a-zA-Z0-9._:-]{12,120}$/.test(value)) return value;
  value = cryptoLike?.randomUUID?.() || `browser-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  storage?.setItem?.(BROWSER_ID_KEY, value);
  return value;
}

function friendlyMessage(status, body) {
  if (body?.error) return String(body.error);
  if (status === 401) return "Votre session est invalide ou a expiré.";
  if (status === 403) return "Cette action n'est pas autorisée.";
  if (status === 404) return "Service introuvable.";
  if (status === 429) return "Trop de tentatives. Réessayez dans quelques instants.";
  if (status >= 500) return "Le serveur rencontre momentanément un problème.";
  return "La requête n'a pas pu être traitée.";
}

export function createApiClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch?.bind(globalThis);
  const storage = options.storage || globalThis.localStorage;
  const baseUrl = options.baseUrl || resolveApiBase(options.location || globalThis.location, storage);
  const timeoutMs = Number(options.timeoutMs || 12000);
  const tokenProvider = options.tokenProvider || (() => "");

  if (!fetchImpl) throw new Error("API indisponible : fetch est absent.");

  async function request(path, requestOptions = {}) {
    const method = String(requestOptions.method || "GET").toUpperCase();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const requestId = globalThis.crypto?.randomUUID?.() || `v2-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const headers = {
      "Content-Type": "application/json",
      "X-Request-Id": requestId,
      "X-Browser-Id": ensureBrowserId(storage),
      ...(requestOptions.headers || {})
    };
    const token = tokenProvider();
    if (token) headers.Authorization = `Bearer ${token}`;

    try {
      const response = await fetchImpl(`${baseUrl}${path}`, {
        ...requestOptions,
        method,
        headers,
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiRequestError(friendlyMessage(response.status, body), {
          status: response.status,
          code: body.code,
          path,
          requestId: body.requestId || response.headers?.get?.("X-Request-Id") || requestId,
          body
        });
      }
      return body;
    } catch (error) {
      if (error instanceof ApiRequestError) throw error;
      const timeoutError = error?.name === "AbortError";
      throw new ApiRequestError(
        timeoutError ? "Le serveur met trop de temps à répondre." : "Connexion au serveur momentanément indisponible.",
        { status: 0, code: timeoutError ? "TIMEOUT" : "NETWORK_ERROR", path, requestId }
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  return Object.freeze({ request, baseUrl });
}
