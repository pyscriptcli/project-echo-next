"use client";

import React, { useState } from "react";
import { CheckCircle2, Download, Copy, Check } from "lucide-react";
import { SubmissionResponse } from "@/types/forms/rfp";
import { downloadPdfBlob } from "@/lib/forms/pdfGenerator";

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  response: SubmissionResponse | null;
  pdfBlob: Blob | null;
  payeeName: string;
}

export function SubmissionModal({
  isOpen,
  onClose,
  response,
  pdfBlob,
  payeeName,
}: SubmissionModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !response) return null;

  const editUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?view=forms&tab=create&taskId=${response.taskId}`
    : "";

  const handleCopyLink = () => {
    if (editUrl) {
      navigator.clipboard.writeText(editUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDownload = () => {
    if (pdfBlob) {
      const sanitized = (payeeName || "Request").replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(pdfBlob, `RFP_${sanitized}_${new Date().toISOString().split("T")[0]}.pdf`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-none shadow-2xl border-2 border-[#003366] flex flex-col relative overflow-hidden">
        {/* Top Gold Accent Line */}
        <div className="h-[3px] bg-[#C9AB4C] w-full" />

        {/* Header decoration */}
        <div className="bg-[#003366] px-8 pt-6 pb-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 rounded-none border border-[#C9AB4C] flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-8 h-8 text-[#C9AB4C]" />
          </div>
          <h2 className="font-serif italic text-2xl font-bold tracking-tight text-white">
            {response.message || "Request Successfully Processed!"}
          </h2>
          <p className="text-slate-300 text-xs mt-1">
            Official form document generated & synchronized
          </p>

          {response.isMock && (
            <div className="inline-block mt-3 px-3 py-0.5 bg-[#C9AB4C]/20 text-[#C9AB4C] border border-[#C9AB4C]/40 text-[11px] font-semibold rounded-none">
              ⚡ Simulation Mode: Real ClickUp token not set yet
            </div>
          )}
        </div>

        {/* Details Content */}
        <div className="p-6 space-y-5">
          {/* Task Info Box */}
          <div className="bg-slate-50 border border-slate-300 rounded-none p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                ClickUp Task ID
              </p>
              <p className="font-bebas text-2xl text-[#003366] tracking-wider">
                #{response.taskId}
              </p>
            </div>

            {response.isMock && <div className="text-xs text-slate-500 italic bg-white px-3 py-1.5 border border-slate-200">Mock Task #{response.taskId}</div>}
          </div>

          {/* Workflow Next Steps */}
          <div className="border border-slate-200 bg-slate-50 p-4 border-l-4 border-l-[#C9AB4C]">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#003366] flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 bg-[#C9AB4C]" />
              Automated Next Step in Workflow
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Team Leader has been notified in ClickUp for review. Once approved, the request will be automatically routed to the Finance Officer for payment disbursement.
            </p>
          </div>

          {/* Actions grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pdfBlob && (
              <button
                type="button"
                onClick={handleDownload}
                className="edgy-btn-primary py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#C9AB4C]" />
                <span>Download PDF</span>
              </button>
            )}

            <a
              href={`/?view=forms&tab=track&id=${response.taskId}`}
              className="py-2.5 px-3 text-xs font-bold bg-[#003366] text-white hover:bg-[#002244] flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>📦 Track Status</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="edgy-btn-outline py-2.5 px-3 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="edgy-btn-primary px-6 py-2 text-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
