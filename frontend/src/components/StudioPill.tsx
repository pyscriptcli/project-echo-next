"use client";

import React from "react";
import { Mic } from "lucide-react";

interface StudioPillProps {
  /** Elapsed recording time in seconds. */
  elapsedSeconds: number;
  /** Callback to restore the studio panel from minimized state. */
  onRestore: () => void;
}

/** Formats seconds into MM:SS display. */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Compact recording indicator pill shown in the topbar when the studio
 * is minimized. Clicking restores the studio panel.
 */
export function StudioPill({ elapsedSeconds, onRestore }: StudioPillProps) {
  return (
    <button
      type="button"
      onClick={onRestore}
      className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 text-xs font-semibold rounded-md hover:bg-red-100 transition-colors cursor-pointer"
      title="Restore Recording Studio"
      aria-label={`Recording in progress: ${formatTime(elapsedSeconds)}. Click to restore studio.`}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <Mic size={12} />
      <span>{formatTime(elapsedSeconds)}</span>
    </button>
  );
}
