"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { DemandRecord } from "@/types/demands";

export function EditDemandTrackingModal({
  demand,
  onClose,
  onSave,
}: {
  demand: DemandRecord | null;
  onClose: () => void;
  onSave: (demand: DemandRecord, status: string, actionTaken: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(demand?.status ?? "");
  const [actionTaken, setActionTaken] = useState(demand?.actionTaken ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!demand) return null;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave(demand, status.trim(), actionTaken.trim());
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update this demand.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
      <form onSubmit={save} className="w-full max-w-lg space-y-4 border-t-4 border-[#C9AB4C] bg-[#FFFCFB] p-5 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl font-bold text-[#003366]">Update demand tracking</h2>
            <p className="mt-1 text-xs text-slate-500">{demand.client} · {demand.city}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <label className="block text-xs font-bold text-slate-700">
          Status
          <input value={status} onChange={(event) => setStatus(event.target.value)} placeholder="Enter current status" className="mt-1 h-10 w-full border border-slate-300 px-3 font-normal" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Action Taken
          <textarea value={actionTaken} onChange={(event) => setActionTaken(event.target.value)} rows={5} placeholder="Record the latest broker action" className="mt-1 w-full border border-slate-300 p-3 font-normal" />
        </label>
        {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
          <button type="button" onClick={onClose} className="border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">Cancel</button>
          <button type="submit" disabled={saving} className="bg-[#003366] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save update"}</button>
        </div>
      </form>
    </div>
  );
}
