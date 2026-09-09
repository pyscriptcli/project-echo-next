"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  Search,
  Filter,
  Kanban,
  List,
  Plus,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Trash2,
  Link2,
  Sparkles,
  ArrowUpDown,
  Tag,
  FolderSync
} from "lucide-react";
import {
  fetchClickUpTasks,
  createClickUpTask,
  updateClickUpTask,
  deleteClickUpTask,
  getStoredClickUpToken,
  setStoredClickUpToken,
  getStoredClickUpListId,
  setStoredClickUpListId,
  discoverClickUpLists
} from "@/lib/api";

export interface ClickUpTask {
  id: string;
  name: string;
  description: string;
  status: string;
  statusColor?: string;
  priority: string;
  priorityOrder?: number;
  dueDate: string | null;
  startDate?: string | null;
  dateCreated?: string | null;
  url?: string;
  assignees: Array<{
    id: number | string;
    username: string;
    email?: string;
    initials?: string;
    profilePicture?: string | null;
  }>;
  tags?: string[];
  isMeetingTask?: boolean;
  meetingTitle?: string;
  listId?: string;
}

interface TasksViewProps {
  onNavigateToMeetings?: () => void;
  onSelectMeeting?: (meetingTitle: string) => void;
}

const DEFAULT_STATUSES = ["to do", "in progress", "in review", "complete"];

