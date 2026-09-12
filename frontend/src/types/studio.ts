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
  /** Timestamped notes captured during the session. */
  notes: StudioNote[];
  /** Current session lifecycle state. */
  status: 'active' | 'completed' | 'interrupted';
}

/** Display mode for the studio panel. */
export type StudioDisplayMode = 'panel' | 'fullscreen' | 'minimized';
