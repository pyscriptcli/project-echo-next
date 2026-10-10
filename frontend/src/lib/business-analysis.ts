import type { BAProject, BAWorkspaceState } from "@/types/business-analysis";

export const BA_PHASES: Array<{ name: string; deliverables: string[] }> = [
  { name: "Discovery & Elicitation", deliverables: ["Problem statement", "As-Is process map", "Scope cutlines"] },
  { name: "Design & RTM Baseline", deliverables: ["BRD final", "FRD data specs", "Traceability baseline"] },
  { name: "Development & Sprints", deliverables: ["Core services", "Connectors", "API contracts"] },
  { name: "User Acceptance Testing", deliverables: ["Test scripts", "Defect triage", "Sign-off certificate"] },
  { name: "Deployment & Cutover", deliverables: ["Go-live runbook", "Data migration", "Release notes"] },
  { name: "Post-Go-Live & Hypercare", deliverables: ["PIR retrospective", "BAU handover"] },
];

export const BA_MIN_COLUMN_WIDTHS = [100, 220, 100, 115, 240, 280, 110, 140, 150];
export const DEFAULT_BA_COLUMN_WIDTHS = [110, 240, 110, 125, 260, 300, 120, 160, 175];
export const EMPTY_BA_STATE: BAWorkspaceState = { projects: [], tableColumnWidths: DEFAULT_BA_COLUMN_WIDTHS };

export function createBAProject(name = "New BA Project"): BAProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), name, description: "", discoveryNotes: "", requirements: [],
    phases: BA_PHASES.map((phase) => ({
      name: phase.name,
      startDate: "",
      targetDate: "",
      deliverables: phase.deliverables.map((label) => ({ label, done: false })),
    })),
    documents: [], createdAt: now, updatedAt: now,
  };
}

export function normalizeBAState(value: unknown): BAWorkspaceState {
  if (!value || typeof value !== "object" || !Array.isArray((value as { projects?: unknown }).projects)) return EMPTY_BA_STATE;
  const rawState = value as { projects: unknown[]; tableColumnWidths?: unknown };
  const source = rawState.projects.slice(0, 50);
  const rawWidths = Array.isArray(rawState.tableColumnWidths) ? rawState.tableColumnWidths : null;
  const tableColumnWidths = rawWidths
    ? DEFAULT_BA_COLUMN_WIDTHS.map((fallback, index) => Math.max(BA_MIN_COLUMN_WIDTHS[index], Math.min(720, Number.isFinite(Number(rawWidths[index])) ? Number(rawWidths[index]) : fallback)))
    : [...DEFAULT_BA_COLUMN_WIDTHS];
  const text = (value: unknown, limit = 500) => typeof value === "string" ? value.slice(0, limit) : "";
  const categories = ["Functional", "Non-Functional", "Technical", "Compliance", "Business"];
  const priorities = ["Must Have", "Should Have", "Could Have", "Won't Have"];
  const statuses = ["Passed", "In Dev", "Not Tested", "Blocked"];
    const normalizedAt = new Date().toISOString();
  const projects = source.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const item = raw as Record<string, unknown>;
    if (typeof item.id !== "string" || typeof item.name !== "string") return [];
    const rawRequirements = Array.isArray(item.requirements) ? item.requirements.slice(0, 1000) : [];
    const requirements = rawRequirements.flatMap((rawRequirement) => {
      if (!rawRequirement || typeof rawRequirement !== "object") return [];
      const req = rawRequirement as Record<string, unknown>;
      if (typeof req.id !== "string") return [];
      const createdAt = text(req.createdAt, 40) || normalizedAt;
      return [{
        id: text(req.id, 40), createdAt, updatedAt: text(req.updatedAt, 40) || createdAt, statement: text(req.statement, 5000),
        category: categories.includes(String(req.category)) ? req.category as BAProject["requirements"][number]["category"] : "Business",
        priority: req.priority === "" ? "" : priorities.includes(String(req.priority)) ? req.priority as BAProject["requirements"][number]["priority"] : "Must Have",
        userStory: text(req.userStory, 5000), acceptanceCriteria: text(req.acceptanceCriteria, 10000),
        testCase: text(req.testCase, 500), verification: statuses.includes(String(req.verification)) ? req.verification as BAProject["requirements"][number]["verification"] : "Not Tested",
        milestone: text(req.milestone, 300),
      }];
    });
    const rawPhases = Array.isArray(item.phases) ? item.phases : [];
    const phases = BA_PHASES.map((template) => {
      const phase = rawPhases.find((entry) => Boolean(entry && typeof entry === "object" && (entry as Record<string, unknown>).name === template.name)) as Record<string, unknown> | undefined;
      const rawDeliverables = Array.isArray(phase?.deliverables) ? phase.deliverables : [];
      return {
        name: template.name, startDate: text(phase?.startDate, 20), targetDate: text(phase?.targetDate, 20),
        deliverables: template.deliverables.map((label) => {
          const saved = rawDeliverables.find((entry) => Boolean(entry && typeof entry === "object" && (entry as Record<string, unknown>).label === label)) as Record<string, unknown> | undefined;
          return { label, done: saved?.done === true };
        }),
      };
    });
    const rawDocuments = Array.isArray(item.documents) ? item.documents.slice(0, 100) : [];
    const documents = rawDocuments.flatMap((rawDocument) => {
      if (!rawDocument || typeof rawDocument !== "object") return [];
      const doc = rawDocument as Record<string, unknown>;
      return typeof doc.id === "string" ? [{ id: text(doc.id, 40), title: text(doc.title, 200), kind: text(doc.kind, 100), content: text(doc.content, 100_000), updatedAt: text(doc.updatedAt, 40) }] : [];
    });
    return [{
      id: text(item.id, 40), name: text(item.name, 200), description: text(item.description, 5000),
      discoveryNotes: text(item.discoveryNotes, 100_000), requirements, phases, documents,
      createdAt: text(item.createdAt, 40), updatedAt: text(item.updatedAt, 40),
    }];
  });
  return { projects, tableColumnWidths };
}

export function nextRequirementId(requirements: Array<{ id: string }>) {
  const max = requirements.reduce((value, requirement) => {
    const match = requirement.id.match(/^REQ-(\d+)$/i);
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return `REQ-${String(max + 1).padStart(3, "0")}`;
}

export function requirementsFromNotes(notes: string, existing: BAProject["requirements"]): BAProject["requirements"] {
  const next = [...existing];
  const now = new Date().toISOString();
  for (const line of notes.split(/\r?\n/)) {
    const match = line.match(/^\s*@((?:REQ|NFR)-\d+)\s*(?::|-)?\s+(.+?)\s*$/i);
    if (!match) continue;
    const id = match[1].toUpperCase();
    const statement = match[2].trim();
    const index = next.findIndex((requirement) => requirement.id.toUpperCase() === id);
    if (index >= 0) next[index] = { ...next[index], statement, updatedAt: now };
    else next.push({ id, createdAt: now, updatedAt: now, statement, category: "Business", priority: "", userStory: "", acceptanceCriteria: "", testCase: "", verification: "Not Tested", milestone: "" });
  }
  return next;
}
