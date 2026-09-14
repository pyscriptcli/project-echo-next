"use client";

import React from "react";
import { FileCheck2, Lock, Mic2 } from "lucide-react";

export type Stage = "Input" | "Review";

interface StepperProps {
  currentStage: Stage;
  onStageChange: (stage: Stage) => void;
  isReviewAllowed?: boolean;
}

export function Stepper({ 
  currentStage, 
  onStageChange,
  isReviewAllowed = false
}: StepperProps) {
  const stages: { name: Stage; label: string; description: string; allowed: boolean }[] = [
    { name: "Input", label: "Meeting Workspace", description: "Record, annotate, and ask Echo", allowed: true },
    { name: "Review", label: "Discussion Review", description: "Refine minutes and action items", allowed: isReviewAllowed },
  ];
  
  return (
    <nav className="flex w-full items-stretch overflow-x-auto border-b border-slate-200 bg-white select-none" aria-label="Notetaker views">
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
            className={`group relative flex min-w-[230px] items-center gap-3 px-5 py-3.5 text-left transition-colors ${isActive ? "bg-[#003366]/[0.04] text-[#003366]" : isClickable ? "text-slate-500 hover:bg-slate-50 hover:text-[#003366]" : "cursor-not-allowed text-slate-300"}`}
          >
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center border ${isActive ? "border-[#003366] bg-[#003366] text-[#C9A84C]" : "border-slate-200 bg-white"}`}>
              {stageItem.name === "Input" ? <Mic2 size={17} /> : <FileCheck2 size={17} />}
            </div>
            <span className="min-w-0">
              <span className="flex items-center gap-2 whitespace-nowrap text-xs font-bold uppercase tracking-[0.12em]">{stageItem.label}{!isClickable && <Lock size={11} />}</span>
              <span className="mt-0.5 block whitespace-nowrap text-[10px] font-normal tracking-normal text-slate-400">{stageItem.description}</span>
            </span>
            {isActive && <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[#C9A84C]" />}
          </button>
        );
      })}
    </nav>
  );
}
