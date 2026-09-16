export class GroqRateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "GroqRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Discovers and collects all configured Groq API keys.
 * Supports:
 * - GROQ_API_KEYS (comma-separated list: "key1,key2,key3")
 * - GROQ_API_KEY (primary key)
 * - GROQ_API_KEY_2, GROQ_API_KEY_3, ... GROQ_API_KEY_20
 */
export function getGroqApiKeys(): string[] {
  const keys: string[] = [];

  if (process.env.GROQ_API_KEYS) {
    const list = process.env.GROQ_API_KEYS.split(",")
      .map((k) => k.trim())
      .filter((k) => k.length > 0);
    keys.push(...list);
  }

  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim()) {
    keys.push(process.env.GROQ_API_KEY.trim());
  }

  for (let i = 2; i <= 20; i++) {
    const indexed = process.env[`GROQ_API_KEY_${i}`];
    if (indexed && indexed.trim()) {
      keys.push(indexed.trim());
    }
  }

  return Array.from(new Set(keys));
}

// Map of apiKey -> timestamp (ms) until which the key is cooling down
export const groqKeyCooldowns = new Map<string, number>();
let groqRoundRobinPointer = 0;

export function resetGroqPool(): void {
  groqKeyCooldowns.clear();
  groqRoundRobinPointer = 0;
}

export function getGroqPoolStatus(keys?: string[]): { key: string; index: number; coolingDown: boolean; cooldownRemainingSec: number }[] {
  const activeKeys = keys || getGroqApiKeys();
  const now = Date.now();
  return activeKeys.map((key, index) => {
    const expiry = groqKeyCooldowns.get(key) || 0;
    const coolingDown = expiry > now;
    return {
      key: `${key.slice(0, 6)}...${key.slice(-4)}`,
      index: index + 1,
      coolingDown,
      cooldownRemainingSec: coolingDown ? Math.ceil((expiry - now) / 1000) : 0,
    };
  });
}

export interface GroqChatResult {
  data: any;
  keyUsed: string;
  keyIndex: number;
  keyAlias: string;
  keyMasked: string;
  poolSize: number;
  availableKeysCount: number;
  coolingDownKeysCount: number;
  attempts: number;
  failoverOccurred: boolean;
  failoverHistory?: string[];
}

/**
 * Executes a chat completion query against the Groq Multi-Key Pool with automatic
 * round-robin distribution and instant failover between keys on 429 rate limits.
 */
export async function callGroqChatPool(
  messages: { role: string; content: string }[],
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: { type: "json_object" | "text" };
    signal?: AbortSignal;
  }
): Promise<GroqChatResult> {
  const groqKeys = getGroqApiKeys();
  if (!groqKeys.length) {
    throw new Error("No Groq API keys configured");
  }

  const model = options?.model || process.env.GROQ_CHAT_MODEL || "llama-3.3-70b-versatile";
  const now = Date.now();

  const availableKeys = groqKeys.filter((k) => (groqKeyCooldowns.get(k) || 0) <= now);
  const coolingDownKeys = groqKeys.filter((k) => (groqKeyCooldowns.get(k) || 0) > now);

  if (availableKeys.length === 0) {
    const earliestExpiry = Math.min(...groqKeys.map((k) => groqKeyCooldowns.get(k) || 0));
    const waitSec = Math.max(1, Math.ceil((earliestExpiry - now) / 1000));
    throw new GroqRateLimitError(`All ${groqKeys.length} Groq keys are cooling down (retry after ${waitSec}s)`, waitSec);
  }

  // Order candidate keys starting at round-robin pointer
  const startOffset = groqRoundRobinPointer % availableKeys.length;
  const orderedKeys = [
    ...availableKeys.slice(startOffset),
    ...availableKeys.slice(0, startOffset),
  ];

  const poolErrors: string[] = [];
  const failoverHistory: string[] = [];
  let attempts = 0;

  for (const candidateKey of orderedKeys) {
    attempts++;
    const keyIndex = groqKeys.indexOf(candidateKey) + 1;
    const keyAlias = `groq_key_${keyIndex}`;
    const keyMasked = `${candidateKey.slice(0, 6)}...${candidateKey.slice(-4)}`;

    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${candidateKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          response_format: options?.responseFormat || { type: "json_object" },
          max_tokens: options?.maxTokens || 1200,
          temperature: options?.temperature ?? 0.2,
        }),
        signal: options?.signal || AbortSignal.timeout(30_000),
      });

      if (response.status === 429) {
        const retryAfterSeconds = Math.max(1, Number(response.headers.get("retry-after")) || 30);
        groqKeyCooldowns.set(candidateKey, Date.now() + retryAfterSeconds * 1000);
        failoverHistory.push(`${keyAlias}: 429 rate limit (${retryAfterSeconds}s cooldown)`);
        console.warn(`[Groq Chat Pool] Key #${keyIndex} hit 429 (cooling down for ${retryAfterSeconds}s). Trying next key...`);
        poolErrors.push(`Key #${keyIndex}: 429`);
        continue;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `Groq Chat failed (${response.status})`;
        failoverHistory.push(`${keyAlias}: error (${errMsg})`);
        console.warn(`[Groq Chat Pool] Key #${keyIndex} error:`, errMsg);
        poolErrors.push(`Key #${keyIndex}: ${errMsg}`);
        continue;
      }

      const data = await response.json();
      groqRoundRobinPointer = (groqRoundRobinPointer + 1) % groqKeys.length;

      return {
        data,
        keyUsed: candidateKey,
        keyIndex,
        keyAlias,
        keyMasked,
        poolSize: groqKeys.length,
        availableKeysCount: availableKeys.length,
        coolingDownKeysCount: coolingDownKeys.length,
        attempts,
        failoverOccurred: attempts > 1,
        failoverHistory: attempts > 1 ? failoverHistory : undefined,
      };
    } catch (err: any) {
      if (err.name === "AbortError" || err.name === "TimeoutError") {
        poolErrors.push(`Key #${keyIndex}: timeout`);
        continue;
      }
      failoverHistory.push(`${keyAlias}: ${err.message}`);
      poolErrors.push(`Key #${keyIndex}: ${err.message}`);
    }
  }

  throw new Error(`All available Groq keys in chat pool failed: ${poolErrors.join(" | ")}`);
}
