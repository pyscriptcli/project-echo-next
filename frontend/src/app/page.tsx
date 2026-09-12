"use client";

import { useState, useEffect, useRef } from "react";
import { Stepper, Stage } from "@/components/Stepper";
import { StudioPanel } from "@/components/StudioPanel";
import { StudioRecoveryBanner } from "@/components/StudioRecoveryBanner";
import type { StudioNote, StudioDisplayMode } from "@/types/studio";
import { 
  processSource, 
  generateMinutes, 
  saveMeeting, 
  exportWord, 
  exportPdf,
  askEcho,
  fetchClickUpTasks,
  getStoredApiKey,
  setStoredApiKey,
  getStoredOpenAiKey,
  setStoredOpenAiKey,
  getStoredOpenRouterKey,
  setStoredOpenRouterKey,
  getStoredGeminiKey,
  setStoredGeminiKey,
  getStoredClickUpToken,
  setStoredClickUpToken,
  getStoredClickUpListId,
  setStoredClickUpListId,
  discoverClickUpLists,
  AudioTelemetry
} from "@/lib/api";
import { Sidebar, NavView } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { UniversalEchoDrawer } from "@/components/UniversalEchoDrawer";
import { DashboardView } from "@/components/DashboardView";
import { MeetingsView } from "@/components/MeetingsView";
import TasksView, { ClickUpTask } from "@/components/TasksView";
import { NotebookView } from "@/components/NotebookView";
import { MarketInsightsView } from "@/components/MarketInsightsView";
import { DemandsView } from "@/components/DemandsView";
import { QuickAddTaskModal } from "@/components/QuickAddTaskModal";
import { LoginView } from "@/components/LoginView";
import FormsPortal from "@/components/forms/FormsPortal";
import { ArchivedMeeting } from "@/types/meeting";
import { getLocalMeetings, saveLocalMeeting } from "@/lib/meetingsData";
import { formatEchoDate } from "@/lib/dateUtils";
import { 
  Upload, 
  X, 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  FileText, 
  CheckSquare,
  Download, 
  Loader2, 
  Sparkles, 
  MessageSquarePlus, 
  Edit3, 
  UserCheck, 
  ChevronRight,
  Mic,
  Square,
  Key,
  Save,
  Send,
  Maximize2,
  FileCheck,
  ArrowDownCircle,
  Calendar,
  Users,
  CheckCircle,
  CheckCircle2,
  Clock,
  ListOrdered,
  RotateCcw,
  Lock
} from "lucide-react";

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
        className="w-full border-b border-gray-300 py-1.5 pr-8 text-xs font-semibold text-gray-700 bg-transparent focus:outline-none focus:border-[#003366] transition-colors" 
        value={value} 
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} 
      />
      <div className="relative flex items-center">
        <button
          type="button"
          onClick={handleIconClick}
          className="text-gray-400 hover:text-[#003366] p-1 transition-colors"
          title="Open calendar date picker"
        >
          <Calendar size={15} />
        </button>
        <input 
          ref={dateInputRef}
          type="date" 
          tabIndex={-1}
          aria-hidden="true"
          className="absolute right-0 top-0 w-4 h-4 opacity-0 pointer-events-none"
          onChange={(e) => {
            if (e.target.value) {
              onChange(e.target.value);
            }
          }} 
        />
      </div>
    </div>
  );
}

