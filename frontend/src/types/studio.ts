/**
 * Studio Mode v2 — Shared types for the crash-resilient recording studio.
 */

/** A timestamped note captured during a recording session. */
export interface StudioNote {
  id: string;
  /** Formatted as "[MM:SS]" relative to recording elapsed time. */
  timestamp: string;
  /** The note text entered by the user. */
  text: string;
}

export type RecordingSourceMode = "in_person" | "online_meeting";
export type RecordingMediaType = "audio" | "video";

/** Metadata for active screen / window / tab capture and audio tracks */
export interface ScreenCaptureInfo {
  /** Screen label, e.g. "Entire Screen (Monitor 1)" or "Window: Google Meet" */
  screenName: string;
  /** Browser display surface type */
  displaySurface: "monitor" | "window" | "browser" | "unknown";
  /** Whether system / tab audio is actively captured */
  hasSystemAudio: boolean;
  /** Whether microphone audio is actively captured */
  hasMicAudio: boolean;
  /** User-friendly audio status string */
  audioStatusLabel:
    | "With System Audio + Mic"
    | "With System Audio (No Mic)"
    | "Mic Only (Without System Audio)"
    | "No Audio Detected";
}

/** Persisted recording session metadata stored in IndexedDB. */
export interface StudioSession {
  sessionId: string;
  /** ISO 8601 timestamp of when the recording started. */
  startedAt: string;
  /** Total elapsed recording seconds (excluding paused time). */
  elapsedSeconds: number;
  /** Human-readable label of the selected mic device. */
  deviceLabel: string;
  /** Recording mode: in-person (mic only) or online meeting (mixed tab/screen audio + mic). */
  sourceMode?: RecordingSourceMode;
  /** Recording media type: audio only or screen video + audio. */
  mediaType?: RecordingMediaType;
  /** Active screen capture details if recording screen or tab */
  screenInfo?: ScreenCaptureInfo | null;
  /** Last active heartbeat timestamp for crash detection */
  lastHeartbeat?: string;
  /** Local disk file path in Documents/Echo Meetings if saved */
  localFilePath?: string;
  /** Timestamped notes captured during the session. */
  notes: StudioNote[];
  /** Current session lifecycle state. */
  status: 'active' | 'completed' | 'interrupted';
}

/** Display mode for the studio panel. */
export type StudioDisplayMode = 'panel' | 'fullscreen' | 'minimized';

