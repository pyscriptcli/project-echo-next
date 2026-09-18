"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  FileText,
  Download,
  Cloud,
  Plus,
  Users,
  Calendar,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Check,
  ChevronRight
} from "lucide-react";

export const VENUE_OPTIONS = [
  "GreatWork Mega Tower 32F - Secret Room",
  "GreatWork Mega Tower 32F - Small Meeting Room",
  "GreatWork Mega Tower 24F - Meeting Room",
  "GreatWork Mega Tower 32F - Board Room",
  "GreatWork Mega Tower 32F - Co-working",
  "Online Meeting",
  "Other / Custom..."
];

interface FinalizeMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: any;
  onUpdateMetadata: (updated: any) => void;
  primeAttendees: string[];
  onUpdatePrimeAttendees: (attendees: string[]) => void;
  externalAttendees: string[];
  onUpdateExternalAttendees: (attendees: string[]) => void;
  onExportWord: () => Promise<void>;
  onExportPdf: () => Promise<void>;
  onArchiveClickUp: (spaceId: string) => Promise<void>;
  archiveSpaces: Array<{ id: string; name: string; teamName: string }>;
  loadingArchiveSpaces: boolean;
  selectedSpaceId: string;
  onSelectSpaceId: (spaceId: string) => void;
  isProcessing: boolean;
  processingText: string;
  initialAction?: "export" | "archive" | "all";
  canExport?: boolean;
}

