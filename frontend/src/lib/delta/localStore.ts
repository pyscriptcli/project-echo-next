import type { DeltaEntry } from "./compare";

export interface SavedDeltaReview {
  id: string;
  title: string;
  contextId?: string;
  contextName?: string;
  savedAt: string;
  originalName: string;
  revisedName: string;
  entries: DeltaEntry[];
  commentsFound: boolean;
  registerFile?: Blob;
  originalFile?: File;
  revisedFile?: File;
}

type DirectoryWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: "documents" | "desktop" | "downloads" }) => Promise<FileSystemDirectoryHandle>;
};

const DB_NAME = "project-echo-delta";
const STORE_NAME = "handles";
const HANDLE_KEY = "reviews-directory";

function openHandleDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local review storage could not be opened."));
  });
}

async function saveDirectoryHandle(handle: FileSystemDirectoryHandle) {
  const db = await openHandleDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The save folder could not be remembered."));
  });
  db.close();
}

async function getSavedDirectoryHandle() {
  const db = await openHandleDb();
  const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle | undefined);
    request.onerror = () => reject(request.error || new Error("The saved folder could not be read."));
  });
  db.close();
  return handle;
}

async function requestFolderPermission(handle: FileSystemDirectoryHandle) {
  const permissionHandle = handle as FileSystemDirectoryHandle & {
    queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
    requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  };
  const current = await permissionHandle.queryPermission?.({ mode: "readwrite" });
  if (current === "granted") return;
  const requested = await permissionHandle.requestPermission?.({ mode: "readwrite" });
  if (requested !== "granted") throw new Error("Allow DELTA to access the Documents folder to save or reopen reviews.");
}

async function reviewsDirectory(parent: FileSystemDirectoryHandle, create: boolean) {
  return parent.getDirectoryHandle("DELTA Reviews", { create });
}

export async function chooseReviewFolder() {
  const picker = (window as DirectoryWindow).showDirectoryPicker;
  if (!picker) throw new Error("This browser does not support local folder saving. Use a Chromium browser with File System Access, such as Chrome, Edge, or Brave.");
  const documents = await picker({ id: "project-echo-delta-documents", mode: "readwrite", startIn: "documents" });
  if (documents.name.toLowerCase() !== "documents") throw new Error("Choose the Documents folder. DELTA will create its review folder there.");
  await requestFolderPermission(documents);
  const folder = await reviewsDirectory(documents, true);
  await saveDirectoryHandle(documents);
  return folder.name;
}

async function authorizedReviewsDirectory() {
  const parent = await getSavedDirectoryHandle();
  if (!parent) throw new Error("Choose Documents as the save location before saving a review.");
  await requestFolderPermission(parent);
  return reviewsDirectory(parent, true);
}

async function writeFile(directory: FileSystemDirectoryHandle, name: string, value: Blob | string) {
  const handle = await directory.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(value);
  await writable.close();
}

async function readReviewIds(root: FileSystemDirectoryHandle) {
  try {
    const file = await (await root.getFileHandle("index.json")).getFile();
    const value = JSON.parse(await file.text());
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function saveReview(review: SavedDeltaReview) {
  const root = await authorizedReviewsDirectory();
  const directory = await root.getDirectoryHandle(`review-${review.id}`, { create: true });
  const { originalFile: _original, revisedFile: _revised, registerFile: _register, ...saved } = review;
  await writeFile(directory, "review.json", JSON.stringify(saved, null, 2));
  if (review.originalFile) await writeFile(directory, "original.docx", review.originalFile);
  if (review.revisedFile) await writeFile(directory, "reviewed.docx", review.revisedFile);
  if (review.registerFile) await writeFile(directory, "register.docx", review.registerFile);
  const ids = await readReviewIds(root);
  await writeFile(root, "index.json", JSON.stringify(Array.from(new Set([...ids, review.id]))));
}

export async function listReviews() {
  const root = await authorizedReviewsDirectory();
  const reviews: SavedDeltaReview[] = [];
  for (const id of await readReviewIds(root)) {
    try {
      const directory = await root.getDirectoryHandle(`review-${id}`);
      const metadataFile = await (await directory.getFileHandle("review.json")).getFile();
      const review = JSON.parse(await metadataFile.text()) as SavedDeltaReview;
      const originalFile = await (await directory.getFileHandle("original.docx")).getFile().catch(() => undefined);
      const revisedFile = await (await directory.getFileHandle("reviewed.docx")).getFile().catch(() => undefined);
      reviews.push({ ...review, originalFile, revisedFile });
    } catch {
      // Incomplete folders are skipped; they remain on disk for manual recovery.
    }
  }
  return reviews.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
}

export async function deleteReview(id: string) {
  const root = await authorizedReviewsDirectory();
  await root.removeEntry(`review-${id}`, { recursive: true }).catch(() => undefined);
  await writeFile(root, "index.json", JSON.stringify((await readReviewIds(root)).filter((savedId) => savedId !== id)));
}

export async function hasChosenFolder() {
  return Boolean(await getSavedDirectoryHandle());
}
