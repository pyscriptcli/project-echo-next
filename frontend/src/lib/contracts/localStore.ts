export interface LocalContract {
  id: string;
  folderId: string;
  folderName: string;
  name: string;
  fileName: string;
  file: Blob;
  updatedAt: string;
}

export interface LocalContractWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface StoredContract extends Omit<LocalContract, "file"> {
  storedFile: string;
}

interface ContractIndex {
  version: 1;
  workspaces: LocalContractWorkspace[];
  contracts: StoredContract[];
}

type DirectoryWindow = Window & {
  showDirectoryPicker?: (options?: { id?: string; mode?: "read" | "readwrite"; startIn?: "documents" | "desktop" | "downloads" }) => Promise<FileSystemDirectoryHandle>;
};

type PermissionDirectory = FileSystemDirectoryHandle & {
  queryPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
  requestPermission?: (options: { mode: "readwrite" }) => Promise<PermissionState>;
};

const DB_NAME = "mosaic-contracts";
const STORE_NAME = "contracts";
const WORKSPACES_STORE = "workspaces";
const SETTINGS_STORE = "settings";
const DIRECTORY_KEY = "contracts-directory";
const INDEX_FILE = "contracts.json";
const FILES_FOLDER = "documents";

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (!db.objectStoreNames.contains(WORKSPACES_STORE)) db.createObjectStore(WORKSPACES_STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Contract storage could not be opened."));
  });
}

async function savedDirectory() {
  const db = await openDb();
  const handle = await new Promise<FileSystemDirectoryHandle | undefined>((resolve, reject) => {
    const request = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(DIRECTORY_KEY);
    request.onsuccess = () => resolve(request.result as FileSystemDirectoryHandle | undefined);
    request.onerror = () => reject(request.error || new Error("The contract folder setting could not be read."));
  });
  db.close();
  return handle;
}

async function saveDirectory(handle: FileSystemDirectoryHandle) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(SETTINGS_STORE, "readwrite");
    transaction.objectStore(SETTINGS_STORE).put(handle, DIRECTORY_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The contract folder could not be saved."));
  });
  db.close();
}

function supportsFolderSelection() {
  return typeof window !== "undefined" && typeof (window as DirectoryWindow).showDirectoryPicker === "function";
}

export function contractsFolderSelectionAvailable() {
  return supportsFolderSelection();
}

async function folderPermission(handle: FileSystemDirectoryHandle, request: boolean) {
  const permission = handle as PermissionDirectory;
  if (!permission.queryPermission && !permission.requestPermission) return true;
  if (await permission.queryPermission?.({ mode: "readwrite" }) === "granted") return true;
  if (!request) return false;
  return await permission.requestPermission?.({ mode: "readwrite" }) === "granted";
}

async function requireDirectory(requestPermission = false) {
  const handle = await savedDirectory();
  if (!handle) throw new Error("Choose your OneDrive folder to set up contract storage.");
  if (!await folderPermission(handle, requestPermission)) throw new Error("Reconnect the contract folder to continue.");
  return handle;
}

async function contractsDirectory(parent: FileSystemDirectoryHandle, create = true) {
  if (parent.name.toLowerCase() === "mosaic contracts") return parent;
  return parent.getDirectoryHandle("Mosaic Contracts", { create });
}

export async function getContractsFolderStatus() {
  const handle = await savedDirectory();
  if (!handle) return { connected: false, name: "", accessible: false };
  return { connected: true, name: handle.name, accessible: await folderPermission(handle, false) };
}

async function emptyIndex(): Promise<ContractIndex> {
  return { version: 1, workspaces: [], contracts: [] };
}

async function readIndex(root: FileSystemDirectoryHandle): Promise<ContractIndex> {
  try {
    const file = await (await root.getFileHandle(INDEX_FILE)).getFile();
    const parsed = JSON.parse(await file.text()) as Partial<ContractIndex>;
    if (parsed.version !== 1 || !Array.isArray(parsed.workspaces) || !Array.isArray(parsed.contracts)) throw new Error("The contract folder index has an unsupported format.");
    return { version: 1, workspaces: parsed.workspaces, contracts: parsed.contracts };
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return emptyIndex();
    throw error;
  }
}

async function writeFile(root: FileSystemDirectoryHandle, name: string, value: Blob | string) {
  const handle = await root.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(value);
  await writable.close();
}

async function writeIndex(root: FileSystemDirectoryHandle, index: ContractIndex) {
  await writeFile(root, INDEX_FILE, JSON.stringify(index, null, 2));
}

async function ensureFilesDirectory(root: FileSystemDirectoryHandle) {
  return root.getDirectoryHandle(FILES_FOLDER, { create: true });
}

async function legacyRecords() {
  const db = await openDb();
  const records = await Promise.all([
    new Promise<LocalContract[]>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
      request.onsuccess = () => resolve(request.result as LocalContract[]);
      request.onerror = () => reject(request.error || new Error("Previously saved contracts could not be read."));
    }),
    new Promise<LocalContractWorkspace[]>((resolve, reject) => {
      const request = db.transaction(WORKSPACES_STORE, "readonly").objectStore(WORKSPACES_STORE).getAll();
      request.onsuccess = () => resolve(request.result as LocalContractWorkspace[]);
      request.onerror = () => reject(request.error || new Error("Previously saved workspaces could not be read."));
    }),
  ]);
  db.close();
  return { contracts: records[0], workspaces: records[1] };
}

export async function legacyContractCount() {
  return (await legacyRecords()).contracts.length;
}

