import { ArchivedMeeting } from "@/types/meeting";

export const INITIAL_ARCHIVED_MEETINGS: ArchivedMeeting[] = [
  {
    id: "MOM-20260908-01",
    meeting_id: "MOM-20260908-01",
    title: "Core Strategy Meeting",
    date: "2026-09-08",
    meeting_type: "Internal",
    location: "GreatWork Mega Tower 32F - Secret Room",
    attendees_prime: ["Dave Policarpio", "Internal Leadership Team"],
    attendees_external: [],
    summary: "The Executive Core Meeting convened to establish procedural priorities for executive workflows, focusing on AI-assisted minutes transcription, standardized action-item matrices, and automated document compilation. Attendees finalized timelines for tool selection and assigned responsibility for platform integration to Dave Policarpio.",
    items: [
      {
        id: "item-1",
        topic: "AI Minutes Architecture & Customization Edge",
        evidence: "[00:02] Executive discussion on bypassing generic tools like Fireflies or Read.ai.",
        discussion_point: "Custom MoM formats, in-house data sovereignty, and custom PDF/Word export templates aligned with corporate standards.",
        action_plan: "Implement full Next.js dynamic workspace with master-detail review and document generator.",
        target_date: "2026-09-15",
        person_in_charge: "Dave Policarpio"
      },
      {
        id: "item-2",
        topic: "Task Tool & ClickUp Integration",
        evidence: "[00:08] Evaluation of workflow handoffs and automated delegation.",
        discussion_point: "Connecting minutes action items directly into team management platforms without manual re-entry.",
        action_plan: "Prepare API connectors for ClickUp and Slack automated action tracking.",
        target_date: "2026-09-20",
        person_in_charge: "Dave Policarpio"
      }
    ],
    transcript: "Speaker 1 (00:01): Welcome to the Core Strategy Meeting at GreatWork Mega Tower 32F Secret Room. Today we are aligning on our AI minutes architecture, comparing custom capabilities vs ready-built tools like Fireflies and Read.ai. Speaker 2 (00:03): The primary edge of our custom solution is full ownership, custom corporate formatting, pay-per-use efficiency, and direct ClickUp integrations...",
    created_at: "2026-09-08T08:00:00.000Z"
  }
];

const STORAGE_KEY = "project_echo_meetings_cache_v2";

export function getLocalMeetings(): ArchivedMeeting[] {
  if (typeof window === "undefined") return INITIAL_ARCHIVED_MEETINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ARCHIVED_MEETINGS));
      return INITIAL_ARCHIVED_MEETINGS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ARCHIVED_MEETINGS;
  } catch (e) {
    console.error("Failed to load local meetings:", e);
    return INITIAL_ARCHIVED_MEETINGS;
  }
}

export function saveLocalMeeting(meeting: ArchivedMeeting): ArchivedMeeting[] {
  if (typeof window === "undefined") return [meeting];
  try {
    const current = getLocalMeetings();
    const existingIndex = current.findIndex((m) => m.id === meeting.id || m.meeting_id === meeting.meeting_id);
    let updated: ArchivedMeeting[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...meeting };
    } else {
      updated = [meeting, ...current];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save local meeting:", e);
    return [meeting];
  }
}
