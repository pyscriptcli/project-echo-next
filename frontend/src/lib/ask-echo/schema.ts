import type { EvidenceSource } from "./retrieval";

export interface ConversationTurn { role: "user" | "assistant"; content: string }
export interface AskEchoRequest { question: string; conversation: ConversationTurn[] }
export interface AskEchoResponse {
  answer: string;
  sources: EvidenceSource[];
  confidence: "supported" | "partial" | "insufficient";
  followUps: string[];
  citations?: Array<{ marker: string; sourceId: string }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export function parseAskEchoRequest(value: unknown, limits: { maxInputCharacters: number; maxConversationTurns: number }): AskEchoRequest {
  if (!value || typeof value !== "object") throw new Error("Please enter a question.");
  const raw = value as { question?: unknown; conversation?: unknown };
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) throw new Error("Please enter a question.");
  if (question.length > limits.maxInputCharacters) throw new Error(`Please keep your question under ${limits.maxInputCharacters.toLocaleString()} characters.`);
  const conversation = Array.isArray(raw.conversation) && limits.maxConversationTurns > 0 ? raw.conversation.slice(-limits.maxConversationTurns).filter((turn): turn is ConversationTurn => Boolean(turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string" && turn.content.trim())).map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, limits.maxInputCharacters) })) : [];
  return { question, conversation };
}
