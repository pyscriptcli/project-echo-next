"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  RfpFormData,
  RfpLineItem,
  PoFormData,
  PcvFormData,
  SubmissionResponse,
  SupportingFile,
} from "@/types/forms/rfp";
import { RfpSheet } from "@/components/forms/RfpSheet";
import { PoSheet } from "@/components/forms/PoSheet";
import { PcvSheet } from "@/components/forms/PcvSheet";
import { Toolbar } from "@/components/forms/Toolbar";
import { QuotationDropzone } from "@/components/forms/QuotationDropzone";
import { ExtractionBanner } from "@/components/forms/ExtractionBanner";
import { SupportingDocuments } from "@/components/forms/SupportingDocuments";
import { SubmissionModal } from "@/components/forms/SubmissionModal";
import ITAssetRequestForm from "@/components/forms/IT/templates/ITAssetRequestForm";
import ITHelpdeskSupportForm from "@/components/forms/IT/templates/ITHelpdeskSupportForm";
import ITBugErrorReportForm from "@/components/forms/IT/templates/ITBugErrorReportForm";
import { SubmissionLoadingModal, SubmissionStage } from "@/components/forms/SubmissionLoadingModal";
import { ValidationAlertBanner } from "@/components/forms/ValidationAlertBanner";
import { generateRfpPdf, downloadPdfBlob, generateRfpImageBlob } from "@/lib/forms/pdfGenerator";
import {
  validateRfpForm,
  validatePoForm,
  validatePcvForm,
  ValidationResult,
  ValidationErrorItem,
  scrollToFormField,
} from "@/lib/forms/rfpValidation";
import { AlertCircle, CheckCircle2, FileText, Send } from "lucide-react";
import { readJsonResponse } from "@/lib/forms/clientResponse";

