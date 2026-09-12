import { checkUsagePolicy } from "./limits";
import { retrieveMeetingEvidence } from "./retrieval";
import { parseAskEchoRequest, type AskEchoResponse } from "./schema";
import { askModel } from "./provider";
import { getUsageSnapshot, loadAiPolicy, loadMeetingsForUser, recordUsage } from "./store";

const activeRequests = new Map<string, number>();

export async function answerAskEcho(input: unknown, userEmail: string): Promise<AskEchoResponse> {
  const started = Date.now();
  const policy = await loadAiPolicy();
  const request = parseAskEchoRequest(input, policy);
  const usageSnapshot = await getUsageSnapshot(userEmail);
  usageSnapshot.concurrentRequests = activeRequests.get(userEmail) || 0;
  const decision = checkUsagePolicy(policy, usageSnapshot);
  if (!decision.allowed) {
    await recordUsage({ userEmail, model: policy.model, status: "limited", latencyMs: Date.now() - started, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    throw Object.assign(new Error(decision.reason), { status: 429 });
  }
  activeRequests.set(userEmail, usageSnapshot.concurrentRequests + 1);
  try {
    const meetings = await loadMeetingsForUser(userEmail);
    const evidence = retrieveMeetingEvidence(meetings, request.question, { maxSources: policy.maxSources, maxCharacters: policy.maxEvidenceCharacters });
    const result = await askModel({ ...policy, question: request.question, conversation: request.conversation, evidence });
    const sourceIds = new Set(Array.isArray(result.content.sourceIds) ? result.content.sourceIds.map(String) : []);
    const sources = evidence.filter((source) => sourceIds.has(source.sourceId));
    const confidence = result.content.confidence === "supported" && sources.length === 0 ? "insufficient" : (["supported", "partial", "insufficient"].includes(result.content.confidence) ? result.content.confidence : (sources.length ? "partial" : "insufficient"));
    const response: AskEchoResponse = { answer: String(result.content.answer || "I couldn't find enough in the meeting archive to answer that."), sources, confidence, followUps: Array.isArray(result.content.followUps) ? result.content.followUps.map(String).slice(0, 3) : [], usage: result.usage };
    await recordUsage({ userEmail, model: policy.model, status: "success", latencyMs: Date.now() - started, ...result.usage });
    return response;
  } catch (error) {
    await recordUsage({ userEmail, model: policy.model, status: "failed", latencyMs: Date.now() - started, inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    throw error;
  } finally {
    const remaining = (activeRequests.get(userEmail) || 1) - 1;
    if (remaining > 0) activeRequests.set(userEmail, remaining); else activeRequests.delete(userEmail);
  }
}
