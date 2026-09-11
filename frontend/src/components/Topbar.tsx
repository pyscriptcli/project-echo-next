"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Sparkles, 
  X, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Plus, 
  Mic, 
  Upload,
  CheckSquare,
  LayoutDashboard,
  FolderKanban,
  ExternalLink,
  ClipboardList,
  NotebookTabs,
  Newspaper
  ,ClipboardCheck
} from "lucide-react";
import { ArchivedMeeting } from "@/types/meeting";
import { ClickUpTask } from "./TasksView";
import { formatEchoDate } from "@/lib/dateUtils";

interface TopbarProps {
  meetings: ArchivedMeeting[];
  tasks?: ClickUpTask[];
  onOpenUniversalEcho: () => void;
  onSelectMeeting: (meetingId: string) => void;
  onSelectTask?: (taskId: string) => void;
  onNewMeeting: () => void;
  onOpenStudio: () => void;
  onGoToNotetaker: () => void;
  onNavigateToPage?: (page: "dashboard" | "meetings" | "tasks" | "notebook" | "market-insights" | "demands" | "minutes" | "forms" | "forms-admin") => void;
  allowedPages?: Array<"dashboard" | "meetings" | "tasks" | "notebook" | "market-insights" | "demands" | "minutes" | "forms">;
  isAdmin?: boolean;
}

