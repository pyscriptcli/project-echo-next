import { ArchivedMeeting } from "@/types/meeting";

// ClickUp is the only Single Source of Truth (SSOT).
// No hardcoded mock meeting datasets or localStorage meeting caches are retained.
export const INITIAL_ARCHIVED_MEETINGS: ArchivedMeeting[] = [];

/**
 * Merge and deduplicate meeting records in-memory.
 */
export function mergeMeetings(
  existing: ArchivedMeeting[],
  incoming: ArchivedMeeting[]
): ArchivedMeeting[] {
  const map = new Map<string, ArchivedMeeting>();
  for (const m of existing) {
    if (m.id) map.set(m.id, m);
  }
  for (const m of incoming) {
    if (m.id) map.set(m.id, { ...map.get(m.id), ...m });
  }
  return Array.from(map.values()).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}
