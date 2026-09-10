"use client";

import React from "react";
import { UploadCloud, FileText, CheckCircle2, Loader2, Paperclip, Check } from "lucide-react";

export type SubmissionStage =
  | "rendering_pdf"
  | "packaging_attachments"
  | "uploading_clickup"
  | "finalizing";

interface SubmissionLoadingModalProps {
  isOpen: boolean;
  stage: SubmissionStage;
  entityName: string;
  totalAmount: number;
  attachmentsCount: number;
  isRevision?: boolean;
}

const STAGES: Array<{
  key: SubmissionStage;
  label: string;
  desc: string;
}> = [
  {
    key: "rendering_pdf",
    label: "Rendering Official Document",
    desc: "Generating high-resolution signed PDF & preview image...",
  },
  {
    key: "packaging_attachments",
    label: "Packaging Supporting Documents",
    desc: "Processing vendor quotation & invoice attachments...",
  },
  {
    key: "uploading_clickup",
    label: "Transmitting to ClickUp",
    desc: "Creating task, setting custom fields, and 5-stage checklist...",
  },
  {
    key: "finalizing",
    label: "Finalizing & Notifying",
    desc: "Uploading files to task attachments & recording audit trail...",
  },
];

export function SubmissionLoadingModal({
  isOpen,
  stage,
  entityName,
  totalAmount,
  attachmentsCount,
  isRevision = false,
}: SubmissionLoadingModalProps) {
  if (!isOpen) return null;

  const stageKeys = STAGES.map((s) => s.key);
  const currentStageIndex = stageKeys.indexOf(stage);

  const formattedAmount = Number(totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const progressPercent = Math.min(
    100,
    Math.round(((currentStageIndex + 1) / STAGES.length) * 100)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white border-2 border-[#181A1D] shadow-2xl relative overflow-hidden flex flex-col">
        {/* Top Gold Accent Line */}
        <div className="h-1 bg-[#C9AB4C] w-full" />

        {/* Deep Charcoal Header */}
        <div className="bg-[#181A1D] p-6 text-white text-center relative overflow-hidden">
          {/* Subtle animated background glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#C9AB4C]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10">
            {/* Animated Icon Ring */}
            <div className="w-14 h-14 mx-auto mb-3 bg-[#181A1D] border-2 border-[#C9AB4C] flex items-center justify-center relative shadow-lg">
              <UploadCloud className="w-7 h-7 text-[#C9AB4C] animate-bounce" />
              <div className="absolute -inset-1 border border-[#C9AB4C]/30 animate-ping pointer-events-none" />
            </div>

            <h3 className="font-serif italic text-xl font-bold tracking-tight text-white">
              {isRevision ? "Updating ClickUp Task..." : "Submitting to ClickUp..."}
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Please keep this tab open while documents & attachments are uploading.
            </p>

            {/* Entity Summary Pill */}
            <div className="mt-3 inline-flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1 text-[11px] text-slate-200">
              <span className="font-bold truncate max-w-[140px] text-[#C9AB4C]">
                {entityName || "Document"}
              </span>
              <span>•</span>
              <span className="font-mono">₱{formattedAmount}</span>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <Paperclip className="w-3 h-3" />
                {attachmentsCount} {attachmentsCount === 1 ? "attachment" : "attachments"}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#003366] via-[#C9AB4C] to-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Stages Checklist */}
        <div className="p-6 space-y-3.5 bg-slate-50">
          {STAGES.map((s, idx) => {
            const isDone = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;

            let icon = (
              <div className="w-5 h-5 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-400 font-bold">
                {idx + 1}
              </div>
            );

            let labelColor = "text-slate-400";
            let descColor = "text-slate-400";
            let rowBg = "bg-transparent";

            if (isDone) {
              icon = (
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              );
              labelColor = "text-emerald-900 font-bold line-through opacity-80";
              descColor = "text-slate-400";
            } else if (isCurrent) {
              icon = (
                <div className="w-5 h-5 rounded-full bg-[#181A1D] text-white flex items-center justify-center">
                  <Loader2 className="w-3 h-3 animate-spin text-[#C9AB4C]" />
                </div>
              );
              labelColor = "text-[#181A1D] font-bold";
              descColor = "text-slate-600 font-medium";
              rowBg = "bg-white border border-slate-200 shadow-xs";
            }

            return (
              <div
                key={s.key}
                className={`p-2.5 flex items-start gap-3 transition-all ${rowBg}`}
              >
                <div className="shrink-0 mt-0.5">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs ${labelColor}`}>{s.label}</div>
                  <div className={`text-[11px] mt-0.5 ${descColor}`}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Reassurance Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 text-center">
          <span className="text-[11px] text-slate-400 italic">
            🔒 Secure 256-bit SSL upload directly to ClickUp Workspace
          </span>
        </div>
      </div>
    </div>
  );
}
