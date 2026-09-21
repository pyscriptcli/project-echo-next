import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    const botId = String(event?.bot_id || event?.data?.bot_id || "").trim();
    const botEvent = String(event?.bot_event || event?.event || "").trim();
    if (!botId || !botEvent) return NextResponse.json({ received: false, error: "Invalid MeetStream event." }, { status: 400 });
    // Keep this endpoint fast and side-effect free. The client polls the
    // authenticated status endpoint while the durable post-call pipeline is
    // added, so webhook retries cannot duplicate processing.
    console.info("[MeetStream] webhook", {
      event: botEvent,
      botId,
      status: event?.bot_status,
      statusCode: event?.status_code,
    });
    return NextResponse.json({ received: true, botId, event: botEvent });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
