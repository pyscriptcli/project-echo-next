import type { EvidenceSource } from "./retrieval";

export interface ConversationTurn { role: "user" | "assistant"; content: string }
export interface CurrentMeetingContext {
  elapsedSeconds: number;
  segments: Array<{ index: number; startedAtSeconds: number; text: string }>;
  notes: Array<{ timestamp: string; text: string }>;
}
export interface AskEchoRequest { question: string; conversation: ConversationTurn[]; currentMeeting?: CurrentMeetingContext }
export interface AskEchoResponse {
  answer: string;
  sources: EvidenceSource[];
  confidence: "supported" | "partial" | "insufficient";
  followUps: string[];
  citations?: Array<{ marker: string; sourceId: string }>;
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export function parseAskEchoRequest(value: unknown, limits: { maxInputCharacters: number; maxConversationTurns: number; maxCurrentMeetingCharacters?: number }): AskEchoRequest {
  if (!value || typeof value !== "object") throw new Error("Please enter a question.");
  const raw = value as { question?: unknown; conversation?: unknown; currentMeeting?: unknown };
  const question = typeof raw.question === "string" ? raw.question.trim() : "";
  if (!question) throw new Error("Please enter a question.");
  if (question.length > limits.maxInputCharacters) throw new Error(`Please keep your question under ${limits.maxInputCharacters.toLocaleString()} characters.`);
  const conversation = Array.isArray(raw.conversation) && limits.maxConversationTurns > 0 ? raw.conversation.slice(-limits.maxConversationTurns).filter((turn): turn is ConversationTurn => Boolean(turn && (turn.role === "user" || turn.role === "assistant") && typeof turn.content === "string" && turn.content.trim())).map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, limits.maxInputCharacters) })) : [];
  let currentMeeting: CurrentMeetingContext | undefined;
  if (raw.currentMeeting && typeof raw.currentMeeting === "object") {
    const meeting = raw.currentMeeting as { elapsedSeconds?: unknown; segments?: unknown; notes?: unknown };
    let remaining = Math.max(0, limits.maxCurrentMeetingCharacters ?? 12_000);
    const sourceSegments = Array.isArray(meeting.segments) ? meeting.segments.slice(-20).reverse() : [];
    const segments = sourceSegments.map((segment) => {
      const item = segment as { index?: unknown; startedAtSeconds?: unknown; text?: unknown };
      const text = typeof item.text === "string" ? item.text.trim().slice(0, remaining) : "";
      remaining = Math.max(0, remaining - text.length);
      return { index: Math.max(0, Number(item.index) || 0), startedAtSeconds: Math.max(0, Number(item.startedAtSeconds) || 0), text };
    }).filter((segment) => segment.text).reverse();
    const notes = (Array.isArray(meeting.notes) ? meeting.notes.slice(-30) : []).map((note) => {
      const item = note as { timestamp?: unknown; text?: unknown };
      const text = typeof item.text === "string" ? item.text.trim().slice(0, remaining) : "";
      remaining = Math.max(0, remaining - text.length);
      return { timestamp: typeof item.timestamp === "string" ? item.timestamp.slice(0, 20) : "", text };
    }).filter((note) => note.text);
    if (segments.length || notes.length) currentMeeting = { elapsedSeconds: Math.max(0, Number(meeting.elapsedSeconds) || 0), segments, notes };
  }
  return { question, conversation, currentMeeting };
}
