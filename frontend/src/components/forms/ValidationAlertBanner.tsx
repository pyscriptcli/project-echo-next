"use client";

import React from "react";
import { AlertTriangle, ArrowUpRight, ChevronRight, X } from "lucide-react";
import { ValidationErrorItem, scrollToFormField } from "@/lib/forms/rfpValidation";

interface ValidationAlertBannerProps {
  items: ValidationErrorItem[];
  onDismiss: () => void;
}

export function ValidationAlertBanner({ items, onDismiss }: ValidationAlertBannerProps) {
  if (!items || items.length === 0) return null;

  const handleJumpToFirst = () => {
    if (items[0]) {
      scrollToFormField(items[0].id);
    }
  };

  return (
    <div className="w-full max-w-[850px] mx-auto mb-5 bg-rose-50 border-2 border-rose-500 p-4 shadow-md relative animate-shake">
      {/* Top red accent line */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-rose-600 text-white shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-950 uppercase tracking-wider flex items-center gap-2">
              <span>Required Information Missing</span>
              <span className="bg-rose-200 text-rose-800 text-[11px] px-2 py-0.5 font-bold font-mono">
                {items.length} {items.length === 1 ? "field" : "fields"} missed
              </span>
            </h4>
            <p className="text-xs text-rose-800 mt-1">
              All official RFP fields must be completed. Click any highlighted item below to jump directly to it:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleJumpToFirst}
            className="hidden sm:flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
          >
            <span>Fix First Field</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-rose-600 hover:text-rose-900 transition-colors cursor-pointer"
            title="Dismiss warning"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Clickable missing field pill tags */}
      <div className="mt-3 pt-3 border-t border-rose-200 flex flex-wrap gap-2">
        {items.map((err, idx) => (
          <button
            key={`${err.id}-${idx}`}
            type="button"
            onClick={() => scrollToFormField(err.id)}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-rose-100 border border-rose-300 hover:border-rose-500 text-rose-900 px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all cursor-pointer group"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 group-hover:scale-125 transition-transform" />
            <span>{err.label}</span>
            <ArrowUpRight className="w-3 h-3 text-rose-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        ))}
      </div>
    </div>
  );
}