export default function Home() {
  // ClickUp OAuth Authentication State
  const [authStatus, setAuthStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");
  const [authUser, setAuthUser] = useState<{
    id: number | string;
    username: string;
    email: string;
    color?: string;
    profilePicture?: string | null;
    initials?: string;
  } | null>(null);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAuthUser(data.user);
          setAuthStatus("authenticated");
          return;
        }
      }
    } catch (err) {
      console.error("[Auth] Check failed:", err);
    }
    setAuthStatus("unauthenticated");
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("[Auth] Logout failed:", err);
    }
    setAuthUser(null);
    setAuthStatus("unauthenticated");
    window.location.href = "/";
  };

  const [stage, setStage] = useState<Stage>("Input");
  const [missedTopics, setMissedTopics] = useState<Array<{ topic: string; quote: string; confidence?: string }>>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [isDiscoveringTopics, setIsDiscoveringTopics] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioMode, setStudioMode] = useState<StudioDisplayMode>("panel");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSpaceId, setArchiveSpaceId] = useState("");
  const [archiveSpaces, setArchiveSpaces] = useState<Array<{ id: string; name: string; teamName: string }>>([]);
  const [loadingArchiveSpaces, setLoadingArchiveSpaces] = useState(false);
  const [audioTelemetry, setAudioTelemetry] = useState<AudioTelemetry | null>(null);

  useEffect(() => {
    if (!isLoading) { setLoadingProgress(0); return; }
    setLoadingProgress(12);
    const timer = window.setInterval(() => setLoadingProgress((value) => Math.min(value + 8, 92)), 700);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!showArchiveModal) return;
    setLoadingArchiveSpaces(true);
    discoverClickUpLists().then((data) => setArchiveSpaces(data.spaces || [])).catch(() => setArchiveSpaces([])).finally(() => setLoadingArchiveSpaces(false));
  }, [showArchiveModal]);

  // System Key state
  const [apiKey, setApiKey] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [openaiKeyInput, setOpenaiKeyInput] = useState("");
  const [openrouterKeyInput, setOpenrouterKeyInput] = useState("");
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [clickupTokenInput, setClickupTokenInput] = useState("");
  const [clickupListIdInput, setClickupListIdInput] = useState("");
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);

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
      topic?: string;
      evidence?: string;
      discussionPointId?: string;
      existingTaskId?: string;
      existingTaskUrl?: string;
    };
    topicIndex?: number;
  }>({
    isOpen: false,
    data: {},
  });

  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setApiKey(key);
      setKeyInput(key);
    }
    setOpenaiKeyInput(getStoredOpenAiKey());
    setOpenrouterKeyInput(getStoredOpenRouterKey());
    setGeminiKeyInput(getStoredGeminiKey());
    setClickupTokenInput(getStoredClickUpToken());
    setClickupListIdInput(getStoredClickUpListId());
  }, []);

  const saveKey = () => {
    setStoredApiKey(keyInput.trim());
    setApiKey(keyInput.trim());
    setStoredOpenAiKey(openaiKeyInput.trim());
    setStoredOpenRouterKey(openrouterKeyInput.trim());
    setStoredGeminiKey(geminiKeyInput.trim());
    setStoredClickUpToken(clickupTokenInput.trim());
    setStoredClickUpListId(clickupListIdInput.trim());
    setShowKeyModal(false);
  };

  // Unified Meeting Source state
  const [sourceTab, setSourceTab] = useState<"source" | "record">("source");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pastedText, setPastedText] = useState("");
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [additionalMeetingNotes, setAdditionalMeetingNotes] = useState("");

  // Navigation Shell & View State
  const [currentView, setCurrentView] = useState<NavView>("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isUniversalEchoOpen, setIsUniversalEchoOpen] = useState(false);
  const [archivedMeetings, setArchivedMeetings] = useState<ArchivedMeeting[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Page Access Governance state
  const [allowedPages, setAllowedPages] = useState<NavView[]>([
    "dashboard",
    "tasks",
    "notebook",
    "market-insights",
    "demands",
    "meetings",
    "minutes",
    "forms",
  ]);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "forms" || view === "notebook" || view === "market-insights" || view === "demands") setCurrentView(view as NavView);
  }, []);

  // Fetch page governance and role access
  useEffect(() => {
    const refreshGovernance = () => {
      fetch("/api/forms/config")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data) return;
          setIsAdminUser(Boolean(data.isAdmin));
          if (Array.isArray(data.allowedPages) && data.allowedPages.length > 0) {
            setAllowedPages(data.allowedPages);
            const isOwner = authUser?.email?.toLowerCase() === "admin@primephilippines.com";
            if (!data.isAdmin && !isOwner) {
              setCurrentView((prev) => {
                if (prev === "forms-admin") return data.allowedPages[0] || "forms";
                if (!data.allowedPages.includes(prev)) {
                  return data.allowedPages[0] || "forms";
                }
                return prev;
              });
            }
          }
        })
        .catch(() => {});
    };

    refreshGovernance();
    window.addEventListener("echo-config-updated", refreshGovernance);
    return () => window.removeEventListener("echo-config-updated", refreshGovernance);
  }, [authUser]);

  const isPageAllowed = (view: NavView) => {
    if (authUser?.email?.toLowerCase() === "admin@primephilippines.com") return true;
    if (view === "forms-admin") return false;
    return allowedPages.includes(view);
  };

  const handleSelectView = (view: NavView) => {
    if (view === "forms-admin") {
      if (isAdminUser || authUser?.email?.toLowerCase() === "admin@primephilippines.com") {
        setCurrentView("forms-admin");
      }
      return;
    }
    if (isPageAllowed(view)) {
      setCurrentView(view);
    }
  };

  // Load and sync archives
  useEffect(() => {
    const local = getLocalMeetings();
    setArchivedMeetings(local);
    if (local.length > 0 && !selectedMeetingId) {
      setSelectedMeetingId(local[0].id);
    }

    fetch("/api/meetings")
      .then((res) => res.json())
      .then((data) => {
        if (data.meetings && Array.isArray(data.meetings) && data.meetings.length > 0) {
          setArchivedMeetings(data.meetings);
        }
      })
      .catch((err) => console.log("Meetings sync fallback:", err));
  }, []);

  // Universal Search Tasks State
  const [tasks, setTasks] = useState<ClickUpTask[]>([]);

  useEffect(() => {
    fetchClickUpTasks()
      .then((data) => {
        if (data.tasks && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
        }
      })
      .catch((e) => console.warn("Tasks prefetch for universal search:", e));
  }, [currentView]);

  // App Meeting Data
  const [transcript, setTranscript] = useState("");
  const [metadata, setMetadata] = useState<any>({
    date: new Date().toISOString().split("T")[0],
    start_time: "09:00",
    end_time: "10:00",
    meeting_type: "Internal",
    location: "GreatWork Mega Tower 32F - Secret Room",
    custom_location: "",
    client_name: "",
    prepared_by: "Dave Policarpio",
    prep_designation: "Executive Member",
    workspace: "",
    department: "",
    space_id: "",
    confirmed_by: "Client Rep or Lead",
    conf_designation: "Designation / Title"
  });

  // PRIME Team Attendees (Tag Chips)
  const [primeAttendees, setPrimeAttendees] = useState<string[]>(["Dave Policarpio"]);
  const [newPrimeAttendee, setNewPrimeAttendee] = useState("");

  // External Attendees (Tag Chips)
  const [externalAttendees, setExternalAttendees] = useState<string[]>([]);
  const [newExternalAttendee, setNewExternalAttendee] = useState("");

  // Review state
  const [momItems, setMomItems] = useState<any[]>([]);
  const [otherDiscussions, setOtherDiscussions] = useState("");
  const [showReviewAssist, setShowReviewAssist] = useState(true);

  // Handle Drag and Drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      handleUnifiedSourceSubmission(file);
    }
  };

  // PRIME Attendees chip handlers
  const addPrimeAttendee = () => {
    if (newPrimeAttendee.trim() && !primeAttendees.includes(newPrimeAttendee.trim())) {
      setPrimeAttendees([...primeAttendees, newPrimeAttendee.trim()]);
      setNewPrimeAttendee("");
    }
  };

  const removePrimeAttendee = (name: string) => {
    setPrimeAttendees(primeAttendees.filter((a) => a !== name));
  };

  // External Attendees chip handlers
  const addExternalAttendee = () => {
    if (newExternalAttendee.trim() && !externalAttendees.includes(newExternalAttendee.trim())) {
      setExternalAttendees([...externalAttendees, newExternalAttendee.trim()]);
      setNewExternalAttendee("");
    }
  };

  const removeExternalAttendee = (name: string) => {
    setExternalAttendees(externalAttendees.filter((a) => a !== name));
  };

  // Compute effective metadata including custom location and attendees lists
  const getEffectiveMetadata = () => {
    const effectiveLocation = metadata.location === "Other / Custom..."
      ? (metadata.custom_location?.trim() || "Custom Venue")
      : metadata.location;

    return {
      ...metadata,
      location: effectiveLocation,
      prime_attendees: primeAttendees.join(", "),
      external_attendees: externalAttendees.join(", ")
    };
  };

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  };

  // File Selection (Auto-processed immediately upon selection)
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      handleUnifiedSourceSubmission(file);
    }
  };

  // Unified submission: handles files (audio, pdf, docx, txt) OR direct pasted text
  const handleUnifiedSourceSubmission = async (fileOverride?: File, preparedTranscript?: string) => {
    const fileToUse = fileOverride || selectedFile;
    const hasFile = !!fileToUse;
    const hasText = pastedText.trim().length > 0;

    if (!hasFile && !hasText) {
      alert("Please upload a file (audio, document, PDF, text) or paste meeting text.");
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsStudioOpen(false);
    setIsLoading(true);
    setLoadingText("Analyzing source content...");

    try {
      const res = await processSource(
        preparedTranscript
          ? { text: preparedTranscript }
          : { file: fileToUse, text: !fileToUse && hasText ? pastedText : undefined },
        (status) => setLoadingText(status),
        abortController.signal
      );

      setTranscript(preparedTranscript || res.transcript || "");
      if (res.telemetry) {
        setAudioTelemetry(res.telemetry);
      }
      if (res.metadata) {
        setMetadata((prev: any) => ({
          ...prev,
          ...res.metadata,
          location: res.metadata.location && VENUE_OPTIONS.includes(res.metadata.location) 
            ? res.metadata.location 
            : prev.location
        }));
        if (res.metadata.attendees && Array.isArray(res.metadata.attendees)) {
          // Add newly discovered attendees
          const newExternals = res.metadata.attendees.filter(
            (a: string) => !primeAttendees.includes(a) && !externalAttendees.includes(a)
          );
          if (newExternals.length > 0) {
            setExternalAttendees((prev) => [...prev, ...newExternals]);
          }
        }
      }

      // Automatically synthesize minutes draft
      setLoadingText("Synthesizing structured Minutes of the Meeting...");
      const topics = "1. Project Updates\n2. Key Decisions\n3. Action Items";
      const momRes = await generateMinutes(
        preparedTranscript || res.transcript || pastedText,
        topics,
        additionalMeetingNotes
      );

      setMomItems(
        (momRes.matched_items || []).map((item: any, idx: number) => ({
          id: item.id || `dp_${Date.now()}_${idx}`,
          ...item,
        }))
      );
      setMissedTopics(Array.isArray(momRes.recommended_missed_points) ? momRes.recommended_missed_points.map((item: any) => ({ topic: item.topic || "Untitled topic", quote: item.quote || "", confidence: item.confidence })) : []);
      setOtherDiscussions(momRes.other_discussions || "");
      setStage("Review");
    } catch (err: any) {
      if (err?.name === "AbortError" || abortController.signal.aborted) {
        console.log("Audio processing aborted by user");
        return;
      }
      alert(`Source processing notice:\n\n${err.message}`);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendToNotetaker = (file: File, notes: StudioNote[], preparedTranscript?: string) => {
    setSelectedFile(file);
    if (notes && notes.length > 0) {
      setAdditionalMeetingNotes(notes.map((n) => `${n.timestamp} ${n.text}`).join("\n"));
    }
    setCurrentView("minutes");
    setStage("Input");
    setIsStudioOpen(false);
    setStudioMode("panel");
    handleUnifiedSourceSubmission(file, preparedTranscript);
  };

  const handleGenerateMinutes = async () => {
    const content = transcript || pastedText;
    if (!content) {
      alert("Please provide meeting audio, a document, or text first.");
      return;
    }
    setIsLoading(true);
    setLoadingText("Synthesizing structured minutes...");
    try {
      const topics = "1. Project Updates\n2. Next Steps";
      const res = await generateMinutes(content, topics, additionalMeetingNotes);
      setMomItems(
        (res.matched_items || []).map((item: any, idx: number) => ({
          id: item.id || `dp_${Date.now()}_${idx}`,
          ...item,
        }))
      );
      setOtherDiscussions(res.other_discussions || "");
      setStage("Review");
    } catch (err: any) {
      alert(`Synthesis notice:\n\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Review table operations
  const addRow = () => {
    setMomItems([
      ...momItems,
      {
        id: `dp_${Date.now()}_${momItems.length}`,
        topic_title: "",
        discussion_point: "",
        evidence_quote: "",
        action_plan: "None",
        indicative_delivery_date: new Date().toISOString().split("T")[0],
        person_in_charge: "Unassigned"
      }
    ]);
  };

  const removeRow = (index: number) => {
    setMomItems(momItems.filter((_, i) => i !== index));
  };

  const moveRow = (index: number, dir: number) => {
    if (index + dir < 0 || index + dir >= momItems.length) return;
    const newItems = [...momItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + dir];
    newItems[index + dir] = temp;
    setMomItems(newItems);
  };

  const addMissedTopic = () => {
    const suggestion = missedTopics[0];
    if (!suggestion) return;
    setMomItems([
      ...momItems,
      {
        topic_title: suggestion.topic,
        discussion_point: "Review this topic and complete the discussion details.",
        evidence_quote: suggestion.quote,
        action_plan: "None",
        indicative_delivery_date: "TBD",
        person_in_charge: "Unassigned"
      }
    ]);
    setMissedTopics((topics) => topics.slice(1));
  };

  const discoverTopics = async () => {
    if (!transcript || isDiscoveringTopics) return;
    setIsDiscoveringTopics(true);
    try {
      const response = await fetch("/api/discover-topics", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": getStoredApiKey() || "" }, body: JSON.stringify({ transcript, query: topicQuery, existingTopics: momItems.map((item) => item.topic_title) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to discover topics.");
      setMissedTopics(data.topics || []);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to discover topics.");
    } finally {
      setIsDiscoveringTopics(false);
    }
  };

  // Export handlers with effective metadata
  const handleExportWord = async () => {
    setIsLoading(true);
    setLoadingText("Generating Word Document (.docx)...");
    try {
      await exportWord(getEffectiveMetadata(), momItems, otherDiscussions);
    } catch (err: any) {
      alert("Failed to export Word document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setIsLoading(true);
    setLoadingText("Generating PDF (.pdf)...");
    try {
      await exportPdf(getEffectiveMetadata(), momItems, otherDiscussions);
    } catch (err: any) {
      alert("Failed to export PDF.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToDb = async () => {
    if (!metadata.space_id && !archiveSpaceId) { setShowArchiveModal(true); return; }
    setIsLoading(true);
    setLoadingText("Archiving meeting to ClickUp...");
    try {
      const res = await saveMeeting({ ...getEffectiveMetadata(), space_id: metadata.space_id || archiveSpaceId }, momItems, otherDiscussions, transcript);
      const effectiveMeta = getEffectiveMetadata();
      const newMeetingId = res.meeting_id || `MOM-${Date.now()}`;
      const newRecord: ArchivedMeeting = {
        id: newMeetingId,
        meeting_id: newMeetingId,
        title: effectiveMeta.client_name || "Executive Meeting",
        date: effectiveMeta.date || new Date().toISOString().split("T")[0],
        meeting_type: (effectiveMeta.meeting_type as any) || "Internal",
        location: effectiveMeta.location || "",
        attendees_prime: primeAttendees,
        attendees_external: externalAttendees,
        summary: otherDiscussions,
        items: momItems.map((item, idx) => ({
          id: item.id || `item-${idx}`,
          topic: item.topic_title || `Topic ${idx + 1}`,
          evidence: item.evidence_quote || "",
          discussion_point: item.discussion_point || "",
          action_plan: item.action_plan || "",
          target_date: item.indicative_delivery_date || "",
          person_in_charge: item.person_in_charge || "Unassigned"
        })),
        transcript: transcript,
        created_at: new Date().toISOString()
      };
      const updatedList = saveLocalMeeting(newRecord);
      setArchivedMeetings(updatedList);
      setSelectedMeetingId(newMeetingId);
      const target = res.clickup ? `\nWorkspace: ${res.clickup.workspace}\nDepartment: ${res.clickup.department}\nList: ${res.clickup.listName}\nTask: ${res.clickup.taskUrl || res.clickup.taskId}` : "";
      setShowArchiveModal(false); alert((res.message || "Successfully archived meeting in ClickUp!") + target);
    } catch (err: any) {
      alert(err?.message || "Unable to archive meeting in ClickUp.");
    } finally {
      setIsLoading(false);
    }
  };

  // Stage accessibility conditions
  const isReviewAllowed = !!transcript || pastedText.trim().length > 0 || momItems.length > 0;
  // Counts for the Review summary statistics
  const actionItemsCount = momItems.filter((i) => i.action_plan && i.action_plan !== "None").length;
  const assignedCount = momItems.filter((i) => i.person_in_charge && i.person_in_charge !== "Unassigned").length;

  // ClickUp Session Loading Gate
  if (authStatus === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF9F7]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="font-serif italic text-3xl font-semibold tracking-wide text-[#1b1d1e]">
              Echo
            </span>
            <span className="w-2 h-2 bg-[#C9AB4C]"></span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#003366]">
            <Loader2 className="w-4 h-4 animate-spin text-[#C9AB4C]" />
            <span>Verifying ClickUp Session...</span>
          </div>
        </div>
      </div>
    );
  }

  // ClickUp Authentication Gate
  if (authStatus === "unauthenticated") {
    return <LoginView onLoginSuccess={() => checkAuth()} />;
  }

  const loadingSteps = ["Getting your recording ready", "Transcribing the audio", "Finding the key details", "Preparing your meeting notes"];
  const loadingStepIndex = loadingText.toLowerCase().includes("synth") || loadingText.toLowerCase().includes("minutes") ? 3 : loadingText.toLowerCase().includes("metadata") || loadingText.toLowerCase().includes("details") ? 2 : loadingText.toLowerCase().includes("transcrib") ? 1 : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary font-sans text-[#1b1d1e]">
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#FFFCFB]/85 z-50 flex flex-col items-center justify-center backdrop-blur-xs">
          <div className="w-full max-w-sm px-6 py-7 bg-[#FFFCFB] border border-[#C9A84C]/50 shadow-lg">
            <div className="flex items-center gap-3 mb-6"><div className="w-9 h-9 rounded-full border-2 border-[#003366] border-t-transparent animate-spin" /><div><p className="text-base font-semibold text-[#003366]">Working on your meeting</p><p className="text-xs text-gray-500 mt-0.5">{loadingSteps[loadingStepIndex]}</p></div></div>
            <div className="space-y-3">{loadingSteps.map((step, index) => <div key={step} className="flex items-center gap-3 text-sm"><span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${index < loadingStepIndex ? "bg-green-600 text-white" : index === loadingStepIndex ? "bg-[#003366] text-white" : "border border-gray-300 text-gray-400"}`}>{index < loadingStepIndex ? "✓" : index + 1}</span><span className={index <= loadingStepIndex ? "text-[#003366]" : "text-gray-400"}>{step}</span></div>)}</div>
          </div>
          <button
            type="button"
            onClick={handleCancelProcessing}
            className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all rounded-none cursor-pointer"
          >
            Cancel Processing
          </button>
        </div>
      )}

      {showArchiveModal && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><div className="bg-[#FFFCFB] border border-gray-200 shadow-xl w-full max-w-md p-6"><h2 className="text-lg font-bold text-[#003366]">Choose ClickUp Space</h2><p className="text-sm text-gray-500 mt-2">Choose where Echo should find or create the department’s <b>Echo Meetings</b> list.</p><div className="mt-5 max-h-64 overflow-y-auto border border-gray-200">{loadingArchiveSpaces ? <div className="p-4 text-sm text-gray-500">Scanning your ClickUp Spaces…</div> : archiveSpaces.map((space) => <button key={space.id} onClick={() => setArchiveSpaceId(space.id)} className={`w-full text-left px-4 py-3 border-b border-gray-100 text-sm ${archiveSpaceId === space.id ? "bg-[#003366] text-white" : "hover:bg-[#FFFCFB]"}`}><div className="font-semibold">{space.name}</div><div className="text-xs opacity-70">{space.teamName}</div></button>)}{!loadingArchiveSpaces && archiveSpaces.length === 0 && <div className="p-4 text-sm text-gray-500">No accessible Spaces found.</div>}</div><div className="flex justify-end gap-2 mt-5"><button onClick={() => setShowArchiveModal(false)} className="btn-outline">Cancel</button><button onClick={handleSaveToDb} disabled={!archiveSpaceId} className="btn-primary">Archive meeting</button></div></div></div>}

      {showExportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="export-title">
          <div className="bg-[#FFFCFB] border border-gray-200 shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="export-title" className="text-lg font-serif italic font-semibold text-[#003366]">Export meeting minutes</h2>
                <p className="text-sm text-gray-500 mt-1">Choose your file type.</p>
              </div>
              <button type="button" onClick={() => setShowExportModal(false)} aria-label="Close export options" className="p-1 text-gray-500 hover:text-[#003366]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button type="button" onClick={() => { setShowExportModal(false); void handleExportWord(); }} className="border border-gray-200 px-4 py-6 hover:border-[#C9AB4C] transition-colors text-center">
                <FileText size={28} className="mx-auto text-[#C9AB4C] mb-2" />
                <span className="block text-sm font-semibold text-[#003366]">Word document</span>
                <span className="block text-xs text-gray-400 mt-1">.docx</span>
              </button>
              <button type="button" onClick={() => { setShowExportModal(false); void handleExportPdf(); }} className="border border-gray-200 px-4 py-6 hover:border-[#C9AB4C] transition-colors text-center">
                <Download size={28} className="mx-auto text-[#C9AB4C] mb-2" />
                <span className="block text-sm font-semibold text-[#003366]">PDF</span>
                <span className="block text-xs text-gray-400 mt-1">.pdf</span>
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Collapsible Sidebar (Deep Charcoal & Gold, Expanded by default) */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => handleSelectView(view)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        user={authUser}
        onSignOut={handleSignOut}
        allowedPages={allowedPages}
        isAdmin={isAdminUser}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Persistent Slim Topbar */}
        <Topbar
          meetings={archivedMeetings}
          tasks={tasks}
          onOpenUniversalEcho={() => setIsUniversalEchoOpen(true)}
          onSelectMeeting={(meetingId) => {
            if (isPageAllowed("meetings")) {
              setSelectedMeetingId(meetingId);
              setCurrentView("meetings");
            }
          }}
          onSelectTask={(taskId) => {
            if (isPageAllowed("tasks")) {
              setFocusedTaskId(taskId);
              setCurrentView("tasks");
            }
          }}
          onNewMeeting={() => {
            if (isPageAllowed("minutes")) {
              setCurrentView("minutes");
              setStage("Input");
            }
          }}
          onOpenStudio={() => {
            if (isPageAllowed("minutes")) {
              setIsStudioOpen(true);
              setStudioMode("panel");
              setIsUniversalEchoOpen(false);
            }
          }}
          onGoToNotetaker={() => {
            if (isPageAllowed("minutes")) {
              setCurrentView("minutes");
              setStage("Input");
            }
          }}
          onNavigateToPage={(page) => handleSelectView(page as NavView)}
          allowedPages={allowedPages as any}
          isAdmin={isAdminUser}
          studioRecording={{
            isMinimized: isStudioOpen && studioMode === "minimized",
            elapsedSeconds: 0,
            onRestore: () => {
              setIsStudioOpen(true);
              setStudioMode("panel");
            },
          }}
        />

        {/* Studio Recovery Banner for crash resilience */}
        <StudioRecoveryBanner />

        {/* Scrollable View Content (Maximized full width without big margin borders) */}
        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-5">
          {!isPageAllowed(currentView) ? (
            <div className="flex-1 flex items-center justify-center p-8 min-h-[400px]">
              <div className="max-w-md w-full bg-[#FFFCFB] border border-slate-200 p-8 text-center shadow-sm">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-600">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Access Restricted</h2>
                <p className="text-xs text-slate-600 mt-2">
                  Your account ({authUser?.email || "current user"}) does not have permission to access the <strong>{currentView.toUpperCase()}</strong> page.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Please contact your administrator to request access.
                </p>
                {allowedPages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSelectView(allowedPages[0])}
                    className="mt-6 px-4 py-2 bg-[#003366] text-white text-xs font-bold hover:bg-[#002244] transition-colors cursor-pointer"
                  >
                    Go to {allowedPages[0].toUpperCase()}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
          <div className="w-full pb-12">
            
            {/* VIEW 1: DASHBOARD */}
            {currentView === "dashboard" && (
              <DashboardView
                meetings={archivedMeetings}
                onOpenMeeting={(meetingId) => {
                  setSelectedMeetingId(meetingId);
                  setCurrentView("meetings");
                }}
                onNewMinutes={() => {
                  setCurrentView("minutes");
                  setStage("Input");
                }}
              />
            )}

            {/* VIEW: TASKS (CLICKUP PORTAL) */}
            {currentView === "tasks" && (
              <TasksView
                onNavigateToMeetings={() => setCurrentView("meetings")}
                onSelectMeeting={(meetingTitle) => {
                  const match = archivedMeetings.find((m) =>
                    m.title.toLowerCase().includes(meetingTitle.toLowerCase())
                  );
                  if (match) setSelectedMeetingId(match.id);
                  setCurrentView("meetings");
                }}
                focusedTaskId={focusedTaskId}
                onClearFocusedTask={() => setFocusedTaskId(null)}
              />
            )}

            {/* VIEW: CLICKUP DAILY LOG NOTEBOOK */}
            {currentView === "notebook" && (
              <NotebookView currentUserName={authUser?.username} />
            )}

            {currentView === "market-insights" && <MarketInsightsView />}
            {currentView === "demands" && <DemandsView sector={(new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("sector") as "retail" | "industrial" | null) || "all"} />}

            {/* VIEW 2: MEETINGS ARCHIVE */}
            {currentView === "meetings" && (
              <MeetingsView
                meetings={archivedMeetings}
                selectedMeetingId={selectedMeetingId}
                onSelectMeeting={(meetingId) => setSelectedMeetingId(meetingId)}
                onSelectMeetingSpace={async (spaceId) => {
                  const response = await fetch(`/api/meetings?spaceId=${encodeURIComponent(spaceId)}`);
                  const data = await response.json().catch(() => ({}));
                  if (!response.ok) { alert(data.error || "Unable to load meetings from the selected ClickUp Space."); return; }
                  setArchivedMeetings(data.meetings || []);
                  setSelectedMeetingId(data.meetings?.[0]?.id || null);
                }}
                onNavigateToTasks={(taskId) => {
                  setFocusedTaskId(taskId);
                  setCurrentView("tasks");
                }}
                onUpdateMeeting={async (updated, previousMeeting) => {
                  const response = await fetch("/api/meetings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ meeting: updated, previousMeeting }),
                  });
                  if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data.error || "Unable to save changes to ClickUp.");
                  }
                  const saved = saveLocalMeeting(updated);
                  setArchivedMeetings(saved);
                }}
                onNewMinutes={() => {
                  setCurrentView("minutes");
                  setStage("Input");
                }}
              />
            )}

            {/* VIEW 3: MINUTES GENERATOR */}
            {currentView === "minutes" && (
              <div className="flex flex-col h-full relative font-sans text-gray-800">
                {/* Header bar (Uniform text-2xl font-serif) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-gray-200/80 gap-4">
                  <div>
                    <h1 className="text-2xl font-serif font-bold text-[#003366] italic">Notetaker Workspace</h1>
                    <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mt-0.5">
                      Turn recordings, audio, documents, or text into structured meeting minutes.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {stage === "Input" && (
                      <button 
                        onClick={handleGenerateMinutes} 
                        disabled={!transcript && !pastedText.trim()}
                        className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5 rounded-none shadow-2xs"
                      >
                        <Sparkles size={14} />
                        <span>Generate Minutes</span>
                      </button>
                    )}
                    {stage === "Review" && (
                      <button onClick={() => setShowExportModal(true)} className="btn-primary !py-1.5 !px-4 !text-xs flex items-center gap-1.5 rounded-none shadow-2xs">
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stepper Navigation (Placed directly after workspace header) */}
                <div className="mb-4">
                  <Stepper 
                    currentStage={stage} 
                    onStageChange={setStage} 
                    isReviewAllowed={isReviewAllowed}
                  />
                </div>

      {/* STAGE 1: INPUT */}
      <div className="flex-1">
        {stage === "Input" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            
            {/* Left Panel: Meeting Source (Uniform bg-[#FFFCFB] rounded-none card) */}
            <div className="bg-[#FFFCFB] border border-gray-200/90 rounded-none p-4 shadow-2xs flex flex-col">
              <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-gray-100">
                <span className="font-serif font-bold text-base text-[#003366] italic">1. Meeting Source</span>
                {selectedFile && (
                  <button 
                    type="button"
                    onClick={() => handleUnifiedSourceSubmission()}
                    disabled={isLoading}
                    className="btn-primary !py-1 !px-2.5 !text-xs flex items-center gap-1.5 shadow-2xs shrink-0 rounded-none cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>Re-process File</span>
                  </button>
                )}
              </div>
              
              <div className="flex flex-col flex-1">
                
                {/* Source Navigation Tabs */}
                <div className="flex border-b border-gray-200 mb-4 gap-6">
                  <button 
                    type="button"
                    onClick={() => setSourceTab("source")}
                    className={`pb-2 font-bold text-[11px] tracking-widest uppercase transition-all ${
                      sourceTab === "source" 
                        ? "border-b-2 border-[#003366] text-[#003366]" 
                        : "text-gray-400 hover:text-[#003366]"
                    }`}
                  >
                    Upload File & Paste Text
                  </button>

                  <button 
                    type="button"
                    onClick={() => setSourceTab("record")}
                    className={`pb-2 font-bold text-[11px] tracking-widest uppercase transition-all ${
                      sourceTab === "record" 
                        ? "border-b-2 border-[#003366] text-[#003366]" 
                        : "text-gray-400 hover:text-[#003366]"
                    }`}
                  >
                    Record Live
                  </button>
                </div>

                {/* TAB 1: MERGED DRAG-AND-DROP UPLOAD & PASTE SOURCE */}
                {sourceTab === "source" && (
                  <div className="flex flex-col gap-3.5">
                    
                    {/* Drag-and-Drop Area (Auto-processes upon drop/selection) */}
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border border-dashed p-4 transition-all flex flex-col items-center justify-center text-center cursor-pointer rounded-none ${
                        isDragging 
                          ? "border-[#003366] bg-[#eef1f6] shadow-xs" 
                          : selectedFile
                            ? "border-green-600/40 bg-green-50/20"
                            : "border-gray-300 bg-[#FFFCFB] hover:border-[#003366]/50 hover:bg-[#FFFCFB]"
                      }`}
                    >
                      <input 
                        type="file" 
                        accept="audio/*,video/mp4,application/pdf,.docx,.doc,.txt,.srt,.vtt,text/plain" 
                        onChange={handleFileSelect} 
                        className="hidden" 
                        id="unified-file-upload" 
                      />

                      {!selectedFile ? (
                        <label htmlFor="unified-file-upload" className="cursor-pointer flex flex-col items-center w-full py-1">
                          <div className="w-9 h-9 rounded-none bg-[#003366]/5 flex items-center justify-center mb-2">
                            {isDragging ? (
                              <ArrowDownCircle size={22} className="text-[#003366] animate-bounce" />
                            ) : (
                              <Upload size={18} className="text-[#003366]" />
                            )}
                          </div>
                          <p className="text-xs font-bold text-[#003366] uppercase tracking-wide mb-0.5">
                            {isDragging ? "Drop your file here to process immediately" : "Drag and drop your meeting file here"}
                          </p>
                          <p className="text-[11px] text-gray-500 mb-2">
                            or <span className="text-[#003366] font-bold underline">Browse files</span> to automatically transcribe & generate
                          </p>
                          <div className="flex flex-wrap justify-center gap-1.5 text-[9px] text-gray-400 uppercase font-semibold">
                            <span className="bg-[#FFFCFB] border border-gray-200 px-1.5 py-0.5">Audio: MP3, WAV, M4A</span>
                            <span className="bg-[#FFFCFB] border border-gray-200 px-1.5 py-0.5">Documents: PDF, Word (.docx)</span>
                            <span className="bg-[#FFFCFB] border border-gray-200 px-1.5 py-0.5">Transcripts: TXT, SRT, VTT</span>
                          </div>
                        </label>
                      ) : (
                        <div className="w-full flex items-center justify-between bg-[#FFFCFB] border border-gray-200 p-2.5 shadow-2xs">
                          <div className="flex items-center gap-2.5 text-xs font-semibold text-[#003366] truncate text-left">
                            <FileCheck size={18} className="text-green-600 shrink-0" />
                            <div className="truncate">
                              <p className="truncate font-bold text-xs text-[#003366]">{selectedFile.name}</p>
                              <p className="text-gray-400 text-[10px]">
                                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Auto-processed
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <label htmlFor="unified-file-upload" className="text-[11px] font-bold text-[#003366] hover:underline cursor-pointer px-1.5 py-0.5">
                              Replace
                            </label>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1 hover:bg-[#FFFCFB] rounded-none cursor-pointer"
                              title="Remove file"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* OR Divider */}
                    <div className="relative flex items-center justify-center my-0.5">
                      <div className="border-t border-gray-200 w-full"></div>
                      <span className="bg-[#FFFCFB] px-2.5 text-[9px] uppercase font-bold tracking-widest text-gray-400 shrink-0">
                        OR PASTE TRANSCRIPT / TEXT
                      </span>
                      <div className="border-t border-gray-200 w-full"></div>
                    </div>

                    {/* Direct Text Paste Area */}
                    <div className="border border-gray-200 bg-[#FFFCFB] p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                          Paste Meeting Text / Notes / Transcript
                        </label>
                        {pastedText && (
                          <button 
                            type="button" 
                            onClick={() => setPastedText("")}
                            className="text-[10px] text-gray-400 hover:text-red-500 cursor-pointer"
                          >
                            Clear Text
                          </button>
                        )}
                      </div>
                      <textarea 
                        rows={3}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste raw transcript, meeting notes, chat logs, or key bullet points directly here..."
                        className="w-full border border-gray-200 p-2 text-xs bg-[#FFFCFB] focus:bg-[#FFFCFB] focus:outline-none focus:border-[#C9AB4C] transition-colors leading-relaxed rounded-none"
                      />
                      {pastedText.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleUnifiedSourceSubmission()}
                          disabled={isLoading}
                          className="mt-2.5 w-full btn-primary !py-1.5 !text-xs flex items-center justify-center gap-1.5 rounded-none cursor-pointer"
                        >
                          <Sparkles size={13} />
                          <span>Process Text & Generate Minutes</span>
                        </button>
                      )}
                    </div>

                  </div>
                )}

                {/* TAB 2: RECORD LIVE (Studio Mode Launcher) */}
                {sourceTab === "record" && (
                  <div className="border border-gray-200 bg-[#FFFCFB] p-8 flex flex-col items-center justify-center gap-4 text-center">
                    <div className="w-14 h-14 bg-[#003366]/5 border border-[#003366]/20 flex items-center justify-center text-[#003366]">
                      <Mic size={28} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#003366]">Record In-Person or Online Meetings</h3>
                      <p className="text-xs text-gray-500 mt-1 max-w-sm">
                        Use the crash-resilient Recording Studio with timestamped notes, live volume feedback, and tab/screen audio capture for online calls without Fireflies bots.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsStudioOpen(true);
                        setStudioMode("panel");
                        setIsUniversalEchoOpen(false);
                      }}
                      className="btn-primary !text-xs !py-2.5 !px-5 flex items-center gap-2 cursor-pointer"
                    >
                      <Mic size={14} className="text-[#C9A84C]" />
                      <span>Open Recording Studio</span>
                    </button>
                  </div>
                )}

                {/* Collapsible: Additional Meeting Notes */}
                <div className="mt-3.5 border border-gray-200 bg-[#FFFCFB]">
                  <div 
                    onClick={() => setIsNotesOpen(!isNotesOpen)}
                    className="p-3 flex justify-between items-center cursor-pointer hover:bg-[#FFFCFB] select-none transition-colors"
                  >
                    <span className="text-[10px] font-bold tracking-widest uppercase text-[#003366] flex items-center gap-1.5">
                      {isNotesOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      Additional Meeting Notes (Optional)
                    </span>
                    <span className="text-[10px] text-gray-400">{isNotesOpen ? "Hide" : "Expand"}</span>
                  </div>
                  
                  {isNotesOpen && (
                    <div className="p-3 border-t border-gray-100 bg-[#FFFCFB]">
                      <textarea 
                        rows={3}
                        value={additionalMeetingNotes}
                        onChange={(e) => setAdditionalMeetingNotes(e.target.value)}
                        placeholder="Add background notes, key announcements, agenda items, or specific instructions..."
                        className="w-full border border-gray-300 p-2 text-xs bg-[#FFFCFB] focus:outline-none focus:border-[#C9AB4C] leading-relaxed rounded-none"
                      />
                    </div>
                  )}
                </div>

                {/* Transcript Preview if available */}
                {transcript && (
                  <div className="mt-3.5 p-3 bg-[#FFFCFB] border border-gray-200">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#003366]">Secured Source Content</span>
                      <span className="text-[9px] text-green-600 font-bold bg-green-100 px-1.5 py-0.5">Ready for Review</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">
                      {transcript}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Right Panel: Meeting Information (Uniform bg-[#FFFCFB] rounded-none card) */}
            <div className="bg-[#FFFCFB] border border-gray-200/90 rounded-none p-4 shadow-2xs flex flex-col">
              <div className="flex justify-between items-center pb-2.5 mb-3 border-b border-gray-100">
                <span className="font-serif font-bold text-base text-[#003366] italic">
                  2. Meeting Information
                </span>
                {transcript && (
                  <button onClick={handleGenerateMinutes} className="btn-outline !py-1 !px-2.5 !text-[11px] rounded-none shadow-2xs flex items-center gap-1">
                    <Sparkles size={12} /> Re-Generate
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                
                {/* Date and Times */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date</label>
                    <input 
                      type="date" 
                      value={metadata.date || ""}
                      onChange={(e) => setMetadata({ ...metadata, date: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Start Time</label>
                    <input 
                      type="time" 
                      value={metadata.start_time || "09:00"}
                      onChange={(e) => setMetadata({ ...metadata, start_time: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">End Time</label>
                    <input 
                      type="time" 
                      value={metadata.end_time || "10:00"}
                      onChange={(e) => setMetadata({ ...metadata, end_time: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                    />
                  </div>
                </div>

                {/* Meeting Type & Venue */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Meeting Type</label>
                    <select 
                      value={metadata.meeting_type || "Internal"} 
                      onChange={(e) => setMetadata({ ...metadata, meeting_type: e.target.value })} 
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none cursor-pointer"
                    >
                      <option value="Internal">Internal</option>
                      <option value="External">External</option>
                      <option value="Team">Team Meeting</option>
                      <option value="Client Pitch">Client Pitch</option>
                      <option value="Board Meeting">Board Meeting</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Venue / Location</label>
                    <select 
                      value={metadata.location || VENUE_OPTIONS[0]} 
                      onChange={(e) => setMetadata({ ...metadata, location: e.target.value })} 
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none cursor-pointer"
                    >
                      {VENUE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>

                    {/* Custom Venue Input when Other / Custom... is selected */}
                    {metadata.location === "Other / Custom..." && (
                      <div className="mt-2">
                        <input 
                          type="text" 
                          placeholder="Enter custom venue name or address..."
                          value={metadata.custom_location || ""}
                          onChange={(e) => setMetadata({ ...metadata, custom_location: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-[#c9ab4c] outline-none transition-colors rounded-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Client / Project Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Client / Project / Company Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corp or Internal Project Echo" 
                    value={metadata.client_name || ""}
                    onChange={(e) => setMetadata({ ...metadata, client_name: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                  <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">ClickUp Workspace</label><input value={metadata.workspace || ""} onChange={(e) => setMetadata({ ...metadata, workspace: e.target.value })} placeholder="Workspace name" className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200" /></div>
                  <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Department</label><input value={metadata.department || ""} onChange={(e) => setMetadata({ ...metadata, department: e.target.value })} placeholder="e.g. CRD or IT" className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200" /></div>
                  <div><label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">ClickUp Space ID</label><input value={metadata.space_id || ""} onChange={(e) => setMetadata({ ...metadata, space_id: e.target.value })} placeholder="Required for archive" className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200" /></div>
                </div>

                {/* Team Attendees & External Attendees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  
                  {/* Team Attendees */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      Team Attendees
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#FFFCFB] border border-gray-200 min-h-[36px] items-center">
                      {primeAttendees.map((name) => (
                        <span key={name} className="bg-[#003366] text-[#c9ab4c] font-bold text-[11px] tracking-wider px-2 py-0.5 rounded-none flex items-center gap-1 shadow-2xs">
                          {name}
                          <X 
                            size={11} 
                            onClick={() => removePrimeAttendee(name)} 
                            className="cursor-pointer text-white hover:text-red-300" 
                          />
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          placeholder="+ Add Name"
                          value={newPrimeAttendee}
                          onChange={(e) => setNewPrimeAttendee(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addPrimeAttendee();
                            }
                          }}
                          className="text-[11px] py-0.5 px-1.5 border border-dashed border-gray-300 focus:outline-none focus:border-[#003366] w-20 bg-[#FFFCFB]"
                        />
                        <button type="button" onClick={addPrimeAttendee} className="text-xs text-[#003366] hover:bg-gray-200 p-0.5">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* External Attendees */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                      External Attendees
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-[#FFFCFB] border border-gray-200 min-h-[36px] items-center">
                      {externalAttendees.map((name) => (
                        <span key={name} className="bg-[#003366] text-white font-bold text-[11px] tracking-wider px-2 py-0.5 rounded-none flex items-center gap-1 shadow-2xs">
                          {name}
                          <X 
                            size={11} 
                            onClick={() => removeExternalAttendee(name)} 
                            className="cursor-pointer text-white hover:text-red-300" 
                          />
                        </span>
                      ))}
                      <div className="flex items-center gap-1">
                        <input 
                          type="text" 
                          placeholder="+ Add Name"
                          value={newExternalAttendee}
                          onChange={(e) => setNewExternalAttendee(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addExternalAttendee();
                            }
                          }}
                          className="text-[11px] py-0.5 px-1.5 border border-dashed border-gray-300 focus:outline-none focus:border-[#003366] w-20 bg-[#FFFCFB]"
                        />
                        <button type="button" onClick={addExternalAttendee} className="text-xs text-[#003366] hover:bg-gray-200 p-0.5">
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Prepared By & Confirmed By */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Prepared By</label>
                    <input 
                      type="text" 
                      value={metadata.prepared_by || "Dave Policarpio"}
                      onChange={(e) => setMetadata({ ...metadata, prepared_by: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Confirmed By</label>
                    <input 
                      type="text" 
                      value={metadata.confirmed_by || "Client Rep or Lead"}
                      onChange={(e) => setMetadata({ ...metadata, confirmed_by: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FFFCFB] border border-gray-200 focus:bg-[#FFFCFB] focus:border-[#C9AB4C] outline-none transition-colors rounded-none" 
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* STAGE 2: REVIEW (FULL WIDTH DISCUSSION POINTS MATRIX & ACTIONS) */}
        {stage === "Review" && (
          <div className="flex flex-col gap-5 w-full">
            
            {/* Audio Pipeline Telemetry Optimization Badge */}
            {audioTelemetry && (
              <div className="bg-[#003366]/5 border border-[#003366]/20 p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-none text-xs">
                <div className="flex items-center gap-2 text-[#003366]">
                  <Sparkles size={14} className="text-[#c9ab4c] shrink-0" />
                  <span className="font-bold">10-Layer Audio Pipeline:</span>
                  <span>
                    {audioTelemetry.originalDurationSec > 0 
                      ? `${Math.floor(audioTelemetry.originalDurationSec / 60)}m ${audioTelemetry.originalDurationSec % 60}s audio optimized to ${Math.floor(audioTelemetry.trimmedDurationSec / 60)}m ${audioTelemetry.trimmedDurationSec % 60}s (${audioTelemetry.percentDurationSaved}% silence removed)`
                      : "Loaded instant transcript from cache"}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-500 font-mono">
                  <span className="bg-[#FFFCFB] border border-gray-200 px-2 py-0.5">
                    {audioTelemetry.totalChunks} chunk{audioTelemetry.totalChunks !== 1 ? "s" : ""}
                    {audioTelemetry.cachedChunksReused > 0 ? ` (${audioTelemetry.cachedChunksReused} cached)` : ""}
                  </span>
                  <span>• {(audioTelemetry.processingTimeMs / 1000).toFixed(1)}s elapsed</span>
                </div>
              </div>
            )}

            {/* Dynamic missed-topic suggestions */}
            <div className="bg-[#FFFCFB] border border-[#c9ab4c]/40 p-3.5 shadow-2xs rounded-none">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-10 bg-[#c9ab4c] shrink-0"></div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#003366]">Potential Missed Topics</span>
                    <span className="text-[9px] bg-[#c9ab4c]/15 text-[#8c7329] font-bold px-1.5 py-0.5">AI Suggestion</span>
                  </div>
                  {missedTopics.length ? <><p className="text-xs font-bold text-[#003366]">{missedTopics[0].topic}</p><p className="text-[11px] text-gray-500 italic mt-0.5">{missedTopics[0].quote || "Echo found a topic worth reviewing."}</p></> : <p className="text-[11px] text-gray-500">No additional topics found yet. Ask Echo to look for a specific kind of topic.</p>}
                </div>
              </div>
              <button
                type="button" 
                onClick={addMissedTopic} 
                disabled={!missedTopics.length}
                className="btn-outline !py-1.5 !px-3.5 !text-xs shrink-0 flex items-center justify-center gap-1.5 rounded-none shadow-2xs"
              >
                <Plus size={13} /> Add to Discussion Matrix
              </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-[#c9ab4c]/20">
                <input value={topicQuery} onChange={(event) => setTopicQuery(event.target.value)} placeholder="Ask for a topic, e.g. risks or budget" className="flex-1 border border-gray-200 px-3 py-1.5 text-xs bg-[#FFFCFB] focus:outline-none focus:border-[#003366]" />
                <button type="button" onClick={discoverTopics} disabled={isDiscoveringTopics || !transcript} className="btn-primary !py-1.5 !px-3.5 !text-xs rounded-none">{isDiscoveringTopics ? "Looking…" : "Discover topics"}</button>
              </div>
            </div>

            {/* EXECUTIVE MINUTES MATRIX */}
            <div className="border border-[#003366]/20 bg-[#FFFCFB] shadow-2xs overflow-hidden rounded-none">
              
              {/* Header */}
              <div className="bg-[#003366] text-white px-5 py-3.5 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 bg-[#c9ab4c]"></div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em]">
                    Discussion Points & Action Items
                  </span>
                </div>
                <span className="text-[11px] text-gray-300 font-semibold tracking-wider uppercase">
                  {momItems.length} {momItems.length === 1 ? "Topic" : "Topics"}
                </span>
              </div>

              {/* Discussion Cards Container */}
              <div className="p-4 bg-[#FFFCFB] space-y-4">
                {momItems.length === 0 ? (
                  <div className="p-10 text-center bg-[#FFFCFB] border border-gray-200 rounded-none">
                    <p className="text-gray-500 text-xs mb-3">No minutes items generated yet.</p>
                    <button onClick={addRow} className="btn-primary !text-xs !py-1.5 !px-3 rounded-none">
                      <Plus size={13} className="inline mr-1" /> Add First Topic Manually
                    </button>
                  </div>
                ) : (
                  momItems.map((item, idx) => (
                    <div 
                      key={idx} 
                      className="p-4 bg-[#FFFCFB] border border-gray-200 shadow-2xs hover:border-[#003366]/40 transition-colors relative rounded-none"
                    >
                      {/* 1. TOPIC AS HEADER + MOVE/REMOVE BUTTONS */}
                      <div className="flex items-start justify-between gap-4 pb-2.5 border-b border-gray-100">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-[family-name:--font-bebas] text-xl text-[#c9ab4c] tracking-wider shrink-0 select-none">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="flex-1">
                            <input 
                              type="text" 
                              className="w-full font-serif text-base text-[#003366] font-bold italic bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#003366] focus:outline-none transition-colors py-0.5 rounded-none" 
                              value={item.topic_title || ""} 
                              placeholder="Topic title (e.g., Project Updates & Milestones)..."
                              onChange={(e) => {
                                const newItems = [...momItems];
                                newItems[idx].topic_title = e.target.value;
                                setMomItems(newItems);
                              }}
                            />
                          </div>
                        </div>

                        {/* Top-Right Move/Remove */}
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button 
                            type="button" 
                            onClick={() => moveRow(idx, -1)} 
                            disabled={idx === 0}
                            title="Move topic up"
                            className="p-1 border border-gray-200 bg-[#FFFCFB] hover:bg-[#003366] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-gray-500 rounded-none"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => moveRow(idx, 1)} 
                            disabled={idx === momItems.length - 1}
                            title="Move topic down"
                            className="p-1 border border-gray-200 bg-[#FFFCFB] hover:bg-[#003366] hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors text-gray-500 rounded-none"
                          >
                            <ChevronDown size={13} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => removeRow(idx)} 
                            title="Remove topic"
                            className="p-1 border border-gray-200 bg-[#FFFCFB] hover:bg-red-500 hover:text-white transition-colors text-gray-400 hover:border-red-500 rounded-none ml-0.5"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>

                      {/* 2. EVIDENCE SECTION */}
                      <div className="pt-2.5 pb-3">
                        <label className="block text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-1">
                          Evidence Quote / Context Reference
                        </label>
                        <AutoResizeTextarea
                          rows={2}
                          className="w-full border-l-2 border-[#c9ab4c] bg-[#FFFCFB] p-2 text-xs italic text-gray-700 focus:outline-none focus:bg-[#FFFCFB] focus:border-[#003366] transition-colors leading-relaxed rounded-none"
                          value={item.evidence_quote || ""}
                          placeholder='[00:00] Direct context or source reference quote...'
                          onChange={(e) => {
                            const newItems = [...momItems];
                            newItems[idx].evidence_quote = e.target.value;
                            setMomItems(newItems);
                          }}
                        />
                      </div>

                      {/* 3. ROW FOR DISCUSSION POINT, ACTION PLAN, TARGET DATE, PERSON IN CHARGE */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start pt-2.5 border-t border-gray-100">
                        
                        {/* Discussion Point */}
                        <div className="lg:col-span-5">
                          <label className="block text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">
                            Discussion Point
                          </label>
                          <AutoResizeTextarea
                            rows={3}
                            className="w-full border border-gray-200 p-2 text-xs bg-[#FFFCFB] text-gray-700 leading-relaxed focus:outline-none focus:border-[#C9AB4C] transition-colors shadow-2xs rounded-none"
                            value={item.discussion_point || ""}
                            placeholder="Detail discussions, key arguments, and conclusions..."
                            onChange={(e) => {
                              const newItems = [...momItems];
                              newItems[idx].discussion_point = e.target.value;
                              setMomItems(newItems);
                            }}
                          />
                        </div>

                        {/* Action Plan */}
                        <div className="lg:col-span-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[9px] font-bold tracking-widest uppercase text-gray-500">
                              Action Plan
                            </label>
                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-none ${
                              item.action_plan && item.action_plan !== "None"
                                ? "bg-[#003366] text-[#c9ab4c]"
                                : "bg-[#FFFCFB] text-gray-400"
                            }`}>
                              {item.action_plan && item.action_plan !== "None" ? "Action" : "Info"}
                            </span>
                          </div>
                          <AutoResizeTextarea
                            rows={3}
                            className="w-full border border-gray-200 p-2 text-xs bg-[#FFFCFB] text-gray-700 leading-relaxed focus:outline-none focus:border-[#C9AB4C] transition-colors shadow-2xs rounded-none"
                            value={item.action_plan || ""}
                            placeholder="Next steps or operational action..."
                            onChange={(e) => {
                              const newItems = [...momItems];
                              newItems[idx].action_plan = e.target.value;
                              setMomItems(newItems);
                            }}
                          />
                        </div>

                        {/* Target Date */}
                        <div className="lg:col-span-2">
                          <label className="block text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">
                            Target Date
                          </label>
                          <DatePickerInput
                            value={item.indicative_delivery_date || ""}
                            onChange={(val) => {
                              const newItems = [...momItems];
                              newItems[idx].indicative_delivery_date = val;
                              setMomItems(newItems);
                            }}
                          />
                          <span className="text-[9px] text-gray-400 mt-0.5 block">Pick or type date</span>
                        </div>

                        {/* Person in Charge */}
                        <div className="lg:col-span-2">
                          <label className="block text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">
                            Person in Charge
                          </label>
                          <div className="flex items-center gap-1.5 border border-gray-200 bg-[#FFFCFB] px-2 py-1.5 rounded-none">
                            <Users size={12} className="text-[#c9ab4c] shrink-0" />
                            <input 
                              type="text" 
                              className="w-full text-xs font-semibold text-gray-800 bg-transparent focus:outline-none" 
                              value={item.person_in_charge || ""} 
                              placeholder="e.g. Dave Policarpio"
                              onChange={(e) => {
                                const newItems = [...momItems];
                                newItems[idx].person_in_charge = e.target.value;
                                setMomItems(newItems);
                              }} 
                            />
                          </div>
                        </div>

                      </div>

                      {/* Quick Task Action Bar */}
                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-mono">
                          Topic #{idx + 1}
                        </span>
                        {item.clickUpTaskId ? (
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedTaskId(item.clickUpTaskId);
                              setCurrentView("tasks");
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 transition-colors shadow-2xs rounded-none cursor-pointer"
                            title="Already added to ClickUp. Click to view or edit in Tasks portal"
                          >
                            <CheckCircle2 size={13} className="text-emerald-600" />
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
                                      : item.topic_title || `Action from Topic #${idx + 1}`,
                                  description: item.discussion_point || "",
                                  topic: item.topic_title || "",
                                  evidence: item.evidence_quote || "",
                                  meetingTitle: metadata.client_name || "Executive Meeting",
                                  meetingDate: metadata.date,
                                  dueDate: item.indicative_delivery_date || "",
                                  priority: "normal",
                                  assigneeName: item.person_in_charge || "",
                                  discussionPointId: item.id || `dp_${idx + 1}`,
                                  existingTaskId: item.clickUpTaskId,
                                  existingTaskUrl: item.clickUpUrl,
                                },
                                topicIndex: idx,
                              });
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-[#003366] bg-[#FFFCFB] border border-[#003366]/30 hover:border-[#003366] hover:bg-blue-50/50 transition-colors shadow-2xs rounded-none cursor-pointer"
                          >
                            <CheckSquare size={13} className="text-[#c9ab4c]" />
                            <span>Add to Tasks</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Table / Card List Footer */}
              <div className="p-3.5 bg-[#FFFCFB] border-t border-gray-200 flex justify-between items-center">
                <button onClick={addRow} className="btn-primary !py-2 !px-4 text-xs rounded-none">
                  <Plus size={14} className="inline mr-1.5 -mt-0.5" /> Add Topic
                </button>
                <div className="flex items-center gap-2">
                  <button onClick={handleSaveToDb} className="btn-outline !py-2 !px-4 text-xs flex items-center gap-1.5 rounded-none">
                    <Save size={14} /> Archive to ClickUp
                  </button>
                  <button onClick={() => setShowExportModal(true)} className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 rounded-none">
                    <Download size={14} /> Export
                  </button>
                </div>
              </div>

            </div>

            {/* Other Discussions */}
            <div className="border border-gray-200 bg-[#FFFCFB] p-5 shadow-2xs rounded-none">
              <h3 className="text-lg font-serif text-[#003366] italic mb-1.5">Other Discussions & Peripheral Notes</h3>
              <p className="text-[11px] text-gray-500 mb-3">
                Summary of housekeeping topics, general announcements, administrative items, and non-action discussions.
              </p>
              <textarea 
                className="w-full border border-gray-200 p-3 text-xs bg-[#FFFCFB] focus:bg-[#FFFCFB] min-h-[100px] focus:outline-none focus:border-[#C9AB4C] transition-colors leading-relaxed shadow-2xs rounded-none" 
                value={otherDiscussions}
                onChange={(e) => setOtherDiscussions(e.target.value)}
                placeholder="Summary paragraph of all general discussions and administrative updates..."
              />
            </div>

          </div>
        )}

              </div>
            </div>
          )}
          </div>
          {(currentView === "forms" || currentView === "forms-admin") && (
            <FormsPortal initialTab={currentView === "forms-admin" ? "admin" : "track"} user={authUser ? { username: authUser.username, email: authUser.email } : null} />
          )}
            </>
          )}
        </main>
      </div>

      {/* Quick Add Task to ClickUp Modal */}
      <QuickAddTaskModal
        isOpen={quickAddTaskData.isOpen}
        onClose={() => setQuickAddTaskData({ isOpen: false, data: {} })}
        initialData={quickAddTaskData.data}
        onTaskCreated={(created) => {
          if (quickAddTaskData.topicIndex !== undefined) {
            const idx = quickAddTaskData.topicIndex;
            const updated = [...momItems];
            if (updated[idx]) {
              updated[idx].clickUpTaskId = created.id;
              updated[idx].clickUpUrl = created.url;
              setMomItems(updated);
            }
          }
        }}
        onOpenInTasks={(taskId) => {
          setFocusedTaskId(taskId);
          setCurrentView("tasks");
        }}
      />

      {/* Universal Slide-Over AI Assistant Drawer */}
      <UniversalEchoDrawer
        isOpen={isUniversalEchoOpen}
        onClose={() => setIsUniversalEchoOpen(false)}
        meetings={archivedMeetings}
        onOpenSource={(page, recordId, url) => {
          if (page === "meetings") setSelectedMeetingId(recordId);
          if (page === "tasks") setFocusedTaskId(recordId);
          if (["meetings", "tasks", "notebook", "forms", "demands", "market-insights"].includes(page)) setCurrentView(page as NavView);
          else if (url) window.open(url, "_blank", "noopener,noreferrer");
          setIsUniversalEchoOpen(false);
        }}
      />

      {/* Recording Studio Panel */}
      <StudioPanel
        isOpen={isStudioOpen}
        mode={studioMode}
        onChangeMode={setStudioMode}
        onClose={() => {
          setIsStudioOpen(false);
          setStudioMode("panel");
        }}
        onSendToNotetaker={handleSendToNotetaker}
      />
    </div>
  );
}
