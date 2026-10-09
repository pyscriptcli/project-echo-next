export interface LocalContract {
  id: string;
  folderId: string;
  folderName: string;
  name: string;
  fileName: string;
  file: Blob;
  updatedAt: string;
}

const DB_NAME = "mosaic-contracts";
const STORE_NAME = "contracts";
const WORKSPACES_STORE = "workspaces";

export interface LocalContractWorkspace {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
      if (!request.result.objectStoreNames.contains(WORKSPACES_STORE)) request.result.createObjectStore(WORKSPACES_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local contract storage could not be opened."));
  });
}

export async function listLocalWorkspaces() {
  const db = await openDb();
  const workspaces = await new Promise<LocalContractWorkspace[]>((resolve, reject) => {
    const request = db.transaction(WORKSPACES_STORE, "readonly").objectStore(WORKSPACES_STORE).getAll();
    request.onsuccess = () => resolve((request.result as LocalContractWorkspace[]).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    request.onerror = () => reject(request.error || new Error("Local contract workspaces could not be loaded."));
  });
  db.close();
  return workspaces;
}

export async function saveLocalWorkspace(workspace: LocalContractWorkspace) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(WORKSPACES_STORE, "readwrite");
    transaction.objectStore(WORKSPACES_STORE).put(workspace);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The local workspace could not be saved."));
  });
  db.close();
}

export async function deleteLocalWorkspace(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([WORKSPACES_STORE, STORE_NAME], "readwrite");
    transaction.objectStore(WORKSPACES_STORE).delete(id);
    const contracts = transaction.objectStore(STORE_NAME).getAll();
    contracts.onsuccess = () => {
      for (const contract of contracts.result as LocalContract[]) {
        if (contract.folderId === `local-${id}`) transaction.objectStore(STORE_NAME).delete(contract.id);
      }
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The local workspace could not be deleted."));
  });
  db.close();
}

export async function listContracts(folderId: string) {
  const db = await openDb();
  const records = await new Promise<LocalContract[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as LocalContract[]).filter((contract) => contract.folderId === folderId).sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)));
    request.onerror = () => reject(request.error || new Error("Contracts could not be loaded from this device."));
  });
  db.close();
  return records;
}

export async function saveContract(contract: LocalContract) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(contract);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The contract could not be saved on this device."));
  });
  db.close();
}

export async function deleteContract(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("The contract could not be deleted from this device."));
  });
  db.close();
}
