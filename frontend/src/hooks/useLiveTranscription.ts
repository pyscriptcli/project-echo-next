"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeRecordingBatch } from "@/lib/api";

type LiveTranscriptStatus = "idle" | "recording" | "processing" | "ready" | "waiting";

const BATCH_MS = 45_000;

export function useLiveTranscription(audioStream: MediaStream | null) {
  const [status, setStatus] = useState<LiveTranscriptStatus>("idle");
  const [completedBatches, setCompletedBatches] = useState(0);
  const segmentsRef = useRef(new Map<number, string>());
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const batchIndexRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const streamRef = useRef<MediaStream | null>(null);
  const shouldContinueRef = useRef(false);
  const startSegmentRef = useRef<(stream: MediaStream) => void>(() => {});

  const enqueue = useCallback((blob: Blob, index: number) => {
    if (!blob.size) return;
    setStatus(navigator.onLine ? "processing" : "waiting");
    queueRef.current = queueRef.current.then(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const transcript = await transcribeRecordingBatch(blob, index);
          segmentsRef.current.set(index, transcript);
          setCompletedBatches(segmentsRef.current.size);
          setStatus("recording");
          return;
        } catch {
          if (attempt === 2) {
            setStatus("waiting");
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    });
  }, []);

  const startSegment = useCallback((stream: MediaStream) => {
    if (!shouldContinueRef.current || stream.getAudioTracks().every((track) => track.readyState === "ended")) return;
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => {
      const index = batchIndexRef.current++;
      enqueue(new Blob(chunks, { type: mimeType }), index);
      recorderRef.current = null;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      if (shouldContinueRef.current && streamRef.current) startSegmentRef.current(streamRef.current);
    };
    recorder.start(1000);
    setStatus("recording");
    timerRef.current = window.setTimeout(() => {
      if (recorder.state !== "inactive") recorder.stop();
    }, BATCH_MS);
  }, [enqueue]);

  useEffect(() => {
    startSegmentRef.current = startSegment;
  }, [startSegment]);

  useEffect(() => {
    streamRef.current = audioStream;
    if (audioStream) {
      shouldContinueRef.current = true;
      if (!recorderRef.current) startSegment(audioStream);
      return;
    }
    shouldContinueRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, [audioStream, startSegment]);

  const finalize = useCallback(async () => {
    shouldContinueRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        const previous = recorder.onstop;
        recorder.onstop = (event) => {
          previous?.call(recorder, event);
          resolve();
        };
        recorder.stop();
      });
    }
    setStatus("processing");
    await queueRef.current;
    setStatus("ready");
    const transcript = Array.from(segmentsRef.current.entries())
      .sort(([left], [right]) => left - right)
      .map(([, transcript]) => transcript)
      .filter(Boolean)
      .join("\n");
    return segmentsRef.current.size === batchIndexRef.current ? transcript : "";
  }, []);

  const reset = useCallback(() => {
    segmentsRef.current.clear();
    batchIndexRef.current = 0;
    queueRef.current = Promise.resolve();
    setCompletedBatches(0);
    setStatus("idle");
  }, []);

  return { status, completedBatches, finalize, reset };
}
