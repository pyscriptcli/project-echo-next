"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  ExternalLink,
  FolderKanban,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Users,
  Plus,
  Search,
  X,
} from "lucide-react";

const PROJECT_URL = "https://app.clickup.com/9014981136/v/o/f/901414174663";
type View = "overview" | "calendar";

interface ProjectList {
  id: string;
  name: string;
  taskCount: number;
  url?: string | null;
}

interface ProjectTask {
  id: string;
  name: string;
  url: string | null;
  parentId: string | null;
  listId: string;
  status: string;
  statusType: string;
  startDate: string | null;
  dueDate: string | null;
  assignees: Array<{ id: string; name: string; initials: string; profilePicture?: string | null }>;
}

interface ProjectMember {
  id: string;
  name: string;
  initials: string;
  profilePicture?: string | null;
}

interface ProjectData {
  folder: { id: string; name: string; url: string; spaceName: string };
  lists: ProjectList[];
  tasks: ProjectTask[];
  members: ProjectMember[];
  defaultAssignees: Record<string, string[]>;
}

interface ProjectCardData {
  id: string;
  name: string;
  url: string;
  listCount: number;
  spaceName: string;
}

function isComplete(task: ProjectTask) {
  return task.statusType.toLowerCase() === "closed" || /^(complete|completed|closed|done)$/.test(task.status.toLowerCase());
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function owners(task: ProjectTask) {
  return task.assignees.map((assignee) => assignee.name).join(", ") || "Unassigned";
}

function statusStyle(task: ProjectTask) {
  if (isComplete(task)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (/progress|active/i.test(task.status)) return "border-blue-200 bg-blue-50 text-[#003366]";
  if (/blocked|hold/i.test(task.status)) return "border-amber-300 bg-amber-50 text-amber-900";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function routeSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
}

function routeSegment(name: string, id: string, siblings: Array<{ name: string; id: string }>) {
  const slug = routeSlug(name);
  return siblings.filter((item) => routeSlug(item.name) === slug).length > 1 ? `${slug}-${id}` : slug;
}

function matchRouteSegment<T extends { name: string; id: string }>(items: T[], segment: string) {
  return items.find((item) => segment === routeSlug(item.name) || segment === `${routeSlug(item.name)}-${item.id}`);
}

function ProjectPageHeader({ eyebrow, title, subtitle, onBack, actions }: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
}) {
  return <header className="flex min-h-[58px] flex-col justify-between gap-2 border-b border-[#003366]/15 pb-2 sm:flex-row sm:items-center">
    <div className="flex min-w-0 items-center gap-2">
      {onBack
        ? <button type="button" onClick={onBack} aria-label="Go back" className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-300 text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>
        : <span aria-hidden="true" className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban className="h-4 w-4" /></span>}
      <div className="min-w-0 border-l-2 border-[#C9A84C] py-0.5 pl-2.5">
        <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#31577D]">{eyebrow}</p>
        <h1 className="truncate text-xl font-semibold tracking-tight text-[#003366]">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-xs text-slate-600">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>;
}

function ProjectActionButton({ children, onClick, disabled = false, label }: { children: ReactNode; onClick: () => void; disabled?: boolean; label?: string }) {
  return <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="inline-flex h-8 min-h-8 items-center justify-center gap-1.5 border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-[#003366] transition-colors hover:border-[#003366] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">{children}</button>;
}

function ClickUpLink({ href, label }: { href: string; label: string }) {
  return <a href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} className="inline-flex h-8 min-h-8 w-8 items-center justify-center border border-slate-300 bg-white p-0 text-[#003366] transition-colors hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]"><ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>;
}

type CalendarScale = "Day" | "4 days" | "Week" | "Month";

