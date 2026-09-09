"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Plus, 
  Calendar, 
  FileText, 
  Download, 
  Sparkles, 
  Send, 
  Loader2, 
  Save, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Users, 
  Building2, 
  Clock, 
  Trash2,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle,
  CheckSquare
} from "lucide-react";
import { ArchivedMeeting, DiscussionItem } from "@/types/meeting";
import { exportWord, exportPdf, askEcho } from "@/lib/api";
import { QuickAddTaskModal } from "./QuickAddTaskModal";

const VENUE_OPTIONS = [
  "GreatWork Mega Tower 32F - Secret Room",
  "GreatWork Mega Tower 32F - Small Meeting Room",
  "GreatWork Mega Tower 24F - Meeting Room",
  "GreatWork Mega Tower 32F - Board Room",
  "GreatWork Mega Tower 32F - Co-working",
  "Online Meeting",
  "Other / Custom..."
];

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  rows = 1,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={rows}
      value={value}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className}`}
    />
  );
}

function DatePickerInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD or TBD",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleIconClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dateInputRef.current) {
      try {
        if (typeof dateInputRef.current.showPicker === "function") {
          dateInputRef.current.showPicker();
        } else {
          dateInputRef.current.focus();
        }
      } catch {
        dateInputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-xs bg-white border border-gray-200 rounded-none px-2 py-1 pr-7 focus:outline-none focus:border-[#C9AB4C]"
      />
      <input
        type="date"
        ref={dateInputRef}
        onChange={(e) => {
          if (e.target.value) {
            onChange(e.target.value);
          }
        }}
        tabIndex={-1}
        className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
      />
      <button
        type="button"
        onClick={handleIconClick}
        title="Choose date from calendar"
        className="absolute right-1 text-gray-400 hover:text-[#003366] p-1 cursor-pointer"
      >
        <Calendar size={13} />
      </button>
    </div>
  );
}

interface MeetingsViewProps {
  meetings: ArchivedMeeting[];
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onUpdateMeeting: (meeting: ArchivedMeeting) => void;
  onNewMinutes: () => void;
  onNavigateToTasks?: (taskId: string) => void;
}

export function MeetingsView({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  onUpdateMeeting,
  onNewMinutes,
  onNavigateToTasks
}: MeetingsViewProps) {
  // Search & Filter state
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Internal" | "External">("All");

  // Selected meeting working draft (for in-place editing)
  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];
  const [activeMeeting, setActiveMeeting] = useState<ArchivedMeeting | null>(currentMeeting || null);

  // Sync draft when selectedMeetingId changes
  useEffect(() => {
    if (currentMeeting) {
      setActiveMeeting(JSON.parse(JSON.stringify(currentMeeting)));
    }
  }, [selectedMeetingId, meetings]);

  // Venue custom helper
  const [isCustomVenue, setIsCustomVenue] = useState(false);

  useEffect(() => {
    if (activeMeeting) {
      const isKnown = VENUE_OPTIONS.slice(0, -1).includes(activeMeeting.location);
      setIsCustomVenue(!isKnown && !!activeMeeting.location);
    }
  }, [activeMeeting?.id]);

  // Attendee input tags
  const [primeInput, setPrimeInput] = useState("");
  const [externalInput, setExternalInput] = useState("");

  const [isExporting, setIsExporting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Quick Add ClickUp Task state
  const [quickAddTaskData, setQuickAddTaskData] = useState<{
    isOpen: boolean;
    data: {
      name?: string;
      description?: string;
      meetingTitle?: string;
      meetingDate?: string;
      dueDate?: string;
      priority?: string;
      assigneeName?: string;
      discussionPointId?: string;
      existingTaskId?: string;
      existingTaskUrl?: string;
    };
    topicIndex?: number;
  }>({
    isOpen: false,
    data: {},
  });

  // Filter master list
  const filteredList = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.location.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.summary.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesType = typeFilter === "All" || m.meeting_type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Handle Discussion Items Reorder / Remove / Add
  const handleMoveItem = (index: number, direction: "up" | "down") => {
    if (!activeMeeting) return;
    const newItems = [...activeMeeting.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setActiveMeeting({ ...activeMeeting, items: newItems });
  };

  const handleRemoveItem = (index: number) => {
    if (!activeMeeting) return;
    const newItems = activeMeeting.items.filter((_, i) => i !== index);
    setActiveMeeting({ ...activeMeeting, items: newItems });
  };

  const handleUpdateItem = (index: number, field: keyof DiscussionItem, value: string) => {
    if (!activeMeeting) return;
    const newItems = [...activeMeeting.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setActiveMeeting({ ...activeMeeting, items: newItems });
  };

  const handleAddNewItem = () => {
    if (!activeMeeting) return;
    const newItem: DiscussionItem = {
      id: `item-${Date.now()}`,
      topic: "New Discussion Topic",
      evidence: "[00:00] Recorded discussion notes",
      discussion_point: "",
      action_plan: "",
      target_date: "TBD",
      person_in_charge: "Dave Policarpio"
    };
    setActiveMeeting({ ...activeMeeting, items: [...activeMeeting.items, newItem] });
  };

  // Add Attendee Handlers
  const handleAddPrimeAttendee = () => {
    if (!activeMeeting || !primeInput.trim()) return;
    const current = activeMeeting.attendees_prime || [];
    if (!current.includes(primeInput.trim())) {
      setActiveMeeting({ ...activeMeeting, attendees_prime: [...current, primeInput.trim()] });
    }
    setPrimeInput("");
  };

  const handleRemovePrimeAttendee = (name: string) => {
    if (!activeMeeting) return;
    setActiveMeeting({
      ...activeMeeting,
      attendees_prime: (activeMeeting.attendees_prime || []).filter((a) => a !== name)
    });
  };

  const handleAddExternalAttendee = () => {
    if (!activeMeeting || !externalInput.trim()) return;
    const current = activeMeeting.attendees_external || [];
    if (!current.includes(externalInput.trim())) {
      setActiveMeeting({ ...activeMeeting, attendees_external: [...current, externalInput.trim()] });
    }
    setExternalInput("");
  };

  const handleRemoveExternalAttendee = (name: string) => {
    if (!activeMeeting) return;
    setActiveMeeting({
      ...activeMeeting,
      attendees_external: (activeMeeting.attendees_external || []).filter((a) => a !== name)
    });
  };

  // Save changes
  const handleSaveChanges = () => {
    if (!activeMeeting) return;
    onUpdateMeeting(activeMeeting);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  // Re-export Word
  const handleExportWord = async () => {
    if (!activeMeeting) return;
    setIsExporting(true);
    try {
      const metadata = {
        client_name: activeMeeting.title,
        date: activeMeeting.date,
        meeting_type: activeMeeting.meeting_type,
        location: activeMeeting.location,
        attendees_prime: activeMeeting.attendees_prime,
        attendees_external: activeMeeting.attendees_external
      };
      await exportWord(metadata, activeMeeting.items, activeMeeting.summary);
    } catch (e: any) {
      alert("Failed to export Word: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Re-export PDF
  const handleExportPdf = async () => {
    if (!activeMeeting) return;
    setIsExporting(true);
    try {
      const metadata = {
        client_name: activeMeeting.title,
        date: activeMeeting.date,
        meeting_type: activeMeeting.meeting_type,
        location: activeMeeting.location,
        attendees_prime: activeMeeting.attendees_prime,
        attendees_external: activeMeeting.attendees_external
      };
      await exportPdf(metadata, activeMeeting.items, activeMeeting.summary);
    } catch (e: any) {
      alert("Failed to export PDF: " + e.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#003366] italic">
            Meetings Archive & Workspace
          </h1>
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mt-0.5">
            Structured records • In-Place Editing • Instant Re-Export
          </p>
        </div>
      </div>

      {/* Master-Detail Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT MASTER PANE (4 cols) */}
        <div className="lg:col-span-4 space-y-3 bg-white border border-gray-200/90 rounded-none p-4 shadow-2xs">
          {/* Search Box */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter archived meetings..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-none focus:outline-none focus:border-[#C9AB4C]"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 pt-1">
            {(["All", "Internal", "External"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-none transition-colors ${
                  typeFilter === t
                    ? "bg-[#003366] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Meeting Cards List */}
          <div className="space-y-2 pt-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredList.length > 0 ? (
              filteredList.map((m) => {
                const isSelected = activeMeeting?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMeeting(m.id)}
                    className={`p-3.5 rounded-none border text-left cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#FAF9F7] border-[#C9AB4C] shadow-xs"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <h4 className={`font-serif text-base lg:text-[17px] font-bold italic line-clamp-1 ${isSelected ? "text-[#003366]" : "text-[#1b1d1e]"}`}>
                        {m.title}
                      </h4>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-none bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider shrink-0 mt-0.5">
                        {m.meeting_type}
                      </span>
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Calendar size={11} className="text-[#C9AB4C]" />
                      <span>{m.date}</span>
                    </div>

                    {m.location && (
                      <div className="text-[10px] text-gray-400 truncate mt-1">
                        {m.location}
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                      <span>{m.items.length} Topics</span>
                      <span className="text-[#C9AB4C] font-semibold">{isSelected ? "Editing" : "View"}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-gray-400">
                No meetings match your filter.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DETAIL PANE (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeMeeting ? (
            <>
              {/* Meeting Header & Export Action Bar */}
              <div className="bg-white border border-gray-200/90 rounded-none p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-widest uppercase text-[#003366]">
                      Meeting Record
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      #{activeMeeting.meeting_id || activeMeeting.id}
                    </span>
                  </div>

                  {/* Re-Export & Save Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportWord}
                      disabled={isExporting}
                      className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5 text-[#003366] rounded-none"
                    >
                      <FileText size={13} className="text-[#C9AB4C]" />
                      <span>Word (.docx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportPdf}
                      disabled={isExporting}
                      className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1.5 text-[#003366] rounded-none"
                    >
                      <Download size={13} className="text-[#C9AB4C]" />
                      <span>PDF (.pdf)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5 shadow-xs rounded-none"
                    >
                      <Save size={13} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-none text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle size={14} className="text-emerald-600" />
                    <span>Meeting record updated and saved to archives.</span>
                  </div>
                )}

                {/* In-Place Editable Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Title */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Title / Client
                    </label>
                    <input
                      type="text"
                      value={activeMeeting.title}
                      onChange={(e) => setActiveMeeting({ ...activeMeeting, title: e.target.value })}
                      className="w-full font-serif font-bold text-base text-[#003366] bg-gray-50 border border-gray-200 rounded-none px-2.5 py-1.5 focus:outline-none focus:border-[#C9AB4C] focus:bg-white"
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Date
                    </label>
                    <DatePickerInput
                      value={activeMeeting.date}
                      onChange={(val) => setActiveMeeting({ ...activeMeeting, date: val })}
                    />
                  </div>

                  {/* Meeting Type */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Meeting Type
                    </label>
                    <div className="flex gap-2">
                      {(["Internal", "External", "Team"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setActiveMeeting({ ...activeMeeting, meeting_type: t })}
                          className={`flex-1 py-1.5 rounded-none font-semibold text-xs transition-colors ${
                            activeMeeting.meeting_type === t
                              ? "bg-[#003366] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Venue */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Location / Venue
                    </label>
                    <select
                      value={isCustomVenue ? "Other / Custom..." : activeMeeting.location}
                      onChange={(e) => {
                        if (e.target.value === "Other / Custom...") {
                          setIsCustomVenue(true);
                        } else {
                          setIsCustomVenue(false);
                          setActiveMeeting({ ...activeMeeting, location: e.target.value });
                        }
                      }}
                      className="w-full bg-white border border-gray-200 rounded-none px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#C9AB4C]"
                    >
                      {VENUE_OPTIONS.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>

                    {isCustomVenue && (
                      <input
                        type="text"
                        value={activeMeeting.location}
                        onChange={(e) => setActiveMeeting({ ...activeMeeting, location: e.target.value })}
                        placeholder="Enter custom venue location..."
                        className="w-full mt-1.5 bg-white border border-gray-200 rounded-none px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-[#C9AB4C]"
                      />
                    )}
                  </div>
                </div>

                {/* Attendees Rows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  {/* Team Attendees */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#003366] mb-1">
                      Team Attendees
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {(activeMeeting.attendees_prime || []).map((att) => (
                        <span key={att} className="inline-flex items-center gap-1 text-[11px] bg-[#003366]/10 text-[#003366] px-2 py-0.5 rounded-none font-medium">
                          {att}
                          <button onClick={() => handleRemovePrimeAttendee(att)} className="hover:text-red-500">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={primeInput}
                        onChange={(e) => setPrimeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddPrimeAttendee();
                          }
                        }}
                        placeholder="Add team attendee..."
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-none px-2 py-1 focus:outline-none focus:border-[#C9AB4C]"
                      />
                      <button onClick={handleAddPrimeAttendee} className="btn-outline !py-1 !px-2.5 !text-xs rounded-none">
                        Add
                      </button>
                    </div>
                  </div>

                  {/* External Attendees */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C] mb-1">
                      External Attendees
                    </label>
                    <div className="flex flex-wrap gap-1 mb-1.5">
                      {(activeMeeting.attendees_external || []).map((att) => (
                        <span key={att} className="inline-flex items-center gap-1 text-[11px] bg-[#C9AB4C]/15 text-gray-800 px-2 py-0.5 rounded-none font-medium">
                          {att}
                          <button onClick={() => handleRemoveExternalAttendee(att)} className="hover:text-red-500">
                            <X size={11} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={externalInput}
                        onChange={(e) => setExternalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddExternalAttendee();
                          }
                        }}
                        placeholder="Add external attendee..."
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-none px-2 py-1 focus:outline-none focus:border-[#C9AB4C]"
                      />
                      <button onClick={handleAddExternalAttendee} className="btn-outline !py-1 !px-2.5 !text-xs rounded-none">
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Executive Summary
                  </label>
                  <AutoResizeTextarea
                    value={activeMeeting.summary}
                    onChange={(e) => setActiveMeeting({ ...activeMeeting, summary: e.target.value })}
                    placeholder="Enter short summary based on discussion points..."
                    className="w-full text-xs text-gray-700 bg-gray-50/60 border border-gray-200 rounded-none p-2.5 focus:outline-none focus:border-[#C9AB4C] leading-relaxed"
                  />
                </div>
              </div>

              {/* Discussion Points Matrix */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-lg text-[#003366] italic">
                    Discussion Points Matrix
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="btn-outline !py-1.5 !px-3 !text-xs flex items-center gap-1 text-[#003366] hover:bg-[#003366] hover:text-white transition-all rounded-none"
                  >
                    <Plus size={13} /> Add Topic
                  </button>
                </div>

                {/* Dynamic Cards */}
                {activeMeeting.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="bg-white border border-gray-200/90 rounded-none p-5 shadow-2xs space-y-3 relative group"
                  >
                    {/* Top Header: Topic (Editable in-place) & Top-Right Move/Remove Controls */}
                    <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-2.5">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-[11px] font-bold font-mono text-[#C9AB4C] bg-[#FAF9F7] px-2 py-0.5 rounded-none border border-gray-200 shrink-0">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.topic}
                          onChange={(e) => handleUpdateItem(idx, "topic", e.target.value)}
                          placeholder="Topic Title..."
                          className="w-full font-serif font-bold text-base text-[#003366] bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#C9AB4C] focus:outline-none py-0.5 transition-colors"
                        />
                      </div>

                      {/* Top-Right Move and Remove Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, "up")}
                          disabled={idx === 0}
                          title="Move Topic Up"
                          className="p-1 text-gray-400 hover:text-[#003366] disabled:opacity-20 hover:bg-gray-100 rounded-none"
                        >
                          <ChevronUp size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveItem(idx, "down")}
                          disabled={idx === activeMeeting.items.length - 1}
                          title="Move Topic Down"
                          className="p-1 text-gray-400 hover:text-[#003366] disabled:opacity-20 hover:bg-gray-100 rounded-none"
                        >
                          <ChevronDown size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          title="Remove Topic"
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-none transition-colors ml-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Evidence Quote */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                        Evidence / Transcript Timestamp
                      </label>
                      <input
                        type="text"
                        value={item.evidence}
                        onChange={(e) => handleUpdateItem(idx, "evidence", e.target.value)}
                        placeholder="[00:00] Quote or contextual anchor..."
                        className="w-full text-[11px] text-gray-500 italic bg-gray-50 border-l-2 border-[#C9AB4C] px-2.5 py-1 border border-gray-200/80 rounded-none focus:outline-none focus:border-[#C9AB4C]"
                      />
                    </div>

                    {/* Row for Discussion Point, Action Plan, Target Date, Person in Charge */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs pt-1">
                      {/* Discussion Point (4 cols) */}
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Discussion Point
                        </label>
                        <AutoResizeTextarea
                          value={item.discussion_point}
                          onChange={(e) => handleUpdateItem(idx, "discussion_point", e.target.value)}
                          placeholder="Key debate or takeaway..."
                          className="w-full bg-white border border-gray-200 rounded-none p-2 text-xs focus:outline-none focus:border-[#C9AB4C]"
                        />
                      </div>

                      {/* Action Plan (4 cols) */}
                      <div className="md:col-span-4">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-[#003366] mb-1">
                          Action Plan
                        </label>
                        <AutoResizeTextarea
                          value={item.action_plan}
                          onChange={(e) => handleUpdateItem(idx, "action_plan", e.target.value)}
                          placeholder="Action item or next step..."
                          className="w-full bg-white border border-gray-200 rounded-none p-2 text-xs focus:outline-none focus:border-[#003366]"
                        />
                      </div>

                      {/* Target Date (2 cols) */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          Target Date
                        </label>
                        <DatePickerInput
                          value={item.target_date}
                          onChange={(val) => handleUpdateItem(idx, "target_date", val)}
                        />
                      </div>

                      {/* Person in Charge (2 cols) */}
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                          In Charge
                        </label>
                        <input
                          type="text"
                          value={item.person_in_charge}
                          onChange={(e) => handleUpdateItem(idx, "person_in_charge", e.target.value)}
                          placeholder="Assignee..."
                          className="w-full bg-white border border-gray-200 rounded-none px-2 py-1 text-xs focus:outline-none focus:border-[#C9AB4C]"
                        />
                      </div>
                    </div>

                    {/* Quick Task Action Bar */}
                    <div className="flex items-center justify-between pt-2 mt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 font-mono">
                        Topic #{idx + 1}
                      </span>
                      {item.clickUpTaskId ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToTasks && onNavigateToTasks(item.clickUpTaskId!)}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs rounded-none cursor-pointer"
                          title="Already added to ClickUp. Click to view in Tasks portal"
                        >
                          <CheckCircle size={13} className="text-emerald-600" />
                          <span>Added to Tasks</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickAddTaskData({
                              isOpen: true,
                              data: {
                                name:
                                  item.action_plan && item.action_plan !== "None"
                                    ? item.action_plan
                                    : item.topic || `Action from Topic #${idx + 1}`,
                                description: `**Topic:** ${item.topic || ""}\n\n**Discussion:**\n${item.discussion_point || ""}\n\n**Evidence:**\n${item.evidence || ""}`,
                                meetingTitle: activeMeeting?.title || "Meeting Archive",
                                meetingDate: activeMeeting?.date,
                                dueDate: item.target_date || "",
                                priority: "normal",
                                assigneeName: item.person_in_charge || "",
                                discussionPointId: String(item.id || `dp_${activeMeeting?.id}_${idx + 1}`),
                                existingTaskId: item.clickUpTaskId,
                                existingTaskUrl: item.clickUpUrl,
                              },
                              topicIndex: idx,
                            });
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#003366] bg-white border border-[#003366]/30 hover:border-[#003366] hover:bg-blue-50/50 transition-colors shadow-2xs rounded-none cursor-pointer"
                        >
                          <CheckSquare size={13} className="text-[#c9ab4c]" />
                          <span>Add to Tasks</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white border border-gray-200 rounded-none p-12 text-center text-gray-400 text-xs">
              Select a meeting from the archive list on the left to view details and discussion points.
            </div>
          )}
        </div>

      </div>

      {/* Quick Add Task to ClickUp Modal */}
      <QuickAddTaskModal
        isOpen={quickAddTaskData.isOpen}
        onClose={() => setQuickAddTaskData({ isOpen: false, data: {} })}
        initialData={quickAddTaskData.data}
        onTaskCreated={(created) => {
          if (activeMeeting && quickAddTaskData.topicIndex !== undefined) {
            const idx = quickAddTaskData.topicIndex;
            const updatedItems = [...activeMeeting.items];
            if (updatedItems[idx]) {
              updatedItems[idx] = {
                ...updatedItems[idx],
                clickUpTaskId: created.id,
                clickUpUrl: created.url,
              };
              const updatedMeeting = { ...activeMeeting, items: updatedItems };
              setActiveMeeting(updatedMeeting);
              onUpdateMeeting(updatedMeeting);
            }
          }
        }}
        onOpenInTasks={(taskId) => {
          if (onNavigateToTasks) onNavigateToTasks(taskId);
        }}
      />
    </div>
  );
}
