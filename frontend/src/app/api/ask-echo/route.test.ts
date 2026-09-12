import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const answerAskEcho = vi.fn();
const getTokenFromRequest = vi.fn();
const getUserFromRequest = vi.fn();
vi.mock("@/lib/ask-echo/service", () => ({ answerAskEcho }));
vi.mock("@/lib/auth", () => ({ getTokenFromRequest, getUserFromRequest }));

describe("POST /api/ask-echo", () => {
  beforeEach(() => { answerAskEcho.mockReset(); getTokenFromRequest.mockReturnValue("token"); getUserFromRequest.mockReturnValue({ email: "user@primephilippines.com" }); });

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
});
