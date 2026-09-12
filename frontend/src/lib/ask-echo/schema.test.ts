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
});
