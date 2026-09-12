"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Download, X } from "lucide-react";
import type { StudioSession } from "@/types/studio";
import { getInterruptedSessions, downloadSession, clearSession } from "@/lib/studioStorage";

/**
 * Banner shown at the top of the page when an interrupted recording session
 * is found in IndexedDB (e.g., after a browser crash). Offers download or discard.
 */
export function StudioRecoveryBanner() {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    getInterruptedSessions()
      .then(setSessions)
      .catch(() => {});
  }, []);

  if (sessions.length === 0) return null;

  const handleDownload = async (sessionId: string) => {
    setDownloading(sessionId);
    try {
      await downloadSession(sessionId);
      await clearSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      console.error("[Studio Recovery] Download failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleDiscard = async (sessionId: string) => {
    try {
      await clearSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch (err) {
      console.error("[Studio Recovery] Discard failed:", err);
    }
  };

  /** Format elapsed seconds into human-readable duration. */
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  };

  /** Format ISO date into short display. */
  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-0">
      {sessions.map((session) => (
        <div
          key={session.sessionId}
          className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2 text-amber-800 text-xs font-medium min-w-0">
            <AlertTriangle size={14} className="shrink-0 text-amber-600" />
            <span className="truncate">
              Interrupted recording found
              {session.elapsedSeconds > 0 && ` (${formatDuration(session.elapsedSeconds)}`}
              {session.startedAt && ` from ${formatDate(session.startedAt)}`}
              {session.elapsedSeconds > 0 && ")"}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleDownload(session.sessionId)}
              disabled={downloading === session.sessionId}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] hover:underline disabled:opacity-50"
            >
              <Download size={12} />
              {downloading === session.sessionId ? "Downloading..." : "Download"}
            </button>
            <span className="text-amber-300">·</span>
            <button
              type="button"
              onClick={() => handleDiscard(session.sessionId)}
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-red-600"
            >
              <X size={12} />
              Discard
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