const getInitialFormData = (): RfpFormData => {
  const today = new Date().toISOString().split("T")[0];
  const initialItems: RfpLineItem[] = [
    { id: "row-1", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
    { id: "row-2", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
    { id: "row-3", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
    { id: "row-4", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
    { id: "row-5", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
  ];

  return {
    date: today,
    payee: "",
    department: "",
    items: initialItems,
    totalAmount: 0,
    purpose: "",
    paymentMethod: "online",
    paymentMethods: ["online"],
    bank: "",
    accountName: "",
    accountNumber: "",
    urgency: "not_urgent",
    urgencyOptions: ["not_urgent"],
    dateNeeded: "",
    requestedByName: "",
    requestedByEmail: "",
    signatureType: "none",
    signatureDataUrl: "",
    requestedByRemarks: "",
  };
};

const getInitialPoData = (): PoFormData => {
  const today = new Date().toISOString().split("T")[0];
  return {
    date: today,
    poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    vendorName: "",
    address: "",
    tin: "",
    contactNo: "",
    emailAddress: "",
    accountManager: "",
    items: [
      { id: "po-row-1", itemNo: 1, details: "", unit: "pcs", quantity: 1, unitPrice: "", total: 0 },
      { id: "po-row-2", itemNo: 2, details: "", unit: "pcs", quantity: 1, unitPrice: "", total: 0 },
      { id: "po-row-3", itemNo: 3, details: "", unit: "pcs", quantity: 1, unitPrice: "", total: 0 },
    ],
    subtotal: 0,
    vatRate: 12,
    vatAmount: 0,
    netOfVat: 0,
    withholdingTaxRate: 2,
    withholdingTaxAmount: 0,
    totalAmountDue: 0,
    additionalNotes: "",
    department: "Procurement",
    dateNeeded: "",
    urgency: "not_urgent",
    preparedByName: "",
    preparedByDate: today,
    notedByName: "",
    notedByDate: "",
    approvedByName: "",
    approvedByDate: "",
    conformeName: "",
    conformeDate: "",
  };
};

const getInitialPcvData = (): PcvFormData => {
  const today = new Date().toISOString().split("T")[0];
  return {
    voucherNo: `PCV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    date: today,
    payee: "",
    department: "",
    amount: 0,
    dateNeeded: "",
    urgency: "not_urgent",
    particulars: [
      { id: "pcv-row-1", description: "", amount: "" },
      { id: "pcv-row-2", description: "", amount: "" },
      { id: "pcv-row-3", description: "", amount: "" },
    ],
    requestedByName: "",
    notedByName: "",
    approvedByName: "",
    receivedByName: "",
  };
};

export interface FormsUser {
  name?: string;
  email?: string;
}

function RfpAppContent({ user, listId }: { user?: FormsUser | null; listId?: string }) {
  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");
  const prefillParam = searchParams.get("prefill");
  const tourParam = searchParams.get("tour");

  const [formData, setFormData] = useState<RfpFormData>(getInitialFormData);
  const [poData, setPoData] = useState<PoFormData>(getInitialPoData);
  const [pcvData, setPcvData] = useState<PcvFormData>(getInitialPcvData);
  const [selectedForm, setSelectedForm] = useState<string>("rfp");
  const [previousDraft, setPreviousDraft] = useState<RfpFormData | null>(null);
  const [extractedBanner, setExtractedBanner] = useState<{
    vendorName: string;
    itemsCount: number;
    totalAmount: number;
  } | null>(null);

  // Sync session user data into forms if empty
  useEffect(() => {
    if (user) {
      const name = user.name || "";
      const email = user.email || "";

      setFormData((prev) => ({
        ...prev,
        requestedByName: prev.requestedByName || name,
        requestedByEmail: prev.requestedByEmail || email,
      }));

      setPoData((prev) => ({
        ...prev,
        preparedByName: prev.preparedByName || name,
      }));

      setPcvData((prev) => ({
        ...prev,
        requestedByName: prev.requestedByName || name,
      }));
    }
  }, [user]);

  const [rawSupportingFiles, setRawSupportingFiles] = useState<File[]>([]);
  const [supportingFilesList, setSupportingFilesList] = useState<SupportingFile[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStage, setSubmissionStage] = useState<SubmissionStage>("rendering_pdf");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Validation State
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [missingFieldsList, setMissingFieldsList] = useState<ValidationErrorItem[]>([]);

  // Success dialog state
  const [submissionResponse, setSubmissionResponse] = useState<SubmissionResponse | null>(null);
  const [lastGeneratedPdf, setLastGeneratedPdf] = useState<Blob | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load existing task if in revision mode
  useEffect(() => {
    if (taskIdParam) {
      setFormData((prev) => ({ ...prev, taskId: taskIdParam }));
      setPoData((prev) => ({ ...prev, taskId: taskIdParam }));
      setPcvData((prev) => ({ ...prev, taskId: taskIdParam }));
      fetchTaskData(taskIdParam);
    } else {
      // Try restoring local draft if present
      const savedRfp = localStorage.getItem("prime_rfp_draft");
      if (savedRfp) {
        try {
          const parsed = JSON.parse(savedRfp);
          if (parsed && !parsed.taskId) setFormData(parsed);
        } catch (e) {
          console.error("Failed to parse saved RFP draft:", e);
        }
      }
      const savedPo = localStorage.getItem("prime_po_draft");
      if (savedPo) {
        try {
          const parsed = JSON.parse(savedPo);
          if (parsed && !parsed.taskId) setPoData(parsed);
        } catch (e) {
          console.error("Failed to parse saved PO draft:", e);
        }
      }
      const savedPcv = localStorage.getItem("prime_pcv_draft");
      if (savedPcv) {
        try {
          const parsed = JSON.parse(savedPcv);
          if (parsed && !parsed.taskId) setPcvData(parsed);
        } catch (e) {
          console.error("Failed to parse saved PCV draft:", e);
        }
      }
    }
  }, [taskIdParam]);

  // Auto-save draft changes
  useEffect(() => {
    if (!formData.taskId && formData.payee) {
      localStorage.setItem("prime_rfp_draft", JSON.stringify(formData));
    }
  }, [formData]);

  useEffect(() => {
    if (!poData.taskId && poData.vendorName) {
      localStorage.setItem("prime_po_draft", JSON.stringify(poData));
    }
  }, [poData]);

  useEffect(() => {
    if (!pcvData.taskId && pcvData.payee) {
      localStorage.setItem("prime_pcv_draft", JSON.stringify(pcvData));
    }
  }, [pcvData]);

  // Handle prefill query parameter (when triggered from other pages)
  useEffect(() => {
    if (prefillParam === "true") {
      handlePreFillDemo();
      window.history.replaceState(null, "", "/?view=forms&tab=create");
    }
  }, [prefillParam]);

  // Handle tour query parameter
  useEffect(() => {
    if (tourParam === "true") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("open-prototype-tour"));
        window.history.replaceState(null, "", "/?view=forms&tab=create");
      }, 400);
    }
  }, [tourParam]);

  // Listen for prefill-demo event from drawer when already on "/"
  useEffect(() => {
    const onPrefill = () => handlePreFillDemo();
    window.addEventListener("prefill-demo", onPrefill);
    return () => window.removeEventListener("prefill-demo", onPrefill);
  }, []);

  const getValidationResult = () => {
    let result: ValidationResult;
    if (selectedForm === "po") result = validatePoForm(poData);
    else if (selectedForm === "pcv") result = validatePcvForm(pcvData);
    else result = validateRfpForm(formData);

    // Require attachments across all form types
    const totalAttached = rawSupportingFiles.length + supportingFilesList.length;
    if (totalAttached === 0) {
      const attachError: ValidationErrorItem = {
        id: "supporting-documents-section",
        field: "supportingFiles",
        label: "Supporting Documents",
        message: "At least one vendor quotation, invoice, or receipt attachment is required.",
      };
      return {
        isValid: false,
        errors: { ...result.errors, supportingFiles: attachError.message },
        items: [...result.items, attachError],
      };
    }

    return result;
  };

  // Auto-clear resolved validation errors in real time
  useEffect(() => {
    if (missingFieldsList.length > 0) {
      const res = getValidationResult();
      setValidationErrors(res.errors);
      setMissingFieldsList(res.items);
    }
  }, [formData, poData, pcvData, selectedForm, rawSupportingFiles, supportingFilesList]);

  const fetchTaskData = async (id: string) => {
    try {
      const res = await fetch(`/api/rfp/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.task) {
          console.log("Loaded existing ClickUp task for revision:", json.task);
          if (json.task.name?.includes("[PO]")) {
            setSelectedForm("po");
          } else if (json.task.name?.includes("[PCV]")) {
            setSelectedForm("pcv");
          } else {
            setSelectedForm("rfp");
          }
        }
      }
    } catch (e) {
      console.warn("Could not load task details for revision:", e);
    }
  };

  const handlePreFillDemo = () => {
    setSelectedForm("rfp");
    const today = new Date().toISOString().split("T")[0];

    setFormData({
      date: today,
      payee: "Silicon Valley Computer Group Inc.",
      department: "ISD",
      items: [
        {
          id: "demo-item-1",
          description: "Dell Latitude 5440 14\" i7 16GB 512GB SSD",
          qty: 3,
          unit: "pcs",
          unitPrice: 48500,
          amount: 145500,
        },
        {
          id: "demo-item-2",
          description: "Dell UltraSharp 27\" QHD IPS Monitors (U2724D)",
          qty: 6,
          unit: "pcs",
          unitPrice: 14200,
          amount: 85200,
        },
        {
          id: "demo-item-3",
          description: "USB-C Dual 4K Universal Docking Stations",
          qty: 3,
          unit: "pcs",
          unitPrice: 6800,
          amount: 20400,
        },
        { id: "demo-item-4", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
        { id: "demo-item-5", description: "", qty: "", unit: "", unitPrice: "", amount: 0 },
      ],
      totalAmount: 251100,
      purpose: "Procurement of workstation hardware and dual-monitor setup for incoming ISD software engineers (Q3 Expansion).",
      paymentMethod: "check",
      paymentMethods: ["check"],
      bank: "BDO Unibank",
      accountName: "Silicon Valley Computer Group Inc.",
      accountNumber: "0012-3456-7890",
      urgency: "urgent",
      urgencyOptions: ["urgent"],
      dateNeeded: today,
      requestedByName: "DAVE POLICARPIO",
      requestedByEmail: "dave.policarpio@primephilippines.com",
      signatureType: "draw",
      signatureDataUrl:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='60'><path d='M20,40 Q50,10 90,35 T170,25' fill='none' stroke='%23003366' stroke-width='2.5'/></svg>",
      requestedByRemarks: "Approved under Q3 ISD Capital Expenditure budget.",
    });

    const dummyFile = new File(
      ["Sample vendor quotation for procurement request"],
      "Quotation_SVCG_2026_Q3_ISD_Laptops.pdf",
      { type: "application/pdf" }
    );
    setRawSupportingFiles([dummyFile]);
    setSupportingFilesList([
      {
        id: "demo-doc-1",
        name: "Quotation_SVCG_2026_Q3_ISD_Laptops.pdf",
        size: 245800,
        type: "application/pdf",
        dataUrl: "data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjQgMC...",
      },
    ]);

    setValidationErrors({});
    setMissingFieldsList([]);
    setErrorMessage(null);
  };

  const handleReset = () => {
    const docName =
      selectedForm === "po"
        ? "Purchase Order"
        : selectedForm === "pcv"
        ? "Petty Cash Voucher"
        : "Request for Payment";

    if (confirm(`Are you sure you want to reset this ${docName}? All unsaved inputs will be cleared.`)) {
      if (selectedForm === "po") {
        localStorage.removeItem("prime_po_draft");
        setPoData(getInitialPoData());
      } else if (selectedForm === "pcv") {
        localStorage.removeItem("prime_pcv_draft");
        setPcvData(getInitialPcvData());
      } else {
        localStorage.removeItem("prime_rfp_draft");
        setFormData(getInitialFormData());
        setPreviousDraft(null);
        setExtractedBanner(null);
      }
      setRawSupportingFiles([]);
      setSupportingFilesList([]);
      setErrorMessage(null);
      setValidationErrors({});
      setMissingFieldsList([]);
    }
  };

  const handlePreviewPdf = async () => {
    setErrorMessage(null);

    // Validate form fields before PDF generation (attachments only required for ClickUp submission)
    const validation =
      selectedForm === "po"
        ? validatePoForm(poData)
        : selectedForm === "pcv"
        ? validatePcvForm(pcvData)
        : validateRfpForm(formData);

    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setMissingFieldsList(validation.items);
      if (validation.items[0]) {
        scrollToFormField(validation.items[0].id);
      }
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const elementId =
        selectedForm === "po"
          ? "po-printable-sheet"
          : selectedForm === "pcv"
          ? "pcv-printable-sheet"
          : "rfp-printable-sheet";

      const { blob } = await generateRfpPdf(elementId);

      const prefix = selectedForm.toUpperCase();
      const entity =
        selectedForm === "po"
          ? poData.vendorName || "Vendor"
          : selectedForm === "pcv"
          ? pcvData.payee || "Payee"
          : formData.payee || "Payee";
      const dateStr =
        selectedForm === "po"
          ? poData.date
          : selectedForm === "pcv"
          ? pcvData.date
          : formData.date;

      const sanitizedEntity = entity.replace(/[^a-zA-Z0-9_-]/g, "_");
      downloadPdfBlob(blob, `${prefix}_${sanitizedEntity}_${dateStr || "document"}.pdf`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setErrorMessage("Failed to generate PDF. Please ensure all fields are properly formatted.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDataExtracted = (extracted: Partial<RfpFormData>, file: File) => {
    // Save current form data for Undo
    setPreviousDraft({ ...formData });

    // Populate form fields from quotation
    setFormData((prev) => {
      const updatedItems = extracted.items && extracted.items.length > 0 ? extracted.items : prev.items;
      const computedTotal = updatedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      return {
        ...prev,
        payee: extracted.payee || prev.payee,
        date: extracted.date || prev.date,
        department: extracted.department || prev.department,
        purpose: extracted.purpose || prev.purpose,
        paymentMethod: extracted.paymentMethod || prev.paymentMethod,
        paymentMethods: extracted.paymentMethod ? [extracted.paymentMethod] : prev.paymentMethods,
        bank: extracted.bank || prev.bank,
        accountName: extracted.accountName || prev.accountName,
        accountNumber: extracted.accountNumber || prev.accountNumber,
        urgency: extracted.urgency || prev.urgency,
        urgencyOptions: extracted.urgency ? [extracted.urgency] : prev.urgencyOptions,
        items: updatedItems,
        totalAmount: computedTotal,
      };
    });

    // Automatically register quotation as a supporting document
    setRawSupportingFiles((prev) => [...prev, file]);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSupportingFilesList((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl: e.target?.result as string,
        },
      ]);
    };
    reader.readAsDataURL(file);

    // Show extraction review banner
    setExtractedBanner({
      vendorName: extracted.payee || "Vendor",
      itemsCount: extracted.items?.length || 0,
      totalAmount: extracted.totalAmount || 0,
    });
  };

  const handleUndoExtraction = () => {
    if (previousDraft) {
      setFormData(previousDraft);
      setPreviousDraft(null);
      setExtractedBanner(null);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Field validation for active form
    const validation = getValidationResult();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setMissingFieldsList(validation.items);
      if (validation.items[0]) {
        scrollToFormField(validation.items[0].id);
      }
      return;
    }

    setIsSubmitting(true);
    setSubmissionStage("rendering_pdf");

    try {
      const elementId =
        selectedForm === "po"
          ? "po-printable-sheet"
          : selectedForm === "pcv"
          ? "pcv-printable-sheet"
          : "rfp-printable-sheet";

      const activeData =
        selectedForm === "po"
          ? poData
          : selectedForm === "pcv"
          ? pcvData
          : formData;

      const prefix = selectedForm.toUpperCase();
      const entity =
        selectedForm === "po"
          ? poData.vendorName || "Vendor"
          : selectedForm === "pcv"
          ? pcvData.payee || "Payee"
          : formData.payee || "Payee";
      const dateStr =
        selectedForm === "po"
          ? poData.date
          : selectedForm === "pcv"
          ? pcvData.date
          : formData.date;
      const sanitizedEntity = entity.replace(/[^a-zA-Z0-9_-]/g, "_");

      // 1. Generate official high-resolution PDF Blob & visual preview image Blob
      const { blob: pdfBlob } = await generateRfpPdf(elementId);
      setLastGeneratedPdf(pdfBlob);

      const previewImageBlob = await generateRfpImageBlob(elementId);

      // Advance stage to packaging attachments
      setSubmissionStage("packaging_attachments");
      await new Promise((r) => setTimeout(r, 400));

      // 2. Prepare multipart FormData payload
      const submissionData = new FormData();
      submissionData.append("formType", selectedForm);
      submissionData.append("data", JSON.stringify(activeData));
      if (listId) submissionData.append("listId", listId);

      submissionData.append("pdf", pdfBlob, `${prefix}_${sanitizedEntity}_${dateStr || "document"}.pdf`);
      submissionData.append("previewImage", previewImageBlob, `${prefix}_${sanitizedEntity}_Preview.png`);

      rawSupportingFiles.forEach((file) => {
        submissionData.append("supportingFiles", file);
      });

      // Advance stage to ClickUp upload
      setSubmissionStage("uploading_clickup");

      // 3. Post to backend ClickUp route
      const res = await fetch("/api/rfp/submit", {
        method: "POST",
        body: submissionData,
      });

      const json: SubmissionResponse = await readJsonResponse(res);

      if (!res.ok || !json.success) {
        throw new Error(json.message || `Failed to submit ${prefix} to ClickUp`);
      }

      setSubmissionStage("finalizing");
      await new Promise((r) => setTimeout(r, 450));

      setSubmissionResponse(json);
      setIsModalOpen(true);

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      // Clear draft
      if (selectedForm === "rfp") localStorage.removeItem("prime_rfp_draft");
      if (selectedForm === "po") localStorage.removeItem("prime_po_draft");
      if (selectedForm === "pcv") localStorage.removeItem("prime_pcv_draft");
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMessage(err.message || "Failed to complete submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeTaskId =
    selectedForm === "po"
      ? poData.taskId
      : selectedForm === "pcv"
      ? pcvData.taskId
      : formData.taskId;

  const activeTotalAmount =
    selectedForm === "po"
      ? poData.totalAmountDue
      : selectedForm === "pcv"
      ? pcvData.amount
      : formData.totalAmount;

  const activePayeeName =
    selectedForm === "po"
      ? poData.vendorName
      : selectedForm === "pcv"
      ? pcvData.payee
      : formData.payee;

  return (
    <div className="bg-transparent text-[#0C0C0E] py-0 px-0 flex flex-col items-center">
      {/* Container - Aligned to exact 850px document width */}
      <div className="w-full">
        {/* Single Compressed Topbar */}
        <Toolbar
          onPreviewPdf={handlePreviewPdf}
          onReset={handleReset}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isGeneratingPdf={isGeneratingPdf}
          isRevision={Boolean(activeTaskId)}
          taskId={activeTaskId}
          totalAmount={activeTotalAmount}
          selectedForm={selectedForm}
          onSelectForm={(formKey) => {
            setSelectedForm(formKey);
            setValidationErrors({});
            setMissingFieldsList([]);
            setErrorMessage(null);
          }}
        />

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* AI Supplier Quotation Scanner (Dedicated for RFP) */}
        <div id="quotation-dropzone-section">
          {selectedForm === "rfp" && <QuotationDropzone onDataExtracted={handleDataExtracted} />}
        </div>

        {/* Extraction Review & Undo Banner */}
        {selectedForm === "rfp" && extractedBanner && (
          <ExtractionBanner
            vendorName={extractedBanner.vendorName}
            itemsCount={extractedBanner.itemsCount}
            totalAmount={extractedBanner.totalAmount}
            onUndo={handleUndoExtraction}
            onDismiss={() => setExtractedBanner(null)}
          />
        )}

        {/* Interactive Validation Warning Banner */}
        <ValidationAlertBanner
          items={missingFieldsList}
          onDismiss={() => setMissingFieldsList([])}
        />

        {/* Document First Paper Sheet */}
        <main id="rfp-sheet-container" className="mb-8">
          {selectedForm === "rfp" && (
            <RfpSheet
              data={formData}
              onChange={setFormData}
              validationErrors={validationErrors}
            />
          )}
          {selectedForm === "po" && (
            <PoSheet
              data={poData}
              onChange={setPoData}
              validationErrors={validationErrors}
            />
          )}
          {selectedForm === "pcv" && (
            <PcvSheet
              data={pcvData}
              onChange={setPcvData}
              validationErrors={validationErrors}
            />
          )}
        </main>

        {/* Supporting Documents Section */}
        <section className="mb-12 max-w-[850px] mx-auto">
          <SupportingDocuments
            files={supportingFilesList}
            onFilesChange={setSupportingFilesList}
            rawFiles={rawSupportingFiles}
            onRawFilesChange={setRawSupportingFiles}
            hasError={Boolean(validationErrors["supportingFiles"])}
          />
        </section>
      </div>

      {/* Submission Loading Animation Overlay */}
      <SubmissionLoadingModal
        isOpen={isSubmitting}
        stage={submissionStage}
        entityName={activePayeeName}
        totalAmount={activeTotalAmount}
        attachmentsCount={rawSupportingFiles.length || supportingFilesList.length}
        isRevision={Boolean(activeTaskId)}
      />

      {/* Submission Success / Confirmation Modal */}
      <SubmissionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        response={submissionResponse}
        pdfBlob={lastGeneratedPdf}
        payeeName={activePayeeName}
      />
    </div>
  );
}

export default function FormsCreateView({ user }: { user?: FormsUser | null }) {
  const [category, setCategory] = useState("Finance");
  const [itFormKey, setItFormKey] = useState("it-asset-request-form");
  const [mappings, setMappings] = useState<Array<{ department: string; formType: string; listId?: string }>>([]);
  const [submissionResult, setSubmissionResult] = useState<{ taskUrl?: string; taskId?: string; formRequestId?: string } | null>(null);
  const departments = ["Finance", "Marketing", "IT", "Research & Advisory"];
  useEffect(() => { fetch("/api/forms/config").then((res) => res.ok ? res.json() : null).then((data) => setMappings(data?.config?.mappings || [])).catch(() => {}); }, []);
  useEffect(() => {
    const showConfirmation = (event: Event) => setSubmissionResult((event as CustomEvent<{ taskUrl?: string; taskId?: string; formRequestId?: string }>).detail || {});
    window.addEventListener("echo-form-submitted", showConfirmation);
    return () => window.removeEventListener("echo-form-submitted", showConfirmation);
  }, []);
  const listId = mappings.find((mapping) => mapping.department === category && mapping.formType === (category === "IT" ? itFormKey : "rfp"))?.listId;
  return (
    <div className="bg-bg-primary text-[#0C0C0E] py-6 px-3 sm:px-6">
      <div className="max-w-[1500px] mx-auto">
        <h2 className="text-2xl font-serif font-bold italic text-[#003366] mb-1">New Form</h2>
        <p className="text-xs font-bold tracking-wider text-gray-400 uppercase mb-5">Department forms and request workspace</p>
        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-6">
          <aside className="border border-gray-200 bg-white p-5 self-start">
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Departments</div>
            <div className="space-y-2">
              {departments.map((name) => <button key={name} onClick={() => setCategory(name)} className={`w-full text-left px-4 py-4 border transition ${category === name ? "border-[#C9AB4C] bg-[#fffdf6] text-[#003366]" : "border-gray-200 hover:border-[#C9AB4C]"}`}><div className="font-bold text-sm">{name}</div></button>)}
            </div>
          </aside>
          <section className="border border-gray-200 bg-white p-5 min-w-0">
            {category === "IT" ? (
              <div className="relative mb-5 flex flex-col gap-3 border border-slate-300 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center">
                <div className="absolute left-0 right-0 top-0 h-[2px] bg-[#C9AB4C]" />
                <div className="shrink-0 min-w-[180px]"><div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Forms</div><div className="text-lg font-bold text-[#003366] mt-1">IT</div></div>
                <div className="ml-auto flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <label className="relative flex w-full min-w-[280px] sm:w-[410px] items-center border border-[#003366] bg-slate-50 text-[#003366]"><FileText size={15} className="ml-3 shrink-0" /><select value={itFormKey} onChange={(event) => setItFormKey(event.target.value)} className="w-full appearance-none bg-transparent py-2.5 pl-2 pr-8 text-xs font-bold outline-none"><option value="it-asset-request-form">IT Asset Request Form</option><option value="it-helpdesk-support-form">Helpdesk Support Form</option><option value="it-bug-error-report-form">Bug/Error Report Form</option></select><span className="pointer-events-none absolute right-3 text-xs">⌄</span></label>
                  <button type="submit" form={itFormKey} disabled={!listId} className="inline-flex shrink-0 items-center justify-center gap-2 bg-[#003366] px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"><Send size={15} className="text-[#C9AB4C]" />Submit to ClickUp</button>
                </div>
              </div>
            ) : null}
            {listId ? <Suspense fallback={<div className="min-h-64 flex items-center justify-center text-sm text-gray-500">Loading form…</div>}>{category === "IT" ? itFormKey === "it-helpdesk-support-form" ? <ITHelpdeskSupportForm listId={listId} user={user} /> : itFormKey === "it-bug-error-report-form" ? <ITBugErrorReportForm listId={listId} user={user} /> : <ITAssetRequestForm listId={listId} user={user} /> : <RfpAppContent user={user} listId={listId} />}</Suspense> : <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Not configured yet — please contact IT department.</div>}
          </section>
        </div>
      </div>
      {submissionResult && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001d3d]/55 px-4" role="dialog" aria-modal="true" aria-labelledby="submission-confirmation-title"><div className="w-full max-w-md border border-[#C9AB4C] bg-white p-7 shadow-2xl"><CheckCircle2 className="mx-auto text-emerald-600" size={42} /><h3 id="submission-confirmation-title" className="mt-3 text-center font-serif text-2xl font-bold italic text-[#003366]">Successfully submitted</h3><p className="mt-2 text-center text-sm text-slate-600">Your request has been created in ClickUp.</p>{submissionResult.formRequestId && <p className="mt-4 border border-[#C9AB4C] bg-[#fffdf6] px-3 py-2 text-center text-xs font-bold text-[#003366]">{submissionResult.formRequestId}</p>}{submissionResult.taskUrl && <a className="mt-4 block text-center text-sm font-bold text-[#003366] underline" href={submissionResult.taskUrl} target="_blank" rel="noreferrer">Open in ClickUp</a>}<button onClick={() => setSubmissionResult(null)} className="mt-6 w-full bg-[#003366] py-3 text-sm font-bold text-white">Done</button></div></div>}
    </div>
  );
}
