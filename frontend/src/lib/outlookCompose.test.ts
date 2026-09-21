import { describe, expect, it } from "vitest";
import {
  createMeetingEmailDraft,
  createOutlookComposeUrl,
  isValidRecipientList,
} from "./outlookCompose";

describe("Outlook compose helpers", () => {
  it("creates a readable meeting subject and generic body", () => {
    const draft = createMeetingEmailDraft({ title: "Q3 Planning", date: "2026-09-21" });
    expect(draft.subject).toBe("Minutes of Meeting — Q3 Planning — September 21, 2026");
    expect(draft.body).toContain("Please find the Minutes of Meeting for Q3 Planning");
  });

  it("validates comma- and semicolon-separated recipients", () => {
    expect(isValidRecipientList("one@example.com; two@example.com")).toBe(true);
    expect(isValidRecipientList("not-an-email")).toBe(false);
    expect(isValidRecipientList("")).toBe(false);
  });

  it("encodes compose fields and omits an empty CC", () => {
    const url = createOutlookComposeUrl({
      to: "one@example.com; two@example.com",
      cc: "",
      subject: "Minutes & decisions",
      body: "Attach the PDF, then review and send.",
    });
    expect(url).toContain("to=one%40example.com%2Ctwo%40example.com");
    expect(url).toContain("subject=Minutes+%26+decisions");
    expect(url).not.toContain("cc=");
  });
});
