export const WORKSPACE_STATUS_CATEGORIES: Array<{ category: string; statuses: Array<{ status: string; label: string; color: string; type: string }> }> = [
  { category: "Not started", statuses: [{ status: "to do", label: "TO DO", color: "#f59e0b", type: "open" }] },
  { category: "Active", statuses: [
    { status: "ongoing", label: "ONGOING", color: "#eab308", type: "custom" },
    { status: "delayed", label: "DELAYED", color: "#dc2626", type: "custom" },
    { status: "recovery meeting", label: "RECOVERY MEETING", color: "#16a34a", type: "custom" },
  ] },
  { category: "Done", statuses: [
    { status: "completed 5 days ahead", label: "COMPLETED 5 DAYS AHEAD", color: "#7c3aed", type: "done" },
    { status: "completed 1 day ahead", label: "COMPLETED 1 DAY AHEAD", color: "#2563eb", type: "done" },
    { status: "completed on-time", label: "COMPLETED ON-TIME", color: "#0284c7", type: "done" },
    { status: "delayed completion", label: "DELAYED COMPLETION", color: "#db2777", type: "done" },
    { status: "onhold", label: "ONHOLD", color: "#ea580c", type: "done" },
    { status: "shelved", label: "SHELVED", color: "#6b7280", type: "done" },
  ] },
  { category: "Closed", statuses: [{ status: "closed", label: "CLOSED", color: "#059669", type: "closed" }] },
] ;
export const ALL_WORKSPACE_STATUSES = WORKSPACE_STATUS_CATEGORIES.flatMap((category) => category.statuses);
