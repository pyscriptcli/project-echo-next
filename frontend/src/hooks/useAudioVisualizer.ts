"use client";

import { useEffect, useRef, useState } from "react";

interface AudioVisualizerState {
  /** Normalized volume level from 0 to 100. */
  volumeLevel: number;
  /** True when the input signal is near clipping (volume > 90). */
  isClipping: boolean;
}

/**
 * Connects to an active MediaStream and provides real-time volume levels
 * via Web Audio API AnalyserNode. Cleans up automatically on unmount.
 */
export function useAudioVisualizer(stream: MediaStream | null): AudioVisualizerState {
  const [state, setState] = useState<AudioVisualizerState>({ volumeLevel: 0, isClipping: false });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream) {
      setState({ volumeLevel: 0, isClipping: false });
      return;
    }

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    // Resume if suspended (Chrome autoplay policy)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyserRef.current = analyser;

    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    sourceRef.current = source;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(dataArray);

      // Compute RMS from time-domain data (centered at 128)
      let sumSquares = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const rms = Math.sqrt(sumSquares / dataArray.length);

      // Map RMS (typically 0–0.5 for speech) to 0–100 with headroom
      const volumeLevel = Math.min(100, Math.round(rms * 200));
      const isClipping = volumeLevel > 90;

      setState({ volumeLevel, isClipping });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      sourceRef.current?.disconnect();
      analyserRef.current = null;
      sourceRef.current = null;
      audioCtx.close().catch(() => {});
      audioCtxRef.current = null;
    };
  }, [stream]);

  return state;
}
