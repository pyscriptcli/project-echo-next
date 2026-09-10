"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Settings2, FileEdit, PackageSearch, ShieldCheck, Save, Plus, X, AlertTriangle } from "lucide-react";
import FormsCreateView from "./FormsCreateView";
import FormsTrackView from "./FormsTrackView";
import FormsApprovalsView from "./FormsApprovalsView";

type PortalTab = "create" | "track" | "approvals" | "admin";
type Role = "owner" | "admin" | "approver" | "requestor";
type FormType = "rfp" | "po" | "pcv";
const OWNER_EMAIL = "dave.policarpio@primephilippines.com";
const FORM_LABELS: Record<FormType, string> = { rfp: "Request for Payment", po: "Purchase Order", pcv: "Petty Cash Voucher" };
const STAGES = ["Team Leader Endorsement", "Finance Verification", "Disbursement Preparation", "Executive Sign-Off", "Payment Released", "Completed"];

interface AdminUser { email: string; name: string; role: Exclude<Role, "owner">; department: string; active: boolean; }
interface FormMapping { id: string; department: string; formType: string; formLabel?: string; listId: string; approvers: Array<{ stage: number; emails: string[]; requireAll: boolean }>; }
interface FormsConfig { admins: AdminUser[]; members: AdminUser[]; departments: string[]; mappings: FormMapping[]; }
const DEFAULT_CONFIG: FormsConfig = {
  admins: [], members: [],
  departments: ["Finance", "Procurement", "Operations", "Human Resources", "Marketing", "IT", "General"],
  mappings: [],
};

function normalizeEmail(email?: string) { return (email || "").trim().toLowerCase(); }

