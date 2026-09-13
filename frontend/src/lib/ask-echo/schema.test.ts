import { describe, expect, it } from "vitest";
import { parseAskEchoRequest } from "./schema";

describe("parseAskEchoRequest", () => {
  it("keeps only the configured number of recent conversation turns", () => {
    const parsed = parseAskEchoRequest({ question: "What changed?", conversation: [{ role: "user", content: "First" }, { role: "assistant", content: "Second" }, { role: "user", content: "Third" }] }, { maxInputCharacters: 100, maxConversationTurns: 2 });
    expect(parsed.conversation.map((turn) => turn.content)).toEqual(["Second", "Third"]);
  });

  it("can disable conversation history", () => {
    const parsed = parseAskEchoRequest({ question: "What changed?", conversation: [{ role: "user", content: "Earlier" }] }, { maxInputCharacters: 100, maxConversationTurns: 0 });
    expect(parsed.conversation).toEqual([]);
  });

  it("keeps bounded current-meeting chunks and notes for Ask Echo", () => {
    const parsed = parseAskEchoRequest({
      question: "What did we decide?",
      conversation: [],
      currentMeeting: {
        elapsedSeconds: 95,
        segments: [
          { index: 0, startedAtSeconds: 0, text: "Old opening context" },
          { index: 1, startedAtSeconds: 45, text: "Decision: Alex owns the follow-up" },
        ],
        notes: [{ timestamp: "[01:10]", text: "Confirm by Friday" }],
      },
    }, { maxInputCharacters: 100, maxConversationTurns: 2, maxCurrentMeetingCharacters: 60 });

    expect(parsed.currentMeeting).toMatchObject({ elapsedSeconds: 95 });
    expect(parsed.currentMeeting?.segments.at(-1)?.text).toContain("Alex owns");
    expect(parsed.currentMeeting?.notes[0]?.timestamp).toBe("[01:10]");
    const total = [...(parsed.currentMeeting?.segments || []), ...(parsed.currentMeeting?.notes || [])].reduce((sum, item) => sum + item.text.length, 0);
    expect(total).toBeLessThanOrEqual(60);
  });
});