export async function listLocalWorkspaces() {
  const root = await requireDirectory();
  return (await readIndex(await contractsDirectory(root))).workspaces.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveLocalWorkspace(workspace: LocalContractWorkspace) {
  const root = await contractsDirectory(await requireDirectory(true));
  const index = await readIndex(root);
  index.workspaces = [workspace, ...index.workspaces.filter((item) => item.id !== workspace.id)];
  await writeIndex(root, index);
}

export async function deleteLocalWorkspace(id: string) {
  const root = await contractsDirectory(await requireDirectory(true));
  const index = await readIndex(root);
  const removed = index.contracts.filter((contract) => contract.folderId === `local-${id}`);
  const files = await ensureFilesDirectory(root);
  for (const contract of removed) await files.removeEntry(contract.storedFile).catch(() => undefined);
  index.contracts = index.contracts.filter((contract) => contract.folderId !== `local-${id}`);
  index.workspaces = index.workspaces.filter((workspace) => workspace.id !== id);
  await writeIndex(root, index);
}

export async function listContracts(folderId: string) {
  const root = await contractsDirectory(await requireDirectory());
  const index = await readIndex(root);
  const files = await ensureFilesDirectory(root);
  const rows = await Promise.all(index.contracts.filter((contract) => contract.folderId === folderId).map(async (contract) => {
    const file = await (await files.getFileHandle(contract.storedFile)).getFile();
    return { ...contract, file };
  }));
  return rows.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function saveContract(contract: LocalContract) {
  const root = await contractsDirectory(await requireDirectory(true));
  const files = await ensureFilesDirectory(root);
  const storedFile = `${contract.id}.docx`;
  await writeFile(files, storedFile, contract.file);
  const index = await readIndex(root);
  const metadata: StoredContract = {
    id: contract.id,
    folderId: contract.folderId,
    folderName: contract.folderName,
    name: contract.name,
    fileName: contract.fileName,
    updatedAt: contract.updatedAt,
    storedFile,
  };
  index.contracts = [metadata, ...index.contracts.filter((item) => item.id !== contract.id)];
  if (!index.workspaces.some((workspace) => `local-${workspace.id}` === contract.folderId)) {
    const existing = index.workspaces.find((workspace) => workspace.name === contract.folderName);
    if (!existing) index.workspaces.unshift({ id: contract.folderId.replace(/^local-/, ""), name: contract.folderName, createdAt: contract.updatedAt, updatedAt: contract.updatedAt });
  }
  await writeIndex(root, index);
}

export async function deleteContract(id: string) {
  const root = await contractsDirectory(await requireDirectory(true));
  const index = await readIndex(root);
  const current = index.contracts.find((contract) => contract.id === id);
  if (current) await (await ensureFilesDirectory(root)).removeEntry(current.storedFile).catch(() => undefined);
  index.contracts = index.contracts.filter((contract) => contract.id !== id);
  await writeIndex(root, index);
}

export async function chooseContractsFolder() {
  const picker = (window as DirectoryWindow).showDirectoryPicker;
  if (!picker) throw new Error("Open Mosaic in Chrome or Edge on a computer to choose the contract folder.");
  const selected = await picker({ id: "mosaic-contract-storage", mode: "readwrite", startIn: "documents" });
  const root = await contractsDirectory(selected);
  await ensureFilesDirectory(root);
  await saveDirectory(selected.name.toLowerCase() === "mosaic contracts" ? selected : root);
  const migratedCount = await migrateLegacyContracts();
  return { name: root.name, migratedCount };
}

export async function reconnectContractsFolder() {
  const root = await savedDirectory();
  if (!root) return false;
  if (!await folderPermission(root, true)) return false;
  await contractsDirectory(root);
  return true;
}

export async function migrateLegacyContracts() {
  const root = await contractsDirectory(await requireDirectory(true));
  const currentIndex = await readIndex(root);
  const legacy = await legacyRecords();
  const existingIds = new Set(currentIndex.contracts.map((contract) => contract.id));
  const workspaceMap = new Map<string, LocalContractWorkspace>();
  for (const workspace of legacy.workspaces) workspaceMap.set(`local-${workspace.id}`, workspace);
  for (const contract of legacy.contracts) {
    const oldFolderId = String(contract.folderId);
    if (!workspaceMap.has(oldFolderId)) {
      const id = oldFolderId.startsWith("local-") ? oldFolderId.slice("local-".length) : `import-${oldFolderId}`;
      workspaceMap.set(oldFolderId, { id, name: contract.folderName || "Imported contracts", createdAt: contract.updatedAt, updatedAt: contract.updatedAt });
    }
  }
  for (const workspace of workspaceMap.values()) {
    if (!currentIndex.workspaces.some((item) => item.id === workspace.id)) currentIndex.workspaces.push(workspace);
  }
  await writeIndex(root, currentIndex);
  for (const workspace of workspaceMap.values()) {
    const id = `local-${workspace.id}`;
    for (const contract of legacy.contracts.filter((item) => String(item.folderId) === id || (!String(item.folderId).startsWith("local-") && workspace.id === `import-${item.folderId}`))) {
      if (existingIds.has(contract.id)) continue;
      await saveContract({ ...contract, folderId: id, folderName: workspace.name });
      existingIds.add(contract.id);
    }
  }
  await writeIndex(root, await readIndex(root));
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, WORKSPACES_STORE], "readwrite");
    transaction.objectStore(STORE_NAME).clear();
    transaction.objectStore(WORKSPACES_STORE).clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The old browser copies could not be cleared."));
  });
  db.close();
  return legacy.contracts.length;
}
