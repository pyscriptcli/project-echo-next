"use client";

import React from "react";
import Link from "next/link";
import { 
  FileDown, 
  Printer, 
  ArrowLeft, 
  ExternalLink, 
  Check, 
  RotateCcw,
  Layers,
  Sparkles
} from "lucide-react";

export default function WorkflowPage() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16">
      {/* Action Bar / Subheader */}
      <div className="bg-white border-b border-slate-200 sticky top-14 z-40 shadow-xs">
        <div className="max-w-[1520px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/?view=forms&tab=create"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </Link>
            <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-none">
                Forms Processing &amp; Request Workflow
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                5-Column Cross-Functional Swimlane Standard Operating Procedure
              </p>
            </div>
          </div>

          {/* Action Buttons & Platform Legend */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Platform Legend Chips */}
            <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-bold bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              <span className="text-slate-400 uppercase text-[9px] mr-0.5">Platforms:</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200">Forms Portal</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">ClickUp</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 border border-orange-200">Zoho</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">UnionBank</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 border border-slate-300">Manual</span>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-xs transition-colors"
              title="Print Workflow Chart"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Download PDF Button */}
            <a
              href="/forms/PRIME-Forms-Portal-Optimized-Workflow.pdf"
              download="PRIME-Forms-Portal-Optimized-Workflow.pdf"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#181A1D] hover:bg-black rounded-md shadow-sm transition-all border border-amber-500/40"
              title="Download single-page vector PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-400" />
              <span>Download PDF</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="max-w-[1520px] mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Card Header */}
          <div className="bg-[#181A1D] text-white px-6 py-3.5 border-b border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-xs text-slate-200 tracking-wide">
                Optimized Standard Operating Procedure Flowchart
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Unified Workflow Architecture
            </span>
          </div>

          {/* 5-Column Swimlane Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[1240px] grid grid-cols-5 divide-x divide-slate-200 p-1">

              {/* COLUMN 1: REQUESTOR */}
              <div className="bg-white p-3 flex flex-col items-center">
                <div className="w-full pb-2.5 border-b-2 border-blue-800 text-center mb-3">
                  <h2 className="text-sm font-bold text-blue-900 tracking-tight">Requestor</h2>
                  <span className="text-[10px] text-slate-500 italic">Initiator</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0">
                  {/* Step 1 */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal
                    </span>
                    <div className="font-semibold text-xs text-slate-800">Open Forms Portal</div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Step 2 */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal
                    </span>
                    <div className="text-[11px] font-medium text-slate-800">Select Form Template</div>
                    <div className="text-[9.5px] text-slate-500">RFP (Payment), PO, or PCV</div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Step 3: Direct Fill with Auto Fill */}
                  <div className="w-full bg-emerald-50/80 border-[1.5px] border-emerald-600 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal (Auto-Fill)
                    </span>
                    <div className="text-[11px] font-bold text-emerald-950">Directly fill up forms in the portal</div>
                    <div className="text-[9.5px] text-emerald-800 leading-tight mt-0.5">
                      No excel download, filling form, export pdf, fill up the click up form again with auto fill up function
                    </div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Step 4: Attachments */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal
                    </span>
                    <div className="text-[11px] font-bold text-slate-900">Upload attachments</div>
                    <div className="text-[9.5px] text-slate-500">Vendor quotation, invoice, receipt, or SOA</div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Step 5: Submit */}
                  <div className="w-full bg-blue-600 border-[1.5px] border-blue-700 rounded-md p-2.5 text-center text-white shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-900/80 text-white border border-blue-400 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal ➔ ClickUp
                    </span>
                    <div className="text-xs font-bold">Submit request via portal to ClickUp</div>
                    <div className="text-[9.5px] text-white font-semibold mt-1 bg-blue-800 px-2 py-0.5 rounded inline-block">
                      Auto-generates PDF &amp; uploads supporting attachments
                    </div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Hand-off Pill */}
                  <div className="w-full bg-blue-50 border border-dashed border-blue-300 rounded-md p-1.5 text-center my-1 text-[10px] text-blue-800 font-medium">
                    <span className="px-1 py-0.2 rounded bg-purple-100 text-purple-700 text-[8px] font-bold uppercase mr-1">
                      ClickUp
                    </span>
                    <span>Routes to Dept Head for review ➔</span>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  {/* Step 6: 6-Stage Tracking */}
                  <div className="w-full bg-slate-50 border border-slate-300 rounded-md p-2 text-left shadow-xs">
                    <div className="text-center mb-1">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider">
                        Forms Portal (/track)
                      </span>
                    </div>
                    <div className="text-[10.5px] font-bold text-slate-900 text-center mb-0.5">
                      Live 6-Stage Tracking at <code className="text-blue-700 font-bold">/track</code>
                    </div>
                    <div className="text-[9px] text-slate-500 text-center mb-1.5">Real-time status without messaging Finance</div>
                    
                    <div className="space-y-1 pt-1 border-t border-slate-200 text-[9px]">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[8px]">1</span>
                        <span><strong>Submitted</strong> (Pending Endorsement)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[8px]">2</span>
                        <span><strong>Endorsed</strong> (TL Approved)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[8px]">3</span>
                        <span><strong>Finance Verification</strong> (Zoho)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[8px]">4</span>
                        <span><strong>Disbursement Prep</strong> (UB / Check)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[8px]">5</span>
                        <span><strong>Executive Sign-Off</strong> (CFO / CEO)</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[8px]">6</span>
                        <span><strong>Completed</strong> (Payment Released)</span>
                      </div>
                    </div>
                  </div>

                  {/* Revision Loop */}
                  <div className="mt-2 w-full p-2 rounded-md border border-red-300 bg-red-50 text-[9.5px] text-red-800">
                    <span className="inline-block px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[8px] font-bold uppercase mb-0.5">
                      Email Alert + Portal
                    </span>
                    <div className="font-bold flex items-center gap-1">
                      <RotateCcw className="w-2.5 h-2.5 text-red-600" />
                      <span>If Revision Requested:</span>
                    </div>
                    <p className="text-slate-600 text-[8.5px] mt-0.5 leading-tight">
                      Update form &amp; resubmit in 1 click.
                    </p>
                  </div>

                </div>
              </div>

              {/* COLUMN 2: APPROVER - TL */}
              <div className="bg-white p-3 flex flex-col items-center">
                <div className="w-full pb-2.5 border-b-2 border-blue-800 text-center mb-3">
                  <h2 className="text-sm font-bold text-blue-900 tracking-tight">Approver - TL</h2>
                  <span className="text-[10px] text-slate-500 italic">Department Head</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0">
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal (/approvals)
                    </span>
                    <div className="text-[11px] font-semibold text-slate-800">Access /approvals Portal</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Or open notification in ClickUp / email</div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-slate-50 border-[1.5px] border-blue-700 rounded-md p-2 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[8.5px] font-bold uppercase tracking-wider mb-1">
                      Forms Portal
                    </span>
                    <div className="text-[11px] font-bold text-slate-900">Review form and attachments</div>
                  </div>

                  <div className="w-[1.5px] h-2 bg-blue-600 my-0.5" />

                  {/* Decision Triangle SVG */}
                  <div className="w-full flex flex-col items-center my-1">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[8px] font-bold uppercase mb-1">
                      ClickUp Decision
                    </span>
                    <svg viewBox="0 0 120 46" className="w-28 h-11">
                      <polygon points="10,4 110,4 60,42" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.8" strokeLinejoin="round" />
                      <text x="60" y="19" fontSize="9.5" fontWeight="800" fill="#92400E" textAnchor="middle" fontFamily="Inter, sans-serif">Approve</text>
                      <text x="60" y="30" fontSize="9.5" fontWeight="800" fill="#92400E" textAnchor="middle" fontFamily="Inter, sans-serif">or reject?</text>
                    </svg>
                  </div>

                  {/* Branching Grid */}
                  <div className="w-full grid grid-cols-2 gap-1.5 mt-1">
                    {/* Rejected Branch */}
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-red-50 border border-red-500 rounded p-1.5 text-center">
                        <div className="font-bold text-red-700 text-[10px]">Rejected</div>
                        <div className="text-[8.5px] text-red-900 leading-tight mt-0.5">Return for revision</div>
                      </div>
                      <div className="w-[1.5px] h-2 bg-red-600 my-0.5" />
                      <div className="w-full bg-red-50/70 border border-red-200 rounded p-1 text-center text-[8.5px] text-red-800 leading-tight">
                        <span className="font-bold block">⮌ Return</span> Logs feedback notes
                      </div>
                    </div>

                    {/* Approved Branch */}
                    <div className="flex flex-col items-center">
                      <div className="w-full bg-emerald-50 border border-emerald-500 rounded p-1.5 text-center">
                        <div className="font-bold text-emerald-700 text-[10px]">Approved</div>
                        <div className="text-[8.5px] text-emerald-900 leading-tight mt-0.5">Endorse request</div>
                      </div>
                      <div className="w-[1.5px] h-2 bg-emerald-600 my-0.5" />
                      
                      {/* Check Box 1 Badge */}
                      <div className="w-full inline-flex items-center justify-center gap-1 bg-[#0F172A] text-[#38BDF8] border border-[#0284C7] rounded px-1.5 py-1 text-[8.5px] font-bold text-center">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">✓</span>
                        <span>Box 1: Endorsed</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-[1.5px] h-2.5 bg-emerald-600 my-0.5" />

                  <div className="w-full bg-emerald-50 border border-emerald-500 rounded-md p-1.5 text-center">
                    <span className="inline-block px-1 py-0.2 rounded bg-purple-100 text-purple-700 text-[8px] font-bold uppercase mb-0.5">
                      ClickUp Workflow
                    </span>
                    <div className="text-[10px] font-semibold text-emerald-900">Route approved form to Finance</div>
                    <div className="text-[8.5px] text-emerald-700">Advances to <strong>Finance Verification</strong></div>
                  </div>

                  <div className="w-full bg-emerald-50 border border-dashed border-emerald-300 rounded-md p-1.5 text-center my-1.5 text-[9.5px] text-emerald-800 font-medium">
                    <span>Route to Finance / Accounting ➔</span>
                  </div>

                </div>
              </div>

              {/* COLUMN 3: FINANCE / ACCOUNTING */}
              <div className="bg-white p-3 flex flex-col items-center">
                <div className="w-full pb-2.5 border-b-2 border-blue-800 text-center mb-3">
                  <h2 className="text-sm font-bold text-blue-900 tracking-tight">Finance / Accounting</h2>
                  <span className="text-[10px] text-slate-500 italic">Disbursement &amp; Audit</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0">
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200 text-[8px] font-bold uppercase mb-0.5">
                      ClickUp Task
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Review RFP &amp; supporting docs</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  {/* Step: Encode Zoho + Check Box 2 */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs flex flex-col items-center">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 border border-orange-200 text-[8px] font-bold uppercase mb-0.5">
                      Zoho Books
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Encode &amp; upload forms in Zoho</div>
                    <div className="inline-flex items-center gap-1 bg-[#0F172A] text-[#38BDF8] border border-[#0284C7] rounded px-1.5 py-0.5 text-[8.5px] font-bold mt-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">✓</span>
                      <span>Check Box 2: Finance Verification</span>
                    </div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[8px] font-bold uppercase mb-0.5">
                      Manual / Zoho
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Prepare top sheet</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  {/* Step: UB Prep + Check Box 3 */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs flex flex-col items-center">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold uppercase mb-0.5">
                      UnionBank (UB) / Manual
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Upload to UB / Prepare check</div>
                    <div className="inline-flex items-center gap-1 bg-[#0F172A] text-[#38BDF8] border border-[#0284C7] rounded px-1.5 py-0.5 text-[8.5px] font-bold mt-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">✓</span>
                      <span>Check Box 3: Disbursement Prep</span>
                    </div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-amber-50 border border-amber-300 rounded p-1 text-center text-[9px] font-bold text-amber-900">
                    <span>Route to CFO for Review &amp; Issue Check ➔</span>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 border border-orange-200 text-[8px] font-bold uppercase mb-0.5">
                      Zoho / ClickUp
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Monitor expense summary</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  {/* Step: Log check + Check Box 4 */}
                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs flex flex-col items-center">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200 text-[8px] font-bold uppercase mb-0.5">
                      ClickUp / Manual
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Log &amp; monitor check</div>
                    <div className="inline-flex items-center gap-1 bg-[#0F172A] text-[#38BDF8] border border-[#0284C7] rounded px-1.5 py-0.5 text-[8.5px] font-bold mt-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">✓</span>
                      <span>Check Box 4: Executive Sign-Off</span>
                    </div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-orange-100 text-orange-700 border border-orange-200 text-[8px] font-bold uppercase mb-0.5">
                      Zoho Books
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Record list of disbursements</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 border border-purple-200 text-[8px] font-bold uppercase mb-0.5">
                      ClickUp Task Attachment
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Scan checks / Save UB confirmation</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-blue-50/60 border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold uppercase mb-0.5">
                      UnionBank / Manual
                    </span>
                    <div className="text-[10px] font-bold text-slate-900">Release payment</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  <div className="w-full bg-white border-[1.5px] border-blue-600 rounded-md p-1.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[8px] font-bold uppercase mb-0.5">
                      Email / Outlook
                    </span>
                    <div className="text-[10px] font-semibold text-slate-800">Send proof of payment</div>
                  </div>

                  <div className="w-[1.5px] h-1.5 bg-blue-600 my-0.5" />

                  {/* Step: Final Complete + Check Box 5 */}
                  <div className="w-full bg-emerald-50/70 border border-emerald-600 rounded-md p-2 text-center shadow-xs flex flex-col items-center">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[8px] font-bold uppercase mb-0.5">
                      Physical Filing / ClickUp
                    </span>
                    <div className="text-[10px] font-bold text-slate-900">Print APV &amp; CV, File documents</div>
                    <div className="inline-flex items-center gap-1 bg-[#0F172A] text-emerald-300 border border-emerald-600 rounded px-2 py-0.5 text-[8.5px] font-bold mt-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 text-white flex items-center justify-center text-[7px] font-black">✓</span>
                      <span>Check Box 5: Completed (Task Done)</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* COLUMN 4: CFO (APPROVER) */}
              <div className="bg-white p-3 flex flex-col items-center">
                <div className="w-full pb-2.5 border-b-2 border-blue-800 text-center mb-3">
                  <h2 className="text-sm font-bold text-blue-900 tracking-tight">CFO (Approver)</h2>
                  <span className="text-[10px] text-slate-500 italic">Chief Financial Officer</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0 pt-24">
                  <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded p-1.5 text-center mb-2 text-[9px] text-slate-600 font-medium">
                    <span>Receives batch &amp; top sheet from Finance ➔</span>
                  </div>

                  <div className="w-full bg-emerald-50/60 border border-emerald-600 rounded-md p-2.5 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-bold uppercase mb-1">
                      UnionBank Portal / Manual
                    </span>
                    <div className="text-[10.5px] font-bold text-emerald-950">Review request &amp; issue check</div>
                    <div className="text-[9px] text-emerald-800 mt-0.5">Approve UnionBank batch / check voucher</div>
                  </div>

                  <div className="w-[1.5px] h-3 bg-emerald-600 my-1" />

                  <div className="w-full bg-blue-50 border border-dashed border-blue-300 rounded p-1.5 text-center text-[9px] text-blue-800 font-medium">
                    <span>Passes to CEO for sign-off ➔</span>
                  </div>
                </div>
              </div>

              {/* COLUMN 5: CEO (APPROVER) */}
              <div className="bg-white p-3 flex flex-col items-center">
                <div className="w-full pb-2.5 border-b-2 border-blue-800 text-center mb-3">
                  <h2 className="text-sm font-bold text-blue-900 tracking-tight">CEO (Approver)</h2>
                  <span className="text-[10px] text-slate-500 italic">Chief Executive Officer</span>
                </div>

                <div className="w-full flex flex-col items-center space-y-0 pt-36">
                  <div className="w-full bg-slate-50 border border-dashed border-slate-300 rounded p-1.5 text-center mb-2 text-[9px] text-slate-600 font-medium">
                    <span>Receives CFO-approved batch ➔</span>
                  </div>

                  <div className="w-full bg-emerald-50 border border-emerald-600 rounded-md p-3 text-center shadow-xs">
                    <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[8px] font-bold uppercase mb-1">
                      Manual Sign / UnionBank
                    </span>
                    <div className="text-xs font-bold text-emerald-950">Sign off on check</div>
                    <div className="text-[9px] text-emerald-800 mt-0.5 font-medium">Authorizes release of funds</div>
                  </div>

                  <div className="w-[1.5px] h-3 bg-emerald-600 my-1" />

                  <div className="w-full bg-emerald-50 border border-dashed border-emerald-400 rounded p-1.5 text-center text-[9px] text-emerald-800 font-medium">
                    <span>⮌ Returns signed checks to Finance to log &amp; release</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