export function Topbar({
  meetings,
  tasks = [],
  onOpenUniversalEcho,
  onSelectMeeting,
  onSelectTask,
  onNewMeeting,
  onOpenStudio,
  onGoToNotetaker,
  onNavigateToPage,
  allowedPages,
  isAdmin
}: TopbarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = searchQuery.trim().toLowerCase();

  // 1. Navigation Pages
  const APP_PAGES: Array<{ id: "dashboard" | "meetings" | "tasks" | "notebook" | "market-insights" | "demands" | "minutes" | "forms" | "forms-admin"; name: string; description: string; icon: any }> = [
    { id: "dashboard", name: "Dashboard", description: "Executive overview & meeting metrics", icon: LayoutDashboard },
    { id: "meetings", name: "Meetings Archive", description: "Review and edit meeting minutes", icon: Calendar },
    { id: "tasks", name: "Tasks Portal (ClickUp)", description: "Track & execute meeting action items", icon: CheckSquare },
    { id: "notebook", name: "Notebook", description: "Daily logs & team completeness", icon: NotebookTabs },
    { id: "market-insights", name: "Market Insights", description: "Weekly market brief & source archive", icon: Newspaper },
    { id: "demands", name: "Demands", description: "Demand pipeline, table & coverage", icon: ClipboardCheck },
    { id: "minutes", name: "Notetaker Studio", description: "Transcribe audio & synthesize notes", icon: Mic },
    { id: "forms", name: "Forms", description: "Submit, track & approve requests", icon: ClipboardList },
    { id: "forms-admin", name: "Settings", description: "Configure Echo access and routing", icon: ClipboardList },
  ];

  const matchedPages = query
    ? APP_PAGES.filter((p) => {
        if (p.id === "forms-admin" && !isAdmin) return false;
        if (!isAdmin && allowedPages && allowedPages.length > 0 && !allowedPages.includes(p.id as any)) return false;
        return (
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.id.includes(query)
        );
      })
    : [];

  // 2. ClickUp Tasks
  const canAccessTasks = isAdmin || !allowedPages || allowedPages.includes("tasks");
  const matchedTasks = query && canAccessTasks
    ? tasks.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          (t.meetingTitle || "").toLowerCase().includes(query) ||
          t.status.toLowerCase().includes(query) ||
          t.assignees.some((a) => a.username.toLowerCase().includes(query))
      ).slice(0, 5)
    : [];

  // 3. Meetings
  const canAccessMeetings = isAdmin || !allowedPages || allowedPages.includes("meetings");
  const matchedMeetings = query && canAccessMeetings
    ? meetings.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.location.toLowerCase().includes(query) ||
          m.summary.toLowerCase().includes(query)
      ).slice(0, 5)
    : [];

  // 4. Discussion Topics & Action Items
  const matchedTopics: { meetingId: string; meetingTitle: string; topic: string; action: string }[] = [];
  if (query) {
    meetings.forEach((m) => {
      m.items.forEach((item) => {
        if (
          item.topic.toLowerCase().includes(query) ||
          item.discussion_point.toLowerCase().includes(query) ||
          item.action_plan.toLowerCase().includes(query)
        ) {
          if (matchedTopics.length < 5) {
            matchedTopics.push({
              meetingId: m.id,
              meetingTitle: m.title,
              topic: item.topic,
              action: item.action_plan
            });
          }
        }
      });
    });
  }

  const hasResults =
    matchedPages.length > 0 ||
    matchedTasks.length > 0 ||
    matchedMeetings.length > 0 ||
    matchedTopics.length > 0;

  return (
    <header className="sticky top-0 z-30 h-14 bg-[#FFFCFB]/95 backdrop-blur-sm border-b border-[#003366]/15 px-4 md:px-8 flex items-center justify-between gap-4 transition-colors">
      {/* Left balance spacer so middle search remains centered */}
      <div className="hidden xl:block w-72 shrink-0" />

      {/* Middle: Centered Spotlight Search Container */}
      <div ref={searchContainerRef} className="relative w-full max-w-md mx-auto">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-gray-400 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search"
            className="w-full pl-10 pr-9 py-1.5 text-xs bg-[#FFFCFB] border border-[#003366]/25 rounded-none shadow-2xs focus:outline-none focus:border-[#C9A84C] focus:ring-1 focus:ring-[#C9A84C] transition-all text-[#181D1E] placeholder:text-[#53616A]"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsOpen(false);
              }}
              className="absolute right-2.5 text-gray-400 hover:text-gray-600 p-0.5"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="absolute right-2.5 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-gray-400 bg-[#FFFCFB] border border-gray-200 rounded-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Spotlight Results Dropdown */}
        {isOpen && query && (
          <div className="absolute left-0 right-0 mt-2 bg-[#FFFCFB] border border-gray-200 rounded-none shadow-xl overflow-hidden z-50 max-h-[420px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {hasResults ? (
              <div className="p-2 divide-y divide-gray-100 text-xs">
                {/* 1. APP PAGES */}
                {matchedPages.length > 0 && (
                  <div className="py-2 first:pt-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1">
                      Pages & Views
                    </span>
                    {matchedPages.map((p) => {
                      const IconComponent = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            if (onNavigateToPage) onNavigateToPage(p.id);
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-none hover:bg-[#FFFCFB] flex items-center justify-between group transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <IconComponent size={14} className="text-[#003366] shrink-0" />
                            <div>
                              <div className="font-semibold text-[#1b1d1e] group-hover:text-[#003366]">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-gray-400">{p.description}</div>
                            </div>
                          </div>
                          <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 2. CLICKUP TASKS */}
                {matchedTasks.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1">
                      ClickUp Tasks
                    </span>
                    {matchedTasks.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          if (onSelectTask) onSelectTask(t.id);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-none hover:bg-[#FFFCFB] flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <CheckSquare size={14} className="text-[#003366] shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-[#1b1d1e] group-hover:text-[#003366] truncate">
                              {t.name}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              Status: <span className="uppercase font-bold text-gray-600">{t.status}</span>
                              {t.assignees.length > 0 && ` • Assigned to ${t.assignees[0].username}`}
                              {t.dueDate && ` • Due ${formatEchoDate(t.dueDate)}`}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. MEETINGS */}
                {matchedMeetings.length > 0 && (
                  <div className="py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1">
                      Meetings
                    </span>
                    {matchedMeetings.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          onSelectMeeting(m.id);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-none hover:bg-[#FFFCFB] flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Calendar size={14} className="text-[#003366] shrink-0" />
                          <div className="truncate">
                            <div className="font-semibold text-[#1b1d1e] group-hover:text-[#003366] truncate">
                              {m.title}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate">
                              {formatEchoDate(m.date)} • {m.location || "Scheduled Venue"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. TOPICS & ACTIONS */}
                {matchedTopics.length > 0 && (
                  <div className="py-2 last:pb-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1">
                      Topics & Action Plans
                    </span>
                    {matchedTopics.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectMeeting(t.meetingId);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-none hover:bg-[#FFFCFB] flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={14} className="text-[#C9AB4C] shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-[#1b1d1e] group-hover:text-[#003366] truncate">
                              {t.topic}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-sm">
                              In {t.meetingTitle} • {t.action || "No action plan"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-xs">
                No matching results found across pages, tasks, or meetings for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: "New Meeting" (transparent fill + gold border + mic + upload) and "Ask Echo" */}
      <div className="flex items-center gap-2.5 shrink-0">
        
        {/* New Meeting Integrated Control Group */}
        {(isAdmin || !allowedPages || allowedPages.includes("meetings") || allowedPages.includes("minutes")) && (
        <div className="inline-flex items-center rounded-none border border-[#C9AB4C] bg-transparent shadow-2xs overflow-hidden">
          {/* Main "New Meeting" Transparent Button with Gold Border */}
          <button
            type="button"
            onClick={onNewMeeting}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#003366] hover:bg-[#C9AB4C]/15 transition-colors flex items-center gap-1.5"
            title="Start New Meeting"
          >
            <Plus size={13} className="text-[#C9AB4C]" />
            <span>New Meeting</span>
          </button>

          {/* Small Divider */}
          <div className="w-[1px] h-4 bg-[#C9AB4C]/40" />

          {/* Small Mic Button -> Redirects to Studio Mode */}
          <button
            type="button"
            onClick={onOpenStudio}
            className="p-1.5 text-[#003366] hover:bg-[#C9AB4C]/20 hover:text-[#C9AB4C] transition-colors"
            title="Record in Studio Mode"
            aria-label="Record in Studio Mode"
          >
            <Mic size={14} className="text-[#003366]" />
          </button>

          {/* Small Divider */}
          <div className="w-[1px] h-4 bg-[#C9AB4C]/40" />

          {/* Small Upload Button -> Redirects to Notetaker Workspace */}
          <button
            type="button"
            onClick={onGoToNotetaker}
            className="p-1.5 text-[#003366] hover:bg-[#C9AB4C]/20 hover:text-[#C9AB4C] transition-colors"
            title="Upload File or Paste Transcript in Notetaker"
            aria-label="Upload File or Paste Transcript in Notetaker"
          >
            <Upload size={14} className="text-[#003366]" />
          </button>
        </div>
        )}

        {/* Ask Echo Trigger Button (#1b1d1e deep charcoal) */}
        {(!allowedPages || allowedPages.includes("minutes")) && (
          <button
            type="button"
            onClick={onOpenUniversalEcho}
            className="flex items-center gap-1.5 bg-[#003366] text-[#FFFCFB] hover:bg-[#174778] border border-[#C9A84C]/60 hover:border-[#C9A84C] px-3.5 py-1.5 rounded-none text-xs font-semibold tracking-wide shadow-2xs transition-all group"
          >
            <Sparkles size={13} className="text-[#FFBF00] group-hover:rotate-12 transition-transform" />
            <span>Ask Echo</span>
          </button>
        )}
      </div>
    </header>
  );
}
