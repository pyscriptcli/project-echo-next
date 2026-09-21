export interface OutlookMeetingDraft {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

function formatMeetingDate(date?: string) {
  if (!date) return "the meeting date";
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

export function createMeetingEmailDraft(meeting: { title?: string; date?: string }): OutlookMeetingDraft {
  const title = meeting.title?.trim() || "Meeting";
  const date = formatMeetingDate(meeting.date);
  return {
    to: "",
    cc: "",
    subject: `Minutes of Meeting — ${title} — ${date}`,
    body: [
      "Good day,",
      "",
      `Please find the Minutes of Meeting for ${title}, held on ${date}.`,
      "",
      "Please review the attached document for the discussion points, decisions, and agreed action items.",
      "",
      "Thank you.",
    ].join("\n"),
  };
}

function normalizeRecipients(value: string) {
  return value
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean)
    .join(",");
}

export function isValidRecipientList(value: string) {
  const recipients = normalizeRecipients(value).split(",").filter(Boolean);
  return recipients.length > 0 && recipients.every((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

export function createOutlookComposeUrl(draft: OutlookMeetingDraft) {
  // Outlook's deeplink does not consistently decode application/x-www-form-urlencoded
  // `+` spaces. Use RFC 3986 percent-encoding so spaces remain spaces in the draft.
  const params = [
    `to=${encodeURIComponent(normalizeRecipients(draft.to))}`,
    draft.cc.trim() ? `cc=${encodeURIComponent(normalizeRecipients(draft.cc))}` : "",
    `subject=${encodeURIComponent(draft.subject.trim())}`,
    `body=${encodeURIComponent(draft.body.trim())}`,
  ].filter(Boolean);
  return `https://outlook.office.com/mail/deeplink/compose?${params.join("&")}`;
}
