import { createHash } from "node:crypto";

const MIN_REQUEST_INTERVAL_MS = 1_200;
const CACHE_TTL_MS = 30_000;
const MAX_CACHE_ENTRIES = 500;

type CachedResponse = {
  expiresAt: number;
  status: number;
  statusText: string;
  headers: Array<[string, string]>;
  body: string;
};

const requestQueues = new Map<string, Promise<void>>();
const lastRequestAt = new Map<string, number>();
const responseCache = new Map<string, CachedResponse>();
const inFlightGets = new Map<string, Promise<Response>>();

function tokenKey(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function responseFromCache(cached: CachedResponse) {
  return new Response(cached.body, {
    status: cached.status,
    statusText: cached.statusText,
    headers: cached.headers,
  });
}

function cacheResponse(key: string, response: Response, body: string) {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers.entries()),
    body,
  });
}

function rateLimitWaitMs(response: Response) {
  const retryAfter = Number(response.headers.get("Retry-After"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1_000 + 250;
  const resetAt = Number(response.headers.get("X-RateLimit-Reset"));
  if (Number.isFinite(resetAt) && resetAt > 0) {
    return Math.max(1_000, resetAt * 1_000 - Date.now() + 250);
  }
  return 5_000;
}

async function fetchAtSafeRate(key: string, token: string, input: string | URL, init?: RequestInit) {
  const previous = requestQueues.get(key) || Promise.resolve();
  const operation = previous.catch(() => undefined).then(async () => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", token);
    const requestInit = { ...init, headers, cache: "no-store" as RequestCache };

    const send = async () => {
      const elapsed = Date.now() - (lastRequestAt.get(key) || 0);
      if (elapsed < MIN_REQUEST_INTERVAL_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
      }
      lastRequestAt.set(key, Date.now());
      return fetch(input, requestInit);
    };

    let response = await send();
    if (response.status === 429) {
      const waitMs = rateLimitWaitMs(response);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      response = await send();
    }
    return response;
  });
  requestQueues.set(key, operation.then(() => undefined, () => undefined));
  return operation;
}

export function clearClickUpCalendarCache(token: string) {
  const prefix = `${tokenKey(token)}:`;
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) responseCache.delete(key);
  }
}

/** Calendar/project requests are isolated by the user's ClickUp token. */
export async function clickUpCalendarFetch(
  token: string,
  input: string | URL,
  init?: RequestInit,
) {
  const key = tokenKey(token);
  const method = (init?.method || "GET").toUpperCase();
  const url = String(input);

  if (method !== "GET") {
    clearClickUpCalendarCache(token);
    const response = await fetchAtSafeRate(key, token, input, init);
    clearClickUpCalendarCache(token);
    return response;
  }

  const cacheKey = `${key}:${url}`;
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return responseFromCache(cached);
  if (cached) responseCache.delete(cacheKey);

  const pending = inFlightGets.get(cacheKey);
  if (pending) return (await pending).clone();

  const request = (async () => {
    const response = await fetchAtSafeRate(key, token, input, init);
    if (!response.ok) return response;
    const body = await response.clone().text();
    cacheResponse(cacheKey, response, body);
    return response;
  })();
  inFlightGets.set(cacheKey, request);
  try {
    return (await request).clone();
  } finally {
    inFlightGets.delete(cacheKey);
  }
}
