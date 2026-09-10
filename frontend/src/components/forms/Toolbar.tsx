"use client";

import React from "react";
import {
  FileDown,
  RotateCcw,
  Send,
  Loader2,
  AlertCircle,
  FileText,
  ChevronDown,
} from "lucide-react";

interface ToolbarProps {
  onPreviewPdf: () => void;
  onReset: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isGeneratingPdf: boolean;
  isRevision: boolean;
  taskId?: string;
  totalAmount: number;
  selectedForm?: string;
  onSelectForm?: (formKey: string) => void;
  onPreFillDemo?: () => void;
}

export function Toolbar({
  onPreviewPdf,
  onReset,
  onSubmit,
  isSubmitting,
  isGeneratingPdf,
  isRevision,
  taskId,
  totalAmount,
  selectedForm = "rfp",
  onSelectForm,
  onPreFillDemo,
}: ToolbarProps) {
  return (
    <div className="w-full max-w-[850px] mx-auto sticky top-3 z-40 mb-4 bg-white border border-slate-300 shadow-sm px-4 py-2.5 flex items-center justify-between gap-3 relative">
      {/* Top Gold Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#C9AB4C]" />

      {/* Left: Form Selector occupying expanded space */}
      <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
        <div className="relative flex items-center w-full max-w-[300px] sm:max-w-[340px]">
          <FileText className="w-3.5 h-3.5 text-[#003366] absolute left-2.5 pointer-events-none" />
          <select
            id="active-form-selector"
            value={selectedForm}
            onChange={(e) => onSelectForm?.(e.target.value)}
            className="w-full appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-slate-400 text-[#003366] text-xs font-bold rounded-none pl-8 pr-7 h-8 focus:outline-none focus:ring-1 focus:ring-[#003366] cursor-pointer transition-colors"
            title="Select form type"
          >
            <option value="rfp">Request for Payment (RFP)</option>
            <option value="po">Purchase Order (PO)</option>
            <option value="pcv">Petty Cash Voucher (PCV)</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
        </div>

        {/* Revision badge */}
        {isRevision && (
          <span className="inline-flex items-center gap-1 px-2 h-8 bg-amber-50 border border-amber-300 text-amber-900 text-[11px] font-bold shrink-0">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Task #{taskId}</span>
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onPreviewPdf}
          disabled={isGeneratingPdf}
          className="h-8 px-3 text-xs font-semibold flex items-center gap-1.5 border border-slate-300 hover:border-slate-400 text-[#003366] hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#003366]" />
          ) : (
            <FileDown className="w-3.5 h-3.5 text-[#003366]" />
          )}
          <span>Download PDF</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="h-8 px-2.5 text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
          title="Reset form"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>

        <button
          id="submit-to-clickup-btn"
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || isGeneratingPdf}
          className="h-8 px-4 text-xs font-bold text-white bg-[#003366] hover:bg-[#002244] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9AB4C]" />
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5 text-[#C9AB4C]" />
              <span>{isRevision ? "Update Task" : "Submit to ClickUp"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
