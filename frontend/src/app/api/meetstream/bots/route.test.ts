import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getTokenFromRequest = vi.fn();
const getUserFromRequest = vi.fn();
vi.mock("@/lib/auth", () => ({
  cleanEnv: (value?: string) => value?.trim() || "",
  getTokenFromRequest,
  getUserFromRequest,
}));

describe("POST /api/meetstream/bots", () => {
  beforeEach(() => {
    vi.stubEnv("MEETSTREAM_API_KEY", "test-key");
    getTokenFromRequest.mockReturnValue("clickup-token");
    getUserFromRequest.mockReturnValue({ id: 42, email: "user@primephilippines.com" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("creates Echo.ai with live transcription and the deployment callback", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ bot_id: "bot-1", status: "Active" }), { status: 201 }));
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("https://echo.example/api/meetstream/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meetingLink: "https://meet.google.com/abc-defg-hij" }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ botId: "bot-1", status: "Active" });
    const [, request] = fetchMock.mock.calls[0];
    const payload = JSON.parse(String(request?.body));
    expect(payload).toMatchObject({
      bot_name: "Echo.ai",
      callback_url: "https://echo.example/api/meetstream/webhook",
      live_transcription_required: { webhook_url: "https://echo.example/api/meetstream/webhook" },
      recording_config: { transcript: { provider: { deepgram_streaming: { transcription_mode: "sentence" } } } },
    });
  });

  it("reports missing server configuration without exposing a secret", async () => {
    vi.stubEnv("MEETSTREAM_API_KEY", "");
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("https://echo.example/api/meetstream/bots", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ meetingLink: "https://meet.google.com/abc-defg-hij" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "Meeting bot setup is not configured yet." });
  });
});
