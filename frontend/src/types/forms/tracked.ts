export interface TrackedRfp {
  taskId: string;
  taskName: string;
  taskUrl: string;
  formType: "rfp" | "po" | "pcv" | string;
  payee: string;
  department: string;
  totalAmount: number;
  dateNeeded: string;
  urgency: "urgent" | "normal";
  purpose: string;
  requestedBy: string;
  requestedByEmail?: string;
  currentStage:
    | "submitted"
    | "endorsed"
    | "finance_verification"
    | "disbursement_prep"
    | "executive_signoff"
    | "completed"
    | "revision_requested"
    | "ongoing"
    | string;
  stageLabel: string;
  stageIndex: number;
  isRevisionRequested: boolean;
  revisionReason?: string;
  revisionBy?: "tl" | "finance" | "approver";
  dateCreated: string;
  attachments: Array<{ id: string; name: string; url: string; type?: string }>;
}
