"use client";

import { useMemo, useState } from "react";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { AlertCircle, Check, Download, FileText, FolderOpen, LoaderCircle, MessageSquareText, Save, Trash2, Upload } from "lucide-react";
import { compareSections, readWordSections, type DeltaEntry, type DeltaSection } from "@/lib/delta/compare";
import { chooseReviewFolder, deleteReview, listReviews, saveReview, type SavedDeltaReview } from "@/lib/delta/localStore";

const controlClass = "inline-flex min-h-10 items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-xs font-semibold text-[#003366] transition-colors hover:border-[#003366] hover:bg-[#F7FAFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#003366] disabled:cursor-not-allowed disabled:opacity-50";

function fileNameSafe(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, "-").trim().slice(0, 80) || "delta-register";
}

type DiffPart = { text: string; changed: boolean };

function registerWording(text: string, counterpart: string, side: "original" | "revised") {
  if (!text) return [new TextRun({ text: side === "original" ? "Not present" : "Removed", italics: true, color: "64748B" })];
  const parts = side === "original" ? diffParts(text, counterpart).original : diffParts(counterpart, text).revised;
  return parts.map((part) => new TextRun({ text: part.text, ...(part.changed ? side === "original" ? { color: "B42318", strike: true } : { color: "16794B", bold: true } : {}) }));
}

function diffParts(original: string, revised: string) {
  const tokenize = (value: string) => value.match(/\s+|[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*|[^\s]/gu) || [];
  const left = tokenize(original);
  const right = tokenize(revised);
  if (left.length > 1200 || right.length > 1200) {
    let start = 0;
    while (start < left.length && start < right.length && left[start] === right[start]) start += 1;
    let leftEnd = left.length;
    let rightEnd = right.length;
    while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) { leftEnd -= 1; rightEnd -= 1; }
    return {
      original: [{ text: left.slice(0, start).join(""), changed: false }, { text: left.slice(start, leftEnd).join(""), changed: true }, { text: left.slice(leftEnd).join(""), changed: false }].filter((part) => part.text),
      revised: [{ text: right.slice(0, start).join(""), changed: false }, { text: right.slice(start, rightEnd).join(""), changed: true }, { text: right.slice(rightEnd).join(""), changed: false }].filter((part) => part.text),
    };
  }
  const width = right.length + 1;
  const lengths = Array.from({ length: left.length + 1 }, () => new Uint16Array(width));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i][j] = left[i] === right[j] ? lengths[i + 1][j + 1] + 1 : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const originalParts: DiffPart[] = [];
  const revisedParts: DiffPart[] = [];
  const push = (parts: DiffPart[], token: string, changed: boolean) => {
    const last = parts[parts.length - 1];
    if (last?.changed === changed) last.text += token;
    else parts.push({ text: token, changed });
  };
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      push(originalParts, left[i], false); push(revisedParts, right[j], false); i += 1; j += 1;
    } else if (i < left.length && (j === right.length || lengths[i + 1][j] >= lengths[i][j + 1])) {
      push(originalParts, left[i], true); i += 1;
    } else {
      push(revisedParts, right[j], true); j += 1;
    }
  }
  return { original: originalParts, revised: revisedParts };
}

