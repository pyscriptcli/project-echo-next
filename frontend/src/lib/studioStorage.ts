"use client";

/**
 * Studio Storage Layer — IndexedDB persistence for crash-resilient recording.
 *
 * Database: echo_studio_db
 * Stores:
 *   - recording_chunks: Raw audio Blob chunks keyed by {sessionId}_{chunkIndex}
 *   - recording_sessions: Session metadata (start time, notes, elapsed, status)
 */

import type { StudioNote, StudioSession } from "@/types/studio";

const DB_NAME = "echo_studio_db";
const DB_VERSION = 1;
const CHUNKS_STORE = "recording_chunks";
const SESSIONS_STORE = "recording_sessions";

interface ChunkRecord {
  id: string;
  sessionId: string;
  index: number;
  blob: Blob;
}

// ─────────────────────────────────────────────────────────────────────────────
// Database Connection (lazy singleton)
// ─────────────────────────────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

/** Opens or returns the singleton IndexedDB connection. */
export function openStudioDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const chunkStore = db.createObjectStore(CHUNKS_STORE, { keyPath: "id" });
        chunkStore.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "sessionId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves a raw audio chunk to IndexedDB.
 * Called every ~10 seconds during active recording for crash resilience.
 */
export async function saveChunk(sessionId: string, index: number, blob: Blob): Promise<void> {
  const db = await openStudioDb();
  const id = `${sessionId}_chunk_${index}`;
  const record: ChunkRecord = { id, sessionId, index, blob };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, "readwrite");
    tx.objectStore(CHUNKS_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all chunks for a session, sorted by index.
 */
async function getChunks(sessionId: string): Promise<ChunkRecord[]> {
  const db = await openStudioDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHUNKS_STORE, "readonly");
    const index = tx.objectStore(CHUNKS_STORE).index("sessionId");
    const request = index.getAll(sessionId);
    request.onsuccess = () => {
      const chunks = (request.result as ChunkRecord[]).sort((a, b) => a.index - b.index);
      resolve(chunks);
    };
    request.onerror = () => reject(request.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Operations
// ─────────────────────────────────────────────────────────────────────────────

/** Creates or updates session metadata in IndexedDB. */
export async function saveSessionMeta(session: StudioSession): Promise<void> {
  const db = await openStudioDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    tx.objectStore(SESSIONS_STORE).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Finds sessions that were left in 'active' status — these are interrupted
 * recordings from a crash or unexpected tab close.
 */
export async function getInterruptedSessions(): Promise<StudioSession[]> {
  const db = await openStudioDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const request = tx.objectStore(SESSIONS_STORE).getAll();
    request.onsuccess = () => {
      const all = request.result as StudioSession[];
      resolve(all.filter((s) => s.status === "active"));
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Assembles all chunks for a session into a single audio Blob.
 * The chunks are assumed to be raw MediaRecorder output (WebM/Ogg containers).
 */
export async function assembleRecording(sessionId: string): Promise<Blob> {
  const chunks = await getChunks(sessionId);
  if (chunks.length === 0) {
    throw new Error(`No audio chunks found for session ${sessionId}`);
  }

  // Use the MIME type from the first chunk, fall back to audio/webm
  const mimeType = chunks[0].blob.type || "audio/webm";
  return new Blob(
    chunks.map((c) => c.blob),
    { type: mimeType }
  );
}

/**
 * Assembles and returns a File object ready for download or Notetaker handoff.
 */
export async function exportSessionAsFile(sessionId: string): Promise<File> {
  const blob = await assembleRecording(sessionId);
  const ext = blob.type.includes("webm") ? "webm" : "wav";
  return new File([blob], `echo-recording-${sessionId}.${ext}`, { type: blob.type });
}

/**
 * Deletes all chunks and metadata for a session.
 * Called after successful handoff to Notetaker or manual discard.
 */
export async function clearSession(sessionId: string): Promise<void> {
  const db = await openStudioDb();

  // Delete all chunks for this session
  const chunks = await getChunks(sessionId);
  const chunkTx = db.transaction(CHUNKS_STORE, "readwrite");
  const chunkStore = chunkTx.objectStore(CHUNKS_STORE);
  for (const chunk of chunks) {
    chunkStore.delete(chunk.id);
  }
  await new Promise<void>((resolve, reject) => {
    chunkTx.oncomplete = () => resolve();
    chunkTx.onerror = () => reject(chunkTx.error);
  });

  // Delete session metadata
  const sessionTx = db.transaction(SESSIONS_STORE, "readwrite");
  sessionTx.objectStore(SESSIONS_STORE).delete(sessionId);
  await new Promise<void>((resolve, reject) => {
    sessionTx.oncomplete = () => resolve();
    sessionTx.onerror = () => reject(sessionTx.error);
  });
}

/**
 * Triggers a browser download for a session's recording.
 * Used for auto-download on interruption and manual recovery.
 */
export async function downloadSession(sessionId: string): Promise<void> {
  const file = await exportSessionAsFile(sessionId);
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();

  // Cleanup after a short delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 1000);
}
