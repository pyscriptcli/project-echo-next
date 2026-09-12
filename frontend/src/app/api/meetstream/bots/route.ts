import { NextRequest, NextResponse } from "next/server";
import { cleanEnv, getTokenFromRequest, getUserFromRequest } from "@/lib/auth";

const MEETSTREAM_URL = "https://api.meetstream.ai/api/v1/bots/create_bot";

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
    const meetingLink = String(body.meetingLink || "").trim();
    if (!/^https:\/\//i.test(meetingLink)) return NextResponse.json({ error: "Enter a valid meeting link." }, { status: 400 });

    const webhookUrl = `${appUrl(req)}/api/meetstream/webhook`;
    const response = await fetch(MEETSTREAM_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        meeting_link: meetingLink,
        bot_name: "Echo.ai",
        video_required: true,
        callback_url: webhookUrl,
        live_transcription_required: { webhook_url: webhookUrl },
        recording_config: {
          transcript: {
            provider: {
              deepgram_streaming: {
                transcription_mode: "sentence",
                model: "nova-2",
                language: "en",
                punctuate: true,
                smart_format: true,
                endpointing: 300,
                vad_events: true,
                utterance_end_ms: 1000,
                encoding: "linear16",
                channels: 1,
              },
            },
          },
        },
        custom_attributes: { source: "echo", mode: "bot", user_id: String(user.id) },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[MeetStream] create bot rejected", { status: response.status, detail: data.detail || data.message });
      return NextResponse.json({ error: data.detail || data.message || "Echo.ai could not join this meeting." }, { status: response.status });
    }
    return NextResponse.json({ botId: data.bot_id, status: data.status || "Active" });
  } catch (error) {
    console.error("[MeetStream] create bot failed", error);
    return NextResponse.json({ error: "Echo.ai could not join this meeting." }, { status: 502 });
  }
}
