"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingMediaType, RecordingSourceMode, StudioSession } from "@/types/studio";
import {
  saveChunk,
  saveSessionMeta,
  assembleRecording,
  downloadSession,
} from "@/lib/studioStorage";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RecorderStatus = "idle" | "recording" | "paused" | "stopped";
export type CaptureIssue = "share_cancelled" | "missing_shared_audio" | "screen_share_ended" | null;

export interface UseStudioRecorderReturn {
  /** Current recording lifecycle state. */
  status: RecorderStatus;
  /** Elapsed recording seconds (excludes paused time). */
  elapsedSeconds: number;
  /** Active session identifier, null when idle. */
  sessionId: string | null;

  /** Media recording format: audio only or screen video + audio. */
  mediaType: RecordingMediaType;
  /** Set media recording format before starting. */
  setMediaType: (type: RecordingMediaType) => void;

  /** Meeting mode: in-person (mic) or online meeting (tab/system audio + mic). */
  sourceMode: RecordingSourceMode;
  /** Set meeting mode before starting recording. */
  setSourceMode: (mode: RecordingSourceMode) => void;

  /** Available audio input devices. */
  availableDevices: MediaDeviceInfo[];
  /** Currently selected device ID (null = OS default). */
  selectedDeviceId: string | null;
  /** Select a specific input device before or between recordings. */
  selectDevice: (deviceId: string) => void;

  /** Start a new recording session. */
  start: () => Promise<void>;
  /** Pause the active recording. */
  pause: () => void;
  /** Resume a paused recording. */
  resume: () => void;
  /** Stop the recording and produce the final file. */
  stop: () => void;
  /** Reset the completed session after save or discard. */
  reset: () => void;
  /** Dismiss active capture issue (e.g. screen share ended notice) and continue. */
  dismissCaptureIssue: () => void;

  /** Live MediaStream for the audio visualizer hook (mixed audio). */
  audioStream: MediaStream | null;
  /** The assembled File after stopping, null until stop completes. */
  recordedFile: File | null;
  /** Error message from the last failed operation. */
  error: string | null;
  /** Recoverable issue raised before recording begins or during capture. */
  captureIssue: CaptureIssue;
}

/** How often (ms) to flush audio/video chunks to IndexedDB. */
const FLUSH_INTERVAL_MS = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom hook encapsulating all recording logic: MediaRecorder lifecycle,
 * crash-resilient IndexedDB persistence, device selection, tab/system audio mixing
 * for online meetings, screen video capture, and auto-download on interruption.
 * Designed to be consumed by StudioPanel.
 */
