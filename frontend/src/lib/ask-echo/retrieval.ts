import type { ArchivedMeeting } from "@/types/meeting";

export interface EvidenceSource {
  sourceId: string;
  meetingId: string;
  meetingTitle: string;
  meetingDate: string;
  itemId?: string;
  topic?: string;
  excerpt: string;
  person?: string;
  due?: string;
}

const STOP_WORDS = new Set(["a", "all", "and", "are", "did", "do", "for", "from", "in", "is", "it", "of", "on", "the", "to", "was", "what", "when", "where", "which", "who", "with"]);

function terms(value: string) {
  return Array.from(new Set(value.toLowerCase().match(/[a-z0-9]+/g) || [])).filter((term) => term.length > 1 && !STOP_WORDS.has(term));
}

function score(text: string, queryTerms: string[]) {
  const haystack = text.toLowerCase();
  return queryTerms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
}

function clip(value: string, limit: number) {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1)).trimEnd()}…`;
}

export function retrieveMeetingEvidence(
  meetings: ArchivedMeeting[],
  query: string,
  options: { maxSources: number; maxCharacters: number }
): EvidenceSource[] {
  const queryTerms = terms(query);
  const candidates: Array<EvidenceSource & { score: number }> = [];

  for (const meeting of meetings) {
    const meetingText = [meeting.title, meeting.date, meeting.meeting_type, meeting.location, meeting.summary, ...(meeting.attendees_prime || []), ...(meeting.attendees_external || [])].join(" ");
    if (meeting.summary) {
      candidates.push({ sourceId: `meeting:${meeting.id}`, meetingId: meeting.id, meetingTitle: meeting.title, meetingDate: meeting.date, excerpt: meeting.summary, score: score(meetingText, queryTerms) });
    }
    for (const item of meeting.items || []) {
      const itemText = [meetingText, item.topic, item.evidence, item.discussion_point, item.action_plan, item.person_in_charge, item.target_date].join(" ");
      candidates.push({
        sourceId: `meeting:${meeting.id}:item:${item.id}`,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        meetingDate: meeting.date,
        itemId: String(item.id),
        topic: item.topic,
        excerpt: [item.discussion_point, item.action_plan].filter(Boolean).join(" "),
        person: item.person_in_charge,
        due: item.target_date,
        score: score(itemText, queryTerms) + score([item.topic, item.person_in_charge].join(" "), queryTerms),
      });
    }
  }

  const ranked = candidates.sort((a, b) => b.score - a.score || b.meetingDate.localeCompare(a.meetingDate));
  const selected = queryTerms.length && ranked.some((item) => item.score > 0) ? ranked.filter((item) => item.score > 0) : ranked;
  let remaining = Math.max(0, options.maxCharacters);
  return selected.slice(0, Math.max(0, options.maxSources)).map(({ score: _score, ...source }) => {
    const excerpt = clip(source.excerpt, remaining);
    remaining = Math.max(0, remaining - excerpt.length);
    return { ...source, excerpt };
  }).filter((source) => source.excerpt.length > 0);
}
