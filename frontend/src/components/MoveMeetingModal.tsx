"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  FolderInput, 
  Lock, 
  Building2, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight
} from "lucide-react";
import { ArchivedMeeting } from "@/types/meeting";
import { fetchSpaceLists, moveMeetingArchive } from "@/lib/api";

interface MoveMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: ArchivedMeeting;
  onMeetingMoved: (updatedMeeting: any) => void;
  spaces: Array<{ id: string; name: string; teamName: string }>;
}

export function MoveMeetingModal({
  isOpen,
  onClose,
  meeting,
  onMeetingMoved,
  spaces,
}: MoveMeetingModalProps) {
  const [destinationType, setDestinationType] = useState<"team" | "personal">("team");
  
  // Team Destination State
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [spaceLists, setSpaceLists] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [loadingLists, setLoadingLists] = useState<boolean>(false);
  
  // Personal List State
  const [personalListId, setPersonalListId] = useState<string>("");
  const [personalListName, setPersonalListName] = useState<string>("");
  const [personalInput, setPersonalInput] = useState<string>("");
  const [isValidatingPersonal, setIsValidatingPersonal] = useState<boolean>(false);
  const [personalError, setPersonalError] = useState<string | null>(null);

  // Moving state
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load preferences and initial selection on open
  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setPersonalError(null);

    // Initial destination type based on current meeting confidentiality
    if (meeting.is_confidential) {
      setDestinationType("personal");
    } else {
      setDestinationType("team");
    }

    // Load Personal List preferences
    const storedPersonalId = typeof window !== "undefined" ? localStorage.getItem("project_echo_personal_list_id") || "" : "";
    const storedPersonalName = typeof window !== "undefined" ? localStorage.getItem("project_echo_personal_list_name") || "" : "";
    if (storedPersonalId) {
      setPersonalListId(storedPersonalId);
      setPersonalListName(storedPersonalName || "Personal List");
    }

    // Set initial space selection
    const initialSpace = spaces.find((s) => s.id === meeting.clickup_space_id) || spaces[0];
    if (initialSpace) {
      setSelectedSpaceId(initialSpace.id);
    }
  }, [isOpen, meeting, spaces]);

  // Fetch lists whenever selectedSpaceId changes
  useEffect(() => {
    if (!selectedSpaceId || destinationType !== "team") return;

    let isMounted = true;
    setLoadingLists(true);
    setSpaceLists([]);

    fetchSpaceLists(selectedSpaceId)
      .then((data) => {
        if (!isMounted) return;
        const lists: Array<{ id: string; name: string }> = data.lists || [];
        setSpaceLists(lists);

        // Check if there's a stored preference for this space
        const storedListId = typeof window !== "undefined" ? localStorage.getItem(`project_echo_space_list_${selectedSpaceId}`) : null;
        if (storedListId && lists.some((l) => l.id === storedListId)) {
          setSelectedListId(storedListId);
        } else if (meeting.clickup_list_id && lists.some((l) => l.id === meeting.clickup_list_id)) {
          setSelectedListId(meeting.clickup_list_id);
        } else if (lists.length > 0) {
          setSelectedListId(lists[0].id);
        } else {
          setSelectedListId("");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load lists for space:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingLists(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedSpaceId, destinationType, meeting.clickup_list_id]);

  const handleListSelect = (listId: string) => {
    setSelectedListId(listId);
    if (typeof window !== "undefined" && selectedSpaceId) {
      localStorage.setItem(`project_echo_space_list_${selectedSpaceId}`, listId);
    }
  };

  const handleSavePersonalList = async () => {
    if (!personalInput.trim()) return;
    setIsValidatingPersonal(true);
    setPersonalError(null);
    try {
      const res = await fetch("/api/clickup/validate-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: personalInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setPersonalError(data.error || "Unable to find or access this ClickUp list.");
        return;
      }

      setPersonalListId(data.list.id);
      setPersonalListName(data.list.name);
      setPersonalInput("");
      if (typeof window !== "undefined") {
        localStorage.setItem("project_echo_personal_list_id", data.list.id);
        localStorage.setItem("project_echo_personal_list_name", data.list.name);
      }

      // Persist to user preferences API
      fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            personal_list_id: data.list.id,
            personal_list_name: data.list.name,
          },
        }),
      }).catch(() => {});
    } catch (err: any) {
      setPersonalError(err.message || "Failed to validate personal list.");
    } finally {
      setIsValidatingPersonal(false);
    }
  };

  const handleConfirmMove = async () => {
    setErrorMsg(null);

    let targetListId = "";
    let targetSpaceId = "";
    let targetSpaceName = "";
    let targetListName = "";
    let isConfidential = false;

    if (destinationType === "personal") {
      if (!personalListId) {
        setErrorMsg("Please configure and select a personal list first.");
        return;
      }
      targetListId = personalListId;
      targetListName = personalListName || "Personal List";
      targetSpaceId = "__personal__";
      targetSpaceName = "Personal Workspace";
      isConfidential = true;
    } else {
      if (!selectedListId) {
        setErrorMsg("Please select a destination list.");
        return;
      }
      targetListId = selectedListId;
      targetSpaceId = selectedSpaceId;
      const spaceObj = spaces.find((s) => s.id === selectedSpaceId);
      targetSpaceName = spaceObj ? `${spaceObj.name} (${spaceObj.teamName})` : "";
      const listObj = spaceLists.find((l) => l.id === selectedListId);
      targetListName = listObj ? listObj.name : "";
      isConfidential = false;
    }

    if (targetListId === meeting.clickup_list_id) {
      setErrorMsg("The selected destination list is the same as the current list.");
      return;
    }

    setIsMoving(true);
    try {
      await moveMeetingArchive({
        meetingId: meeting.meeting_id || meeting.id,
        destinationListId: targetListId,
        sourceListId: meeting.clickup_list_id,
        isConfidential,
        destinationSpaceId: targetSpaceId,
        destinationSpaceName: targetSpaceName,
        destinationListName: targetListName,
      });

      const updatedRecord: ArchivedMeeting = {
        ...meeting,
        clickup_list_id: targetListId,
        clickup_list_name: targetListName,
        clickup_space_id: targetSpaceId,
        clickup_space_name: targetSpaceName,
        is_confidential: isConfidential,
      };

      onMeetingMoved(updatedRecord);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to relocate meeting archive.");
    } finally {
      setIsMoving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#FFFCFB] border border-[#003366]/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-[#003366] text-white">
          <div className="flex items-center gap-2.5">
            <FolderInput size={20} className="text-[#C9AB4C]" />
            <div>
              <h2 className="text-base font-serif font-bold text-white">
                Move Meeting Archive
              </h2>
              <p className="text-[11px] text-gray-300">
                Relocate #{meeting.meeting_id || meeting.id} to another ClickUp list
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-300 hover:text-white transition-colors p-1 cursor-pointer"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Current Location Badge */}
          <div className="p-3 bg-gray-50 border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-500 uppercase text-[10px] tracking-wider block">Current Location</span>
              <span className="font-medium text-[#003366]">
                {meeting.is_confidential ? "🔒 Personal List" : `${meeting.clickup_space_name || "Space"} → ${meeting.clickup_list_name || "List"}`}
              </span>
            </div>
            <ArrowRight size={16} className="text-gray-400" />
          </div>

          {/* Destination Type Toggle */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
              Destination Location
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDestinationType("team")}
                className={`flex items-center gap-2 p-3 border text-left transition-all cursor-pointer ${
                  destinationType === "team"
                    ? "border-[#003366] bg-[#003366]/5 font-semibold text-[#003366]"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Building2 size={16} className={destinationType === "team" ? "text-[#003366]" : "text-gray-400"} />
                <div>
                  <div className="text-xs">Team Space</div>
                  <div className="text-[10px] text-gray-400 font-normal">Department or Project List</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDestinationType("personal")}
                className={`flex items-center gap-2 p-3 border text-left transition-all cursor-pointer ${
                  destinationType === "personal"
                    ? "border-[#C9AB4C] bg-[#C9AB4C]/10 font-semibold text-[#003366]"
                    : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Lock size={16} className={destinationType === "personal" ? "text-[#C9AB4C]" : "text-gray-400"} />
                <div>
                  <div className="text-xs">Personal List</div>
                  <div className="text-[10px] text-gray-400 font-normal">Confidential & Private</div>
                </div>
              </button>
            </div>
          </div>

          {/* TEAM DESTINATION OPTIONS */}
          {destinationType === "team" && (
            <div className="space-y-3 bg-white p-4 border border-gray-200">
              {/* Space Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target ClickUp Space
                </label>
                <select
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  className="w-full bg-[#FFFCFB] border border-gray-300 px-3 py-2 text-xs text-[#003366] focus:outline-none focus:border-[#C9AB4C]"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.teamName}
                    </option>
                  ))}
                </select>
              </div>

              {/* List Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                  <span>Target List</span>
                  {loadingLists && (
                    <span className="flex items-center gap-1 text-[10px] text-[#003366]">
                      <Loader2 size={10} className="animate-spin" />
                      Loading lists...
                    </span>
                  )}
                </label>

                <select
                  value={selectedListId}
                  onChange={(e) => handleListSelect(e.target.value)}
                  disabled={loadingLists || spaceLists.length === 0}
                  className="w-full bg-[#FFFCFB] border border-gray-300 px-3 py-2 text-xs text-[#003366] focus:outline-none focus:border-[#C9AB4C] disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {spaceLists.length === 0 && !loadingLists && (
                    <option value="">No lists found in this space</option>
                  )}
                  {spaceLists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">
                  Your selection will be remembered as the default destination for this space.
                </p>
              </div>
            </div>
          )}

          {/* PERSONAL DESTINATION OPTIONS */}
          {destinationType === "personal" && (
            <div className="space-y-3 bg-[#C9AB4C]/5 p-4 border border-[#C9AB4C]/30">
              {personalListId ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#003366] flex items-center gap-1.5">
                      <CheckCircle size={14} className="text-green-600" />
                      Current Personal List:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setPersonalListId("");
                        setPersonalListName("");
                      }}
                      className="text-[10px] text-gray-400 hover:text-red-600 underline cursor-pointer"
                    >
                      Change List
                    </button>
                  </div>
                  <div className="p-2.5 bg-white border border-gray-200 text-xs font-medium text-[#003366]">
                    🔒 {personalListName} <span className="text-gray-400 font-mono text-[10px]">({personalListId})</span>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    Moving this meeting will mark it with the <span className="font-semibold text-[#003366]">&quot;private&quot;</span> tag and place it directly into your personal list.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-700">
                    Connect Personal List (List URL or ID)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={personalInput}
                      onChange={(e) => setPersonalInput(e.target.value)}
                      placeholder="e.g. https://app.clickup.com/9015.../v/li/901515..."
                      className="flex-1 bg-white border border-gray-300 px-3 py-1.5 text-xs text-[#003366] focus:outline-none focus:border-[#C9AB4C]"
                    />
                    <button
                      type="button"
                      onClick={handleSavePersonalList}
                      disabled={isValidatingPersonal || !personalInput.trim()}
                      className="btn-primary !px-3 !py-1.5 !text-xs whitespace-nowrap cursor-pointer"
                    >
                      {isValidatingPersonal ? <Loader2 size={12} className="animate-spin" /> : "Verify"}
                    </button>
                  </div>
                  {personalError && (
                    <p className="text-[10px] text-red-600 flex items-center gap-1">
                      <AlertCircle size={11} /> {personalError}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={isMoving}
            className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmMove}
            disabled={isMoving || (destinationType === "team" && !selectedListId) || (destinationType === "personal" && !personalListId)}
            className="btn-primary !px-5 !py-2 !text-xs flex items-center gap-2 cursor-pointer"
          >
            {isMoving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Relocating...</span>
              </>
            ) : (
              <>
                <FolderInput size={14} />
                <span>Confirm Move</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
