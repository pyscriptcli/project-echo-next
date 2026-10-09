"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Download, FileText, FolderKanban, LoaderCircle, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from "lucide-react";
import { DeltaReview } from "@/components/DeltaReview";
import { deleteContract, deleteLocalWorkspace, listContracts, listLocalWorkspaces, saveContract, saveLocalWorkspace, type LocalContract, type LocalContractWorkspace } from "@/lib/contracts/localStore";

interface ContractFolder {
  id: string;
  name: string;
  url: string;
  listCount: number;
  spaceName: string;
  spaceId: string;
  teamName?: string;
}

interface ContractSpace {
  id: string;
  name: string;
  teamId: string;
  teamName: string;
}

function routeSlug(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "folder";
}

function ContractsHeader({ title, subtitle, onBack, actions }: { title: string; subtitle: string; onBack?: () => void; actions?: ReactNode }) {
  return <header className="flex flex-col justify-between gap-3 border-b border-[#003366]/15 pb-4 md:flex-row md:items-end">
    <div className="flex items-start gap-3">
      {onBack && <button type="button" onClick={onBack} aria-label="Back to contracts" title="Back to contracts" className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center border border-slate-300 bg-white text-[#003366] hover:border-[#003366] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><ArrowLeft aria-hidden="true" className="h-4 w-4" /></button>}
      <div className="border-l-4 border-[#C9A84C] pl-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#31577D]">Contracts</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-[#003366]">{title}</h1><p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">{subtitle}</p></div>
    </div>
    {actions && <div className="flex flex-wrap gap-2 self-start md:self-auto">{actions}</div>}
  </header>;
}

function ContractGallery({ folderId, folderName, onCompare }: { folderId: string; folderName: string; onCompare: (original: File, revised: File) => void }) {
  const [contracts, setContracts] = useState<LocalContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try { setContracts(await listContracts(folderId)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Contracts could not be loaded from this device."); }
    finally { setLoading(false); }
  }, [folderId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openNew = () => { setEditingId(""); setName(""); setFile(null); setError(""); setDialogOpen(true); };
  const openEdit = (contract: LocalContract) => { setEditingId(contract.id); setName(contract.name); setFile(null); setError(""); setDialogOpen(true); };

  const save = async () => {
    const current = contracts.find((contract) => contract.id === editingId);
    const chosenFile = file || current?.file;
    if (!name.trim()) { setError("Enter a contract name."); return; }
    if (!chosenFile) { setError("Choose a .docx file for this contract."); return; }
    if (file && !file.name.toLowerCase().endsWith(".docx")) { setError("Choose a Word document (.docx)."); return; }
    setSaving(true); setError("");
    try {
      await saveContract({
        id: editingId || crypto.randomUUID(), folderId, folderName, name: name.trim(),
        fileName: file?.name || current?.fileName || "contract.docx", file: chosenFile,
        updatedAt: new Date().toISOString(),
      });
      setDialogOpen(false);
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The contract could not be saved."); }
    finally { setSaving(false); }
  };

  const remove = async (contract: LocalContract) => {
    if (!window.confirm(`Delete “${contract.name}” and its local Word file?`)) return;
    try { await deleteContract(contract.id); setSelectedIds((current) => current.filter((id) => id !== contract.id)); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The contract could not be deleted."); }
  };

  const download = (contract: LocalContract) => {
    const url = URL.createObjectURL(contract.file);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = contract.fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const toggleSelected = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current);
  const compareSelected = () => {
    const [original, revised] = selectedIds.map((id) => contracts.find((contract) => contract.id === id)).filter((contract): contract is LocalContract => Boolean(contract));
    if (original && revised) onCompare(new File([original.file], original.fileName, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }), new File([revised.file], revised.fileName, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
  };

  return <section className="border border-slate-200 bg-white">
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-semibold text-[#003366]">Contract gallery</h2><p className="mt-1 text-xs text-slate-600">Add and manage contract documents for {folderName}. Files stay on this device.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh contracts" title="Refresh contracts" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-[#003366] hover:border-[#003366] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" onClick={openNew} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white hover:bg-[#174778]"><Plus aria-hidden="true" className="h-4 w-4" />Add contract</button></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#F7FAFC] px-4 py-2.5"><p className="text-[11px] text-slate-600">{contracts.length} contract{contracts.length === 1 ? "" : "s"} · select two documents to compare them.</p><button type="button" onClick={compareSelected} disabled={selectedIds.length !== 2} className="inline-flex min-h-8 items-center gap-2 border border-slate-300 bg-white px-3 text-[11px] font-semibold text-[#003366] hover:border-[#003366] disabled:cursor-not-allowed disabled:opacity-50"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Compare selected</button></div>
    {error && !dialogOpen && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</p>}
    {loading ? <div role="status" className="flex items-center gap-2 px-4 py-8 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />Loading contracts</div>
      : contracts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-xs"><thead className="bg-slate-50 text-[10px] font-semibold text-slate-600"><tr><th className="w-10 border-b border-slate-200 px-3 py-2" scope="col"><span className="sr-only">Select</span></th><th className="border-b border-slate-200 px-3 py-2" scope="col">Contract</th><th className="border-b border-slate-200 px-3 py-2" scope="col">Document</th><th className="border-b border-slate-200 px-3 py-2" scope="col">Updated</th><th className="w-36 border-b border-slate-200 px-3 py-2 text-right" scope="col">Manage</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id} className="border-b border-slate-100 last:border-0 hover:bg-[#FFFCFB]"><td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${contract.name} for comparison`} checked={selectedIds.includes(contract.id)} disabled={!selectedIds.includes(contract.id) && selectedIds.length >= 2} onChange={() => toggleSelected(contract.id)} className="h-4 w-4 accent-[#003366]" /></td><td className="max-w-[380px] px-3 py-3 font-semibold text-[#003366]">{contract.name}</td><td className="max-w-[280px] truncate px-3 py-3 text-slate-600" title={contract.fileName}>{contract.fileName}</td><td className="whitespace-nowrap px-3 py-3 text-slate-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(contract.updatedAt))}</td><td className="px-3 py-2"><div className="flex justify-end gap-1"><button type="button" onClick={() => download(contract)} aria-label={`Download ${contract.name}`} title="Download document" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Download aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => openEdit(contract)} aria-label={`Edit ${contract.name}`} title="Edit contract" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void remove(contract)} aria-label={`Delete ${contract.name}`} title="Delete contract" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-700"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>
      : <div className="px-5 py-12 text-center"><FileText aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h3 className="mt-3 text-sm font-semibold text-[#003366]">No contracts in this folder</h3><p className="mt-1 text-xs text-slate-600">Add a Word document to start a contract gallery for this folder.</p><button type="button" onClick={openNew} className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white"><Plus aria-hidden="true" className="h-4 w-4" />Add contract</button></div>}
    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setDialogOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="contract-editor-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#31577D]">{folderName}</p><h3 id="contract-editor-title" className="mt-1 text-base font-semibold text-[#003366]">{editingId ? "Edit contract" : "Add contract"}</h3></div><button type="button" aria-label="Close" onClick={() => setDialogOpen(false)} className="inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:text-[#003366]"><X aria-hidden="true" className="h-4 w-4" /></button></header><div className="space-y-4 p-5"><label className="block text-xs font-semibold text-[#003366]">Contract name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-800 focus:border-[#003366] focus:outline-none" placeholder="e.g. Lease Agreement – Unit 12" /></label><label className="block text-xs font-semibold text-[#003366]">{editingId ? "Replace Word document (optional)" : "Word document (.docx)"}<span className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 border border-dashed border-slate-300 px-3 text-xs font-normal text-slate-600 hover:border-[#31577D]"><Upload aria-hidden="true" className="h-4 w-4 shrink-0 text-[#31577D]" /><span className="truncate">{file?.name || (editingId ? "Keep current document" : "Choose a file")}</span><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} className="sr-only" /></span></label><p className="text-[11px] leading-5 text-slate-500">The Word file is stored in this browser’s local contract library. It is not uploaded to ClickUp.</p>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="min-h-9 px-3 text-xs text-slate-600">Cancel</button><button type="button" onClick={() => void save()} disabled={saving} className="min-h-9 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save contract"}</button></footer></section></div>}
  </section>;
}

export function ContractsWorkspace() {
  const pathname = usePathname() || "/contracts";
  const router = useRouter();
  const [folders, setFolders] = useState<ContractFolder[]>([]);
  const [localWorkspaces, setLocalWorkspaces] = useState<LocalContractWorkspace[]>([]);
  const [spaces, setSpaces] = useState<ContractSpace[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedSpaceId, setSelectedSpaceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFolders, setSavingFolders] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Contract workspace");
  const [workspaceLocation, setWorkspaceLocation] = useState<"clickup" | "local">("clickup");
  const [draftFolderIds, setDraftFolderIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const localRouteMatch = pathname.match(/^\/contracts\/local\/([^/]+)\/?$/);
  const localWorkspaceId = localRouteMatch?.[1] ? decodeURIComponent(localRouteMatch[1]) : "";
  const routeMatch = pathname.match(/^\/contracts\/[^/]+-(\d+)\/?$/);
  const folderId = localWorkspaceId ? `local-${localWorkspaceId}` : routeMatch?.[1] || "";
  const isLegacyReviewRoute = pathname === "/contracts/review";

  const loadFolders = useCallback(async () => {
    setLoading(true); setError("");
    setLocalWorkspaces(await listLocalWorkspaces().catch(() => []));
    try {
      const [selectionResponse, catalogResponse] = await Promise.all([
        fetch("/api/contracts/selection", { cache: "no-store" }),
        fetch("/api/contracts/catalog", { cache: "no-store" }),
      ]);
      const [selection, catalog] = await Promise.all([selectionResponse.json().catch(() => ({})), catalogResponse.json().catch(() => ({}))]);
      if (!selectionResponse.ok) throw new Error(selection.error || "Contract folder selection could not be loaded.");
      if (!catalogResponse.ok) throw new Error(catalog.error || "ClickUp Spaces and folders could not be loaded.");
      setSelectedFolderIds(Array.isArray(selection.folderIds) ? selection.folderIds.map(String) : []);
      setFolders(Array.isArray(catalog.folders) ? catalog.folders as ContractFolder[] : []);
      const availableSpaces = Array.isArray(catalog.spaces) ? catalog.spaces as ContractSpace[] : [];
      setSpaces(availableSpaces);
      let savedSpaceId = "";
      try { savedSpaceId = window.localStorage.getItem("mosaic.contracts.last-space-id") || ""; } catch { /* Use the first accessible Space if browser storage is disabled. */ }
      setSelectedSpaceId(availableSpaces.some((space) => space.id === savedSpaceId) ? savedSpaceId || "" : availableSpaces[0]?.id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Contract folders could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadFolders(); }, [loadFolders]);

  const visibleFolders = useMemo(() => folders.filter((folder) => selectedFolderIds.includes(folder.id)), [folders, selectedFolderIds]);
  const activeFolder = visibleFolders.find((folder) => folder.id === folderId);
  const activeLocalWorkspace = localWorkspaces.find((workspace) => `local-${workspace.id}` === folderId);
  const filteredFolders = folders.filter((folder) => folder.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));

  const openPicker = () => { setDraftFolderIds(selectedFolderIds); setSearch(""); setError(""); setPickerOpen(true); };
  const openCreateWorkspace = () => { setWorkspaceName("Contract workspace"); setWorkspaceLocation("clickup"); setCreateError(""); setCreateOpen(true); };
  const rememberSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    try { window.localStorage.setItem("mosaic.contracts.last-space-id", spaceId); } catch { /* Keep the current selection for this session. */ }
  };

  const createWorkspace = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) { setCreateError("Enter a workspace name."); return; }
    if (workspaceLocation === "local") {
      setCreatingWorkspace(true); setCreateError("");
      try {
        const now = new Date().toISOString();
        const localWorkspace = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
        await saveLocalWorkspace(localWorkspace);
        setLocalWorkspaces((current) => [localWorkspace, ...current]);
        setCreateOpen(false);
        router.push(`/contracts/local/${localWorkspace.id}`);
      } catch (cause) { setCreateError(cause instanceof Error ? cause.message : "The local workspace could not be created."); }
      finally { setCreatingWorkspace(false); }
      return;
    }
    if (!selectedSpaceId) { setCreateError("Choose a ClickUp Space."); return; }
    setCreatingWorkspace(true); setCreateError("");
    try {
      const response = await fetch("/api/contracts/workspaces", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, spaceId: selectedSpaceId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The contract workspace could not be created.");
      const createdFolder = payload.folder as ContractFolder;
      setFolders((current) => [createdFolder, ...current.filter((folder) => folder.id !== createdFolder.id)]);
      setSelectedFolderIds(Array.isArray(payload.folderIds) ? payload.folderIds.map(String) : [...selectedFolderIds, createdFolder.id]);
      setCreateOpen(false);
      router.push(`/contracts/${routeSlug(createdFolder.name)}-${createdFolder.id}`);
    } catch (cause) { setCreateError(cause instanceof Error ? cause.message : "The contract workspace could not be created."); }
    finally { setCreatingWorkspace(false); }
  };

  const renameLocalWorkspace = async (workspace: LocalContractWorkspace) => {
    const name = window.prompt("Workspace name", workspace.name)?.trim();
    if (!name || name === workspace.name) return;
    const updated = { ...workspace, name, updatedAt: new Date().toISOString() };
    try {
      await saveLocalWorkspace(updated);
      setLocalWorkspaces((current) => current.map((item) => item.id === workspace.id ? updated : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The local workspace could not be renamed."); }
  };

  const removeLocalWorkspace = async (workspace: LocalContractWorkspace) => {
    if (!window.confirm(`Delete “${workspace.name}” and all its local contracts?`)) return;
    try {
      await deleteLocalWorkspace(workspace.id);
      setLocalWorkspaces((current) => current.filter((item) => item.id !== workspace.id));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The local workspace could not be deleted."); }
  };
  const saveFolderSelection = async () => {
    setSavingFolders(true); setError("");
    try {
      const response = await fetch("/api/contracts/selection", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folderIds: draftFolderIds }) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Contract folder selection could not be saved.");
      setSelectedFolderIds(Array.isArray(payload.folderIds) ? payload.folderIds.map(String) : draftFolderIds);
      setPickerOpen(false);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Contract folder selection could not be saved."); }
    finally { setSavingFolders(false); }
  };

  if (isLegacyReviewRoute) return <DeltaReview />;

  if (folderId) {
    if (loading && !activeFolder && !activeLocalWorkspace) return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><ContractsHeader title="Loading contract workspace" subtitle="Opening the selected contract folder." onBack={() => router.push("/contracts")} /><div role="status" className="flex items-center gap-2 border border-slate-200 bg-white p-4 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />Loading contract workspaces</div></section>;
    if (!activeFolder && !activeLocalWorkspace) return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><ContractsHeader title="Contract workspace unavailable" subtitle={error || "This folder is not selected for Contracts."} onBack={() => router.push("/contracts")} actions={<button type="button" onClick={() => void loadFolders()} disabled={loading} className="inline-flex min-h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-[#003366] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refresh</button>} />{error && <p role="alert" className="border border-amber-300 bg-white p-4 text-sm text-slate-700">{error}</p>}</section>;
    const activeName = activeFolder?.name || activeLocalWorkspace?.name || "Contract workspace";
    const activeId = activeFolder?.id || folderId;
    return <DeltaReview key={activeId} contextName={activeName} contextId={activeId} onBack={() => router.push("/contracts")} renderContractGallery={({ compareFiles }) => <ContractGallery key={activeId} folderId={activeId} folderName={activeName} onCompare={compareFiles} />} />;
  }

  return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <ContractsHeader title="Contracts" subtitle="Manage contract workspaces independently from Projects." actions={<><button type="button" onClick={openCreateWorkspace} disabled={loading} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white hover:bg-[#174778] disabled:opacity-50"><Plus aria-hidden="true" className="h-4 w-4" />Create contract workspace</button><button type="button" onClick={openPicker} disabled={loading} className="inline-flex min-h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-[#003366] hover:border-[#003366] disabled:opacity-50"><FolderKanban aria-hidden="true" className="h-4 w-4" />Choose folders</button><button type="button" onClick={() => void loadFolders()} disabled={loading} aria-label="Refresh contract folders" title="Refresh contract folders" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-[#003366] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button></>} />
    {error && <div role="alert" className="border border-amber-300 bg-white p-4"><p className="text-sm font-semibold text-[#003366]">Contract folders could not be loaded</p><p className="mt-1 text-xs text-slate-600">{error}</p><button type="button" onClick={() => void loadFolders()} className="mt-3 min-h-9 border border-[#003366] px-3 text-xs font-semibold text-[#003366]">Try again</button></div>}
    {loading && <div role="status" className="flex items-center gap-2 border border-slate-200 bg-white p-4 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />Loading ClickUp folders</div>}
    {!loading && (visibleFolders.length > 0 || localWorkspaces.length > 0) && <section className="border border-slate-200 bg-white"><header className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Contract workspaces</h2><p className="mt-1 text-xs text-slate-600">Add and manage Word contracts. ClickUp folders are shared; local workspaces stay in this browser.</p></header><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{visibleFolders.map((folder) => <button key={`clickup-${folder.id}`} type="button" onClick={() => router.push(`/contracts/${routeSlug(folder.name)}-${folder.id}`)} className="group min-h-36 border border-slate-200 bg-white p-4 text-left transition-colors hover:border-[#C9A84C] hover:bg-[#FFFCFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><span className="flex items-start justify-between gap-3"><span className="flex h-9 w-9 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderKanban aria-hidden="true" className="h-4 w-4" /></span><ArrowUpRight aria-hidden="true" className="h-4 w-4 text-slate-400 group-hover:text-[#003366]" /></span><span className="mt-4 block text-base font-semibold text-[#003366]">{folder.name}</span><span className="mt-1 block text-xs text-slate-500">{folder.spaceName} · ClickUp</span><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#31577D]"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Open contract workspace</span></button>)}{localWorkspaces.map((workspace) => <article key={`local-${workspace.id}`} className="flex min-h-36 flex-col border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-2"><button type="button" onClick={() => router.push(`/contracts/local/${workspace.id}`)} className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><span className="block truncate text-base font-semibold text-[#003366]">{workspace.name}</span><span className="mt-1 block text-xs text-slate-500">This browser · Local</span><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#31577D]"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Open contract workspace</span></button><div className="flex shrink-0 gap-1"><button type="button" onClick={() => void renameLocalWorkspace(workspace)} aria-label={`Rename ${workspace.name}`} title="Rename workspace" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void removeLocalWorkspace(workspace)} aria-label={`Delete ${workspace.name}`} title="Delete workspace and its local contracts" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-700"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button></div></div></article>)}</div></section>}
    {!loading && visibleFolders.length === 0 && localWorkspaces.length === 0 && <div className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><FolderKanban aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h2 className="mt-3 text-base font-semibold text-[#003366]">Create or choose contract workspaces</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Create a local workspace on this device, create a ClickUp folder in a selected Space, or add existing folders to Contracts.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={openCreateWorkspace} className="inline-flex min-h-10 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white"><Plus aria-hidden="true" className="h-4 w-4" />Create contract workspace</button><button type="button" onClick={openPicker} className="inline-flex min-h-10 items-center gap-2 border border-slate-300 px-3 text-xs font-semibold text-[#003366]"><FolderKanban aria-hidden="true" className="h-4 w-4" />Choose folders</button></div></div>}
    {pickerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !savingFolders && setPickerOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="contract-folder-picker-title" className="flex max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-xl flex-col border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><header className="border-b border-slate-200 px-5 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#31577D]">Contracts</p><h2 id="contract-folder-picker-title" className="mt-1 text-lg font-semibold text-[#003366]">Choose contract folders</h2><p className="mt-1 text-xs text-slate-600">These folders appear in Contracts only; they do not change Projects.</p></div><button type="button" aria-label="Close" onClick={() => setPickerOpen(false)} className="inline-flex h-9 w-9 items-center justify-center text-[#003366]"><X aria-hidden="true" className="h-4 w-4" /></button></div><label className="relative mt-4 block"><Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search folders" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ClickUp folders" className="h-10 w-full border border-slate-300 pl-9 pr-3 text-sm focus:border-[#003366] focus:outline-none" /></label></header><div className="min-h-0 flex-1 overflow-y-auto px-5">{filteredFolders.map((folder) => { const checked = draftFolderIds.includes(folder.id); return <label key={folder.id} className="flex min-h-14 cursor-pointer items-center gap-3 border-b border-slate-100 text-sm text-[#003366]"><input type="checkbox" checked={checked} onChange={() => setDraftFolderIds((current) => checked ? current.filter((id) => id !== folder.id) : [...current, folder.id])} className="h-4 w-4 accent-[#003366]" /><span className="min-w-0 flex-1"><span className="block truncate font-semibold">{folder.name}</span><span className="mt-0.5 block text-[11px] text-slate-500">{folder.spaceName} · {folder.teamName}</span></span></label>; })}{!filteredFolders.length && <p className="py-8 text-center text-sm text-slate-500">No folders match this search.</p>}</div>{error && <p role="alert" className="px-5 pt-2 text-xs text-red-700">{error}</p>}<footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-3"><span className="text-xs text-slate-500">{draftFolderIds.length} selected</span><div className="flex gap-2"><button type="button" onClick={() => setPickerOpen(false)} className="min-h-9 px-3 text-xs text-slate-600">Cancel</button><button type="button" onClick={() => void saveFolderSelection()} disabled={savingFolders} className="min-h-9 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50">{savingFolders ? "Saving…" : "Save selection"}</button></div></footer></section></div>}
    {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !creatingWorkspace && setCreateOpen(false)}><form role="dialog" aria-modal="true" aria-labelledby="create-contract-workspace-title" onSubmit={(event) => void createWorkspace(event)} className="w-full max-w-lg border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
      <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#31577D]">Contracts</p><h2 id="create-contract-workspace-title" className="mt-1 text-lg font-semibold text-[#003366]">Create contract workspace</h2><p className="mt-1 text-xs text-slate-600">{workspaceLocation === "local" ? "Stored on this device, separate from ClickUp." : "Creates a top-level ClickUp folder in the selected Space."}</p></div><button type="button" aria-label="Close" onClick={() => setCreateOpen(false)} disabled={creatingWorkspace} className="inline-flex h-9 w-9 items-center justify-center text-[#003366] disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4" /></button></header>
      <div className="space-y-4 p-5"><fieldset><legend className="text-xs font-semibold text-[#003366]">Setup location</legend><div className="mt-2 grid grid-cols-2 gap-2"><label className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-xs ${workspaceLocation === "clickup" ? "border-[#003366] bg-[#F7FAFC] text-[#003366]" : "border-slate-200 text-slate-600"}`}><input type="radio" name="workspace-location" value="clickup" checked={workspaceLocation === "clickup"} onChange={() => setWorkspaceLocation("clickup")} className="accent-[#003366]" />ClickUp Space</label><label className={`flex min-h-10 cursor-pointer items-center gap-2 border px-3 text-xs ${workspaceLocation === "local" ? "border-[#003366] bg-[#F7FAFC] text-[#003366]" : "border-slate-200 text-slate-600"}`}><input type="radio" name="workspace-location" value="local" checked={workspaceLocation === "local"} onChange={() => setWorkspaceLocation("local")} className="accent-[#003366]" />This device</label></div></fieldset>
        <label className="block text-xs font-semibold text-[#003366]">Workspace name<input autoFocus required maxLength={100} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-800 focus:border-[#003366] focus:outline-none" /></label>
        {workspaceLocation === "clickup" && <label className="block text-xs font-semibold text-[#003366]">ClickUp Space<select required value={selectedSpaceId} onChange={(event) => rememberSpace(event.target.value)} className="mt-1 h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus:border-[#003366] focus:outline-none">{spaces.map((space) => <option key={space.id} value={space.id}>{space.name} · {space.teamName}</option>)}</select></label>}
        {createError && <p role="alert" className="text-xs text-red-700">{createError}</p>}
      </div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setCreateOpen(false)} disabled={creatingWorkspace} className="min-h-9 px-3 text-xs text-slate-600">Cancel</button><button type="submit" disabled={creatingWorkspace || (workspaceLocation === "clickup" && !spaces.length)} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50">{creatingWorkspace ? <><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Creating workspace…</> : "Create workspace"}</button></footer>
    </form></div>}
  </section>;
}