function AdminConfiguration({ userEmail }: { userEmail: string }) {
  const [config, setConfig] = useState<FormsConfig>(DEFAULT_CONFIG);
  const [selectedDepartment, setSelectedDepartment] = useState(DEFAULT_CONFIG.departments[0]);
  const [selectedForm, setSelectedForm] = useState<FormType>("rfp");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [newDepartment, setNewDepartment] = useState("");
  const [newFormName, setNewFormName] = useState("");
  const [newFormListId, setNewFormListId] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Exclude<Role, "owner">>("requestor");
  const [newMemberDepartment, setNewMemberDepartment] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState("requestor");
  const isOwner = normalizeEmail(userEmail) === OWNER_EMAIL;

  useEffect(() => {
    const local = localStorage.getItem("echo_forms_config");
    if (local) { try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(local) }); } catch {} }
    fetch("/api/forms/config").then((res) => res.ok ? res.json() : null).then((data) => { if (data?.config) setConfig({ ...DEFAULT_CONFIG, ...data.config, members: data.config.members || [] }); }).catch(() => {});
  }, []);

  const save = async (next: FormsConfig = config) => {
    setConfig(next); localStorage.setItem("echo_forms_config", JSON.stringify(next));
    const res = await fetch("/api/forms/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    setNotice(res.ok ? "Configuration saved." : "Configuration saved on this device. Connect project storage in Settings to sync it.");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const mapping = useMemo(() => config.mappings.find((item) => item.department === selectedDepartment && item.formType === selectedForm), [config.mappings, selectedDepartment, selectedForm]);
  const ensureMapping = () => mapping || { id: `${selectedDepartment}-${selectedForm}`, department: selectedDepartment, formType: selectedForm, formLabel: FORM_LABELS[selectedForm], listId: "", approvers: STAGES.map((_, stage) => ({ stage, emails: [], requireAll: false })) };
  const updateMapping = (next: FormMapping) => { const updated = { ...config, mappings: [...config.mappings.filter((item) => item.id !== next.id), next] }; setConfig(updated); localStorage.setItem("echo_forms_config", JSON.stringify(updated)); setNotice("Unsaved routing changes"); };

  if (!isOwner && !config.admins.some((admin) => admin.active && normalizeEmail(admin.email) === normalizeEmail(userEmail))) {
    return <div className="panel max-w-3xl"><AlertTriangle className="text-amber-600 mb-3" /><h2 className="text-xl">Admin access required</h2><p className="text-sm text-gray-500 mt-2">This configuration area is restricted to the protected Owner and active Forms Admins.</p></div>;
  }

  const addAdmin = () => {
    const email = normalizeEmail(newAdminEmail);
    if (!isOwner || !email || email === OWNER_EMAIL || config.admins.some((admin) => normalizeEmail(admin.email) === email)) return;
    save({ ...config, admins: [...config.admins, { email, name: newAdminName.trim() || email, role: "admin", department: "", active: true }] });
    setNewAdminEmail(""); setNewAdminName("");
  };
  const addDepartment = () => { const value = newDepartment.trim(); if (value && !config.departments.includes(value)) save({ ...config, departments: [...config.departments, value] }); setNewDepartment(""); };
  const addCustomForm = () => { const name = newFormName.trim(); const listId = newFormListId.trim(); if (!name || !listId) return; const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "-"); const next = { id: `${selectedDepartment}-${key}`, department: selectedDepartment, formType: key, formLabel: name, listId, approvers: STAGES.map((_, stage) => ({ stage, emails: [], requireAll: false })) }; save({ ...config, mappings: [...config.mappings.filter((item) => item.id !== next.id), next] }); setNewFormName(""); setNewFormListId(""); };
  const addMember = () => { const email = normalizeEmail(newMemberEmail); if (!email || config.members.some((member) => normalizeEmail(member.email) === email) || email === OWNER_EMAIL) return; const member = { email, name: newMemberName.trim() || email, role: newMemberRole, department: newMemberDepartment, active: true }; save({ ...config, members: [...config.members, member], admins: newMemberRole === "admin" ? [...config.admins, member] : config.admins }); setNewMemberEmail(""); setNewMemberName(""); };
  const current = ensureMapping();

  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4"><div><h1 className="text-2xl">Forms Administration</h1><p className="text-xs text-gray-500 uppercase tracking-wider mt-1">RBAC, departments, and six-stage approval routing</p></div><button className="btn-primary flex items-center gap-2" onClick={() => save()}><Save size={14} /> Save Configuration</button></div>
    {notice && <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-xs font-semibold">{notice}</div>}
    <section className="panel"><h2 className="text-lg mb-3">Role access</h2><div className="grid grid-cols-1 md:grid-cols-4 gap-3">{[["Owner", "Protected control over admin membership"], ["Admin", "Manage mappings and assignments"], ["Approver", "Act on assigned stages"], ["Requestor", "Submit and view own requests"]].map(([role, desc]) => <div key={role} className="border border-gray-200 p-3"><div className="font-bold text-[#003366] text-sm">{role}</div><div className="text-[11px] text-gray-500 mt-1">{desc}</div></div>)}</div><div className="mt-4 text-xs text-gray-600">Protected Owner: <span className="font-bold">{OWNER_EMAIL}</span></div></section>
    <section className="panel"><h2 className="text-lg mb-2">View as</h2><p className="text-xs text-gray-500 mb-3">Preview the Forms experience for each role or department.</p><div className="flex flex-wrap gap-2">{["requestor", "approver", "Finance", "IT", "Marketing", "Research & Advisory"].map((role) => <button key={role} onClick={() => setPreview(role)} className={`px-3 py-2 text-xs border ${preview === role ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-[#003366] border-gray-200"}`}>View as {role}</button>)}</div>{preview && <div className="mt-3 text-xs bg-blue-50 border border-blue-100 px-3 py-2 text-blue-800">Preview mode: <b>{preview}</b>. This does not change permissions or submitted data.</div>}</section>
    <section className="panel"><div className="flex items-center justify-between mb-3"><h2 className="text-lg">Admin membership</h2><span className="text-[10px] uppercase tracking-widest text-gray-400">Owner only</span></div><div className="flex flex-wrap gap-2 mb-3">{config.admins.map((admin) => <div key={admin.email} className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs"><span>{admin.name} · {admin.email}</span>{isOwner && <button onClick={() => save({ ...config, admins: config.admins.filter((item) => item.email !== admin.email) })} aria-label={`Remove ${admin.email}`}><X size={13} className="text-red-500" /></button>}</div>)}{config.admins.length === 0 && <span className="text-xs text-gray-400">No additional admins configured.</span>}</div>{isOwner && <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2"><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="Admin name" value={newAdminName} onChange={(e) => setNewAdminName(e.target.value)} /><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="email@primephilippines.com" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)} /><button className="btn-outline flex items-center justify-center gap-1" onClick={addAdmin}><Plus size={14} /> Add Admin</button></div>}</section>
    <section className="panel"><h2 className="text-lg mb-3">People &amp; department assignments</h2><div className="space-y-2 mb-4">{config.members.map((member) => <div key={member.email} className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 px-3 py-2 text-xs"><span><b>{member.name}</b> · {member.email} · <span className="uppercase text-[#003366]">{member.role}</span> · {member.department || "Unassigned"}</span><button onClick={() => save({ ...config, members: config.members.filter((item) => item.email !== member.email) })} aria-label={`Remove ${member.email}`}><X size={13} className="text-red-500" /></button></div>)}{config.members.length === 0 && <span className="text-xs text-gray-400">No people assigned yet. Add approvers and requestors here.</span>}</div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2"><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="Name" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} /><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="Email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} /><select className="border border-gray-300 px-3 py-2 text-xs bg-white" value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as Exclude<Role, "owner">)}><option value="requestor">Requestor</option><option value="approver">Approver</option><option value="admin">Admin</option></select><div className="flex gap-2"><select className="border border-gray-300 px-3 py-2 text-xs bg-white flex-1" value={newMemberDepartment} onChange={(e) => setNewMemberDepartment(e.target.value)}><option value="">Department</option>{config.departments.map((department) => <option key={department}>{department}</option>)}</select><button className="btn-outline flex items-center gap-1" onClick={addMember}><Plus size={14} /> Add</button></div></div></section>
    <section className="panel"><h2 className="text-lg mb-3">Departments</h2><div className="flex flex-wrap gap-2 mb-3">{config.departments.map((department) => <span key={department} className="inline-flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-xs">{department}<button aria-label={`Remove ${department}`} onClick={() => save({ ...config, departments: config.departments.filter((item) => item !== department), mappings: config.mappings.filter((item) => item.department !== department) })}><X size={13} className="text-red-500" /></button></span>)}</div><div className="flex gap-2 max-w-md"><input className="border border-gray-300 px-3 py-2 text-xs flex-1" placeholder="Add department" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} /><button className="btn-outline flex items-center gap-1" onClick={addDepartment}><Plus size={14} /> Add</button></div></section>
    <section className="panel"><h2 className="text-lg mb-1">Department forms &amp; ClickUp destinations</h2><p className="text-xs text-gray-500 mb-4">Every department/form mapping requires its own ClickUp List ID.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3"><label className="text-xs font-bold text-gray-600">Department<select className="mt-1 w-full border border-gray-300 px-3 py-2 bg-white font-normal" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>{config.departments.map((department) => <option key={department}>{department}</option>)}</select></label><label className="text-xs font-bold text-gray-600">Built-in form<select className="mt-1 w-full border border-gray-300 px-3 py-2 bg-white font-normal" value={selectedForm} onChange={(e) => setSelectedForm(e.target.value as FormType)}>{Object.entries(FORM_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div><div className="border border-gray-200 p-3 mb-4"><label className="text-xs font-bold text-gray-600">ClickUp List ID<input className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" placeholder="Required destination List ID" value={current.listId || ""} onChange={(e) => updateMapping({ ...current, listId: e.target.value, formLabel: current.formLabel || FORM_LABELS[selectedForm] })} /></label></div><div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 border-t pt-4"><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="New custom form name" value={newFormName} onChange={(e) => setNewFormName(e.target.value)} /><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="Required ClickUp List ID" value={newFormListId} onChange={(e) => setNewFormListId(e.target.value)} /><button className="btn-outline" onClick={addCustomForm}>Add form</button></div><div className="space-y-2 mt-4">{STAGES.map((stageName, index) => { const stage = current.approvers[index] || { stage: index, emails: [], requireAll: false }; return <div key={stageName} className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-2 items-center border border-gray-200 p-3"><div><div className="text-xs font-bold text-[#003366]">{index + 1}. {stageName}</div><div className="text-[10px] text-gray-400">{stage.requireAll ? "All assigned approvers required" : "Any one approver can advance"}</div></div><input className="border border-gray-300 px-3 py-2 text-xs" placeholder="approver@primephilippines.com (comma separated)" value={stage.emails.join(", ")} onChange={(e) => { const emails = e.target.value.split(",").map(normalizeEmail).filter(Boolean); const next = { ...current, approvers: current.approvers.map((item) => item.stage === index ? { ...item, emails } : item) }; updateMapping(next); }} /><label className="text-[11px] flex items-center gap-1.5 whitespace-nowrap"><input type="checkbox" checked={stage.requireAll} onChange={(e) => { const next = { ...current, approvers: current.approvers.map((item) => item.stage === index ? { ...item, requireAll: e.target.checked } : item) }; updateMapping(next); }} /> All required</label></div>; })}</div></section>
  </div>;
}

