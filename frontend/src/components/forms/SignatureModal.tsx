"use client";

import React, { useRef, useState, useEffect } from "react";
import { Pen, Upload, RotateCcw, Check, X, Image as ImageIcon } from "lucide-react";

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string, type: "draw" | "upload") => void;
  currentSignature?: string;
}

export function SignatureModal({
  isOpen,
  onClose,
  onSave,
  currentSignature,
}: SignatureModalProps) {
  const [activeTab, setActiveTab] = useState<"draw" | "upload">("draw");
  const [hasDrawing, setHasDrawing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && activeTab === "draw") {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * 2;
        canvas.height = rect.height * 2;
        ctx.scale(2, 2);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#003366";
        ctx.lineWidth = 2.5;

        if (currentSignature && !uploadedImage) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
            setHasDrawing(true);
          };
          img.src = currentSignature;
        }
      }, 50);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    lastPointRef.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !lastPointRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    lastPointRef.current = { x: currentX, y: currentY };
    setHasDrawing(true);
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (activeTab === "draw") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawing) return;
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl, "draw");
    } else {
      if (!uploadedImage) return;
      onSave(uploadedImage, "upload");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-none shadow-2xl border-2 border-[#003366] flex flex-col relative overflow-hidden">
        {/* Top Gold Accent Line */}
        <div className="h-[3px] bg-[#C9AB4C] w-full" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="font-serif italic font-bold text-lg text-[#003366]">
              Add Digital E-Signature
            </h3>
            <p className="text-xs text-slate-500">Sign directly on canvas or upload signature image</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-100/60">
          <button
            type="button"
            onClick={() => setActiveTab("draw")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "draw"
                ? "border-[#003366] text-[#003366] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Pen className="w-3.5 h-3.5" />
            Draw Signature
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "upload"
                ? "border-[#003366] text-[#003366] bg-white"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === "draw" ? (
            <div className="flex flex-col gap-3">
              <div className="relative border-2 border-dashed border-slate-300 rounded-none bg-slate-50 overflow-hidden select-none touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair bg-white"
                />
                <div className="absolute bottom-2 left-3 pointer-events-none text-[11px] text-slate-400">
                  Draw signature above using mouse, touch, or stylus
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear Pad
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {uploadedImage ? (
                <div className="relative border-2 border-slate-300 rounded-none p-4 bg-slate-50 flex items-center justify-center h-44">
                  <img
                    src={uploadedImage}
                    alt="Signature preview"
                    className="max-h-36 max-w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 p-1 bg-white border border-slate-300 text-slate-500 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 rounded-none h-44 flex flex-col items-center justify-center cursor-pointer hover:border-[#C9AB4C] hover:bg-[#003366]/5 transition-all">
                  <div className="p-3 bg-slate-100 text-[#003366] rounded-none mb-2">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Click to select signature image
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1">
                    PNG (transparent background) or JPG
                  </span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="edgy-btn-outline px-4 py-2 text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={activeTab === "draw" ? !hasDrawing : !uploadedImage}
            className="edgy-btn-primary px-5 py-2 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Check className="w-3.5 h-3.5 text-[#C9AB4C]" />
            Apply Signature
          </button>
        </div>
      </div>
    </div>
  );
}
