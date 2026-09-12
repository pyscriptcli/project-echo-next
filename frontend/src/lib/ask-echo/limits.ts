export interface AiPolicy {
  model: string;
  fallbackModel: string;
  requestsPerMinute: number;
  concurrentRequestsPerUser: number;
  dailyTokensPerUser: number;
  monthlyOrganizationTokens: number;
  maxInputCharacters: number;
  maxConversationTurns: number;
  maxSources: number;
  maxEvidenceCharacters: number;
  maxOutputTokens: number;
}

export const APPROVED_MODELS = [
  { id: "deepseek-chat", label: "DeepSeek Chat", provider: "DeepSeek", note: "Balanced for everyday questions" },
  { id: "deepseek-reasoner", label: "DeepSeek Reasoner", provider: "DeepSeek", note: "For harder comparisons and analysis" },
] as const;

export const DEFAULT_AI_POLICY: AiPolicy = {
  model: "deepseek-chat",
  fallbackModel: "deepseek-reasoner",
  requestsPerMinute: 10,
  concurrentRequestsPerUser: 1,
  dailyTokensPerUser: 50_000,
  monthlyOrganizationTokens: 2_000_000,
  maxInputCharacters: 4_000,
  maxConversationTurns: 8,
  maxSources: 6,
  maxEvidenceCharacters: 12_000,
  maxOutputTokens: 1_200,
};

export interface UsageSnapshot {
  requestsLastMinute: number;
  concurrentRequests: number;
  userTokensToday: number;
  organizationTokensThisMonth: number;
}

export function checkUsagePolicy(policy: AiPolicy, usage: UsageSnapshot): { allowed: true } | { allowed: false; reason: string } {
  if (usage.concurrentRequests >= policy.concurrentRequestsPerUser) return { allowed: false, reason: "You already have an Ask Echo reply in progress." };
  if (usage.requestsLastMinute >= policy.requestsPerMinute) return { allowed: false, reason: "You’re asking a little too quickly. Please wait a minute and try again." };
  if (usage.userTokensToday >= policy.dailyTokensPerUser) return { allowed: false, reason: "You’ve reached today’s Ask Echo limit. Try again tomorrow." };
  if (usage.organizationTokensThisMonth >= policy.monthlyOrganizationTokens) return { allowed: false, reason: "Ask Echo has reached this month’s shared limit. Please contact an admin." };
  return { allowed: true };
}

export function normalizeAiPolicy(value: unknown): AiPolicy {
  const raw = value && typeof value === "object" ? value as Partial<AiPolicy> : {};
  const approved = new Set(APPROVED_MODELS.map((model) => model.id));
  const number = (key: keyof AiPolicy, min: number, max: number) => {
    const candidate = Number(raw[key]);
    return Number.isFinite(candidate) ? Math.min(max, Math.max(min, Math.round(candidate))) : DEFAULT_AI_POLICY[key] as number;
  };
  return {
    model: approved.has(raw.model as any) ? String(raw.model) : DEFAULT_AI_POLICY.model,
    fallbackModel: approved.has(raw.fallbackModel as any) ? String(raw.fallbackModel) : DEFAULT_AI_POLICY.fallbackModel,
    requestsPerMinute: number("requestsPerMinute", 1, 120),
    concurrentRequestsPerUser: number("concurrentRequestsPerUser", 1, 5),
    dailyTokensPerUser: number("dailyTokensPerUser", 1_000, 10_000_000),
    monthlyOrganizationTokens: number("monthlyOrganizationTokens", 10_000, 100_000_000),
    maxInputCharacters: number("maxInputCharacters", 200, 20_000),
    maxConversationTurns: number("maxConversationTurns", 0, 20),
    maxSources: number("maxSources", 1, 20),
    maxEvidenceCharacters: number("maxEvidenceCharacters", 1_000, 50_000),
    maxOutputTokens: number("maxOutputTokens", 100, 4_000),
  };
}
