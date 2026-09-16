import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getTokenFromRequest, getWorkspaceApiToken } from "@/lib/auth";
import { parseDiscussionItems } from "@/lib/meetingArchive";

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

function isMeetingArchiveList(name?: string): boolean {
  if (!name) return false;
  const n = name.trim().toLowerCase();
  return (
    n === "echo meetings" ||
    n === "echo meeting" ||
    n === "meetings archive" ||
    n === "meeting archive" ||
    n === "meetings archives" ||
    n === "meeting archives" ||
    n.includes("meeting archive") ||
    n.includes("echo meeting")
  );
}

function parseMeetingTask(task: any, spaceId: string, spaceName: string, list: any): any {
  const match = String(task.name || "").match(/^(\d{4}-\d{2}-\d{2})\s+—\s+(.*)$/);
  const description = task.description || "";
  const section = (name: string, next?: string) => {
    const pattern = new RegExp(`# ${name}\\r?\\n([\\s\\S]*?)${next ? `(?=\\r?\\n# ${next})` : "$"}`);
    return description.match(pattern)?.[1]?.trim() || "";
  };

  const locMatch = description.match(/\*\*Location:\*\*\s*(.*)/);
  const primeMatch = description.match(/\*\*Team [Aa]ttendees:\*\*\s*(.*)/);
  const extMatch = description.match(/\*\*External [Aa]ttendees:\*\*\s*(.*)/);

  const attendeesPrime = primeMatch?.[1]
    ? primeMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];
  const attendeesExternal = extMatch?.[1]
    ? extMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  return {
    id: String(task.id),
    meeting_id: String(task.id),
    title: match?.[2] || task.name || "Echo Meeting",
    date: match?.[1] || (task.date_created ? new Date(Number(task.date_created)).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
    meeting_type: "Internal",
    location: locMatch?.[1]?.trim() || "",
    attendees_prime: attendeesPrime.length > 0 ? attendeesPrime : ["Dave Policarpio"],
    attendees_external: attendeesExternal,
    summary: section("Executive Summary", "Discussion Points"),
    items: parseDiscussionItems(section("Discussion Points", "Full Transcript")),
    transcript: section("Full Transcript"),
    created_at: task.date_created ? new Date(Number(task.date_created)).toISOString() : new Date().toISOString(),
    clickup_space_id: String(spaceId),
    clickup_space_name: spaceName,
    clickup_list_id: String(list.id),
    clickup_list_name: list.name,
    clickup_task_url: task.url || `https://app.clickup.com/t/${task.id}`,
    archive_status: task.status?.status || "completed ontime"
  };
}

async function fetchMeetingsFromSpace(spaceId: string, token: string): Promise<any[]> {
  const headers = { Authorization: token };
  
  const [spaceRes, listsRes, foldersRes] = await Promise.all([
    fetch(`https://api.clickup.com/api/v2/space/${spaceId}`, { headers, cache: "no-store" }).catch(() => null),
    fetch(`https://api.clickup.com/api/v2/space/${spaceId}/list`, { headers, cache: "no-store" }).catch(() => null),
    fetch(`https://api.clickup.com/api/v2/space/${spaceId}/folder`, { headers, cache: "no-store" }).catch(() => null),
  ]);

  const spaceData = spaceRes?.ok ? await spaceRes.json().catch(() => ({})) : {};
  const spaceName = spaceData.name || `Space ${spaceId}`;

  const targetLists: Array<{ id: string; name: string }> = [];

  if (listsRes?.ok) {
    const listsData = await listsRes.json().catch(() => ({}));
    for (const l of listsData.lists || []) {
      if (isMeetingArchiveList(l.name)) {
        targetLists.push({ id: String(l.id), name: l.name });
      }
    }
  }

  if (foldersRes?.ok) {
    const foldersData = await foldersRes.json().catch(() => ({}));
    for (const f of foldersData.folders || []) {
      for (const l of f.lists || []) {
        if (isMeetingArchiveList(l.name)) {
          targetLists.push({ id: String(l.id), name: l.name });
        }
      }
    }
  }

  if (targetLists.length === 0) {
    return [];
  }

  const allTasksArrays = await Promise.all(
    targetLists.map(async (list) => {
      try {
        const tasksRes = await fetch(
          `https://api.clickup.com/api/v2/list/${list.id}/task?include_closed=true&subtasks=true`,
          { headers, cache: "no-store" }
        );
        if (!tasksRes.ok) return [];
        const tasksData = await tasksRes.json();
        return (tasksData.tasks || []).map((t: any) => parseMeetingTask(t, spaceId, spaceName, list));
      } catch (e) {
        console.warn(`Failed to read tasks for list ${list.id} in space ${spaceId}:`, e);
        return [];
      }
    })
  );

  return allTasksArrays.flat();
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req) || getWorkspaceApiToken();
    const searchParams = new URL(req.url).searchParams;
    const spaceId = searchParams.get("spaceId");
    const isAll = searchParams.get("all") === "true" || !spaceId || spaceId === "__all__";

    if (token) {
      if (!isAll && spaceId) {
        const meetings = await fetchMeetingsFromSpace(spaceId, token);
        return NextResponse.json({
          status: "success",
          meetings,
          count: meetings.length
        });
      }

      try {
        const teamsRes = await fetch("https://api.clickup.com/api/v2/team", {
          headers: { Authorization: token },
          cache: "no-store"
        });

        if (teamsRes.ok) {
          const teamsData = await teamsRes.json();
          const spaceIds: string[] = [];

          for (const team of teamsData.teams || []) {
            const spacesRes = await fetch(`https://api.clickup.com/api/v2/team/${team.id}/space`, {
              headers: { Authorization: token },
              cache: "no-store"
            }).catch(() => null);

            if (spacesRes?.ok) {
              const spacesData = await spacesRes.json().catch(() => ({}));
              for (const s of spacesData.spaces || []) {
                spaceIds.push(String(s.id));
              }
            }
          }

          const spaceResults = await Promise.all(
            spaceIds.map((sId) => fetchMeetingsFromSpace(sId, token))
          );

          const mergedMeetings = spaceResults.flat();
          mergedMeetings.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

          const uniqueMeetings = Array.from(
            new Map(mergedMeetings.map((m: any) => [m.id, m])).values()
          );

          return NextResponse.json({
            status: "success",
            meetings: uniqueMeetings,
            count: uniqueMeetings.length
          });
        }
      } catch (clickUpAllErr) {
        console.warn("ClickUp all-space discovery encountered an issue:", clickUpAllErr);
      }
    }

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_KEY || "";

    if (url && key) {
      const supabase = createClient(url, key);
      const { data, error } = await supabase
        .from("meeting_archives")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
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
      }
    }

    return NextResponse.json({
      status: "success",
      meetings: []
    });
  } catch (err: any) {
    return NextResponse.json({
      status: "error",
      error: err.message,
      meetings: []
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const meeting = body.meeting;
    const token = getTokenFromRequest(req) || getWorkspaceApiToken();
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });
    if (!meeting?.id) return NextResponse.json({ error: "Meeting archive is missing its ClickUp task ID." }, { status: 400 });

    const headers = { Authorization: token, "Content-Type": "application/json" };
    const update = await fetch(`https://api.clickup.com/api/v2/task/${meeting.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        name: `${meeting.date || new Date().toISOString().slice(0, 10)} — ${meeting.title || "Echo Meeting"}`,
        description: meetingDescription(meeting)
      }),
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
      try {
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
      } catch (supErr) {
        console.warn("Supabase upsert non-blocking error:", supErr);
      }
    }

    return NextResponse.json({ status: "success", meeting });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req) || getWorkspaceApiToken();
    if (!token) return NextResponse.json({ error: "ClickUp authentication required" }, { status: 401 });

    const searchParams = new URL(req.url).searchParams;
    let meetingId = searchParams.get("meetingId") || searchParams.get("id");

    if (!meetingId) {
      try {
        const body = await req.json();
        meetingId = body.meetingId || body.id;
      } catch {}
    }

    if (!meetingId) {
      return NextResponse.json({ error: "Meeting ID is required for deletion." }, { status: 400 });
    }

    const delRes = await fetch(`https://api.clickup.com/api/v2/task/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: token },
    });

    if (!delRes.ok && delRes.status !== 404) {
      const errText = await delRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Unable to delete meeting in ClickUp (${delRes.status}): ${errText}` },
        { status: delRes.status }
      );
    }

    const url = process.env.SUPABASE_URL || "";
    const key = process.env.SUPABASE_KEY || "";
    if (url && key) {
      try {
        const supabase = createClient(url, key);
        await supabase.from("meeting_archives").delete().eq("meeting_id", meetingId);
      } catch (supErr) {
        console.warn("Supabase meeting delete non-blocking error:", supErr);
      }
    }

    return NextResponse.json({
      status: "success",
      message: "Meeting archive deleted successfully.",
      meetingId
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete meeting." }, { status: 500 });
  }
}
