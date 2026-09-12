import { describe, expect, it } from "vitest";
import { retrieveMeetingEvidence } from "./retrieval";

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
});
