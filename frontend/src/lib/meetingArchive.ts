import type { DiscussionItem } from "@/types/meeting";

/** Convert the JSON discussion matrix stored in a ClickUp meeting task back into UI records. */
export function parseDiscussionItems(section: string): DiscussionItem[] {
  if (!section.trim()) return [];
  try {
    const parsed = JSON.parse(section);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, index): DiscussionItem => ({
      id: item.id || `discussion-${index + 1}`,
      topic: item.topic || item.topic_title || `Discussion topic ${index + 1}`,
      evidence: item.evidence || item.evidence_quote || "",
      discussion_point: item.discussion_point || "",
      action_plan: item.action_plan || "",
      target_date: item.target_date || item.indicative_delivery_date || "",
      person_in_charge: item.person_in_charge || "Unassigned",
      clickUpTaskId: item.clickUpTaskId,
      clickUpUrl: item.clickUpUrl,
    }));
  } catch {
    return [];
  }
}
