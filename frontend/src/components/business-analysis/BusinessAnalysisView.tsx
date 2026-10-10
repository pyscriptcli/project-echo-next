"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, ArrowUpRight, BookOpen, Check, Download, Eye, FilePlus2, FileText, FolderKanban, LayoutGrid, LoaderCircle, Plus, Printer, RefreshCw, Save, Sparkles, Table2, X } from "lucide-react";
import { BA_MIN_COLUMN_WIDTHS, createBAProject, DEFAULT_BA_COLUMN_WIDTHS, EMPTY_BA_STATE, nextRequirementId, normalizeBAState, requirementsFromNotes } from "@/lib/business-analysis";
import type { ArchivedMeeting } from "@/types/meeting";
import type { BAProject, BARequirement, BAWorkspaceState, BADocument, RequirementCategory, MoscowPriority, VerificationStatus } from "@/types/business-analysis";

type Tab = "requirements" | "elicitation" | "roadmap" | "documents" | "export";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "requirements", label: "Requirements" },
  { id: "elicitation", label: "Elicitation" },
  { id: "roadmap", label: "Roadmap" },
  { id: "documents", label: "Documents" },
  { id: "export", label: "Export" },
];
const CATEGORIES: RequirementCategory[] = ["Functional", "Non-Functional", "Technical", "Compliance", "Business"];
const PRIORITIES: MoscowPriority[] = ["Must Have", "Should Have", "Could Have", "Won't Have"];
const STATUSES: VerificationStatus[] = ["Passed", "In Dev", "Not Tested", "Blocked"];
const PRE_DOC_TEMPLATES = ["Project Charter", "Business Case", "Business Requirements Document", "Functional Requirements Document", "UAT Test Plan"];
const POST_DOC_TEMPLATES = ["Stakeholder Sign-Off Certificate", "Production Release Notes", "Post-Implementation Review"];
const DOC_TEMPLATES = [...PRE_DOC_TEMPLATES, ...POST_DOC_TEMPLATES];
const categoryColor: Record<RequirementCategory, string> = {
  Functional: "bg-[#EEF4FA] text-[#003366]", "Non-Functional": "bg-[#F3F0F8] text-[#5B3A7A]",
  Technical: "bg-[#EAF5F7] text-[#176B78]", Compliance: "bg-[#FBF4E6] text-[#855A08]", Business: "bg-[#EDF5EF] text-[#356B43]",
};
const priorityColor: Record<MoscowPriority | "", string> = {
  "Must Have": "bg-[#FCECEC] text-[#9B3030]", "Should Have": "bg-[#FBF4E6] text-[#855A08]",
  "Could Have": "bg-[#EEF4FA] text-[#31577D]", "Won't Have": "bg-slate-100 text-slate-600", "": "bg-white text-slate-500",
};
const verificationColor: Record<VerificationStatus, string> = {
  Passed: "bg-[#EDF5EF] text-[#287442]", "In Dev": "bg-[#FBF4E6] text-[#855A08]",
  "Not Tested": "bg-slate-100 text-slate-600", Blocked: "bg-[#FCECEC] text-[#9B3030]",
};
const cellSelectClass = "h-7 w-full border border-transparent px-1 text-xs hover:border-slate-200/70 focus:border-[#C9A33B] focus:outline-none focus:ring-1 focus:ring-[#C9A33B]";
const cardSelectClass = "h-7 border border-transparent px-1 text-xs hover:border-slate-200/70 focus:border-[#C9A33B] focus:outline-none focus:ring-1 focus:ring-[#C9A33B]";
const timestampText = (value: string) => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime()) ? date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Not recorded";
};
type RequirementCardProps = {
  requirement: BARequirement;
  onUpdate: (id: string, changes: Partial<BARequirement>) => void;
  onGenerateStory: (requirement: BARequirement) => void;
  onGenerateTestCase: (requirement: BARequirement) => void;
  onView: () => void;
  generatingStory: boolean;
  generatingTestCase: boolean;
};

