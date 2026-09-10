"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { 
  Sparkles, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  FileText, 
  PackageSearch, 
  ShieldCheck, 
  Workflow,
  HelpCircle,
  Play
} from "lucide-react";

interface PrototypeTourModalProps {
  onPreFillDemo?: () => void;
}

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  tip: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "active-form-selector",
    title: "1. Pick Your Form",
    description: "Choose the form you need. You can switch anytime between Request for Payment (RFP), Purchase Order (PO), or Petty Cash Voucher (PCV).",
    tip: "Tip: All three forms connect to the same 6-stage tracking pipeline.",
  },
  {
    targetId: "quotation-dropzone-section",
    title: "2. Fast Fill or AI Auto-Fill",
    description: "Drop a vendor quotation PDF here to let Gemini AI read the items and prices automatically. Or click 'Pre-fill Demo' to load sample data in 1 click.",
    tip: "Tip: You can also edit any table cell manually.",
  },
  {
    targetId: "rfp-sheet-container",
    title: "3. Choose Department & Sign",
    description: "Select your department (like ISD or Brokerage). Then click the signature box at the bottom to sign directly with your mouse or finger.",
    tip: "Tip: Live math calculates totals and tax automatically.",
  },
  {
    targetId: "submit-to-clickup-btn",
    title: "4. Submit Directly to ClickUp",
    description: "Click Submit to ClickUp. The portal compiles a signed PDF, attaches your documents, and sends the task straight to the ClickUp workspace.",
    tip: "Tip: A 4-stage loading screen shows upload progress.",
  },
  {
    targetId: "portal-nav-track-links",
    title: "5. Real-Time Tracking & Approvals",
    description: "Use the top header to navigate the entire workflow: go to 'Track Status' to follow the 6 stages in real-time, or go to 'Approvals' for 1-click approvals.",
    tip: "Tip: Check the 'Workflow' tab to view the official process map.",
  },
];

