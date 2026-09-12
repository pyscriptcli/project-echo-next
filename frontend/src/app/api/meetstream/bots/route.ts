import { NextRequest, NextResponse } from "next/server";

const MEETSTREAM_URL = "https://api.meetstream.ai/api/v1/bots/create_bot";

function appUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host") || "localhost:3000"}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.MEETSTREAM_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Meeting bot setup is not configured yet." }, { status: 503 });

  try {
    const body = await req.json();
    const meetingLink = String(body.meetingLink || "").trim();
    if (!/^https:\/\//i.test(meetingLink)) return NextResponse.json({ error: "Enter a valid meeting link." }, { status: 400 });

    const response = await fetch(MEETSTREAM_URL, {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_link: meetingLink,
        bot_name: "Echo.ai",
        video_required: true,
        callback_url: `${appUrl(req)}/api/meetstream/webhook`,
        live_transcription_required: { webhook_url: `${appUrl(req)}/api/meetstream/webhook` },
        custom_attributes: { source: "echo", mode: "bot" },
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return NextResponse.json({ error: data.detail || data.message || "Echo.ai could not join this meeting." }, { status: response.status });
    return NextResponse.json({ botId: data.bot_id, status: data.status || "Active" });
  } catch (error) {
    console.error("[MeetStream] create bot failed", error);
    return NextResponse.json({ error: "Echo.ai could not join this meeting." }, { status: 502 });
  }
}
