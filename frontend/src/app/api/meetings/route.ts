import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { INITIAL_ARCHIVED_MEETINGS } from "@/lib/meetingsData";

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