function cleanExplanation(value: string) {
  return value
    .replace(/^\s*(?:here is )?(?:a )?plain[- ]language reading(?: aid)?(?: for section [\w.-]+)?[.:]?\s*/i, "")
    .replace(/\*\*?(?:what changed|plain[- ]language reading(?: aid)?)\*\*?\s*:?/gi, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^\s*[-•]\s*/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function createRegisterDocument(review: SavedDeltaReview) {
  const rows = review.entries.flatMap((entry) => [
    new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ text: entry.section })], width: { size: 18, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ text: entry.summary })], width: { size: 22, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: registerWording(entry.originalText, entry.revisedText, "original") })], width: { size: 30, type: WidthType.PERCENTAGE } }),
      new TableCell({ children: [new Paragraph({ children: registerWording(entry.revisedText, entry.originalText, "revised") })], width: { size: 30, type: WidthType.PERCENTAGE } }),
    ] }),
    ...entry.comments.map((comment) => new TableRow({ children: [
      new TableCell({ children: [new Paragraph({ text: "Word comment" })] }),
      new TableCell({ children: [new Paragraph({ text: comment.author })] }),
      new TableCell({ children: [new Paragraph({ text: comment.text })], columnSpan: 2 }),
    ] })),
  ]);
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [18, 22, 30, 30],
    rows: [new TableRow({ tableHeader: true, children: ["Section", "Change summary", "Original wording", "Revised wording"].map((text) => new TableCell({ children: [new Paragraph({ text, heading: HeadingLevel.HEADING_3 })] })) }), ...rows],
  });
  return new Document({ sections: [{ children: [
    new Paragraph({ text: "DELTA Contract Review Register", heading: HeadingLevel.TITLE }),
    new Paragraph({ text: review.title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({ text: `Original: ${review.originalName} | Reviewed: ${review.revisedName}` }),
    new Paragraph({ text: `Prepared ${new Intl.DateTimeFormat("en", { dateStyle: "long" }).format(new Date(review.savedAt))}` }),
    new Paragraph({ text: "Review aid only. Verify every entry against the source documents." }),
    new Paragraph({ text: review.commentsFound ? "Word comments were found and are shown with the relevant register entry." : "No Word comments were found in either document." }),
    table,
    ...review.entries.filter((entry) => entry.explanation).flatMap((entry) => [
      new Paragraph({ text: `AI explanation: Section ${entry.section}`, heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: cleanExplanation(entry.explanation || "") }),
    ]),
  ] }] });
}

export function DeltaReview({ contextName }: { contextName?: string }) {
  const [originalFile, setOriginalFile] = useState<File | undefined>();
  const [revisedFile, setRevisedFile] = useState<File | undefined>();
  const [title, setTitle] = useState(contextName ? `${contextName} contract review` : "Contract review");
  const [entries, setEntries] = useState<DeltaEntry[]>([]);
  const [originalSections, setOriginalSections] = useState<DeltaSection[]>([]);
  const [revisedSections, setRevisedSections] = useState<DeltaSection[]>([]);
  const [reviewTab, setReviewTab] = useState<"register" | "compare">("register");
  const [reviewId, setReviewId] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [savedReviews, setSavedReviews] = useState<SavedDeltaReview[]>([]);
  const [folderReady, setFolderReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const commentsFound = useMemo(() => entries.some((entry) => entry.comments.length > 0), [entries]);
  const canCompare = Boolean(originalFile && revisedFile && !busy);

  const chooseFolder = async () => {
    setBusy(true); setError(""); setNotice(""); setBusyLabel("Opening Documents");
    try {
      await chooseReviewFolder();
      setFolderReady(true);
      setNotice("DELTA Reviews folder is ready in Documents. Your review files stay on this device.");
      const reviews = await listReviews();
      setSavedReviews(reviews);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The local save folder could not be created.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const refreshSavedReviews = async () => {
    setBusy(true); setError(""); setBusyLabel("Reading saved reviews");
    try {
      const reviews = await listReviews();
      setSavedReviews(reviews); setFolderReady(true);
      setNotice(reviews.length ? `${reviews.length} saved review${reviews.length === 1 ? "" : "s"} found in Documents.` : "No saved reviews in the DELTA Reviews folder yet.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Saved reviews could not be read.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const compare = async () => {
    if (!originalFile || !revisedFile) return;
    setBusy(true); setError(""); setNotice(""); setBusyLabel("Reading both Word documents");
    try {
      if (!originalFile.name.toLowerCase().endsWith(".docx") || !revisedFile.name.toLowerCase().endsWith(".docx")) {
        throw new Error("Choose two .docx Word documents. Older .doc files are not supported.");
      }
      const [original, revised] = await Promise.all([readWordSections(originalFile), readWordSections(revisedFile)]);
      const result = compareSections(original, revised);
      setEntries(result); setReviewId(crypto.randomUUID()); setSavedAt(new Date().toISOString());
      setOriginalSections(original); setRevisedSections(revised);
      setReviewTab("register");
      setNotice(result.length ? `${result.length} register entr${result.length === 1 ? "y" : "ies"} ready. Check each against the source files.` : "No wording, numbering, or comment changes were found between these documents.");
    } catch (cause) {
      setEntries([]); setOriginalSections([]); setRevisedSections([]); setError(cause instanceof Error ? cause.message : "The Word documents could not be compared.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const makeReview = (includeFiles = true): SavedDeltaReview => ({
    id: reviewId || crypto.randomUUID(),
    title: title.trim() || "Contract review",
    savedAt: savedAt || new Date().toISOString(),
    originalName: originalFile?.name || "original.docx",
    revisedName: revisedFile?.name || "reviewed.docx",
    entries,
    commentsFound,
    ...(includeFiles ? { originalFile, revisedFile } : {}),
  });

  const saveCurrentReview = async () => {
    if (!entries.length || !originalFile || !revisedFile) return;
    setBusy(true); setError(""); setBusyLabel("Saving to Documents");
    try {
      const review = makeReview();
      const registerFile = await Packer.toBlob(createRegisterDocument(review));
      await saveReview({ ...review, registerFile });
      setReviewId(review.id); setSavedAt(review.savedAt); setFolderReady(true);
      setSavedReviews(await listReviews());
      setNotice("Review, register, and both source Word files saved in Documents / DELTA Reviews.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The review could not be saved locally.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const openReview = async (review: SavedDeltaReview) => {
    setTitle(review.title); setEntries(review.entries); setReviewId(review.id); setSavedAt(review.savedAt);
    setOriginalFile(review.originalFile); setRevisedFile(review.revisedFile);
    setReviewTab("register");
    setError(""); setNotice(`Opened ${review.title} from Documents / DELTA Reviews.`);
    if (review.originalFile && review.revisedFile) {
      try {
        const [original, revised] = await Promise.all([readWordSections(review.originalFile), readWordSections(review.revisedFile)]);
        setOriginalSections(original); setRevisedSections(revised);
      } catch { setOriginalSections([]); setRevisedSections([]); }
    } else { setOriginalSections([]); setRevisedSections([]); }
  };

  const removeReview = async (review: SavedDeltaReview) => {
    if (!window.confirm(`Delete ${review.title} and its source Word files from Documents / DELTA Reviews?`)) return;
    setBusy(true); setError(""); setBusyLabel("Deleting saved review");
    try {
      await deleteReview(review.id);
      setSavedReviews((current) => current.filter((item) => item.id !== review.id));
      if (reviewId === review.id) { setEntries([]); setOriginalSections([]); setRevisedSections([]); setOriginalFile(undefined); setRevisedFile(undefined); setReviewId(""); }
      setNotice(`${review.title} and its local source files were deleted.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The saved review could not be deleted.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const explain = async (entry: DeltaEntry) => {
    setBusy(true); setError(""); setBusyLabel(`Requesting explanation for section ${entry.section}`);
    try {
      const response = await fetch("/api/delta/explain", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: entry.section, summary: entry.summary, original: entry.originalText, revised: entry.revisedText, comments: entry.comments }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "The AI explanation could not be generated.");
      setEntries((current) => current.map((item) => item.id === entry.id ? { ...item, explanation: payload.explanation } : item));
      setNotice("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The AI explanation could not be generated.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  const exportRegister = async () => {
    if (!entries.length) return;
    setBusy(true); setBusyLabel("Preparing Word register"); setError("");
    try {
      const blob = await Packer.toBlob(createRegisterDocument(makeReview(false)));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `${fileNameSafe(title)}-register.docx`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Word register downloaded.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The Word register could not be exported.");
    } finally { setBusy(false); setBusyLabel(""); }
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] space-y-5 pb-10 text-[#181D1E]">
      <header className="flex flex-col justify-between gap-3 border-b border-[#003366]/15 pb-4 md:flex-row md:items-end">
        <div className="border-l-4 border-[#C9A84C] pl-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#31577D]">Contract review / DELTA</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[#003366]">Review a revised lease</h1>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600">Compare two Word drafts by section, keep the original and revised wording together, and export a review register.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={controlClass} onClick={chooseFolder} disabled={busy}><FolderOpen aria-hidden="true" className="h-4 w-4" />Choose Documents folder</button>
          <button type="button" className={controlClass} onClick={refreshSavedReviews} disabled={busy}><FileText aria-hidden="true" className="h-4 w-4" />Open saved reviews</button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 border border-red-300 bg-white p-3 text-sm text-red-900"><AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}
      {notice && <div role="status" className="flex items-start gap-2 border border-emerald-300 bg-white p-3 text-sm text-emerald-900"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" /><p>{notice}</p></div>}
      {busy && <div role="status" className="flex items-center gap-2 text-xs text-slate-600"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin text-[#003366]" />{busyLabel}</div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(290px,0.65fr)]">
        <section className="border border-slate-200 bg-[#FFFCFB]">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Start a review</h2><p className="mt-1 text-xs text-slate-600">Both files are read in this browser. Nothing is uploaded for comparison.</p></div>
          <div className="grid gap-4 p-4 md:grid-cols-2">
            <FileField label="Original Word document" file={originalFile} onChange={setOriginalFile} />
            <FileField label="Reviewed Word document" file={revisedFile} onChange={setRevisedFile} />
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 text-xs font-semibold text-[#003366]">Review name<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} className="mt-1 min-h-10 w-full border border-slate-300 bg-white px-3 text-sm font-normal text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]" /></label>
            <button type="button" onClick={compare} disabled={!canCompare} className="inline-flex min-h-10 items-center justify-center gap-2 border border-[#003366] bg-[#003366] px-4 text-xs font-semibold text-[#FFFCFB] transition-colors hover:bg-[#174778] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C9A84C] disabled:cursor-not-allowed disabled:opacity-50"><Upload aria-hidden="true" className="h-4 w-4" />Compare documents</button>
          </div>
        </section>

        <aside className="border border-[#C9A84C]/60 bg-[#FFFCFB]">
          <div className="border-b border-slate-200 px-4 py-3"><h2 className="text-sm font-semibold text-[#003366]">Saved on this device</h2><p className="mt-1 text-xs leading-5 text-slate-600">Choose Documents once. DELTA creates a <strong>DELTA Reviews</strong> folder there and stores the register with both Word files.</p></div>
          <div className="p-4">
            {folderReady && !savedReviews.length && <p className="text-xs leading-5 text-slate-600">No saved reviews are listed. Save a completed comparison or open saved reviews to refresh this list.</p>}
            {savedReviews.length > 0 && <ul className="divide-y divide-slate-100">{savedReviews.map((review) => <li key={review.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><button type="button" onClick={() => openReview(review)} className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366]"><span className="block truncate text-sm font-semibold text-[#003366]">{review.title}</span><span className="mt-1 block text-[11px] text-slate-500">{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(review.savedAt))} · {review.entries.length} entries</span></button><button type="button" aria-label={`Delete ${review.title}`} title="Delete saved review and its Word files" onClick={() => void removeReview(review)} disabled={busy} className="inline-flex min-h-9 min-w-9 items-center justify-center border border-slate-300 text-slate-600 hover:border-red-500 hover:text-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#003366] disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" /></button></li>)}</ul>}
          </div>
        </aside>
      </div>

      {entries.length > 0 && <section className="border border-slate-200 bg-[#FFFCFB]">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center"><div><h2 className="text-sm font-semibold text-[#003366]">Change register <span className="ml-1 font-normal text-slate-500">{entries.length} entries</span></h2><p className="mt-1 text-xs text-slate-600">Review aid only. Verify each entry against the source documents.</p></div><div className="flex flex-wrap gap-2"><button type="button" className={controlClass} onClick={exportRegister} disabled={busy}><Download aria-hidden="true" className="h-4 w-4" />Export Word</button><button type="button" className={controlClass} onClick={saveCurrentReview} disabled={busy || !originalFile || !revisedFile}><Save aria-hidden="true" className="h-4 w-4" />Save locally</button></div></div>
        <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-600">{commentsFound ? "Word comments were found and are attached to relevant entries below." : "No Word comments found in either document."}</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-slate-100 bg-white px-4 py-2 text-[10px] text-slate-500"><span><span className="mr-1 inline-block h-2.5 w-2.5 bg-rose-100 ring-1 ring-rose-300" />Removed from original wording</span><span><span className="mr-1 inline-block h-2.5 w-2.5 bg-emerald-100 ring-1 ring-emerald-300" />Added to reviewed wording</span></div>
        <div role="tablist" aria-label="Review views" className="flex border-b border-slate-200 bg-white px-4">{([{ id: "register", label: "Register" }, { id: "compare", label: "Compare" }] as const).map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={reviewTab === tab.id} onClick={() => setReviewTab(tab.id)} className={`min-h-11 border-b-2 px-4 text-xs font-semibold ${reviewTab === tab.id ? "border-[#C9A84C] text-[#003366]" : "border-transparent text-slate-500 hover:text-[#003366]"}`}>{tab.label}</button>)}</div>
        {reviewTab === "register" && <ol className="divide-y divide-slate-200">{entries.map((entry, index) => <li key={entry.id} className="p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#31577D]">Entry {index + 1} · Section {entry.section}</p><h3 className="mt-1 text-sm font-semibold text-[#003366]">{entry.summary}</h3></div><button type="button" onClick={() => void explain(entry)} disabled={busy} className={controlClass}>{entry.explanation ? <><Check aria-hidden="true" className="h-4 w-4 text-emerald-700" />Regenerate explanation</> : "Explain change"}</button></div>
          {entry.comments.length > 0 && <div className="mt-3 border-l-2 border-[#C9A84C] bg-[#F7FAFC] p-3"><p className="flex items-center gap-2 text-xs font-semibold text-[#003366]"><MessageSquareText aria-hidden="true" className="h-4 w-4" />Word comment{entry.comments.length > 1 ? "s" : ""}</p>{entry.comments.map((comment, commentIndex) => <p key={`${entry.id}-comment-${commentIndex}`} className="mt-2 text-xs leading-5 text-slate-700"><strong>{comment.author}:</strong> {comment.text}</p>)}</div>}
          <div className="mt-3 grid gap-3 lg:grid-cols-2"><Wording label={`Original wording · ${entry.originalSection}`} text={entry.originalText} counterpart={entry.revisedText} side="original" empty="Section not present in the original document." /><Wording label={`Revised wording · ${entry.revisedSection}`} text={entry.revisedText} counterpart={entry.originalText} side="revised" empty="Section removed from the reviewed document." /></div>
          {entry.explanation && <section className="mt-4 border border-[#C9A84C]/50 bg-white"><div className="border-b border-slate-100 px-4 py-2.5"><h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#31577D]">Explanation</h4></div><p className="whitespace-pre-line px-4 py-3 text-sm leading-6 text-slate-700">{cleanExplanation(entry.explanation)}</p></section>}
        </li>)}</ol>}
        {reviewTab === "compare" && <ComparePreview entries={entries} originalSections={originalSections} revisedSections={revisedSections} originalName={originalFile?.name} revisedName={revisedFile?.name} />}
        <p className="border-t border-slate-200 px-4 py-3 text-[11px] leading-5 text-slate-500">AI explanations are optional and sent only when you request them. Confirm all comparisons against the source documents.</p>
      </section>}
    </section>
  );
}

function ComparePreview({ entries, originalSections, revisedSections, originalName, revisedName }: { entries: DeltaEntry[]; originalSections: DeltaSection[]; revisedSections: DeltaSection[]; originalName?: string; revisedName?: string }) {
  const sectionName = (section: DeltaSection, index: number) => `${section.number || index + 1}${section.heading ? ` ${section.heading}` : ""}`;
  const originalRows = originalSections.map((section, index) => {
    const label = sectionName(section, index);
    const entry = entries.find((candidate) => candidate.originalSection === label);
    const text = [section.heading, section.text].filter(Boolean).join("\n\n");
    return { id: `original-${index}`, label, text, counterpart: entry ? entry.revisedText : text };
  });
  const revisedRows = revisedSections.map((section, index) => {
    const label = sectionName(section, index);
    const entry = entries.find((candidate) => candidate.revisedSection === label);
    const text = [section.heading, section.text].filter(Boolean).join("\n\n");
    return { id: `revised-${index}`, label, text, counterpart: entry ? entry.originalText : text };
  });
  return <div className="grid min-w-0 gap-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_300px]">
    <section className="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r"><header className="border-b border-slate-200 bg-[#F7FAFC] px-4 py-3"><h3 className="text-xs font-semibold text-[#003366]">Original · {originalName || "source document"}</h3></header><div className="max-h-[72vh] space-y-4 overflow-auto p-4">{originalRows.map((row) => <article key={row.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Section {row.label}</p><DiffWording text={row.text} counterpart={row.counterpart} side="original" empty="Section not present in the original document." /></article>)}</div></section>
    <section className="min-w-0 border-b border-slate-200 xl:border-b-0 xl:border-r"><header className="border-b border-slate-200 bg-[#F7FAFC] px-4 py-3"><h3 className="text-xs font-semibold text-[#003366]">Reviewed · {revisedName || "reviewed document"}</h3></header><div className="max-h-[72vh] space-y-4 overflow-auto p-4">{revisedRows.map((row) => <article key={row.id} className="border-b border-slate-100 pb-4 last:border-0"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Section {row.label}</p><DiffWording text={row.text} counterpart={row.counterpart} side="revised" empty="Section removed from the reviewed document." /></article>)}</div></section>
    <aside className="min-w-0 bg-white"><header className="border-b border-slate-200 px-4 py-3"><h3 className="text-xs font-semibold text-[#003366]">Change notes</h3><p className="mt-1 text-[10px] text-slate-500">{entries.length} changed sections</p></header><div className="max-h-[72vh] space-y-4 overflow-auto p-4">{entries.map((entry) => <article key={`notes-${entry.id}`} className="border-b border-slate-100 pb-4 last:border-0"><p className="text-[10px] font-bold uppercase tracking-wide text-[#31577D]">Section {entry.section}</p><p className="mt-1 text-xs font-semibold leading-5 text-[#003366]">{entry.summary}</p>{entry.comments.length ? entry.comments.map((comment, index) => <p key={`${entry.id}-note-${index}`} className="mt-2 border-l-2 border-[#C9A84C] pl-2 text-xs leading-5 text-slate-700"><strong>{comment.author}:</strong> {comment.text}</p>) : <p className="mt-2 text-[11px] text-slate-400">No Word comment attached.</p>}</article>)}</div></aside>
  </div>;
}

function FileField({ label, file, onChange }: { label: string; file?: File; onChange: (file: File | undefined) => void }) {
  return <label className="flex min-h-32 cursor-pointer flex-col justify-between border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-600 transition-colors hover:border-[#31577D] focus-within:outline focus-within:outline-2 focus-within:outline-[#003366]"><span><span className="block font-semibold text-[#003366]">{label}</span><span className="mt-1 block">Word document (.docx)</span></span><span className="mt-4 flex items-center gap-2 truncate"><Upload aria-hidden="true" className="h-4 w-4 shrink-0 text-[#31577D]" />{file?.name || "Choose a file"}</span><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" onChange={(event) => onChange(event.target.files?.[0])} /></label>;
}

function DiffWording({ text, counterpart, side, empty }: { text: string; counterpart: string; side: "original" | "revised"; empty: string }) {
  if (!text) return <p className="px-3 py-3 text-xs italic text-slate-500">{empty}</p>;
  const parts = side === "original" ? diffParts(text, counterpart).original : diffParts(counterpart, text).revised;
  return <p className="whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">{parts.map((part, index) => part.changed ? <mark key={index} className={side === "original" ? "bg-rose-100 text-rose-950" : "bg-emerald-100 text-emerald-950"}>{part.text}</mark> : <span key={index}>{part.text}</span>)}</p>;
}

function Wording({ label, text, counterpart, side, empty }: { label: string; text: string; counterpart: string; side: "original" | "revised"; empty: string }) {
  return <section className="min-w-0 border border-slate-200 bg-white"><h4 className="border-b border-slate-100 bg-[#F7FAFC] px-3 py-2 text-[10px] font-semibold text-[#003366]">{label}</h4><div className="px-3 py-3">{text ? <DiffWording text={text} counterpart={counterpart} side={side} empty={empty} /> : <p className="text-xs italic text-slate-500">{empty}</p>}</div></section>;
}
