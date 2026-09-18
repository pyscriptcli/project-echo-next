"use client";

import React from "react";
import { Download, Expand, FileCheck2, Lock, Mic2, Upload } from "lucide-react";

export type Stage = "Input" | "Review";

interface StepperProps {
  currentStage: Stage;
  onStageChange: (stage: Stage) => void;
  isReviewAllowed?: boolean;
  onUpload?: () => void;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onSaveExport?: () => void;
  canUpload?: boolean;
}

export function Stepper({ 
  currentStage, 
  onStageChange,
  isReviewAllowed = false,
  onUpload,
  onToggleFullscreen,
  isFullscreen = false,
  onSaveExport,
  canUpload = true,
}: StepperProps) {
  const stages: { name: Stage; label: string; allowed: boolean }[] = [
    { name: "Input", label: "Meeting Workspace", allowed: true },
    { name: "Review", label: "Discussion Review", allowed: isReviewAllowed },
  ];
  
  return (
    <nav className="sticky top-0 z-20 flex w-full items-center justify-between shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 select-none shadow-2xs" aria-label="Notetaker views">
      <div className="flex items-stretch">
      {stages.map((stageItem, idx) => {
        const isActive = currentStage === stageItem.name;
        const isClickable = stageItem.allowed;

        return (
          <button
            key={stageItem.name}
            type="button"
            disabled={!isClickable}
            onClick={() => {
              if (isClickable) {
                onStageChange(stageItem.name);
              }
            }}
            aria-current={isActive ? "page" : undefined}
            className={`group relative flex min-w-[210px] items-center gap-2.5 px-4 py-2.5 text-left transition-colors ${isActive ? "bg-[#003366]/[0.04] text-[#003366]" : isClickable ? "text-slate-500 hover:bg-slate-50 hover:text-[#003366]" : "cursor-not-allowed text-slate-300"}`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center border ${isActive ? "border-[#003366] bg-[#003366] text-[#C9A84C]" : "border-slate-200 bg-white"}`}>
              {stageItem.name === "Input" ? <Mic2 size={15} /> : <FileCheck2 size={15} />}
            </div>
            <span className="min-w-0">
              <span className="flex items-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-[0.1em]">{stageItem.label}{!isClickable && <Lock size={11} />}</span>
            </span>
            {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#C9A84C]" />}
          </button>
        );
      })}
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-3 py-1.5">
        {onUpload && canUpload && (
          <button
            type="button"
            onClick={onUpload}
            className="inline-flex items-center gap-1.5 border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#003366] hover:border-[#C9A84C] transition-colors"
            title="Upload recording or transcript"
          >
            <Upload size={13} />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="inline-flex h-8 w-8 items-center justify-center border border-slate-200 bg-white text-[#003366] hover:border-[#C9A84C] transition-colors"
            title={isFullscreen ? "Exit fullscreen" : "Focus workspace"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Focus workspace"}
          >
            <Expand size={14} />
          </button>
        )}
        {onSaveExport && (
          <button
            type="button"
            disabled={!isReviewAllowed}
            onClick={onSaveExport}
            className="inline-flex items-center gap-1.5 bg-[#003366] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-[#002244] border border-[#003366] transition-all shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed rounded-none"
            title={isReviewAllowed ? "Save to ClickUp or Export Word/PDF" : "Complete recording or synthesize minutes first"}
          >
            <Download size={13} className="text-[#C9A84C]" />
            <span>Save & Export</span>
          </button>
        )}
      </div>
    </nav>
  );
}
