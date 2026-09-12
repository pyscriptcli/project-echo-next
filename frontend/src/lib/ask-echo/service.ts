import { checkUsagePolicy } from "./limits";
import { rankEvidenceSources, retrieveMeetingEvidence } from "./retrieval";
import { parseAskEchoRequest, type AskEchoResponse } from "./schema";
import { askModel } from "./provider";
import { getUsageSnapshot, loadEchoConfiguration, loadMeetingsForUser, recordUsage } from "./store";
import { resolveAllowedPages, sourcesEnabledForPages } from "./access";
import { loadClickUpContext } from "./clickup";

const activeRequests = new Map<string, number>();

export async function answerAskEcho(input: unknown, user: { id?: string | number; name?: string; email: string; clickUpToken: string; taskListId: string }): Promise<AskEchoResponse> {
  const started = Date.now();
  const configuration = await loadEchoConfiguration();
  const policy = configuration.aiPolicy;
  const userEmail = user.email;
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
    const allowedPages = resolveAllowedPages(userEmail, configuration);
    const enabledSources = sourcesEnabledForPages(allowedPages);
    const formListIds = configuration.mappings.map((mapping) => String(mapping.listId || "").trim()).filter(Boolean);
    const [meetings, clickUpSources] = await Promise.all([
      enabledSources.includes("meetings") ? loadMeetingsForUser(userEmail) : Promise.resolve([]),
      loadClickUpContext({ token: user.clickUpToken, pages: enabledSources, taskListId: user.taskListId, formListIds }),
    ]);
    const meetingSources = retrieveMeetingEvidence(meetings, request.question, { maxSources: policy.maxSources, maxCharacters: policy.maxEvidenceCharacters });
    const evidence = rankEvidenceSources([...meetingSources, ...clickUpSources], request.question, { maxSources: policy.maxSources, maxCharacters: policy.maxEvidenceCharacters, user });
    const result = await askModel({ ...policy, question: request.question, conversation: request.conversation, evidence, user });
    const sourceIds = new Set(Array.isArray(result.content.sourceIds) ? result.content.sourceIds.map(String) : []);
    const sources = evidence.filter((source) => sourceIds.has(source.sourceId));
    const confidence = result.content.confidence === "supported" && sources.length === 0 ? "insufficient" : (["supported", "partial", "insufficient"].includes(result.content.confidence) ? result.content.confidence : (sources.length ? "partial" : "insufficient"));
    const allowedSourceIds = new Set(sources.map((source) => source.sourceId));
    const citations = Array.isArray(result.content.citations) ? result.content.citations.map((citation: any, index: number) => ({ marker: String(citation?.marker || `[${index + 1}]`), sourceId: String(citation?.sourceId || "") })).filter((citation: { marker: string; sourceId: string }) => allowedSourceIds.has(citation.sourceId)).slice(0, 8) : [];
    const response: AskEchoResponse = { answer: String(result.content.answer || "I couldn't find enough in the workspace to answer that."), sources, citations, confidence, followUps: Array.isArray(result.content.followUps) ? result.content.followUps.map(String).slice(0, 3) : [], usage: result.usage };
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
