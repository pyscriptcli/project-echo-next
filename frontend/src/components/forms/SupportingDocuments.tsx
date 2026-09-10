"use client";

import React, { useRef, useState } from "react";
import { Paperclip, UploadCloud, Trash2, FileText, Image as ImageIcon, Eye, AlertTriangle } from "lucide-react";
import { SupportingFile } from "@/types/forms/rfp";

interface SupportingDocumentsProps {
  files: SupportingFile[];
  onFilesChange: (files: SupportingFile[]) => void;
  rawFiles: File[];
  onRawFilesChange: (rawFiles: File[]) => void;
  hasError?: boolean;
}

export function SupportingDocuments({
  files,
  onFilesChange,
  rawFiles,
  onRawFilesChange,
  hasError = false,
}: SupportingDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [sizeWarning, setSizeWarning] = useState<string | null>(null);

  const MAX_FILE_SIZE = 4.5 * 1024 * 1024; // 4.5 MB maximum per attachment

  const handleFileSelection = (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const allSelected = Array.from(selectedFiles);
    const oversized = allSelected.filter((file) => file.size > MAX_FILE_SIZE);

    if (oversized.length > 0) {
      const names = oversized.map((f) => `"${f.name}" (${(f.size / (1024 * 1024)).toFixed(1)} MB)`).join(", ");
      setSizeWarning(`Attachment exceeds 4.5MB limit: ${names}. Please compress or choose a smaller file.`);
    } else {
      setSizeWarning(null);
    }

    const validFiles = allSelected.filter((file) => file.size <= MAX_FILE_SIZE);
    if (validFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const updatedRaw = [...rawFiles, ...validFiles];
    onRawFilesChange(updatedRaw);

    // Convert to previewable SupportingFile list
    const filePromises = validFiles.map((file: File) => {
      return new Promise<SupportingFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl: e.target?.result as string,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then((newItems) => {
      onFilesChange([...files, ...newItems]);
    });
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    const updatedRaw = rawFiles.filter((_, i) => i !== index);
    onFilesChange(updatedFiles);
    onRawFilesChange(updatedRaw);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div
      id="supporting-documents-section"
      className={`bg-white rounded-none border ${
        hasError
          ? "border-rose-500 ring-2 ring-rose-400/40 bg-rose-50/10"
          : "border-slate-300"
      } shadow-sm p-6 relative overflow-hidden transition-all`}
    >
      {/* Gold top accent */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${hasError ? "bg-rose-500" : "bg-[#C9AB4C]"}`} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#003366] text-[#C9AB4C] rounded-none">
            <Paperclip className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif italic font-bold text-base text-[#003366]">
                Supporting Documents
              </h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200">
                Required
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Attach vendor quotations, invoices, receipts, or official SOA before submitting
            </p>
          </div>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 ${
          hasError
            ? "bg-rose-50 text-rose-700 border border-rose-300 font-bold"
            : "bg-slate-100 text-slate-700 border border-slate-200"
        }`}>
          {files.length} {files.length === 1 ? "file" : "files"} attached
        </span>
      </div>

      {hasError && (
        <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
          <span>Attachment required: Please upload at least one vendor quotation, invoice, or receipt before submitting to ClickUp.</span>
        </div>
      )}

      {sizeWarning && (
        <div className="mb-3 p-3 bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{sizeWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setSizeWarning(null)}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dropzone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFileSelection(e.dataTransfer.files);
        }}
        className={`border-2 border-dashed ${
          hasError
            ? "border-rose-400 bg-rose-50/30 hover:border-rose-500"
            : "border-slate-300 hover:border-[#C9AB4C] hover:bg-[#003366]/5"
        } rounded-none p-6 text-center cursor-pointer transition-all`}
      >
        <UploadCloud className="w-8 h-8 text-[#003366]/50 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-700">
          Click to upload or drag & drop supporting files here
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supports PDF, PNG, JPG, and DOCX (up to 4.5MB each)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileSelection(e.target.files)}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {files.map((file, idx) => (
            <div
              key={file.id || idx}
              className="flex items-center justify-between p-3 rounded-none border border-slate-300 bg-slate-50 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-white border border-slate-200 text-[#003366] shrink-0">
                  {file.type.includes("image") ? (
                    <ImageIcon className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>
                <div className="truncate">
                  <p className="text-xs font-semibold text-slate-800 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                {file.dataUrl && (
                  <a
                    href={file.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-white transition-colors"
                    title="Preview file"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