export default function TasksView({
  onNavigateToMeetings,
  onSelectMeeting
}: TasksViewProps) {
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  // Setup / Connection credentials
  const [tokenInput, setTokenInput] = useState("");
  const [listIdInput, setListIdInput] = useState("");
  const [discoveredLists, setDiscoveredLists] = useState<Array<{ id: string; name: string; spaceName: string }>>([]);
  const [discovering, setDiscovering] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // View state: 'board' | 'list'
  const [viewMode, setViewMode] = useState<"board" | "list">("board");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "overdue" | "upcoming">("all");
  const [meetingFilter, setMeetingFilter] = useState("all");

  // Create Task Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskMeetingTitle, setNewTaskMeetingTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("normal");
  const [newTaskStatus, setNewTaskStatus] = useState("to do");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // Load stored credentials on mount
  useEffect(() => {
    const token = getStoredClickUpToken();
    const listId = getStoredClickUpListId();
    setTokenInput(token);
    setListIdInput(listId);
    loadTasks();
  }, []);

  const loadTasks = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await fetchClickUpTasks();
      setTasks(data.tasks || []);
      setNeedsAuth(false);
    } catch (err: any) {
      console.warn("Failed to load ClickUp tasks:", err.message);
      setError(err.message);
      if (
        err.message.includes("not configured") ||
        err.message.includes("authentication") ||
        err.message.includes("Token")
      ) {
        setNeedsAuth(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!tokenInput.trim()) {
      alert("Please enter a valid ClickUp API Token.");
      return;
    }
    setStoredClickUpToken(tokenInput.trim());
    setStoredClickUpListId(listIdInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    setNeedsAuth(false);
    loadTasks();
  };

  const handleDiscoverLists = async () => {
    if (!tokenInput.trim()) {
      alert("Please enter a ClickUp API Token first.");
      return;
    }
    setDiscovering(true);
    try {
      const data = await discoverClickUpLists(tokenInput.trim());
      setDiscoveredLists(data.lists || []);
      if ((data.lists || []).length > 0 && !listIdInput) {
        setListIdInput(data.lists[0].id);
      }
    } catch (err: any) {
      alert(err.message || "Failed to discover ClickUp lists.");
    } finally {
      setDiscovering(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic UI update
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    try {
      await updateClickUpTask({ taskId, status: newStatus });
    } catch (err: any) {
      console.error("Failed to update status in ClickUp:", err);
      // Revert on error
      loadTasks();
    }
  };

  const handlePriorityChange = async (taskId: string, newPriority: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, priority: newPriority } : t))
    );
    try {
      await updateClickUpTask({ taskId, priority: newPriority });
    } catch (err: any) {
      console.error("Failed to update priority in ClickUp:", err);
      loadTasks();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task from ClickUp?")) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await deleteClickUpTask(taskId);
    } catch (err: any) {
      alert(err.message || "Failed to delete task.");
      loadTasks();
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;
    setCreatingTask(true);
    try {
      await createClickUpTask({
        name: newTaskName.trim(),
        description: newTaskDesc.trim(),
        meetingTitle: newTaskMeetingTitle.trim() || undefined,
        status: newTaskStatus,
        priority: newTaskPriority,
        dueDate: newTaskDueDate || null,
      });
      setShowCreateModal(false);
      setNewTaskName("");
      setNewTaskDesc("");
      setNewTaskMeetingTitle("");
      setNewTaskDueDate("");
      await loadTasks();
    } catch (err: any) {
      alert(err.message || "Failed to create task in ClickUp.");
    } finally {
      setCreatingTask(false);
    }
  };

  // Derive filter lists
  const allAssignees = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach(t => {
      t.assignees.forEach(a => map.set(String(a.id), a.username));
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks]);

  const allMeetings = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach(t => {
      if (t.meetingTitle) set.add(t.meetingTitle);
    });
    return Array.from(set);
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesMeeting = (t.meetingTitle || "").toLowerCase().includes(q);
        const matchesAssignee = t.assignees.some(a =>
          a.username.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesDesc && !matchesMeeting && !matchesAssignee) {
          return false;
        }
      }

      // Status
      if (statusFilter !== "all" && t.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Assignee
      if (assigneeFilter !== "all") {
        const hasAssignee = t.assignees.some(a => String(a.id) === assigneeFilter);
        if (!hasAssignee) return false;
      }

      // Meeting
      if (meetingFilter !== "all" && t.meetingTitle !== meetingFilter) {
        return false;
      }

      // Date Filter
      if (dateFilter !== "all" && t.dueDate) {
        const due = new Date(t.dueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (dateFilter === "today") {
          const isToday =
            due.getFullYear() === now.getFullYear() &&
            due.getMonth() === now.getMonth() &&
            due.getDate() === now.getDate();
          if (!isToday) return false;
        } else if (dateFilter === "overdue") {
          if (due >= now || t.status.toLowerCase() === "complete") return false;
        } else if (dateFilter === "upcoming") {
          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (due < now || due > nextWeek) return false;
        }
      } else if (dateFilter !== "all" && !t.dueDate) {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, statusFilter, assigneeFilter, dateFilter, meetingFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status.toLowerCase() === "complete").length;
    const inProgress = tasks.filter(t => t.status.toLowerCase().includes("progress")).length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const overdue = tasks.filter(
      t => t.dueDate && new Date(t.dueDate) < now && t.status.toLowerCase() !== "complete"
    ).length;

    return { total, completed, inProgress, overdue };
  }, [tasks]);

  const getPriorityBadge = (priority: string) => {
    const p = priority.toLowerCase();
    if (p.includes("urgent")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 uppercase tracking-wider rounded-none">
          <span className="w-1.5 h-1.5 bg-red-600"></span> Urgent
        </span>
      );
    }
    if (p.includes("high")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 uppercase tracking-wider rounded-none">
          <span className="w-1.5 h-1.5 bg-amber-600"></span> High
        </span>
      );
    }
    if (p.includes("normal") || p.includes("medium")) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-[#003366] uppercase tracking-wider rounded-none">
          <span className="w-1.5 h-1.5 bg-[#003366]"></span> Normal
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 uppercase tracking-wider rounded-none">
        <span className="w-1.5 h-1.5 bg-gray-400"></span> Low
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8f9fa] overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1b1d1e] flex items-center justify-center text-[#c9ab4c]">
            <CheckSquare size={17} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif italic font-bold text-xl text-[#003366] leading-none">
                Meeting Action Items & Tasks
              </h1>
              <span className="text-[10px] bg-purple-50 text-purple-800 font-bold px-2 py-0.5 border border-purple-200 tracking-wider uppercase">
                ClickUp Live Portal
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Closed-loop operational execution synchronized directly with ClickUp.
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Board / List Toggle */}
          <div className="flex bg-gray-100 p-0.5 border border-gray-200">
            <button
              onClick={() => setViewMode("board")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors ${
                viewMode === "board"
                  ? "bg-[#003366] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Kanban size={13} />
              <span>Board</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold transition-colors ${
                viewMode === "list"
                  ? "bg-[#003366] text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <List size={13} />
              <span>List</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadTasks(true)}
            disabled={refreshing || loading}
            title="Refresh from ClickUp"
            className="p-1.5 text-gray-600 hover:text-[#003366] bg-white border border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#c9ab4c]" : ""} />
          </button>

          {/* Create Task Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary !py-1.5 !px-3.5 !text-xs flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={14} />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Metric Strip */}
      <div className="bg-[#1b1d1e] text-white px-6 py-2.5 border-b border-[#c9ab4c]/30 flex items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex items-center gap-6 divide-x divide-white/10">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
              Total Synced:
            </span>
            <span className="font-mono font-bold text-white text-sm">{metrics.total}</span>
          </div>
          <div className="pl-6 flex items-center gap-2">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
              In Progress:
            </span>
            <span className="font-mono font-bold text-blue-400 text-sm">{metrics.inProgress}</span>
          </div>
          <div className="pl-6 flex items-center gap-2">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
              Completed:
            </span>
            <span className="font-mono font-bold text-emerald-400 text-sm">{metrics.completed}</span>
          </div>
          <div className="pl-6 flex items-center gap-2">
            <span className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
              Overdue:
            </span>
            <span className="font-mono font-bold text-rose-400 text-sm">{metrics.overdue}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#c9ab4c]">
          <Tag size={12} />
          <span className="font-mono">Tag: echo-meeting</span>
        </div>
      </div>

      {/* Enterprise Filter Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks, meetings, assignees..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 text-xs w-60 focus:bg-white focus:border-[#c9ab4c] outline-none"
            />
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1">
            {["all", "to do", "in progress", "in review", "complete"].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                  statusFilter.toLowerCase() === st.toLowerCase()
                    ? "bg-[#003366] text-white border-[#003366]"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 outline-none focus:border-[#c9ab4c]"
          >
            <option value="all">Due: All Dates</option>
            <option value="today">Due: Today</option>
            <option value="overdue">Due: Overdue</option>
            <option value="upcoming">Due: Next 7 Days</option>
          </select>

          {/* Assignee Filter Dropdown */}
          {allAssignees.length > 0 && (
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 outline-none focus:border-[#c9ab4c]"
            >
              <option value="all">Assignee: All Members</option>
              {allAssignees.map(a => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}

          {/* Meeting Origin Filter */}
          {allMeetings.length > 0 && (
            <select
              value={meetingFilter}
              onChange={e => setMeetingFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 text-gray-700 outline-none focus:border-[#c9ab4c] max-w-[200px] truncate"
            >
              <option value="all">Meeting: All Sources</option>
              {allMeetings.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-[11px] text-gray-400">
          Showing <span className="font-bold text-gray-700">{filteredTasks.length}</span> of{" "}
          <span className="font-bold text-gray-700">{tasks.length}</span> tasks
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Auth / Connection Warning Card */}
        {needsAuth && (
          <div className="max-w-2xl mx-auto mb-6 bg-white border-2 border-[#003366] p-6 shadow-md">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="text-[#c9ab4c] shrink-0 mt-0.5" size={22} />
              <div>
                <h3 className="font-serif italic font-bold text-lg text-[#003366]">
                  Connect Your ClickUp Workspace
                </h3>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Project Echo connects directly to your ClickUp workspace via personal API token.
                  Provide your token and target List ID below, or configure them in your Vercel
                  environment variables (`CLICKUP_API_TOKEN` & `CLICKUP_DEFAULT_LIST_ID`).
                </p>
              </div>
            </div>

            <div className="space-y-3.5 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-600 mb-1">
                  ClickUp Personal API Token (pk_...)
                </label>
                <input
                  type="password"
                  placeholder="pk_12345678_..."
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs font-mono bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  Find this in ClickUp: Settings → Apps → Generate API Token
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-600">
                    Default ClickUp List ID
                  </label>
                  <button
                    type="button"
                    onClick={handleDiscoverLists}
                    disabled={discovering || !tokenInput.trim()}
                    className="text-[10px] text-[#003366] hover:text-[#c9ab4c] font-bold flex items-center gap-1 disabled:opacity-50"
                  >
                    <FolderSync size={11} className={discovering ? "animate-spin" : ""} />
                    <span>Auto-Discover My Lists</span>
                  </button>
                </div>

                {discoveredLists.length > 0 ? (
                  <select
                    value={listIdInput}
                    onChange={e => setListIdInput(e.target.value)}
                    className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                  >
                    <option value="">-- Select a ClickUp List --</option>
                    {discoveredLists.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.spaceName} → {l.name} (ID: {l.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. 9012345678"
                    value={listIdInput}
                    onChange={e => setListIdInput(e.target.value)}
                    className="w-full border border-gray-300 p-2 text-xs font-mono bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                  />
                )}
                <span className="text-[10px] text-gray-400 mt-0.5 block">
                  The ID from your ClickUp URL: app.clickup.com/workspace/v/li/<b>9012345678</b>
                </span>
              </div>

              <div className="flex items-center justify-between pt-3">
                {saveSuccess && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Connected successfully!
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveCredentials}
                  className="btn-primary !py-2 !px-5 !text-xs ml-auto shadow-xs"
                >
                  Save & Connect ClickUp
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw size={24} className="animate-spin text-[#c9ab4c] mb-3" />
            <p className="text-xs font-semibold">Synchronizing with ClickUp API...</p>
          </div>
        )}

        {/* Error Notification */}
        {!loading && error && !needsAuth && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
            <button
              onClick={() => loadTasks()}
              className="font-bold underline hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredTasks.length === 0 && (
          <div className="text-center py-16 bg-white border border-gray-200 p-8 max-w-xl mx-auto">
            <CheckSquare size={32} className="mx-auto text-gray-300 mb-3" />
            <h3 className="font-serif italic font-bold text-base text-[#003366] mb-1">
              No Meeting Tasks Found
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed max-w-sm mx-auto">
              No tasks matched your current filters. Add tasks from the Notetaker discussion points,
              or create one directly above.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary !py-1.5 !px-4 !text-xs"
            >
              Create First Task
            </button>
          </div>
        )}

        {/* ─── BOARD VIEW (KANBAN) ─── */}
        {!loading && !error && viewMode === "board" && filteredTasks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {DEFAULT_STATUSES.map(statusCol => {
              const colTasks = filteredTasks.filter(
                t => t.status.toLowerCase() === statusCol.toLowerCase()
              );

              return (
                <div
                  key={statusCol}
                  className="bg-gray-50/80 border border-gray-200 flex flex-col min-h-[500px]"
                >
                  {/* Column Header */}
                  <div className="bg-white px-3.5 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 ${
                          statusCol === "complete"
                            ? "bg-emerald-500"
                            : statusCol === "in progress"
                            ? "bg-blue-500"
                            : statusCol === "in review"
                            ? "bg-purple-500"
                            : "bg-gray-400"
                        }`}
                      ></span>
                      <h4 className="font-bold text-[11px] uppercase tracking-wider text-gray-700">
                        {statusCol}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-gray-100 text-gray-600 px-1.5 py-0.2">
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Column Task Cards */}
                  <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto">
                    {colTasks.map(task => (
                      <div
                        key={task.id}
                        className="bg-white border border-gray-200 hover:border-[#c9ab4c] p-3 shadow-2xs transition-all flex flex-col justify-between group"
                      >
                        <div>
                          {/* Priority & ClickUp Direct Link */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            {getPriorityBadge(task.priority)}
                            {task.url && (
                              <a
                                href={task.url}
                                target="_blank"
                                rel="noreferrer"
                                title="Open in ClickUp"
                                className="text-gray-400 hover:text-[#003366] transition-colors"
                              >
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>

                          {/* Task Name */}
                          <h5 className="text-xs font-bold text-gray-900 leading-snug mb-1.5">
                            {task.name}
                          </h5>

                          {/* Originating Meeting Badge */}
                          {task.meetingTitle && (
                            <div className="flex items-center gap-1 text-[10px] text-[#003366] bg-blue-50/70 border border-blue-100 px-2 py-0.5 mb-2 font-medium">
                              <Link2 size={10} className="shrink-0 text-[#c9ab4c]" />
                              <span className="truncate">{task.meetingTitle}</span>
                            </div>
                          )}

                          {/* Due Date Indicator */}
                          {task.dueDate && (
                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2 font-mono">
                              <Calendar size={10} />
                              <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              {new Date(task.dueDate) < new Date() &&
                                task.status.toLowerCase() !== "complete" && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 ml-1">
                                    OVERDUE
                                  </span>
                                )}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Assignee & Quick Status Changer */}
                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-1">
                          {/* Assignee Avatar / Name */}
                          <div className="flex items-center gap-1 text-[10px] text-gray-600 truncate">
                            {task.assignees.length > 0 ? (
                              <div className="flex items-center gap-1 truncate">
                                <div className="w-4 h-4 bg-[#003366] text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                  {task.assignees[0].initials}
                                </div>
                                <span className="truncate max-w-[80px]">
                                  {task.assignees[0].username}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 italic">Unassigned</span>
                            )}
                          </div>

                          {/* Status Quick Switcher */}
                          <select
                            value={task.status.toLowerCase()}
                            onChange={e => handleStatusChange(task.id, e.target.value)}
                            className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-200 text-gray-700 py-0.5 px-1 outline-none hover:border-gray-400 cursor-pointer"
                          >
                            {DEFAULT_STATUSES.map(s => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── LIST VIEW (TABLE) ─── */}
        {!loading && !error && viewMode === "list" && filteredTasks.length > 0 && (
          <div className="bg-white border border-gray-200 overflow-x-auto shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#1b1d1e] text-white border-b border-[#c9ab4c]/40 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Task Name</th>
                  <th className="py-2.5 px-4">Meeting Origin</th>
                  <th className="py-2.5 px-4">Priority</th>
                  <th className="py-2.5 px-4">Assignee</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Status Column */}
                    <td className="py-2.5 px-4">
                      <select
                        value={task.status.toLowerCase()}
                        onChange={e => handleStatusChange(task.id, e.target.value)}
                        className="text-[10px] uppercase font-bold tracking-wider bg-gray-50 border border-gray-200 text-gray-800 py-1 px-1.5 outline-none hover:border-[#c9ab4c]"
                      >
                        {DEFAULT_STATUSES.map(s => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Name Column */}
                    <td className="py-2.5 px-4 font-bold text-gray-900 max-w-sm">
                      <div className="line-clamp-2">{task.name}</div>
                    </td>

                    {/* Meeting Origin Column */}
                    <td className="py-2.5 px-4 text-gray-600">
                      {task.meetingTitle ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#003366] font-medium">
                          <Link2 size={11} className="text-[#c9ab4c] shrink-0" />
                          <span className="truncate max-w-[180px]">{task.meetingTitle}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Direct Task</span>
                      )}
                    </td>

                    {/* Priority Column */}
                    <td className="py-2.5 px-4">
                      <select
                        value={task.priority.toLowerCase()}
                        onChange={e => handlePriorityChange(task.id, e.target.value)}
                        className="text-[10px] uppercase font-bold bg-transparent border-0 text-gray-700 outline-none cursor-pointer"
                      >
                        <option value="urgent">🔴 Urgent</option>
                        <option value="high">🟠 High</option>
                        <option value="normal">🔵 Normal</option>
                        <option value="low">⚪ Low</option>
                      </select>
                    </td>

                    {/* Assignee Column */}
                    <td className="py-2.5 px-4 text-gray-600">
                      {task.assignees.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 bg-[#003366] text-white text-[10px] font-bold flex items-center justify-center">
                            {task.assignees[0].initials}
                          </div>
                          <span className="truncate max-w-[120px]">{task.assignees[0].username}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date Column */}
                    <td className="py-2.5 px-4 font-mono text-[11px] text-gray-600">
                      {task.dueDate ? (
                        <span
                          className={
                            new Date(task.dueDate) < new Date() &&
                            task.status.toLowerCase() !== "complete"
                              ? "text-rose-600 font-bold"
                              : ""
                          }
                        >
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Actions Column */}
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {task.url && (
                          <a
                            href={task.url}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in ClickUp"
                            className="p-1 text-gray-400 hover:text-[#003366]"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete from ClickUp"
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── CREATE TASK MODAL ─── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border-2 border-[#003366] shadow-2xl p-6 w-full max-w-lg rounded-none">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckSquare className="text-[#c9ab4c]" size={20} />
                <h3 className="font-serif italic font-bold text-xl text-[#003366]">
                  Create ClickUp Task
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on Q4 financial projections"
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Originating Meeting Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Executive Board Meeting - Sept 9"
                  value={newTaskMeetingTitle}
                  onChange={e => setNewTaskMeetingTitle(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value)}
                    className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="normal">🔵 Normal</option>
                    <option value="low">⚪ Low</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={e => setNewTaskStatus(e.target.value)}
                    className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                  >
                    <option value="to do">To Do</option>
                    <option value="in progress">In Progress</option>
                    <option value="in review">In Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Description / Action Plan
                </label>
                <textarea
                  rows={3}
                  placeholder="Specific deliverables, discussion point context, and expected outcomes..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full border border-gray-300 p-2 text-xs bg-gray-50 focus:bg-white focus:border-[#c9ab4c] outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline !py-1.5 !px-3.5 !text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5 shadow-xs"
                >
                  {creatingTask ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Creating in ClickUp...</span>
                    </>
                  ) : (
                    <span>Push to ClickUp</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
