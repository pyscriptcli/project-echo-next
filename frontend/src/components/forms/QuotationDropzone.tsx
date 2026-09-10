"use client";

import React, { useRef, useState } from "react";
import { Sparkles, UploadCloud, Loader2 } from "lucide-react";
import { RfpFormData } from "@/types/forms/rfp";
import { readJsonResponse } from "@/lib/forms/clientResponse";

interface QuotationDropzoneProps {
  onDataExtracted: (extractedData: Partial<RfpFormData>, file: File) => void;
}

export function QuotationDropzone({ onDataExtracted }: QuotationDropzoneProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processFile = async (file: File) => {
    setIsScanning(true);
    setScanStatus("Analyzing quotation document with DeepSeek Vision...");

    try {
      const formData = new FormData();
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        setScanStatus("Preparing PDF pages for DeepSeek Vision...");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
        for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 5); pageNumber++) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.35 });
          const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width);
          canvas.height = Math.ceil(viewport.height);
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Unable to prepare PDF page")), "image/jpeg", 0.72));
          formData.append("pages", blob, `page-${pageNumber}.jpg`);
        }
        formData.append("fileName", file.name);
      } else {
        if (file.size > 4_000_000) throw new Error("Image is too large. Please upload an image smaller than 4 MB.");
        formData.append("file", file);
      }

      const res = await fetch("/api/rfp/extract", {
        method: "POST",
        body: formData,
      });

      const json = await readJsonResponse<{ success?: boolean; message?: string; data?: Partial<RfpFormData> }>(res);
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to extract quotation data.");
      }

      setScanStatus("Quotation data extracted successfully!");
      setTimeout(() => {
        onDataExtracted(json.data || {}, file);
        setIsScanning(false);
        setScanStatus(null);
      }, 400);
    } catch (err: any) {
      console.error("Extraction error:", err);
      alert(err.message || "Error scanning quotation document with DeepSeek Vision.");
      setIsScanning(false);
      setScanStatus(null);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="w-full max-w-[850px] mx-auto mb-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={handleFileDrop}
        className="bg-white border border-slate-300 hover:border-[#003366] transition-all px-4 py-2.5 shadow-xs relative flex flex-col sm:flex-row items-center justify-between gap-3"
      >
        {/* Left: AI Badge + Description */}
        <div className="flex items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 bg-blue-50 border border-blue-200 text-[#003366] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-[#C9AB4C]" />
          </div>
          <div>
            <div className="flex items-center gap-2 justify-center sm:justify-start">
              <span className="font-bold text-xs text-[#003366] uppercase tracking-wide">
                RFP Auto-Fill
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Drop vendor quotation or invoice (PDF, JPG, PNG) to automatically populate line items & payee
            </p>
          </div>
        </div>

        {/* Right: Upload Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="h-8 px-4 text-xs font-bold text-[#003366] bg-slate-50 hover:bg-[#003366] hover:text-white border border-[#003366] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#C9AB4C]" />
                <span>Analyzing Quote...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5 text-[#C9AB4C]" />
                <span>Upload Quote</span>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
        </div>
      </div>

      {/* Live Scan Status Banner */}
      {isScanning && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 text-xs font-semibold text-[#003366] animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#003366]" />
          <span>{scanStatus}</span>
        </div>
      )}
    </div>
  );
}
