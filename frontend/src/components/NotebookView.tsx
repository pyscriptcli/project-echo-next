"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";

type CategoryKey = "client" | "admin" | "adhoc" | "meetings";

interface NotebookMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  profilePicture: string | null;
  months?: string[];
}

interface NotebookEntry {
  id: string;
  name: string;
  date: string;
  url: string;
  member: NotebookMember;
  categories: Record<CategoryKey, string>;
  hasContent: boolean;
}

interface NotebookPayload {
  listId: string;
  entries: NotebookEntry[];
  members: NotebookMember[];
  fetchedAt: string;
}

const CATEGORY_META: Array<{ key: CategoryKey; label: string }> = [
  { key: "client", label: "Client" },
  { key: "admin", label: "Admin" },
  { key: "adhoc", label: "Ad hoc" },
  { key: "meetings", label: "Meetings" },
];

function localIso(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return fromIso(value).toLocaleDateString("en-US", options || {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function shiftDate(value: string, days: number) {
  const date = fromIso(value);
  date.setDate(date.getDate() + days);
  return localIso(date);
}

function startOfWeek(value: string) {
  const date = fromIso(value);
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay();
  date.setDate(date.getDate() + offset);
  return localIso(date);
}

function itemsFromText(value: string) {
  const cleaned = value.replace(/\r/g, "").trim();
  if (!cleaned) return [];
  const lines = cleaned.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.map((line) => line.replace(/^[•●▪◦*-]\s*/, "").replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
}

function monthWorkdays(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  if (month > currentMonth) return [];
  const limit = month === currentMonth ? Math.min(today.getDate(), lastDay) : lastDay;
  const days: string[] = [];
  for (let day = 1; day <= limit; day += 1) {
    const date = new Date(year, monthNumber - 1, day);
    if (date.getDay() !== 0 && date.getDay() !== 6) days.push(localIso(date));
  }
  return days;
}

function MemberAvatar({ member }: { member: NotebookMember }) {
  if (member.profilePicture) {
    return <img src={member.profilePicture} alt="" className="w-8 h-8 object-cover border border-[#C9AB4C]/60 shrink-0" />;
  }
  return (
    <span className="w-8 h-8 bg-[#003366] text-white flex items-center justify-center text-xs font-bold shrink-0">
      {member.initials || member.name.slice(0, 2).toUpperCase()}
    </span>
  );
}

export function NotebookView({ currentUserName }: { currentUserName?: string }) {
  const today = localIso(new Date());
  const [activeTab, setActiveTab] = useState<"today" | "week" | "insights">("today");
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedMonth, setSelectedMonth] = useState(today.slice(0, 7));
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [payload, setPayload] = useState<NotebookPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadNotebook = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/notebook", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to load the daily log.");
      setPayload(body);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load the daily log.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotebook(); }, []);

  useEffect(() => {
    if (!payload?.members.length || selectedMemberId) return;
    const current = currentUserName?.toLowerCase().trim();
    const matched = payload.members.find((member) => member.name.toLowerCase().trim() === current);
    setSelectedMemberId((matched || payload.members[0]).id);
  }, [payload, selectedMemberId, currentUserName]);

  const member = payload?.members.find((item) => item.id === selectedMemberId) || payload?.members[0];
  const entries = payload?.entries || [];

  const selectedDayEntries = useMemo(
    () => entries.filter((entry) => entry.date === selectedDate && entry.member.id === member?.id),
    [entries, selectedDate, member?.id],
  );

  const weekStart = startOfWeek(selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => shiftDate(weekStart, index)), [weekStart]);
  const workdays = useMemo(() => monthWorkdays(selectedMonth), [selectedMonth]);

  const completenessRows = useMemo(() => (payload?.members || []).map((person) => {
    const personEntries = entries.filter((entry) => entry.member.id === person.id && entry.date.startsWith(`${selectedMonth}-`));
    const byDate = new Map<string, NotebookEntry[]>();
    personEntries.forEach((entry) => byDate.set(entry.date, [...(byDate.get(entry.date) || []), entry]));
    const submittedDates = workdays.filter((date) => (byDate.get(date) || []).some((entry) => entry.hasContent));
    const emptyDates = workdays.filter((date) => byDate.has(date) && !(byDate.get(date) || []).some((entry) => entry.hasContent));
    const missingDates = workdays.filter((date) => !byDate.has(date));
    return {
      member: person,
      submittedDates,
      emptyDates,
      missingDates,
      percent: workdays.length ? Math.round((submittedDates.length / workdays.length) * 100) : 0,
      byDate,
    };
  }), [payload?.members, entries, selectedMonth, workdays]);

  const activeRows = completenessRows.filter((row) =>
    row.member.months?.includes(selectedMonth) ||
    row.byDate.size > 0 ||
    entries.some((entry) => entry.member.id === row.member.id && entry.date.startsWith(`${selectedMonth}-`)),
  );
  const displayedRows = activeRows.length ? activeRows : completenessRows;
  const expectedLogs = workdays.length * displayedRows.length;
  const submittedLogs = displayedRows.reduce((sum, row) => sum + row.submittedDates.length, 0);
  const emptyLogs = displayedRows.reduce((sum, row) => sum + row.emptyDates.length, 0);
  const missingLogs = displayedRows.reduce((sum, row) => sum + row.missingDates.length, 0);
  const averageCompleteness = expectedLogs ? Math.round((submittedLogs / expectedLogs) * 100) : 0;

  const monthCategoryTotals = CATEGORY_META.map((category) => ({
    ...category,
    count: entries
      .filter((entry) => entry.date.startsWith(`${selectedMonth}-`))
      .reduce((sum, entry) => sum + itemsFromText(entry.categories[category.key]).length, 0),
  }));
  const maxCategoryTotal = Math.max(1, ...monthCategoryTotals.map((category) => category.count));

  const previousDay = () => setSelectedDate((value) => shiftDate(value, -1));
  const nextDay = () => setSelectedDate((value) => shiftDate(value, 1));

  if (loading && !payload) {
    return (
      <div className="min-h-[460px] flex items-center justify-center text-[#003366]">
        <div className="flex items-center gap-3 text-sm font-semibold"><Loader2 className="animate-spin" size={20} /> Loading team notebook…</div>
      </div>
    );
  }

  if (error && !payload) {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-white border border-red-200 p-7 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={26} />
        <h1 className="text-xl">Notebook unavailable</h1>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <button type="button" onClick={loadNotebook} className="btn-outline mt-5 inline-flex items-center gap-2"><RefreshCw size={14} /> Try again</button>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-gray-200/90">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-serif font-bold text-[#003366] italic">Work Notebook</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1">ClickUp Live</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Daily activity and team logging completeness from the KPI Monitoring list.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab !== "insights" && payload && payload.members.length > 0 && (
            <select
              value={member?.id || ""}
              onChange={(event) => setSelectedMemberId(event.target.value)}
              aria-label="Team member"
              className="h-10 min-w-52 bg-white border border-gray-300 px-3 text-sm text-[#1b1d1e] focus:outline-none focus:border-[#C9AB4C]"
            >
              {payload.members.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          )}
          <button
            type="button"
            onClick={loadNotebook}
            disabled={loading}
            className="h-10 px-3 bg-white border border-gray-300 text-[#003366] text-sm font-semibold flex items-center gap-2 hover:border-[#C9AB4C] disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex border border-gray-300 bg-white" role="tablist" aria-label="Notebook views">
          {([
            ["today", "Today"],
            ["week", "Week"],
            ["insights", "Insights"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => setActiveTab(id)}
              className={`h-10 px-5 text-sm font-semibold border-r last:border-r-0 border-gray-200 transition-colors ${
                activeTab === id ? "bg-[#003366] text-white shadow-[inset_0_-2px_0_#C9AB4C]" : "text-gray-500 hover:text-[#003366] hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "insights" ? (
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            Reporting month
            <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 bg-white border border-gray-300 px-3 text-sm focus:outline-none focus:border-[#C9AB4C]" />
          </label>
        ) : (
          <div className="flex items-center bg-white border border-gray-300">
            <button type="button" onClick={previousDay} aria-label="Previous day" className="w-10 h-10 grid place-items-center text-gray-500 hover:text-[#003366] hover:bg-gray-50"><ChevronLeft size={17} /></button>
            <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="h-10 border-x border-y-0 border-gray-300 px-3 text-sm text-[#1b1d1e] focus:outline-none" />
            <button type="button" onClick={nextDay} aria-label="Next day" className="w-10 h-10 grid place-items-center text-gray-500 hover:text-[#003366] hover:bg-gray-50"><ChevronRight size={17} /></button>
          </div>
        )}
      </div>

      {error && <div className="border border-amber-200 bg-amber-50 text-amber-800 px-4 py-3 text-sm">Showing the last loaded data. Refresh failed: {error}</div>}

      {activeTab === "today" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CATEGORY_META.map((category) => {
              const count = selectedDayEntries.reduce((sum, entry) => sum + itemsFromText(entry.categories[category.key]).length, 0);
              return (
                <div key={category.key} className="bg-white border border-gray-200 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500">{category.label}</div>
                  <div className="text-3xl font-serif font-bold text-[#003366] mt-2">{count}</div>
                  <div className="text-xs text-gray-400 mt-1">recorded item{count === 1 ? "" : "s"}</div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-8">
              <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                  <h2 className="text-xl">{formatDate(selectedDate)}</h2>
                  <p className="text-sm text-gray-500 mt-1">{member?.name || "Team member"}</p>
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 border ${selectedDayEntries.some((entry) => entry.hasContent) ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-amber-700 bg-amber-50 border-amber-200"}`}>
                  {selectedDayEntries.some((entry) => entry.hasContent) ? "Log submitted" : "No completed log"}
                </span>
              </div>

              <div className="bg-white border border-gray-200 divide-y divide-gray-200">
                {CATEGORY_META.map((category) => {
                  const categoryItems = selectedDayEntries.flatMap((entry) => itemsFromText(entry.categories[category.key]));
                  return (
                    <div key={category.key} className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 p-4 sm:p-5">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#003366] pt-0.5">{category.label}</div>
                      {categoryItems.length ? (
                        <ul className="space-y-2">
                          {categoryItems.map((item, index) => (
                            <li key={`${item}-${index}`} className="text-sm text-gray-700 leading-relaxed flex gap-2.5">
                              <Check size={15} className="text-[#C9AB4C] shrink-0 mt-0.5" /> <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      ) : <span className="text-sm text-gray-400 italic">No activity recorded</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="lg:col-span-4 space-y-4">
              <div className="bg-white border border-gray-200 p-5">
                <h3 className="text-lg flex items-center gap-2"><FileText size={17} className="text-[#C9AB4C]" /> Source record</h3>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">This notebook is a read-only view. Your team can continue using the existing ClickUp format.</p>
                {selectedDayEntries[0]?.url ? (
                  <a href={selectedDayEntries[0].url} target="_blank" rel="noreferrer" className="mt-4 btn-outline !px-4 !py-2 inline-flex items-center gap-2">
                    Open daily log <ExternalLink size={14} />
                  </a>
                ) : <p className="text-xs text-gray-400 mt-4">No ClickUp record exists for this date.</p>}
              </div>
              <div className="bg-[#1b1d1e] border border-[#C9AB4C]/50 p-5 text-white">
                <div className="text-xs uppercase tracking-widest text-[#C9AB4C] font-bold">Daily completeness</div>
                <div className="text-3xl font-serif mt-3">{selectedDayEntries.some((entry) => entry.hasContent) ? "Complete" : selectedDayEntries.length ? "Empty" : "Missing"}</div>
                <p className="text-sm text-gray-300 mt-2">A day is complete when at least one existing work category contains an entry.</p>
              </div>
            </aside>
          </div>
        </div>
      )}

      {activeTab === "week" && (
        <div>
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl">Week of {formatDate(weekStart, { month: "long", day: "numeric", year: "numeric" })}</h2>
              <p className="text-sm text-gray-500 mt-1">{member?.name || "Team member"} · daily activity overview</p>
            </div>
            <span className="text-sm text-gray-500">{weekDays.filter((date) => entries.some((entry) => entry.member.id === member?.id && entry.date === date && entry.hasContent)).length} days logged</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {weekDays.map((date) => {
              const dayEntries = entries.filter((entry) => entry.member.id === member?.id && entry.date === date);
              const total = CATEGORY_META.reduce((sum, category) => sum + dayEntries.reduce((count, entry) => count + itemsFromText(entry.categories[category.key]).length, 0), 0);
              const isWeekend = [0, 6].includes(fromIso(date).getDay());
              return (
                <button
                  type="button"
                  key={date}
                  onClick={() => { setSelectedDate(date); setActiveTab("today"); }}
                  className={`text-left bg-white border p-4 min-h-48 transition-colors hover:border-[#C9AB4C] ${date === selectedDate ? "border-[#C9AB4C] shadow-[inset_0_2px_0_#C9AB4C]" : "border-gray-200"}`}
                >
                  <div className="text-xs uppercase tracking-wider text-gray-500 font-bold">{formatDate(date, { weekday: "short" })}</div>
                  <div className="text-2xl font-serif font-bold text-[#003366] mt-1">{fromIso(date).getDate()}</div>
                  {total ? (
                    <div className="mt-4 space-y-2">
                      {CATEGORY_META.map((category) => {
                        const count = dayEntries.reduce((sum, entry) => sum + itemsFromText(entry.categories[category.key]).length, 0);
                        return count ? <div key={category.key} className="flex justify-between text-xs text-gray-600"><span>{category.label}</span><strong className="text-[#003366]">{count}</strong></div> : null;
                      })}
                    </div>
                  ) : <div className="mt-5 text-xs text-gray-400 italic">{isWeekend ? "Weekend" : dayEntries.length ? "Empty log" : "No log"}</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "insights" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-xl">{monthLabel(selectedMonth)} completeness</h2>
            <p className="text-sm text-gray-500 mt-1">Elapsed weekdays only. Weekends and future dates are excluded.</p>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="bg-white border border-gray-200 p-5"><div className="text-xs uppercase tracking-wider font-bold text-gray-500">Team completeness</div><div className="text-3xl font-serif font-bold text-[#003366] mt-2">{averageCompleteness}%</div><div className="text-xs text-gray-400 mt-1">{submittedLogs} of {expectedLogs} expected logs</div></div>
            <div className="bg-white border border-gray-200 p-5"><div className="text-xs uppercase tracking-wider font-bold text-gray-500">Members tracked</div><div className="text-3xl font-serif font-bold text-[#003366] mt-2">{displayedRows.length}</div><div className="text-xs text-gray-400 mt-1">with monthly log coverage</div></div>
            <div className="bg-white border border-gray-200 p-5"><div className="text-xs uppercase tracking-wider font-bold text-gray-500">Empty records</div><div className="text-3xl font-serif font-bold text-amber-700 mt-2">{emptyLogs}</div><div className="text-xs text-gray-400 mt-1">created but without content</div></div>
            <div className="bg-white border border-gray-200 p-5"><div className="text-xs uppercase tracking-wider font-bold text-gray-500">Missing logs</div><div className="text-3xl font-serif font-bold text-red-700 mt-2">{missingLogs}</div><div className="text-xs text-gray-400 mt-1">no daily record found</div></div>
          </div>

          <section className="bg-white border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div><h3 className="text-lg flex items-center gap-2"><Users size={18} className="text-[#C9AB4C]" /> Completeness by team member</h3><p className="text-sm text-gray-500 mt-1">Submitted logs compared with elapsed working days.</p></div>
              <div className="text-xs text-gray-500">Expected per member: <strong className="text-[#003366]">{workdays.length} days</strong></div>
            </div>
            <div className="divide-y divide-gray-200">
              {displayedRows.map((row) => (
                <div key={row.member.id} className="p-4 md:p-5 grid grid-cols-1 md:grid-cols-[minmax(190px,1fr)_minmax(220px,2fr)_100px] gap-4 items-center">
                  <div className="flex items-center gap-3 min-w-0"><MemberAvatar member={row.member} /><div className="min-w-0"><div className="text-sm font-semibold text-[#1b1d1e] truncate">{row.member.name}</div><div className="text-xs text-gray-400">{row.submittedDates.length} submitted · {row.missingDates.length} missing</div></div></div>
                  <div>
                    <div className="h-2.5 bg-gray-100 overflow-hidden flex" role="progressbar" aria-label={`${row.member.name} completeness`} aria-valuenow={row.percent} aria-valuemin={0} aria-valuemax={100}>
                      <span className="bg-[#003366] h-full" style={{ width: `${row.percent}%` }} />
                      {workdays.length > 0 && <span className="bg-amber-400 h-full" style={{ width: `${(row.emptyDates.length / workdays.length) * 100}%` }} />}
                    </div>
                  </div>
                  <div className="md:text-right"><span className={`text-2xl font-serif font-bold ${row.percent >= 90 ? "text-emerald-700" : row.percent >= 70 ? "text-amber-700" : "text-red-700"}`}>{row.percent}%</span></div>
                </div>
              ))}
              {!displayedRows.length && <div className="p-8 text-center text-sm text-gray-400">No team members were found in this list.</div>}
            </div>
          </section>

          <section className="bg-white border border-gray-200">
            <div className="p-5 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div><h3 className="text-lg flex items-center gap-2"><CalendarDays size={18} className="text-[#C9AB4C]" /> Monthly coverage</h3><p className="text-sm text-gray-500 mt-1">A daily audit of submitted, empty, and missing logs.</p></div>
              <div className="flex items-center gap-4 text-xs text-gray-500"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 bg-emerald-600" /> Submitted</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 bg-amber-400" /> Empty</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 bg-red-100 border border-red-200" /> Missing</span></div>
            </div>
            <div className="overflow-x-auto p-5">
              <div style={{ minWidth: `${Math.max(720, 210 + workdays.length * 35)}px` }}>
                <div className="grid gap-1.5 items-end mb-2" style={{ gridTemplateColumns: `190px repeat(${workdays.length}, minmax(28px, 1fr))` }}>
                  <div className="text-xs uppercase tracking-wider font-bold text-gray-500">Team member</div>
                  {workdays.map((date) => <div key={date} className="text-center"><div className="text-[11px] uppercase text-gray-400">{formatDate(date, { weekday: "narrow" })}</div><div className="text-xs font-bold text-[#003366]">{fromIso(date).getDate()}</div></div>)}
                </div>
                <div className="space-y-1.5">
                  {displayedRows.map((row) => (
                    <div key={row.member.id} className="grid gap-1.5 items-center" style={{ gridTemplateColumns: `190px repeat(${workdays.length}, minmax(28px, 1fr))` }}>
                      <div className="text-sm font-semibold text-gray-700 truncate pr-3">{row.member.name}</div>
                      {workdays.map((date) => {
                        const dayEntries = row.byDate.get(date) || [];
                        const status = dayEntries.some((entry) => entry.hasContent) ? "submitted" : dayEntries.length ? "empty" : "missing";
                        return <div key={date} title={`${formatDate(date)}: ${status}`} aria-label={`${row.member.name}, ${formatDate(date)}: ${status}`} className={`h-8 grid place-items-center text-xs font-bold ${status === "submitted" ? "bg-emerald-600 text-white" : status === "empty" ? "bg-amber-400 text-amber-950" : "bg-red-50 text-red-300 border border-red-100"}`}>{status === "submitted" ? "✓" : status === "empty" ? "–" : "·"}</div>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white border border-gray-200 p-5">
              <h3 className="text-lg flex items-center gap-2"><BarChart3 size={18} className="text-[#C9AB4C]" /> Recorded work mix</h3>
              <p className="text-sm text-gray-500 mt-1">Individual entries detected in each existing ClickUp field.</p>
              <div className="space-y-4 mt-5">
                {monthCategoryTotals.map((category) => (
                  <div key={category.key} className="grid grid-cols-[80px_1fr_40px] gap-3 items-center">
                    <span className="text-sm text-gray-600">{category.label}</span>
                    <div className="h-5 bg-gray-100"><div className="h-full bg-[#003366]" style={{ width: `${(category.count / maxCategoryTotal) * 100}%` }} /></div>
                    <strong className="text-sm text-right text-[#003366]">{category.count}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="bg-[#1b1d1e] border border-[#C9AB4C]/50 p-5 text-white">
              <div className="text-xs uppercase tracking-widest text-[#C9AB4C] font-bold">Completeness rule</div>
              <h3 className="text-2xl text-white mt-3">Clear and non-destructive</h3>
              <p className="text-sm text-gray-300 mt-3 leading-relaxed">A weekday is submitted when at least one of the four existing fields contains content. A pre-created but blank date is marked empty. A weekday with no date record is marked missing.</p>
              <p className="text-sm text-gray-300 mt-3 leading-relaxed">Echo only reads the KPI Monitoring list. It does not create, edit, or reorganize anything in ClickUp.</p>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
