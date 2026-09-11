"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Paperclip,
  ExternalLink,
  Search,
  Building2,
  Loader2,
  AlertCircle,
  Eye,
  Check,
  Send,
} from "lucide-react";
import confetti from "canvas-confetti";
import { TrackedRfp } from "@/types/forms/tracked";
import { DEPARTMENT_NAMES } from "@/types/forms/rfp";

const DEPARTMENTS = ["All Departments", ...DEPARTMENT_NAMES];

function ApprovalsContent() {
  const searchParams = useSearchParams();
  const directTaskId = searchParams.get("taskId") || "";

  const [searchQuery, setSearchQuery] = useState(directTaskId);
  const [selectedDept, setSelectedDept] = useState("All Departments");
  const [requests, setRequests] = useState<TrackedRfp[]>([]);
  const [approvalTab, setApprovalTab] = useState<"pending" | "approved">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<TrackedRfp | null>(null);

  // Approval modal states
  const [approverName, setApproverName] = useState("Team Leader");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [isApproving, setIsApproving] = useState(false);

  // Revision modal states
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [revisionReason, setRevisionReason] = useState("");
  const [isSubmittingRevision, setIsSubmittingRevision] = useState(false);

  // Active preview tab for documents
  const [activeDocTab, setActiveDocTab] = useState<"form" | "quote">("form");

  const [actionSuccessMessage, setActionSuccessMessage] = useState("");

  const fetchPendingRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("query", searchQuery.trim());
      if (selectedDept !== "All Departments") params.append("dept", selectedDept);

      const res = await fetch(`/api/rfp/track?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        const all: TrackedRfp[] = data.requests || [];
        // Filter for requests that are in the "for approval" stage
        const pending = all.filter(
          (r) => r.currentStage === "submitted" || r.currentStage === "revision_requested"
        );
        const approved = all.filter((r) => !pending.some((item) => item.taskId === r.taskId));
        const visible = approvalTab === "pending" ? pending : approved;
        setRequests(all);

        // If directTaskId provided in URL, auto-select it
        if (directTaskId) {
          const direct = all.find((r) => r.taskId === directTaskId);
          if (direct) setActiveRequest(direct);
          else if (visible.length > 0) setActiveRequest(visible[0]);
        } else if (visible.length > 0 && !activeRequest) {
          setActiveRequest(visible[0]);
        }
      }
    } catch (err) {
      console.error("Error loading pending approvals:", err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedDept, directTaskId, activeRequest, approvalTab]);

  const pendingRequests = requests.filter((r) => r.currentStage === "submitted" || r.currentStage === "revision_requested");
  const approvedRequests = requests.filter((r) => !pendingRequests.some((item) => item.taskId === r.taskId));
  const visibleRequests = approvalTab === "pending" ? pendingRequests : approvedRequests;

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleApprove = async () => {
    if (!activeRequest) return;
    setIsApproving(true);
    try {
      const res = await fetch("/api/rfp/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeRequest.taskId,
          action: "approve",
          approverName,
          notes: approvalNotes,
          stageIndex: activeRequest.stageIndex,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to approve request");
      }

      // Celebrate!
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setActionSuccessMessage(`✅ Endorsed #${activeRequest.taskId}! Advanced to Finance Verification.`);

      // Refresh list
      setTimeout(() => {
        fetchPendingRequests();
        setActiveRequest(null);
      }, 1500);
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest || !revisionReason.trim()) return;
    setIsSubmittingRevision(true);
    try {
      const res = await fetch("/api/rfp/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: activeRequest.taskId,
          action: "reject",
          approverName,
          revisionReason,
          stageIndex: activeRequest.stageIndex,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit revision request");
      }

      setIsRevisionModalOpen(false);
      setRevisionReason("");
      setActionSuccessMessage(`⚠️ Revision requested for #${activeRequest.taskId}. Requestor has been notified.`);

      // Refresh list
      setTimeout(() => {
        fetchPendingRequests();
        setActiveRequest(null);
      }, 1500);
    } catch (err: any) {
      alert(`Revision request error: ${err.message}`);
    } finally {
      setIsSubmittingRevision(false);
    }
  };

  // Find form preview image and quotation attachment from active request
  const formPreviewAtt = activeRequest?.attachments.find(
    (a) => a.name.toLowerCase().includes("preview") || a.name.toLowerCase().endsWith(".png")
  );
  const pdfAtt = activeRequest?.attachments.find(
    (a) => a.name.toLowerCase().endsWith(".pdf")
  );
  const quoteAtt = activeRequest?.attachments.find(
    (a) =>
      !a.name.toLowerCase().includes("preview") &&
      !a.name.toLowerCase().startsWith("rfp_")
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header Banner */}
      <div className="mb-6 bg-[#FFFCFB] border border-slate-300 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#C9AB4C]" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 bg-[#003366] text-white flex items-center justify-center text-xs font-bold">
                ✓
              </span>
              <h1 className="font-serif italic font-bold text-2xl text-[#003366] tracking-tight">
                Approver Review Portal
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Zero-friction review & 1-click approvals for Team Leaders. No ClickUp accounts required.
            </p>
          </div>

          {/* Quick Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="bg-[#FFFCFB] border border-slate-300 text-xs pl-8 pr-4 h-8 font-semibold text-[#003366] focus:outline-none cursor-pointer"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {actionSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between">
            <span>{actionSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setActionSuccessMessage("")}
              className="text-emerald-600 hover:text-emerald-900"
            >
              ✕
            </button>
          </div>
        )}

        <div className="mt-4 flex gap-1 border-t border-slate-200 pt-3">
          <button type="button" onClick={() => { setApprovalTab("pending"); setActiveRequest(null); }} className={`px-3 py-2 text-xs font-bold border ${approvalTab === "pending" ? "bg-[#003366] text-white border-[#003366]" : "bg-[#FFFCFB] text-[#003366] border-slate-300"}`}>Pending ({pendingRequests.length})</button>
          <button type="button" onClick={() => { setApprovalTab("approved"); setActiveRequest(null); }} className={`px-3 py-2 text-xs font-bold border ${approvalTab === "approved" ? "bg-[#003366] text-white border-[#003366]" : "bg-[#FFFCFB] text-[#003366] border-slate-300"}`}>Approved ({approvedRequests.length})</button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-[#FFFCFB] border border-slate-200 p-12 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#003366] mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading pending requests...</p>
        </div>
      ) : visibleRequests.length === 0 ? (
        <div className="bg-[#FFFCFB] border border-slate-300 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif italic font-bold text-xl text-slate-800">All caught up!</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are currently no {approvalTab} requests in {selectedDept}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Request List */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-bold text-slate-400 px-1">
              {approvalTab === "pending" ? "Pending Approval" : "Approved Requests"} ({visibleRequests.length})
            </h2>
            <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
              {visibleRequests.map((req) => {
                const isSelected = activeRequest?.taskId === req.taskId;
                const formattedTotal = Number(req.totalAmount || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

                return (
                  <button
                    key={req.taskId}
                    type="button"
                    onClick={() => setActiveRequest(req)}
                    className={`w-full text-left p-4 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#FFFCFB] border-[#003366] shadow-md ring-1 ring-[#003366]"
                        : "bg-[#FFFCFB] border-slate-200 hover:border-slate-300 hover:bg-[#FFFCFB]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-[#003366] bg-blue-50 px-1.5 py-0.5 border border-blue-100">
                          #{req.taskId}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 bg-[#003366] text-[#C9AB4C]">
                          {req.formType ? req.formType.toUpperCase() : "RFP"}
                        </span>
                      </div>
                      {req.urgency === "urgent" && (
                        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 border border-rose-200">
                          URGENT
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs text-slate-900 truncate">{req.payee}</div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-500 text-[11px]">{req.department}</span>
                      <span className="font-bebas text-lg text-[#003366] leading-none">
                        ₱{formattedTotal}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Detailed Review & 1-Click Actions */}
          {activeRequest && (
            <div className="lg:col-span-8 bg-[#FFFCFB] border border-slate-300 shadow-sm p-6 relative">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#003366] bg-blue-50 px-2 py-0.5 border border-blue-200">
                      Task #{activeRequest.taskId}
                    </span>
                    <span className="text-xs font-bold text-slate-700 uppercase bg-[#FFFCFB] px-2 py-0.5">
                      {activeRequest.department}
                    </span>
                    {activeRequest.urgency === "urgent" && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5">
                        🚨 URGENT
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
                    {activeRequest.payee}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Requested by: <strong>{activeRequest.requestedBy}</strong> • Date Needed:{" "}
                    <strong>{activeRequest.dateNeeded || "Immediate"}</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    TOTAL PAYABLE
                  </span>
                  <span className="font-bebas text-3xl text-[#003366] tracking-wider block">
                    ₱
                    {Number(activeRequest.totalAmount || 0).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Purpose Box */}
              <div className="my-4 p-3 bg-[#FFFCFB] border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
                  BUSINESS PURPOSE
                </span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeRequest.purpose || "No stated purpose provided."}
                </p>
              </div>

              {/* Document Review Tabs */}
              <div className="my-5 border border-slate-300">
                <div className="flex items-center border-b border-slate-300 bg-[#FFFCFB]">
                  <button
                    type="button"
                    onClick={() => setActiveDocTab("form")}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeDocTab === "form"
                        ? "bg-[#FFFCFB] text-[#003366] border-b-2 border-[#003366]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Official Signed RFP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDocTab("quote")}
                    className={`px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeDocTab === "quote"
                        ? "bg-[#FFFCFB] text-[#003366] border-b-2 border-[#003366]"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>Supplier Quotation / Invoices ({quoteAtt ? "1" : "None"})</span>
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-4 bg-[#FFFCFB] max-h-[450px] overflow-y-auto flex items-center justify-center">
                  {activeDocTab === "form" ? (
                    formPreviewAtt ? (
                      <div className="text-center">
                        <img
                          src={formPreviewAtt.url}
                          alt="Official RFP Preview"
                          className="max-w-full max-h-[400px] object-contain border border-slate-300 shadow-sm mx-auto"
                        />
                        <div className="mt-2">
                          {pdfAtt && (
                            <a
                              href={pdfAtt.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-semibold text-[#003366] hover:underline inline-flex items-center gap-1"
                            >
                              <span>Open full-resolution official PDF</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-slate-400">
                        Preview generating or available directly via attached PDF.
                      </div>
                    )
                  ) : quoteAtt ? (
                    <div className="text-center w-full">
                      {quoteAtt.url.match(/\.(jpeg|jpg|png|webp)/i) ? (
                        <img
                          src={quoteAtt.url}
                          alt="Supplier Quotation"
                          className="max-w-full max-h-[400px] object-contain border border-slate-300 shadow-sm mx-auto"
                        />
                      ) : (
                        <div className="py-8">
                          <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs font-semibold text-slate-700">{quoteAtt.name}</p>
                          <a
                            href={quoteAtt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-[#003366] text-white text-xs font-semibold shadow-sm"
                          >
                            <span>Open Attachment in New Tab</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No external supplier quotation was attached to this RFP.
                    </div>
                  )}
                </div>
              </div>

              {/* Approver Name & Action Controls */}
              {approvalTab === "pending" ? <div className="pt-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4">
                  <div className="sm:col-span-6">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Approver Name / Title:
                    </label>
                    <input
                      type="text"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="e.g. Jane Doe (Marketing Head)"
                      className="w-full bg-[#FFFCFB] border border-slate-300 text-xs px-2.5 h-8 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Optional Endorsement Note:
                    </label>
                    <input
                      type="text"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g. Budget verified under Q4 promo allocation"
                      className="w-full bg-[#FFFCFB] border border-slate-300 text-xs px-2.5 h-8 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                {/* Big Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRevisionModalOpen(true)}
                    disabled={isApproving}
                    className="w-full sm:w-auto h-10 px-5 bg-[#FFFCFB] border border-amber-400 hover:bg-amber-50 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-4 h-4 text-amber-600" />
                    <span>Request Revision</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="w-full sm:w-auto h-10 px-8 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isApproving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 stroke-[3]" />
                    )}
                    <span>
                      {activeRequest.formType === "po"
                        ? "Endorse Purchase Order"
                        : activeRequest.formType === "pcv"
                        ? "Endorse Petty Cash"
                        : "Endorse Request"}
                    </span>
                  </button>
                </div>
              </div> : <div className="pt-4 border-t border-slate-200 text-xs font-semibold text-emerald-700">This request has already been endorsed and is now in the approved history.</div>}
            </div>
          )}
        </div>
      )}

      {/* Revision Modal */}
      {isRevisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFCFB] border-2 border-amber-500 shadow-2xl max-w-md w-full p-6 relative">
            <h3 className="font-serif italic font-bold text-lg text-amber-900">
              Request Revision on RFP #{activeRequest?.taskId}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Specify what the requestor needs to adjust (e.g. missing BIR 2307, wrong unit price, expired quotation).
              An Outlook email notification with an edit link will be dispatched to them automatically.
            </p>

            <textarea
              rows={4}
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              placeholder="Enter specific revision instructions for the requestor..."
              className="w-full mt-3 p-2.5 bg-[#FFFCFB] border border-slate-300 text-xs focus:outline-none focus:border-amber-500"
            />

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRevisionModalOpen(false)}
                disabled={isSubmittingRevision}
                className="h-8 px-3 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isSubmittingRevision || !revisionReason.trim()}
                className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isSubmittingRevision ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send Revision Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12 text-center text-xs font-semibold text-slate-500">
          Loading Approvals Portal...
        </div>
      }
    >
      <ApprovalsContent />
    </Suspense>
  );
}