export function FinalizeMeetingModal({
  isOpen,
  onClose,
  metadata,
  onUpdateMetadata,
  primeAttendees,
  onUpdatePrimeAttendees,
  externalAttendees,
  onUpdateExternalAttendees,
  onExportWord,
  onExportPdf,
  onArchiveClickUp,
  archiveSpaces,
  loadingArchiveSpaces,
  selectedSpaceId,
  onSelectSpaceId,
  isProcessing,
  processingText,
  initialAction = "all",
  canExport = true
}: FinalizeMeetingModalProps) {
  const [newPrimeName, setNewPrimeName] = useState("");
  const [newExternalName, setNewExternalName] = useState("");
  const [titleError, setTitleError] = useState(false);
  const [activeTab, setActiveTab] = useState<"export" | "archive">("export");

  useEffect(() => {
    if (initialAction === "archive") {
      setActiveTab("archive");
    } else {
      setActiveTab("export");
    }
  }, [initialAction, isOpen]);

  if (!isOpen) return null;

  const validateTitle = (): boolean => {
    if (!metadata.client_name || !metadata.client_name.trim()) {
      setTitleError(true);
      return false;
    }
    setTitleError(false);
    return true;
  };

  const handleWordClick = async () => {
    if (!validateTitle()) return;
    await onExportWord();
  };

  const handlePdfClick = async () => {
    if (!validateTitle()) return;
    await onExportPdf();
  };

  const handleArchiveClick = async () => {
    if (!validateTitle()) return;
    if (!selectedSpaceId) return;
    await onArchiveClickUp(selectedSpaceId);
  };

  const handleAddPrime = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newPrimeName.trim();
    if (trimmed && !primeAttendees.includes(trimmed)) {
      onUpdatePrimeAttendees([...primeAttendees, trimmed]);
      setNewPrimeName("");
    }
  };

  const handleRemovePrime = (name: string) => {
    onUpdatePrimeAttendees(primeAttendees.filter((a) => a !== name));
  };

  const handleAddExternal = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newExternalName.trim();
    if (trimmed && !externalAttendees.includes(trimmed)) {
      onUpdateExternalAttendees([...externalAttendees, trimmed]);
      setNewExternalName("");
    }
  };

  const handleRemoveExternal = (name: string) => {
    onUpdateExternalAttendees(externalAttendees.filter((a) => a !== name));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finalize-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#FFFCFB] border border-[#003366]/20 shadow-2xl rounded-none text-[#181D1E] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 bg-[#FFFCFB] px-6 py-4 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 bg-[#C9A84C]" />
              <h2 id="finalize-modal-title" className="text-xl font-serif font-bold italic text-[#003366]">
                Finalize Meeting Minutes
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Verify meeting details to ensure accurate document headers and ClickUp records.
            </p>
          </div>
          {canExport && <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close modal"
            className="p-1 text-slate-400 hover:text-[#003366] transition-colors rounded-none disabled:opacity-40"
          >
            <X size={18} />
          </button>}
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Section: Meeting Details Verification */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-[#003366]/10">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#003366]">
                Meeting Details Verification
              </span>
              <span className="text-[10px] text-slate-400">Required for export & ClickUp</span>
            </div>

            {/* Title / Client Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Meeting Title / Client Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={metadata.client_name || ""}
                onChange={(e) => {
                  onUpdateMetadata({ ...metadata, client_name: e.target.value });
                  if (e.target.value.trim()) setTitleError(false);
                }}
                placeholder="e.g. Q3 Commercial Real Estate Strategy - Megaworld"
                className={`w-full text-xs px-3 py-2 bg-white border ${
                  titleError ? "border-red-500 ring-1 ring-red-400" : "border-slate-300 focus:border-[#C9A84C]"
                } rounded-none outline-none text-[#181D1E] shadow-2xs transition-colors`}
              />
              {titleError && (
                <p className="mt-1 text-[11px] text-red-600 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} /> Please enter a meeting title or client name before continuing.
                </p>
              )}
            </div>

            {/* Date, Type, Location 3-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Meeting Date */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Meeting Date
                </label>
                <input
                  type="date"
                  value={metadata.date || ""}
                  onChange={(e) => onUpdateMetadata({ ...metadata, date: e.target.value })}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 focus:border-[#C9A84C] rounded-none outline-none shadow-2xs"
                />
              </div>

              {/* Meeting Type */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Meeting Type
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(["Internal", "External", "Team"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onUpdateMetadata({ ...metadata, meeting_type: type })}
                      className={`text-[11px] font-semibold py-1.5 border transition-colors ${
                        metadata.meeting_type === type
                          ? "bg-[#003366] text-white border-[#003366]"
                          : "bg-white text-slate-600 border-slate-200 hover:border-[#003366]"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue / Location */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Location / Venue
                </label>
                <select
                  value={metadata.location || VENUE_OPTIONS[0]}
                  onChange={(e) => onUpdateMetadata({ ...metadata, location: e.target.value })}
                  className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 focus:border-[#C9A84C] rounded-none outline-none shadow-2xs truncate"
                >
                  {VENUE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Venue (if selected) */}
            {metadata.location === "Other / Custom..." && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Custom Location Details
                </label>
                <input
                  type="text"
                  value={metadata.custom_location || ""}
                  onChange={(e) => onUpdateMetadata({ ...metadata, custom_location: e.target.value })}
                  placeholder="Specify meeting venue or room"
                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-300 focus:border-[#C9A84C] rounded-none outline-none shadow-2xs"
                />
              </div>
            )}

            {/* Attendees Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* PRIME Attendees */}
              <div className="border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#003366] flex items-center gap-1.5">
                    <Users size={13} className="text-[#C9A84C]" /> PRIME Attendees ({primeAttendees.length})
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-100">
                  {primeAttendees.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No attendees added</span>
                  ) : (
                    primeAttendees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 px-2 py-0.5 text-slate-700 shadow-2xs"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemovePrime(name)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddPrime} className="flex gap-1">
                  <input
                    type="text"
                    value={newPrimeName}
                    onChange={(e) => setNewPrimeName(e.target.value)}
                    placeholder="Add team member..."
                    className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 focus:border-[#C9A84C] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newPrimeName.trim()}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#003366] text-white disabled:opacity-30 hover:bg-[#002244]"
                  >
                    <Plus size={13} />
                  </button>
                </form>
              </div>

              {/* External Attendees */}
              <div className="border border-slate-200 bg-white p-3 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#003366] flex items-center gap-1.5">
                    <Building2 size={13} className="text-[#C9A84C]" /> External Attendees ({externalAttendees.length})
                  </span>
                  {metadata.meeting_type === "External" && externalAttendees.length === 0 && (
                    <span className="text-[10px] text-amber-600 font-semibold">Recommended</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2 min-h-[32px] max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-100">
                  {externalAttendees.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">No external attendees</span>
                  ) : (
                    externalAttendees.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 text-[11px] bg-white border border-slate-200 px-2 py-0.5 text-slate-700 shadow-2xs"
                      >
                        {name}
                        <button
                          type="button"
                          onClick={() => handleRemoveExternal(name)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddExternal} className="flex gap-1">
                  <input
                    type="text"
                    value={newExternalName}
                    onChange={(e) => setNewExternalName(e.target.value)}
                    placeholder="Add client or guest..."
                    className="flex-1 text-xs px-2 py-1 bg-white border border-slate-200 focus:border-[#C9A84C] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newExternalName.trim()}
                    className="px-2.5 py-1 text-xs font-semibold bg-[#003366] text-white disabled:opacity-30 hover:bg-[#002244]"
                  >
                    <Plus size={13} />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Section: Destination & Action Hub */}
          <div className="pt-2 border-t border-slate-200">
            {/* Tabs for Action Focus */}
            <div className="flex border-b border-slate-200 mb-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "export"}
                onClick={() => setActiveTab("export")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "export"
                    ? "border-[#C9A84C] text-[#003366] bg-white"
                    : "border-transparent text-slate-400 hover:text-[#003366]"
                }`}
              >
                <Download size={14} /> Download Document (.docx / .pdf)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "archive"}
                onClick={() => setActiveTab("archive")}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "archive"
                    ? "border-[#C9A84C] text-[#003366] bg-white"
                    : "border-transparent text-slate-400 hover:text-[#003366]"
                }`}
              >
                <Cloud size={14} /> Save to ClickUp
              </button>
            </div>

            {/* Tab 1: Export Files */}
            {activeTab === "export" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-100">
                {/* Word Export Card */}
                <button
                  type="button"
                  onClick={handleWordClick}
                  disabled={isProcessing}
                  className="flex items-center gap-3.5 border border-slate-200 bg-white p-4 text-left hover:border-[#C9A84C] hover:bg-slate-50/50 transition-all shadow-2xs group disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-[#003366]/5 border border-[#003366]/15 flex items-center justify-center shrink-0 group-hover:bg-[#003366] group-hover:text-[#C9A84C] transition-colors text-[#003366]">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-[#003366]">Word Document</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Formatted .docx with official PRIME headers
                    </span>
                  </div>
                  <Download size={15} className="text-slate-400 group-hover:text-[#003366] shrink-0" />
                </button>

                {/* PDF Export Card */}
                <button
                  type="button"
                  onClick={handlePdfClick}
                  disabled={isProcessing}
                  className="flex items-center gap-3.5 border border-slate-200 bg-white p-4 text-left hover:border-[#C9A84C] hover:bg-slate-50/50 transition-all shadow-2xs group disabled:opacity-50"
                >
                  <div className="w-10 h-10 bg-[#003366]/5 border border-[#003366]/15 flex items-center justify-center shrink-0 group-hover:bg-[#003366] group-hover:text-[#C9A84C] transition-colors text-[#003366]">
                    <Download size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block text-xs font-bold text-[#003366]">PDF Document</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Executive board-ready PDF file (.pdf)
                    </span>
                  </div>
                  <Download size={15} className="text-slate-400 group-hover:text-[#003366] shrink-0" />
                </button>
              </div>
            )}

            {/* Tab 2: ClickUp Saving */}
            {activeTab === "archive" && (
              <div className="space-y-3 bg-white border border-slate-200 p-4 shadow-2xs animate-in fade-in duration-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[#003366]">Select Target ClickUp Space</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Echo will save the meeting into the selected department’s <b>Echo Meetings</b> list.
                    </p>
                  </div>
                  {loadingArchiveSpaces && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#003366] font-semibold">
                      <Loader2 size={12} className="animate-spin text-[#C9A84C]" /> Scanning Spaces…
                    </span>
                  )}
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 divide-y divide-slate-100">
                  {loadingArchiveSpaces ? (
                    <div className="p-4 text-center text-xs text-slate-400">Loading your ClickUp spaces...</div>
                  ) : archiveSpaces.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No accessible ClickUp spaces found.</div>
                  ) : (
                    archiveSpaces.map((space) => {
                      const isSelected = selectedSpaceId === space.id;
                      return (
                        <button
                          key={space.id}
                          type="button"
                          onClick={() => onSelectSpaceId(space.id)}
                          className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between text-xs transition-colors ${
                            isSelected
                              ? "bg-[#003366] text-white"
                              : "hover:bg-slate-50 text-slate-800"
                          }`}
                        >
                          <div>
                            <span className="font-semibold">{space.name}</span>
                            <span className={`block text-[10px] ${isSelected ? "text-slate-200" : "text-slate-400"}`}>
                              {space.teamName}
                            </span>
                          </div>
                          {isSelected && <Check size={14} className="text-[#C9A84C]" />}
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleArchiveClick}
                    disabled={!selectedSpaceId || isProcessing}
                    className="btn-primary !py-2 !px-5 text-xs flex items-center gap-2 rounded-none disabled:opacity-40"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 size={13} className="animate-spin text-[#C9A84C]" />
                        <span>{processingText || "Saving to ClickUp..."}</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={14} />
                        <span>Save to ClickUp</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 shrink-0">
          <span className="text-[10px] text-slate-400">
            PRIME Philippines • Minutes of the Meeting Engine
          </span>
          {canExport && <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            Close
          </button>}
        </div>
      </div>
    </div>
  );
}