export function PrototypeTourModal({ onPreFillDemo }: PrototypeTourModalProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [isOpenDrawer, setIsOpenDrawer] = useState(false);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);

  const handleTriggerPreFill = () => {
    if (onPreFillDemo) {
      onPreFillDemo();
    } else if (pathname === "/") {
      window.dispatchEvent(new CustomEvent("prefill-demo"));
    } else {
      router.push("/?prefill=true");
    }
  };

  const handleTriggerTour = () => {
    if (pathname === "/") {
      setIsTourActive(true);
      setCurrentStepIndex(0);
    } else {
      router.push("/?tour=true");
    }
  };

  // Check first visit
  useEffect(() => {
    const seen = localStorage.getItem("prime_forms_tour_seen_v1");
    if (!seen) {
      setShowWelcomeBanner(true);
    }

    const handleOpenTour = () => {
      setIsTourActive(true);
      setCurrentStepIndex(0);
      setIsOpenDrawer(false);
    };

    const handleOpenDrawer = () => {
      setIsOpenDrawer(true);
      setIsTourActive(false);
    };

    window.addEventListener("open-prototype-tour", handleOpenTour);
    window.addEventListener("open-prototype-drawer", handleOpenDrawer);

    return () => {
      window.removeEventListener("open-prototype-tour", handleOpenTour);
      window.removeEventListener("open-prototype-drawer", handleOpenDrawer);
    };
  }, []);

  const handleStartTour = () => {
    localStorage.setItem("prime_forms_tour_seen_v1", "true");
    setShowWelcomeBanner(false);
    setIsTourActive(true);
    setCurrentStepIndex(0);
  };

  const handleDismissWelcome = () => {
    localStorage.setItem("prime_forms_tour_seen_v1", "true");
    setShowWelcomeBanner(false);
  };

  const handleNextStep = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      setIsTourActive(false);
      setIsOpenDrawer(true); // Open drawer at end of tour for next steps
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleEndTour = () => {
    setIsTourActive(false);
  };

  const step = TOUR_STEPS[currentStepIndex];

  return (
    <>
      {/* 1. Welcome Banner for First-Time Visitors */}
      {showWelcomeBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#181A1D] text-white border border-[#C9AB4C] rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C9AB4C]/20 border border-[#C9AB4C]/40 flex items-center justify-center shrink-0 text-[#C9AB4C]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C9AB4C]">
                  Portal Guide
                </span>
                <button
                  onClick={handleDismissWelcome}
                  className="text-slate-400 hover:text-white"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">
                Welcome to the Forms Portal!
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Want a quick 1-minute guided tour of how to fill, sign, submit, and track forms?
              </p>

              <div className="flex items-center gap-2 mt-3.5">
                <button
                  onClick={handleStartTour}
                  className="px-3 py-1.5 bg-[#C9AB4C] hover:bg-[#b5993f] text-[#181A1D] text-xs font-bold rounded flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-[#181A1D]" />
                  <span>Start Quick Tour</span>
                </button>
                <button
                  onClick={() => {
                    handleDismissWelcome();
                    handleTriggerPreFill();
                  }}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded transition-colors"
                >
                  ⚡ Fill Sample Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Interactive Spotlight Tour Overlay */}
      {isTourActive && (
        <div className="fixed inset-0 z-50 pointer-events-auto flex flex-col justify-end sm:justify-center items-center p-4 bg-black/60 backdrop-blur-[2px]">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Top Bar */}
            <div className="bg-[#181A1D] text-white px-5 py-3 flex items-center justify-between border-b border-[#C9AB4C]/40">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C9AB4C] animate-pulse" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Portal Walkthrough ({currentStepIndex + 1} of {TOUR_STEPS.length})
                </span>
              </div>
              <button
                onClick={handleEndTour}
                className="text-slate-400 hover:text-white transition-colors"
                title="Exit Tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>{step.title}</span>
              </h4>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                {step.description}
              </p>

              <div className="mt-3.5 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>{step.tip}</span>
              </div>

              {/* Progress Dots */}
              <div className="flex items-center justify-center gap-1.5 mt-5">
                {TOUR_STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStepIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === currentStepIndex
                        ? "w-6 bg-[#003366]"
                        : "w-2 bg-slate-200 hover:bg-slate-300"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Footer Controls */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={handleEndTour}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Skip Tour
              </button>

              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    onClick={handlePrevStep}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 flex items-center gap-1 shadow-2xs"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                )}

                <button
                  onClick={handleNextStep}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-[#002244] rounded flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <span>{currentStepIndex === TOUR_STEPS.length - 1 ? "Finish & Open Guide" : "Next"}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Floating "User Guide" Trigger Button (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={() => setIsOpenDrawer(true)}
          className="group flex items-center gap-2 px-3.5 py-2.5 bg-[#181A1D] hover:bg-black text-white rounded-full shadow-lg border border-[#C9AB4C]/50 hover:border-[#C9AB4C] transition-all hover:scale-105 active:scale-95"
          title="Open Portal Guide & Walkthrough"
        >
          <div className="w-5 h-5 rounded-full bg-[#C9AB4C] text-[#181A1D] flex items-center justify-center font-bold text-xs">
            ✨
          </div>
          <span className="text-xs font-bold tracking-wide pr-1">
            User Guide
          </span>
        </button>
      </div>

      {/* 4. Dedicated Slide-Over Drawer: Multi-Role Workflow Guide */}
      {isOpenDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[1px] animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-300 animate-in slide-in-from-right duration-200">
            
            {/* Drawer Header */}
            <div className="bg-[#181A1D] text-white p-5 border-b border-[#C9AB4C]/40 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#C9AB4C]/20 text-[#C9AB4C] border border-[#C9AB4C]/30 text-[10px] font-bold uppercase tracking-wider">
                    Quick Reference Guide
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  Portal Walkthrough Guide
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  How to use all 4 roles across the workflow
                </p>
              </div>
              <button
                onClick={() => setIsOpenDrawer(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Demo Pre-Fill Box */}
            <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Fill Sample Request in 5 Seconds</span>
                </div>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Fills vendor, 3 laptop items, and dummy invoice automatically.
                </p>
              </div>
              <button
                onClick={() => {
                  handleTriggerPreFill();
                  setIsOpenDrawer(false);
                }}
                className="px-3 py-1.5 bg-[#C9AB4C] hover:bg-[#b5993f] text-[#181A1D] font-bold text-xs rounded shadow-xs whitespace-nowrap"
              >
                ⚡ Fill Sample
              </button>
            </div>

            {/* Role-by-Role Guided Workflow Journey */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Follow This 4-Step Workflow Journey:
              </div>

              {/* Step 1: Requestor */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center">1</span>
                    Role: Requestor
                  </span>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">You are here</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fill the RFP form (or click <strong>⚡ Fill Sample</strong>), sign the signature box, and click <strong>Submit to ClickUp</strong>.
                </p>
              </div>

              {/* Step 2: Approver (TL) */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center">2</span>
                    Role: Department Approver (TL)
                  </span>
                  <Link
                    href="/?view=forms&tab=approvals"
                    onClick={() => setIsOpenDrawer(false)}
                    className="text-[10px] font-bold text-[#003366] hover:underline flex items-center gap-0.5"
                  >
                    Open Page ➔
                  </Link>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Go to <strong>Approvals</strong> in the header to review pending requests and execute 1-click <strong>Approve</strong> or <strong>Request Revision</strong> with feedback remarks.
                </p>
              </div>

              {/* Step 3: Finance & Live Tracker */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center">3</span>
                    Role: Finance &amp; Tracker
                  </span>
                  <Link
                    href="/?view=forms&tab=track"
                    onClick={() => setIsOpenDrawer(false)}
                    className="text-[10px] font-bold text-[#003366] hover:underline flex items-center gap-0.5"
                  >
                    Open Page ➔
                  </Link>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Go to <strong>Track Status</strong> to watch the 6-stage tracker advance in real time as tasks are processed.
                </p>
              </div>

              {/* Step 4: Official Process Workflow */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-white space-y-2 hover:border-slate-300 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-black flex items-center justify-center">4</span>
                    Process Workflow SOP
                  </span>
                  <Link
                    href="/?view=forms&tab=workflow"
                    onClick={() => setIsOpenDrawer(false)}
                    className="text-[10px] font-bold text-[#003366] hover:underline flex items-center gap-0.5"
                  >
                    Open Page ➔
                  </Link>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  View the 5-column flowchart with platform badges and download the single-page official PDF.
                </p>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-2">
              <button
                onClick={() => {
                  setIsOpenDrawer(false);
                  handleTriggerTour();
                }}
                className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-slate-700" />
                <span>Replay Step-by-Step Tour</span>
              </button>

              <button
                onClick={() => setIsOpenDrawer(false)}
                className="w-full py-2 bg-[#181A1D] hover:bg-black text-white text-xs font-bold rounded transition-colors"
              >
                Close Guide
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