function CalendarView({ tasks, lists, members, defaultAssignees, onRefresh }: { tasks: ProjectTask[]; lists: ProjectList[]; members: ProjectMember[]; defaultAssignees: Record<string, string[]>; onRefresh: () => void }) {
  const [anchor, setAnchor] = useState(() => new Date());
  const [scale, setScale] = useState<CalendarScale>("Month");
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [listFilter, setListFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modal, setModal] = useState<{ date: string; task?: ProjectTask } | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskListId, setTaskListId] = useState(lists[0]?.id || "");
  const [taskStatus, setTaskStatus] = useState("to do");
  const [taskPriority, setTaskPriority] = useState("normal");
  const [taskAssignees, setTaskAssignees] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!modal) return;
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModal(null);
    };
    window.addEventListener("keydown", dismissOnEscape);
    return () => window.removeEventListener("keydown", dismissOnEscape);
  }, [modal]);
  const start = useMemo(() => {
    if (scale === "Month") return new Date(anchor.getFullYear(), anchor.getMonth(), 1 - new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay());
    const date = new Date(anchor); date.setHours(0, 0, 0, 0);
    if (scale === "Week") date.setDate(date.getDate() - date.getDay());
    return date;
  }, [anchor, scale]);
  const cellCount = scale === "Month" ? Math.ceil((new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() + new Date(anchor.getFullYear(), anchor.getMonth(), 1).getDay()) / 7) * 7 : scale === "Week" ? 7 : scale === "4 days" ? 4 : 1;
  const days = Array.from({ length: cellCount }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
  const today = dateKey(new Date());
  const visibleTasks = tasks.filter((task) => (showClosed || !isComplete(task)) && (listFilter === "all" || task.listId === listFilter) && (assigneeFilter === "all" || task.assignees.some((person) => person.id === assigneeFilter)) && (statusFilter === "all" || task.status.toLowerCase() === statusFilter) && task.name.toLowerCase().includes(query.toLowerCase()));
  const taskMap = new Map<string, ProjectTask[]>();
  visibleTasks.forEach((task) => { const key = (task.dueDate || task.startDate)?.slice(0, 10); if (key) taskMap.set(key, [...(taskMap.get(key) || []), task]); });
  const label = scale === "Month" ? new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(anchor) : days.length === 1 ? new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(days[0]) : `${new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(days[0])} – ${new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(days[days.length - 1])}`;
  const move = (amount: number) => { const next = new Date(anchor); next.setDate(next.getDate() + amount * (scale === "Month" ? 0 : scale === "Week" ? 7 : scale === "4 days" ? 4 : 1)); if (scale === "Month") next.setMonth(next.getMonth() + amount); setAnchor(next); };
  const openCreate = (date: string) => { const listId = listFilter !== "all" ? listFilter : lists[0]?.id || ""; setTaskName(""); setTaskDescription(""); setTaskStatus("to do"); setTaskPriority("normal"); setTaskListId(listId); setTaskAssignees(defaultAssignees[listId] || []); setError(""); setModal({ date }); };
  const openEditDate = (task: ProjectTask) => { setError(""); setModal({ date: (task.dueDate || task.startDate || today).slice(0, 10), task }); };
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const result = await fetch(`/api/tasks?action=${modal?.task ? "project-task-update" : "project-task-create"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(modal?.task ? { taskId: modal.task.id, dueDate: modal.date } : { listId: taskListId, name: taskName, description: taskDescription, status: taskStatus, priority: taskPriority, assignees: taskAssignees, dueDate: modal?.date }) });
      const payload = await result.json(); if (!result.ok) throw new Error(payload.error || "Calendar change failed.");
      setModal(null); onRefresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Calendar change failed."); }
    finally { setBusy(false); }
  };
  const changeDate = async (task: ProjectTask, date: string) => {
    const response = await fetch("/api/tasks?action=project-task-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId: task.id, dueDate: date }) });
    const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Unable to reschedule task."); onRefresh();
  };

  return <section className="border border-slate-200 bg-white" aria-label="Project calendar">
    <header className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-[#003366]">Team schedule</h2><p className="mt-1 text-xs text-slate-500">Click a date to create a task. Drag a task to reschedule it.</p></div><div className="flex flex-wrap items-center gap-2"><select aria-label="Calendar timescale" value={scale} onChange={(event) => setScale(event.target.value as CalendarScale)} className="h-9 border border-slate-300 bg-white px-2 text-xs font-semibold text-[#003366]">{["Day", "4 days", "Week", "Month"].map((option) => <option key={option}>{option}</option>)}</select><button type="button" onClick={() => setAnchor(new Date())} className="h-9 border border-slate-300 px-3 text-xs font-semibold text-[#003366]">Today</button><button type="button" onClick={() => move(-1)} aria-label="Previous period" className="h-9 w-9 border border-slate-300 text-[#003366]"><ChevronLeft className="mx-auto h-4 w-4" /></button><button type="button" onClick={() => move(1)} aria-label="Next period" className="h-9 w-9 border border-slate-300 text-[#003366]"><ChevronRight className="mx-auto h-4 w-4" /></button></div></div>
      <div className="flex flex-wrap items-center gap-2"><div className="relative min-w-40 flex-1"><Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="h-9 w-full border border-slate-200 pl-8 pr-2 text-xs"/></div><select aria-label="Filter by subproject" value={listFilter} onChange={(event) => setListFilter(event.target.value)} className="h-9 border border-slate-200 bg-white px-2 text-xs"><option value="all">All subprojects</option>{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><select aria-label="Filter by assignee" value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className="h-9 border border-slate-200 bg-white px-2 text-xs"><option value="all">All assignees</option>{Array.from(new Map(tasks.flatMap((task) => task.assignees).map((person) => [person.id, person])).values()).map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-9 border border-slate-200 bg-white px-2 text-xs"><option value="all">All statuses</option>{Array.from(new Set(tasks.map((task) => task.status))).map((status) => <option key={status} value={status.toLowerCase()}>{status}</option>)}</select><label className="flex h-9 items-center gap-2 px-2 text-xs text-slate-600"><input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)}/>Show closed</label></div>
    </header>
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><strong className="text-sm text-[#003366]">{label}</strong><span className="text-xs text-slate-500">{visibleTasks.filter((task) => { const date = (task.dueDate || task.startDate)?.slice(0, 10); return date && days.some((day) => dateKey(day) === date); }).length} scheduled</span></div>
    <div role="grid" aria-label={label} className={`grid ${scale === "Day" ? "grid-cols-1" : "grid-cols-7"}`}>
      {scale !== "Day" && (scale === "Month" ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] : days.map((day) => new Intl.DateTimeFormat("en", { weekday: "short" }).format(day))).map((day, index) => <div key={`${day}-${index}`} className="border-b border-r border-slate-200 bg-[#F7FAFC] px-2 py-2 text-center text-[10px] font-semibold uppercase text-slate-500">{day}</div>)}
      {days.map((date) => { const key = dateKey(date); const dayTasks = taskMap.get(key) || []; return <div key={key} role="button" tabIndex={0} aria-label={`Create task on ${key}`} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openCreate(key); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const task = tasks.find((item) => item.id === event.dataTransfer.getData("text/plain")); if (task) void changeDate(task, key).catch((caught) => setError(caught.message)); }} onClick={() => openCreate(key)} className={`group min-h-28 cursor-pointer border-b border-r border-slate-100 p-2 hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#003366] ${key.slice(0, 7) !== dateKey(anchor).slice(0, 7) && scale === "Month" ? "bg-slate-50" : "bg-white"} ${scale === "Day" ? "min-h-64" : ""}`}><div className="mb-1 flex items-center justify-between"><span className={`inline-flex h-7 min-w-7 items-center justify-center px-1 text-xs ${key === today ? "bg-[#003366] font-semibold text-white" : "text-slate-600"}`}>{scale === "Month" ? date.getDate() : new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date)}</span></div><div className="space-y-1">{dayTasks.slice(0, scale === "Month" ? 4 : 12).map((task) => <button key={task.id} type="button" draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", task.id); event.dataTransfer.effectAllowed = "move"; }} onClick={(event) => { event.stopPropagation(); openEditDate(task); }} title={`${task.name} · ${owners(task)} · ${task.status}`} className={`block w-full truncate border-l-2 px-1 py-1 text-left text-[10px] leading-4 ${isComplete(task) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-[#C9A84C] bg-[#FBF7E9] text-[#003366]"}`}>{task.name}<span className="hidden sm:inline"> · {owners(task)}</span></button>)}{dayTasks.length > (scale === "Month" ? 4 : 12) && <p className="px-1 text-[10px] text-slate-500">+{dayTasks.length - 4} more</p>}</div></div>; })}
    </div>
    {error && <p role="alert" className="border-t border-red-100 px-4 py-2 text-xs text-red-700">{error}</p>}
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setModal(null)}><div role="dialog" aria-modal="true" aria-labelledby="calendar-task-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto border border-slate-200 bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-center justify-between"><div><h3 id="calendar-task-title" className="font-semibold text-[#003366]">{modal.task ? "Reschedule task" : "Create task"}</h3><p className="mt-1 text-xs text-slate-500">{modal.task ? "Change this task’s calendar date." : "Add a task to this date and choose where it belongs."}</p></div><button type="button" onClick={() => setModal(null)} aria-label="Close" className="inline-flex h-11 w-11 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><X className="h-4 w-4"/></button></div>{modal.task ? <p className="mb-3 text-sm text-slate-700">{modal.task.name}</p> : <><input autoFocus value={taskName} onChange={(event) => setTaskName(event.target.value)} placeholder="Task name" className="mb-3 h-10 w-full border border-slate-300 px-3 text-sm"/><select value={taskListId} onChange={(event) => { const nextId = event.target.value; setTaskListId(nextId); setTaskAssignees(defaultAssignees[nextId] || []); }} className="mb-3 h-10 w-full border border-slate-300 bg-white px-3 text-sm" aria-label="Task list">{lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}</select><textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} placeholder="Description (optional)" rows={3} className="mb-3 w-full border border-slate-300 px-3 py-2 text-sm"/><div className="mb-3 grid grid-cols-2 gap-2"><select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)} className="h-10 border border-slate-300 bg-white px-2 text-sm" aria-label="Task status">{Array.from(new Set(["to do", ...tasks.map((task) => task.status.toLowerCase())])).map((status) => <option key={status} value={status}>{status.replace(/\b\w/g, (letter) => letter.toUpperCase())}</option>)}</select><select value={taskPriority} onChange={(event) => setTaskPriority(event.target.value)} className="h-10 border border-slate-300 bg-white px-2 text-sm" aria-label="Task priority">{["urgent", "high", "normal", "low"].map((priority) => <option key={priority} value={priority}>{priority[0].toUpperCase() + priority.slice(1)} priority</option>)}</select></div><label className="mb-3 block text-xs font-semibold text-slate-600">Assignees<select multiple value={taskAssignees} onChange={(event) => setTaskAssignees(Array.from(event.target.selectedOptions, (option) => option.value))} className="mt-1 h-24 w-full border border-slate-300 bg-white px-3 py-2 text-sm" aria-label="Assignees">{members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label></>}<label className="block text-xs font-semibold text-slate-600">Due date<input type="date" value={modal.date} onChange={(event) => setModal({ ...modal, date: event.target.value })} className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm"/></label>{error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setModal(null)} className="min-h-11 px-3 text-xs text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Cancel</button><button type="button" disabled={busy || (!modal.task && !taskName.trim())} onClick={() => void submit()} className="min-h-11 bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">{busy ? "Saving…" : "Save to ClickUp"}</button></div></div></div>}
  </section>;
}

