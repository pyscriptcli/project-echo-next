"use client";

import React from "react";
import { Check, Lock } from "lucide-react";

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
  const stages: { name: Stage; label: string; allowed: boolean }[] = [
    { name: "Input", label: "1. Meeting Source & Details", allowed: true },
    { name: "Review", label: "2. Discussion Review", allowed: isReviewAllowed },
  ];
  
  return (
    <div className="w-full bg-transparent border-b border-gray-200/80 pb-3 mb-6 flex items-center gap-3 sm:gap-6 overflow-x-auto select-none">
      {stages.map((stageItem, idx) => {
        const isActive = currentStage === stageItem.name;
        const isClickable = stageItem.allowed;
        const isCompleted = idx === 0 && isReviewAllowed;

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
            className={`flex items-center gap-2.5 py-2 px-3.5 rounded-none text-xs tracking-widest uppercase transition-all shrink-0 ${
              isActive 
                ? "bg-[#e8edf2] text-[#003366] font-bold" 
                : isCompleted
                  ? "bg-transparent text-gray-700 hover:text-[#003366] font-semibold cursor-pointer"
                  : isClickable 
                    ? "bg-transparent text-gray-600 hover:text-[#003366] font-semibold cursor-pointer" 
                    : "bg-transparent text-gray-400 cursor-not-allowed opacity-60 font-medium"
            }`}
          >
            {/* Square Indicator Badge (Navy solid check for active, green outline check for completed, gray outline number for pending) */}
            <div className={`w-5 h-5 rounded-none flex items-center justify-center shrink-0 text-xs ${
              isActive 
                ? "bg-[#003366] text-white" 
                : isCompleted
                  ? "border border-emerald-600 text-emerald-600 bg-[#FFFCFB]"
                  : isClickable
                    ? "border border-gray-400 text-gray-600 bg-[#FFFCFB] text-[11px] font-mono"
                    : "border border-gray-300 text-gray-400 bg-[#FFFCFB] text-[11px] font-mono"
            }`}>
              {isActive ? (
                <Check size={12} strokeWidth={3} />
              ) : isCompleted ? (
                <Check size={12} strokeWidth={2.5} />
              ) : (
                idx + 1
              )}
            </div>

            <span className="whitespace-nowrap font-sans">{stageItem.label}</span>
            {!isClickable && <Lock size={11} className="text-gray-400 shrink-0 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}
