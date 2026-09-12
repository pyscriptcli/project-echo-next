import { describe, expect, it } from "vitest";
import { rankEvidenceSources, retrieveMeetingEvidence } from "./retrieval";

const meetings = [
  {
    id: "m1", meeting_id: "m1", title: "Leasing review", date: "2026-09-01", meeting_type: "Internal", location: "HQ",
    attendees_prime: ["Alex Cruz"], attendees_external: [], summary: "Reviewed the Makati office renewal.",
    items: [{ id: "i1", topic: "Makati renewal", evidence: "Client approved renewal discussion.", discussion_point: "The client approved a three-year renewal.", action_plan: "Alex will send the revised lease by Friday.", target_date: "2026-09-05", person_in_charge: "Alex Cruz" }]
  },
  {
    id: "m2", meeting_id: "m2", title: "Marketing planning", date: "2026-08-20", meeting_type: "Team", location: "Online",
    attendees_prime: ["Jamie Lee"], attendees_external: [], summary: "Planned the social campaign.", items: []
  }
] as any;

describe("retrieveMeetingEvidence", () => {
  it("returns the most relevant meeting items with stable source IDs", () => {
    const result = retrieveMeetingEvidence(meetings, "Who owns the Makati lease renewal?", { maxSources: 3, maxCharacters: 2000 });
    expect(result[0]).toMatchObject({ meetingId: "m1", itemId: "i1", meetingTitle: "Leasing review", person: "Alex Cruz" });
    expect(result[0].excerpt).toContain("Alex will send the revised lease");
  });

  it("honors source and character limits", () => {
    const result = retrieveMeetingEvidence(meetings, "meeting", { maxSources: 1, maxCharacters: 80 });
    expect(result).toHaveLength(1);
    expect(result[0].excerpt.length).toBeLessThanOrEqual(80);
  });

  it("prioritizes the signed-in user's items when they ask about themselves", () => {
    const result = rankEvidenceSources([
      { sourceId: "other", meetingId: "other", meetingTitle: "Other task", meetingDate: "2026-09-10", excerpt: "Prepare the report", person: "Jamie Lee", ownerIds: ["jamie@example.com"] },
      { sourceId: "mine", meetingId: "mine", meetingTitle: "My task", meetingDate: "2026-09-09", excerpt: "Prepare the report", person: "Alex Cruz", ownerIds: ["alex@example.com"] },
    ], "What are my tasks?", { maxSources: 2, maxCharacters: 1000, user: { name: "Alex Cruz", email: "alex@example.com" } });
    expect(result[0].sourceId).toBe("mine");
  });
});
