"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ClipboardList,
  Settings2,
  FileEdit,
  PackageSearch,
  ShieldCheck,
  Save,
  Plus,
  X,
  AlertTriangle,
  Lock,
  Check,
  RotateCcw,
  Users,
  Mail
} from "lucide-react";
import FormsCreateView from "./FormsCreateView";
import FormsTrackView from "./FormsTrackView";
import FormsApprovalsView from "./FormsApprovalsView";
import { isFormsOwner } from "@/lib/forms/owner";

export type PortalTab = "create" | "track" | "approvals" | "admin";
export type Role = "owner" | "admin" | "approver" | "requestor";
export type FormType = "rfp" | "po" | "pcv";
export type AppPage = "dashboard" | "tasks" | "notebook" | "market-insights" | "demands" | "meetings" | "minutes" | "forms";

export const APP_PAGE_LIST: Array<{ id: AppPage; label: string; desc: string }> = [
  { id: "dashboard", label: "Dashboard", desc: "Executive overview & meeting metrics" },
  { id: "tasks", label: "Tasks", desc: "ClickUp tasks portal & action items" },
  { id: "notebook", label: "Notebook", desc: "Daily logs & team completeness dashboard" },
  { id: "market-insights", label: "Market Insights", desc: "Weekly brief & shared market source archive" },
  { id: "demands", label: "Demands", desc: "Demand pipeline, table & coverage" },
  { id: "meetings", label: "Meetings", desc: "Archived meetings & transcripts" },
  { id: "minutes", label: "Notetaker", desc: "Studio, live recording & minutes synthesis" },
  { id: "forms", label: "Forms", desc: "Submit, track & approve company requests" },
];

export const OWNER_EMAIL = "admin@primephilippines.com";
const FORM_LABELS: Record<string, string> = {
  rfp: "Request for Payment",
  po: "Purchase Order",
  pcv: "Petty Cash Voucher",
  "it-helpdesk-support-form": "Helpdesk Support Form",
  "it-bug-error-report-form": "Bug/Error Report Form",
};
const STAGES = [
  "Team Leader Endorsement",
  "Finance Verification",
  "Disbursement Preparation",
  "Executive Sign-Off",
  "Payment Released",
  "Completed",
];

export interface AdminUser {
  email: string;
  name: string;
  role: Exclude<Role, "owner">;
  department: string;
  active: boolean;
}

export interface FormMapping {
  id: string;
  department: string;
  formType: string;
  formLabel?: string;
  listId: string;
  approvers: Array<{ stage: number; emails: string[]; requireAll: boolean }>;
}

export interface UserPagePermission {
  email: string;
  name?: string;
  allowedPages: AppPage[];
}

export type EmailEvent = "submitted" | "approved" | "revision_requested" | "completed";
export interface FormEmailTemplate {
  id: string;
  department: string;
  formType: string;
  event: EmailEvent;
  enabled: boolean;
  subject: string;
  body: string;
}

export interface FormsConfig {
  admins: AdminUser[];
  members: AdminUser[];
  departments: string[];
  mappings: FormMapping[];
  pagePermissions?: UserPagePermission[];
  defaultPageAccess?: AppPage[];
  emailTemplates?: FormEmailTemplate[];
  allowedSignInDomains: string[];
}

const DEFAULT_CONFIG: FormsConfig = {
  admins: [],
  members: [],
  departments: ["Finance", "Procurement", "Operations", "Human Resources", "Marketing", "IT", "General"],
  mappings: [],
  pagePermissions: [],
  defaultPageAccess: ["forms"],
  emailTemplates: [],
  allowedSignInDomains: ["primephilippines.com"],
};

function normalizeEmail(email?: string) {
  return (email || "").trim().toLowerCase();
}

