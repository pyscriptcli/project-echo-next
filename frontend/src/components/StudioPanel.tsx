"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Maximize2,
  Mic,
  Minimize2,
  Pause,
  Play,
  Plus,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { StudioNote, StudioDisplayMode } from "@/types/studio";
import { useStudioRecorder } from "@/hooks/useStudioRecorder";
import { useLiveTranscription } from "@/hooks/useLiveTranscription";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";
import { clearSession } from "@/lib/studioStorage";

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

  // ── Don't render if not open or minimized ──────────────────────────────
  if (!isOpen || mode === "minimized") return null;

  // ── Layout classes based on mode ───────────────────────────────────────
  const isFullscreen = mode === "fullscreen";
  const panelClasses = isFullscreen
    ? "fixed inset-0 z-50 bg-[#FFFCFB] flex flex-col"
    : "fixed right-0 inset-y-0 z-50 w-full max-w-xl bg-[#FFFCFB] border-l border-[#C9A84C] shadow-2xl flex flex-col";

  const isRecordingActive = recorder.status === "recording" || recorder.status === "paused";
  const isStopped = recorder.status === "stopped" && recorder.recordedFile !== null;

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
        <header className="min-h-14 px-5 bg-[#003366] text-[#FFFCFB] flex items-center justify-between border-b border-[#C9A84C] shrink-0">
          <div className="flex items-center gap-2.5">
            <Mic size={18} className="text-[#C9A84C]" />
            <div>
              <h2 className="font-serif italic text-lg leading-tight">Recording Studio</h2>
              {isRecordingActive && (
                <p className="text-[10px] text-[#FFFCFB]/70 uppercase tracking-wider font-semibold">
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
          <div className={`${isFullscreen ? "w-1/2 border-r border-[#C9A84C]/30" : ""} p-5 flex flex-col gap-4 shrink-0`}>
            {recorder.status === "idle" && (
              <div className="border border-[#003366]/15 bg-[#003366]/[0.03] px-3 py-2 text-xs leading-relaxed text-gray-600">
                <strong className="text-[#003366]">Record meeting</strong><br />
                Echo uses your microphone for any meeting. If you are online, choose the meeting tab and share its audio when your browser asks.
              </div>
            )}

            {/* Mic Selector */}
            {recorder.status === "idle" && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                  Input device
                </label>
                <div className="relative">
                  <select
                    value={recorder.selectedDeviceId || ""}
                    onChange={(e) => recorder.selectDevice(e.target.value)}
                    className="w-full border border-[#003366]/20 bg-[#FFFCFB] text-sm text-[#181D1E] px-3 py-2 pr-8 appearance-none rounded-none focus:outline-none focus:border-[#C9A84C]"
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
              {recorder.status === "idle" && (
                <button
                  type="button"
                  onClick={recorder.start}
                  className="w-24 h-24 flex items-center justify-center border-4 border-[#003366] bg-[#FFFCFB] text-[#003366] hover:bg-[#003366]/5 transition-all"
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
              <div className="text-center">
                <span className={`text-2xl font-mono font-bold tabular-nums ${recorder.status === "paused" ? "text-amber-600" : "text-red-600"}`}>
                  {formatTime(recorder.elapsedSeconds)}
                </span>
                <p className={`text-[10px] uppercase tracking-wider mt-0.5 ${recorder.status === "paused" ? "text-amber-500" : "text-red-400"}`}>
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
          <div className={`${isFullscreen ? "w-1/2" : "flex-1 border-t border-[#C9A84C]/30"} flex flex-col min-h-0`}>
            <div className="px-5 pt-4 pb-2 shrink-0">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                Meeting Notes
              </h3>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Notes are timestamped and sent to the Notetaker with your recording.
              </p>
            </div>

            {/* Notes list */}
            <div className="flex-1 overflow-y-auto px-5 pb-2 space-y-1.5">
              {notes.length === 0 && (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  {isRecordingActive ? "Type a note and press Enter..." : "Notes will appear here during recording."}
                </p>
              )}
              {notes.map((note) => (
                <div
                  key={note.id}
                  className="group flex items-start gap-2 text-xs border-l-2 border-[#C9A84C] pl-2.5 py-1"
                >
                  <span className="text-[#003366] font-mono font-bold shrink-0">{note.timestamp}</span>
                  <span className="text-[#181D1E] flex-1">{note.text}</span>
                  <button
                    type="button"
                    onClick={() => removeNote(note.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 shrink-0 transition-opacity"
                    title="Remove note"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <div ref={notesEndRef} />
            </div>

            {/* Note input */}
            {(isRecordingActive || isStopped) && (
              <div className="px-5 py-3 border-t border-gray-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addNote();
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="text-xs font-mono text-[#003366] font-bold shrink-0">
                    [{formatTime(recorder.elapsedSeconds)}]
                  </span>
                  <input
                    type="text"
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Key decision, action item, or observation..."
                    className="flex-1 text-xs border border-[#003366]/20 bg-[#FFFCFB] px-2.5 py-1.5 rounded-none focus:outline-none focus:border-[#C9A84C]"
                  />
                  <button
                    type="submit"
                    disabled={!noteInput.trim()}
                    className="p-1.5 text-[#003366] disabled:opacity-30 hover:bg-[#003366]/5 transition-colors"
                    title="Add note"
                  >
                    <Plus size={16} />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
