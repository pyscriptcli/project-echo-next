import { describe, expect, it } from "vitest";
import { checkUsagePolicy, DEFAULT_AI_POLICY, normalizeAiPolicy } from "./limits";

describe("checkUsagePolicy", () => {
  it("allows a request within every configured limit", () => {
    expect(checkUsagePolicy(DEFAULT_AI_POLICY, { requestsLastMinute: 1, concurrentRequests: 0, userTokensToday: 100, organizationTokensThisMonth: 1000 })).toEqual({ allowed: true });
  });

  it("returns a plain-language reason when a user reaches the daily budget", () => {
    const result = checkUsagePolicy({ ...DEFAULT_AI_POLICY, dailyTokensPerUser: 100 }, { requestsLastMinute: 0, concurrentRequests: 0, userTokensToday: 100, organizationTokensThisMonth: 0 });
    expect(result).toEqual({ allowed: false, reason: "You’ve reached today’s Ask Echo limit. Try again tomorrow." });
  });

  it("blocks requests at the per-minute rate limit", () => {
    const result = checkUsagePolicy({ ...DEFAULT_AI_POLICY, requestsPerMinute: 2 }, { requestsLastMinute: 2, concurrentRequests: 0, userTokensToday: 0, organizationTokensThisMonth: 0 });
    expect(result.allowed).toBe(false);
  });

  it("rejects unknown models and clamps unsafe limits", () => {
    const policy = normalizeAiPolicy({ model: "made-up-model", requestsPerMinute: 0, maxOutputTokens: 99999 });
    expect(policy.model).toBe("deepseek-chat");
    expect(policy.requestsPerMinute).toBe(1);
    expect(policy.maxOutputTokens).toBe(4000);
  });
});
