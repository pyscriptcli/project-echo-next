export type RequirementCategory = "Functional" | "Non-Functional" | "Technical" | "Compliance" | "Business";
export type MoscowPriority = "Must Have" | "Should Have" | "Could Have" | "Won't Have";
export type VerificationStatus = "Passed" | "In Dev" | "Not Tested" | "Blocked";

export interface BARequirement {
  id: string;
  createdAt: string;
  updatedAt: string;
  statement: string;
  category: RequirementCategory;
  priority: MoscowPriority | "";
  userStory: string;
  acceptanceCriteria: string;
  testCase: string;
  verification: VerificationStatus;
  milestone: string;
}

export interface BAPhase {
  name: string;
  startDate: string;
  targetDate: string;
  deliverables: Array<{ label: string; done: boolean }>;
}

export interface BADocument {
  id: string;
  title: string;
  kind: string;
  content: string;
  updatedAt: string;
}

export interface BAProject {
  id: string;
  name: string;
  description: string;
  discoveryNotes: string;
  requirements: BARequirement[];
  phases: BAPhase[];
  documents: BADocument[];
  createdAt: string;
  updatedAt: string;
}

export interface BAWorkspaceState {
  projects: BAProject[];
  tableColumnWidths: number[];
}
