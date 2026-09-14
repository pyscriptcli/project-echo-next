import { describe, expect, it } from "vitest";
import { parseDiscussionItems } from "./meetingArchive";

describe("parseDiscussionItems", () => {
  it("restores discussion points stored in a ClickUp description", () => {
    const items = parseDiscussionItems(JSON.stringify([{ id: "dp-1", topic_title: "Budget", evidence_quote: "[00:10] Budget was reviewed", discussion_point: "The team reviewed the budget.", action_plan: "Send revised forecast", indicative_delivery_date: "2026-09-20", person_in_charge: "Dave" }]));
    expect(items).toEqual([{ id: "dp-1", topic: "Budget", evidence: "[00:10] Budget was reviewed", discussion_point: "The team reviewed the budget.", action_plan: "Send revised forecast", target_date: "2026-09-20", person_in_charge: "Dave", clickUpTaskId: undefined, clickUpUrl: undefined }]);
  });

  it("parses the markdown format written to ClickUp task descriptions", () => {
    const result = parseDiscussionItems(`## 1. RFP automation\n**Discussion:** The team reviewed the workflow.\n**Action:** Confirm the next prototype.\n**Owner:** Dave\n**Target date:** 2026-09-18`);

    expect(result).toEqual([{ id: "discussion-1", topic: "RFP automation", evidence: "", discussion_point: "The team reviewed the workflow.", action_plan: "Confirm the next prototype.", target_date: "2026-09-18", person_in_charge: "Dave", clickUpTaskId: undefined, clickUpUrl: undefined }]);
  });
});
