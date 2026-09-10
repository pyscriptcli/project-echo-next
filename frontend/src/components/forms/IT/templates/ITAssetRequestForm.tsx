"use client";

import { FormEvent, useState } from "react";
import { Paperclip, Send } from "lucide-react";
import { readJsonResponse } from "@/lib/forms/clientResponse";

const ASSET_TYPES = ["Phone", "Laptop / Desktop", "Monitor", "iPad", "Other Peripherals", "Digital Asset"];

export default function ITAssetRequestForm({ listId, user }: { listId: string; user?: { name?: string; email?: string } | null }) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const formElement = event.currentTarget; setSaving(true); setNotice("");
    try {
      const payload = new FormData(formElement);
      payload.append("listId", listId);
      payload.append("requestorName", user?.name || "");
      payload.append("requestorEmail", user?.email || "");
      const response = await fetch("/api/forms/it-asset-request", { method: "POST", body: payload });
      const data = await readJsonResponse<{ error?: string; taskUrl?: string; taskId?: string; formRequestId?: string }>(response);
      if (!response.ok) throw new Error(data.error || "Unable to submit request.");
      setNotice(`Submitted to ClickUp: ${data.taskUrl || data.taskId}`);
      window.dispatchEvent(new CustomEvent("echo-form-submitted", { detail: data }));
      formElement.reset();
    } catch (error: any) { setNotice(error.message || "Unable to submit request."); }
    finally { setSaving(false); }
  };

  return <form id="it-asset-request-form" onSubmit={submit} className="max-w-[850px] mx-auto border border-slate-300 bg-white shadow-sm p-7 text-[#172033]">
    <div className="flex items-start justify-between border-b-2 border-[#003366] pb-3 mb-5"><div><h2 className="text-xl font-bold text-[#003366]">IT Asset Request Form</h2><p className="text-xs text-slate-500 mt-1">Submit complete details to help IT evaluate and fulfill your request.</p></div><span className="text-[10px] font-bold uppercase tracking-widest text-[#C9AB4C]">IT Department</span></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <label className="text-xs font-bold">Asset request title *<span className="block text-[10px] font-normal text-slate-400 mb-1">Example: Monitor_IT</span><input required name="title" placeholder="AssetType_Department" className="w-full border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-xs font-bold">Employee name *<input required name="employeeName" defaultValue={user?.name || ""} placeholder="Enter employee name" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-xs font-bold">Department *<input required name="department" defaultValue="IT" placeholder="Department" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-xs font-bold">Asset type *<select required name="assetType" defaultValue="" className="mt-1 w-full border border-slate-300 px-3 py-2 bg-white font-normal"><option value="" disabled>Select an asset</option>{ASSET_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label className="text-xs font-bold">Needed by *<input required name="neededBy" type="date" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label>
      <label className="text-xs font-bold">Assignee *<input required name="assignee" placeholder="IT assignee or team" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal" /></label>
    </div>
    <label className="block text-xs font-bold mt-3">Reason for request *<textarea required name="reason" rows={3} placeholder="Explain the business reason for this request" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal resize-none" /></label>
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-3 mt-3"><label className="text-xs font-bold flex items-center gap-2"><input name="tlApproval" type="checkbox" /> Team leader approval confirmed</label><label className="text-xs font-bold">Attachments<input name="attachments" type="file" multiple className="mt-1 w-full border border-dashed border-slate-300 px-3 py-2 text-xs font-normal" /></label></div>
    <label className="block text-xs font-bold mt-3">Remarks *<textarea required name="remarks" rows={2} placeholder="Additional requirements or remarks" className="mt-1 w-full border border-slate-300 px-3 py-2 font-normal resize-none" /></label>
    {notice && <div className="mt-3 border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">{notice}</div>}
    <button disabled={saving} className="hidden" type="submit"><Send size={15} />{saving ? "Submitting…" : "Submit IT Asset Request"}</button>
  </form>;
}
