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
  Upload 
} from "lucide-react";
import { ArchivedMeeting } from "@/types/meeting";

interface TopbarProps {
  meetings: ArchivedMeeting[];
  onOpenUniversalEcho: () => void;
  onSelectMeeting: (meetingId: string) => void;
  onNewMeeting: () => void;
  onOpenStudio: () => void;
  onGoToNotetaker: () => void;
}

export function Topbar({
  meetings,
  onOpenUniversalEcho,
  onSelectMeeting,
  onNewMeeting,
  onOpenStudio,
  onGoToNotetaker
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

  // Filter meetings, topics, and actions
  const matchedMeetings = query
    ? meetings.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.location.toLowerCase().includes(query) ||
          m.summary.toLowerCase().includes(query)
      )
    : [];

  const matchedTopics: { meetingId: string; meetingTitle: string; topic: string; action: string }[] = [];
  if (query) {
    meetings.forEach((m) => {
      m.items.forEach((item) => {
        if (
          item.topic.toLowerCase().includes(query) ||
          item.discussion_point.toLowerCase().includes(query) ||
          item.action_plan.toLowerCase().includes(query)
        ) {
          matchedTopics.push({
            meetingId: m.id,
            meetingTitle: m.title,
            topic: item.topic,
            action: item.action_plan
          });
        }
      });
    });
  }

  const hasResults = matchedMeetings.length > 0 || matchedTopics.length > 0;

  return (
    <header className="sticky top-0 z-30 h-14 bg-bg-primary/95 backdrop-blur-sm border-b border-gray-200/80 px-4 md:px-8 flex items-center justify-between gap-4 transition-colors">
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
            placeholder="Search meetings, topics, action plans... (Ctrl+K)"
            className="w-full pl-10 pr-9 py-1.5 text-xs bg-white border border-gray-300/80 rounded-none shadow-2xs focus:outline-none focus:border-[#C9AB4C] focus:ring-1 focus:ring-[#C9AB4C] transition-all text-[#1b1d1e] placeholder:text-gray-400"
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
            <kbd className="absolute right-2.5 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono text-gray-400 bg-gray-100 border border-gray-200 rounded-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Spotlight Results Dropdown */}
        {isOpen && query && (
          <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-none shadow-xl overflow-hidden z-50 max-h-[380px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
            {hasResults ? (
              <div className="p-2 divide-y divide-gray-100 text-xs">
                {matchedMeetings.length > 0 && (
                  <div className="py-2 first:pt-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1.5">
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
                        className="w-full text-left px-2.5 py-2 rounded-none hover:bg-gray-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-[#003366] shrink-0" />
                          <div>
                            <div className="font-semibold text-[#1b1d1e] group-hover:text-[#003366]">
                              {m.title}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {m.date} • {m.location || "Scheduled Venue"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                )}

                {matchedTopics.length > 0 && (
                  <div className="py-2 last:pb-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] px-2 block mb-1.5">
                      Topics & Actions
                    </span>
                    {matchedTopics.map((t, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSelectMeeting(t.meetingId);
                          setIsOpen(false);
                        }}
                        className="w-full text-left px-2.5 py-2 rounded-none hover:bg-gray-50 flex items-center justify-between group transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-[#C9AB4C] shrink-0" />
                          <div>
                            <div className="font-medium text-[#1b1d1e] group-hover:text-[#003366]">
                              {t.topic}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate max-w-sm">
                              In {t.meetingTitle} • {t.action || "No action plan"}
                            </div>
                          </div>
                        </div>
                        <ArrowRight size={13} className="text-gray-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-xs">
                No matching meetings or topics found for &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: "New Meeting" (transparent fill + gold border + mic + upload) and "Ask Echo" */}
      <div className="flex items-center gap-2.5 shrink-0">
        
        {/* New Meeting Integrated Control Group */}
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

        {/* Ask Echo Trigger Button (#1b1d1e deep charcoal) */}
        <button
          type="button"
          onClick={onOpenUniversalEcho}
          className="flex items-center gap-1.5 bg-[#1b1d1e] text-[#FAF9F7] hover:bg-[#25282a] border border-[#C9AB4C]/60 hover:border-[#C9AB4C] px-3.5 py-1.5 rounded-none text-xs font-semibold tracking-wide shadow-2xs transition-all group"
        >
          <Sparkles size={13} className="text-[#C9AB4C] group-hover:rotate-12 transition-transform" />
          <span>Ask Echo</span>
        </button>
      </div>
    </header>
  );
}