function RequirementCard({ requirement, onUpdate, onGenerateStory, onGenerateTestCase, onView, generatingStory, generatingTestCase }: RequirementCardProps) {
  return <article className="min-w-0 border border-slate-200 bg-white p-3 sm:p-4">
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
        <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-[#003366]">{requirement.id}</span>
        <select aria-label={`${requirement.id} category`} className={`${cardSelectClass} w-36 shrink-0 ${categoryColor[requirement.category]}`} value={requirement.category} onChange={(event) => onUpdate(requirement.id, { category: event.target.value as RequirementCategory })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
        <select aria-label={`${requirement.id} priority`} className={`${cardSelectClass} w-36 shrink-0 ${priorityColor[requirement.priority]}`} value={requirement.priority} onChange={(event) => onUpdate(requirement.id, { priority: event.target.value as MoscowPriority | "" })}><option value="">Unprioritized</option>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>
      </div>
      <div className="flex items-center gap-2">
        <select aria-label={`${requirement.id} verification status`} className={`${cardSelectClass} w-32 ${verificationColor[requirement.verification]}`} value={requirement.verification} onChange={(event) => onUpdate(requirement.id, { verification: event.target.value as VerificationStatus })}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select>
        <button type="button" aria-label={`View details for ${requirement.id}`} title="View requirement details" className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-slate-200 text-[#31577D] hover:border-[#C9A84C] hover:text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]" onClick={onView}><Eye aria-hidden="true" size={14} /></button>
      </div>
    </header>
    <div className="mt-2 flex min-w-0 flex-col items-start gap-1 border-b border-slate-100 pb-2 sm:flex-row sm:gap-3">
      <label htmlFor={`ba-card-requirement-${requirement.id}`} className="w-full shrink-0 border-l-2 border-[#C9A33B] pl-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:w-36 sm:pt-2">Business requirement</label>
      <textarea id={`ba-card-requirement-${requirement.id}`} data-ba-req-id={requirement.id} aria-label={`${requirement.id} business requirement`} rows={1} className="ba-rtm-cell-editor block min-h-9 min-w-0 flex-1 resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1 py-1 text-base font-semibold leading-6 text-[#003366] hover:border-slate-200 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" placeholder="Describe the business need" value={requirement.statement} onChange={(event) => onUpdate(requirement.id, { statement: event.target.value })} />
    </div>
    <div className="mt-2 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="min-w-0 border-t border-slate-100 pt-2">
        <div className="flex min-h-7 items-center justify-between gap-2"><label htmlFor={`ba-card-story-${requirement.id}`} className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">User story</label><button type="button" title="Generate user story and acceptance criteria" aria-label={`Generate story for ${requirement.id}`} className="inline-flex h-7 items-center gap-1 border border-slate-200 px-2 text-[10px] font-semibold text-[#003366] hover:border-[#003366] disabled:opacity-50" disabled={generatingStory} onClick={() => onGenerateStory(requirement)}>{generatingStory ? <LoaderCircle size={12} className="animate-spin" /> : <BookOpen size={12} />}Generate</button></div>
        <textarea id={`ba-card-story-${requirement.id}`} aria-label={`${requirement.id} user story`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1 py-1 text-xs leading-5 text-slate-700 hover:border-slate-200 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" placeholder="Add a user story" value={requirement.userStory} onChange={(event) => onUpdate(requirement.id, { userStory: event.target.value })} />
        <details className="mt-1"><summary className="cursor-pointer text-[10px] text-[#31577D]">Acceptance criteria</summary><textarea aria-label={`${requirement.id} acceptance criteria`} className={`${inputClass} mt-1 resize-y leading-5`} rows={3} placeholder="Given / When / Then" value={requirement.acceptanceCriteria} onChange={(event) => onUpdate(requirement.id, { acceptanceCriteria: event.target.value })} /></details>
        <label className="mt-2 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Target milestone<input aria-label={`${requirement.id} milestone`} className="mt-1 h-8 w-full border border-slate-200 bg-white px-2 text-xs font-normal normal-case tracking-normal text-slate-700 focus:border-[#C9A33B] focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" value={requirement.milestone} onChange={(event) => onUpdate(requirement.id, { milestone: event.target.value })} placeholder="Add milestone" /></label>
      </section>
      <section className="min-w-0 border-t border-slate-100 pt-2">
        <div className="flex min-h-7 items-center justify-between gap-2"><label htmlFor={`ba-card-test-${requirement.id}`} className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Test case</label><button type="button" title="Generate test case from this row" aria-label={`Generate test case for ${requirement.id}`} className="inline-flex h-7 w-7 shrink-0 items-center justify-center border border-slate-200 text-[#31577D] hover:border-[#C9A84C] hover:text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] disabled:cursor-wait disabled:opacity-50" disabled={generatingTestCase} onClick={() => onGenerateTestCase(requirement)}>{generatingTestCase ? <LoaderCircle aria-hidden="true" size={13} className="animate-spin" /> : <Sparkles aria-hidden="true" size={13} />}</button></div>
        <textarea id={`ba-card-test-${requirement.id}`} aria-label={`${requirement.id} test case`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1 py-1 text-xs leading-5 text-slate-700 hover:border-slate-200 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" placeholder="Add a test case" value={requirement.testCase} onChange={(event) => onUpdate(requirement.id, { testCase: event.target.value })} />
      </section>
    </div>
    <footer className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-600">Created {timestampText(requirement.createdAt)} <span aria-hidden="true">·</span> Updated {timestampText(requirement.updatedAt)}</footer>
  </article>;
}
const inputClass = "w-full min-w-0 border border-[#CBD5E1] bg-white px-2 py-1.5 text-sm text-[#1B1D1E] outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]";
const filterSelectClass = "h-9 min-w-0 border border-[#CBD5E1] bg-white px-2 text-sm text-[#1B1D1E] outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]";
const buttonClass = "inline-flex min-h-9 items-center justify-center gap-2 border border-[#003366] bg-[#003366] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-50";
const secondaryClass = "inline-flex min-h-9 items-center justify-center gap-2 border border-[#31577D] bg-[#FFFCFB] px-3 py-1.5 text-sm font-semibold text-[#003366] transition-colors hover:bg-[#F1F5F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-50";

function fileName(value: string) {
  return value.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "business-analysis";
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function renderXlsx(project: BAProject) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet("RTM", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = [
    { header: "Req ID", key: "id", width: 14 }, { header: "Business Requirement", key: "statement", width: 42 },
    { header: "Category", key: "category", width: 20 }, { header: "MoSCoW Priority", key: "priority", width: 18 },
    { header: "User Story", key: "userStory", width: 38 }, { header: "Test Case Ref", key: "testCase", width: 18 },
    { header: "Verification Status", key: "verification", width: 20 }, { header: "Target Milestone", key: "milestone", width: 20 },
  ];
  for (const requirement of project.requirements) sheet.addRow(requirement);
  const header = sheet.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
    cell.alignment = { vertical: "middle", wrapText: true };
  });
  const statusFill: Record<VerificationStatus, string> = { Passed: "FFDDF4E4", "In Dev": "FFFFF1C2", "Not Tested": "FFE9EEF3", Blocked: "FFFFE0E0" };
  project.requirements.forEach((requirement, index) => {
    const cell = sheet.getRow(index + 2).getCell(7);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusFill[requirement.verification] } };
    sheet.getRow(index + 2).alignment = { vertical: "top", wrapText: true };
  });
  sheet.autoFilter = { from: "A1", to: `H${project.requirements.length + 1}` };

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [{ header: "Measure", key: "measure", width: 34 }, { header: "Value", key: "value", width: 22 }];
  const linked = project.requirements.filter((item) => item.userStory || item.testCase || item.milestone).length;
  summary.addRows([
    { measure: "Project", value: project.name }, { measure: "Requirements", value: project.requirements.length },
    { measure: "Traceability coverage", value: project.requirements.length ? `${Math.round(linked * 100 / project.requirements.length)}%` : "0%" },
    ...STATUSES.map((status) => ({ measure: status, value: project.requirements.filter((item) => item.verification === status).length })),
    { measure: "Unprioritized", value: project.requirements.filter((item) => !item.priority).length },
  ]);
  summary.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF003366" } };
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function meetingNotes(meeting: ArchivedMeeting) {
  const items = meeting.items.map((item, index) => `${index + 1}. ${item.topic || "Discussion"}\n${item.discussion_point || item.evidence || ""}${item.action_plan ? `\nAction: ${item.action_plan}` : ""}`).join("\n\n");
  return [`Meeting: ${meeting.title}`, `Date: ${meeting.date}`, meeting.summary && `Summary:\n${meeting.summary}`, meeting.meeting_notes && `Notes:\n${meeting.meeting_notes}`, items && `Discussion points:\n${items}`].filter(Boolean).join("\n\n");
}

function templateContent(kind: string, project: BAProject) {
  const requirements = project.requirements.map((item) => `${item.id} (${item.priority}, ${item.category})\n${item.statement}`).join("\n\n") || "No requirements have been recorded.";
  const phases = project.phases.map((phase) => `${phase.name}: ${phase.startDate || "Start date not set"} to ${phase.targetDate || "Target date not set"}`).join("\n");
  const signoff = kind === "Stakeholder Sign-Off Certificate" ? "\n\nStakeholder sign-off\nName: ______________________________\nRole: _______________________________\nDecision: ___________________________\nSignature: __________________________\nDate: _______________________________" : "";
  return `${kind}\n\nProject: ${project.name}\nPrepared: ${new Date().toLocaleDateString()}\n\nProject context\n${project.description || "Add the project purpose and context."}\n\nRequirements\n${requirements}\n\nDelivery phases\n${phases}\n\nDecisions and notes\n${project.discoveryNotes || "Add discovery notes and decisions."}${signoff}`;
}

export function BusinessAnalysisView({ userId, meetings: initialMeetings = [], onLoadMeetings }: { userId?: string; meetings?: ArchivedMeeting[]; onLoadMeetings?: () => Promise<ArchivedMeeting[]> }) {
  const [state, setState] = useState<BAWorkspaceState>(EMPTY_BA_STATE);
  const [activeId, setActiveId] = useState("");
  const [tab, setTab] = useState<Tab>("requirements");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [loadError, setLoadError] = useState("");
  const [filterCategory, setFilterCategory] = useState("All categories");
  const [filterPriority, setFilterPriority] = useState("All priorities");
  const [requirementsView, setRequirementsView] = useState<"table" | "cards">("table");
  const [newRequirementFocusId, setNewRequirementFocusId] = useState("");
  const [detailRequirementId, setDetailRequirementId] = useState("");
  const [meetingRows, setMeetingRows] = useState<ArchivedMeeting[]>(initialMeetings);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [generatingId, setGeneratingId] = useState("");
  const [generatingTestCaseId, setGeneratingTestCaseId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(DOC_TEMPLATES[0]);
  const [documentTitle, setDocumentTitle] = useState("");
  const resizeStart = useRef<{ index: number; startX: number; startWidth: number } | null>(null);

  const project = useMemo(() => state.projects.find((item) => item.id === activeId) || null, [state.projects, activeId]);
  const detailRequirement = project?.requirements.find((item) => item.id === detailRequirementId) || null;
  const updateProject = useCallback((updater: (current: BAProject) => BAProject) => {
    if (!project) return;
    const updatedAt = new Date().toISOString();
    setState((current) => ({ ...current, projects: current.projects.map((item) => item.id === project.id ? { ...updater(item), updatedAt } : item) }));
    setSaveState("saving");
  }, [project]);

  useEffect(() => {
    let current = true;
    fetch("/api/business-analysis", { cache: "no-store" }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Business Analysis could not load.");
      if (current) {
        const nextState = normalizeBAState(body.state);
        setState(nextState);
        setActiveId("");
        setLoadError("");
      }
    }).catch((error) => { if (current) setLoadError(error instanceof Error ? error.message : "Business Analysis could not load."); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [userId]);

  useEffect(() => {
    if (loading || loadError || !state.projects.length) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch("/api/business-analysis", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
        if (!response.ok) throw new Error("Save failed");
        setSaveState("saved");
      } catch { setSaveState("error"); }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [state, loading, loadError]);

  const filteredRequirements = useMemo(() => project?.requirements.filter((item) => (filterCategory === "All categories" || item.category === filterCategory) && (filterPriority === "All priorities" || item.priority === filterPriority)) || [], [project, filterCategory, filterPriority]);
  const coverage = filteredRequirements.length ? Math.round(filteredRequirements.filter((item) => item.userStory || item.testCase || item.milestone).length * 100 / filteredRequirements.length) : 0;
  const unprioritized = filteredRequirements.filter((item) => !item.priority).length;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      document.querySelectorAll<HTMLTextAreaElement>(".ba-rtm-cell-editor").forEach((textarea) => {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(textarea.scrollHeight, 28)}px`;
      });
      if (newRequirementFocusId) {
        document.querySelector<HTMLTextAreaElement>(`[data-ba-req-id="${newRequirementFocusId}"]`)?.focus();
        setNewRequirementFocusId("");
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [filteredRequirements, newRequirementFocusId, requirementsView]);

  useEffect(() => {
    if (!detailRequirement) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setDetailRequirementId(""); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [detailRequirement]);

  const saveNow = async () => {
    setSaveState("saving");
    try {
      const response = await fetch("/api/business-analysis", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state }) });
      if (!response.ok) throw new Error("Save failed");
      setSaveState("saved");
    } catch { setSaveState("error"); }
  };

  const addProject = () => {
    const name = window.prompt("Project name");
    if (!name?.trim()) return;
    const next = createBAProject(name.trim());
    setState((current) => ({ ...current, projects: [...current.projects, next] }));
    setActiveId(next.id);
    setTab("requirements");
  };

  const addRequirement = () => {
    if (!project) return;
    const now = new Date().toISOString();
    const requirement: BARequirement = { id: nextRequirementId(project.requirements), createdAt: now, updatedAt: now, statement: "", category: "Functional", priority: "", userStory: "", acceptanceCriteria: "", testCase: "", verification: "Not Tested", milestone: "" };
    updateProject((current) => ({ ...current, requirements: [...current.requirements, requirement] }));
    setFilterCategory("All categories");
    setFilterPriority("All priorities");
    setNewRequirementFocusId(requirement.id);
  };

  const updateRequirement = (id: string, changes: Partial<BARequirement>) => {
    const updatedAt = new Date().toISOString();
    updateProject((current) => ({ ...current, requirements: current.requirements.map((item) => item.id === id ? { ...item, ...changes, updatedAt } : item) }));
  };

  const resizeColumn = (index: number, width: number) => setState((current) => ({
    ...current, tableColumnWidths: current.tableColumnWidths.map((value, columnIndex) => columnIndex === index ? Math.max(BA_MIN_COLUMN_WIDTHS[index], Math.min(720, width)) : value),
  }));
  const startColumnResize = (event: React.PointerEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { index, startX: event.clientX, startWidth: state.tableColumnWidths[index] || DEFAULT_BA_COLUMN_WIDTHS[index] };
  };
  const moveColumnResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (resizeStart.current) resizeColumn(resizeStart.current.index, resizeStart.current.startWidth + event.clientX - resizeStart.current.startX);
  };
  const stopColumnResize = () => { resizeStart.current = null; };

  const importMinutes = async (meeting: ArchivedMeeting) => {
    const text = meetingNotes(meeting);
    updateProject((current) => {
      const discoveryNotes = [current.discoveryNotes.trim(), text].filter(Boolean).join("\n\n---\n\n");
      return { ...current, discoveryNotes, requirements: requirementsFromNotes(discoveryNotes, current.requirements) };
    });
    setTab("elicitation");
    setMeetingRows([]);
  };

  const loadMeetings = async () => {
    setMeetingLoading(true);
    setMeetingError("");
    try {
      const result = onLoadMeetings ? await onLoadMeetings() : initialMeetings;
      setMeetingRows(result.filter((meeting) => Boolean(meeting.meeting_notes || meeting.summary || meeting.items?.length)).slice(0, 30));
    } catch (error) { setMeetingError(error instanceof Error ? error.message : "Notetaker records could not be loaded."); }
    finally { setMeetingLoading(false); }
  };

  const generateStory = async (requirement: BARequirement) => {
    if (!project) return;
    setGeneratingId(requirement.id);
    try {
      const response = await fetch("/api/business-analysis/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: requirement.id, statement: requirement.statement, context: project.description }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Story generation failed.");
      updateRequirement(requirement.id, { userStory: body.userStory, acceptanceCriteria: body.acceptanceCriteria });
    } catch (error) { window.alert(error instanceof Error ? error.message : "Story generation failed."); }
    finally { setGeneratingId(""); }
  };

  const generateTestCase = async (requirement: BARequirement) => {
    setGeneratingTestCaseId(requirement.id);
    try {
      const response = await fetch("/api/business-analysis/story", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        type: "test-case", id: requirement.id, statement: requirement.statement, category: requirement.category,
        priority: requirement.priority, userStory: requirement.userStory, acceptanceCriteria: requirement.acceptanceCriteria,
        verification: requirement.verification, milestone: requirement.milestone,
      }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Test case generation failed.");
      updateRequirement(requirement.id, { testCase: body.testCase });
    } catch (error) { window.alert(error instanceof Error ? error.message : "Test case generation failed."); }
    finally { setGeneratingTestCaseId(""); }
  };

  const addDocument = () => {
    if (!project) return;
    const now = new Date().toISOString();
    const document: BADocument = { id: crypto.randomUUID(), title: documentTitle.trim() || selectedTemplate, kind: selectedTemplate, content: templateContent(selectedTemplate, project), updatedAt: now };
    updateProject((current) => ({ ...current, documents: [...current.documents, document] }));
    setDocumentTitle("");
  };

  const exportDocument = async (item: BADocument) => {
    const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
    const doc = new Document({ sections: [{ children: [new Paragraph({ text: item.title, heading: HeadingLevel.TITLE }), ...item.content.split(/\r?\n/).map((line) => new Paragraph({ children: [new TextRun(line || " ")] }))] }] });
    downloadBlob(await Packer.toBlob(doc), `${fileName(item.title)}.docx`);
  };

  if (loading) return <div className="flex min-h-[420px] items-center justify-center bg-[#FFFCFB] text-sm text-[#31577D]" role="status"><LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Loading Business Analysis</div>;
  if (loadError) return <div className="mx-auto mt-8 max-w-2xl border border-[#B42318] bg-[#FFFCFB] p-6 text-sm text-[#7A271A]" role="alert"><h1 className="font-serif text-2xl font-bold italic text-[#003366]">Business Analysis</h1><p className="mt-3">{loadError}</p><p className="mt-1">Ask an administrator to install the Business Analysis storage table, then reload.</p><button className={`${secondaryClass} mt-4`} onClick={() => window.location.reload()}><RefreshCw size={15} />Reload page</button></div>;

  return <div id="ba-print-root" className="mx-auto w-full max-w-[1440px] space-y-5 pb-8 text-[#1B1D1E]">
    <style>{`@media print { body * { visibility: hidden !important; } #ba-print-root, #ba-print-root * { visibility: visible !important; } #ba-print-root { position: absolute; left: 0; top: 0; width: 100%; } .ba-no-print { display: none !important; } input, textarea, select { border: 0 !important; } }`}</style>
    <header className="flex min-h-[58px] flex-col justify-between gap-2 border-b border-[#003366]/15 pb-2 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-2">
        {project ? <button type="button" onClick={() => setActiveId("")} aria-label="Back to Business Analysis projects" className="ba-no-print inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-300 text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button> : <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban className="h-4 w-4" /></span>}
        <div className="min-w-0 border-l-2 border-[#C9A84C] py-0.5 pl-2.5">
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#31577D]">{project ? "Business Analysis workspace" : "Business Analysis"}</p>
          <h1 className="truncate text-xl font-semibold tracking-tight text-[#003366]">{project?.name || "Projects"}</h1>
          {!project && <p className="mt-0.5 truncate text-xs text-slate-600">Choose a workspace to view its requirements, notes, and documents.</p>}
        </div>
      </div>
      <div className="ba-no-print flex flex-wrap items-center gap-2">
        {!project && <button className={`${secondaryClass} min-h-8 bg-white px-2.5 py-1 text-[11px]`} onClick={addProject}><Plus size={14} />New project</button>}
        <span className="mr-1 text-xs text-slate-700" role="status">{saveState === "saving" ? "Saving" : saveState === "error" ? "Save failed" : "Saved"}</span>
        <button className={`${secondaryClass} min-h-8 bg-white px-2.5 py-1 text-[11px]`} onClick={saveNow}><Save size={14} />Save</button>
      </div>
    </header>

    {!project ? state.projects.length === 0 ? <section className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><FolderKanban aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h2 className="mt-3 text-base font-semibold text-[#003366]">Create your first BA project</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Keep requirements, discovery notes, and delivery documents together in one workspace.</p></section> : <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {state.projects.map((item) => <button key={item.id} type="button" onClick={() => { setActiveId(item.id); setTab("requirements"); }} className="group min-h-40 border border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#C9A84C] hover:bg-[#FFFCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><span className="flex h-full flex-col"><span className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban aria-hidden="true" className="h-4 w-4" /></span><ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#003366]" /></span><span className="mt-4 text-base font-semibold text-[#003366]">{item.name}</span><span className="mt-1 text-xs text-slate-500">{item.requirements.length} requirement{item.requirements.length === 1 ? "" : "s"} · {item.documents.length} document{item.documents.length === 1 ? "" : "s"}</span><span className="mt-auto pt-4 text-[10px] font-semibold uppercase tracking-wide text-[#31577D]">Open workspace</span></span></button>)}
    </section> : <>
      <div className="grid grid-cols-2 gap-px border border-[#CBD5E1] bg-[#CBD5E1] md:grid-cols-4">
        <div className="bg-[#FFFCFB] px-3 py-2"><div className="text-xs font-semibold text-slate-700">Requirements</div><div className="mt-0.5 font-serif text-lg font-bold text-[#003366]">{filteredRequirements.length}</div></div>
        <div className="bg-[#FFFCFB] px-3 py-2"><div className="text-xs font-semibold text-slate-700">Traceability coverage</div><div className="mt-0.5 font-serif text-lg font-bold text-[#003366]">{coverage}%</div></div>
        <div className="bg-[#FFFCFB] px-3 py-2"><div className="text-xs font-semibold text-slate-700">Passed / not tested</div><div className="mt-0.5 font-serif text-lg font-bold text-[#003366]">{filteredRequirements.filter((item) => item.verification === "Passed").length} / {filteredRequirements.filter((item) => item.verification === "Not Tested").length}</div></div>
        <div className="bg-[#FFFCFB] px-3 py-2"><div className="text-xs font-semibold text-slate-700">Unprioritized</div><div className="mt-0.5 font-serif text-lg font-bold text-[#003366]">{unprioritized}</div></div>
      </div>

      <nav className="ba-no-print flex overflow-x-auto border-b border-[#31577D]" aria-label="Business Analysis sections" role="tablist">
        {TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-9 shrink-0 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] ${tab === item.id ? "border-[#C9A84C] bg-[#FFFCFB] text-[#003366]" : "border-transparent text-slate-700 hover:bg-[#F1F5F9]"}`}>{item.label}</button>)}
      </nav>

      {tab === "requirements" && <section>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-serif text-lg font-bold italic text-[#003366]">Requirements traceability matrix</h2>
          <label className="sr-only" htmlFor="ba-category-filter">Filter category</label><select id="ba-category-filter" className={`${filterSelectClass} w-[165px]`} value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}><option>All categories</option>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
          <label className="sr-only" htmlFor="ba-priority-filter">Filter MoSCoW priority</label><select id="ba-priority-filter" className={`${filterSelectClass} w-[180px]`} value={filterPriority} onChange={(event) => setFilterPriority(event.target.value)}><option>All priorities</option><option value="">Unprioritized</option>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select>
          <div className="inline-flex border border-slate-300 bg-white" role="group" aria-label="Requirement view">
            <button type="button" aria-pressed={requirementsView === "table"} onClick={() => setRequirementsView("table")} className={`inline-flex min-h-11 items-center justify-center gap-1.5 px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] ${requirementsView === "table" ? "bg-[#003366] text-white" : "text-[#003366] hover:bg-slate-50"}`}><Table2 aria-hidden="true" size={14} />Table</button>
            <button type="button" aria-pressed={requirementsView === "cards"} onClick={() => setRequirementsView("cards")} className={`inline-flex min-h-11 items-center justify-center gap-1.5 border-l border-slate-300 px-2.5 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] ${requirementsView === "cards" ? "bg-[#003366] text-white" : "text-[#003366] hover:bg-slate-50"}`}><LayoutGrid aria-hidden="true" size={14} />Cards</button>
          </div>
          <button className={buttonClass} onClick={addRequirement}><Plus size={15} />Add requirement</button>
        </div>
        {project.requirements.length > 0 && <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-700" aria-label="Requirement category breakdown">{CATEGORIES.map((category) => <span key={category}>{category}: {filteredRequirements.filter((item) => item.category === category).length}</span>)}</div>}
        {project.requirements.length === 0 ? <div className="border border-[#CBD5E1] bg-[#FFFCFB] p-4 text-sm text-slate-700">No requirements yet. Add one here or tag a line in Elicitation with <code className="font-mono text-[#003366]">@REQ-001: requirement</code>.</div> : filteredRequirements.length === 0 ? <div className="border border-[#CBD5E1] bg-[#FFFCFB] p-4 text-sm text-slate-700">No requirements match these filters.</div> : requirementsView === "table" ? <>
          <div className="overflow-x-auto border border-slate-200 bg-white"><table className="table-fixed border-collapse text-left text-xs" style={{ width: `${state.tableColumnWidths.reduce((total, width) => total + width, 0)}px`, minWidth: "100%" }}><colgroup>{state.tableColumnWidths.map((width, index) => <col key={index} style={{ width }} />)}</colgroup><thead className="bg-slate-50 text-[10px] font-semibold text-slate-600"><tr>{["Req ID", "Business requirement", "Category", "MoSCoW", "User story", "Test case", "Verification", "Milestone", "Story / criteria"].map((heading, index) => <th key={heading} scope="col" className="relative border border-slate-200/70 px-3 py-2.5">{heading}<button type="button" role="separator" aria-orientation="vertical" aria-label={`Resize ${heading} column`} aria-valuenow={state.tableColumnWidths[index]} aria-valuemin={BA_MIN_COLUMN_WIDTHS[index]} aria-valuemax={720} tabIndex={0} className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none border-0 bg-transparent p-0 hover:bg-[#C9A84C]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]" onPointerDown={(event) => startColumnResize(event, index)} onPointerMove={moveColumnResize} onPointerUp={stopColumnResize} onPointerCancel={stopColumnResize} onKeyDown={(event) => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); resizeColumn(index, state.tableColumnWidths[index] + (event.key === "ArrowRight" ? 12 : -12)); } }} /></th>)}</tr></thead><tbody>{filteredRequirements.map((item, index) => <tr key={item.id} className={index % 2 ? "bg-slate-50/50" : "bg-white"}>
            <td className="align-top border border-slate-200/60 px-2 py-2 font-medium tabular-nums text-[#003366]"><div className="flex items-center justify-between gap-1"><span className="whitespace-nowrap">{item.id}</span><button type="button" aria-label={`View details for ${item.id}`} title="View requirement details" className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-[#31577D] hover:bg-[#FBF7E9] hover:text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]" onClick={() => setDetailRequirementId(item.id)}><Eye aria-hidden="true" size={14} /></button></div></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><textarea data-ba-req-id={item.id} aria-label={`${item.id} business requirement`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1.5 py-1 text-xs leading-5 text-slate-700 hover:border-slate-200/70 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" value={item.statement} onChange={(event) => updateRequirement(item.id, { statement: event.target.value })} /></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><select aria-label={`${item.id} category`} className={`${cellSelectClass} ${categoryColor[item.category]}`} value={item.category} onChange={(event) => updateRequirement(item.id, { category: event.target.value as RequirementCategory })}>{CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><select aria-label={`${item.id} priority`} className={`${cellSelectClass} ${priorityColor[item.priority]}`} value={item.priority} onChange={(event) => updateRequirement(item.id, { priority: event.target.value as MoscowPriority | "" })}><option value="">Unprioritized</option>{PRIORITIES.map((value) => <option key={value}>{value}</option>)}</select></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><textarea aria-label={`${item.id} user story`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1.5 py-1 text-xs leading-5 text-slate-700 hover:border-slate-200/70 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" value={item.userStory} onChange={(event) => updateRequirement(item.id, { userStory: event.target.value })} /></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><div className="relative"><textarea aria-label={`${item.id} test case`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1.5 py-1 pr-8 text-xs leading-5 text-slate-700 hover:border-slate-200/70 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" value={item.testCase} onChange={(event) => updateRequirement(item.id, { testCase: event.target.value })} /><button type="button" title="Generate test case from this row" aria-label={`Generate test case for ${item.id}`} className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center border border-transparent bg-white text-[#31577D] hover:border-[#C9A84C] hover:text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C] disabled:cursor-wait disabled:opacity-50" disabled={generatingTestCaseId === item.id} onClick={() => void generateTestCase(item)}>{generatingTestCaseId === item.id ? <LoaderCircle aria-hidden="true" size={13} className="animate-spin" /> : <Sparkles aria-hidden="true" size={13} />}</button></div></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><select aria-label={`${item.id} verification status`} className={`${cellSelectClass} ${verificationColor[item.verification]}`} value={item.verification} onChange={(event) => updateRequirement(item.id, { verification: event.target.value as VerificationStatus })}>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><textarea aria-label={`${item.id} milestone`} rows={1} className="ba-rtm-cell-editor block min-h-7 w-full resize-none overflow-hidden whitespace-pre-wrap break-words [overflow-wrap:anywhere] border border-transparent bg-transparent px-1.5 py-1 text-xs leading-5 text-slate-700 hover:border-slate-200/70 focus:border-[#C9A33B] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#C9A33B]" value={item.milestone} onChange={(event) => updateRequirement(item.id, { milestone: event.target.value })} /></td>
            <td className="align-top border border-slate-200/60 px-2 py-1.5"><button title="Generate user story and acceptance criteria" className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 border border-slate-300 bg-white px-2 text-[11px] font-semibold text-[#003366] hover:border-[#003366] disabled:opacity-50" disabled={generatingId === item.id} onClick={() => void generateStory(item)}>{generatingId === item.id ? <LoaderCircle size={13} className="animate-spin" /> : <BookOpen size={13} />}Generate</button><details className="mt-1"><summary className="cursor-pointer text-[10px] text-[#31577D]">Acceptance criteria</summary><textarea aria-label={`${item.id} acceptance criteria`} className={`${inputClass} mt-1`} rows={3} placeholder="Given / When / Then" value={item.acceptanceCriteria} onChange={(event) => updateRequirement(item.id, { acceptanceCriteria: event.target.value })} /></details></td>
          </tr>)}</tbody></table></div>
        </> : <div className="grid min-w-0 gap-3">{filteredRequirements.map((requirement) => <RequirementCard key={requirement.id} requirement={requirement} onUpdate={updateRequirement} onGenerateStory={(item) => void generateStory(item)} onGenerateTestCase={(item) => void generateTestCase(item)} onView={() => setDetailRequirementId(requirement.id)} generatingStory={generatingId === requirement.id} generatingTestCase={generatingTestCaseId === requirement.id} />)}</div>}
      </section>}

      {tab === "elicitation" && <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border border-[#CBD5E1] bg-[#FFFCFB] p-4"><div className="mb-3"><h2 className="font-serif text-xl font-bold italic text-[#003366]">Discovery notes</h2><p className="mt-1 text-sm text-slate-700">Write freely. A line starting with an @REQ tag creates or updates a matrix requirement.</p></div><label htmlFor="ba-project-context" className="mb-3 block text-xs font-semibold text-slate-700">Project context<input id="ba-project-context" className={`${inputClass} mt-1`} value={project.description} onChange={(event) => updateProject((current) => ({ ...current, description: event.target.value }))} placeholder="Purpose, users, systems, or scope" /></label><label htmlFor="ba-discovery-notes" className="sr-only">Discovery notes</label><textarea id="ba-discovery-notes" className={`${inputClass} min-h-[360px] resize-y font-mono text-sm leading-6`} value={project.discoveryNotes} onChange={(event) => { const notes = event.target.value; updateProject((current) => ({ ...current, discoveryNotes: notes, requirements: requirementsFromNotes(notes, current.requirements) })); }} placeholder={'Capture meeting notes and decisions here.\n\nExample:\n@REQ-001: A customer can review the status of a submitted request.'} /></div>
        <aside className="border border-[#CBD5E1] bg-[#FFFCFB] p-4"><h3 className="font-semibold text-[#003366]">Mosaic Notetaker</h3><p className="mt-2 text-sm text-slate-700">Import saved meeting minutes into this canvas. Save a meeting from Notetaker first if it is not listed.</p><button className={`${secondaryClass} mt-4 w-full`} disabled={meetingLoading} onClick={() => void loadMeetings()}>{meetingLoading ? <LoaderCircle size={15} className="animate-spin" /> : <Archive size={15} />}Import Mosaic Minutes</button>{meetingError && <p role="alert" className="mt-3 text-sm text-[#B42318]">{meetingError}</p>}{meetingRows.length > 0 && <div className="mt-3 max-h-[450px] divide-y divide-slate-200 overflow-y-auto border border-slate-200">{meetingRows.map((meeting) => <button key={meeting.id} type="button" onClick={() => void importMinutes(meeting)} className="block min-h-14 w-full px-3 py-2 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]"><span className="block text-sm font-semibold text-[#003366]">{meeting.title}</span><span className="mt-0.5 block text-xs text-slate-700">{meeting.date || "Date not set"}</span></button>)}</div>}{!meetingLoading && meetingRows.length === 0 && <p className="mt-3 text-xs text-slate-600">Choose Import Mosaic Minutes to load recent saved records.</p>}</aside>
      </section>}

      {tab === "roadmap" && <section><div className="mb-3"><h2 className="font-serif text-xl font-bold italic text-[#003366]">Delivery phases</h2><p className="mt-1 text-sm text-slate-700">Set dates and check off deliverables as the project moves forward.</p></div><div className="space-y-3">{project.phases.map((phase, index) => { const done = phase.deliverables.filter((item) => item.done).length; const percent = phase.deliverables.length ? Math.round(done * 100 / phase.deliverables.length) : 0; return <article key={phase.name} className="grid grid-cols-1 gap-4 border border-[#CBD5E1] bg-[#FFFCFB] p-4 lg:grid-cols-[minmax(210px,0.8fr)_minmax(0,2fr)]"><div><h3 className="font-semibold text-[#003366]">{phase.name}</h3><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-semibold text-slate-700">Start<input type="date" className={`${inputClass} mt-1`} value={phase.startDate} onChange={(event) => updateProject((current) => ({ ...current, phases: current.phases.map((item, i) => i === index ? { ...item, startDate: event.target.value } : item) }))} /></label><label className="text-xs font-semibold text-slate-700">Target<input type="date" className={`${inputClass} mt-1`} value={phase.targetDate} onChange={(event) => updateProject((current) => ({ ...current, phases: current.phases.map((item, i) => i === index ? { ...item, targetDate: event.target.value } : item) }))} /></label></div></div><div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-700">Deliverables</span><span className="font-mono text-[#003366]">{done} / {phase.deliverables.length}</span></div><div className="h-1.5 bg-slate-200" role="progressbar" aria-label={`${phase.name} completed`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-[#003366]" style={{ width: `${percent}%` }} /></div><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{phase.deliverables.map((deliverable, deliveryIndex) => <label key={deliverable.label} className="flex min-h-10 items-start gap-2 border border-slate-200 px-2.5 py-2 text-sm"><input type="checkbox" checked={deliverable.done} onChange={(event) => updateProject((current) => ({ ...current, phases: current.phases.map((item, i) => i === index ? { ...item, deliverables: item.deliverables.map((entry, j) => j === deliveryIndex ? { ...entry, done: event.target.checked } : entry) } : item) }))} className="mt-0.5 accent-[#003366]" /><span>{deliverable.label}</span></label>)}</div></div></article>; })}</div></section>}

      {tab === "documents" && <section><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-xl font-bold italic text-[#003366]">Project documents</h2><p className="mt-1 text-sm text-slate-700">Create editable working drafts from this project’s current information.</p></div><div className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_minmax(140px,1fr)_auto]"><label className="sr-only" htmlFor="ba-document-template">Document template</label><select id="ba-document-template" className={inputClass} value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}><optgroup label="Before delivery">{PRE_DOC_TEMPLATES.map((value) => <option key={value}>{value}</option>)}</optgroup><optgroup label="After delivery">{POST_DOC_TEMPLATES.map((value) => <option key={value}>{value}</option>)}</optgroup></select><label className="sr-only" htmlFor="ba-document-title">Document title</label><input id="ba-document-title" className={inputClass} value={documentTitle} onChange={(event) => setDocumentTitle(event.target.value)} placeholder="Optional title" /><button className={buttonClass} onClick={addDocument}><FilePlus2 size={15} />Create draft</button></div></div>
        {project.documents.length === 0 ? <div className="border border-[#CBD5E1] bg-[#FFFCFB] p-5 text-sm text-slate-700">No documents yet. Choose a template to create a project draft.</div> : <div className="space-y-3">{project.documents.map((item) => <article key={item.id} className="border border-[#CBD5E1] bg-[#FFFCFB] p-4"><div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><label className="sr-only" htmlFor={`doc-title-${item.id}`}>Document title</label><input id={`doc-title-${item.id}`} className={`${inputClass} font-semibold`} value={item.title} onChange={(event) => updateProject((current) => ({ ...current, documents: current.documents.map((doc) => doc.id === item.id ? { ...doc, title: event.target.value, updatedAt: new Date().toISOString() } : doc) }))} /><p className="mt-1 text-xs text-slate-700">{item.kind} · Updated {new Date(item.updatedAt).toLocaleDateString()}</p></div><button className={secondaryClass} onClick={() => void exportDocument(item)}><Download size={15} />Download Word</button></div><label className="sr-only" htmlFor={`doc-content-${item.id}`}>Document content</label><textarea id={`doc-content-${item.id}`} className={`${inputClass} min-h-48 resize-y leading-6`} value={item.content} onChange={(event) => updateProject((current) => ({ ...current, documents: current.documents.map((doc) => doc.id === item.id ? { ...doc, content: event.target.value, updatedAt: new Date().toISOString() } : doc) }))} /></article>)}</div>}
      </section>}

      {tab === "export" && <section><div className="mb-3"><h2 className="font-serif text-xl font-bold italic text-[#003366]">Export and review</h2><p className="mt-1 text-sm text-slate-700">Create files from the current project data.</p></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"><button className={`${secondaryClass} justify-start p-4`} onClick={async () => downloadBlob(await renderXlsx(project), `${fileName(project.name)}-rtm.xlsx`)}><Table2 size={18} /><span className="text-left"><strong className="block">Export RTM workbook</strong><span className="mt-1 block text-xs font-normal text-slate-700">Requirements, links, and verification statuses</span></span><Download className="ml-auto" size={15} /></button><button className={`${secondaryClass} justify-start p-4`} onClick={() => window.print()}><Printer size={18} /><span className="text-left"><strong className="block">Print project summary</strong><span className="mt-1 block text-xs font-normal text-slate-700">Open the browser print dialog for a PDF copy</span></span></button><button className={`${secondaryClass} justify-start p-4`} onClick={() => setTab("documents")}><FileText size={18} /><span className="text-left"><strong className="block">Project documents</strong><span className="mt-1 block text-xs font-normal text-slate-700">Edit and download a Word draft</span></span></button></div><div className="mt-5 border border-[#CBD5E1] bg-[#FFFCFB] p-4"><h3 className="font-semibold text-[#003366]">Traceability summary</h3><dl className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3"><div><dt className="text-slate-700">Coverage</dt><dd className="font-semibold">{coverage}%</dd></div><div><dt className="text-slate-700">Passed verification</dt><dd className="font-semibold">{project.requirements.filter((item) => item.verification === "Passed").length} of {project.requirements.length}</dd></div><div><dt className="text-slate-700">Requirements without a story, test, or milestone</dt><dd className="font-semibold">{project.requirements.filter((item) => !item.userStory && !item.testCase && !item.milestone).length}</dd></div></dl></div></section>}
    </>}
    {detailRequirement && <div className="ba-no-print fixed inset-0 z-50 flex items-center justify-center bg-[#001A33]/40 p-3 sm:p-6" onClick={() => setDetailRequirementId("")}><section role="dialog" aria-modal="true" aria-labelledby="ba-requirement-detail-title" className="max-h-[min(760px,calc(100dvh-1.5rem))] w-full max-w-3xl overflow-y-auto border border-slate-300 bg-[#FFFCFB] shadow-xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5"><div><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#31577D]">{project?.name || "Business Analysis"}</p><h2 id="ba-requirement-detail-title" className="mt-1 font-serif text-xl font-bold italic text-[#003366]">{detailRequirement.id}</h2></div><button type="button" aria-label="Close requirement details" className="inline-flex h-8 w-8 shrink-0 items-center justify-center border border-slate-300 text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]" onClick={() => setDetailRequirementId("")}><X aria-hidden="true" size={15} /></button></header>
      <dl className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-2">
        <div className="bg-white p-3 sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Business requirement</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{detailRequirement.statement || "—"}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Category</dt><dd className="mt-1 text-sm font-medium text-[#003366]">{detailRequirement.category}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">MoSCoW priority</dt><dd className="mt-1 text-sm font-medium text-[#003366]">{detailRequirement.priority || "Unprioritized"}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Verification</dt><dd className="mt-1 text-sm font-medium text-[#003366]">{detailRequirement.verification}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Milestone</dt><dd className="mt-1 text-sm text-slate-800">{detailRequirement.milestone || "—"}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">User story</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{detailRequirement.userStory || "—"}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Test case</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{detailRequirement.testCase || "—"}</dd></div>
        <div className="bg-white p-3 sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Acceptance criteria</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-800">{detailRequirement.acceptanceCriteria || "—"}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Created</dt><dd className="mt-1 text-xs text-slate-700">{timestampText(detailRequirement.createdAt)}</dd></div>
        <div className="bg-white p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Last updated</dt><dd className="mt-1 text-xs text-slate-700">{timestampText(detailRequirement.updatedAt)}</dd></div>
      </dl>
    </section></div>}
    <footer className="ba-no-print mt-8 flex items-center gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600"><Check size={14} className={saveState === "error" ? "text-[#B42318]" : "text-[#003366]"} aria-hidden="true" />{saveState === "error" ? "Changes are not saved. Use Save to retry." : "Changes save to your Business Analysis workspace."}</footer>
  </div>;
}