export function AdminConfiguration({ userEmail, username }: { userEmail: string; username?: string }) {
  const [config, setConfig] = useState<FormsConfig>(DEFAULT_CONFIG);
  const [selectedDepartment, setSelectedDepartment] = useState(DEFAULT_CONFIG.departments[0]);
  const [selectedForm, setSelectedForm] = useState<string>("rfp");
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
  const [settingsTab, setSettingsTab] = useState<"rbac" | "configurations" | "email">("rbac");
  const [emailEvent, setEmailEvent] = useState<EmailEvent>("submitted");
  const [emailTestStatus, setEmailTestStatus] = useState("");
  const [newSignInDomain, setNewSignInDomain] = useState("");

  // Page Access Governance state
  const [newPageUserEmail, setNewPageUserEmail] = useState("");
  const [newPageUserName, setNewPageUserName] = useState("");
  const [newPageSelectedPages, setNewPageSelectedPages] = useState<AppPage[]>([
    "forms",
  ]);

  const isOwner = isFormsOwner({ email: userEmail, username });

  useEffect(() => {
    const local = localStorage.getItem("echo_forms_config");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        setConfig({
          ...DEFAULT_CONFIG,
          ...parsed,
          pagePermissions: parsed.pagePermissions || [],
          emailTemplates: parsed.emailTemplates || [],
        });
      } catch {}
    }
    fetch("/api/forms/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.config) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data.config,
            members: data.config.members || [],
            pagePermissions: data.config.pagePermissions || [],
            defaultPageAccess: data.config.defaultPageAccess || ["forms"],
            emailTemplates: data.config.emailTemplates || [],
          });
        }
      })
      .catch(() => {});
  }, []);

  const save = async (next: FormsConfig = config) => {
    setConfig(next);
    localStorage.setItem("echo_forms_config", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("echo-config-updated", { detail: next }));
    const res = await fetch("/api/forms/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    setNotice(res.ok ? "Configuration saved." : "Could not sync configuration to the server. It remains saved on this device.");
    window.setTimeout(() => setNotice(""), 3500);
  };

  const mapping = useMemo(
    () =>
      config.mappings.find(
        (item) => item.department === selectedDepartment && item.formType === selectedForm
      ),
    [config.mappings, selectedDepartment, selectedForm]
  );

  const ensureMapping = () =>
    mapping || {
      id: `${selectedDepartment}-${selectedForm}`,
      department: selectedDepartment,
      formType: selectedForm,
      formLabel:
        selectedForm === "it-asset-request-form"
          ? "IT Asset Request Form"
          : FORM_LABELS[selectedForm as FormType],
      listId: "",
      approvers: STAGES.map((_, stage) => ({ stage, emails: [], requireAll: false })),
    };

  const updateMapping = (next: FormMapping) => {
    const updated = {
      ...config,
      mappings: [...config.mappings.filter((item) => item.id !== next.id), next],
    };
    setConfig(updated);
    localStorage.setItem("echo_forms_config", JSON.stringify(updated));
    setNotice("Unsaved routing changes");
  };

  if (
    !isOwner &&
    !config.admins.some((admin) => admin.active && normalizeEmail(admin.email) === normalizeEmail(userEmail))
  ) {
    return (
      <div className="panel max-w-3xl">
        <AlertTriangle className="text-amber-600 mb-3" />
        <h2 className="text-xl font-bold text-slate-800">Admin access required</h2>
        <p className="text-sm text-gray-500 mt-2">
          This configuration area is restricted to the protected Owner and active Forms Admins.
        </p>
      </div>
    );
  }

  const addAdmin = () => {
    const email = normalizeEmail(newAdminEmail);
    if (
      !isOwner ||
      !email ||
      email === OWNER_EMAIL ||
      config.admins.some((admin) => normalizeEmail(admin.email) === email)
    )
      return;
    save({
      ...config,
      admins: [
        ...config.admins,
        { email, name: newAdminName.trim() || email, role: "admin", department: "", active: true },
      ],
    });
    setNewAdminEmail("");
    setNewAdminName("");
  };

  const addDepartment = () => {
    const value = newDepartment.trim();
    if (value && !config.departments.includes(value)) {
      save({ ...config, departments: [...config.departments, value] });
    }
    setNewDepartment("");
  };

  const addCustomForm = () => {
    const name = newFormName.trim();
    const listId = newFormListId.trim();
    if (!name || !listId) return;
    const normalized = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const key =
      selectedDepartment === "IT" && normalized === "helpdesk-support-form"
        ? "it-helpdesk-support-form"
        : selectedDepartment === "IT" && normalized === "bug-error-report-form"
        ? "it-bug-error-report-form"
        : normalized;
    const next = {
      id: `${selectedDepartment}-${key}`,
      department: selectedDepartment,
      formType: key,
      formLabel: name,
      listId,
      approvers: STAGES.map((_, stage) => ({ stage, emails: [], requireAll: false })),
    };
    save({ ...config, mappings: [...config.mappings.filter((item) => item.id !== next.id), next] });
    setNewFormName("");
    setNewFormListId("");
  };

  const addMember = () => {
    const email = normalizeEmail(newMemberEmail);
    if (!email || config.members.some((member) => normalizeEmail(member.email) === email) || email === OWNER_EMAIL)
      return;
    const member: AdminUser = {
      email,
      name: newMemberName.trim() || email,
      role: newMemberRole,
      department: newMemberDepartment,
      active: true,
    };
    save({
      ...config,
      members: [...config.members, member],
      admins: newMemberRole === "admin" ? [...config.admins, member] : config.admins,
    });
    setNewMemberEmail("");
    setNewMemberName("");
  };

  // Page Access Governance Handlers
  const addPagePermission = () => {
    const email = normalizeEmail(newPageUserEmail);
    if (!email) return;
    if (email === OWNER_EMAIL) {
      alert("The Owner (Dave Policarpio) has permanent master access to all application pages.");
      return;
    }
    const existingRules = config.pagePermissions || [];
    const updatedRules = [
      ...existingRules.filter((r) => normalizeEmail(r.email) !== email),
      {
        email,
        name: newPageUserName.trim() || email,
        allowedPages: newPageSelectedPages.length > 0 ? newPageSelectedPages : ["forms" as AppPage],
      },
    ];
    save({ ...config, pagePermissions: updatedRules });
    setNewPageUserEmail("");
    setNewPageUserName("");
    setNewPageSelectedPages(["forms"]);
  };

  const togglePageForUser = (userEmailToToggle: string, page: AppPage) => {
    const norm = normalizeEmail(userEmailToToggle);
    const existingRules = config.pagePermissions || [];
    const currentRule = existingRules.find((r) => normalizeEmail(r.email) === norm);
    if (!currentRule) return;

    let nextPages: AppPage[];
    if (currentRule.allowedPages.includes(page)) {
      if (currentRule.allowedPages.length <= 1) {
        alert("A user must have at least one allowed page. To grant full access, click 'Grant All' or remove the rule.");
        return;
      }
      nextPages = currentRule.allowedPages.filter((p) => p !== page);
    } else {
      nextPages = [...currentRule.allowedPages, page];
    }

    const updatedRules = existingRules.map((r) =>
      normalizeEmail(r.email) === norm ? { ...r, allowedPages: nextPages } : r
    );
    save({ ...config, pagePermissions: updatedRules });
  };

  const setPresetForUser = (userEmailToSet: string, pages: AppPage[]) => {
    const norm = normalizeEmail(userEmailToSet);
    const existingRules = config.pagePermissions || [];
    const updatedRules = existingRules.map((r) =>
      normalizeEmail(r.email) === norm ? { ...r, allowedPages: pages } : r
    );
    save({ ...config, pagePermissions: updatedRules });
  };

  const removePagePermission = (userEmailToRemove: string) => {
    const norm = normalizeEmail(userEmailToRemove);
    const existingRules = config.pagePermissions || [];
    const updatedRules = existingRules.filter((r) => normalizeEmail(r.email) !== norm);
    save({ ...config, pagePermissions: updatedRules });
  };

  const handleUpdateDefaultPages = (pages: AppPage[]) => {
    save({
      ...config,
      defaultPageAccess: pages.length > 0 ? pages : ["forms"],
    });
  };

  const toggleDefaultPage = (page: AppPage) => {
    const current = config.defaultPageAccess || ["forms"];
    let next: AppPage[];
    if (current.includes(page)) {
      if (current.length <= 1) {
        alert("New and unlisted users must have at least one permitted page (e.g. Forms).");
        return;
      }
      next = current.filter((p) => p !== page);
    } else {
      next = [...current, page];
    }
    save({
      ...config,
      defaultPageAccess: next,
    });
  };

  const current = ensureMapping();
  const emailTemplateId = `${selectedDepartment}-${selectedForm}-${emailEvent}`;
  const emailTemplate = (config.emailTemplates || []).find((item) => item.id === emailTemplateId) || {
    id: emailTemplateId,
    department: selectedDepartment,
    formType: selectedForm,
    event: emailEvent,
    enabled: true,
    subject: "Request Status Update ({{form_id}})",
    body: "Hi {{requestor_first_name}},\n\nYour {{form_name}} request has been updated.\n\nRequest ID: {{form_id}}\nSubmitted: {{submitted_at}}\nLast updated: {{status_updated_at}}\nStatus: {{status_label}}\nDepartment: {{department}}\nRequest title: {{request_title}}\nAmount: {{amount}}\nPurpose: {{purpose}}\n\nCompleted stage: {{completed_stage}}\nApproved by: {{approver_name}}\nCompleted: {{completed_at}}\n\nCurrent stage: {{current_stage}}\nStarted: {{current_stage_started_at}}\n\n{{status_message}}\n{{next_step_message}}\n\nTrack request: {{track_status_url}}",
  };
  const updateEmailTemplate = (patch: Partial<FormEmailTemplate>) => {
    const next = { ...emailTemplate, ...patch };
    const updated = { ...config, emailTemplates: [...(config.emailTemplates || []).filter((item) => item.id !== next.id), next] };
    setConfig(updated);
    localStorage.setItem("echo_forms_config", JSON.stringify(updated));
    setNotice("Unsaved email template changes");
  };

  const sendTestEmail = async () => {
    setEmailTestStatus("Sending test…");
    try {
      const response = await fetch("/api/forms/email-test", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ department: selectedDepartment, formType: selectedForm, event: emailEvent }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || result.error || "Test email failed");
      setEmailTestStatus(`Sent to ${result.recipient || userEmail}. Check that inbox and Resend → Emails.`);
    } catch (error: any) {
      setEmailTestStatus(error.message || "Test email failed");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif italic font-bold text-[#003366]">Forms & System Administration</h1>
          <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
            RBAC, Page Access Governance, and Six-Stage Approval Routing
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2 shadow-sm" onClick={() => save()}>
          <Save size={14} /> Save Configuration
        </button>
      </div>

      {notice && (
        <div className="border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-xs font-semibold">
          {notice}
        </div>
      )}

      <div className="flex gap-1 border-b border-gray-200 pb-2">
        {(["rbac", "configurations", "email"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setSettingsTab(item)} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border ${settingsTab === item ? "bg-[#003366] text-white border-[#003366]" : "bg-[#FFFCFB] text-[#003366] border-gray-200 hover:border-[#C9AB4C]"}`}>
            {item === "rbac" ? "RBAC" : item === "configurations" ? "Configurations" : "Email"}
          </button>
        ))}
      </div>

      {/* Role access summary */}
      <section className={`panel ${settingsTab !== "rbac" ? "hidden" : ""}`}>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Role Access Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[
            ["Owner", "Protected control over admin membership and system security"],
            ["Admin", "Manage mappings, department assignments, and page governance"],
            ["Approver", "Review and act on assigned approval stages"],
            ["Requestor", "Submit forms and track progress of own requests"],
          ].map(([role, desc]) => (
            <div key={role} className="border border-gray-200 p-3 bg-[#FFFCFB]/50">
              <div className="font-bold text-[#003366] text-sm">{role}</div>
              <div className="text-[11px] text-gray-500 mt-1">{desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-xs text-gray-600">
          Protected Owner: <span className="font-bold text-[#003366]">{OWNER_EMAIL}</span>
        </div>
      </section>

      <section className={`panel ${settingsTab !== "rbac" ? "hidden" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">ClickUp sign-in domains</h2>
            <p className="text-xs text-gray-500 mt-1">Only ClickUp users whose email ends with one of these domains can sign in. Enter domains without the @ symbol, separated by commas.</p>
          </div>
          <ShieldCheck size={19} className="text-[#003366]" />
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {(config.allowedSignInDomains || []).map((domain) => (
            <span key={domain} className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#003366]">
              {domain}
              <button
                type="button"
                className="cursor-pointer text-red-500 hover:text-red-700"
                onClick={() => save({ ...config, allowedSignInDomains: config.allowedSignInDomains.filter((item) => item !== domain) })}
                aria-label={`Remove ${domain}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
          {(config.allowedSignInDomains || []).length === 0 && <span className="text-xs text-gray-400">No domains configured.</span>}
        </div>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 border border-gray-300 px-3 py-2 text-sm"
            value={newSignInDomain}
            onChange={(e) => setNewSignInDomain(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const domain = newSignInDomain.trim().toLowerCase().replace(/^@/, "");
                if (domain && !config.allowedSignInDomains.includes(domain)) save({ ...config, allowedSignInDomains: [...config.allowedSignInDomains, domain] });
                setNewSignInDomain("");
              }
            }}
            placeholder="example.com"
            aria-label="New allowed ClickUp sign-in domain"
          />
          <button
            type="button"
            className="btn-outline whitespace-nowrap"
            onClick={() => {
              const domain = newSignInDomain.trim().toLowerCase().replace(/^@/, "");
              if (domain && !config.allowedSignInDomains.includes(domain)) save({ ...config, allowedSignInDomains: [...config.allowedSignInDomains, domain] });
              setNewSignInDomain("");
            }}
          >
            <Plus size={14} className="inline mr-1" /> Add domain
          </button>
        </div>
        <p className="text-[11px] text-gray-500 mt-2">Save Configuration to apply this policy to new ClickUp sign-ins.</p>
      </section>

      {/* NEW: Page Access Governance */}
      <section className={`panel ${settingsTab !== "rbac" ? "hidden" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Lock size={18} className="text-[#003366]" /> Page Access Governance
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Govern which pages (Dashboard, Tasks, Meetings, Notetaker, Forms) can be accessed by specific users or new users by default.
            </p>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#003366] bg-blue-50 px-2 py-1 border border-blue-200">
            RBAC Governance
          </span>
        </div>

        {/* Default Page Access for New & Unlisted Users */}
        <div className="mt-4 bg-[#FFFCFB] border border-[#C9AB4C]/50 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold text-[#003366] uppercase tracking-wider flex items-center gap-1.5">
                <Users size={15} className="text-[#C9AB4C]" />
                Default Page Access for New / Unlisted Users
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Configure which pages are accessible to new members, first-time logins, or users without explicit custom rules.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleUpdateDefaultPages(["forms"])}
                className="text-[11px] font-semibold text-[#003366] bg-[#FFFCFB] hover:bg-[#FFFCFB] px-2.5 py-1 border border-slate-300 shadow-xs cursor-pointer"
              >
                Forms Only
              </button>
              <button
                type="button"
                onClick={() => handleUpdateDefaultPages(APP_PAGE_LIST.map((p) => p.id))}
                className="text-[11px] font-semibold text-[#003366] bg-[#FFFCFB] hover:bg-[#FFFCFB] px-2.5 py-1 border border-slate-300 shadow-xs cursor-pointer"
              >
                Grant All Pages
              </button>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#C9AB4C]/30 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-700 mr-1">
              Active Default Pages:
            </span>
            {APP_PAGE_LIST.map((page) => {
              const currentDefault = config.defaultPageAccess || ["forms"];
              const isAllowed = currentDefault.includes(page.id);
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => toggleDefaultPage(page.id)}
                  className={`text-[11px] px-3 py-1 border font-medium transition-all cursor-pointer ${
                    isAllowed
                      ? "bg-[#003366] text-white border-[#003366] font-semibold shadow-xs"
                      : "bg-[#FFFCFB] text-slate-400 border-slate-300 line-through hover:border-slate-400"
                  }`}
                >
                  {page.label}
                </button>
              );
            })}
            <span className="text-[11px] text-slate-500 italic ml-2">
              ({(config.defaultPageAccess || ["forms"]).length} of {APP_PAGE_LIST.length} permitted by default)
            </span>
          </div>
        </div>

        {/* Add / Restrict User Page Access Form */}
        <div className="mt-4 bg-[#FFFCFB] border border-slate-200 p-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Add or Restrict User Page Access
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Select Member or Enter Email
              </label>
              <div className="space-y-1.5">
                {config.members.length > 0 && (
                  <select
                    className="w-full border border-gray-300 px-2.5 py-1.5 text-xs bg-[#FFFCFB] focus:outline-none"
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      const m = config.members.find((item) => normalizeEmail(item.email) === val);
                      if (m) {
                        setNewPageUserEmail(m.email);
                        setNewPageUserName(m.name);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="">-- Quick pick from existing people --</option>
                    {config.members.map((m) => (
                      <option key={m.email} value={normalizeEmail(m.email)}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="email"
                  placeholder="user@primephilippines.com"
                  value={newPageUserEmail}
                  onChange={(e) => setNewPageUserEmail(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-1.5 text-xs bg-[#FFFCFB] focus:outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                User Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={newPageUserName}
                onChange={(e) => setNewPageUserName(e.target.value)}
                className="w-full border border-gray-300 px-3 py-1.5 text-xs bg-[#FFFCFB] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5 flex flex-col justify-end">
              <div className="text-[11px] font-semibold text-slate-600 mb-1">
                Allowed Pages:
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {APP_PAGE_LIST.map((page) => {
                  const isChecked = newPageSelectedPages.includes(page.id);
                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          if (newPageSelectedPages.length > 1) {
                            setNewPageSelectedPages(newPageSelectedPages.filter((p) => p !== page.id));
                          }
                        } else {
                          setNewPageSelectedPages([...newPageSelectedPages, page.id]);
                        }
                      }}
                      className={`text-[11px] px-2 py-1 border font-medium transition-colors cursor-pointer ${
                        isChecked
                          ? "bg-[#003366] text-white border-[#003366]"
                          : "bg-[#FFFCFB] text-slate-600 border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      {page.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={addPagePermission}
                  className="btn-primary text-xs py-1 px-3 flex items-center gap-1 shadow-sm"
                >
                  <Plus size={13} /> Add Rule
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configured Rules List */}
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Active User Restrictions ({config.pagePermissions?.length || 0})
          </div>

          {!config.pagePermissions || config.pagePermissions.length === 0 ? (
            <div className="border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 bg-[#FFFCFB]/50">
              No specific user overrides configured. All users without custom rules follow the default access policy configured above ({(config.defaultPageAccess || ["forms"]).length} of {APP_PAGE_LIST.length} permitted pages).
            </div>
          ) : (
            config.pagePermissions.map((rule) => (
              <div
                key={rule.email}
                className="border border-slate-200 bg-[#FFFCFB] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs"
              >
                <div className="min-w-[200px]">
                  <div className="text-xs font-bold text-[#003366]">
                    {rule.name ? `${rule.name} ` : ""}<span className="font-mono text-slate-600">({rule.email})</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Permitted pages: {rule.allowedPages.length} of {APP_PAGE_LIST.length}
                  </div>
                </div>

                {/* Page Toggle Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {APP_PAGE_LIST.map((page) => {
                    const isAllowed = rule.allowedPages.includes(page.id);
                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => togglePageForUser(rule.email, page.id)}
                        title={`Click to ${isAllowed ? "restrict" : "grant"} ${page.label}`}
                        className={`text-[11px] px-2.5 py-1 border transition-all cursor-pointer ${
                          isAllowed
                            ? "bg-[#003366] text-white border-[#003366] font-semibold"
                            : "bg-[#FFFCFB] text-slate-400 border-slate-200 line-through hover:border-slate-300"
                        }`}
                      >
                        {page.label}
                      </button>
                    );
                  })}
                </div>

                {/* Presets and Remove Rule */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPresetForUser(rule.email, ["forms"])}
                    className="text-[10px] text-slate-600 bg-[#FFFCFB] hover:bg-[#FFFCFB] px-2 py-1 border border-slate-300 cursor-pointer"
                  >
                    Forms Only
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setPresetForUser(rule.email, [
                        "dashboard",
                        "tasks",
                        "meetings",
                        "minutes",
                        "forms",
                      ])
                    }
                    className="text-[10px] text-slate-600 bg-[#FFFCFB] hover:bg-[#FFFCFB] px-2 py-1 border border-slate-300 cursor-pointer"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={() => removePagePermission(rule.email)}
                    title="Remove restriction (restore full access)"
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Admin membership */}
      <section className={`panel ${settingsTab !== "rbac" ? "hidden" : ""}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-800">Admin Membership</h2>
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Owner only</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.admins.map((admin) => (
            <div key={admin.email} className="flex items-center gap-2 border border-gray-200 px-3 py-2 text-xs bg-[#FFFCFB]">
              <span>
                {admin.name} · {admin.email}
              </span>
              {isOwner && (
                <button
                  onClick={() =>
                    save({ ...config, admins: config.admins.filter((item) => item.email !== admin.email) })
                  }
                  aria-label={`Remove ${admin.email}`}
                  className="cursor-pointer"
                >
                  <X size={13} className="text-red-500" />
                </button>
              )}
            </div>
          ))}
          {config.admins.length === 0 && (
            <span className="text-xs text-gray-400">No additional admins configured.</span>
          )}
        </div>
        {isOwner && (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
            <input
              className="border border-gray-300 px-3 py-2 text-xs"
              placeholder="Admin name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
            />
            <input
              className="border border-gray-300 px-3 py-2 text-xs"
              placeholder="email@primephilippines.com"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
            />
            <button className="btn-outline flex items-center justify-center gap-1 cursor-pointer" onClick={addAdmin}>
              <Plus size={14} /> Add Admin
            </button>
          </div>
        )}
      </section>

      {/* People & department assignments */}
      <section className={`panel ${settingsTab !== "rbac" ? "hidden" : ""}`}>
        <h2 className="text-lg font-bold text-slate-800 mb-3">People &amp; Department Assignments</h2>
        <div className="space-y-2 mb-4">
          {config.members.map((member) => (
            <div
              key={member.email}
              className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 px-3 py-2 text-xs bg-[#FFFCFB]"
            >
              <span>
                <b>{member.name}</b> · {member.email} ·{" "}
                <span className="uppercase text-[#003366] font-bold">{member.role}</span> ·{" "}
                {member.department || "Unassigned"}
              </span>
              <button
                onClick={() =>
                  save({ ...config, members: config.members.filter((item) => item.email !== member.email) })
                }
                aria-label={`Remove ${member.email}`}
                className="cursor-pointer"
              >
                <X size={13} className="text-red-500" />
              </button>
            </div>
          ))}
          {config.members.length === 0 && (
            <span className="text-xs text-gray-400">No people assigned yet. Add approvers and requestors here.</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          <input
            className="border border-gray-300 px-3 py-2 text-xs"
            placeholder="Name"
            value={newMemberName}
            onChange={(e) => setNewMemberName(e.target.value)}
          />
          <input
            className="border border-gray-300 px-3 py-2 text-xs"
            placeholder="Email"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
          />
          <select
            className="border border-gray-300 px-3 py-2 text-xs bg-[#FFFCFB]"
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as Exclude<Role, "owner">)}
          >
            <option value="requestor">Requestor</option>
            <option value="approver">Approver</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex gap-2">
            <select
              className="border border-gray-300 px-3 py-2 text-xs bg-[#FFFCFB] flex-1"
              value={newMemberDepartment}
              onChange={(e) => setNewMemberDepartment(e.target.value)}
            >
              <option value="">Department</option>
              {config.departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
            <button className="btn-outline flex items-center gap-1 cursor-pointer" onClick={addMember}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className={`panel ${settingsTab !== "configurations" ? "hidden" : ""}`}>
        <h2 className="text-lg font-bold text-slate-800 mb-3">Departments</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {config.departments.map((department) => (
            <span key={department} className="inline-flex items-center gap-2 border border-gray-200 px-3 py-1.5 text-xs bg-[#FFFCFB]">
              {department}
              <button
                aria-label={`Remove ${department}`}
                onClick={() =>
                  save({
                    ...config,
                    departments: config.departments.filter((item) => item !== department),
                    mappings: config.mappings.filter((item) => item.department !== department),
                  })
                }
                className="cursor-pointer"
              >
                <X size={13} className="text-red-500" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-md">
          <input
            className="border border-gray-300 px-3 py-2 text-xs flex-1"
            placeholder="Add department"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
          />
          <button className="btn-outline flex items-center gap-1 cursor-pointer" onClick={addDepartment}>
            <Plus size={14} /> Add
          </button>
        </div>
      </section>

      {/* Department forms & ClickUp destinations */}
      <section className={`panel ${settingsTab !== "configurations" ? "hidden" : ""}`}>
        <h2 className="text-lg font-bold text-slate-800 mb-1">Department Forms &amp; ClickUp Destinations</h2>
        <p className="text-xs text-gray-500 mb-4">
          Every department/form mapping requires its own ClickUp List ID.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <label className="text-xs font-bold text-gray-600">
            Department
            <select
              className="mt-1 w-full border border-gray-300 px-3 py-2 bg-[#FFFCFB] font-normal"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              {config.departments.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-gray-600">
            Form
            <select
              className="mt-1 w-full border border-gray-300 px-3 py-2 bg-[#FFFCFB] font-normal"
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value)}
            >
              {Object.entries(FORM_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
              {selectedDepartment === "IT" && <option value="it-asset-request-form">IT Asset Request Form</option>}
            </select>
          </label>
        </div>
        <div className="border border-gray-200 p-3 mb-4 bg-[#FFFCFB]">
          <label className="text-xs font-bold text-gray-600">
            ClickUp List ID
            <input
              className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal bg-[#FFFCFB]"
              placeholder="Required destination List ID"
              value={current.listId || ""}
              onChange={(e) =>
                updateMapping({
                  ...current,
                  listId: e.target.value,
                  formLabel:
                    current.formLabel ||
                    (selectedForm === "it-asset-request-form"
                      ? "IT Asset Request Form"
                      : FORM_LABELS[selectedForm as FormType]),
                })
              }
            />
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 border-t pt-4">
          <input
            className="border border-gray-300 px-3 py-2 text-xs"
            placeholder="New custom form name"
            value={newFormName}
            onChange={(e) => setNewFormName(e.target.value)}
          />
          <input
            className="border border-gray-300 px-3 py-2 text-xs"
            placeholder="Required ClickUp List ID"
            value={newFormListId}
            onChange={(e) => setNewFormListId(e.target.value)}
          />
          <button className="btn-outline cursor-pointer" onClick={addCustomForm}>
            Add form
          </button>
        </div>

        {/* 6-stage approvers routing */}
        <div className="space-y-2 mt-4">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Six-Stage Approver Routing
          </div>
          {STAGES.map((stageName, index) => {
            const stage = current.approvers[index] || { stage: index, emails: [], requireAll: false };
            return (
              <div
                key={stageName}
                className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto] gap-2 items-center border border-gray-200 p-3 bg-[#FFFCFB]"
              >
                <div>
                  <div className="text-xs font-bold text-[#003366]">
                    {index + 1}. {stageName}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    {stage.requireAll ? "All assigned approvers required" : "Any one approver can advance"}
                  </div>
                </div>
                <input
                  className="border border-gray-300 px-3 py-2 text-xs"
                  placeholder="approver@primephilippines.com (comma separated)"
                  value={stage.emails.join(", ")}
                  onChange={(e) => {
                    const emails = e.target.value.split(",").map(normalizeEmail).filter(Boolean);
                    const next = {
                      ...current,
                      approvers: current.approvers.map((item) =>
                        item.stage === index ? { ...item, emails } : item
                      ),
                    };
                    updateMapping(next);
                  }}
                />
                <label className="text-[11px] flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stage.requireAll}
                    onChange={(e) => {
                      const next = {
                        ...current,
                        approvers: current.approvers.map((item) =>
                          item.stage === index ? { ...item, requireAll: e.target.checked } : item
                        ),
                      };
                      updateMapping(next);
                    }}
                  />{" "}
                  All required
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`panel ${settingsTab !== "email" ? "hidden" : ""}`}>
        <div className="flex items-center gap-2 mb-1"><Mail size={18} className="text-[#003366]" /><h2 className="text-lg font-bold text-slate-800">Automated Requestor Email</h2></div>
        <p className="text-xs text-gray-500 mb-4">Configure a separate dynamic email for each department, form, and request event.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <label className="text-xs font-bold text-gray-600">Department<select className="mt-1 w-full border border-gray-300 px-3 py-2 bg-[#FFFCFB] font-normal" value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>{config.departments.map((department) => <option key={department}>{department}</option>)}</select></label>
          <label className="text-xs font-bold text-gray-600">Form<select className="mt-1 w-full border border-gray-300 px-3 py-2 bg-[#FFFCFB] font-normal" value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)}>{Object.entries(FORM_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}{selectedDepartment === "IT" && <option value="it-asset-request-form">IT Asset Request Form</option>}{config.mappings.filter((item) => item.department === selectedDepartment && !FORM_LABELS[item.formType] && item.formType !== "it-asset-request-form").map((item) => <option key={item.formType} value={item.formType}>{item.formLabel || item.formType}</option>)}</select></label>
          <label className="text-xs font-bold text-gray-600">Event<select className="mt-1 w-full border border-gray-300 px-3 py-2 bg-[#FFFCFB] font-normal" value={emailEvent} onChange={(e) => setEmailEvent(e.target.value as EmailEvent)}><option value="submitted">Submitted</option><option value="approved">Approved / Stage changed</option><option value="revision_requested">Revision requested</option><option value="completed">Completed</option></select></label>
        </div>
        <label className="mb-4 flex items-center gap-2 text-xs font-bold text-[#003366]"><input type="checkbox" checked={emailTemplate.enabled} onChange={(e) => updateEmailTemplate({ enabled: e.target.checked })} /> Send this email automatically</label>
        <label className="block text-xs font-bold text-gray-600 mb-3">Subject<input className="mt-1 w-full border border-gray-300 px-3 py-2 font-normal" value={emailTemplate.subject} onChange={(e) => updateEmailTemplate({ subject: e.target.value })} /></label>
        <label className="block text-xs font-bold text-gray-600">Email body<textarea rows={16} className="mt-1 w-full border border-gray-300 px-3 py-2 font-mono text-xs font-normal leading-relaxed" value={emailTemplate.body} onChange={(e) => updateEmailTemplate({ body: e.target.value })} /></label>
        <div className="mt-3 border border-slate-200 bg-[#FFFCFB] p-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Dynamic fields</div><div className="flex flex-wrap gap-1.5">{["requestor_first_name", "form_name", "form_id", "department", "status_label", "request_title", "amount", "purpose", "submitted_at", "status_updated_at", "completed_stage", "approver_name", "completed_at", "current_stage", "current_stage_started_at", "status_message", "next_step_message", "track_status_url"].map((field) => <button type="button" key={field} onClick={() => updateEmailTemplate({ body: `${emailTemplate.body}{{${field}}}` })} className="border border-slate-300 bg-[#FFFCFB] px-2 py-1 text-[10px] text-[#003366]">{`{{${field}}}`}</button>)}</div></div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><button type="button" onClick={sendTestEmail} className="border border-[#003366] bg-[#FFFCFB] px-4 py-2 text-xs font-bold text-[#003366] hover:bg-[#FFFCFB]">Send test email to my login</button>{emailTestStatus && <span className="text-xs text-slate-600">{emailTestStatus}</span>}</div>
      </section>
    </div>
  );
}

export default function FormsPortal({
  user,
  initialTab = "track",
}: {
  user?: { username?: string; email?: string } | null;
  initialTab?: PortalTab;
}) {
  const [tab, setTab] = useState<PortalTab>(initialTab);
  const searchParams = useSearchParams();

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const requested = searchParams.get("tab") as PortalTab | null;
    if (requested && ["create", "track", "approvals", "admin"].includes(requested)) {
      setTab(requested);
    }
  }, [searchParams]);

  const [configuredAdmins, setConfiguredAdmins] = useState<AdminUser[]>([]);
  const [configuredMembers, setConfiguredMembers] = useState<AdminUser[]>([]);
  const [serverAdmin, setServerAdmin] = useState(false);
  useEffect(() => {
    fetch("/api/forms/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setConfiguredAdmins(data?.config?.admins || []);
        setConfiguredMembers(data?.config?.members || []);
        setServerAdmin(Boolean(data?.isAdmin));
      })
      .catch(() => {});
  }, []);

  const isAdmin =
    serverAdmin || normalizeEmail(user?.email) === OWNER_EMAIL ||
    configuredAdmins.some((admin) => admin.active && normalizeEmail(admin.email) === normalizeEmail(user?.email));

  // Do not render Settings at all for non-admin accounts, including direct URL attempts.
  if (tab === "admin" && !isAdmin) return null;

  const tabs: Array<{ id: PortalTab; label: string; icon: typeof FileEdit }> = [
    { id: "track", label: "Track Status", icon: PackageSearch },
    { id: "create", label: "New Form", icon: FileEdit },
  ];

  const canApprove = isAdmin || Boolean(user?.email && configuredMembers.some((member) =>
    member.active !== false && member.role === "approver" && normalizeEmail(member.email) === normalizeEmail(user.email)
  ));

  return (
    <div className="-mt-5 space-y-4">
      {tab === "admin" ? (
        <AdminConfiguration userEmail={user?.email || ""} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
            <div>
              <h1 className="text-2xl font-serif italic font-bold text-[#003366] flex items-center gap-2">
                <ClipboardList size={22} className="text-[#C9AB4C]" /> Forms
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-wider mt-1">
                Requests, Tracking &amp; Approvals
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    tab === id
                      ? "bg-[#003366] text-white border-[#003366]"
                      : "bg-[#FFFCFB] text-[#003366] border-gray-200 hover:border-[#C9AB4C]"
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
              {canApprove && (
                <button
                  onClick={() => setTab("approvals")}
                  className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 border cursor-pointer ${
                    tab === "approvals"
                      ? "bg-[#003366] text-white border-[#003366]"
                      : "bg-[#FFFCFB] text-[#003366] border-gray-200 hover:border-[#C9AB4C]"
                  }`}
                >
                  <ShieldCheck size={14} />
                  Approvals
                </button>
              )}
            </div>
          </div>

          {tab === "create" && <FormsCreateView user={{ name: user?.username, email: user?.email }} />}
          {tab === "track" && <FormsTrackView />}
          {tab === "approvals" && canApprove && <FormsApprovalsView />}
        </>
      )}
    </div>
  );
}
