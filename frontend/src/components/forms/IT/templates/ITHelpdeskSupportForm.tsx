"use client";

import { FormEvent, useState } from "react";
import { Send } from "lucide-react";
import { readJsonResponse } from "@/lib/forms/clientResponse";

export default function ITHelpdeskSupportForm({ listId, user }: { listId: string; user?: { name?: string; email?: string } | null }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formElement = event.currentTarget; setSaving(true); setNotice("");
    try {
      const payload = new FormData(formElement);
      payload.append("listId", listId); payload.append("requestorName", user?.name || "");
      const response = await fetch("/api/forms/it-helpdesk-support", { method: "POST", body: payload });
      const data = await readJsonResponse<{ error?: string; taskUrl?: string; taskId?: string; formRequestId?: string }>(response); if (!response.ok) throw new Error(data.error || "Unable to submit support request.");
      setNotice(`Submitted to ClickUp: ${data.taskUrl || data.taskId}`); window.dispatchEvent(new CustomEvent("echo-form-submitted", { detail: data })); formElement.reset();
    } catch (error: any) { setNotice(error.message || "Unable to submit support request."); }
    finally { setSaving(false); }
  };
  return <form id="it-helpdesk-support-form" onSubmit={submit} className="max-w-[850px] mx-auto border border-slate-300 bg-white shadow-sm p-7 text-[#172033]"><div className="flex items-start justify-between border-b-2 border-[#003366] pb-3 mb-5"><div><h2 className="text-xl font-bold text-[#003366]">Helpdesk Support</h2><p className="text-xs text-slate-500 mt-1">Describe your IT concern so the support team can assist quickly.</p></div><span className="text-[10px] font-bold uppercase tracking-widest text-[#C9AB4C]">IT Department</span></div><label className="block text-xs font-bold">What is this issue about? *<input required name="subject" placeholder="Brief description of your request" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label><label className="block text-xs font-bold mt-3">IT concern or support needed *<span className="block text-[10px] font-normal text-slate-400 mb-1">Include error messages, steps to reproduce, screenshots, or recordings when available.</span><textarea required name="details" rows={4} placeholder="Describe the issue in detail" className="w-full border border-slate-300 px-3 py-2 font-normal resize-none" /></label><div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3"><label className="text-xs font-bold">Screenshots or additional information<input name="attachments" type="file" multiple className="mt-1 w-full border border-dashed border-slate-300 px-3 py-2 text-xs font-normal" /></label><label className="text-xs font-bold">Email *<input required readOnly name="email" value={user?.email || ""} className="mt-1 w-full border border-slate-300 bg-slate-50 px-3 py-2 font-normal" /></label><label className="text-xs font-bold">Department *<input required name="department" defaultValue="IT" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label><label className="text-xs font-bold">Job request type *<select required name="jobRequestType" defaultValue="" className="mt-1 w-full border border-slate-300 px-3 py-2 bg-white font-normal"><option value="" disabled>Select option</option><option>Incident / Issue</option><option>Access Request</option><option>Service Request</option><option>Technical Support</option></select></label></div><label className="block text-xs font-bold mt-3">Remarks<textarea name="remarks" rows={2} placeholder="Additional notes" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal resize-none" /></label>{notice && <div className="mt-3 border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">{notice}</div>}<button disabled={saving} className="hidden" type="submit"><Send size={15} />{saving ? "Submitting…" : "Submit Helpdesk Request"}</button></form>;
}