export function useStudioRecorder(): UseStudioRecorderReturn {
  // ── State ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<RecordingMediaType>("audio");
  const [sourceMode, setSourceMode] = useState<RecordingSourceMode>("online_meeting");
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captureIssue, setCaptureIssue] = useState<CaptureIssue>(null);

  // ── Refs (mutable across renders without triggering re-renders) ────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksBufferRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");
  const mediaTypeRef = useRef<RecordingMediaType>("audio");
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const elapsedSecondsRef = useRef(0);

  // Keep refs in sync with state for use in event handlers
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { mediaTypeRef.current = mediaType; }, [mediaType]);

  // ── Device Enumeration ─────────────────────────────────────────────────
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((d) => d.kind === "audioinput");
      setAvailableDevices(audioInputs);
    } catch {
      // Silently fail — devices will be empty
    }
  }, []);

  useEffect(() => {
    const initialEnumeration = window.setTimeout(() => void enumerateDevices(), 0);
    navigator.mediaDevices.addEventListener("devicechange", enumerateDevices);
    return () => {
      window.clearTimeout(initialEnumeration);
      navigator.mediaDevices.removeEventListener("devicechange", enumerateDevices);
    };
  }, [enumerateDevices]);

  // ── IndexedDB Flush ────────────────────────────────────────────────────
  const flushChunksToDb = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || chunksBufferRef.current.length === 0) return;

    // Drain the buffer
    const toFlush = chunksBufferRef.current.splice(0);
    const blob = new Blob(toFlush, { type: toFlush[0]?.type || (mediaTypeRef.current === "video" ? "video/webm" : "audio/webm") });
    const idx = chunkIndexRef.current;
    chunkIndexRef.current += 1;

    try {
      await saveChunk(sid, idx, blob);
    } catch (err) {
      console.error("[Studio] Failed to flush chunk to IndexedDB:", err);
    }
  }, []);

  // ── Start Recording ────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError(null);
    setCaptureIssue(null);
    setRecordedFile(null);

    // Clean up any lingering previous streams or audio context
    rawStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    rawStreamsRef.current = [];
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    try {
      const micConstraints: MediaStreamConstraints = {
        audio: selectedDeviceId
          ? { deviceId: { exact: selectedDeviceId } }
          : true,
      };

      let finalStream: MediaStream;
      let micDeviceLabel = "Default";

      if (sourceMode === "online_meeting" && !navigator.mediaDevices.getDisplayMedia) {
        setCaptureIssue("missing_shared_audio");
        return;
      }

      if (sourceMode === "online_meeting" && navigator.mediaDevices.getDisplayMedia) {
        // Browsers own this picker. We can suggest a monitor and request audio,
        // but the user must make the final selection and enable audio.
        let displayStream: MediaStream | null = null;
        try {
          const displayOptions = {
            video: {
              displaySurface: "monitor",
              frameRate: { max: 30 },
            },
            audio: true,
            preferCurrentTab: false,
            selfBrowserSurface: "exclude",
            surfaceSwitching: "include",
            systemAudio: "include",
          } as unknown as DisplayMediaStreamOptions;
          displayStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
        } catch (shareError) {
          const cancelled = shareError instanceof DOMException && (shareError.name === "NotAllowedError" || shareError.name === "AbortError");
          setCaptureIssue("share_cancelled");
          if (!cancelled) console.error("[Studio] Screen sharing failed:", shareError);
          return;
        }

        const displayAudioTracks = displayStream?.getAudioTracks() || [];
        if (!displayStream || displayAudioTracks.length === 0) {
          displayStream?.getTracks().forEach((track) => track.stop());
          setCaptureIssue("missing_shared_audio");
          return;
        }

        const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        micDeviceLabel = micStream.getAudioTracks()[0]?.label || "Default Microphone";
        rawStreamsRef.current = [displayStream, micStream];
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const destination = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(micStream).connect(destination);
        ctx.createMediaStreamSource(displayStream).connect(destination);

        const mixedAudioTrack = destination.stream.getAudioTracks()[0];
        const isVideo = mediaType === "video";

        if (isVideo) {
          const videoTrack = displayStream.getVideoTracks()[0];
          if (videoTrack) {
            videoTrack.onended = () => {
              // User clicked browser floating 'Stop sharing' button
              setCaptureIssue("screen_share_ended");
            };
            finalStream = new MediaStream([videoTrack, mixedAudioTrack]);
          } else {
            finalStream = destination.stream;
          }
        } else {
          // Audio only mode — drop the video track to conserve resources
          displayStream.getVideoTracks().forEach((track) => track.stop());
          finalStream = destination.stream;
        }

        // Live audio stream for audio visualizer & live transcription
        setAudioStream(destination.stream);
      } else {
        const micStream = await navigator.mediaDevices.getUserMedia(micConstraints);
        micDeviceLabel = micStream.getAudioTracks()[0]?.label || "Default Microphone";
        rawStreamsRef.current = [micStream];
        finalStream = micStream;
        setAudioStream(micStream);
      }

      streamRef.current = finalStream;

      // Re-enumerate after permission grant (labels become available)
      enumerateDevices();

      const newSessionId = `echo_rec_${Date.now()}`;
      sessionIdRef.current = newSessionId;
      setSessionId(newSessionId);
      chunkIndexRef.current = 0;
      chunksBufferRef.current = [];

      // Persist initial session metadata
      const sessionMeta: StudioSession = {
        sessionId: newSessionId,
        startedAt: new Date().toISOString(),
        elapsedSeconds: 0,
        deviceLabel: micDeviceLabel,
        sourceMode,
        mediaType,
        notes: [],
        status: "active",
      };
      await saveSessionMeta(sessionMeta);

      // Create MediaRecorder with appropriate mimeType and bitrate
      const isVideo = mediaType === "video";
      let mimeType = "audio/webm";
      let recorderOptions: MediaRecorderOptions = {};

      if (isVideo) {
        mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
          ? "video/webm;codecs=vp9,opus"
          : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : MediaRecorder.isTypeSupported("video/webm")
          ? "video/webm"
          : "video/mp4";
        recorderOptions = { mimeType, videoBitsPerSecond: 1_500_000 };
      } else {
        mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        recorderOptions = { mimeType };
      }

      const recorder = new MediaRecorder(finalStream, recorderOptions);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksBufferRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Final flush
        await flushChunksToDb();

        // Assemble final file
        try {
          const sid = sessionIdRef.current;
          if (sid) {
            const blob = await assembleRecording(sid);
            const isVideoSession = mediaTypeRef.current === "video" || blob.type.startsWith("video/");
            const ext = blob.type.includes("webm") ? "webm" : isVideoSession ? "webm" : "wav";
            const prefix = isVideoSession ? "echo-video" : "echo-recording";
            const fileType = blob.type || (isVideoSession ? "video/webm" : "audio/webm");
            const file = new File([blob], `${prefix}-${sid}.${ext}`, { type: fileType });
            setRecordedFile(file);

            // Mark session as completed
            await saveSessionMeta({
              ...sessionMeta,
              sessionId: sid,
              elapsedSeconds: elapsedSecondsRef.current,
              status: "completed",
            });
          }
        } catch (err) {
          console.error("[Studio] Failed to assemble recording:", err);
          setError("Failed to assemble recording. Check recovery on next visit.");
        }
      };

      // Request data every 1 second for smooth chunk accumulation
      recorder.start(1000);
      setStatus("recording");
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;

      // Elapsed timer (1s intervals)
      timerRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);

      // IndexedDB flush timer
      flushTimerRef.current = setInterval(flushChunksToDb, FLUSH_INTERVAL_MS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not access recording source.";
      setError(message);
      console.error("[Studio] Start recording failed:", err);

      // Clean up in case of failure
      rawStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      rawStreamsRef.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  }, [selectedDeviceId, sourceMode, mediaType, enumerateDevices, flushChunksToDb]);

  // ── Pause ──────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setStatus("paused");

      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Flush current chunks immediately
      flushChunksToDb();
    }
  }, [flushChunksToDb]);

  // ── Resume ─────────────────────────────────────────────────────────────
  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setStatus("recording");

      // Resume timer
      timerRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  // ── Stop ───────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recorder.state === "recording" || recorder.state === "paused")) {
      recorder.stop();
      setStatus("stopped");

      // Stop timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      // Stop all tracks (mixed + raw sources)
      streamRef.current?.getTracks().forEach((track) => track.stop());
      rawStreamsRef.current.forEach((s) => s.getTracks().forEach((track) => track.stop()));
      rawStreamsRef.current = [];
      setAudioStream(null);
      streamRef.current = null;

      // Close AudioContext if open
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setElapsedSeconds(0);
    setSessionId(null);
    sessionIdRef.current = null;
    setRecordedFile(null);
    setError(null);
    setCaptureIssue(null);
    chunksBufferRef.current = [];
    chunkIndexRef.current = 0;
  }, []);

  const dismissCaptureIssue = useCallback(() => {
    setCaptureIssue(null);
  }, []);

  // ── Select Device ──────────────────────────────────────────────────────
  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // ── beforeunload: auto-download on navigation ─────────────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (statusRef.current === "recording" || statusRef.current === "paused") {
        // Attempt auto-download
        const sid = sessionIdRef.current;
        if (sid) {
          downloadSession(sid).catch(() => {});
        }
        e.preventDefault();
        e.returnValue = "A live recording is active. Your recording has been auto-saved.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── visibilitychange: flush immediately when tab goes hidden ──────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (statusRef.current === "recording" || statusRef.current === "paused")) {
        flushChunksToDb();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [flushChunksToDb]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      rawStreamsRef.current.forEach((s) => s.getTracks().forEach((track) => track.stop()));
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    status,
    elapsedSeconds,
    sessionId,
    mediaType,
    setMediaType,
    sourceMode,
    setSourceMode,
    availableDevices,
    selectedDeviceId,
    selectDevice,
    start,
    pause,
    resume,
    stop,
    reset,
    dismissCaptureIssue,
    audioStream,
    recordedFile,
    error,
    captureIssue,
  };
}
