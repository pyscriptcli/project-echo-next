"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FolderKanban,
  ListTodo,
  LoaderCircle,
  RefreshCw,
  Users,
} from "lucide-react";

const PROJECT_URL = "https://app.clickup.com/9014981136/v/o/f/901414174663";
type View = "overview" | "tasks" | "calendar" | "gantt";

interface ProjectList {
  id: string;
  name: string;
  taskCount: number;
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
  assignees: Array<{ id: string; name: string; initials: string }>;
}

interface ProjectData {
  folder: { id: string; name: string; url: string; spaceName: string };
  lists: ProjectList[];
  tasks: ProjectTask[];
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

function CalendarView({ tasks }: { tasks: ProjectTask[] }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const today = dateKey(new Date());
  const dayCells = Array.from({ length: Math.ceil((firstWeekday + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstWeekday + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const tasksByDate = new Map<string, ProjectTask[]>();
  tasks.forEach((task) => {
    const date = task.dueDate || task.startDate;
    if (!date) return;
    const key = date.slice(0, 10);
    tasksByDate.set(key, [...(tasksByDate.get(key) || []), task]);
  });
  const monthLabel = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(month);
  const monthPrefix = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
  const scheduledThisMonth = tasks.filter((task) => (task.dueDate || task.startDate)?.startsWith(monthPrefix)).length;

  return <section className="border border-slate-200 bg-white" aria-label="Project calendar">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
      <div><h2 className="text-sm font-semibold text-[#003366]">Team schedule</h2><p className="mt-1 text-xs text-slate-500">Tasks appear on their due date, or start date when no due date is set.</p></div>
      <div className="flex items-center gap-2">
        <span className="mr-2 hidden text-xs text-slate-500 sm:inline">{scheduledThisMonth} scheduled</span>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 text-sm text-[#003366] hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
        <button type="button" onClick={() => setMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} className="min-h-9 border border-slate-300 px-3 text-xs font-semibold text-[#003366] hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Today</button>
        <button type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 text-sm text-[#003366] hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
      </div>
    </header>
    <div className="border-b border-slate-100 px-4 py-3 text-base font-semibold text-[#003366]">{monthLabel}</div>
    <div role="grid" aria-label={monthLabel}>
      <div role="row" className="grid grid-cols-7 border-b border-slate-200 bg-[#F7FAFC]">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} role="columnheader" className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:px-3">{day}</div>)}</div>
      {Array.from({ length: dayCells.length / 7 }, (_, weekIndex) => <div key={weekIndex} role="row" className="grid grid-cols-7">{dayCells.slice(weekIndex * 7, weekIndex * 7 + 7).map((day, dayIndex) => {
        const index = weekIndex * 7 + dayIndex;
        const key = day ? `${monthPrefix}-${String(day).padStart(2, "0")}` : `blank-${index}`;
        const dayTasks = day ? (tasksByDate.get(key) || []) : [];
        return <div key={key} role="gridcell" aria-label={day ? `${monthLabel} ${day}${dayTasks.length ? `, ${dayTasks.length} scheduled tasks` : ""}` : undefined} className={`min-h-28 border-b border-r border-slate-100 p-1 sm:min-h-36 sm:p-2 ${day ? "bg-white" : "bg-[#F7FAFC]"}`}>
          {day && <>
            <div className={`mb-1 inline-flex h-7 min-w-7 items-center justify-center px-1 text-xs ${key === today ? "bg-[#003366] font-semibold text-white" : "text-slate-600"}`}>{day}</div>
            <div className="space-y-1">
              {dayTasks.slice(0, 3).map((task) => {
                const taskLabel = `${task.name} · ${owners(task)}`;
                const eventClass = `block w-full truncate border-l-2 px-1 py-1 text-left text-[10px] leading-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366] ${isComplete(task) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-[#C9A84C] bg-[#FBF7E9] text-[#003366]"}`;
                return task.url
                  ? <a key={task.id} href={task.url} target="_blank" rel="noreferrer" title={taskLabel} className={eventClass}>{task.name}<span className="hidden sm:inline"> · {task.assignees.map((person) => person.name).join(", ") || "Unassigned"}</span></a>
                  : <div key={task.id} title={taskLabel} className={eventClass}>{task.name}<span className="hidden sm:inline"> · {task.assignees.map((person) => person.name).join(", ") || "Unassigned"}</span></div>;
              })}
              {dayTasks.length > 3 && <p className="px-1 text-[10px] font-semibold text-slate-500">+{dayTasks.length - 3} more</p>}
            </div>
          </>}
        </div>;
      })}</div>)}
    </div>
    <footer className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 text-[10px] text-slate-500"><span className="font-semibold uppercase tracking-wide text-slate-600">{scheduledThisMonth} task{scheduledThisMonth === 1 ? "" : "s"} this month</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-[#C9A84C]" />Open</span><span className="inline-flex items-center gap-2"><span className="h-2 w-2 bg-emerald-600" />Complete</span></footer>
  </section>;
}

function EmptyState({ view, hasLists }: { view: View; hasLists: boolean }) {
  const message = view === "gantt"
    ? ["No scheduled work to chart yet", "Add start or due dates to tasks in ClickUp. The Gantt view will appear when schedule data exists."]
    : [hasLists ? "No tasks in this project yet" : "No lists in this folder yet", "Add lists and tasks in ClickUp, then refresh this page to see them in the project workspace."];

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

function TaskRow({ task }: { task: ProjectTask }) {
  const content = <>
    <span className="min-w-0 flex-1">
      <span className={`block truncate text-sm font-semibold ${task.parentId ? "pl-5 text-slate-700" : "text-[#003366]"}`}>
        {task.parentId && <span aria-hidden="true" className="mr-2 text-slate-400">↳</span>}{task.name}
      </span>
      <span className="mt-1 block truncate text-[11px] text-slate-500">{owners(task)}</span>
    </span>
    <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusStyle(task)}`}>{task.status}</span>
    <span className="hidden w-32 shrink-0 text-right text-xs text-slate-600 sm:block">{formatDate(task.dueDate)}</span>
  </>;

  return task.url ? (
    <a href={task.url} target="_blank" rel="noreferrer" className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">
      {content}<ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
    </a>
  ) : <div className="flex min-h-16 items-center gap-3 border-b border-slate-100 px-4 py-3">{content}</div>;
}

export function ProjectWorkspace() {
  const [data, setData] = useState<ProjectData | null>(null);
  const [view, setView] = useState<View>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async (): Promise<ProjectData> => {
    const response = await fetch("/api/tasks?action=project-workspace", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Unable to load this project.");
    return payload as ProjectData;
  }, []);

  useEffect(() => {
    let active = true;
    fetchProject()
      .then((project) => {
        if (!active) return;
        setData(project);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load this project.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchProject]);

  const refreshProject = () => {
    setLoading(true);
    setError(null);
    fetchProject()
      .then(setData)
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Unable to load this project."))
      .finally(() => setLoading(false));
  };

  const tasksByList = useMemo(() => {
    const groups = new Map<string, ProjectTask[]>();
    for (const list of data?.lists || []) groups.set(list.id, []);
    for (const task of data?.tasks || []) groups.get(task.listId)?.push(task);
    return groups;
  }, [data]);

  const tasks = data?.tasks || [];
  const completed = tasks.filter(isComplete).length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : null;
  const upcoming = tasks.filter((task) => task.dueDate && !isComplete(task)).slice().sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()).slice(0, 5);
  const scheduled = tasks.filter((task) => task.startDate || task.dueDate);
  const bounds = useMemo(() => {
    const values = scheduled.flatMap((task) => [task.startDate, task.dueDate]).filter((value): value is string => Boolean(value)).map((value) => new Date(value).getTime()).filter(Number.isFinite);
    if (!values.length) return null;
    const day = 24 * 60 * 60 * 1000;
    return { start: Math.min(...values) - day * 2, end: Math.max(...values) + day * 5 };
  }, [scheduled]);

  const views: Array<{ id: View; label: string; icon: typeof FolderKanban }> = [
    { id: "overview", label: "Overview", icon: FolderKanban },
    { id: "tasks", label: "Tasks", icon: ListTodo },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "gantt", label: "Gantt", icon: CalendarDays },
  ];

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-10">
      <header className="flex flex-col justify-between gap-4 border-b border-[#003366]/15 pb-5 md:flex-row md:items-end">
        <div className="border-l-4 border-[#C9A84C] pl-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#31577D]">Project workspace</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#003366]">{data?.folder.name || "Project"}</h1>
          <p className="mt-1 text-xs text-slate-600">{data?.folder.spaceName ? `${data.folder.spaceName} / ` : ""}{data?.folder.name || "ClickUp project folder"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={refreshProject} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-[#003366] transition-colors hover:border-[#003366] disabled:cursor-wait disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <a href={data?.folder.url || PROJECT_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">Open in ClickUp <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a>
        </div>
      </header>

      <div role="tablist" aria-label="Project views" className="flex flex-wrap border-b border-slate-200">
        {views.map(({ id, label, icon: Icon }) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366] ${view === id ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-500 hover:text-[#003366]"}`}><Icon aria-hidden="true" className="h-4 w-4" />{label}</button>)}
      </div>

      {loading && !data ? <div role="status" className="flex min-h-72 items-center justify-center gap-3 border border-slate-200 bg-white text-sm text-slate-600"><LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-[#003366]" />Loading project from ClickUp…</div>
        : error ? <div role="alert" className="border border-amber-300 bg-[#FFFCFB] p-6"><h2 className="text-sm font-semibold text-[#003366]">Project data could not be loaded</h2><p className="mt-2 text-sm leading-6 text-slate-700">{error}</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={refreshProject} className="inline-flex min-h-11 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C]">Try again <RefreshCw aria-hidden="true" className="h-4 w-4" /></button><a href="/api/auth/login" className="inline-flex min-h-11 items-center gap-2 border border-slate-300 bg-white px-4 text-xs font-semibold text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">Sign in with ClickUp <ArrowUpRight aria-hidden="true" className="h-4 w-4" /></a></div></div>
        : data && tasks.length === 0 && view === "overview" ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div className="border border-slate-200 bg-white p-5 md:p-7"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#31577D]">{data.lists.length ? "Project structure" : "Getting started"}</p><h2 className="mt-2 text-lg font-semibold text-[#003366]">No tasks are in this project yet</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Add tasks and milestone dates in ClickUp. Project Echo will bring the work into this focused overview and Gantt view.</p>{data.lists.length > 0 && <div className="mt-6 border-t border-slate-100 pt-4"><h3 className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Lists in this folder</h3><ul className="mt-3 space-y-2">{data.lists.map((list) => <li key={list.id} className="flex min-h-10 items-center justify-between border-l-2 border-[#C9A84C] bg-[#F7FAFC] px-3 text-sm text-[#003366]"><span>{list.name}</span><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">No tasks</span></li>)}</ul></div>}</div>
          <aside className="flex flex-col justify-between border border-[#C9A84C]/50 bg-[#FBF7E9] p-5 md:p-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#725900]">Connected source</p><p className="mt-2 text-sm font-semibold text-[#003366]">ClickUp folder · {data.folder.name}</p><p className="mt-2 text-xs leading-5 text-slate-700">Work added to this folder stays in ClickUp and appears here after refresh.</p></div><a href={data.folder.url} target="_blank" rel="noreferrer" className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 border border-[#003366] bg-white px-4 text-xs font-semibold text-[#003366] transition-colors hover:bg-[#003366] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003366]">Open the project folder <ExternalLink aria-hidden="true" className="h-4 w-4" /></a></aside>
        </div>
        : data && tasks.length === 0 && view !== "calendar" ? <EmptyState view={view} hasLists={data.lists.length > 0} />
          : data && view === "overview" ? <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Work items" value={String(tasks.length)} icon={<ListTodo aria-hidden="true" className="h-4 w-4 text-[#31577D]" />} />
              <Metric label="Completed" value={`${completed} / ${tasks.length}`} icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4 text-emerald-700" />} />
              <Metric label="Progress" value={`${progress}%`} icon={<span aria-hidden="true" className="h-2 w-2 bg-[#C9A84C]" />} progress={progress} />
              <Metric label="Subprojects" value={String(data.lists.length)} icon={<Users aria-hidden="true" className="h-4 w-4 text-[#31577D]" />} />
            </div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
              <section className="border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-semibold text-[#003366]">Subprojects</h2><p className="mt-0.5 text-[11px] text-slate-500">Each ClickUp list appears here as a subproject.</p></div><button type="button" onClick={() => setView("tasks")} className="min-h-10 px-2 text-[11px] font-semibold text-[#003366] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]">View tasks</button></div>{data.lists.map((list) => { const listTasks = tasksByList.get(list.id) || []; const listDone = listTasks.filter(isComplete).length; const listProgress = listTasks.length ? Math.round((listDone / listTasks.length) * 100) : 0; return <div key={list.id} className="border-b border-slate-100 px-4 py-4 last:border-b-0"><div className="flex items-start justify-between gap-3"><h3 className="text-sm font-semibold text-[#003366]">{list.name}</h3><span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{listTasks.length} items</span></div><div className="mt-3 flex items-center gap-3"><div className="h-1.5 flex-1 bg-slate-100"><div className="h-full bg-[#C9A84C]" style={{ width: `${listProgress}%` }} /></div><span className="w-10 text-right text-xs tabular-nums text-slate-600">{listProgress}%</span></div></div>; })}{data.lists.length === 0 && <p className="p-5 text-sm text-slate-600">No lists are in this folder yet.</p>}</section>
              <section className="border border-slate-200 bg-white"><div className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Next due</h2><p className="mt-0.5 text-[11px] text-slate-500">Upcoming work with a due date.</p></div>{upcoming.length ? upcoming.map((task) => <div key={task.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0 text-[#A98611]" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#003366]">{task.name}</span><span className="mt-1 block truncate text-[11px] text-slate-500">{owners(task)}</span></span><span className="shrink-0 text-xs text-slate-600">{formatDate(task.dueDate)}</span></div>) : <p className="p-5 text-sm text-slate-600">No upcoming due dates have been set.</p>}</section>
            </div>
          </div>
            : data && view === "tasks" ? <div className="space-y-4">{data.lists.map((list) => { const listTasks = tasksByList.get(list.id) || []; return <section key={list.id} className="border border-slate-200 bg-white"><header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-[#F7FAFC] px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">{list.name}</h2><span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{listTasks.length} items</span></header>{listTasks.length ? listTasks.map((task) => <TaskRow key={task.id} task={task} />) : <p className="px-4 py-5 text-sm text-slate-600">No tasks in this list yet.</p>}</section>; })}{data.lists.length === 0 && <EmptyState view="tasks" hasLists={false} />}</div>
              : data && view === "calendar" ? <CalendarView tasks={tasks} />
                : data && view === "gantt" ? <section className="border border-slate-200 bg-white"><header className="border-b border-slate-200 px-4 py-4"><h2 className="text-sm font-semibold text-[#003366]">Project schedule</h2><p className="mt-1 text-xs text-slate-500">Task dates from the ClickUp lists in this folder.</p></header>{scheduled.length && bounds ? <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-[minmax(190px,0.8fr)_minmax(520px,2fr)] border-b border-slate-200 bg-[#F7FAFC] text-[10px] font-semibold uppercase tracking-wide text-slate-500"><div className="px-4 py-3">Work item</div><div className="grid grid-cols-5 px-2 py-3">{Array.from({ length: 5 }, (_, index) => { const tick = bounds.start + ((bounds.end - bounds.start) * index) / 4; return <span key={index}>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(tick))}</span>; })}</div></div>{data.lists.map((list) => { const listTasks = (tasksByList.get(list.id) || []).filter((task) => task.startDate || task.dueDate); if (!listTasks.length) return null; return <div key={list.id}><h3 className="border-b border-slate-100 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-[#31577D]">{list.name}</h3>{listTasks.map((task) => { const start = new Date(task.startDate || task.dueDate!).getTime(); const end = new Date(task.dueDate || task.startDate!).getTime(); const span = Math.max(1, bounds.end - bounds.start); const left = Math.max(0, Math.min(100, ((Math.min(start, end) - bounds.start) / span) * 100)); const width = Math.max(1.5, Math.min(100 - left, (Math.max(24 * 60 * 60 * 1000, Math.abs(end - start)) / span) * 100)); return <div key={task.id} className="grid min-h-12 grid-cols-[minmax(190px,0.8fr)_minmax(520px,2fr)] border-b border-slate-100 last:border-b-0"><div className="flex min-w-0 flex-col justify-center px-4 py-2"><span className="truncate text-xs font-semibold text-[#003366]">{task.name}</span><span className="mt-1 truncate text-[10px] text-slate-500">{owners(task)}</span></div><div className="relative flex items-center border-l border-slate-100 bg-[linear-gradient(to_right,transparent_calc(20%-1px),#e2e8f0_calc(20%-1px),#e2e8f0_20%,transparent_20%,transparent_calc(40%-1px),#e2e8f0_calc(40%-1px),#e2e8f0_40%,transparent_40%,transparent_calc(60%-1px),#e2e8f0_calc(60%-1px),#e2e8f0_60%,transparent_60%,transparent_calc(80%-1px),#e2e8f0_calc(80%-1px),#e2e8f0_80%,transparent_80%)] px-2"><div title={`${task.name}: ${formatDate(task.startDate || task.dueDate)} to ${formatDate(task.dueDate || task.startDate)}`} className={`h-5 border ${isComplete(task) ? "border-emerald-700 bg-emerald-600" : "border-[#31577D] bg-[#31577D]"}`} style={{ marginLeft: `${left}%`, width: `${width}%` }} /></div></div>; })}</div>; })}</div></div> : <EmptyState view="gantt" hasLists={data.lists.length > 0} />}{tasks.length > scheduled.length && <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600">{tasks.length - scheduled.length} work item{tasks.length - scheduled.length === 1 ? " has" : "s have"} no start or due date and {tasks.length - scheduled.length === 1 ? "is" : "are"} not shown on the timeline.</p>}</section> : null}
    </section>
  );
}

function Metric({ label, value, icon, progress }: { label: string; value: string; icon: ReactNode; progress?: number | null }) {
  return <div className="border border-slate-200 bg-white p-4"><div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">{icon}{label}</div><p className="mt-3 text-2xl font-semibold tabular-nums text-[#003366]">{value}</p>{progress !== undefined && <div className="mt-3 h-1.5 bg-slate-100"><div className="h-full bg-[#C9A84C] transition-[width]" style={{ width: `${progress}%` }} /></div>}</div>;
}
