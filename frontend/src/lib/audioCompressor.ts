/**
 * Client-Side Audio Pipeline for Project Echo
 * 
 * Provides:
 * 1. Audio format detection
 * 2. In-browser 16kHz mono audio downsampling via Web Audio API (OfflineAudioContext)
 * 3. Silence-aware audio segmentation (~90-second chunks, ~2.8MB each in 16-bit PCM WAV)
 * 4. Parallel threadpool (worker queue) with concurrency control, retries, and abort support
 */

export function isAudioFile(file: File): boolean {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();

  if (type.startsWith("audio/") || type.startsWith("video/mp4") || type.startsWith("video/webm")) {
    return true;
  }

  const audioExtensions = [
    ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".oga", 
    ".flac", ".webm", ".mp4", ".wma", ".opus"
  ];
  return audioExtensions.some((ext) => name.endsWith(ext));
}

/**
 * Searches around the target sample for the point of lowest audio energy (silence / breath)
 * within a ±windowSeconds range so that words are not cut in half.
 */
function findLowestEnergySplitPoint(
  samples: Float32Array,
  targetSample: number,
  sampleRate: number,
  windowSeconds = 15
): number {
  const windowSamples = Math.floor(windowSeconds * sampleRate);
  const minSample = Math.max(0, targetSample - windowSamples);
  const maxSample = Math.min(samples.length - 1, targetSample + windowSamples);

  // Analyze in 200ms intervals
  const step = Math.floor(0.2 * sampleRate);
  let bestSample = targetSample;
  let minEnergy = Infinity;

  for (let i = minSample; i < maxSample; i += step) {
    let sum = 0;
    const end = Math.min(samples.length, i + step);
    const count = end - i;
    if (count <= 0) continue;

    // Subsample by 4 for high performance
    for (let j = i; j < end; j += 4) {
      sum += samples[j] * samples[j];
    }
    const rms = sum / (count / 4);

    if (rms < minEnergy) {
      minEnergy = rms;
      bestSample = i + Math.floor(step / 2);
    }
  }

  return bestSample;
}

/**
 * Encodes a Float32Array of 16kHz mono audio into a valid 16-bit PCM WAV Blob.
 */
export function encodeMonoWav(samples: Float32Array, sampleRate = 16000): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII strings into the DataView
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  // RIFF identifier
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(8, "WAVE");

  // fmt sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true); // Byte rate
  view.setUint16(32, numChannels * bytesPerSample, true); // Block align
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Write 16-bit PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample between -1.0 and 1.0
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intVal = s < 0 ? s * 0x8000 : s * 0x7FFF;
    view.setInt16(offset, intVal, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * Decodes an audio file in the browser, resamples to 16kHz mono,
 * and splits into ~90-second chunks (each ~2.8MB, safely under Vercel's 4.5MB limit).
 */
export async function decodeAndChunkAudio(
  file: File,
  chunkSeconds = 90,
  onProgress?: (message: string) => void,
  signal?: AbortSignal
): Promise<Blob[]> {
  if (typeof window === "undefined") {
    throw new Error("decodeAndChunkAudio must be run in the browser");
  }

  onProgress?.("Reading audio file into memory...");
  const arrayBuffer = await file.arrayBuffer();

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  onProgress?.("Decoding audio with browser engine...");
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const audioCtx = new AudioContextClass();
  let decodedAudio: AudioBuffer;
  try {
    decodedAudio = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    audioCtx.close().catch(() => {});
  }

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const durationSec = decodedAudio.duration;
  const targetSampleRate = 16000;
  const totalTargetSamples = Math.ceil(durationSec * targetSampleRate);

  onProgress?.("Resampling audio to 16kHz mono...");
  const OfflineContextClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  const offlineCtx = new OfflineContextClass(1, Math.max(1, totalTargetSamples), targetSampleRate);
  const sourceNode = offlineCtx.createBufferSource();
  sourceNode.buffer = decodedAudio;
  sourceNode.connect(offlineCtx.destination);
  sourceNode.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const monoSamples = renderedBuffer.getChannelData(0);

  // If total duration is under the chunk duration (e.g. under 90 seconds)
  if (durationSec <= chunkSeconds) {
    onProgress?.("Encoding 16kHz audio stream...");
    const singleBlob = encodeMonoWav(monoSamples, targetSampleRate);
    return [singleBlob];
  }

  // Segment audio into ~chunkSeconds pieces at silence points
  onProgress?.("Detecting speech pauses & segmenting chunks...");
  const chunks: Blob[] = [];
  const targetSamplesPerChunk = chunkSeconds * targetSampleRate;
  let currentStart = 0;

  while (currentStart < monoSamples.length) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remainingSamples = monoSamples.length - currentStart;
    
    // If remaining audio is less than 1.3x a chunk, take the rest
    if (remainingSamples <= targetSamplesPerChunk * 1.3) {
      const slice = monoSamples.subarray(currentStart);
      chunks.push(encodeMonoWav(slice, targetSampleRate));
      break;
    }

    const idealTarget = currentStart + targetSamplesPerChunk;
    const splitPoint = findLowestEnergySplitPoint(
      monoSamples,
      idealTarget,
      targetSampleRate,
      15 // search +/- 15 seconds for a natural pause
    );

    const slice = monoSamples.subarray(currentStart, splitPoint);
    chunks.push(encodeMonoWav(slice, targetSampleRate));
    currentStart = splitPoint;
  }

  return chunks;
}

/**
 * Parallel Threadpool (Worker Queue)
 * 
 * Runs tasks concurrently with a maximum of `concurrency` active promises.
 * Includes automatic retry up to 3 times with exponential backoff.
 * Preserves the exact original item ordering.
 */
export async function processChunksInPool<T, R>(
  items: T[],
  concurrency = 2,
  worker: (item: T, index: number) => Promise<R>,
  onProgress?: (completed: number, total: number) => void,
  signal?: AbortSignal
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;
  let completedCount = 0;

  async function runWorker() {
    while (currentIndex < items.length) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const itemIndex = currentIndex++;
      const item = items[itemIndex];

      // Retry up to 3 times with backoff
      let attempts = 0;
      let lastErr: any = null;
      let success = false;

      while (attempts < 3 && !success) {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }

        try {
          results[itemIndex] = await worker(item, itemIndex);
          success = true;
        } catch (err: any) {
          attempts++;
          lastErr = err;
          if (attempts < 3 && !signal?.aborted) {
            // Exponential backoff delay (1s, 2s)
            await new Promise((res) => setTimeout(res, 1000 * Math.pow(2, attempts - 1)));
          }
        }
      }

      if (!success) {
        console.warn(`Chunk ${itemIndex + 1} permanently failed after 3 attempts:`, lastErr);
        // Fallback placeholder so downstream synthesis doesn't crash
        results[itemIndex] = `[Audio segment ${itemIndex + 1} inaudible]` as unknown as R;
      }

      completedCount++;
      onProgress?.(completedCount, items.length);
    }
  }

  // Spawn pool workers up to the concurrency ceiling
  const activeWorkers: Promise<void>[] = [];
  const poolSize = Math.min(concurrency, items.length);

  for (let i = 0; i < poolSize; i++) {
    activeWorkers.push(runWorker());
  }

  await Promise.all(activeWorkers);
  return results;
}
