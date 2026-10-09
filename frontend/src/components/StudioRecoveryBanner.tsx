"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Download, X, Sparkles, Folder } from "lucide-react";
import type { StudioSession } from "@/types/studio";
import { getInterruptedSessions, downloadSession, clearSession, exportSessionAsFile } from "@/lib/studioStorage";

interface StudioRecoveryBannerProps {
  onProcessSession?: (file: File) => void;
  /** Session ID of an actively running recording session to exclude. */
  activeSessionId?: string | null;
  /** True when recording is actively ongoing. */
  isRecording?: boolean;
}

/**
 * Banner shown at the top of the page when an interrupted recording session
 * is found in IndexedDB or Documents/Mosaic Meetings (e.g., after a browser crash or battery cut).
 * Offers 1-click Notetaker processing, download, or discard.
 */
export function StudioRecoveryBanner({
  onProcessSession,
  activeSessionId,
  isRecording = false,
}: StudioRecoveryBannerProps) {
  const [sessions, setSessions] = useState<StudioSession[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadSessions = () => {
    getInterruptedSessions(activeSessionId)
      .then((records) => {
        // Double filter out active session or if actively recording
        const filtered = records.filter((s) => {
          if (activeSessionId && s.sessionId === activeSessionId) return false;
          return true;
        });
        setSessions(filtered);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadSessions();
    const handleCheckInterrupted = () => loadSessions();
    window.addEventListener("focus", handleCheckInterrupted);
    return () => window.removeEventListener("focus", handleCheckInterrupted);
  }, [activeSessionId, isRecording]);

  // If the user is actively recording in this tab, do not distract them with an interrupted banner
  // for the current ongoing session
  const visibleSessions = sessions.filter((s) => !activeSessionId || s.sessionId !== activeSessionId);

  if (visibleSessions.length === 0) return null;

  const handleProcess = async (sessionId: string) => {
    setProcessing(sessionId);
    try {
      const file = await exportSessionAsFile(sessionId);
      await clearSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      onProcessSession?.(file);
    } catch (err) {
      console.error("[Studio Recovery] Processing failed:", err);
    } finally {
      setProcessing(null);
    }
  };

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

  /** Format elapsed recording time as HH:MM:SS. */
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor(seconds / 60) % 60;
    const remainder = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  };

  /** Format ISO date into short display. */
  const formatDate = (iso: string): string => {
    try {
      return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <aside aria-label="Interrupted recording recovery notifications" className="space-y-0">
      {visibleSessions.map((session) => (
        <div
          key={session.sessionId}
          className="bg-amber-50 border-b border-amber-300 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-2 text-amber-900 text-xs font-medium min-w-0">
            <AlertTriangle size={15} className="shrink-0 text-amber-600" />
            <div className="truncate">
              <span className="font-bold">Interrupted recording recovered</span>
              {session.elapsedSeconds > 0 && ` (${formatDuration(session.elapsedSeconds)}`}
              {session.startedAt && ` from ${formatDate(session.startedAt)}`}
              {session.elapsedSeconds > 0 && ")"}
              <span className="ml-2 text-[10px] text-amber-700 bg-amber-100/80 px-1.5 py-0.5 border border-amber-200 inline-flex items-center gap-1">
                <Folder size={10} /> Auto-saved in Documents/Mosaic Meetings
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onProcessSession && (
              <button
                type="button"
                onClick={() => handleProcess(session.sessionId)}
                disabled={processing === session.sessionId}
                className="inline-flex items-center gap-1 text-xs font-bold bg-[#003366] text-white px-2.5 py-1 hover:bg-[#002244] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
              >
                <Sparkles size={11} className="text-[#C9A84C]" />
                {processing === session.sessionId ? "Loading…" : "Process into Minutes Now"}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDownload(session.sessionId)}
              disabled={downloading === session.sessionId}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] hover:underline disabled:opacity-50 px-1.5 py-0.5"
            >
              <Download size={12} />
              {downloading === session.sessionId ? "Downloading…" : "Download"}
            </button>
            <span className="text-amber-300">·</span>
            <button
              type="button"
              onClick={() => handleDiscard(session.sessionId)}
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-red-600 px-1.5 py-0.5 cursor-pointer"
            >
              <X size={12} />
              Discard
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
