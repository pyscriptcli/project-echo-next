"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
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
  X,
} from "lucide-react";
import type { StudioNote, StudioDisplayMode } from "@/types/studio";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { clearSession } from "@/lib/studioStorage";
import { askEcho } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StudioPanelProps {
  isOpen: boolean;
  mode: StudioDisplayMode;
  onChangeMode: (mode: StudioDisplayMode) => void;
  onClose: () => void;
  onSendToNotetaker: (file: File, notes: StudioNote[], preparedTranscript?: string) => void;
}

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
  const barColor = isClipping
    ? "bg-red-500"
    : level > 60
      ? "bg-yellow-500"
      : "bg-green-500";

  return (
    <div className="w-full h-2 bg-gray-200 overflow-hidden" title={`Volume: ${level}%`}>
      <div
        className={`h-full transition-all duration-75 ${barColor}`}
        style={{ width: `${level}%` }}
      />
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
  const [echoAnswer, setEchoAnswer] = useState("Ask for a recap, decisions, or follow-ups from your previous meetings.");
  const [isEchoThinking, setIsEchoThinking] = useState(false);
  const notesEndRef = useRef<HTMLDivElement>(null);

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
    // While recording, X minimizes instead of closing
    if (recorder.status === "recording" || recorder.status === "paused") {
      onChangeMode("minimized");
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
    try {
      const response = await askEcho(question, []);
      setEchoAnswer(response.answer);
    } catch (error) {
      setEchoAnswer(error instanceof Error ? error.message : "Echo couldn’t answer right now.");
    } finally {
      setIsEchoThinking(false);
    }
  };

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
                  {recorder.status === "paused" ? "Paused" : "Recording"} • {recorder.sourceMode === "online_meeting" ? "Online Call" : "In-Person"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Mode toggles */}
            <button
              type="button"
              onClick={() => onChangeMode("minimized")}
              title="Minimize to topbar"
              className="p-2 hover:bg-[#174778] transition-colors"
            >
              <Minimize2 size={15} />
            </button>
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
              title={isRecordingActive ? "Minimize (recording active)" : "Close"}
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
                  onClick={recorder.start}
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
              <div className="text-center rounded-xl bg-white border border-slate-200 px-8 py-4 shadow-sm">
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
                Click the mic to start recording. Audio is auto-saved every 10 seconds.
              </p>
            )}

            {/* Error display */}
            {recorder.error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                {recorder.error}
              </div>
            )}
          </div>

          {/* ── Right / Bottom: Timestamped Notes ─────────────────────── */}
          <div className={`${isFullscreen ? "w-1/2" : "flex-1 border-t border-[#D9E1EA]"} flex flex-col min-h-0 bg-white/40`}>
            <div className="px-5 pt-4 shrink-0 bg-white border-b border-slate-200">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#003366]">Meeting workspace</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Capture context now or revisit what happened before.</p>
                </div>
                <div className="flex gap-1" role="tablist" aria-label="Meeting workspace">
                  <button type="button" role="tab" aria-selected={workspaceTab === "notes"} onClick={() => setWorkspaceTab("notes")} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 ${workspaceTab === "notes" ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-400 hover:text-[#003366]"}`}><Plus size={13} /> Notes</button>
                  <button type="button" role="tab" aria-selected={workspaceTab === "echo"} onClick={() => setWorkspaceTab("echo")} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 ${workspaceTab === "echo" ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-400 hover:text-[#003366]"}`}><Sparkles size={13} /> Ask Echo</button>
                </div>
              </div>
            </div>

            {workspaceTab === "notes" ? <>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                {notes.length === 0 && (
                  <div className="mx-auto mt-6 max-w-xs text-center">
                    <div className="mx-auto w-10 h-10 rounded-full bg-[#003366]/[0.06] text-[#003366] flex items-center justify-center"><MessageCircle size={18} /></div>
                    <p className="text-sm font-medium text-slate-600 mt-3">Keep the moments that matter</p>
                    <p className="text-xs text-slate-400 mt-1">Decisions, follow-ups, and observations will stay linked to the exact moment.</p>
                  </div>
                )}
                {notes.map((note) => (
                  <div key={note.id} className="group flex items-start gap-3 text-xs rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                    <span className="text-[#003366] font-mono font-semibold shrink-0 bg-[#003366]/[0.06] px-2 py-1 rounded-full">{note.timestamp}</span>
                    <span className="text-[#181D1E] flex-1 leading-relaxed pt-1">{note.text}</span>
                    <button type="button" onClick={() => removeNote(note.id)} className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity" title="Remove note"><X size={12} /></button>
                  </div>
                ))}
                <div ref={notesEndRef} />
              </div>
              {(isRecordingActive || isStopped) && (
                <div className="px-5 py-3 border-t border-gray-200 bg-white shrink-0">
                  <form onSubmit={(e) => { e.preventDefault(); addNote(); }} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 focus-within:border-[#C9A84C] shadow-sm">
                    <span className="text-[11px] font-mono text-[#003366] font-semibold shrink-0 bg-[#003366]/[0.06] px-2 py-1 rounded-full">[{formatTime(recorder.elapsedSeconds)}]</span>
                    <input type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)} placeholder="Write a decision, follow-up, or thought…" className="flex-1 text-xs bg-transparent px-1 py-2 outline-none" />
                    <button type="submit" disabled={!noteInput.trim()} className="w-8 h-8 rounded-lg bg-[#003366] text-white disabled:opacity-30 flex items-center justify-center" title="Add note"><Plus size={15} /></button>
                  </form>
                </div>
              )}
            </> : <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <div className="rounded-xl border border-[#C9D8E8] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[#003366]"><Sparkles size={15} className="text-[#C9A84C]" /><span className="text-xs font-semibold">Echo</span></div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{isEchoThinking ? "Looking through your meetings…" : echoAnswer}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                  {["Recap my last meeting", "What decisions were made?", "What should I follow up?"] .map((prompt) => <button key={prompt} type="button" onClick={() => askFromStudio(prompt)} disabled={isEchoThinking} className="text-left rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-[#003366] hover:border-[#C9A84C]">{prompt}</button>)}
                </div>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void askFromStudio(); }} className="m-4 mt-0 flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 focus-within:border-[#C9A84C] shadow-sm">
                <input aria-label="Ask Echo from Meeting Studio" value={echoInput} onChange={(event) => setEchoInput(event.target.value)} placeholder="Ask Echo about previous meetings…" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs outline-none" />
                <button type="submit" disabled={!echoInput.trim() || isEchoThinking} className="w-8 h-8 rounded-lg bg-[#003366] text-white disabled:opacity-30 flex items-center justify-center" aria-label="Ask Echo"><Send size={14} /></button>
              </form>
            </div>}
          </div>
        </div>
      </section>
    </>
  );
}
