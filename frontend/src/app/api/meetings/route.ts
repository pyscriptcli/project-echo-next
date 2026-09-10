import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { INITIAL_ARCHIVED_MEETINGS } from "@/lib/meetingsData";
import { getTokenFromRequest } from "@/lib/auth";

function meetingDescription(meeting: any) {
  const details = [
    "# Meeting Details",
    `**Meeting:** ${meeting.title || "Executive Meeting"}`,
    `**Date:** ${meeting.date || ""}`,
    `**Type:** ${meeting.meeting_type || ""}`,
    `**Location:** ${meeting.location || ""}`,
    `**Team attendees:** ${(meeting.attendees_prime || []).join(", ") || "—"}`,
    `**External attendees:** ${(meeting.attendees_external || []).join(", ") || "—"}`,
    "\n# Executive Summary",
    meeting.summary || "—",
    "\n# Discussion Points",
    ...(meeting.items || []).map((item: any, index: number) => `## ${index + 1}. ${item.topic || "Discussion topic"}\n**Discussion:** ${item.discussion_point || "—"}\n**Action:** ${item.action_plan || "—"}\n**Owner:** ${item.person_in_charge || "—"}\n**Target date:** ${item.target_date || "—"}`),
    "\n# Full Transcript",
    meeting.transcript || "—",
  ];
  return details.join("\n");
}

function changeSummary(before: any, after: any) {
  const fields = [["title", "meeting title"], ["date", "date"], ["meeting_type", "meeting type"], ["location", "location"], ["summary", "summary"], ["transcript", "full transcript"]];
  const changes = fields.filter(([field]) => JSON.stringify(before?.[field]) !== JSON.stringify(after?.[field])).map(([, label]) => label);
  if (JSON.stringify(before?.items) !== JSON.stringify(after?.items)) changes.push("discussion points");
  if (JSON.stringify(before?.attendees_prime) !== JSON.stringify(after?.attendees_prime) || JSON.stringify(before?.attendees_external) !== JSON.stringify(after?.attendees_external)) changes.push("attendees");
  return changes.length ? changes.join(", ") : "meeting archive";
}

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_KEY || "";

    if (!url || !key) {
      return NextResponse.json({
        status: "fallback",
        meetings: INITIAL_ARCHIVED_MEETINGS
      });
    }

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("meeting_archives")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        status: "fallback",
        meetings: INITIAL_ARCHIVED_MEETINGS
      });
    }

    const formatted = data.map((d: any) => ({
      id: d.meeting_id || d.id,
      meeting_id: d.meeting_id || d.id,
      title: d.client_name || "Executive Meeting",
      date: d.meeting_date || new Date().toISOString().split("T")[0],
      meeting_type: d.meeting_type || "Internal",
      location: d.location || "",
      attendees_prime: d.attendees_prime || ["Dave Policarpio"],
      attendees_external: d.attendees_external || [],
      summary: d.summary_md || "",
      items: Array.isArray(d.table_items) ? d.table_items : [],
      transcript: d.transcript_md || "",
      created_at: d.created_at || new Date().toISOString()
    }));

    return NextResponse.json({
      status: "success",
      meetings: formatted
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "fallback",
      error: err.message,
      meetings: INITIAL_ARCHIVED_MEETINGS
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const meeting = body.meeting;
    const token = getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    if (!meeting?.id) return NextResponse.json({ error: "Meeting archive is missing its ClickUp task ID." }, { status: 400 });

    const headers = { Authorization: token, "Content-Type": "application/json" };
    const update = await fetch(`https://api.clickup.com/api/v2/task/${meeting.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ name: `${meeting.date || new Date().toISOString().slice(0, 10)} — ${meeting.title || "Echo Meeting"}`, description: meetingDescription(meeting) }),
    });
    if (!update.ok) return NextResponse.json({ error: `Unable to update meeting in ClickUp (${update.status}): ${await update.text()}` }, { status: update.status });

    const audit = await fetch(`https://api.clickup.com/api/v2/task/${meeting.id}/comment`, {
      method: "POST",
      headers,
      body: JSON.stringify({ comment_text: `Echo archive updated: ${changeSummary(body.previousMeeting, meeting)}.`, notify_all: false }),
    });
    if (!audit.ok) console.warn("ClickUp audit comment failed:", await audit.text());

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_KEY || "";

    if (url && key) {
      const supabase = createClient(url, key);
      const payload = {
        meeting_id: meeting.meeting_id || meeting.id,
        client_name: meeting.title || "Executive Meeting",
        meeting_date: meeting.date,
        meeting_type: meeting.meeting_type || "Internal",
        location: meeting.location || "",
        summary_md: meeting.summary || "",
        transcript_md: (meeting.transcript || "").substring(0, 5000),
        table_items: meeting.items || [],
      };

      await supabase.from("meeting_archives").upsert(payload, { onConflict: "meeting_id" });
    }

    return NextResponse.json({ status: "success", meeting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
