import { afterEach, describe, expect, it, vi } from "vitest";
import { askModel, parseModelJson } from "./provider";
import { resetGroqPool } from "@/lib/groqPool";

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

describe("askModel provider routing", () => {
  afterEach(() => {
    resetGroqPool();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const baseArgs = {
    model: "llama-3.3-70b-versatile",
    fallbackModel: "deepseek-chat",
    maxOutputTokens: 1000,
    question: "What happened in the meeting?",
    conversation: [],
    evidence: [],
  };

  it("uses Groq Llama 3.3 70B as primary free engine", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key-alpha");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ answer: "Meeting went well", confidence: "supported" }) } }],
          usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
        }),
        { status: 200 }
      )
    );

    const result = await askModel(baseArgs);

    expect(result.provider).toBe("groq");
    expect(result.model).toBe("llama-3.3-70b-versatile");
    expect(result.content.answer).toBe("Meeting went well");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect((fetchMock.mock.calls[0][1] as RequestInit)?.headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer groq-key-alpha" })
    );
  });

  it("falls back to DeepSeek when Groq pool is rate-limited", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key-alpha");
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-key");

    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Rate limit" } }), { status: 429, headers: { "retry-after": "30" } }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ answer: "DeepSeek rescued", confidence: "supported" }) } }],
            usage: { prompt_tokens: 60, completion_tokens: 25, total_tokens: 85 },
          }),
          { status: 200 }
        )
      );

    const result = await askModel(baseArgs);

    expect(result.provider).toBe("deepseek");
    expect(result.model).toBe("deepseek-chat");
    expect(result.fallbackUsed).toBe(true);
    expect(result.content.answer).toBe("DeepSeek rescued");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(fetchMock.mock.calls[1][0]).toBe("https://api.deepseek.com/chat/completions");
  });
});
