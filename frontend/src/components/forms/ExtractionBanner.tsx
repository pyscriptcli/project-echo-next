"use client";

import React from "react";
import { CheckCircle2, RotateCcw, X } from "lucide-react";

interface ExtractionBannerProps {
  vendorName: string;
  itemsCount: number;
  totalAmount: number;
  onUndo: () => void;
  onDismiss: () => void;
}

export function ExtractionBanner({
  vendorName,
  itemsCount,
  totalAmount,
  onUndo,
  onDismiss,
}: ExtractionBannerProps) {
  const formattedTotal = Number(totalAmount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full max-w-[850px] mx-auto mb-4 bg-gradient-to-r from-[#003366] to-[#0C0C0E] text-white p-3.5 border-l-4 border-[#C9AB4C] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-[#C9AB4C] shrink-0" />
        <div className="text-xs">
          <span className="font-semibold">Quotation Auto-Fill Applied:</span>{" "}
          <span>
            Loaded <strong className="text-[#C9AB4C]">{itemsCount} line items</strong> from{" "}
            <strong className="text-white">{vendorName || "Vendor"}</strong>
          </span>
          <span className="ml-2 font-bebas text-sm text-[#C9AB4C] tracking-wide">
            (₱{formattedTotal})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onUndo}
          className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#C9AB4C] hover:text-white border border-[#C9AB4C]/50 hover:border-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Undo</span>
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
