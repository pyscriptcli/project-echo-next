import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

function chunkRequest() {
  const form = new FormData();
  form.append("file", new File([new Uint8Array([1, 2, 3])], "chunk.webm", { type: "audio/webm" }));
  form.append("action", "transcribe_chunk");
  return new NextRequest("https://echo.example/api/process-audio", { method: "POST", body: form });
}

describe("botless transcription routing", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("uses Groq Whisper before paid providers", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ text: "Hello team" }), { status: 200 }));
    const { POST } = await import("./route");

    const response = await POST(chunkRequest());

    expect(await response.json()).toMatchObject({ transcript: "Hello team", provider: "groq" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
  });

  it("honors Groq rate limiting and falls back to OpenRouter", async () => {
    vi.stubEnv("GROQ_API_KEY", "groq-key");
    vi.stubEnv("OPENROUTER_API_KEY", "openrouter-key");
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Rate limited" } }), { status: 429, headers: { "retry-after": "30" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ text: "Fallback transcript" }), { status: 200 }));
    const { POST } = await import("./route");

    const response = await POST(chunkRequest());

    expect(await response.json()).toMatchObject({ transcript: "Fallback transcript", provider: "openrouter" });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.groq.com/openai/v1/audio/transcriptions",
      "https://openrouter.ai/api/v1/audio/transcriptions",
    ]);
  });
});
