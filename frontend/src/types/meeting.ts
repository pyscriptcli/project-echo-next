export interface DiscussionItem {
  id: string | number;
  topic: string;
  evidence: string;
  discussion_point: string;
  action_plan: string;
  target_date: string;
  person_in_charge: string;
  clickUpTaskId?: string;
  clickUpUrl?: string;
}

export interface MeetingDetails {
  client_name: string;
  date: string;
  meeting_type: "Internal" | "External" | "Team" | string;
  location: string;
  attendees_prime?: string[];
  attendees_external?: string[];
}

export interface ArchivedMeeting {
  id: string;
  meeting_id: string;
  title: string;
  date: string;
  meeting_type: "Internal" | "External" | "Team";
  location: string;
  attendees_prime: string[];
  attendees_external: string[];
  summary: string;
  items: DiscussionItem[];
  transcript?: string;
  created_at?: string;
}
