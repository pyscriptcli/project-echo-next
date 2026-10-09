"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordingMediaType, RecordingSourceMode, StudioSession, ScreenCaptureInfo } from "@/types/studio";
import {
  saveChunk,
  saveSessionMeta,
  assembleRecording,
  downloadSession,
  saveToLocalDocuments,
  requestPersistentStorage,
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

  /** Active screen capture details (Screen name, surface, audio status). */
  screenInfo: ScreenCaptureInfo | null;
  /** True if no microphone or system audio detected for extended period (>45s). */
  isSilenceDetected: boolean;
  /** Path in Documents/Echo Meetings where local file was saved. */
  localSavedPath: string | null;
  /** True if another tab is currently recording. */
  hasOtherTabRecording: boolean;

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

/** Fallback interval (ms) to flush chunks to IndexedDB if event-driven flush hasn't fired. */
const FLUSH_INTERVAL_MS = 3_000;
/** How often (seconds) to create a rolling checkpoint file in Documents/Echo Meetings. */
const CHECKPOINT_INTERVAL_SECONDS = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom hook encapsulating all recording logic: MediaRecorder lifecycle,
 * crash-resilient IndexedDB persistence, device selection, tab/system audio mixing
 * for online meetings, screen video capture, rolling disk checkpoints, and auto-download on interruption.
 * Designed to be consumed at the app shell level for background continuity.
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
  const [screenInfo, setScreenInfo] = useState<ScreenCaptureInfo | null>(null);
  const [isSilenceDetected, setIsSilenceDetected] = useState(false);
  const [localSavedPath, setLocalSavedPath] = useState<string | null>(null);
  const [hasOtherTabRecording, setHasOtherTabRecording] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksBufferRef = useRef<Blob[]>([]);
  const chunkIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<RecorderStatus>("idle");
  const mediaTypeRef = useRef<RecordingMediaType>("audio");
  const streamRef = useRef<MediaStream | null>(null);
  const rawStreamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const elapsedSecondsRef = useRef(0);
  const isFlushingRef = useRef(false);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const sessionMetaRef = useRef<StudioSession | null>(null);

  // Keep refs in sync with state for use in event handlers
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { mediaTypeRef.current = mediaType; }, [mediaType]);

  // ── Multi-Tab Concurrency Guard (BroadcastChannel) ────────────────────
  useEffect(() => {
    try {
      const channel = new BroadcastChannel("echo_recording_bus");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data?.type === "RECORDING_ACTIVE") {
          if (statusRef.current === "idle") {
            setHasOtherTabRecording(true);
          }
        } else if (event.data?.type === "RECORDING_STOPPED") {
          setHasOtherTabRecording(false);
        }
      };
    } catch {
      // Fallback if BroadcastChannel unsupported
    }

    return () => {
      broadcastChannelRef.current?.close();
    };
  }, []);

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

  // ── IndexedDB Flush (Event-driven & Low Latency) ──────────────────────
  const flushChunksToDb = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || chunksBufferRef.current.length === 0 || isFlushingRef.current) return;

    isFlushingRef.current = true;
    // Drain the buffer immediately
    const toFlush = chunksBufferRef.current.splice(0);
    const mime = toFlush[0]?.type || (mediaTypeRef.current === "video" ? "video/webm" : "audio/webm");
    const blob = new Blob(toFlush, { type: mime });
    const idx = chunkIndexRef.current;
    chunkIndexRef.current += 1;

    try {
      await saveChunk(sid, idx, blob);

      // Update session heartbeat
      if (sessionMetaRef.current) {
        sessionMetaRef.current.elapsedSeconds = elapsedSecondsRef.current;
        sessionMetaRef.current.lastHeartbeat = new Date().toISOString();
        await saveSessionMeta(sessionMetaRef.current);
      }
    } catch (err) {
      console.error("[Studio] Failed to flush chunk to IndexedDB:", err);
      // Put chunks back if saving failed
      chunksBufferRef.current.unshift(...toFlush);
    } finally {
      isFlushingRef.current = false;
    }
  }, []);

  // ── Rolling Checkpoint to Documents/Echo Meetings ─────────────────────
  const saveRollingCheckpoint = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (!sid || (statusRef.current !== "recording" && statusRef.current !== "paused")) return;

    try {
      await flushChunksToDb();
      const currentBlob = await assembleRecording(sid);
      if (currentBlob.size > 0) {
        await saveToLocalDocuments(sid, currentBlob, "checkpoint", mediaTypeRef.current);
      }
    } catch (err) {
      console.warn("[Studio] Rolling disk checkpoint save failed:", err);
    }
  }, [flushChunksToDb]);

  // ── Start Recording ────────────────────────────────────────────────────
  const start = useCallback(async () => {
    setError(null);
    setCaptureIssue(null);
    setRecordedFile(null);
    setIsSilenceDetected(false);

    // Clean up any lingering previous streams or audio context
    rawStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    rawStreamsRef.current = [];
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    try {
      // Request persistent browser storage so IndexedDB is never evicted
      void requestPersistentStorage();

      const selectedDeviceConstraint = selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {};
      const rawMicConstraints: MediaStreamConstraints = {
        audio: {
          ...selectedDeviceConstraint,
          noiseSuppression: false,
          echoCancellation: false,
          autoGainControl: false,
        },
      };
      const cleanedMicConstraints: MediaStreamConstraints = {
        audio: {
          ...selectedDeviceConstraint,
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: false,
        },
      };
      let audioProcessingWarning: string | null = null;
      const useRawMicFallback = (rawStream: MediaStream, reason: string) => {
        audioProcessingWarning = `AUDIO_FILTER_WARNING: ${reason} Noise suppression may be reduced for this recording.`;
        console.warn(`[Studio] ${audioProcessingWarning}`);
        return { stream: rawStream.clone(), suppressionApplied: false };
      };
      const getCleanedMicStream = async (rawStream: MediaStream) => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia(cleanedMicConstraints);
          const track = stream.getAudioTracks()[0];
          const rawDeviceId = rawStream.getAudioTracks()[0]?.getSettings().deviceId;
          const cleanedDeviceId = track?.getSettings().deviceId;
          const suppressionSupported = navigator.mediaDevices.getSupportedConstraints?.().noiseSuppression === true;
          const suppressionApplied = track?.getSettings().noiseSuppression === true
            || (track?.getSettings().noiseSuppression === undefined && suppressionSupported);
          if (!track || track.readyState !== "live") {
            stream.getTracks().forEach((item) => item.stop());
            return useRawMicFallback(rawStream, "The filtered microphone stream was unavailable.");
          }
          if (rawDeviceId && cleanedDeviceId && rawDeviceId !== cleanedDeviceId) {
            stream.getTracks().forEach((item) => item.stop());
            return useRawMicFallback(rawStream, "The filtered stream selected a different microphone.");
          }
          if (!suppressionApplied) {
            stream.getTracks().forEach((item) => item.stop());
            return useRawMicFallback(rawStream, "This browser or microphone did not confirm noise suppression.");
          }
          return { stream, suppressionApplied: true };
        } catch (filterError) {
          // Keep the recording usable on browsers/devices that don't allow a
          // second capture of the same microphone. Transcription remains raw.
          console.warn("[Studio] Filtered mic capture unavailable; saving the raw mic track.", filterError);
          return useRawMicFallback(rawStream, "A second filtered microphone capture could not be opened.");
        }
      };

      let finalStream: MediaStream;
      let micDeviceLabel = "Default";
      let capturedScreenInfo: ScreenCaptureInfo | null = null;

      if (sourceMode === "online_meeting") {
        let displayStream: MediaStream | null = null;
        if (navigator.mediaDevices.getDisplayMedia) {
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
            rawStreamsRef.current = [displayStream];
          } catch (shareError) {
            const cancelled = shareError instanceof DOMException && (shareError.name === "NotAllowedError" || shareError.name === "AbortError");
            setCaptureIssue("share_cancelled");
            if (!cancelled) console.error("[Studio] Screen sharing failed:", shareError);
            return;
          }
        }

        const displayAudioTracks = displayStream?.getAudioTracks() || [];
        const hasSystemAudio = displayAudioTracks.length > 0;

        // Keep one unprocessed mic stream for transcription and a separately
        // suppressed mic stream for the recording file.
        const micStream = await navigator.mediaDevices.getUserMedia(rawMicConstraints);
        const cleanedMic = await getCleanedMicStream(micStream);
        const cleanedMicStream = cleanedMic.stream;
        micDeviceLabel = micStream.getAudioTracks()[0]?.label || "Default Microphone";
        const hasMicAudio = micStream.getAudioTracks().length > 0;

        rawStreamsRef.current = [...(displayStream ? [displayStream] : []), micStream, cleanedMicStream];

        // Format screen and audio details
        const videoTrack = displayStream?.getVideoTracks()[0];
        const surface = (videoTrack?.getSettings()?.displaySurface as ScreenCaptureInfo["displaySurface"]) || "unknown";

        let screenName = "Entire Screen";
        if (videoTrack?.label) {
          screenName = videoTrack.label;
        } else if (surface === "monitor") {
          screenName = "Entire Screen";
        } else if (surface === "window") {
          screenName = "Application Window";
        } else if (surface === "browser") {
          screenName = "Browser Tab";
        }

        let audioStatusLabel: ScreenCaptureInfo["audioStatusLabel"] = "With System Audio + Mic";
        if (hasSystemAudio && hasMicAudio) {
          audioStatusLabel = "With System Audio + Mic";
        } else if (hasSystemAudio && !hasMicAudio) {
          audioStatusLabel = "With System Audio (No Mic)";
        } else if (!hasSystemAudio && hasMicAudio) {
          audioStatusLabel = "Mic Only (Without System Audio)";
        } else {
          audioStatusLabel = "No Audio Detected";
        }

        capturedScreenInfo = {
          screenName,
          displaySurface: surface,
          hasSystemAudio,
          hasMicAudio,
          audioStatusLabel,
        };
        setScreenInfo(capturedScreenInfo);

        // Build parallel mixes so transcription receives raw mic audio while
        // the recording prefers the verified, noise-suppressed mic stream.
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});

        // Watchdog: auto-resume AudioContext if OS puts it to sleep or headphones change
        ctx.onstatechange = () => {
          if (ctx.state === "suspended" && statusRef.current === "recording") {
            console.warn("[Studio Watchdog] AudioContext suspended, auto-resuming...");
            ctx.resume().catch(() => {});
          }
        };

        const transcriptionDestination = ctx.createMediaStreamDestination();
        const recordingDestination = ctx.createMediaStreamDestination();
        const rawMicSource = ctx.createMediaStreamSource(micStream);
        const cleanedMicSource = ctx.createMediaStreamSource(cleanedMicStream);
        const transcribeRawGain = ctx.createGain();
        const transcribeCleanGain = ctx.createGain();
        const recordRawGain = ctx.createGain();
        const recordCleanGain = ctx.createGain();
        const cleanTrackLive = cleanedMicStream.getAudioTracks().some((track) => track.readyState === "live");
        const useCleanTrackForRecording = cleanedMic.suppressionApplied && cleanTrackLive;
        transcribeRawGain.gain.value = 1;
        transcribeCleanGain.gain.value = 0;
        recordRawGain.gain.value = useCleanTrackForRecording ? 0 : 1;
        recordCleanGain.gain.value = useCleanTrackForRecording ? 1 : 0;
        rawMicSource.connect(transcribeRawGain).connect(transcriptionDestination);
        cleanedMicSource.connect(transcribeCleanGain).connect(transcriptionDestination);
        rawMicSource.connect(recordRawGain).connect(recordingDestination);
        cleanedMicSource.connect(recordCleanGain).connect(recordingDestination);

        const switchGain = (gain: GainNode, value: number) => gain.gain.setTargetAtTime(value, ctx.currentTime, 0.03);
        const rawMicTrack = micStream.getAudioTracks()[0];
        const cleanedMicTrack = cleanedMicStream.getAudioTracks()[0];
        cleanedMicTrack?.addEventListener("ended", () => {
          if (rawMicTrack?.readyState === "live") {
            switchGain(recordCleanGain, 0);
            switchGain(recordRawGain, 1);
            setError("AUDIO_FILTER_WARNING: Noise suppression stopped. Recording continues with the raw microphone.");
            void flushChunksToDb();
          }
        });
        rawMicTrack?.addEventListener("ended", () => {
          if (cleanedMicTrack?.readyState === "live") {
            switchGain(transcribeRawGain, 0);
            switchGain(transcribeCleanGain, 1);
            switchGain(recordRawGain, 0);
            switchGain(recordCleanGain, 1);
            setError("AUDIO_FILTER_WARNING: The raw microphone stopped. Using the filtered microphone for recording and transcription.");
            void flushChunksToDb();
          }
        });

        if (hasSystemAudio && displayStream) {
          const systemAudioSource = ctx.createMediaStreamSource(displayStream);
          systemAudioSource.connect(transcriptionDestination);
          systemAudioSource.connect(recordingDestination);
          displayStream.getAudioTracks().forEach((track) => track.addEventListener("ended", () => {
            if (statusRef.current === "recording") setError("AUDIO_FILTER_WARNING: Shared system audio stopped. Microphone capture continues.");
          }));
        }

        const mixedAudioTrack = recordingDestination.stream.getAudioTracks()[0];
        const isVideo = mediaType === "video";

        if (isVideo && videoTrack) {
          videoTrack.onended = () => {
            // User clicked browser floating 'Stop sharing' button
            setCaptureIssue("screen_share_ended");
            void flushChunksToDb();
          };
          finalStream = new MediaStream([videoTrack, mixedAudioTrack]);
        } else {
          // Audio only mode — drop video track to conserve resources
          displayStream?.getVideoTracks().forEach((track) => track.stop());
          finalStream = recordingDestination.stream;
        }

        setAudioStream(transcriptionDestination.stream);
      } else {
        // In-person mode also transcribes from the raw mic while recording the
        // suppressed mic stream.
        const micStream = await navigator.mediaDevices.getUserMedia(rawMicConstraints);
        const cleanedMic = await getCleanedMicStream(micStream);
        const cleanedMicStream = cleanedMic.stream;
        micDeviceLabel = micStream.getAudioTracks()[0]?.label || "Default Microphone";
        rawStreamsRef.current = [micStream, cleanedMicStream];

        // Use the same dual-route graph in in-person mode, retaining raw audio
        // for transcription and providing a live raw fallback for saved audio.
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        ctx.onstatechange = () => {
          if (ctx.state === "suspended" && statusRef.current === "recording") ctx.resume().catch(() => {});
        };
        if (ctx.state === "suspended") await ctx.resume().catch(() => {});
        const transcriptionDestination = ctx.createMediaStreamDestination();
        const recordingDestination = ctx.createMediaStreamDestination();
        const rawSource = ctx.createMediaStreamSource(micStream);
        const cleanedSource = ctx.createMediaStreamSource(cleanedMicStream);
        const transcribeRawGain = ctx.createGain();
        const transcribeCleanGain = ctx.createGain();
        const recordRawGain = ctx.createGain();
        const recordCleanGain = ctx.createGain();
        const useCleanTrackForRecording = cleanedMic.suppressionApplied && cleanedMicStream.getAudioTracks().some((track) => track.readyState === "live");
        transcribeRawGain.gain.value = 1;
        transcribeCleanGain.gain.value = 0;
        recordRawGain.gain.value = useCleanTrackForRecording ? 0 : 1;
        recordCleanGain.gain.value = useCleanTrackForRecording ? 1 : 0;
        rawSource.connect(transcribeRawGain).connect(transcriptionDestination);
        cleanedSource.connect(transcribeCleanGain).connect(transcriptionDestination);
        rawSource.connect(recordRawGain).connect(recordingDestination);
        cleanedSource.connect(recordCleanGain).connect(recordingDestination);
        const switchGain = (gain: GainNode, value: number) => gain.gain.setTargetAtTime(value, ctx.currentTime, 0.03);
        const rawTrack = micStream.getAudioTracks()[0];
        const cleanedTrack = cleanedMicStream.getAudioTracks()[0];
        cleanedTrack?.addEventListener("ended", () => {
          if (rawTrack?.readyState === "live") {
            switchGain(recordCleanGain, 0);
            switchGain(recordRawGain, 1);
            setError("AUDIO_FILTER_WARNING: Noise suppression stopped. Recording continues with the raw microphone.");
            void flushChunksToDb();
          }
        });
        rawTrack?.addEventListener("ended", () => {
          if (cleanedTrack?.readyState === "live") {
            switchGain(transcribeRawGain, 0);
            switchGain(transcribeCleanGain, 1);
            switchGain(recordRawGain, 0);
            switchGain(recordCleanGain, 1);
            setError("AUDIO_FILTER_WARNING: The raw microphone stopped. Using the filtered microphone for recording and transcription.");
            void flushChunksToDb();
          }
        });
        finalStream = recordingDestination.stream;
        setAudioStream(transcriptionDestination.stream);

        capturedScreenInfo = {
          screenName: "Microphone (In-Person)",
          displaySurface: "unknown",
          hasSystemAudio: false,
          hasMicAudio: true,
          audioStatusLabel: "Mic Only (Without System Audio)",
        };
        setScreenInfo(capturedScreenInfo);
      }

      streamRef.current = finalStream;

      // Track health listeners
      rawStreamsRef.current.forEach((stream) => {
        stream.getAudioTracks().forEach((track) => {
          track.addEventListener("ended", () => {
            console.warn("[Studio Watchdog] Audio track ended unexpectedly");
            void flushChunksToDb();
          });
        });
      });

      // Re-enumerate after permission grant
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
        screenInfo: capturedScreenInfo,
        lastHeartbeat: new Date().toISOString(),
        notes: [],
        status: "active",
      };
      sessionMetaRef.current = sessionMeta;
      await saveSessionMeta(sessionMeta);

      // Create MediaRecorder
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

      // Layer 2: Event-driven chunk accumulation & flush
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksBufferRef.current.push(e.data);
          // When 3 or more chunks accumulate (3s), flush directly from media clock
          if (chunksBufferRef.current.length >= 3) {
            void flushChunksToDb();
          }
        }
      };

      // Engine error watchdog
      recorder.onerror = (e) => {
        console.error("[Studio Watchdog] MediaRecorder encountered an error:", e);
        setError("Recording engine warning. Checkpointing audio to disk...");
        void flushChunksToDb();
      };

      recorder.onstop = async () => {
        await flushChunksToDb();

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

            // Auto-save completed recording directly to Documents/Echo Meetings
            const saveRes = await saveToLocalDocuments(sid, blob, "completed", mediaTypeRef.current, file.name);
            if (saveRes.success && saveRes.filePath) {
              setLocalSavedPath(saveRes.filePath);
            }

            // Mark session as completed in IndexedDB
            if (sessionMetaRef.current) {
              sessionMetaRef.current.status = "completed";
              sessionMetaRef.current.elapsedSeconds = elapsedSecondsRef.current;
              sessionMetaRef.current.localFilePath = saveRes.filePath;
              await saveSessionMeta(sessionMetaRef.current);
            }
          }
        } catch (err) {
          console.error("[Studio] Failed to assemble recording:", err);
          setError("Failed to assemble recording. Audio is checkpointed in Documents/Echo Meetings.");
        }
      };

      // Request data every 1 second
      recorder.start(1000);
      if (audioProcessingWarning) setError(audioProcessingWarning);
      setStatus("recording");
      setElapsedSeconds(0);
      elapsedSecondsRef.current = 0;

      // Broadcast active recording to other tabs
      broadcastChannelRef.current?.postMessage({ type: "RECORDING_ACTIVE", sessionId: newSessionId });

      // Elapsed timer (1s intervals)
      timerRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        setElapsedSeconds((prev) => prev + 1);

        // Checkpoint to disk every 60s
        if (elapsedSecondsRef.current > 0 && elapsedSecondsRef.current % CHECKPOINT_INTERVAL_SECONDS === 0) {
          void saveRollingCheckpoint();
        }
      }, 1000);

      // Fallback IndexedDB flush timer
      flushTimerRef.current = setInterval(flushChunksToDb, FLUSH_INTERVAL_MS);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not access recording source.";
      setError(message);
      console.error("[Studio] Start recording failed:", err);

      // Clean up on failure
      rawStreamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      rawStreamsRef.current = [];
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    }
  }, [selectedDeviceId, sourceMode, mediaType, enumerateDevices, flushChunksToDb, saveRollingCheckpoint]);

  // ── Pause ──────────────────────────────────────────────────────────────
  const pause = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setStatus("paused");

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      void flushChunksToDb();
    }
  }, [flushChunksToDb]);

  // ── Resume ─────────────────────────────────────────────────────────────
  const resume = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      // Ensure AudioContext is active
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }

      recorder.resume();
      setStatus("recording");

      timerRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        setElapsedSeconds((prev) => prev + 1);

        if (elapsedSecondsRef.current > 0 && elapsedSecondsRef.current % CHECKPOINT_INTERVAL_SECONDS === 0) {
          void saveRollingCheckpoint();
        }
      }, 1000);
    }
  }, [saveRollingCheckpoint]);

  // ── Stop ───────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && (recorder.state === "recording" || recorder.state === "paused")) {
      recorder.stop();
      setStatus("stopped");

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (checkpointTimerRef.current) {
        clearInterval(checkpointTimerRef.current);
        checkpointTimerRef.current = null;
      }

      // Stop tracks
      streamRef.current?.getTracks().forEach((track) => track.stop());
      rawStreamsRef.current.forEach((s) => s.getTracks().forEach((track) => track.stop()));
      rawStreamsRef.current = [];
      setAudioStream(null);
      streamRef.current = null;

      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      // Inform other tabs
      broadcastChannelRef.current?.postMessage({ type: "RECORDING_STOPPED" });
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
    setScreenInfo(null);
    setIsSilenceDetected(false);
    setLocalSavedPath(null);
    chunksBufferRef.current = [];
    chunkIndexRef.current = 0;
    sessionMetaRef.current = null;
  }, []);

  const dismissCaptureIssue = useCallback(() => {
    setCaptureIssue(null);
  }, []);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // ── Window Focus & Wakeup Watchdog ─────────────────────────────────────
  useEffect(() => {
    const handleFocus = () => {
      if (statusRef.current === "recording" && audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume().catch(() => {});
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  // ── beforeunload: emergency checkpoint & auto-download ─────────────────
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (statusRef.current === "recording" || statusRef.current === "paused") {
        const sid = sessionIdRef.current;
        void flushChunksToDb();
        if (sid) {
          downloadSession(sid).catch(() => {});
          // Trigger synchronous checkpoint to IndexedDB
        }
        e.preventDefault();
        e.returnValue = "A live recording is active. Your recording has been auto-saved.";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [flushChunksToDb]);

  // ── visibilitychange: flush immediately when tab goes hidden ──────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && (statusRef.current === "recording" || statusRef.current === "paused")) {
        void flushChunksToDb();
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
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
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
    screenInfo,
    isSilenceDetected,
    localSavedPath,
    hasOtherTabRecording,
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
