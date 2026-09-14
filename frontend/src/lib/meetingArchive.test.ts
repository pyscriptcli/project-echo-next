import { describe, expect, it } from "vitest";
import { parseDiscussionItems } from "./meetingArchive";

describe("parseDiscussionItems", () => {
  it("restores discussion points stored in a ClickUp description", () => {
    const items = parseDiscussionItems(JSON.stringify([{ id: "dp-1", topic_title: "Budget", evidence_quote: "[00:10] Budget was reviewed", discussion_point: "The team reviewed the budget.", action_plan: "Send revised forecast", indicative_delivery_date: "2026-09-20", person_in_charge: "Dave" }]));
    expect(items).toEqual([{ id: "dp-1", topic: "Budget", evidence: "[00:10] Budget was reviewed", discussion_point: "The team reviewed the budget.", action_plan: "Send revised forecast", target_date: "2026-09-20", person_in_charge: "Dave", clickUpTaskId: undefined, clickUpUrl: undefined }]);
  });
});
