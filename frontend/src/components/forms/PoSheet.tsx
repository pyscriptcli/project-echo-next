"use client";

import React, { useEffect } from "react";
import { PoFormData, PoLineItem } from "@/types/forms/rfp";
import { PrimeLogo } from "./PrimeLogo";
import { Trash2, Plus } from "lucide-react";
import { AutoResizeTextarea } from "./AutoResizeTextarea";
import { DepartmentCombobox } from "./DepartmentCombobox";

interface PoSheetProps {
  data: PoFormData;
  onChange: (data: PoFormData) => void;
  validationErrors?: Record<string, string>;
}

export function PoSheet({ data, onChange, validationErrors }: PoSheetProps) {
  const hasError = (key: string) => Boolean(validationErrors?.[key]);

  const updateField = <K extends keyof PoFormData>(field: K, value: PoFormData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const handleItemChange = (
    index: number,
    field: keyof PoLineItem,
    val: string | number
  ) => {
    const updated = [...data.items];
    const current = { ...updated[index], [field]: val };

    const q = typeof current.quantity === "number" ? current.quantity : 0;
    const p = typeof current.unitPrice === "number" ? current.unitPrice : 0;
    current.total = Number((q * p).toFixed(2));

    updated[index] = current;

    // Recalculate subtotal
    const subtotal = updated.reduce((acc, it) => acc + (it.total || 0), 0);
    const vat = Number((subtotal * 0.12).toFixed(2));
    const ewt = Number((subtotal * 0.02).toFixed(2));
    const totalDue = Number((subtotal + vat - ewt).toFixed(2));

    onChange({
      ...data,
      items: updated,
      subtotal,
      vatAmount: vat,
      netOfVat: subtotal,
      withholdingTaxAmount: ewt,
      totalAmountDue: totalDue,
    });
  };

  const addItemRow = () => {
    const nextItemNo = data.items.length + 1;
    const newItem: PoLineItem = {
      id: `po-row-${Date.now()}`,
      itemNo: nextItemNo,
      details: "",
      unit: "pcs",
      quantity: 1,
      unitPrice: "",
      total: 0,
    };
    onChange({ ...data, items: [...data.items, newItem] });
  };

  const removeItemRow = (index: number) => {
    if (data.items.length <= 1) return;
    const updated = data.items
      .filter((_, i) => i !== index)
      .map((it, i) => ({ ...it, itemNo: i + 1 }));

    const subtotal = updated.reduce((acc, it) => acc + (it.total || 0), 0);
    const vat = Number((subtotal * 0.12).toFixed(2));
    const ewt = Number((subtotal * 0.02).toFixed(2));
    const totalDue = Number((subtotal + vat - ewt).toFixed(2));

    onChange({
      ...data,
      items: updated,
      subtotal,
      vatAmount: vat,
      netOfVat: subtotal,
      withholdingTaxAmount: ewt,
      totalAmountDue: totalDue,
    });
  };

  // Recalculate total amount due when individual tax fields are manually edited
  const handleTaxOverride = (
    field: "vatAmount" | "withholdingTaxAmount" | "netOfVat",
    value: number
  ) => {
    const vat = field === "vatAmount" ? value : data.vatAmount;
    const ewt = field === "withholdingTaxAmount" ? value : data.withholdingTaxAmount;
    const net = field === "netOfVat" ? value : data.netOfVat;
    const totalDue = Number((data.subtotal + vat - ewt).toFixed(2));

    onChange({
      ...data,
      [field]: value,
      totalAmountDue: totalDue,
    });
  };

  return (
    <div className="w-full flex justify-center py-2">
      <div
        id="po-printable-sheet"
        className="w-full max-w-[850px] bg-white text-black p-8 md:p-10 border-2 border-black shadow-2xl relative font-sans leading-tight text-xs"
        style={{ minHeight: "1100px" }}
      >
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 pb-4 border-b-2 border-black">
          {/* Company Branding */}
          <div className="flex items-start gap-3">
            <PrimeLogo className="h-12 w-auto shrink-0" />
            <div>
              <h1 className="text-[13px] font-bold tracking-tight text-slate-900 uppercase leading-snug">
                PROPERTY INTERACTIVE MARKETING ENTERPRISE REALTY CORP.
              </h1>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-tight">
                Unit 215 Pacific Century Tower, #1472 -1476 Quezon Ave., Bgry. South Triangle Quezon City
              </p>
              <p className="text-[10px] font-semibold text-slate-700 mt-0.5">
                Vat Reg TIN: 008-565-126-000
              </p>
            </div>
          </div>

          {/* PO Title & Meta */}
          <div className="text-left md:text-right shrink-0 w-full md:w-auto">
            <h2 className="font-sans font-black text-2xl text-[#003366] tracking-tight uppercase">
              PURCHASE ORDER
            </h2>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between md:justify-end gap-2">
                <span className="font-bold text-[11px] uppercase">DATE:</span>
                <input
                  id="po-field-date"
                  type="date"
                  value={data.date}
                  onChange={(e) => updateField("date", e.target.value)}
                  className={`bg-transparent border ${hasError("date") ? "border-rose-500 bg-rose-50" : "border-slate-300"} focus:border-[#003366] px-2 py-0.5 text-xs text-right font-medium`}
                />
              </div>
              <div className="flex items-center justify-between md:justify-end gap-2">
                <span className="font-bold text-[11px] uppercase">PURCHASE ORDER NO.:</span>
                <input
                  type="text"
                  placeholder="PO-2026-001"
                  value={data.poNumber}
                  onChange={(e) => updateField("poNumber", e.target.value)}
                  className="bg-transparent border border-slate-300 focus:border-[#003366] px-2 py-0.5 text-xs text-right font-mono font-bold w-36"
                />
              </div>
              <div className="flex items-center justify-between md:justify-end gap-2 relative">
                <span className="font-bold text-[11px] uppercase">DEPARTMENT:</span>
                <div className="w-36 text-right">
                  <DepartmentCombobox
                    id="po-field-department"
                    value={data.department}
                    onChange={(val) => updateField("department", val)}
                    placeholder="ex. Brokerage"
                    className="bg-transparent border border-slate-300 focus:border-[#003366] px-2 py-0.5 text-xs text-right font-medium w-full"
                    hasError={hasError("department")}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendor Information Section */}
        <div className="mt-4 border border-black">
          <div className="bg-[#003366] text-white px-3 py-1 font-bold text-xs uppercase tracking-wider">
            VENDOR INFORMATION
          </div>
          <div className="p-2.5 grid grid-cols-12 gap-2 text-xs">
            {/* Vendor Name */}
            <div className="col-span-8 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                VENDOR NAME:
              </span>
              <input
                id="po-field-vendor-name"
                type="text"
                placeholder="Company / Vendor Name"
                value={data.vendorName}
                onChange={(e) => updateField("vendorName", e.target.value)}
                className={`w-full bg-transparent font-bold text-xs focus:outline-none focus:bg-blue-50/40 px-1 ${hasError("vendorName") ? "border-b-2 border-rose-500 bg-rose-50/50" : ""}`}
              />
            </div>

            {/* Account Manager */}
            <div className="col-span-4 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                ACCOUNT MANAGER:
              </span>
              <input
                type="text"
                placeholder="Sales Rep / Contact Person"
                value={data.accountManager}
                onChange={(e) => updateField("accountManager", e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/40 px-1"
              />
            </div>

            {/* Address */}
            <div className="col-span-12 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                ADDRESS:
              </span>
              <input
                type="text"
                placeholder="Vendor office address"
                value={data.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/40 px-1"
              />
            </div>

            {/* TIN */}
            <div className="col-span-12 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                TIN:
              </span>
              <input
                type="text"
                placeholder="000-000-000-000"
                value={data.tin}
                onChange={(e) => updateField("tin", e.target.value)}
                className="w-full bg-transparent font-mono text-xs focus:outline-none focus:bg-blue-50/40 px-1"
              />
            </div>

            {/* Contact No & Email */}
            <div className="col-span-6 flex items-center gap-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                CONTACT NO:
              </span>
              <input
                type="text"
                placeholder="e.g. 0917-123-4567"
                value={data.contactNo}
                onChange={(e) => updateField("contactNo", e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/40 px-1"
              />
            </div>

            <div className="col-span-6 flex items-center gap-1.5">
              <span className="font-bold text-[10px] uppercase tracking-wide text-slate-500 shrink-0">
                EMAIL ADDRESS:
              </span>
              <input
                type="email"
                placeholder="vendor@company.com"
                value={data.emailAddress}
                onChange={(e) => updateField("emailAddress", e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none focus:bg-blue-50/40 px-1"
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mt-4 border border-black overflow-hidden">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white">
                <th className="p-1.5 text-center font-bold uppercase tracking-wider w-14 border-r border-blue-900">
                  Item No.
                </th>
                <th className="p-1.5 text-center font-bold uppercase tracking-wider border-r border-blue-900">
                  Details
                </th>
                <th className="p-1.5 text-center font-bold uppercase tracking-wider w-16 border-r border-blue-900">
                  Unit
                </th>
                <th className="p-1.5 text-center font-bold uppercase tracking-wider w-20 border-r border-blue-900">
                  Quantity
                </th>
                <th className="p-1.5 text-center font-bold uppercase tracking-wider w-28 border-r border-blue-900">
                  Unit Price
                </th>
                <th className="p-1.5 text-center font-bold uppercase tracking-wider w-28">
                  Total
                </th>
                <th
                  data-html2canvas-ignore="true"
                  className="w-8 p-1 text-center font-normal no-print"
                ></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b border-black hover:bg-blue-50/30">
                  {/* Item No */}
                  <td className="align-top p-1.5 text-center font-mono text-xs border-r border-black font-semibold">
                    {idx + 1}
                  </td>

                  {/* Details */}
                  <td className="align-top p-1 border-r border-black">
                    <AutoResizeTextarea
                      id={`po-field-details-${idx}`}
                      value={item.details}
                      placeholder="Item description / specifications"
                      minHeight={26}
                      rows={1}
                      onChange={(e) => handleItemChange(idx, "details", e.target.value)}
                      className={`px-2 py-1 text-xs focus:bg-white ${hasError(`item_${idx}_details`) ? "border border-rose-500 bg-rose-50" : ""}`}
                    />
                  </td>

                  {/* Unit */}
                  <td className="align-top p-1 border-r border-black">
                    <input
                      type="text"
                      value={item.unit}
                      placeholder="pcs"
                      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                      className="w-full text-center bg-transparent py-1 text-xs focus:bg-white"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="align-top p-1 border-r border-black">
                    <input
                      id={`po-field-qty-${idx}`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          "quantity",
                          e.target.value === "" ? "" : parseFloat(e.target.value)
                        )
                      }
                      className={`w-full text-center bg-transparent py-1 text-xs focus:bg-white font-mono ${hasError(`item_${idx}_qty`) ? "border border-rose-500 bg-rose-50" : ""}`}
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="align-top p-1 border-r border-black">
                    <div className="flex items-center px-1">
                      <span className="text-slate-400 mr-1 text-[11px] pt-1">₱</span>
                      <input
                        id={`po-field-price-${idx}`}
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
                        className={`w-full text-right bg-transparent py-1 text-xs focus:bg-white font-mono ${hasError(`item_${idx}_price`) ? "border border-rose-500 bg-rose-50" : ""}`}
                      />
                    </div>
                  </td>

                  {/* Total */}
                  <td className="align-top p-1 text-right font-mono font-bold text-xs pr-3 pt-2">
                    ₱{Number(item.total || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Delete */}
                  <td
                    data-html2canvas-ignore="true"
                    className="align-top p-1 text-center no-print pt-1.5"
                  >
                    {data.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
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
        </div>

        {/* Add Row Button */}
        <div data-html2canvas-ignore="true" className="flex justify-end mt-2 no-print">
          <button
            type="button"
            onClick={addItemRow}
            className="edgy-btn-outline px-3 py-1 text-xs flex items-center gap-1.5 cursor-pointer font-semibold"
          >
            <Plus className="w-3.5 h-3.5 text-[#C9AB4C]" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Notes & Financial Calculation Section */}
        <div className="mt-3 grid grid-cols-12 gap-4 items-start">
          {/* Additional Notes (Left Side) */}
          <div className="col-span-7 border border-black">
            <div className="bg-[#003366] text-white px-3 py-1 font-bold text-xs uppercase tracking-wider">
              Additional Notes:
            </div>
            <div className="p-2">
              <AutoResizeTextarea
                value={data.additionalNotes}
                rows={4}
                minHeight={80}
                placeholder="Payment terms, delivery schedules, warranty conditions, etc."
                onChange={(e) => updateField("additionalNotes", e.target.value)}
                className="text-xs p-1 focus:bg-blue-50/30"
              />
            </div>
          </div>

          {/* Tax Calculation Box (Right Side) */}
          <div className="col-span-5 border border-black">
            <table className="w-full text-xs border-collapse">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1.5 font-bold uppercase text-[11px] text-slate-700">
                    Total
                  </td>
                  <td className="p-1.5 text-right font-mono font-bold">
                    ₱{Number(data.subtotal || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1.5 font-medium text-[11px] text-slate-600">
                    VAT (12%)
                  </td>
                  <td className="p-1 text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-slate-400 mr-1 text-[10px]">₱</span>
                      <input
                        type="number"
                        step="any"
                        value={data.vatAmount}
                        onChange={(e) => handleTaxOverride("vatAmount", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right bg-transparent font-mono text-xs focus:bg-blue-50/40 py-0.5"
                      />
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1.5 font-medium text-[11px] text-slate-600">
                    Net of Vat
                  </td>
                  <td className="p-1 text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-slate-400 mr-1 text-[10px]">₱</span>
                      <input
                        type="number"
                        step="any"
                        value={data.netOfVat}
                        onChange={(e) => handleTaxOverride("netOfVat", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right bg-transparent font-mono text-xs focus:bg-blue-50/40 py-0.5"
                      />
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1.5 font-medium text-[11px] text-slate-600">
                    Withholding Tax (2%)
                  </td>
                  <td className="p-1 text-right">
                    <div className="flex items-center justify-end">
                      <span className="text-slate-400 mr-1 text-[10px]">₱</span>
                      <input
                        type="number"
                        step="any"
                        value={data.withholdingTaxAmount}
                        onChange={(e) => handleTaxOverride("withholdingTaxAmount", parseFloat(e.target.value) || 0)}
                        className="w-24 text-right bg-transparent font-mono text-xs focus:bg-blue-50/40 py-0.5"
                      />
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-50 font-black">
                  <td className="p-2 font-bold uppercase text-xs text-[#003366]">
                    TOTAL AMOUNT DUE
                  </td>
                  <td className="p-2 text-right font-bebas text-xl text-[#003366] tracking-wider pr-2">
                    ₱{Number(data.totalAmountDue || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4 Signature Blocks */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t-2 border-black">
          {/* Prepared By */}
          <div className="text-center">
            <span className="font-bold text-[11px] block uppercase text-slate-800">
              Prepared By:
            </span>
            <div className="mt-6 border-b border-black pb-1">
              <input
                id="po-field-prepared-by"
                type="text"
                placeholder="Employee Name"
                value={data.preparedByName}
                onChange={(e) => updateField("preparedByName", e.target.value)}
                className={`w-full text-center bg-transparent text-xs font-semibold focus:outline-none ${hasError("preparedByName") ? "border-b-2 border-rose-500 bg-rose-50" : ""}`}
              />
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-1">
              Signature Over Printed Name/Date
            </span>
          </div>

          {/* Noted By */}
          <div className="text-center">
            <span className="font-bold text-[11px] block uppercase text-slate-800">
              Noted By:
            </span>
            <div className="mt-6 border-b border-black pb-1">
              <input
                type="text"
                placeholder="Dept Head / TL"
                value={data.notedByName}
                onChange={(e) => updateField("notedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-1">
              Signature Over Printed Name/Date
            </span>
          </div>

          {/* Approved By */}
          <div className="text-center">
            <span className="font-bold text-[11px] block uppercase text-slate-800">
              Approved By:
            </span>
            <div className="mt-6 border-b border-black pb-1">
              <input
                type="text"
                placeholder="Finance / Management"
                value={data.approvedByName}
                onChange={(e) => updateField("approvedByName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-1">
              Signature Over Printed Name/Date
            </span>
          </div>

          {/* Conforme */}
          <div className="text-center">
            <span className="font-bold text-[11px] block uppercase text-slate-800">
              Conforme:
            </span>
            <div className="mt-6 border-b border-black pb-1">
              <input
                type="text"
                placeholder="Supplier Representative"
                value={data.conformeName}
                onChange={(e) => updateField("conformeName", e.target.value)}
                className="w-full text-center bg-transparent text-xs font-semibold focus:outline-none"
              />
            </div>
            <span className="text-[9px] text-slate-400 uppercase tracking-tight block mt-1">
              Signature Over Printed Name/Date
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
