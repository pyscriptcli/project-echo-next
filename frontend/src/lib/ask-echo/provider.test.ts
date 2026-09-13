import { describe, expect, it } from "vitest";
import { parseModelJson } from "./provider";

describe("Ask Echo model response parsing", () => {
  it("accepts fenced JSON with trailing commentary", () => {
    expect(parseModelJson('```json\n{"answer":"Done","confidence":"supported"}\n```\nHope that helps.')).toEqual({ answer: "Done", confidence: "supported" });
  });

  it("ignores extra characters after the first complete object", () => {
    expect(parseModelJson('{"answer":"Done","sourceIds":[]} extra text')).toMatchObject({ answer: "Done", sourceIds: [] });
  });

  it("rejects incomplete model output with a user-safe error", () => {
    expect(() => parseModelJson('{"answer":"Still thinking"')).toThrow("incomplete response");
  });
});
