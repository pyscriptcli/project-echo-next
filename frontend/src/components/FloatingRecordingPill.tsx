"use client";

import React from "react";
import { Mic, Pause, Play, Square, Maximize2, Monitor, AlertCircle } from "lucide-react";
import type { UseStudioRecorderReturn } from "@/hooks/useStudioRecorder";
import { useAudioVisualizer } from "@/hooks/useAudioVisualizer";

interface FloatingRecordingPillProps {
  recorder: UseStudioRecorderReturn;
  onExpand: () => void;
}

function formatClock(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function FloatingRecordingPill({ recorder, onExpand }: FloatingRecordingPillProps) {
  const visualizer = useAudioVisualizer(recorder.audioStream);
  const isRecording = recorder.status === "recording";
  const isPaused = recorder.status === "paused";

  if (!isRecording && !isPaused) return null;

  const screenName = recorder.screenInfo?.screenName || "Meeting Audio";
  const audioStatus = recorder.screenInfo?.audioStatusLabel || (recorder.sourceMode === "in_person" ? "Mic Only" : "With Audio");

  return (
    <aside
      aria-label="Active recording control dock"
      className="fixed bottom-5 right-6 z-50 flex items-center gap-3 bg-[#001E3C]/95 backdrop-blur-md text-white border-2 border-[#C9A84C] px-3.5 py-2 shadow-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-3"
    >
      {/* Live / Paused Status Indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {isRecording && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPaused ? "bg-amber-400" : "bg-red-500"}`} />
        </span>
        <span className="font-mono text-xs font-bold tracking-tight tabular-nums">
          {formatClock(recorder.elapsedSeconds)}
        </span>
      </div>

      <div className="h-4 w-px bg-white/20" />

      {/* Screen & Audio Status info */}
      <div className="flex flex-col min-w-0 max-w-[200px] sm:max-w-[260px]">
        <div className="flex items-center gap-1.5 truncate">
          <Monitor size={11} className="text-[#C9A84C] shrink-0" />
          <span className="text-[11px] font-semibold truncate text-slate-100" title={screenName}>
            {screenName}
          </span>
        </div>
        <span className="text-[9px] text-[#C9A84C] truncate font-medium">
          {audioStatus}
        </span>
      </div>

      {/* Volume Visualizer meter */}
      {isRecording && (
        <div className="hidden sm:flex items-center gap-0.5 h-4 px-1" title={`Audio level: ${visualizer.volumeLevel}%`}>
          {Array.from({ length: 8 }, (_, idx) => {
            const active = visualizer.volumeLevel >= (idx + 1) * 12;
            const h = 4 + (idx * 3) % 12;
            return (
              <span
                key={idx}
                className={`w-0.5 transition-all duration-75 ${active ? (visualizer.isClipping ? "bg-red-400" : "bg-[#C9A84C]") : "bg-white/20"}`}
                style={{ height: `${h}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1 ml-1 border-l border-white/20 pl-2">
        {isRecording ? (
          <button
            type="button"
            onClick={recorder.pause}
            className="p-1.5 text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Pause recording"
            aria-label="Pause recording"
          >
            <Pause size={13} />
          </button>
        ) : (
          <button
            type="button"
            onClick={recorder.resume}
            className="p-1.5 text-emerald-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Resume recording"
            aria-label="Resume recording"
          >
            <Play size={13} className="fill-current" />
          </button>
        )}

        <button
          type="button"
          onClick={recorder.stop}
          className="p-1.5 text-red-400 hover:text-white hover:bg-red-600/30 transition-colors"
          title="Stop recording"
          aria-label="Stop recording"
        >
          <Square size={12} className="fill-current" />
        </button>

        <button
          type="button"
          onClick={onExpand}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ml-1 pl-1.5 border-l border-white/10"
          title="Return to Notetaker Studio"
          aria-label="Expand Notetaker Studio"
        >
          <Maximize2 size={12} />
          <span className="hidden md:inline">Studio</span>
        </button>
      </div>
    </aside>
  );
}
