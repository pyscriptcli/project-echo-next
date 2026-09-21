"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, ExternalLink, Loader2, Mail, X } from "lucide-react";
import { downloadBlob, requestMeetingPdf } from "@/lib/api";
import { createMeetingEmailDraft, createOutlookComposeUrl, isValidRecipientList, OutlookMeetingDraft } from "@/lib/outlookCompose";

interface EmailMeetingModalProps {
  isOpen: boolean;
  meeting: { title?: string; date?: string; metadata: any; items: any[]; summary?: string };
  onClose: () => void;
}

export function EmailMeetingModal({ isOpen, meeting, onClose }: EmailMeetingModalProps) {
  const [draft, setDraft] = useState<OutlookMeetingDraft>(() => createMeetingEmailDraft(meeting));
  const [filename, setFilename] = useState("");
  const [error, setError] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [outlookUrl, setOutlookUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDraft(createMeetingEmailDraft(meeting));
      setFilename("");
      setError("");
      setOutlookUrl("");
    }
  }, [isOpen, meeting.title, meeting.date]);

  if (!isOpen) return null;

  const updateDraft = (key: keyof OutlookMeetingDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const handlePrepare = async () => {
    if (!isValidRecipientList(draft.to)) {
      setError("Enter at least one valid email address in To.");
      return;
    }
    if (draft.cc.trim() && !isValidRecipientList(draft.cc)) {
      setError("Check the CC email addresses.");
      return;
    }
    setError("");
    setIsPreparing(true);
    const popup = window.open("about:blank", "echo-outlook-compose");
    try {
      const { blob, filename: generatedFilename } = await requestMeetingPdf(meeting.metadata, meeting.items, meeting.summary || "");
      downloadBlob(blob, generatedFilename);
      const url = createOutlookComposeUrl(draft);
      setFilename(generatedFilename);
      setOutlookUrl(url);
      if (popup) popup.location.href = url;
      else setError("The PDF was downloaded, but your browser blocked the Outlook window. Use Open Outlook below.");
    } catch (cause) {
      popup?.close();
      setError(cause instanceof Error ? cause.message : "Could not prepare the PDF.");
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#001E3C]/50 p-4" role="dialog" aria-modal="true" aria-labelledby="email-meeting-title">
      <div className="w-full max-w-xl border border-slate-200 bg-[#FFFCFB] shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div><div className="flex items-center gap-2 text-[#003366]"><Mail size={17} className="text-[#C9AB4C]" /><h2 id="email-meeting-title" className="font-serif text-lg font-bold italic">Email meeting minutes</h2></div><p className="mt-1 text-[11px] text-slate-500">Echo opens Outlook with the message ready for your review.</p></div>
          <button type="button" onClick={onClose} disabled={isPreparing} aria-label="Close email dialog" className="text-slate-400 hover:text-[#003366] disabled:opacity-40"><X size={17} /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="border border-[#C9AB4C]/50 bg-[#FAF9F7] px-3 py-2 text-[11px] text-slate-600"><b className="text-[#003366]">From:</b> your signed-in Outlook account. <span className="block mt-0.5">The PDF will download first; attach it in Outlook before sending.</span></div>
          <label className="block text-xs font-semibold text-[#003366]">To<input value={draft.to} onChange={(e) => updateDraft("to", e.target.value)} placeholder="recipient@company.com" className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C9AB4C]" autoFocus /></label>
          <label className="block text-xs font-semibold text-[#003366]">CC <span className="font-normal text-slate-400">(optional)</span><input value={draft.cc} onChange={(e) => updateDraft("cc", e.target.value)} placeholder="manager@company.com" className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C9AB4C]" /></label>
          <label className="block text-xs font-semibold text-[#003366]">Subject<input value={draft.subject} onChange={(e) => updateDraft("subject", e.target.value)} className="mt-1 w-full border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#C9AB4C]" /></label>
          <label className="block text-xs font-semibold text-[#003366]">Message<textarea value={draft.body} onChange={(e) => updateDraft("body", e.target.value)} rows={6} className="mt-1 w-full resize-y border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-[#C9AB4C]" /></label>
          {error && <div className="flex items-start gap-2 border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700"><AlertCircle size={14} className="mt-0.5 shrink-0" />{error}</div>}
          {filename && <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800"><Download size={14} /><span>Downloaded <b>{filename}</b>. Attach it in Outlook.</span></div>}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3"><button type="button" onClick={onClose} disabled={isPreparing} className="border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">Cancel</button><button type="button" onClick={handlePrepare} disabled={isPreparing} className="flex items-center gap-2 bg-[#003366] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{isPreparing ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} className="text-[#C9AB4C]" />}{isPreparing ? "Preparing PDF…" : "Download PDF & Open Outlook"}</button>{outlookUrl && <a href={outlookUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-2 text-[11px] font-semibold text-[#003366] hover:underline">Open Outlook <ExternalLink size={12} /></a>}</div>
        </div>
      </div>
    </div>
  );
}
