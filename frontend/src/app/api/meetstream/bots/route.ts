import { NextRequest, NextResponse } from "next/server";
import { cleanEnv, getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const MEETSTREAM_URL = "https://api.meetstream.ai/api/v1/bots/create_bot";

export type MeetingPlatform = "google_meet" | "zoom" | "teams";

export function parseMeetingLink(value: string): { meetingLink: string; platform: MeetingPlatform } | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "meet.google.com" && /^\/[^/]+/.test(url.pathname)) {
      return { meetingLink: url.toString(), platform: "google_meet" };
    }
    if ((host === "zoom.us" || host.endsWith(".zoom.us")) && /\/j\//i.test(url.pathname)) {
      return { meetingLink: url.toString(), platform: "zoom" };
    }
    if ((host === "teams.microsoft.com" || host === "teams.live.com" || host.endsWith(".teams.microsoft.com")) && /\/l\/meetup-join\//i.test(url.pathname)) {
      return { meetingLink: url.toString(), platform: "teams" };
    }
  } catch {
    return null;
  }
  return null;
}

function appUrl(req: NextRequest) {
  const configuredUrl = cleanEnv(
    process.env.MEETSTREAM_WEBHOOK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL
  );
  const candidate = configuredUrl
    ? (/^https?:\/\//i.test(configuredUrl) ? configuredUrl : `https://${configuredUrl}`)
    : req.nextUrl.origin;
  try {
    return new URL(candidate).origin;
  } catch {
    return req.nextUrl.origin;
  }
}

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  const user = getUserFromRequest(req);
  if (!token || !user?.email) return NextResponse.json({ error: "Please sign in before inviting Echo.ai." }, { status: 401 });

  const apiKey = cleanEnv(process.env.MEETSTREAM_API_KEY);
  if (!apiKey) return NextResponse.json({ error: "Meeting bot setup is not configured yet." }, { status: 503 });

  try {
    const body = await req.json();
    const parsed = parseMeetingLink(String(body.meetingLink || ""));
    if (!parsed) return NextResponse.json({ error: "Paste a valid Google Meet, Microsoft Teams, or Zoom meeting link." }, { status: 400 });

    const webhookUrl = `${appUrl(req)}/api/meetstream/webhook`;
    const response = await fetch(MEETSTREAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        meeting_link: parsed.meetingLink,
        bot_name: "Echo.ai",
        // Echo is a transcription-first product. Avoid video capture costs and
        // bandwidth unless we add an explicit video mode later.
        video_required: false,
        callback_url: webhookUrl,
        // MeetStream is the capture layer only. Echo transcribes the completed
        // audio through the same Groq -> OpenRouter pipeline used for botless recording.
        custom_attributes: { source: "echo", mode: "bot", platform: parsed.platform, user_id: String(user.id) },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[MeetStream] create bot rejected", { status: response.status, detail: data.detail || data.message });
      return NextResponse.json({ error: data.detail || data.message || "Echo.ai could not join this meeting." }, { status: response.status });
    }
    return NextResponse.json({ botId: data.bot_id, transcriptId: data.transcript_id || null, platform: parsed.platform, status: data.status || "Joining" });
  } catch (error) {
    console.error("[MeetStream] create bot failed", error);
    return NextResponse.json({ error: "Echo.ai could not join this meeting." }, { status: 502 });
  }
}
