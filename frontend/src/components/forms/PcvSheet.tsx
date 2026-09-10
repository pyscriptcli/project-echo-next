"use client";

import React from "react";
import { PcvFormData, PcvParticularItem } from "@/types/forms/rfp";
import { PrimeLogo } from "./PrimeLogo";
import { Trash2, Plus } from "lucide-react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { DepartmentCombobox } from "./DepartmentCombobox";

interface PcvSheetProps {
  data: PcvFormData;
  onChange: (data: PcvFormData) => void;
  validationErrors?: Record<string, string>;
}

export function PcvSheet({ data, onChange, validationErrors }: PcvSheetProps) {
  const hasError = (key: string) => Boolean(validationErrors?.[key]);

  const updateField = <K extends keyof PcvFormData>(field: K, value: PcvFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleParticularChange = (
    index: number,
    field: keyof PcvParticularItem,
    val: string | number
  ) => {
    const updated = [...data.particulars];
    updated[index] = { ...updated[index], [field]: val };

    const total = updated.reduce(
      (acc, it) => acc + (typeof it.amount === "number" ? it.amount : 0),
      0
    );

    onChange({
      ...data,
      particulars: updated,
      amount: total,
    });
  };

  const addParticularRow = () => {
    const newRow: PcvParticularItem = {
      id: `pcv-item-${Date.now()}`,
      description: "",
      amount: "",
    };
    onChange({
      ...data,
      particulars: [...data.particulars, newRow],
    });
  };

  const removeParticularRow = (index: number) => {
    if (data.particulars.length <= 1) return;
    const updated = data.particulars.filter((_, i) => i !== index);
    const total = updated.reduce(
      (acc, it) => acc + (typeof it.amount === "number" ? it.amount : 0),
      0
    );
    onChange({
      ...data,
      particulars: updated,
      amount: total,
    });
  };

  const formattedAmount = Number(data.amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="w-full flex justify-center py-2">
      <div
        id="pcv-printable-sheet"
        className="w-full max-w-[850px] bg-white text-black p-8 md:p-10 border-2 border-black shadow-2xl relative font-sans leading-tight text-xs"
        style={{ minHeight: "1050px" }}
      >
        {/* Header Branding */}
        <div className="flex items-start justify-between pb-3">
          <PrimeLogo className="h-12 w-auto" />
          <div className="flex-1 text-center pr-12">
            <h1 className="font-sans font-black text-2xl md:text-3xl text-slate-900 tracking-wider uppercase">
              PETTY CASH VOUCHER
            </h1>
          </div>
        </div>

        {/* Voucher Meta Fields */}
        <div className="mt-4 grid grid-cols-12 gap-y-3 gap-x-6 text-xs pb-3 border-b border-black">
          {/* Left Fields */}
          <div className="col-span-8 space-y-2">
            {/* Payee */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 shrink-0">
                PAYEE (employee):
              </span>
              <input
                id="pcv-field-payee"
                type="text"
                placeholder="Employee Full Name"
                value={data.payee}
                onChange={(e) => updateField("payee", e.target.value)}
                className={`w-full border-b border-black bg-transparent px-1 py-0.5 font-bold text-xs focus:outline-none focus:bg-blue-50/40 ${hasError("payee") ? "border-b-2 border-rose-500 bg-rose-50/50" : ""}`}
              />
            </div>

            {/* Department */}
            <div className="flex items-center gap-2 relative">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 shrink-0">
                DEPARTMENT:
              </span>
              <DepartmentCombobox
                id="pcv-field-department"
                value={data.department}
                onChange={(val) => updateField("department", val)}
                placeholder="ex. Brokerage"
                className={`w-full border-b border-black bg-transparent px-1 py-0.5 text-xs font-semibold focus:outline-none focus:bg-blue-50/40 ${
                  hasError("department") ? "border-b-2 border-rose-500 bg-rose-50/50" : ""
                }`}
                hasError={hasError("department")}
              />
            </div>

            {/* Amount */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 shrink-0">
                AMOUNT:
              </span>
              <div className="border-b border-black px-2 py-0.5 flex items-baseline gap-1 min-w-[180px]">
                <span className="text-slate-500 font-bold">₱</span>
                <span className="font-bebas text-xl text-[#003366] tracking-wider leading-none">
                  {formattedAmount}
                </span>
                <span className="text-[10px] text-slate-400 italic ml-2">
                  (Auto-calculated from particulars)
                </span>
              </div>
            </div>
          </div>

          {/* Right Fields */}
          <div className="col-span-4 space-y-2">
            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 shrink-0">
                NO:
              </span>
              <input
                type="text"
                placeholder="PCV-2026-001"
                value={data.voucherNo}
                onChange={(e) => updateField("voucherNo", e.target.value)}
                className="w-36 border-b border-black bg-transparent px-2 py-0.5 text-right font-mono font-bold text-xs focus:outline-none focus:bg-blue-50/40"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <span className="font-bold text-xs uppercase tracking-tight text-slate-900 shrink-0">
                DATE:
              </span>
              <input
                id="pcv-field-date"
                type="date"
                value={data.date}
                onChange={(e) => updateField("date", e.target.value)}
                className={`w-36 border-b border-black bg-transparent px-1 py-0.5 text-right font-medium text-xs focus:outline-none focus:bg-blue-50/40 ${hasError("date") ? "border-b-2 border-rose-500 bg-rose-50/50" : ""}`}
              />
            </div>
          </div>
        </div>

        {/* PARTICULARS Header */}
        <div className="mt-4 text-center">
          <h2 className="font-black text-sm uppercase tracking-widest text-slate-900">
            PARTICULARS
          </h2>
        </div>

        {/* PARTICULARS Box & Itemized Lines */}
        <div className="mt-2 border-2 border-black min-h-[380px] p-3 flex flex-col justify-between">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-300 text-slate-500 text-[11px] uppercase">
                <th className="p-1 text-left font-bold w-12">#</th>
                <th className="p-1 text-left font-bold">Expense Description / Purpose</th>
                <th className="p-1 text-right font-bold w-32">Amount</th>
                <th data-html2canvas-ignore="true" className="w-8 p-1 no-print"></th>
              </tr>
            </thead>
            <tbody>
              {data.particulars.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-slate-100 group hover:bg-blue-50/20">
                  <td className="align-top p-1 text-slate-400 font-mono text-xs">{idx + 1}.</td>
                  <td className="align-top p-1">
                    <AutoResizeTextarea
                      id={`pcv-field-desc-${idx}`}
                      value={item.description}
                      placeholder="e.g. Transportation fare for client site inspection, Office supplies, etc."
                      minHeight={26}
                      rows={1}
                      onChange={(e) => handleParticularChange(idx, "description", e.target.value)}
                      className={`px-1 py-0.5 text-xs focus:bg-white ${hasError(`particular_${idx}_desc`) ? "border border-rose-500 bg-rose-50" : ""}`}
                    />
                  </td>
                  <td className="align-top p-1 text-right">
                    <div className="flex items-center justify-end px-1">
                      <span className="text-slate-400 mr-1 text-[11px] pt-1">₱</span>
                      <input
                        id={`pcv-field-amount-${idx}`}
                        type="number"
                        step="any"
                        placeholder="0.00"
                        value={item.amount}
                        onChange={(e) =>
                          handleParticularChange(
                            idx,
                            "amount",
                            e.target.value === "" ? "" : parseFloat(e.target.value)
                          )
                        }
                        className={`w-24 text-right bg-transparent py-1 text-xs focus:bg-white font-mono font-semibold ${hasError(`particular_${idx}_amount`) ? "border border-rose-500 bg-rose-50" : ""}`}
                      />
                    </div>
                  </td>
                  <td data-html2canvas-ignore="true" className="align-top p-1 text-center no-print pt-1.5">
                    {data.particulars.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeParticularRow(idx)}
                        className="text-slate-300 hover:text-rose-600 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add Line button */}
          <div data-html2canvas-ignore="true" className="flex justify-end pt-3 border-t border-slate-200 no-print">
            <button
              type="button"
              onClick={addParticularRow}
              className="edgy-btn-outline px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
            >
              <Plus className="w-3.5 h-3.5 text-[#C9AB4C]" />
              <span>Add Line</span>
            </button>
          </div>
        </div>

        {/* 4 Signature Boxes */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
          {/* Requested by: */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-xs uppercase tracking-tight block mb-1">
              Requested by:
            </span>
            <div className={`w-full h-16 border-2 border-black flex flex-col justify-end p-1.5 bg-white ${hasError("requestedByName") ? "border-rose-500 bg-rose-50" : ""}`}>
              <input
                id="pcv-field-requested-by"
                type="text"
                placeholder="Employee Name"
                value={data.requestedByName}
                onChange={(e) => updateField("requestedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-rose-600 italic block mt-1 tracking-tight">
              to be signed by employee
            </span>
          </div>

          {/* Noted By: */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-xs uppercase tracking-tight block mb-1">
              Noted By:
            </span>
            <div className="w-full h-16 border-2 border-black flex flex-col justify-end p-1.5 bg-white">
              <input
                type="text"
                placeholder="Team Leader"
                value={data.notedByName}
                onChange={(e) => updateField("notedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-rose-600 italic block mt-1 tracking-tight">
              to be signed by TL
            </span>
          </div>

          {/* Approved By: */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-xs uppercase tracking-tight block mb-1">
              Approved By:
            </span>
            <div className="w-full h-16 border-2 border-black flex flex-col justify-end p-1.5 bg-white">
              <input
                type="text"
                placeholder="Finance Officer"
                value={data.approvedByName}
                onChange={(e) => updateField("approvedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-rose-600 italic block mt-1 tracking-tight">
              to be signed by Finance
            </span>
          </div>

          {/* Received By: */}
          <div className="flex flex-col items-center">
            <span className="font-bold text-xs uppercase tracking-tight block mb-1">
              Received By:
            </span>
            <div className="w-full h-16 border-2 border-black flex flex-col justify-end p-1.5 bg-white">
              <input
                type="text"
                placeholder="Payee Signature"
                value={data.receivedByName}
                onChange={(e) => updateField("receivedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-rose-600 italic block mt-1 tracking-tight">
              to be signed by payee upon receipt of cash
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-500 font-semibold tracking-wider">
            * PLEASE DO NOT CUT *
          </p>
        </div>
      </div>
    </div>
  );
}
