"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Download, FileText, FolderOpen, LoaderCircle, Pencil, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { DeltaReview } from "@/components/DeltaReview";
import {
  chooseContractsFolder,
  deleteContract,
  deleteLocalWorkspace,
  getContractsFolderStatus,
  getContractsFolderPickerStatus,
  listContracts,
  listLocalWorkspaces,
  reconnectContractsFolder,
  saveContract,
  saveLocalWorkspace,
  type LocalContract,
  type LocalContractWorkspace,
} from "@/lib/contracts/localStore";

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
    catch (cause) { setError(cause instanceof Error ? cause.message : "Contracts could not be loaded from the selected folder."); }
    finally { setLoading(false); }
  }, [folderId]);

  useEffect(() => {
    let active = true;
    listContracts(folderId).then((records) => {
      if (active) setContracts(records);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Contracts could not be loaded from the selected folder.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [folderId]);

  const openNew = () => { setEditingId(""); setName(""); setFile(null); setError(""); setDialogOpen(true); };
  const openEdit = (contract: LocalContract) => { setEditingId(contract.id); setName(contract.name); setFile(null); setError(""); setDialogOpen(true); };

  const save = async () => {
    const current = contracts.find((contract) => contract.id === editingId);
    const chosenFile = file || current?.file;
    if (!name.trim()) { setError("Enter a contract name."); return; }
    if (!chosenFile) { setError("Choose a Word document (.docx)."); return; }
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
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The contract could not be saved to the selected folder."); }
    finally { setSaving(false); }
  };

  const remove = async (contract: LocalContract) => {
    if (!window.confirm(`Delete “${contract.name}” and its file from the selected folder?`)) return;
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
    <header className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3"><div><h2 className="text-sm font-semibold text-[#003366]">{folderName}</h2><p className="mt-1 text-xs text-slate-600">Files are saved on this computer. OneDrive syncs them if this folder is inside OneDrive.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void refresh()} disabled={loading} aria-label="Refresh contracts" title="Refresh contracts" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-[#003366] hover:border-[#003366] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></button><button type="button" onClick={openNew} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white hover:bg-[#174778]"><Plus aria-hidden="true" className="h-4 w-4" />Add contract</button></div></header>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-[#F7FAFC] px-4 py-2.5"><p className="text-[11px] text-slate-600">{contracts.length} contract{contracts.length === 1 ? "" : "s"} · select two documents to compare them.</p><button type="button" onClick={compareSelected} disabled={selectedIds.length !== 2} className="inline-flex min-h-8 items-center gap-2 border border-slate-300 bg-white px-3 text-[11px] font-semibold text-[#003366] hover:border-[#003366] disabled:cursor-not-allowed disabled:opacity-50"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Compare selected</button></div>
    {error && !dialogOpen && <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-800">{error}</p>}
    {loading ? <div role="status" className="flex items-center gap-2 px-4 py-8 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />Loading contracts</div>
      : contracts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] border-collapse text-left text-xs"><thead className="bg-slate-50 text-[10px] font-semibold text-slate-600"><tr><th className="w-10 border-b border-slate-200 px-3 py-2" scope="col"><span className="sr-only">Select</span></th><th className="border-b border-slate-200 px-3 py-2" scope="col">Contract</th><th className="border-b border-slate-200 px-3 py-2" scope="col">Document</th><th className="border-b border-slate-200 px-3 py-2" scope="col">Updated</th><th className="w-36 border-b border-slate-200 px-3 py-2 text-right" scope="col">Manage</th></tr></thead><tbody>{contracts.map((contract) => <tr key={contract.id} className="hover:bg-[#FFFCFB]"><td className="border-b border-slate-100 px-3 py-3"><input type="checkbox" aria-label={`Select ${contract.name} for comparison`} checked={selectedIds.includes(contract.id)} onChange={() => toggleSelected(contract.id)} className="h-4 w-4 accent-[#003366]" /></td><td className="border-b border-slate-100 px-3 py-3 font-semibold text-[#003366]">{contract.name}</td><td className="border-b border-slate-100 px-3 py-3 text-slate-600">{contract.fileName}</td><td className="border-b border-slate-100 px-3 py-3 text-slate-600">{new Date(contract.updatedAt).toLocaleDateString()}</td><td className="border-b border-slate-100 px-3 py-3"><div className="flex justify-end gap-1"><button type="button" onClick={() => download(contract)} aria-label={`Download ${contract.name}`} title="Download" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Download aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => openEdit(contract)} aria-label={`Edit ${contract.name}`} title="Edit" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void remove(contract)} aria-label={`Delete ${contract.name}`} title="Delete" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-700"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button></div></td></tr>)}</tbody></table></div>
      : <div className="px-5 py-12 text-center"><FileText aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h3 className="mt-3 text-sm font-semibold text-[#003366]">No contracts yet</h3><p className="mt-1 text-xs text-slate-600">Add a Word document to keep it in this folder.</p><button type="button" onClick={openNew} className="mt-4 inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white"><Plus aria-hidden="true" className="h-4 w-4" />Add contract</button></div>}
    {dialogOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setDialogOpen(false)}><section role="dialog" aria-modal="true" aria-labelledby="contract-editor-title" className="w-full max-w-lg border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#31577D]">{folderName}</p><h3 id="contract-editor-title" className="mt-1 text-base font-semibold text-[#003366]">{editingId ? "Edit contract" : "Add contract"}</h3></div><button type="button" aria-label="Close" onClick={() => setDialogOpen(false)} className="inline-flex h-8 w-8 items-center justify-center text-slate-500 hover:text-[#003366]"><X aria-hidden="true" className="h-4 w-4" /></button></header><div className="space-y-4 p-5"><label className="block text-xs font-semibold text-[#003366]">Contract name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={160} className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-800 focus:border-[#003366] focus:outline-none" placeholder="e.g. Lease Agreement – Unit 12" /></label><label className="block text-xs font-semibold text-[#003366]">{editingId ? "Replace Word document (optional)" : "Word document (.docx)"}<span className="mt-1 flex min-h-11 cursor-pointer items-center gap-2 border border-dashed border-slate-300 px-3 text-xs font-normal text-slate-600 hover:border-[#31577D]"><Upload aria-hidden="true" className="h-4 w-4 shrink-0 text-[#31577D]" /><span className="truncate">{file?.name || (editingId ? "Keep current document" : "Choose a file")}</span><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} className="sr-only" /></span></label><p className="text-[11px] leading-5 text-slate-500">Mosaic saves the file in your chosen contract folder. If that folder is in OneDrive, OneDrive syncs it automatically.</p>{error && <p role="alert" className="text-xs text-red-700">{error}</p>}</div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setDialogOpen(false)} disabled={saving} className="min-h-9 px-3 text-xs text-slate-600">Cancel</button><button type="button" onClick={() => void save()} disabled={saving} className="min-h-9 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save contract"}</button></footer></section></div>}
  </section>;
}

export function ContractsWorkspace() {
  const pathname = usePathname() || "/contracts";
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<LocalContractWorkspace[]>([]);
  const [folder, setFolder] = useState<{ connected: boolean; name: string; accessible: boolean }>({ connected: false, name: "", accessible: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("Contracts");
  const workspaceMatch = pathname.match(/^\/contracts\/local\/([^/]+)\/?$/);
  const workspaceId = workspaceMatch?.[1] ? decodeURIComponent(workspaceMatch[1]) : "";
  const folderId = workspaceId ? `local-${workspaceId}` : "";
  const isLegacyReviewRoute = pathname === "/contracts/review";
  const pickerStatus = getContractsFolderPickerStatus();
  const secureContractsUrl = (() => {
    if (typeof window === "undefined" || window.location.protocol !== "http:") return "";
    const { hostname, port } = window.location;
    const localHosts = new Set(["localhost", "0.0.0.0", "127.0.0.1", "::1", "[::1]"]);
    if (localHosts.has(hostname)) return `http://localhost${port ? `:${port}` : ""}/contracts`;
    return `https://${window.location.host}/contracts`;
  })();

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const status = await getContractsFolderStatus();
      setFolder(status);
      if (status.connected && status.accessible) setWorkspaces(await listLocalWorkspaces());
      else setWorkspaces([]);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Contract storage could not be opened."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const status = await getContractsFolderStatus();
        const available = status.connected && status.accessible ? await listLocalWorkspaces() : [];
        if (active) { setFolder(status); setWorkspaces(available); }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Contract storage could not be opened.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const createWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) { setError("Enter a workspace name."); return; }
    setBusy(true); setError("");
    try {
      const now = new Date().toISOString();
      const workspace = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
      await saveLocalWorkspace(workspace);
      setWorkspaces((current) => [workspace, ...current]);
      setCreateOpen(false);
      router.push(`/contracts/local/${workspace.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The workspace could not be created."); }
    finally { setBusy(false); }
  };

  const setupFolder = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const selected = await chooseContractsFolder();
      const status = await getContractsFolderStatus();
      setFolder(status);
      const available = await listLocalWorkspaces();
      if (available.length) setWorkspaces(available);
      else {
        const now = new Date().toISOString();
        const workspace = { id: crypto.randomUUID(), name: "Contracts", createdAt: now, updatedAt: now };
        await saveLocalWorkspace(workspace);
        setWorkspaces([workspace]);
        router.push(`/contracts/local/${workspace.id}`);
      }
      setNotice(selected.migratedCount ? `Folder ready. Moved ${selected.migratedCount} existing contract${selected.migratedCount === 1 ? "" : "s"} into it.` : `Folder ready. New contracts will be saved in ${selected.name}.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The folder could not be set up."); }
    finally { setBusy(false); }
  };

  const reconnectFolder = async () => {
    setBusy(true); setError("");
    try {
      if (!await reconnectContractsFolder()) throw new Error("Folder access was not granted. Choose the OneDrive folder again to reconnect it.");
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The contract folder could not be reconnected."); }
    finally { setBusy(false); }
  };

  const renameWorkspace = async (workspace: LocalContractWorkspace) => {
    const name = window.prompt("Workspace name", workspace.name)?.trim();
    if (!name || name === workspace.name) return;
    const updated = { ...workspace, name, updatedAt: new Date().toISOString() };
    try { await saveLocalWorkspace(updated); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The workspace could not be renamed."); }
  };

  const removeWorkspace = async (workspace: LocalContractWorkspace) => {
    if (!window.confirm(`Delete “${workspace.name}” and all its contract files from this folder?`)) return;
    try { await deleteLocalWorkspace(workspace.id); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The workspace could not be deleted."); }
  };

  if (isLegacyReviewRoute) return <DeltaReview />;

  if (loading) return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><ContractsHeader title="Contracts" subtitle="Opening your contract folder." /><div role="status" className="flex items-center gap-2 border border-slate-200 bg-white p-4 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />Loading contracts</div></section>;

  if (!folder.connected || !folder.accessible) return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <ContractsHeader title="Contracts" subtitle="Choose where Mosaic saves your contract files." />
    <section className="max-w-2xl border border-slate-200 bg-white p-6 md:p-8">
      <span className="flex h-10 w-10 items-center justify-center border border-[#C9A84C]/60 bg-[#FBF7E9] text-[#003366]"><FolderOpen aria-hidden="true" className="h-5 w-5" /></span>
      <h2 className="mt-4 text-base font-semibold text-[#003366]">{folder.connected ? "Reconnect your contract folder" : "Choose where to save contracts"}</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Choose any local folder. Mosaic will create its contract folder there and organize your files. If that location is already synced by OneDrive, OneDrive will sync the files as usual.</p>
      <p className="mt-2 text-xs text-slate-500">Choose it once on each computer. If Mosaic asks again later, choose the same folder.</p>
      {!pickerStatus.available && <div role="status" className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
        {pickerStatus.reason === "insecure" && <>{secureContractsUrl ? <><span>Open Mosaic from a secure address to choose a folder. </span><a href={secureContractsUrl} className="font-semibold underline">Open Contracts securely</a></> : "Open Mosaic using its secure HTTPS address to choose a folder."}</>}
        {pickerStatus.reason === "embedded" && <><span>Open Mosaic in its own browser tab to choose a folder. </span><a href="/contracts" target="_blank" rel="noreferrer" className="font-semibold underline">Open Contracts in a new tab</a></>}
        {pickerStatus.reason === "unsupported" && "This browser doesn’t support choosing a folder for Mosaic to save files directly. Use a desktop browser with local folder access, or contact your Mosaic administrator."}
      </div>}
      {error && <p role="alert" className="mt-4 border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
      {folder.connected ? <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => void reconnectFolder()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white hover:bg-[#174778] disabled:opacity-50">{busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}Reconnect folder</button><button type="button" onClick={() => void setupFolder()} disabled={busy || !pickerStatus.available} className="min-h-10 border border-slate-300 bg-white px-4 text-xs font-semibold text-[#003366] disabled:opacity-50">Choose the same folder again</button></div>
        : <button type="button" onClick={() => void setupFolder()} disabled={busy || !pickerStatus.available} className="mt-5 inline-flex min-h-10 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white hover:bg-[#174778] disabled:opacity-50">{busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}Choose folder</button>}
    </section>
  </section>;

  if (folderId) {
    const workspace = workspaces.find((item) => item.id === workspaceId);
    if (!workspace) return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8"><ContractsHeader title="Workspace unavailable" subtitle="This workspace is not in the selected contract folder." onBack={() => router.push("/contracts")} /><button type="button" onClick={() => void load()} className="min-h-9 border border-slate-300 bg-white px-3 text-xs font-semibold text-[#003366]">Refresh</button></section>;
    return <DeltaReview key={workspace.id} contextName={workspace.name} contextId={`local-${workspace.id}`} onBack={() => router.push("/contracts")} renderContractGallery={({ compareFiles }) => <ContractGallery key={workspace.id} folderId={`local-${workspace.id}`} folderName={workspace.name} onCompare={compareFiles} />} />;
  }

  return <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
    <ContractsHeader title="Contracts" subtitle="Keep contract files in your chosen folder. OneDrive syncs them if the folder is part of OneDrive." actions={<><span className="inline-flex min-h-9 items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 text-xs font-medium text-emerald-800"><FolderOpen aria-hidden="true" className="h-3.5 w-3.5" />Folder ready · {folder.name}</span><button type="button" onClick={() => setCreateOpen(true)} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white hover:bg-[#174778]"><Plus aria-hidden="true" className="h-4 w-4" />New workspace</button><button type="button" onClick={() => void reconnectFolder()} disabled={busy} aria-label="Reconnect contract folder" title="Reconnect contract folder" className="inline-flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-[#003366] disabled:opacity-50"><RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button></>} />
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}
    {notice && <p role="status" className="border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</p>}
    {workspaces.length ? <section className="border border-slate-200 bg-white"><header className="border-b border-slate-100 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Contract workspaces</h2><p className="mt-1 text-xs text-slate-600">Your documents are saved in this computer’s selected folder.</p></header><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{workspaces.map((workspace) => <article key={workspace.id} className="flex min-h-36 flex-col border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-2"><button type="button" onClick={() => router.push(`/contracts/local/${workspace.id}`)} className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><span className="block truncate text-base font-semibold text-[#003366]">{workspace.name}</span><span className="mt-1 block text-xs text-slate-500">Saved in {folder.name}</span><span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#31577D]"><FileText aria-hidden="true" className="h-3.5 w-3.5" />Open workspace</span></button><div className="flex shrink-0 gap-1"><button type="button" onClick={() => void renameWorkspace(workspace)} aria-label={`Rename ${workspace.name}`} title="Rename workspace" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-[#003366] hover:border-[#003366]"><Pencil aria-hidden="true" className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void removeWorkspace(workspace)} aria-label={`Delete ${workspace.name}`} title="Delete workspace and its local contracts" className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 text-slate-500 hover:border-red-500 hover:text-red-700"><Trash2 aria-hidden="true" className="h-3.5 w-3.5" /></button></div></div></article>)}</div></section>
      : <div className="border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><FolderOpen aria-hidden="true" className="mx-auto h-6 w-6 text-[#31577D]" /><h2 className="mt-3 text-base font-semibold text-[#003366]">Your contract folder is ready</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Create a workspace to start organizing contracts in this folder.</p><button type="button" onClick={() => setCreateOpen(true)} className="mt-4 inline-flex min-h-10 items-center gap-2 border border-[#003366] bg-[#003366] px-3 text-xs font-semibold text-white"><Plus aria-hidden="true" className="h-4 w-4" />Create workspace</button></div>}
    {createOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !busy && setCreateOpen(false)}><form role="dialog" aria-modal="true" aria-labelledby="create-contract-workspace-title" onSubmit={(event) => void createWorkspace(event)} className="w-full max-w-lg border border-slate-200 bg-white shadow-xl" onClick={(event) => event.stopPropagation()}><header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#31577D]">Contracts</p><h2 id="create-contract-workspace-title" className="mt-1 text-lg font-semibold text-[#003366]">New workspace</h2><p className="mt-1 text-xs text-slate-600">Workspace files stay together in your chosen folder.</p></div><button type="button" aria-label="Close" onClick={() => setCreateOpen(false)} disabled={busy} className="inline-flex h-9 w-9 items-center justify-center text-[#003366] disabled:opacity-50"><X aria-hidden="true" className="h-4 w-4" /></button></header><div className="p-5"><label className="block text-xs font-semibold text-[#003366]">Workspace name<input autoFocus required maxLength={100} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} className="mt-1 h-10 w-full border border-slate-300 px-3 text-sm font-normal text-slate-800 focus:border-[#003366] focus:outline-none" /></label>{error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}</div><footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={() => setCreateOpen(false)} disabled={busy} className="min-h-9 px-3 text-xs text-slate-600">Cancel</button><button type="submit" disabled={busy} className="inline-flex min-h-9 items-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-white disabled:opacity-50">{busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}Create workspace</button></footer></form></div>}
  </section>;
}
