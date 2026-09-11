"use client";

import React, { useState } from "react";
import { RfpFormData, RfpLineItem, PaymentMethod, UrgencyLevel } from "@/types/forms/rfp";
import { PrimeLogo } from "./PrimeLogo";
import { Trash2, Plus, PenTool, CheckCircle, HelpCircle, Check } from "lucide-react";
import { SignatureModal } from "./SignatureModal";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { DepartmentCombobox } from "./DepartmentCombobox";

interface RfpSheetProps {
  data: RfpFormData;
  onChange: (data: RfpFormData) => void;
  validationErrors?: Record<string, string>;
}

export function RfpSheet({ data, onChange, validationErrors }: RfpSheetProps) {
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  const hasError = (key: string) => Boolean(validationErrors?.[key]);

  // Field updater
  const updateField = <K extends keyof RfpFormData>(field: K, value: RfpFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  // Single-select toggle for payment methods (mutually exclusive checkboxes)
  const handlePaymentMethodToggle = (method: PaymentMethod) => {
    const isAlreadySelected = data.paymentMethod === method;
    const next = isAlreadySelected ? "" : method;
    onChange({
      ...data,
      paymentMethod: next as PaymentMethod,
      paymentMethods: next ? [next] : [],
    });
  };

  // Single-select toggle for remarks urgency (mutually exclusive checkboxes)
  const handleUrgencyToggle = (level: UrgencyLevel) => {
    const isAlreadySelected = data.urgency === level;
    const next = isAlreadySelected ? "" : level;
    onChange({
      ...data,
      urgency: next as UrgencyLevel,
      urgencyOptions: next ? [next] : [],
    });
  };

  // Line item handlers
  const handleItemChange = (index: number, key: keyof RfpLineItem, val: any) => {
    const updatedItems = [...data.items];
    const current = { ...updatedItems[index], [key]: val };

    // Auto-calculate amount
    const qtyNum = typeof current.qty === "number" ? current.qty : parseFloat(String(current.qty)) || 0;
    const priceNum = typeof current.unitPrice === "number" ? current.unitPrice : parseFloat(String(current.unitPrice)) || 0;
    current.amount = qtyNum * priceNum;

    updatedItems[index] = current;

    // Recalculate total
    const newTotal = updatedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    onChange({
      ...data,
      items: updatedItems,
      totalAmount: newTotal,
    });
  };

  const addItemRow = () => {
    const newItem: RfpLineItem = {
      id: Math.random().toString(36).substring(2, 9),
      description: "",
      qty: "",
      unit: "",
      unitPrice: "",
      amount: 0,
    };
    onChange({
      ...data,
      items: [...data.items, newItem],
    });
  };

  const removeItemRow = (index: number) => {
    if (data.items.length <= 1) return;
    const updated = data.items.filter((_, i) => i !== index);
    const newTotal = updated.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    onChange({
      ...data,
      items: updated,
      totalAmount: newTotal,
    });
  };

  const handleSignatureSave = (signatureDataUrl: string, type: "draw" | "upload") => {
    onChange({
      ...data,
      signatureDataUrl,
      signatureType: type,
    });
  };

  return (
    <div className="w-full flex justify-center py-2">
      {/* Printable Sheet Wrapper */}
      <div
        id="rfp-printable-sheet"
        className="w-full max-w-[850px] bg-[#FFFCFB] text-black p-8 md:p-10 border-2 border-black shadow-2xl relative font-sans leading-tight text-xs"
        style={{ minHeight: "1100px" }}
      >
        {/* Top Header Grid */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 pb-4">
          {/* Company Name */}
          <div className="text-center md:text-left pt-1">
            <h1 className="text-base md:text-[17px] font-bold tracking-tight text-slate-900 uppercase">
              Property Interactive Marketing Enterprise
            </h1>
            <h2 className="text-sm md:text-[15px] font-bold tracking-tight text-slate-900 uppercase mt-0.5">
              Realty Corp
            </h2>
          </div>

          {/* Logo & Title Banner */}
          <div className="flex flex-col items-end w-full md:w-auto">
            <PrimeLogo className="h-11 mb-2" />
            <div className="w-full md:w-64 bg-[#0f2a59] text-white py-1.5 px-4 text-center">
              <span className="text-xs md:text-sm font-black tracking-wider uppercase">
                Request for Payment
              </span>
            </div>
          </div>
        </div>

        {/* Header Fields (Date, Payee, Department) */}
        <div className="grid grid-cols-12 gap-3 my-3">
          {/* Date */}
          <div
            id="field-date"
            className={`col-span-12 sm:col-span-4 border-2 ${
              hasError("date") ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40" : "border-black"
            } rounded-none p-2 flex items-center gap-2 transition-all`}
          >
            <label className="font-bold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>DATE:</span>
              {hasError("date") && <span className="text-rose-600 text-xs font-bold">*</span>}
            </label>
            <input
              type="date"
              value={data.date}
              onChange={(e) => updateField("date", e.target.value)}
              className="w-full bg-transparent font-medium text-xs focus:outline-none focus:bg-blue-50/50 rounded-none px-1"
            />
          </div>

          {/* Payee */}
          <div
            id="field-payee"
            className={`col-span-12 sm:col-span-8 md:col-span-5 border-2 ${
              hasError("payee") ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40" : "border-black"
            } rounded-none p-2 flex items-start gap-2 transition-all`}
          >
            <label className="font-bold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1 pt-0.5">
              <span>PAYEE:</span>
              {hasError("payee") && <span className="text-rose-600 text-xs font-bold">*</span>}
            </label>
            <AutoResizeTextarea
              rows={1}
              minHeight={20}
              placeholder="Name of recipient / vendor"
              value={data.payee}
              onChange={(e) => updateField("payee", e.target.value)}
              className="w-full bg-transparent font-medium text-xs focus:outline-none focus:bg-blue-50/50 rounded-none px-1"
            />
          </div>

          {/* Department */}
          <div
            id="field-department"
            className={`col-span-12 sm:col-span-12 md:col-span-3 border-2 ${
              hasError("department") ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40" : "border-black"
            } rounded-none p-2 flex items-center gap-2 transition-all relative`}
          >
            <label className="font-bold text-xs uppercase tracking-wider shrink-0 flex items-center gap-1">
              <span>DEPARTMENT:</span>
              {hasError("department") && <span className="text-rose-600 text-xs font-bold">*</span>}
            </label>
            <DepartmentCombobox
              id="field-department-input"
              value={data.department}
              onChange={(val) => updateField("department", val)}
              placeholder="ex. Brokerage"
              className="w-full bg-transparent font-medium text-xs focus:outline-none focus:bg-blue-50/50 rounded-none px-1"
              hasError={hasError("department")}
            />
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-4 border-2 border-black overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-[#FFFCFB]">
                <th className="border-r border-black p-2 text-center font-bold uppercase tracking-wider">
                  ITEMS/DESCRIPTION
                </th>
                <th className="border-r border-black p-2 text-center font-bold uppercase tracking-wider w-16">
                  QTY
                </th>
                <th className="border-r border-black p-2 text-center font-bold uppercase tracking-wider w-20">
                  UNIT
                </th>
                <th className="border-r border-black p-2 text-center font-bold uppercase tracking-wider w-28">
                  UNIT PRICE
                </th>
                <th className="p-2 text-center font-bold uppercase tracking-wider w-28">
                  AMOUNT
                </th>
                <th
                  data-html2canvas-ignore="true"
                  className="w-8 border-l border-black p-1 text-center font-normal no-print"
                ></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  className="border-b border-black group hover:bg-blue-50/30 transition-colors"
                >
                  {/* Description */}
                  <td className={`align-top border-r border-black p-1 ${hasError(`item_${idx}_desc`) ? "bg-rose-50/50" : ""}`}>
                    <AutoResizeTextarea
                      id={`field-item-desc-${idx}`}
                      placeholder={`Line item #${idx + 1}`}
                      value={item.description}
                      minHeight={26}
                      rows={1}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      className={`w-full px-2 py-1 text-xs focus:bg-[#FFFCFB] ${
                        hasError(`item_${idx}_desc`) ? "ring-1 ring-rose-500 bg-rose-50" : ""
                      }`}
                    />
                  </td>

                  {/* Qty */}
                  <td className={`align-top border-r border-black p-1 ${hasError(`item_${idx}_qty`) ? "bg-rose-50/50" : ""}`}>
                    <input
                      id={`field-item-qty-${idx}`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={item.qty}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          "qty",
                          e.target.value === "" ? "" : parseFloat(e.target.value)
                        )
                      }
                      className={`w-full text-center bg-transparent px-1 py-1 text-xs focus:outline-none focus:bg-[#FFFCFB] font-mono ${
                        hasError(`item_${idx}_qty`) ? "ring-1 ring-rose-500 bg-rose-50 font-bold text-rose-700" : ""
                      }`}
                    />
                  </td>

                  {/* Unit - Plain text box no presets */}
                  <td className={`align-top border-r border-black p-1 ${hasError(`item_${idx}_unit`) ? "bg-rose-50/50" : ""}`}>
                    <input
                      id={`field-item-unit-${idx}`}
                      type="text"
                      value={item.unit}
                      placeholder=""
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className={`w-full text-center bg-transparent px-1 py-1 text-xs focus:outline-none focus:bg-[#FFFCFB] ${
                        hasError(`item_${idx}_unit`) ? "ring-1 ring-rose-500 bg-rose-50 font-bold text-rose-700" : ""
                      }`}
                    />
                  </td>

                  {/* Unit Price */}
                  <td className={`align-top border-r border-black p-1 ${hasError(`item_${idx}_price`) ? "bg-rose-50/50" : ""}`}>
                    <div className="flex items-center px-1">
                      <span className="text-slate-400 mr-1 text-[11px] pt-1">₱</span>
                      <input
                        id={`field-item-price-${idx}`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            "unitPrice",
                            e.target.value === "" ? "" : parseFloat(e.target.value)
                          )
                        }
                        className={`w-full text-right bg-transparent py-1 text-xs focus:outline-none focus:bg-[#FFFCFB] font-mono ${
                          hasError(`item_${idx}_price`) ? "ring-1 ring-rose-500 bg-rose-50 font-bold text-rose-700" : ""
                        }`}
                      />
                    </div>
                  </td>

                  {/* Amount (Calculated) */}
                  <td className="align-top p-1 text-right font-bebas text-lg text-slate-900 tracking-wide pr-3 pt-1">
                    {item.amount > 0 ? (
                      <span>
                        ₱{item.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-slate-300 font-sans text-xs">-</span>
                    )}
                  </td>

                  {/* Delete row action */}
                  <td
                    data-html2canvas-ignore="true"
                    className="align-top border-l border-black p-1 text-center no-print pt-1.5"
                  >
                    {data.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        className="p-1 text-slate-300 hover:text-rose-600 transition-colors"
                        title="Remove row"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {/* Total Amount Row */}
              <tr className="border-t-2 border-black bg-[#FFFCFB] font-bold">
                <td colSpan={4} className="border-r border-black p-2 text-right uppercase tracking-wider">
                  TOTAL AMOUNT
                </td>
                <td className="p-2 text-right font-bebas text-2xl text-[#003366] tracking-wider pr-3">
                  ₱{data.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td data-html2canvas-ignore="true" className="border-l border-black no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Add Row helper in DOM */}
        <div data-html2canvas-ignore="true" className="flex justify-end mt-2 no-print">
          <button
            type="button"
            onClick={addItemRow}
            className="edgy-btn-outline px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-[#C9AB4C]" />
            <span>Add Row</span>
          </button>
        </div>

        {/* Purpose Box */}
        <div
          id="field-purpose"
          className={`mt-3 border-2 ${
            hasError("purpose") ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40" : "border-black"
          } rounded-none p-3 transition-all`}
        >
          <label className="font-bold text-xs uppercase tracking-wider block mb-1 flex items-center justify-between">
            <span>Purpose:</span>
            {hasError("purpose") && (
              <span className="text-rose-600 text-[11px] font-bold lowercase italic">* required</span>
            )}
          </label>
          <AutoResizeTextarea
            rows={2}
            minHeight={48}
            placeholder="State the detailed reason or business purpose for this payment request..."
            value={data.purpose}
            onChange={(e) => updateField("purpose", e.target.value)}
            className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/30 rounded-none p-1 leading-relaxed"
          />
        </div>

        {/* Payment Details & Urgency Section */}
        <div className="mt-4 grid grid-cols-12 gap-4">
          {/* Payment Details (Left Side) */}
          <div className="col-span-12 md:col-span-7">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs uppercase tracking-wider block">
                Payment Details:
              </span>
              {hasError("paymentMethods") && (
                <span className="text-rose-600 text-[11px] font-bold italic">* Check at least one</span>
              )}
            </div>

            {/* Multi-Select Checkboxes for Payment Method */}
            <div
              id="field-payment-methods"
              className={`flex flex-wrap items-center gap-5 mb-3 p-2 border ${
                hasError("paymentMethods")
                  ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40"
                  : "border-transparent"
              } transition-all`}
            >
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("cash")}
                  onChange={() => handlePaymentMethodToggle("cash")}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${
                    (data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("cash")
                      ? "bg-[#181A1D] border-[#181A1D]"
                      : "bg-[#FFFCFB]"
                  }`}
                >
                  {(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("cash") && (
                    <Check className="w-3 h-3 text-white stroke-[3.5]" />
                  )}
                </div>
                <span className="text-xs font-semibold">Cash</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("check")}
                  onChange={() => handlePaymentMethodToggle("check")}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${
                    (data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("check")
                      ? "bg-[#181A1D] border-[#181A1D]"
                      : "bg-[#FFFCFB]"
                  }`}
                >
                  {(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("check") && (
                    <Check className="w-3 h-3 text-white stroke-[3.5]" />
                  )}
                </div>
                <span className="text-xs font-semibold">Check</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("online")}
                  onChange={() => handlePaymentMethodToggle("online")}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${
                    (data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("online")
                      ? "bg-[#181A1D] border-[#181A1D]"
                      : "bg-[#FFFCFB]"
                  }`}
                >
                  {(data.paymentMethods || (data.paymentMethod ? [data.paymentMethod] : [])).includes("online") && (
                    <Check className="w-3 h-3 text-white stroke-[3.5]" />
                  )}
                </div>
                <span className="text-xs font-semibold">Online Payment/Bank Transfer</span>
              </label>
            </div>

            {/* Bank details lines */}
            <div className="space-y-2 mt-3">
              <div
                id="field-bank"
                className={`flex items-center gap-2 border-b ${
                  hasError("bank") ? "border-rose-500 bg-rose-50/40" : "border-black"
                } pb-0.5 px-1 transition-all`}
              >
                <span className="font-semibold text-xs min-w-[100px] flex items-center justify-between">
                  <span>Bank:</span>
                  {hasError("bank") && <span className="text-rose-600 text-xs font-bold">*</span>}
                </span>
                <input
                  type="text"
                  placeholder="e.g. BDO, BPI, Metrobank"
                  value={data.bank}
                  onChange={(e) => updateField("bank", e.target.value)}
                  className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/50 px-1"
                />
              </div>

              <div
                id="field-account-name"
                className={`flex items-center gap-2 border-b ${
                  hasError("accountName") ? "border-rose-500 bg-rose-50/40" : "border-black"
                } pb-0.5 px-1 transition-all`}
              >
                <span className="font-semibold text-xs min-w-[100px] flex items-center justify-between">
                  <span>Account Name:</span>
                  {hasError("accountName") && <span className="text-rose-600 text-xs font-bold">*</span>}
                </span>
                <input
                  type="text"
                  placeholder="Account holder name"
                  value={data.accountName}
                  onChange={(e) => updateField("accountName", e.target.value)}
                  className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/50 px-1"
                />
              </div>

              <div
                id="field-account-number"
                className={`flex items-center gap-2 border-b ${
                  hasError("accountNumber") ? "border-rose-500 bg-rose-50/40" : "border-black"
                } pb-0.5 px-1 transition-all`}
              >
                <span className="font-semibold text-xs min-w-[100px] flex items-center justify-between">
                  <span>Account Number:</span>
                  {hasError("accountNumber") && <span className="text-rose-600 text-xs font-bold">*</span>}
                </span>
                <input
                  type="text"
                  placeholder="Account number"
                  value={data.accountNumber}
                  onChange={(e) => updateField("accountNumber", e.target.value)}
                  className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/50 px-1 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Urgency & Date Needed (Right Side) */}
          <div className="col-span-12 md:col-span-5 flex flex-col justify-between pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-slate-200 pt-3 md:pt-0">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs uppercase tracking-wider block">
                  Remarks:
                </span>
                {hasError("remarks") && (
                  <span className="text-rose-600 text-[11px] font-bold italic">* Check option</span>
                )}
              </div>

              {/* Multi-Select Checkboxes for Remarks / Urgency */}
              <div
                id="field-remarks"
                className={`flex items-center gap-6 mb-4 p-2 border ${
                  hasError("remarks")
                    ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40"
                    : "border-transparent"
                } transition-all`}
              >
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("urgent")}
                    onChange={() => handleUrgencyToggle("urgent")}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${
                      (data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("urgent")
                        ? "bg-[#181A1D] border-[#181A1D]"
                        : "bg-[#FFFCFB]"
                    }`}
                  >
                    {(data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("urgent") && (
                      <Check className="w-3 h-3 text-white stroke-[3.5]" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-rose-700">Urgent</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={(data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("not_urgent")}
                    onChange={() => handleUrgencyToggle("not_urgent")}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 border-2 border-black flex items-center justify-center transition-colors ${
                      (data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("not_urgent")
                        ? "bg-[#181A1D] border-[#181A1D]"
                        : "bg-[#FFFCFB]"
                    }`}
                  >
                    {(data.urgencyOptions || (data.urgency ? [data.urgency] : [])).includes("not_urgent") && (
                      <Check className="w-3 h-3 text-white stroke-[3.5]" />
                    )}
                  </div>
                  <span className="text-xs font-semibold">Not urgent</span>
                </label>
              </div>
            </div>

            <div
              id="field-date-needed"
              className={`border-2 ${
                hasError("dateNeeded")
                  ? "border-rose-500 bg-rose-50/40 ring-2 ring-rose-400/40"
                  : "border-black bg-[#FFFCFB]"
              } rounded-none p-2.5 transition-all`}
            >
              <label className="font-bold text-[11px] uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Date Needed (M-D-Y):</span>
                {hasError("dateNeeded") && (
                  <span className="text-rose-600 text-[11px] font-bold lowercase italic">* required</span>
                )}
              </label>
              <input
                type="date"
                value={data.dateNeeded}
                onChange={(e) => updateField("dateNeeded", e.target.value)}
                className="w-full bg-[#FFFCFB] border border-slate-300 rounded-none p-1 text-xs font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Signatures & Workflow Section */}
        <div className="mt-8 pt-4 border-t-2 border-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Requested By */}
            <div className="flex flex-col">
              <div className="h-6 mb-2 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Requested By:
                </span>
                {hasError("signature") && (
                  <span className="text-rose-600 text-[11px] font-bold italic">* Required</span>
                )}
              </div>

              {/* Signature display / interactive button */}
              <div
                id="field-signature"
                onClick={() => setIsSignatureModalOpen(true)}
                className={`h-20 border-b-2 ${
                  hasError("signature")
                    ? "border-rose-500 bg-rose-50/60 ring-2 ring-rose-400/50"
                    : "border-black"
                } flex flex-col items-center justify-end pb-1 cursor-pointer hover:bg-blue-50/30 transition-colors group relative`}
                title="Click to sign or update signature"
              >
                {data.signatureDataUrl ? (
                  <img
                    src={data.signatureDataUrl}
                    alt="Requestor signature"
                    className="max-h-16 max-w-full object-contain mb-1"
                  />
                ) : (
                  <div
                    data-html2canvas-ignore="true"
                    className={`text-[11px] ${
                      hasError("signature")
                        ? "text-rose-600 font-bold animate-pulse"
                        : "text-blue-600 font-medium"
                    } flex items-center gap-1 mb-2`}
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>{hasError("signature") ? "Signature Required - Click to Sign" : "Click to Add Signature"}</span>
                  </div>
                )}
                <span
                  data-html2canvas-ignore="true"
                  className="text-[9px] text-slate-400 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Edit
                </span>
              </div>

              <div
                id="field-requested-by-name"
                className="text-center mt-1.5 transition-all"
              >
                <span className="text-[10px] text-slate-600 block flex items-center justify-center gap-1">
                  <span>Signature Over Printed Name</span>
                  {hasError("requestedByName") && <span className="text-rose-600 font-bold">*</span>}
                </span>
                <div className="h-7 flex items-center justify-center mt-1">
                  <input
                    type="text"
                    placeholder="Requestor Full Name"
                    value={data.requestedByName}
                    onChange={(e) => updateField("requestedByName", e.target.value)}
                    className={`w-full text-center font-bold text-xs uppercase bg-transparent focus:outline-none border-b ${
                      hasError("requestedByName") ? "border-rose-500 bg-rose-50/40 ring-1 ring-rose-400" : "border-dashed border-slate-300"
                    } pb-0.5`}
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1 border-b border-black pb-0.5 h-7">
                <span className="font-bold text-[11px] whitespace-nowrap">Remarks:</span>
                <input
                  type="text"
                  placeholder="Optional notes"
                  value={data.requestedByRemarks}
                  onChange={(e) => updateField("requestedByRemarks", e.target.value)}
                  className="w-full bg-transparent text-[11px] focus:outline-none px-1"
                />
              </div>
            </div>

            {/* Column 2: Approved By (Team Leader/ Co-TL) */}
            <div className="flex flex-col">
              <div className="h-6 mb-2 flex items-center">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Approved By:
                </span>
              </div>

              <div className="h-20 border-b-2 border-black flex items-center justify-center">
                <span
                  data-pdf-ignore="true"
                  data-html2canvas-ignore="true"
                  className="text-slate-400 text-[11px] italic font-medium select-none"
                >
                  (Approval in ClickUp)
                </span>
              </div>

              <div className="text-center mt-1.5">
                <span className="text-[10px] text-slate-600 block">
                  Signature Over Printed Name
                </span>
                <div className="h-7 flex items-center justify-center mt-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Team Leader/ Co-TL
                  </span>
                </div>
              </div>

              <div className="mt-3 h-7 border-b border-transparent">
                {/* Visual alignment spacer matching Column 1's Remarks row */}
              </div>
            </div>

            {/* Column 3: Received By (Finance Officer) */}
            <div className="flex flex-col">
              <div className="h-6 mb-2 flex items-center">
                <span className="font-bold text-xs uppercase tracking-wider">
                  Received By:
                </span>
              </div>

              <div className="h-20 border-b-2 border-black flex items-center justify-center">
                <span
                  data-pdf-ignore="true"
                  data-html2canvas-ignore="true"
                  className="text-slate-400 text-[11px] italic font-medium select-none"
                >
                  (Disbursement in Finance)
                </span>
              </div>

              <div className="text-center mt-1.5">
                <span className="text-[10px] text-slate-600 block">
                  Signature Over Printed Name
                </span>
                <div className="h-7 flex items-center justify-center mt-1">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Finance Officer
                  </span>
                </div>
              </div>

              <div className="mt-3 h-7 border-b border-transparent">
                {/* Visual alignment spacer matching Column 1's Remarks row */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={handleSignatureSave}
        currentSignature={data.signatureDataUrl}
      />
    </div>
  );
}
