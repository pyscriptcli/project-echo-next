import { NextRequest, NextResponse } from "next/server";
import { processClickUpSyncQueue } from "@/lib/clickupSync";
import { purgeExpiredClickUpData } from "@/lib/clickupReadStore";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    const results = await processClickUpSyncQueue(2);
    await purgeExpiredClickUpData();
    return NextResponse.json({ processed: results.length, results });
  } catch {
    return NextResponse.json({ error: "ClickUp sync queue is unavailable." }, { status: 503 });
  }
}
