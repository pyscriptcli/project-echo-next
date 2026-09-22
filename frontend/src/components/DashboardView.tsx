"use client";

import React, { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Users, 
  Building2, 
  ChevronLeft, 
  ChevronRight, 
  ArrowRight, 
  Plus,
  Lock,
  Clock,
  PhilippinePeso,
  Zap
} from "lucide-react";
import { ArchivedMeeting } from "@/types/meeting";
import { formatEchoDate } from "@/lib/dateUtils";

interface DashboardViewProps {
  meetings: ArchivedMeeting[];
  onOpenMeeting: (meetingId: string) => void;
  onNewMinutes: () => void;
}

function DatePickerInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  const dateInputRef = React.useRef<HTMLInputElement>(null);

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
        className="w-full text-xs bg-[#FFFCFB] border border-gray-200 rounded-none px-2 py-1 pr-7 focus:outline-none focus:border-[#C9AB4C]"
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
        <CalendarIcon size={13} />
      </button>
    </div>
  );
}

function getMeetingDurationMinutes(m: ArchivedMeeting): number {
  if (typeof m.duration_minutes === "number" && m.duration_minutes > 0) return m.duration_minutes;
  if (typeof m.duration_seconds === "number" && m.duration_seconds > 0) return Math.max(1, Math.round(m.duration_seconds / 60));
  // Estimate from start and end time if present
  const sm = (m as any).start_time;
  const em = (m as any).end_time;
  if (sm && em) {
    const [sh, smin] = sm.split(":").map(Number);
    const [eh, emin] = em.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(smin) && !isNaN(eh) && !isNaN(emin)) {
      const diff = (eh * 60 + emin) - (sh * 60 + smin);
      if (diff > 0) return diff;
    }
  }
  // Estimate from transcript word count (~130 wpm)
  if (m.transcript && m.transcript.trim().length > 0) {
    const words = m.transcript.trim().split(/\s+/).length;
    return Math.max(5, Math.round(words / 130));
  }
  return 30; // fallback reasonable default
}

