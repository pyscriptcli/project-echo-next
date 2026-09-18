import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { answerAskEcho } from "@/lib/ask-echo/service";
import { AdminConfigError, isAskEchoEnabled } from "@/lib/admin-config/store";
import { requireFeature } from "@/lib/access-control-server";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const user = getUserFromRequest(req);
  if (!token || !user?.email) return NextResponse.json({ error: "Please sign in before using Ask Echo." }, { status: 401 });
  try {
    const denied = await requireFeature(req, "ask-echo");
    if (denied) return denied;
    if (!(await isAskEchoEnabled())) {
      return NextResponse.json({ error: "Ask Echo is currently disabled by an administrator.", code: "FEATURE_DISABLED" }, { status: 403 });
    }
    const body = await req.json();
    return NextResponse.json(await answerAskEcho(body, {
      id: user.id,
      name: user.username,
      email: user.email.toLowerCase().trim(),
      clickUpToken: token,
      taskListId: req.cookies.get("echo_clickup_list_id")?.value || "",
    }));
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    const isConfigError = (typeof AdminConfigError === "function" && error instanceof AdminConfigError) || (error && typeof error === "object" && (error as { name?: string }).name === "AdminConfigError");
    if (isConfigError) return NextResponse.json({ error: (error as Error).message, code: "CONFIG_UNAVAILABLE" }, { status: Number((error as { status?: number }).status || 503) });
    const message = status >= 500 ? "Echo couldn’t answer that just now. Please try again." : (error instanceof Error ? error.message : "Ask Echo couldn’t answer right now. Please try again.");
    if (status >= 500) console.error("[Ask Echo] Request failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
