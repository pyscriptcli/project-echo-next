import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { meeting_details, items, other_discussions, transcript } = await req.json();

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_KEY || "";
    
    if (!url || !key) {
      return NextResponse.json({ status: "success", message: "Supabase keys not set, simulating success.", meeting_id: "MOCK-123" });
    }

    const supabase = createClient(url, key);
    const meeting_id = `MOM-${new Date().getTime()}`;
    
    const payload = {
      meeting_id,
      client_name: meeting_details.client_name || "Unknown",
      meeting_date: meeting_details.date || new Date().toISOString().split("T")[0],
      meeting_type: meeting_details.meeting_type || "Internal",
      location: meeting_details.location || "",
      summary_md: other_discussions,
      transcript_md: transcript.substring(0, 5000),
      table_items: items,
    };
    
    const { error } = await supabase.from("meeting_archives").upsert(payload, { onConflict: "meeting_id" });
    if (error) throw error;

    return NextResponse.json({ status: "success", message: "Successfully archived meeting record!", meeting_id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