function EmptyState({ hasLists }: { hasLists: boolean }) {
  const message = [hasLists ? "No tasks in this project yet" : "No lists in this folder yet", "Add lists and tasks in ClickUp, then refresh this page to see them in the project workspace."];

  return (
    <div className="flex min-h-72 flex-col items-center justify-center border border-dashed border-[#9FB8CE] bg-white px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban aria-hidden="true" className="h-5 w-5" /></div>
      <h2 className="text-base font-semibold text-[#003366]">{message[0]}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">{message[1]}</p>
      <a href={PROJECT_URL} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">
        Open project in ClickUp <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}

interface TaskTreeNode { task: ProjectTask; children: TaskTreeNode[] }

function taskTree(tasks: ProjectTask[]): TaskTreeNode[] {
  const ids = new Set(tasks.map((task) => task.id));
  const order = new Map(tasks.map((task, index) => [task.id, index]));
  const children = new Map<string, ProjectTask[]>();
  const roots: ProjectTask[] = [];
  for (const task of tasks) {
    if (task.parentId && ids.has(task.parentId)) children.set(task.parentId, [...(children.get(task.parentId) || []), task]);
    else roots.push(task);
  }
  const visited = new Set<string>();
  const build = (task: ProjectTask): TaskTreeNode | null => {
    if (visited.has(task.id)) return null;
    visited.add(task.id);
    const orderedChildren = (children.get(task.id) || []).slice().sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));
    return { task, children: orderedChildren.map(build).filter((node): node is TaskTreeNode => node !== null) };
  };
  const tree = roots.map(build).filter((node): node is TaskTreeNode => node !== null);
  for (const task of tasks) if (!visited.has(task.id)) { const node = build(task); if (node) tree.push(node); }
  const phaseOrder = (name: string) => {
    if (/project brief|site sourcing/i.test(name)) return 0;
    if (/site negotiation|due diligence/i.test(name)) return 1;
    if (/site documentation/i.test(name)) return 2;
    return 3;
  };
  return tree
    .map((node, index) => ({ node, index }))
    .sort((a, b) => phaseOrder(a.node.task.name) - phaseOrder(b.node.task.name) || a.index - b.index)
    .map(({ node }) => node);
}

function TaskRow({ task, depth = 0 }: { task: ProjectTask; depth?: number }) {
  const content = <>
    <span className="min-w-0 flex-1"><span className={`block truncate text-[13px] font-medium ${depth ? "text-slate-700" : "text-[#003366]"}`}>{task.name}</span><span className="mt-1 block truncate text-[10px] text-slate-500">{owners(task)}</span></span>
    <span className={`shrink-0 border px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${statusStyle(task)}`}>{task.status}</span>
    <span className="hidden w-28 shrink-0 text-right text-[11px] text-slate-600 sm:block">{formatDate(task.dueDate)}</span>
  </>;
  return task.url ? <a href={task.url} target="_blank" rel="noreferrer" className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0 transition-colors hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">{content}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" /></a> : <div className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">{content}</div>;
}