export function DashboardView({
  meetings,
  onOpenMeeting,
  onNewMinutes,
}: DashboardViewProps) {
  // Date Filtering Mode: "all" | "specific" | "range"
  const [filterMode, setFilterMode] = useState<"all" | "specific" | "range">("all");
  const [specificDate, setSpecificDate] = useState<string>("2026-09-08");
  const [rangeStart, setRangeStart] = useState<string>("2026-09-01");
  const [rangeEnd, setRangeEnd] = useState<string>("2026-09-30");

  // Calendar month/year navigation state
  const [selectedMonth, setSelectedMonth] = useState(8); // 8 = September (0-indexed)
  const [selectedYear, setSelectedYear] = useState(2026);

  // Filter computation
  const filteredMeetings = meetings.filter((m) => {
    if (filterMode === "specific") {
      return m.date === specificDate;
    }
    if (filterMode === "range") {
      const matchStart = !rangeStart || m.date >= rangeStart;
      const matchEnd = !rangeEnd || m.date <= rangeEnd;
      return matchStart && matchEnd;
    }
    return true;
  });

  // Metrics computation based on active date filter
  const totalMeetings = filteredMeetings.length;

  // AI Compute Cost rates (in PHP)
  // Groq Whisper Large v3 Turbo: $0.04 / hr audio @ ~₱57/USD = ₱2.28 / hr
  // DeepSeek Chat Summarization: ~$0.0044 / hr transcript & output @ ~₱57/USD = ₱0.25 / hr
  const GROQ_WHISPER_TURBO_PHP_PER_HOUR = 2.28;
  const DEEPSEEK_SUMMARY_PHP_PER_HOUR = 0.25;
  const TOTAL_AI_PHP_PER_HOUR = GROQ_WHISPER_TURBO_PHP_PER_HOUR + DEEPSEEK_SUMMARY_PHP_PER_HOUR;

  const totalMinutes = filteredMeetings.reduce((acc, m) => acc + getMeetingDurationMinutes(m), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  const avgMinutes = totalMeetings > 0 ? Math.round(totalMinutes / totalMeetings) : 0;
  const formattedMeetingTime = totalHours > 0 ? `${totalHours}h ${remMinutes}m` : `${remMinutes}m`;

  const totalCostPhp = (totalMinutes / 60) * TOTAL_AI_PHP_PER_HOUR;
  const avgCostPerMeeting = totalMeetings > 0 ? totalCostPhp / totalMeetings : 0;

  // Calendar logic
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth, 1).getDay(); // 0 = Sun

  // Map meeting dates to check if a day has meetings
  const meetingDatesSet = new Set(
    meetings.map((m) => {
      const parts = m.date.split("-");
      if (parts.length === 3) {
        return `${parseInt(parts[0])}-${parseInt(parts[1]) - 1}-${parseInt(parts[2])}`;
      }
      return m.date;
    })
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header with Interactive Date / Date Range Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-gray-200/80">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#003366] italic">
            Executive Overview
          </h1>
          <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mt-0.5">
            Meeting Intelligence & Operational Cadence
          </p>
        </div>

        {/* Minimalist Date Selection */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#FFFCFB] p-0.5 rounded-none border border-gray-200 text-xs">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-all ${
                filterMode === "all"
                  ? "bg-[#FFFCFB] text-[#1b1d1e] shadow-2xs border-b border-[#C9AB4C]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("specific")}
              className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-all ${
                filterMode === "specific"
                  ? "bg-[#FFFCFB] text-[#1b1d1e] shadow-2xs border-b border-[#C9AB4C]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("range")}
              className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-all ${
                filterMode === "range"
                  ? "bg-[#FFFCFB] text-[#1b1d1e] shadow-2xs border-b border-[#C9AB4C]"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              Range
            </button>
          </div>

          {filterMode === "specific" && (
            <div className="w-32 animate-in fade-in duration-150">
              <DatePickerInput
                value={specificDate}
                onChange={(val) => setSpecificDate(val)}
                placeholder="YYYY-MM-DD"
              />
            </div>
          )}

          {filterMode === "range" && (
            <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
              <div className="w-28">
                <DatePickerInput
                  value={rangeStart}
                  onChange={(val) => setRangeStart(val)}
                  placeholder="Start"
                />
              </div>
              <span className="text-gray-400 text-xs font-mono">→</span>
              <div className="w-28">
                <DatePickerInput
                  value={rangeEnd}
                  onChange={(val) => setRangeEnd(val)}
                  placeholder="End"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Stat Metric Cards (Sharp edgy geometry) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: TOTAL MEETINGS */}
        <div className="bg-[#FFFCFB] border border-gray-200/90 p-5 rounded-none shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
              Total Meetings
            </span>
            <Building2 size={16} className="text-[#003366]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#003366]">{totalMeetings}</div>
        </div>

        {/* CARD 2: TOTAL MEETING TIME */}
        <div className="bg-[#FFFCFB] border border-gray-200/90 p-5 rounded-none shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
              Total Meeting Time
            </span>
            <Clock size={16} className="text-[#C9AB4C]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#003366]">{formattedMeetingTime}</div>
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-[#003366] bg-gray-100 px-1.5 py-0.5">
              Avg: {avgMinutes}m / meeting
            </span>
          </div>
        </div>

        {/* CARD 3: TOTAL MEETING COST */}
        <div className="bg-[#FFFCFB] border border-gray-200/90 p-5 rounded-none shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
              Total Meeting Cost
            </span>
            <PhilippinePeso size={16} className="text-[#C9AB4C]" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#003366]">
            ₱{totalCostPhp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-[#003366] bg-gray-100 px-1.5 py-0.5">
              Avg: ₱{avgCostPerMeeting.toFixed(2)} / meeting
            </span>
          </div>
        </div>

        {/* CARD 4: COST / HOUR */}
        <div className="bg-[#FFFCFB] border border-gray-200/90 p-5 rounded-none shadow-2xs">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-[10px] font-bold tracking-widest uppercase text-gray-500">
              Cost / Hour
            </span>
            <Zap size={16} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-serif font-bold text-[#003366]">
            ₱{TOTAL_AI_PHP_PER_HOUR.toFixed(2)} <span className="text-sm font-sans font-normal text-gray-500">/ hr</span>
          </div>
          <div className="mt-2">
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5">
              Blended AI rate
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Meetings (Left) & Calendar (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Recent Meetings List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest uppercase text-[#003366]">
              Recent Meetings {filterMode === "specific" ? `(Filtered: ${specificDate})` : filterMode === "range" ? `(Range: ${rangeStart} to ${rangeEnd})` : ""}
            </span>
            {filterMode !== "all" && (
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className="text-[11px] text-[#C9AB4C] hover:underline font-semibold"
              >
                Clear date filter
              </button>
            )}
          </div>

          <div className="space-y-3">
            {filteredMeetings.length > 0 ? (
              filteredMeetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="bg-[#FFFCFB] border border-gray-200/90 rounded-none p-5 shadow-2xs hover:border-[#C9AB4C]/80 transition-all group"
                >
                  <div className="flex items-start justify-between gap-4 mb-2.5">
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[#003366] group-hover:text-[#1b1d1e] transition-colors">
                        {meeting.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {meeting.is_confidential ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider flex items-center gap-1">
                            <Lock size={11} className="text-amber-800" /> Private
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-blue-50 text-[#003366] border border-blue-200 uppercase tracking-wider flex items-center gap-1">
                            <Users size={11} className="text-[#003366]" /> Shared
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                          {meeting.meeting_type}
                        </span>
                        <span className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                          <CalendarIcon size={12} className="text-gray-400" /> {formatEchoDate(meeting.date)}
                        </span>
                        {/* Duration & Cost Badges */}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-none bg-slate-100 text-[#003366] border border-slate-200 flex items-center gap-1" title="Meeting Duration">
                          <Clock size={10} className="text-[#C9AB4C]" /> {getMeetingDurationMinutes(meeting)}m
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-none bg-emerald-50 text-emerald-800 border border-emerald-200" title="Estimated AI Compute Cost">
                          ₱{((getMeetingDurationMinutes(meeting) / 60) * TOTAL_AI_PHP_PER_HOUR).toFixed(2)}
                        </span>
                        {meeting.location && (
                          <span className="text-xs text-gray-500">
                            • {meeting.location}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenMeeting(meeting.id)}
                      className="btn-outline !py-1.5 !px-3 !text-xs shrink-0 flex items-center gap-1.5 group-hover:bg-[#003366] group-hover:text-white group-hover:border-[#003366] transition-all rounded-none"
                    >
                      <span>Open Meeting Record</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* Executive Summary Paragraph */}
                  {meeting.summary && (
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 bg-[#FFFCFB]/70 p-3 rounded-none border border-gray-100 italic">
                      &ldquo;{meeting.summary}&rdquo;
                    </p>
                  )}

                  {/* Discussion count preview */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{meeting.items.length} Structured Discussion Point{meeting.items.length !== 1 ? "s" : ""}</span>
                    <span className="text-gray-400">
                      Attendees: {[...(meeting.attendees_prime || []), ...(meeting.attendees_external || [])].slice(0, 3).join(", ")}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-[#FFFCFB] border border-gray-200 rounded-none p-8 text-center text-gray-400 text-xs">
                No meetings found for the selected filter.
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 cols): Interactive Calendar (Clean, Ask Echo removed as requested) */}
        <div className="lg:col-span-5">
          <div className="bg-[#FFFCFB] border border-gray-200/90 rounded-none p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold tracking-widest uppercase text-[#003366]">
                Meeting Calendar
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-gray-700 mr-2">
                  {monthNames[selectedMonth]} {selectedYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 0) {
                      setSelectedMonth(11);
                      setSelectedYear(selectedYear - 1);
                    } else {
                      setSelectedMonth(selectedMonth - 1);
                    }
                  }}
                  className="p-1 hover:bg-[#FFFCFB] rounded-none text-gray-500 transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedMonth === 11) {
                      setSelectedMonth(0);
                      setSelectedYear(selectedYear + 1);
                    } else {
                      setSelectedMonth(selectedMonth + 1);
                    }
                  }}
                  className="p-1 hover:bg-[#FFFCFB] rounded-none text-gray-500 transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold tracking-wider text-gray-400 uppercase mb-2">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {/* Blank offset days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="h-9 flex items-center justify-center text-gray-300" />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                const hasMeeting = meetingDatesSet.has(`${selectedYear}-${selectedMonth}-${dayNum}`) || 
                                   meetings.some((m) => m.date === formattedDate);
                const isSelected = filterMode === "specific" && specificDate === formattedDate;
                const isInRange = filterMode === "range" && rangeStart && rangeEnd && formattedDate >= rangeStart && formattedDate <= rangeEnd;

                return (
                  <button
                    key={`day-${dayNum}`}
                    type="button"
                    onClick={() => {
                      if (hasMeeting) {
                        if (filterMode === "specific" && specificDate === formattedDate) {
                          setFilterMode("all");
                        } else {
                          setFilterMode("specific");
                          setSpecificDate(formattedDate);
                        }
                      }
                    }}
                    className={`h-9 rounded-none flex flex-col items-center justify-center relative transition-all ${
                      isSelected
                        ? "bg-[#003366] text-white font-bold shadow-xs"
                        : isInRange
                        ? "bg-[#C9AB4C]/25 text-[#003366] font-semibold border border-[#C9AB4C]/40"
                        : hasMeeting
                        ? "hover:bg-[#C9AB4C]/15 font-semibold text-[#003366] cursor-pointer"
                        : "text-gray-600 hover:bg-[#FFFCFB]"
                    }`}
                  >
                    <span>{dayNum}</span>
                    {hasMeeting && (
                      <span 
                        className={`w-1.5 h-1.5 rounded-none absolute bottom-1 ${
                          isSelected ? "bg-[#C9AB4C]" : "bg-[#C9AB4C]"
                        }`} 
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-none bg-[#C9AB4C]"></span>
                Dates with scheduled or recorded meetings
              </span>
              <span>Click date to filter</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
