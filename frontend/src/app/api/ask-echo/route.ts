import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest, getUserFromRequest } from "@/lib/auth";
import { answerAskEcho } from "@/lib/ask-echo/service";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const user = getUserFromRequest(req);
  if (!token || !user?.email) return NextResponse.json({ error: "Please sign in before using Ask Echo." }, { status: 401 });
  try {
    const body = await req.json();
    return NextResponse.json(await answerAskEcho(body, user.email.toLowerCase().trim()));
  } catch (error) {
    const status = Number((error as { status?: number }).status || 500);
    const message = error instanceof Error ? error.message : "Ask Echo couldn’t answer right now. Please try again.";
    if (status >= 500) console.error("[Ask Echo] Request failed:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