function TaskHierarchy({ tasks }: { tasks: ProjectTask[] }) {
  const tree = useMemo(() => taskTree(tasks), [tasks]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const renderNode = (node: TaskTreeNode, depth: number, phaseIndex: number): ReactNode => {
    const { task, children } = node;
    if (!children.length) return <TaskRow key={task.id} task={task} depth={depth} />;
    const phase = depth === 0, isCollapsed = collapsed.has(task.id);
    const descendants: ProjectTask[] = [];
    const collect = (child: TaskTreeNode) => { descendants.push(child.task); child.children.forEach(collect); };
    children.forEach(collect);
    const complete = descendants.filter(isComplete).length;
    return <section key={task.id} className={phase ? "overflow-hidden border border-slate-200 bg-white shadow-[0_2px_8px_rgba(0,51,102,0.04)]" : "relative ml-3 border-l-2 border-[#D9E3EC] pl-3 sm:ml-5 sm:pl-4"}>
      <button type="button" aria-expanded={!isCollapsed} onClick={() => toggle(task.id)} className={`flex w-full items-center gap-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#003366] ${phase ? "min-h-[66px] bg-[#F7FAFC] px-4 py-3 hover:bg-[#F2F6F9]" : "min-h-12 px-2 py-2 hover:bg-[#F7FAFC]"}`}>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center ${phase ? "bg-[#003366] text-white" : "bg-white text-[#31577D] ring-1 ring-slate-200"}`}><ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} /></span>
        <span className="min-w-0 flex-1">{phase && <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.16em] text-[#A98611]">Phase {phaseIndex + 1}</span>}<span className={`block truncate ${phase ? "text-sm font-bold text-[#003366] sm:text-[15px]" : "text-[13px] font-semibold text-[#21486D]"}`}>{task.name}</span></span>
        {/conditional/i.test(task.name) && <span className="hidden border border-[#E6D49A] bg-[#FBF7E9] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#725900] sm:inline">Conditional</span>}
        <span className="shrink-0 text-right text-[10px] text-slate-500"><span className="block font-semibold tabular-nums text-[#31577D]">{complete} / {descendants.length}</span><span className="hidden sm:block">complete</span></span>
      </button>
      {phase && <div className="flex h-1 bg-slate-100"><div className="bg-[#C9A84C]" style={{ width: `${descendants.length ? Math.round(complete / descendants.length * 100) : 0}%` }} /></div>}
      {!isCollapsed && <div className={phase ? "space-y-1 px-3 py-3 sm:px-5 sm:py-4" : "pb-2"}>{children.map((child, index) => renderNode(child, depth + 1, index))}</div>}
    </section>;
  };
  return <div className="space-y-3">{tree.map((node, index) => renderNode(node, 0, index))}</div>;
}
function LoadingSkeleton({ variant }: { variant: "gallery" | "project" | "subproject" }) {
  const bar = (className: string) => <span aria-hidden="true" className={`block animate-pulse bg-slate-200 ${className}`} />;
  if (variant === "gallery") return <div role="status" aria-label="Loading projects" className="space-y-4" aria-busy="true"><span className="sr-only">Loading projects</span><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} aria-hidden="true" className="min-h-40 border border-slate-200 bg-white p-4"><div className="flex items-start justify-between">{bar("h-9 w-9")}{bar("h-4 w-4")}</div>{bar("mt-4 h-5 w-3/5")}{bar("mt-2 h-3 w-2/5")}{bar("mt-7 h-3 w-1/3")}</div>)}</div></div>;
  const isProject = variant === "project";
  return <div role="status" aria-label={isProject ? "Loading project workspace" : "Loading subproject workspace"} className="space-y-3" aria-busy="true"><span className="sr-only">{isProject ? "Loading project workspace" : "Loading subproject workspace"}</span><div aria-hidden="true" className="border border-slate-200 bg-white p-4">{bar("h-3 w-28")}{bar("mt-3 h-7 w-2/5")}</div>{isProject && <div aria-hidden="true" className="flex gap-3 border-b border-slate-200 py-2">{bar("h-8 w-20")}{bar("h-8 w-20")}</div>}<div aria-hidden="true" className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="border border-slate-200 bg-white p-4">{bar("h-3 w-2/5")}{bar("mt-3 h-6 w-3/4")}{bar("mt-4 h-2 w-full")}{bar("mt-3 h-3 w-1/2")}</div>)}</div>{isProject ? <div aria-hidden="true" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <div key={index} className="border border-slate-200 bg-white p-3">{bar("h-4 w-3/4")}{bar("mt-3 h-2 w-full")}{bar("mt-3 h-3 w-2/5")}</div>)}</div> : <div aria-hidden="true" className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="border border-slate-200 bg-white p-4"><div className="flex items-center gap-3">{bar("h-7 w-7")}{bar("h-4 w-2/5")}{bar("ml-auto h-4 w-16")}</div>{bar("mt-4 h-2 w-full")}{bar("mt-4 h-10 w-full")}</div>)}</div>}</div>;
}
function ProjectGallery({ projects, selectedProjectIds, loading, error, savingSelection, onRefresh, onOpen, onSaveSelection }: {
  projects: ProjectCardData[];
  selectedProjectIds: string[];
  loading: boolean;
  error: string | null;
  savingSelection: boolean;
  onRefresh: () => void;
  onOpen: (project: ProjectCardData) => void;
  onSaveSelection: (folderIds: string[]) => Promise<void>;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftIds, setDraftIds] = useState<string[]>(selectedProjectIds);
  const [search, setSearch] = useState("");
  const [pickerError, setPickerError] = useState("");
  const pickerRef = useRef<HTMLElement | null>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const spaceName = projects[0]?.spaceName || "ClickUp Space";
  const includedProjects = projects.filter((project) => selectedProjectIds.includes(project.id));
  const filteredProjects = projects.filter((project) => project.name.toLowerCase().includes(search.trim().toLowerCase()));

  useEffect(() => {
    if (!pickerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPickerOpen(false);
        pickerTriggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !pickerRef.current) return;
      const focusable = Array.from(pickerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    pickerRef.current?.querySelector<HTMLElement>("button[aria-label='Close']")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [pickerOpen]);

  const openPicker = () => {
    setDraftIds(selectedProjectIds);
    setPickerError("");
    setPickerOpen(true);
  };
  const closePicker = () => {
    setPickerOpen(false);
    pickerTriggerRef.current?.focus();
  };
  const saveSelection = async () => {
    setPickerError("");
    try {
      await onSaveSelection(draftIds);
      closePicker();
    } catch (caught) {
      setPickerError(caught instanceof Error ? caught.message : "Could not save the project selection.");
    }
  };

  return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <ProjectPageHeader eyebrow="Project portfolio" title="Projects" subtitle={`Choose ClickUp folders to include · ${spaceName}`} actions={<>
      <button ref={pickerTriggerRef} type="button" onClick={openPicker} className="inline-flex min-h-8 items-center justify-center gap-1.5 border border-slate-300 bg-white px-2.5 text-[11px] font-semibold text-[#003366] transition-colors hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><FolderKanban aria-hidden="true" className="h-3.5 w-3.5" />Choose folders</button>
      <ProjectActionButton onClick={onRefresh} disabled={loading}><RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</ProjectActionButton>
    </>} />
    {loading && !projects.length ? <LoadingSkeleton variant="gallery" />
      : error && !projects.length ? <div role="alert" className="border border-amber-300 bg-white p-5"><p className="text-sm font-semibold text-[#003366]">Project folders could not be loaded</p><p className="mt-1 text-sm text-slate-600">{error}</p><button type="button" onClick={onRefresh} className="mt-3 min-h-11 border border-[#003366] px-3 text-xs font-semibold text-[#003366]">Try again</button></div>
        : includedProjects.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{includedProjects.map((project) => <button key={project.id} type="button" onClick={() => onOpen(project)} className="group min-h-40 border border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#C9A84C] hover:bg-[#FFFCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><div className="flex h-full flex-col"><div className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban aria-hidden="true" className="h-4 w-4" /></span><ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400 transition-colors group-hover:text-[#003366]" /></div><span className="mt-4 text-base font-semibold text-[#003366]">{project.name}</span><span className="mt-1 text-xs text-slate-500">{project.listCount} subproject{project.listCount === 1 ? "" : "s"}</span><span className="mt-auto pt-4 text-[10px] font-semibold uppercase tracking-wide text-[#31577D]">Open project</span></div></button>)}</div>
          : <div className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><FolderKanban aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h2 className="mt-3 text-base font-semibold text-[#003366]">Choose which folders are projects</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Only folders you select will appear in this shared project gallery.</p><button type="button" onClick={openPicker} className="mt-4 inline-flex min-h-10 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#C9A84C]">Choose folders</button></div>}
    {error && projects.length > 0 && <p role="status" className="border border-amber-300 bg-[#FBF7E9] px-3 py-2 text-xs text-[#003366]">Showing loaded folders. Refresh failed: {error}</p>}
    {pickerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closePicker}><section ref={pickerRef} role="dialog" aria-modal="true" aria-labelledby="project-picker-title" className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-xl flex-col border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
      <header className="border-b border-slate-200 px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#31577D]">Shared project list</p><h2 id="project-picker-title" className="mt-1 text-lg font-semibold text-[#003366]">Choose project folders</h2><p className="mt-1 text-xs text-slate-600">Selected folders appear for the whole team.</p></div><button type="button" aria-label="Close" onClick={closePicker} className="inline-flex h-10 w-10 items-center justify-center text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><X className="h-4 w-4" /></button></div><input aria-label="Search folders" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ClickUp folders" className="mt-4 h-10 w-full border border-slate-300 px-3 text-sm focus:border-[#003366] focus:outline-none" /></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">{filteredProjects.map((project) => { const checked = draftIds.includes(project.id); return <label key={project.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-slate-100 text-sm text-[#003366]"><input type="checkbox" checked={checked} onChange={() => setDraftIds((current) => checked ? current.filter((id) => id !== project.id) : [...current, project.id])} className="h-4 w-4 accent-[#003366]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{project.name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{project.listCount} subproject{project.listCount === 1 ? "" : "s"}</span></span></label>; })}{!filteredProjects.length && <p className="py-8 text-center text-sm text-slate-500">No folders match this search.</p>}</div>
      {pickerError && <p role="alert" className="px-5 pt-2 text-xs text-red-700">{pickerError}</p>}
      <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"><span className="text-xs text-slate-500">{draftIds.length} selected</span><div className="flex gap-2"><button type="button" onClick={closePicker} className="min-h-10 px-3 text-xs text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Cancel</button><button type="button" onClick={() => void saveSelection()} disabled={savingSelection} className="min-h-10 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">{savingSelection ? "Saving…" : "Save selection"}</button></div></footer>
    </section></div>}
  </section>;
}

function projectStage(name: string) {
  if (/site sourcing|project brief/i.test(name)) return "Site Sourcing";
  if (/site negotiation|due diligence/i.test(name)) return "Site Negotiation";
  if (/site documentation/i.test(name)) return "Site Documentation";
  return null;
}

function SubprojectStatusCards({ folderId, listId, tasks }: { folderId: string; listId: string; tasks: ProjectTask[] }) {
  const [actionPlan, setActionPlan] = useState("");
  const [savedPlan, setSavedPlan] = useState("");
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [savingPlan, setSavingPlan] = useState(false);
  const [planError, setPlanError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const stages = useMemo(() => taskTree(tasks).map((node) => {
    const leaves = (item: TaskTreeNode): ProjectTask[] => item.children.length ? item.children.flatMap(leaves) : [item.task];
    return { name: projectStage(node.task.name), tasks: leaves(node) };
  }).filter((stage): stage is { name: string; tasks: ProjectTask[] } => Boolean(stage.name)), [tasks]);
  const unfinishedStage = stages.findIndex((stage) => stage.tasks.some((task) => !isComplete(task)));
  const currentStageIndex = unfinishedStage < 0 ? Math.max(0, stages.length - 1) : unfinishedStage;
  const currentStage = stages[currentStageIndex];
  const completedCount = currentStage?.tasks.filter(isComplete).length || 0;

  useEffect(() => {
    let active = true;
    setLoadingPlan(true);
    fetch(`/api/tasks?action=project-action-plan&folderId=${encodeURIComponent(folderId)}&listId=${encodeURIComponent(listId)}`, { cache: "no-store" })
      .then(async (response) => { const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || "Could not load the action plan."); if (active) { setActionPlan(String(payload.actionPlan || "")); setSavedPlan(String(payload.actionPlan || "")); setPlanError(""); } })
      .catch((error: unknown) => { if (active) setPlanError(error instanceof Error ? error.message : "Could not load the action plan."); })
      .finally(() => { if (active) setLoadingPlan(false); });
    return () => { active = false; };
  }, [folderId, listId]);

  const saveActionPlan = async () => {
    setSavingPlan(true); setPlanError(""); setSaveMessage("");
    try {
      const response = await fetch("/api/tasks?action=project-action-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderId, listId, actionPlan }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Could not save the action plan.");
      setActionPlan(actionPlan.trim()); setSavedPlan(actionPlan.trim()); setSaveMessage("Saved");
    } catch (error) { setPlanError(error instanceof Error ? error.message : "Could not save the action plan."); }
    finally { setSavingPlan(false); }
  };

  const stageNames = ["Site Sourcing", "Site Negotiation", "Site Documentation"];
  return <section aria-label="Subproject status" className="grid gap-3 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,2fr)]">
    <article className="flex min-h-36 flex-col justify-center border border-slate-200 bg-white px-4 py-4 sm:px-5"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#31577D]">Current stage</p><h2 className="mt-2 text-lg font-semibold text-[#003366]">{currentStage?.name || "Not started"}</h2><div className="mt-4 flex items-baseline gap-1.5"><span className="text-2xl font-semibold tabular-nums text-[#003366]">{completedCount}</span><span className="text-sm tabular-nums text-slate-500">/ {currentStage?.tasks.length || 0} tasks completed</span></div><div className="mt-3 h-1.5 bg-slate-100"><div className="h-full bg-[#C9A84C]" style={{ width: `${currentStage?.tasks.length ? Math.round(completedCount / currentStage.tasks.length * 100) : 0}%` }} /></div></article>    <article className="border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#31577D]">Action plan</p><p className="mt-1 text-[11px] text-slate-500">Briefly describe the current project status.</p></div>{saveMessage && savedPlan === actionPlan.trim() && <span role="status" className="text-[10px] font-semibold text-emerald-700">{saveMessage}</span>}</div><textarea aria-label="Action plan" value={actionPlan} onChange={(event) => { setActionPlan(event.target.value); setSaveMessage(""); }} disabled={loadingPlan} maxLength={2000} rows={2} placeholder={loadingPlan ? "Loading action plan…" : "Current status and next step"} className="mt-3 min-h-16 w-full resize-y border border-slate-200 px-3 py-2 text-xs leading-5 text-[#003366] placeholder:text-slate-400 focus:border-[#003366] focus:outline-none disabled:bg-slate-50" />{planError && <p role="alert" className="mt-1 text-[10px] text-red-700">{planError}</p>}<div className="mt-2 flex items-center justify-between gap-3"><span className="text-[10px] text-slate-400">{actionPlan.length} / 2,000</span><button type="button" onClick={() => void saveActionPlan()} disabled={loadingPlan || savingPlan || actionPlan.trim() === savedPlan.trim()} className="min-h-8 border border-[#003366] bg-[#003366] px-3 text-[10px] font-semibold text-white hover:bg-[#174778] disabled:cursor-not-allowed disabled:opacity-50">{savingPlan ? "Saving…" : "Save action plan"}</button></div></article>
  </section>;
}

function SubprojectWorkspace({ folderId, folderUrl, list, tasks, members, defaultAssignees, onAssign, savingAssignees, onBack, onRefresh }: {
  folderId: string;
  folderUrl: string;
  list: ProjectList;
  tasks: ProjectTask[];
  members: ProjectMember[];
  defaultAssignees: string[];
  onAssign: (assigneeIds: string[]) => void;
  savingAssignees: boolean;
  onBack: () => void;
  onRefresh: () => void;
}) {
  const [view, setView] = useState<"tasks" | "calendar" | "schedule">("tasks");
  const scheduled = tasks.filter((task) => task.startDate || task.dueDate);
  const dateValues = scheduled.flatMap((task) => [task.startDate, task.dueDate]).filter((value): value is string => Boolean(value)).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  const minDate = dateValues.length ? Math.min(...dateValues) : 0;
  const maxDate = dateValues.length ? Math.max(...dateValues) : 0;
  const span = Math.max(86400000, maxDate - minDate);
  const tabs = [{ id: "tasks", label: "Timeline" }, { id: "calendar", label: "Calendar" }, { id: "schedule", label: "Schedule" }] as const;

  const assignedMembers = defaultAssignees.map((id) => members.find((member) => member.id === id)).filter((member): member is ProjectMember => Boolean(member));

  return <section className="mx-auto w-full max-w-[1440px] space-y-4 pb-8">
    <ProjectPageHeader eyebrow="Subproject workspace" title={list.name} onBack={onBack} actions={<>
      <div className="inline-flex h-8 items-center gap-1.5 border border-slate-300 bg-white px-2 text-[11px] font-semibold text-[#003366]" aria-label="Subproject lead"><MemberAvatars members={assignedMembers} emptyLabel="Lead"/><select aria-label="Assign subproject lead" value={defaultAssignees[0] || ""} onChange={(event) => onAssign(event.target.value ? [event.target.value] : [])} disabled={savingAssignees} className="h-full max-w-32 bg-transparent text-[11px] font-semibold text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><option value="">{savingAssignees ? "Saving…" : "Set lead"}</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
      <ProjectActionButton onClick={onRefresh} disabled={savingAssignees} label="Refresh subproject"><RefreshCw aria-hidden="true" className="h-4 w-4" /></ProjectActionButton>
      <ClickUpLink href={list.url || folderUrl} label="Open subproject in ClickUp" />    </>} />
    <SubprojectStatusCards folderId={folderId} listId={list.id} tasks={tasks} />
    <div role="tablist" aria-label={`${list.name} workspace views`} className="flex border-b border-slate-200">{tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)} className={`min-h-11 border-b-2 px-4 text-xs font-semibold ${view === tab.id ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-500 hover:text-[#003366]"}`}>{tab.label}</button>)}</div>
    {view === "tasks" ? tasks.length ? <section className="border border-slate-200 bg-white"><header className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-semibold text-[#003366]">Timeline</h2><p className="mt-0.5 text-[10px] text-slate-500">Phases, workstreams, and activities</p></div><span className="text-[10px] text-slate-500">{tasks.length} items</span></header><div className="p-3 sm:p-4"><TaskHierarchy tasks={tasks} /></div></section> : <div className="border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><h2 className="text-sm font-semibold text-[#003366]">No tasks in this subproject</h2><p className="mt-1 text-xs text-slate-600">Create tasks in ClickUp, then refresh this workspace.</p><button type="button" onClick={onRefresh} className="mt-3 min-h-10 border border-slate-300 px-3 text-xs font-semibold text-[#003366]">Refresh</button></div>
      : view === "calendar" ? <CalendarView tasks={tasks} lists={[list]} members={members} defaultAssignees={{ [list.id]: defaultAssignees }} onRefresh={onRefresh} />
         : scheduled.length ? <section className="border border-slate-200 bg-white"><header className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Schedule</h2><p className="mt-1 text-xs text-slate-500">Tasks with start or due dates in this subproject.</p></header>{scheduled.map((task) => { const start = new Date(task.startDate || task.dueDate!).getTime(); const end = new Date(task.dueDate || task.startDate!).getTime(); const left = Math.max(0, Math.min(100, ((Math.min(start, end) - minDate) / span) * 100)); const width = Math.max(2, Math.min(100 - left, (Math.max(86400000, Math.abs(end - start)) / span) * 100)); return <div key={task.id} className="grid min-h-14 grid-cols-1 items-center gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 sm:grid-cols-[minmax(150px,0.8fr)_minmax(180px,2fr)] sm:gap-3"><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#003366]">{task.name}</p><p className="mt-1 truncate text-[10px] text-slate-500">{formatDate(task.startDate || task.dueDate)} to {formatDate(task.dueDate || task.startDate)}</p></div><div className="relative h-5 bg-[#F7FAFC]"><span className={`absolute top-0 h-5 ${isComplete(task) ? "bg-emerald-600" : "bg-[#31577D]"}`} style={{ left: `${left}%`, width: `${width}%` }} /></div></div>; })}</section> : <div className="border border-dashed border-slate-300 bg-white px-5 py-10 text-center"><h2 className="text-sm font-semibold text-[#003366]">No scheduled tasks yet</h2><p className="mt-1 text-xs text-slate-600">Add a start or due date to a task to see it on this schedule.</p></div>}
  </section>;
}

function MemberAvatars({ members, emptyLabel }: { members: ProjectMember[]; emptyLabel: string }) {
  if (members.length === 0) return <span className="truncate text-[10px] text-slate-400">{emptyLabel}</span>;
  return <span className="flex items-center -space-x-2" aria-label={members.map((member) => member.name).join(", ")}>
    {members.slice(0, 5).map((member) => <span key={member.id} title={member.name} className="inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-[#E8EEF4] text-[9px] font-semibold text-[#003366] ring-1 ring-slate-200">{member.profilePicture ? <img src={member.profilePicture} alt={member.name} className="h-full w-full object-cover" /> : member.initials}</span>)}
    {members.length > 5 && <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[9px] font-semibold text-slate-600 ring-1 ring-slate-200">+{members.length - 5}</span>}
  </span>;
}

export function ProjectWorkspace() {
  const pathname = usePathname() || "/projects";
  const router = useRouter();
  const [data, setData] = useState<ProjectData | null>(null);
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectionLoaded, setSelectionLoaded] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [screen, setScreen] = useState<"gallery" | "project" | "subproject">("gallery");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [activeListId, setActiveListId] = useState("");
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingAssigneeListId, setSavingAssigneeListId] = useState<string | null>(null);
  const galleryRequest = useRef<Promise<ProjectCardData[]> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/projects/selection", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Project selection could not be loaded.");
        if (active) setSelectedProjectIds(Array.isArray(payload.folderIds) ? payload.folderIds.map(String) : []);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Project selection could not be loaded.");
      })
      .finally(() => { if (active) setSelectionLoaded(true); });
    return () => { active = false; };
  }, []);

  const fetchGallery = useCallback(async (force = false) => {
    if (force) galleryRequest.current = null;
    if (!galleryRequest.current) {
      galleryRequest.current = (async () => {
        const response = await fetch(`/api/tasks?action=project-gallery${force ? "&refresh=1" : ""}`, { cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Unable to load projects.");
        return (Array.isArray(payload.projects) ? payload.projects : []) as ProjectCardData[];
      })();
    }
    try {
      const loadedProjects = await galleryRequest.current;
      setProjects(loadedProjects);
      return loadedProjects;
    } catch (loadError) {
      galleryRequest.current = null;
      throw loadError;
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchGallery().then(() => { if (active) setError(null); })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load projects.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchGallery]);

  const fetchProject = useCallback(async (folderId: string, force = false): Promise<ProjectData> => {
    const response = await fetch(`/api/tasks?action=project-workspace&folderId=${encodeURIComponent(folderId)}${force ? "&refresh=1" : ""}`, { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load this project.");
    return payload as ProjectData;
  }, []);

  useEffect(() => {
    const segments = pathname.split("/").filter(Boolean).slice(1);
    if (pathname !== "/projects" && !pathname.startsWith("/projects/")) return;
    if (!selectionLoaded) return;
    if (segments.length === 0) {
      setScreen("gallery");
      setActiveFolderId("");
      setActiveListId("");
      setLoading(false);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setData(null);
    setScreen(segments.length > 1 ? "subproject" : "project");
    setView("overview");
    fetchGallery().then((allProjects) => {
      const project = matchRouteSegment(allProjects, segments[0]);
      if (!project || !selectedProjectIds.includes(project.id)) throw new Error("This folder is not included in the shared Projects list.");
      setActiveFolderId(project.id);
      return fetchProject(project.id).then((projectData) => ({ project, projectData }));
    }).then(({ projectData }) => {
      if (!active) return;
      setData(projectData);
      if (segments.length > 1) {
        const subproject = matchRouteSegment(projectData.lists, segments[1]);
        if (!subproject) {
          setError("This subproject could not be found in the selected project.");
          return;
        }
        setActiveListId(subproject.id);
        setScreen("subproject");
      } else {
        setActiveListId("");
        setScreen("project");
      }
    }).catch((loadError: unknown) => {
      if (!active) return;
      setError(loadError instanceof Error ? loadError.message : "Unable to load this project.");
      setScreen(segments.length > 1 ? "subproject" : "project");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathname, selectionLoaded, selectedProjectIds, fetchGallery, fetchProject]);

  const refreshGallery = () => {
    setLoading(true);
    setError(null);
    fetchGallery(true)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load projects."))
      .finally(() => setLoading(false));
  };

  const saveProjectSelection = async (folderIds: string[]) => {
    setSavingSelection(true);
    try {
      const response = await fetch("/api/projects/selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderIds }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Project selection could not be saved.");
      const savedIds = Array.isArray(payload.folderIds) ? payload.folderIds.map(String) : [];
      setSelectedProjectIds(savedIds);
      if (activeFolderId && !savedIds.includes(activeFolderId)) router.replace("/projects");
    } finally {
      setSavingSelection(false);
    }
  };

  const openProject = (project: ProjectCardData) => {
    router.push(`/projects/${routeSegment(project.name, project.id, projects)}`);
  };

  const refreshProject = () => {
    if (!activeFolderId) return refreshGallery();
    setLoading(true);
    setError(null);
    fetchProject(activeFolderId, true)
      .then(setData)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load this project."))
      .finally(() => setLoading(false));
  };

  const saveDefaultAssignees = async (listId: string, assigneeIds: string[]) => {
    if (!data) return;
    setSavingAssigneeListId(listId);
    setError(null);
    try {
      const response = await fetch("/api/projects/assignees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ listId, assigneeIds }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Default assignee could not be saved.");
      setData({ ...data, defaultAssignees: { ...data.defaultAssignees, [listId]: assigneeIds } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Default assignee could not be saved.");
    } finally {
      setSavingAssigneeListId(null);
    }
  };

  const returnToProjects = () => {
    router.push("/projects");
  };

  const openSubproject = (listId: string) => {
    const project = projects.find((item) => item.id === data?.folder.id);
    const list = data?.lists.find((item) => item.id === listId);
    if (!project || !list || !data) return;
    router.push(`/projects/${routeSegment(project.name, project.id, projects)}/${routeSegment(list.name, list.id, data.lists)}`);
  };

  const tasksByList = useMemo(() => {
    const groups = new Map<string, ProjectTask[]>();
    for (const list of data?.lists || []) groups.set(list.id, []);
    for (const task of data?.tasks || []) groups.get(task.listId)?.push(task);
    return groups;
  }, [data]);

  const tasks = data?.tasks || [];
  if (screen === "gallery") return <ProjectGallery projects={projects} selectedProjectIds={selectedProjectIds} loading={loading || !selectionLoaded} error={error} savingSelection={savingSelection} onRefresh={refreshGallery} onOpen={openProject} onSaveSelection={saveProjectSelection} />;

  const activeList = data?.lists.find((list) => list.id === activeListId);
  if (screen === "subproject") {
    if (data && activeList) return <SubprojectWorkspace folderId={data.folder.id} folderUrl={data.folder.url} list={activeList} tasks={tasksByList.get(activeList.id) || []} members={data.members} defaultAssignees={data.defaultAssignees[activeList.id] || []} onAssign={(ids) => void saveDefaultAssignees(activeList.id, ids)} savingAssignees={savingAssigneeListId === activeList.id} onBack={() => router.push(`/projects/${routeSegment(data.folder.name, data.folder.id, projects)}`)} onRefresh={refreshProject} />;
    return <section className="mx-auto w-full max-w-[1440px] space-y-3 pb-8"><LoadingSkeleton variant="subproject" /></section>;
  }

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-3 pb-8">
      <ProjectPageHeader eyebrow="Project workspace" title={data?.folder.name || "Project"} onBack={returnToProjects} actions={<>
        <ProjectActionButton onClick={refreshProject} disabled={loading} label="Refresh project"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></ProjectActionButton>
        <ClickUpLink href={data?.folder.url || PROJECT_URL} label="Open project in ClickUp" />
      </>} />
      <div role="tablist" aria-label={`${data?.folder.name || "Project"} workspace views`} className="flex border-b border-slate-200">
        {([{ id: "overview", label: "Overview" }, { id: "calendar", label: "Calendar" }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)} className={`inline-flex min-h-9 items-center gap-2 border-b-2 px-3 text-xs font-semibold ${view === tab.id ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-500 hover:text-[#003366]"}`}>{tab.id === "calendar" && <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" />}{tab.label}</button>)}
      </div>
      {loading && !data ? <LoadingSkeleton variant="project" />
        : error ? <div role="alert" className="border border-amber-300 bg-[#FFFCFB] p-6"><h2 className="text-sm font-semibold text-[#003366]">Project data could not be loaded</h2><p className="mt-2 text-sm leading-6 text-slate-700">{error}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={refreshProject} className="inline-flex min-h-11 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">Try again <RefreshCw aria-hidden="true" className="h-4 w-4" /></button><a href="/api/auth/login" className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-4 text-xs font-semibold text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Sign in with ClickUp <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a></div></div>
        : data && view === "overview" ? <section aria-label="Subprojects" className="border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Subprojects</h2><p className="mt-0.5 text-[11px] text-slate-500">Open a subproject workspace to see its tasks and team schedule.</p></div>
          <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.lists.map((list) => {
              const listTasks = tasksByList.get(list.id) || [];
              const listDone = listTasks.filter(isComplete).length;
              const listProgress = listTasks.length ? Math.round((listDone / listTasks.length) * 100) : 0;
              const lead = (data.defaultAssignees[list.id] || []).map((id) => data.members.find((member) => member.id === id)).find((member): member is ProjectMember => Boolean(member));
              return <article key={list.id} className="border border-slate-200 bg-white p-3 transition-colors hover:border-[#C9A84C]">
                <button type="button" onClick={() => openSubproject(list.id)} className="block w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">
                  <span className="flex items-start justify-between gap-2"><span className="text-sm font-semibold text-[#003366]">{list.name}</span><span className="shrink-0 text-[10px] text-slate-500">{listTasks.length} tasks</span></span>
                  <span className="mt-2 block h-1.5 bg-slate-100"><span className="block h-full bg-[#C9A84C]" style={{ width: `${listProgress}%` }} /></span>
                  <span className="mt-2 block text-[10px] text-slate-500">{listProgress}% complete</span>
                </button>
                <div className="mt-3 flex min-w-0 items-center justify-between gap-2 border-t border-slate-100 pt-2">{lead ? <span className="flex min-w-0 items-center gap-2"><MemberAvatars members={[lead]} emptyLabel=""/><span className="truncate text-xs text-slate-700">{lead.name}</span></span> : <span className="truncate text-xs text-slate-400">Unassigned</span>}<button type="button" onClick={() => openSubproject(list.id)} className="inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold text-[#31577D] hover:text-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Open workspace <ArrowUpRight className="h-3 w-3" /></button></div>
              </article>;
            })}
          </div>
          {data.lists.length === 0 && <p className="p-5 text-sm text-slate-600">No subprojects are included in this project yet.</p>}
        </section>
          : data && view === "calendar" ? <CalendarView tasks={tasks} lists={data.lists} members={data.members} defaultAssignees={data.defaultAssignees} onRefresh={refreshProject} /> : null}
    </section>
  );
}

function Metric({ label, value, icon, progress }: { label: string; value: string; icon: ReactNode; progress?: number | null }) {
  return <div className="border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon}{label}</div><p className="mt-3 text-2xl font-semibold tabular-nums text-[#003366]">{value}</p>{progress !== undefined && <div className="mt-3 h-1.5 bg-slate-100"><div className="h-full bg-[#C9A84C] transition-[width]" style={{ width: `${progress}%` }} /></div>}</div>;
}
