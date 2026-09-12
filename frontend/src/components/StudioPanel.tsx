"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Plus,
  Send,
  Square,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { StudioNote, StudioDisplayMode } from "@/types/studio";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { clearSession } from "@/lib/studioStorage";
import { askEcho } from "@/lib/api";
import type { AskEchoResponse } from "@/lib/ask-echo/schema";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StudioPanelProps {
  isOpen: boolean;
  mode: StudioDisplayMode;
  onChangeMode: (mode: StudioDisplayMode) => void;
  onClose: () => void;
  onSendToNotetaker: (file: File, notes: StudioNote[], preparedTranscript?: string) => void;
  onOpenSource?: (page: string, recordId: string, url?: string) => void;
}

interface EchoMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  response?: AskEchoResponse;
}

const ECHO_STORAGE_KEY = "echo_ask_conversation";
const ECHO_STARTER: EchoMessage = { role: "assistant", content: "Hi — I’m Echo. What would you like to get done today?", timestamp: "Just now" };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Volume Meter
// ─────────────────────────────────────────────────────────────────────────────

function VolumeMeter({ level, isClipping }: { level: number; isClipping: boolean }) {
  return (
    <div className="h-9 flex items-center gap-1" title={`Microphone level: ${level}%`} aria-label={`Microphone level ${level}%`}>
      {Array.from({ length: 24 }, (_, index) => {
        const active = level >= (index + 1) * (100 / 24);
        const height = 8 + ((index * 7) % 20);
        return <span key={index} className={`w-1 transition-all duration-75 ${active ? (isClipping ? "bg-red-500" : "bg-[#003366]") : "bg-slate-200"}`} style={{ height }} />;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recording Studio side panel with three display modes (panel, fullscreen, minimized).
 * Uses useStudioRecorder for crash-resilient recording and useAudioVisualizer
 * for live mic feedback.
 */
export function StudioPanel({
  isOpen,
  mode,
  onChangeMode,
  onClose,
  onSendToNotetaker,
  onOpenSource,
}: StudioPanelProps) {
  const recorder = useStudioRecorder();
  const liveTranscript = useLiveTranscription(recorder.audioStream);
  const visualizer = useAudioVisualizer(recorder.audioStream);

  // ── Notes State ────────────────────────────────────────────────────────
  const [notes, setNotes] = useState<StudioNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [meetingLink, setMeetingLink] = useState("");
  const [botStatus, setBotStatus] = useState("");
  const [isSendingBot, setIsSendingBot] = useState(false);
  const [captureMode, setCaptureMode] = useState<"meeting_link" | "device">("device");
  const [workspaceTab, setWorkspaceTab] = useState<"notes" | "echo">("notes");
  const [echoInput, setEchoInput] = useState("");
  const [echoMessages, setEchoMessages] = useState<EchoMessage[]>(() => {
    try {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(ECHO_STORAGE_KEY) : null;
      return stored ? JSON.parse(stored) : [ECHO_STARTER];
    } catch {
      return [ECHO_STARTER];
    }
  });
  const [openEchoSources, setOpenEchoSources] = useState<Record<number, boolean>>({});
  const [isEchoThinking, setIsEchoThinking] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);
  const echoEndRef = useRef<HTMLDivElement>(null);

  const addNote = useCallback(() => {
    const text = noteInput.trim();
    if (!text) return;
    const timestamp = `[${formatTime(recorder.elapsedSeconds)}]`;
    const note: StudioNote = {
      id: `note_${Date.now()}`,
      timestamp,
      text,
    };
    setNotes((prev) => [...prev, note]);
    setNoteInput("");
    setTimeout(() => notesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, [noteInput, recorder.elapsedSeconds]);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleClose = () => {
    if (recorder.status === "recording" || recorder.status === "paused") {
      setShowCloseConfirm(true);
      return;
    }
    onClose();
  };

  const handleSendToNotetaker = async () => {
    if (recorder.recordedFile && !isFinalizing) {
      setIsFinalizing(true);
      const preparedTranscript = await liveTranscript.finalize();
      onSendToNotetaker(recorder.recordedFile, notes, preparedTranscript || undefined);
      // Clean up IndexedDB session after successful handoff
      if (recorder.sessionId) {
        clearSession(recorder.sessionId).catch(() => {});
      }
      setNotes([]);
      setNoteInput("");
      liveTranscript.reset();
      recorder.reset();
      setIsFinalizing(false);
    }
  };

  const handleDiscard = () => {
    if (recorder.sessionId) {
      clearSession(recorder.sessionId).catch(() => {});
    }
    setNotes([]);
    setNoteInput("");
    liveTranscript.reset();
    recorder.reset();
  };

  const handleSaveRecording = () => {
    if (!recorder.recordedFile) return;
    const url = URL.createObjectURL(recorder.recordedFile);
    const link = document.createElement("a");
    link.href = url;
    link.download = recorder.recordedFile.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const sendEchoBot = async () => {
    if (!meetingLink.trim() || isSendingBot) return;
    setIsSendingBot(true);
    setBotStatus("");
    try {
      const response = await fetch("/api/meetstream/bots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ meetingLink }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Echo.ai could not join this meeting.");
      setBotStatus("Echo.ai is joining the meeting.");
      setMeetingLink("");
    } catch (error) {
      setBotStatus(error instanceof Error ? error.message : "Echo.ai could not join this meeting.");
    } finally {
      setIsSendingBot(false);
    }
  };

  const askFromStudio = async (prompt?: string) => {
    const question = (prompt || echoInput).trim();
    if (!question || isEchoThinking) return;
    setEchoInput("");
    setIsEchoThinking(true);
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const nextMessages = [...echoMessages, { role: "user" as const, content: question, timestamp }];
    setEchoMessages(nextMessages);
    try {
      const conversation = nextMessages.slice(1, -1).map(({ role, content }) => ({ role, content }));
      const response = await askEcho(question, conversation);
      setEchoMessages((current) => [...current, { role: "assistant", content: response.answer, response, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } catch (error) {
      setEchoMessages((current) => [...current, { role: "assistant", content: error instanceof Error ? error.message : "Echo couldn’t answer right now.", timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    } finally {
      setIsEchoThinking(false);
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = sessionStorage.getItem(ECHO_STORAGE_KEY);
      if (stored) setEchoMessages(JSON.parse(stored));
    } catch {}
  }, [isOpen]);

  React.useEffect(() => {
    try {
      sessionStorage.setItem(ECHO_STORAGE_KEY, JSON.stringify(echoMessages));
      window.dispatchEvent(new CustomEvent("echo-conversation-updated", { detail: echoMessages }));
    } catch {}
    echoEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [echoMessages, isEchoThinking]);

  const renderEchoInline = (message: EchoMessage, text: string, lineKey: string) => text.split(/(\[\d+\])/g).map((part, index) => {
    const match = part.match(/^\[(\d+)\]$/);
    if (!match) return <React.Fragment key={index}>{part}</React.Fragment>;
    const number = Number(match[1]);
    const citation = message.response?.citations?.find((item) => item.marker === `[${number}]`) || message.response?.citations?.[number - 1];
    const source = citation ? message.response?.sources.find((item) => item.sourceId === citation.sourceId) : message.response?.sources[number - 1];
    return <button key={`${lineKey}-${index}`} type="button" disabled={!source} onClick={() => source && onOpenSource?.(source.page || "meetings", source.meetingId, source.url)} className="align-super mx-0.5 text-[10px] font-semibold text-[#003366] underline decoration-[#C9A84C] underline-offset-2 disabled:cursor-default">[{number}]</button>;
  });

  const renderEchoAnswer = (message: EchoMessage) => message.content.split("\n").map((line, index) => {
    const cleaned = line.replace(/\*\*/g, "").trim();
    if (!cleaned) return <div key={index} className="h-2" />;
    const bullet = /^[-•]\s/.test(cleaned);
    const content = bullet ? cleaned.replace(/^[-•]\s*/, "") : cleaned;
    return <div key={index} className={bullet ? "flex gap-2 pl-1" : ""}>{bullet && <span className="text-[#C9A84C]">•</span>}<span>{renderEchoInline(message, content, String(index))}</span></div>;
  });

  const isRecordingActive = recorder.status === "recording" || recorder.status === "paused";
  const isStopped = recorder.status === "stopped" && recorder.recordedFile !== null;

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent("echo-recording-state", { detail: { active: isRecordingActive, paused: recorder.status === "paused", elapsedSeconds: recorder.elapsedSeconds } }));
  }, [isRecordingActive, recorder.status, recorder.elapsedSeconds]);

  // ── Don't render if not open or minimized ──────────────────────────────
  if (!isOpen || mode === "minimized") return null;

  // ── Layout classes based on mode ───────────────────────────────────────
  const isFullscreen = mode === "fullscreen";
  const panelClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-[#F7F9FC] flex flex-col"
    : "fixed right-0 inset-y-0 z-50 w-full max-w-xl bg-[#F7F9FC] border-l border-[#D9E1EA] shadow-2xl flex flex-col";

  return (
    <>
      {/* Backdrop (panel mode only) */}
      {!isFullscreen && (
        <button
          aria-label="Close Recording Studio"
          onClick={handleClose}
          className="fixed inset-0 z-40 bg-[#003366]/30 backdrop-blur-[2px]"
        />
      )}

      <section aria-label="Recording Studio" className={panelClasses}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="min-h-16 px-6 bg-[#003366] text-[#FFFCFB] flex items-center justify-between border-b border-[#C9A84C] shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`relative flex h-8 w-8 items-center justify-center rounded-full ${isRecordingActive ? "bg-red-500/15" : "bg-white/10"}`}>
              <Mic size={17} className={isRecordingActive ? "text-red-300" : "text-[#C9A84C]"} />
              {isRecordingActive && <span className="absolute inset-0 rounded-full border border-red-300/60 animate-ping" />}
            </span>
            <div>
              <h2 className="text-base font-semibold leading-tight tracking-tight">Meeting studio</h2>
              {isRecordingActive && (
                  <p className="text-[11px] text-[#FFFCFB]/70 tracking-wide">
                  {recorder.status === "paused" ? "Paused" : "Recording"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangeMode(isFullscreen ? "panel" : "fullscreen")}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              className="p-2 hover:bg-[#174778] transition-colors"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              title="Close"
              className="p-2 hover:bg-[#174778] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* ── Content ─────────────────────────────────────────────────── */}
        <div className={`flex-1 overflow-hidden flex ${isFullscreen ? "flex-row" : "flex-col"}`}>

          {/* ── Left / Top: Recording Controls ────────────────────────── */}
          <div className={`${isFullscreen ? "w-1/2 border-r border-[#D9E1EA]" : ""} p-6 flex flex-col gap-5 shrink-0`}>
            {recorder.status === "idle" && (
              <div className="border border-[#D9E1EA] bg-white px-4 py-3 rounded-lg text-sm leading-relaxed text-slate-600 shadow-sm">
                <strong className="text-[#003366]">Choose how to capture</strong>
                <p className="text-xs mt-1">Use Echo.ai for a meeting link, or record locally for an in-person meeting.</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button type="button" onClick={() => setCaptureMode("meeting_link")} className={`px-3 py-2.5 rounded-md text-xs font-semibold border transition-colors ${captureMode === "meeting_link" ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-[#003366] border-slate-200 hover:border-[#003366]"}`}>Meeting link</button>
                  <button type="button" onClick={() => setCaptureMode("device")} className={`px-3 py-2.5 rounded-md text-xs font-semibold border transition-colors ${captureMode === "device" ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-[#003366] border-slate-200 hover:border-[#003366]"}`}>Record on this device</button>
                </div>
              </div>
            )}

            {recorder.status === "idle" && captureMode === "meeting_link" && (
              <div className="border border-[#C9D8E8] bg-white px-4 py-4 rounded-lg shadow-sm">
                <p className="text-xs font-semibold tracking-tight text-[#003366]">Join with Echo.ai</p>
                <p className="text-xs text-gray-500 mt-1">Paste a Zoom, Google Meet, or Teams link and Echo.ai will join for you.</p>
                <div className="flex gap-2 mt-2">
                  <input value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)} placeholder="Paste a meeting link" className="min-w-0 flex-1 border border-slate-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#C9A84C]" />
                  <button type="button" onClick={sendEchoBot} disabled={isSendingBot || !meetingLink.trim()} className="btn-primary !py-2 !px-4 !text-xs rounded-md">{isSendingBot ? "Joining…" : "Join"}</button>
                </div>
                {botStatus && <p className="text-[11px] text-[#003366] mt-2" role="status">{botStatus}</p>}
              </div>
            )}

            {/* Mic Selector */}
            {recorder.status === "idle" && captureMode === "device" && (
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Microphone
                </label>
                <div className="relative">
                  <select
                    value={recorder.selectedDeviceId || ""}
                    onChange={(e) => recorder.selectDevice(e.target.value)}
                    className="w-full border border-slate-200 bg-white text-sm text-[#181D1E] px-3 py-2.5 pr-8 appearance-none rounded-md focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="">System Default</option>
                    {recorder.availableDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.slice(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Recording Control Button */}
            <div className="flex flex-col items-center gap-3">
              {recorder.status === "idle" && captureMode === "device" && (
                <button
                  type="button"
                  onClick={() => void recorder.start()}
                  className="w-24 h-24 flex items-center justify-center rounded-full border-4 border-[#003366] bg-white text-[#003366] hover:bg-[#003366]/5 hover:scale-[1.02] transition-all shadow-sm"
                >
                  <Mic size={40} />
                </button>
              )}

              {recorder.status === "recording" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={recorder.pause}
                    className="w-14 h-14 flex items-center justify-center border-2 border-amber-500 bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"
                    title="Pause recording"
                  >
                    <Pause size={24} />
                  </button>
                  <button
                    type="button"
                    onClick={recorder.stop}
                    className="w-14 h-14 flex items-center justify-center border-2 border-red-500 bg-red-50 text-red-500 hover:bg-red-100 transition-all animate-pulse"
                    title="Stop recording"
                  >
                    <Square size={24} className="fill-current" />
                  </button>
                </div>
              )}

              {recorder.status === "paused" && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={recorder.resume}
                    className="w-14 h-14 flex items-center justify-center border-2 border-green-500 bg-green-50 text-green-600 hover:bg-green-100 transition-all"
                    title="Resume recording"
                  >
                    <Play size={24} className="fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={recorder.stop}
                    className="w-14 h-14 flex items-center justify-center border-2 border-red-500 bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                    title="Stop recording"
                  >
                    <Square size={24} className="fill-current" />
                  </button>
                </div>
              )}

              {isStopped && (
                <div className="w-full flex flex-col items-center gap-3">
                  <div className="text-sm font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 text-center w-full">
                    ✓ Recording complete — {formatTime(recorder.elapsedSeconds)}
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      type="button"
                      onClick={handleSendToNotetaker}
                      disabled={isFinalizing}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0c0c0e] text-white font-semibold py-2.5 px-4 border border-[#C9A84C] text-xs hover:bg-[#1a1a1e] transition-colors"
                    >
                      <Send size={13} />
                      {isFinalizing ? "Finishing…" : "Send to Notetaker"}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveRecording}
                      className="inline-flex items-center justify-center gap-1.5 bg-[#FFFCFB] text-[#003366] font-semibold py-2.5 px-3 border border-[#003366]/30 text-xs hover:border-[#C9A84C] transition-colors"
                    >
                      <Download size={13} />
                      Save recording
                    </button>
                    <button
                      type="button"
                      onClick={handleDiscard}
                      className="inline-flex items-center justify-center gap-1 bg-transparent text-gray-600 font-semibold py-2.5 px-3 border border-gray-300 text-xs hover:text-red-600 hover:border-red-300 transition-colors"
                    >
                      <Trash2 size={13} />
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Timer */}
            {isRecordingActive && (
              <div className="text-center bg-white border border-slate-200 border-t-2 border-t-[#C9A84C] px-8 py-4 shadow-sm">
                <span className={`text-2xl font-mono font-bold tabular-nums ${recorder.status === "paused" ? "text-amber-600" : "text-red-600"}`}>
                  {formatTime(recorder.elapsedSeconds)}
                </span>
                <p className={`text-[11px] font-semibold tracking-wide mt-1 ${recorder.status === "paused" ? "text-amber-600" : "text-red-500"}`}>
                  {recorder.status === "paused" ? "Paused" : "Recording"}
                </p>
              </div>
            )}

            {(isRecordingActive || isStopped) && (
              <div className="text-center text-xs text-[#003366]/70">
                {liveTranscript.status === "waiting" ? "Some audio will be finished when you send it." : liveTranscript.status === "processing" ? "Keeping your notes ready…" : liveTranscript.status === "ready" ? "Ready for Notetaker" : "Recording and keeping your notes ready"}
              </div>
            )}

            {/* Volume Meter */}
            {isRecordingActive && recorder.status === "recording" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                  Mic Level
                </label>
                <VolumeMeter level={visualizer.volumeLevel} isClipping={visualizer.isClipping} />
              </div>
            )}

            {/* Status text for idle */}
            {recorder.status === "idle" && (
              <p className="text-xs text-gray-500 text-center">
                Click the mic to start. Echo will check that meeting audio is included before recording.
              </p>
            )}

            {/* Error display */}
            {recorder.error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                {recorder.error}
              </div>
            )}

            {recorder.captureIssue && (
              <div role="alert" className="border border-amber-300 border-l-4 border-l-[#C9A84C] bg-amber-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-[#003366]">{recorder.captureIssue === "missing_shared_audio" ? "Meeting audio wasn’t shared" : "Nothing was shared"}</p>
                <p className="mt-1 text-xs leading-relaxed">Choose again and turn on the audio option in the browser window. Recording has not started.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void recorder.start()} className="bg-[#003366] px-3 py-2 text-xs font-semibold text-white">Choose again</button>
                  <button type="button" onClick={() => void recorder.start({ microphoneOnly: true })} className="border border-[#003366]/30 bg-white px-3 py-2 text-xs font-semibold text-[#003366]">Use microphone only</button>
                </div>
              </div>
            )}

            {isFullscreen && (
              <div className="mt-1 border-t border-slate-200 pt-5 flex flex-col min-h-0 flex-1">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div><h3 className="text-sm font-semibold text-[#003366]">Live notes</h3><p className="text-[11px] text-slate-500 mt-0.5">Your words stay natural; Echo keeps the exact time.</p></div>
                  <span className="text-[10px] text-slate-400">{notes.length} {notes.length === 1 ? "note" : "notes"}</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {notes.length === 0 && <div className="border border-dashed border-slate-300 bg-white/60 p-5 text-center"><p className="text-sm font-medium text-slate-600">Capture the moments that matter</p><p className="text-xs text-slate-400 mt-1">Add a decision, follow-up, question, or observation.</p></div>}
                  {notes.map((note) => <div key={note.id} className="group flex items-start gap-3 border border-slate-200 bg-white px-3.5 py-3 shadow-sm"><span className="text-[#003366] font-mono text-[11px] font-semibold shrink-0 border border-[#003366]/15 px-2 py-1">{note.timestamp}</span><span className="text-sm text-slate-700 flex-1 leading-relaxed pt-0.5">{note.text}</span><button type="button" onClick={() => removeNote(note.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-slate-400 hover:text-red-500" aria-label="Remove note"><X size={13} /></button></div>)}
                  <div ref={notesEndRef} />
                </div>
                {(isRecordingActive || isStopped) && <form onSubmit={(event) => { event.preventDefault(); addNote(); }} className="mt-3 flex items-center gap-2 border border-slate-300 bg-white p-1.5 focus-within:border-[#C9A84C]"><span className="text-[11px] font-mono text-[#003366] font-semibold border-r border-slate-200 px-2">[{formatTime(recorder.elapsedSeconds)}]</span><input value={noteInput} onChange={(event) => setNoteInput(event.target.value)} placeholder="Write a decision, follow-up, or thought…" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-xs outline-none" /><button type="submit" disabled={!noteInput.trim()} className="h-8 w-8 bg-[#003366] text-white disabled:opacity-30 flex items-center justify-center" aria-label="Add note"><Plus size={15} /></button></form>}
              </div>
            )}
          </div>

          {/* ── Right / Bottom: Timestamped Notes ─────────────────────── */}
          <div className={`${isFullscreen ? "w-1/2" : "flex-1 border-t border-[#D9E1EA]"} flex flex-col min-h-0 bg-white/40`}>
            <div className="px-5 pt-4 shrink-0 bg-white border-b border-slate-200">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#003366]">{isFullscreen ? "Ask Echo" : "Meeting workspace"}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{isFullscreen ? "Review previous meetings while this one is being captured." : "Capture context now or revisit what happened before."}</p>
                </div>
                {!isFullscreen && <div className="flex gap-1" role="tablist" aria-label="Meeting workspace">
                  <button type="button" role="tab" aria-selected={workspaceTab === "notes"} onClick={() => setWorkspaceTab("notes")} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 ${workspaceTab === "notes" ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-400 hover:text-[#003366]"}`}><Plus size={13} /> Notes</button>
                  <button type="button" role="tab" aria-selected={workspaceTab === "echo"} onClick={() => setWorkspaceTab("echo")} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 ${workspaceTab === "echo" ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-400 hover:text-[#003366]"}`}><Sparkles size={13} /> Ask Echo</button>
                </div>}
              </div>
            </div>

            {workspaceTab === "notes" && !isFullscreen ? <>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {notes.length === 0 && (
                  <div className="mx-auto mt-6 max-w-xs text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-[#003366]/[0.06] text-[#003366] flex items-center justify-center"><MessageCircle size={18} /></div>
                    <p className="text-sm font-medium text-slate-600 mt-3">Keep the moments that matter</p>
                    <p className="text-xs text-slate-400 mt-1">Decisions, follow-ups, and observations will stay linked to the exact moment.</p>
                  </div>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="group flex items-start gap-3 text-xs border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <span className="text-[#003366] font-mono font-semibold shrink-0 bg-[#003366]/[0.06] px-2 py-1">{note.timestamp}</span>
                    <span className="text-[#181D1E] flex-1 leading-relaxed pt-1">{note.text}</span>
                    <button type="button" onClick={() => removeNote(note.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity" title="Remove note"><X size={12} /></button>
                  </div>
                ))}
                <div ref={notesEndRef} />
              </div>
              {(isRecordingActive || isStopped) && (
                <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); addNote(); }} className="flex items-center gap-2 border border-slate-200 bg-white px-2 py-1 focus-within:border-[#C9A84C] shadow-sm">
                    <span className="text-[11px] font-mono text-[#003366] font-semibold shrink-0 bg-[#003366]/[0.06] px-2 py-1">[{formatTime(recorder.elapsedSeconds)}]</span>
                    <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a decision, follow-up, or thought…" className="flex-1 text-xs bg-transparent px-1 py-2 outline-none" />
                    <button type="submit" disabled={!noteInput.trim()} className="w-8 h-8 bg-[#003366] text-white disabled:opacity-30 flex items-center justify-center" title="Add note"><Plus size={15} /></button>
                  </form>
                </div>
              )}
            </> : <div className="flex-1 min-h-0 flex flex-col bg-[#FFFCFB]">
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {echoMessages.map((message, messageIndex) => <div key={`${messageIndex}-${message.timestamp}`} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`h-7 w-7 shrink-0 flex items-center justify-center ${message.role === "assistant" ? "bg-[#003366] text-[#C9A84C]" : "border border-[#003366] text-[#003366]"}`}>{message.role === "assistant" ? <Sparkles size={13} /> : <User size={13} />}</div>
                  <div className={`max-w-[86%] p-3 text-sm leading-relaxed ${message.role === "assistant" ? "border border-[#003366]/15 text-[#181D1E]" : "bg-[#003366] text-white"}`}>
                    <div className="space-y-1">{message.role === "assistant" ? renderEchoAnswer(message) : message.content}</div>
                    {!!message.response?.sources?.length && <div className="mt-4 border-t border-[#C9A84C]/40 pt-3">
                      <button type="button" onClick={() => setOpenEchoSources((current) => ({ ...current, [messageIndex]: !current[messageIndex] }))} className="flex w-full items-center justify-between text-left text-[10px] font-medium uppercase tracking-[0.18em] text-[#003366]" aria-expanded={!!openEchoSources[messageIndex]}><span>Sources · {message.response.sources.length}</span><span className="normal-case tracking-normal">{openEchoSources[messageIndex] ? "Hide" : "Show"}</span></button>
                      {openEchoSources[messageIndex] && <div className="mt-3 space-y-2">{message.response.sources.map((source, sourceIndex) => <button key={source.sourceId} type="button" onClick={() => onOpenSource?.(source.page || "meetings", source.meetingId, source.url)} className="block w-full border-l-2 border-[#C9A84C] py-2 pl-3 text-left hover:bg-[#003366]/5"><span className="flex items-center justify-between gap-2 text-xs font-medium text-[#003366]"><span><span className="mr-2 text-[10px] text-[#C9A84C]">[{sourceIndex + 1}]</span>{source.meetingTitle}</span><ExternalLink size={11} /></span><span className="mt-1 block text-xs text-[#181D1E]/75">{source.excerpt}</span></button>)}</div>}
                    </div>}
                    {!!message.response?.followUps?.length && <div className="mt-3 flex flex-wrap gap-2">{message.response.followUps.map((followUp) => <button key={followUp} type="button" onClick={() => void askFromStudio(followUp)} className="border border-[#003366]/25 px-2 py-1 text-[11px] text-[#003366] hover:border-[#C9A84C]">{followUp}</button>)}</div>}
                    <div className={`mt-2 flex items-center gap-1 text-[9px] ${message.role === "user" ? "justify-end text-white/60" : "text-[#181D1E]/45"}`}><Clock size={10} />{message.timestamp}</div>
                  </div>
                </div>)}
                {isEchoThinking && <div className="flex gap-3"><div className="h-7 w-7 bg-[#003366] text-[#C9A84C] flex items-center justify-center"><Sparkles size={13} /></div><div className="border border-[#003366]/15 p-3 text-sm text-[#181D1E]/60">Looking through your meetings…</div></div>}
                <div ref={echoEndRef} />
              </div>
              {echoMessages.length <= 1 && <div className="grid grid-cols-1 gap-2 px-5 pb-3 sm:grid-cols-3">{["Recap my last meeting", "What decisions were made?", "What should I follow up?"].map((prompt) => <button key={prompt} type="button" onClick={() => void askFromStudio(prompt)} disabled={isEchoThinking} className="border border-[#003366]/20 bg-white p-2.5 text-left text-[11px] text-[#003366] hover:border-[#C9A84C]">{prompt}</button>)}</div>}
              <form onSubmit={(event) => { event.preventDefault(); void askFromStudio(); }} className="m-4 mt-0 flex items-end border border-[#003366]/35 bg-white focus-within:border-[#003366]">
                <textarea aria-label="Ask Echo from Meeting Studio" rows={1} value={echoInput} onChange={(event) => setEchoInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void askFromStudio(); } }} placeholder="Ask about your meetings, decisions, or follow-ups…" className="min-h-11 max-h-28 min-w-0 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none" />
                <button type="submit" disabled={!echoInput.trim() || isEchoThinking} className="m-1.5 p-2 text-[#003366] disabled:opacity-30" aria-label="Ask Echo"><Send size={16} /></button>
              </form>
            </div>}
          </div>
        </div>
      </section>

      {showCloseConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#001E3C]/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="close-recording-title">
          <div className="w-full max-w-sm border border-[#C9A84C] bg-[#FFFCFB] p-5 shadow-2xl">
            <h3 id="close-recording-title" className="text-lg font-semibold text-[#003366]">Recording is still active</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">Stop the recording before closing Studio so your audio stays safe.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCloseConfirm(false)} className="px-3 py-2 text-xs font-semibold text-slate-600">Keep recording</button>
              <button type="button" onClick={() => { recorder.stop(); setShowCloseConfirm(false); onClose(); }} className="border border-red-500 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">Stop and close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
