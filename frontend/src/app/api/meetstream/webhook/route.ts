import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    console.info("[MeetStream] webhook", { event: event?.event, botId: event?.bot_id || event?.data?.bot_id });
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }
}