export default function FormsPortal({ user, initialTab = "track" }: { user?: { username?: string; email?: string } | null; initialTab?: PortalTab }) {
  const [tab, setTab] = useState<PortalTab>(initialTab);
  const searchParams = useSearchParams();
  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { const requested = searchParams.get("tab") as PortalTab | null; if (requested && ["create", "track", "approvals", "admin"].includes(requested)) setTab(requested); }, [searchParams]);
  const [configuredAdmins, setConfiguredAdmins] = useState<AdminUser[]>([]);
  useEffect(() => { fetch("/api/forms/config").then((res) => res.ok ? res.json() : null).then((data) => setConfiguredAdmins(data?.config?.admins || [])).catch(() => {}); }, []);
  const isAdmin = normalizeEmail(user?.email) === OWNER_EMAIL || configuredAdmins.some((admin) => admin.active && normalizeEmail(admin.email) === normalizeEmail(user?.email));
  const tabs: Array<{ id: PortalTab; label: string; icon: typeof FileEdit }> = [{ id: "track", label: "Track Status", icon: PackageSearch }, { id: "create", label: "New Form", icon: FileEdit }];
  const canApprove = isAdmin || Boolean(user?.email && configApproverEmails().includes(normalizeEmail(user.email)));
  function configApproverEmails() { try { const raw = localStorage.getItem("echo_forms_config"); const c = raw ? JSON.parse(raw) : null; return (c?.members || []).filter((m: AdminUser) => m.role === "approver" && m.active).map((m: AdminUser) => normalizeEmail(m.email)); } catch { return []; } }
  return <div className="-mt-2 space-y-4">{tab === "admin" ? <AdminConfiguration userEmail={user?.email || ""} /> : <><div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3"><div><h1 className="text-2xl flex items-center gap-2"><ClipboardList size={22} className="text-[#C9AB4C]" /> Forms</h1><p className="text-xs text-gray-500 uppercase tracking-wider mt-1">Requests and approvals</p></div><div className="flex flex-wrap gap-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setTab(id)} className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 border ${tab === id ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-[#003366] border-gray-200 hover:border-[#C9AB4C]"}`}><Icon size={14} />{label}</button>)}{canApprove && <button onClick={() => setTab("approvals")} className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 border ${tab === "approvals" ? "bg-[#003366] text-white border-[#003366]" : "bg-white text-[#003366] border-gray-200 hover:border-[#C9AB4C]"}`}><ShieldCheck size={14} />Approvals</button>}</div></div>{tab === "create" && <FormsCreateView user={{ name: user?.username, email: user?.email }} />}{tab === "track" && <FormsTrackView />}{tab === "approvals" && canApprove && <FormsApprovalsView />}</>}</div>;
}
