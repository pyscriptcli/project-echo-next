import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const answerAskEcho = vi.fn();
const getTokenFromRequest = vi.fn();
const getUserFromRequest = vi.fn();
const isAskEchoEnabled = vi.fn();
const requireFeature = vi.fn();
vi.mock("@/lib/ask-echo/service", () => ({ answerAskEcho }));
vi.mock("@/lib/auth", () => ({ getTokenFromRequest, getUserFromRequest }));
vi.mock("@/lib/access-control-server", () => ({ requireFeature }));
vi.mock("@/lib/admin-config/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin-config/store")>();
  return { ...actual, isAskEchoEnabled };
});

describe("POST /api/ask-echo", () => {
  beforeEach(() => { answerAskEcho.mockReset(); isAskEchoEnabled.mockReset(); requireFeature.mockReset(); requireFeature.mockResolvedValue(null); isAskEchoEnabled.mockResolvedValue(true); getTokenFromRequest.mockReturnValue("token"); getUserFromRequest.mockReturnValue({ email: "user@primephilippines.com" }); });

  it("returns the grounded assistant response for an authenticated user", async () => {
    answerAskEcho.mockResolvedValue({ answer: "Alex owns it.", sources: [{ sourceId: "meeting:m1:item:i1" }], confidence: "supported", followUps: [] });
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/ask-echo", { method: "POST", body: JSON.stringify({ question: "Who owns it?", conversation: [] }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ answer: "Alex owns it.", confidence: "supported" });
    expect(answerAskEcho).toHaveBeenCalledWith({ question: "Who owns it?", conversation: [] }, { email: "user@primephilippines.com", clickUpToken: "token", taskListId: "" });
  });

  it("rejects an unauthenticated request before reading meeting data", async () => {
    getTokenFromRequest.mockReturnValue("");
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/ask-echo", { method: "POST", body: JSON.stringify({ question: "Show me everything" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(401);
    expect(answerAskEcho).not.toHaveBeenCalled();
  });

  it("rejects requests when Ask Echo is disabled", async () => {
    isAskEchoEnabled.mockResolvedValue(false);
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/ask-echo", { method: "POST", body: JSON.stringify({ question: "Show me everything" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "FEATURE_DISABLED" });
    expect(answerAskEcho).not.toHaveBeenCalled();
  });

  it("rejects requests when the user feature permission denies Ask Echo", async () => {
    requireFeature.mockResolvedValue(new Response(JSON.stringify({ code: "FEATURE_FORBIDDEN" }), { status: 403, headers: { "content-type": "application/json" } }));
    const { POST } = await import("./route");
    const response = await POST(new NextRequest("http://localhost/api/ask-echo", { method: "POST", body: JSON.stringify({ question: "Show me everything" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(403);
    expect(answerAskEcho).not.toHaveBeenCalled();
  });
});
