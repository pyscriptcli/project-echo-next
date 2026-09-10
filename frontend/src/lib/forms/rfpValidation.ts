import { RfpFormData, PoFormData, PcvFormData } from "@/types/forms/rfp";

export interface ValidationErrorItem {
  id: string; // DOM element ID to focus and scroll to
  field: string;
  label: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  items: ValidationErrorItem[];
}

export function validateRfpForm(data: RfpFormData): ValidationResult {
  const items: ValidationErrorItem[] = [];
  const errors: Record<string, string> = {};

  // 1. Payee
  if (!data.payee?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-payee",
      field: "payee",
      label: "Payee Name",
      message: "Payee (vendor/recipient) name is required.",
    };
    items.push(item);
    errors["payee"] = item.message;
  }

  // 2. Date
  if (!data.date?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-date",
      field: "date",
      label: "Document Date",
      message: "Document date is required.",
    };
    items.push(item);
    errors["date"] = item.message;
  }

  // 3. Department
  if (!data.department?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-department",
      field: "department",
      label: "Department",
      message: "Department is required.",
    };
    items.push(item);
    errors["department"] = item.message;
  }

  // 4. Line items
  const activeItems = (data.items || []).filter(
    (it) => it.description?.trim() || it.qty !== "" || it.unit?.trim() || it.unitPrice !== ""
  );

  if (activeItems.length === 0) {
    const item: ValidationErrorItem = {
      id: "field-item-desc-0",
      field: "items",
      label: "Line Items",
      message: "At least one complete line item (Description, Qty, Unit, Unit Price) is required.",
    };
    items.push(item);
    errors["items"] = item.message;
  } else {
    activeItems.forEach((it, idx) => {
      if (!it.description?.trim()) {
        const item: ValidationErrorItem = {
          id: `field-item-desc-${idx}`,
          field: `item_${idx}_desc`,
          label: `Line #${idx + 1} Description`,
          message: `Description is required for line item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_desc`] = item.message;
      }
      if (it.qty === "" || Number(it.qty) <= 0) {
        const item: ValidationErrorItem = {
          id: `field-item-qty-${idx}`,
          field: `item_${idx}_qty`,
          label: `Line #${idx + 1} Quantity`,
          message: `Quantity (> 0) is required for line item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_qty`] = item.message;
      }
      if (!it.unit?.trim()) {
        const item: ValidationErrorItem = {
          id: `field-item-unit-${idx}`,
          field: `item_${idx}_unit`,
          label: `Line #${idx + 1} Unit`,
          message: `Unit is required for line item #${idx + 1} (e.g. pcs, lot, set).`,
        };
        items.push(item);
        errors[`item_${idx}_unit`] = item.message;
      }
      if (it.unitPrice === "" || Number(it.unitPrice) <= 0) {
        const item: ValidationErrorItem = {
          id: `field-item-price-${idx}`,
          field: `item_${idx}_price`,
          label: `Line #${idx + 1} Unit Price`,
          message: `Unit price (> 0) is required for line item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_price`] = item.message;
      }
    });
  }

  // Check total amount
  if (!data.totalAmount || data.totalAmount <= 0) {
    if (!errors["items"]) {
      const item: ValidationErrorItem = {
        id: "field-item-price-0",
        field: "totalAmount",
        label: "Total Amount",
        message: "Total amount must be greater than 0.00.",
      };
      items.push(item);
      errors["totalAmount"] = item.message;
    }
  }

  // 5. Purpose
  if (!data.purpose?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-purpose",
      field: "purpose",
      label: "Purpose",
      message: "Purpose / business justification is required.",
    };
    items.push(item);
    errors["purpose"] = item.message;
  }

  // 6. Payment Details (Payment Methods Checkboxes)
  const methods =
    data.paymentMethods && data.paymentMethods.length > 0
      ? data.paymentMethods
      : data.paymentMethod
      ? [data.paymentMethod]
      : [];

  if (methods.length === 0) {
    const item: ValidationErrorItem = {
      id: "field-payment-methods",
      field: "paymentMethods",
      label: "Payment Details (Method)",
      message: "Please select at least one Payment Method checkbox (Cash, Check, or Online).",
    };
    items.push(item);
    errors["paymentMethods"] = item.message;
  }

  // Bank details (*If not applicable kindly put N/A)
  if (!data.bank?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-bank",
      field: "bank",
      label: "Bank Name",
      message: "Bank name is required (enter 'N/A' if not applicable).",
    };
    items.push(item);
    errors["bank"] = item.message;
  }

  if (!data.accountName?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-account-name",
      field: "accountName",
      label: "Account Name",
      message: "Account name is required (enter 'N/A' if not applicable).",
    };
    items.push(item);
    errors["accountName"] = item.message;
  }

  if (!data.accountNumber?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-account-number",
      field: "accountNumber",
      label: "Account Number",
      message: "Account number is required (enter 'N/A' if not applicable).",
    };
    items.push(item);
    errors["accountNumber"] = item.message;
  }

  // 7. Remarks (Urgency checkboxes)
  const urgencyOpts =
    data.urgencyOptions && data.urgencyOptions.length > 0
      ? data.urgencyOptions
      : data.urgency
      ? [data.urgency]
      : [];

  if (urgencyOpts.length === 0) {
    const item: ValidationErrorItem = {
      id: "field-remarks",
      field: "remarks",
      label: "Remarks (Urgency)",
      message: "Please select at least one Remarks checkbox (Urgent or Not urgent).",
    };
    items.push(item);
    errors["remarks"] = item.message;
  }

  // 8. Date Needed
  if (!data.dateNeeded?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-date-needed",
      field: "dateNeeded",
      label: "Date Needed",
      message: "Date Needed is required.",
    };
    items.push(item);
    errors["dateNeeded"] = item.message;
  }

  // 9. Requested By (Printed Name)
  if (!data.requestedByName?.trim()) {
    const item: ValidationErrorItem = {
      id: "field-requested-by-name",
      field: "requestedByName",
      label: "Requested By (Printed Name)",
      message: "Requester printed name is required under 'Requested By'.",
    };
    items.push(item);
    errors["requestedByName"] = item.message;
  }

  // 10. Signature
  if (!data.signatureDataUrl || data.signatureType === "none") {
    const item: ValidationErrorItem = {
      id: "field-signature",
      field: "signature",
      label: "Requester Signature",
      message: "Requester electronic signature is required. Click to sign.",
    };
    items.push(item);
    errors["signature"] = item.message;
  }

  return {
    isValid: items.length === 0,
    errors,
    items,
  };
}

export function validatePoForm(data: PoFormData): ValidationResult {
  const items: ValidationErrorItem[] = [];
  const errors: Record<string, string> = {};

  // 1. Vendor Name
  if (!data.vendorName?.trim()) {
    const item: ValidationErrorItem = {
      id: "po-field-vendor-name",
      field: "vendorName",
      label: "Vendor Name",
      message: "Vendor name is required.",
    };
    items.push(item);
    errors["vendorName"] = item.message;
  }

  // 2. Date
  if (!data.date?.trim()) {
    const item: ValidationErrorItem = {
      id: "po-field-date",
      field: "date",
      label: "PO Date",
      message: "PO date is required.",
    };
    items.push(item);
    errors["date"] = item.message;
  }

  // 3. Line Items
  const activeItems = (data.items || []).filter(
    (it) => it.details?.trim() || it.quantity !== "" || it.unitPrice !== ""
  );

  if (activeItems.length === 0) {
    const item: ValidationErrorItem = {
      id: "po-field-details-0",
      field: "items",
      label: "Line Items",
      message: "At least one line item (Details, Qty, Unit Price) is required.",
    };
    items.push(item);
    errors["items"] = item.message;
  } else {
    activeItems.forEach((it, idx) => {
      if (!it.details?.trim()) {
        const item: ValidationErrorItem = {
          id: `po-field-details-${idx}`,
          field: `item_${idx}_details`,
          label: `Item #${idx + 1} Details`,
          message: `Details / description required for item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_details`] = item.message;
      }
      if (it.quantity === "" || Number(it.quantity) <= 0) {
        const item: ValidationErrorItem = {
          id: `po-field-qty-${idx}`,
          field: `item_${idx}_qty`,
          label: `Item #${idx + 1} Quantity`,
          message: `Valid quantity (> 0) required for item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_qty`] = item.message;
      }
      if (it.unitPrice === "" || Number(it.unitPrice) <= 0) {
        const item: ValidationErrorItem = {
          id: `po-field-price-${idx}`,
          field: `item_${idx}_price`,
          label: `Item #${idx + 1} Unit Price`,
          message: `Valid unit price (> 0) required for item #${idx + 1}.`,
        };
        items.push(item);
        errors[`item_${idx}_price`] = item.message;
      }
    });
  }

  // 5. Total Amount Due
  if (!data.totalAmountDue || data.totalAmountDue <= 0) {
    if (!errors["items"]) {
      const item: ValidationErrorItem = {
        id: "po-field-details-0",
        field: "totalAmountDue",
        label: "Total Amount Due",
        message: "Total amount due must be greater than 0.00.",
      };
      items.push(item);
      errors["totalAmountDue"] = item.message;
    }
  }

  // 6. Prepared By
  if (!data.preparedByName?.trim()) {
    const item: ValidationErrorItem = {
      id: "po-field-prepared-by",
      field: "preparedByName",
      label: "Prepared By",
      message: "Prepared by name is required.",
    };
    items.push(item);
    errors["preparedByName"] = item.message;
  }

  return {
    isValid: items.length === 0,
    errors,
    items,
  };
}

export function validatePcvForm(data: PcvFormData): ValidationResult {
  const items: ValidationErrorItem[] = [];
  const errors: Record<string, string> = {};

  // 1. Payee (Employee)
  if (!data.payee?.trim()) {
    const item: ValidationErrorItem = {
      id: "pcv-field-payee",
      field: "payee",
      label: "Payee (Employee)",
      message: "Employee payee name is required.",
    };
    items.push(item);
    errors["payee"] = item.message;
  }

  // 2. Department
  if (!data.department?.trim()) {
    const item: ValidationErrorItem = {
      id: "pcv-field-department",
      field: "department",
      label: "Department",
      message: "Department is required.",
    };
    items.push(item);
    errors["department"] = item.message;
  }

  // 3. Date
  if (!data.date?.trim()) {
    const item: ValidationErrorItem = {
      id: "pcv-field-date",
      field: "date",
      label: "Voucher Date",
      message: "Voucher date is required.",
    };
    items.push(item);
    errors["date"] = item.message;
  }

  // 4. Particulars
  const activeItems = (data.particulars || []).filter(
    (it) => it.description?.trim() || it.amount !== ""
  );

  if (activeItems.length === 0) {
    const item: ValidationErrorItem = {
      id: "pcv-field-desc-0",
      field: "particulars",
      label: "Particulars",
      message: "At least one expense particular is required.",
    };
    items.push(item);
    errors["particulars"] = item.message;
  } else {
    activeItems.forEach((it, idx) => {
      if (!it.description?.trim()) {
        const item: ValidationErrorItem = {
          id: `pcv-field-desc-${idx}`,
          field: `particular_${idx}_desc`,
          label: `Particular #${idx + 1} Description`,
          message: `Description required for expense item #${idx + 1}.`,
        };
        items.push(item);
        errors[`particular_${idx}_desc`] = item.message;
      }
      if (it.amount === "" || Number(it.amount) <= 0) {
        const item: ValidationErrorItem = {
          id: `pcv-field-amount-${idx}`,
          field: `particular_${idx}_amount`,
          label: `Particular #${idx + 1} Amount`,
          message: `Valid amount (> 0) required for expense item #${idx + 1}.`,
        };
        items.push(item);
        errors[`particular_${idx}_amount`] = item.message;
      }
    });
  }

  // 5. Total Amount
  if (!data.amount || data.amount <= 0) {
    if (!errors["particulars"]) {
      const item: ValidationErrorItem = {
        id: "pcv-field-desc-0",
        field: "amount",
        label: "Total Amount",
        message: "Total petty cash amount must be greater than 0.00.",
      };
      items.push(item);
      errors["amount"] = item.message;
    }
  }

  // 6. Requested By
  if (!data.requestedByName?.trim()) {
    const item: ValidationErrorItem = {
      id: "pcv-field-requested-by",
      field: "requestedByName",
      label: "Requested By",
      message: "Requester name is required under 'Requested By'.",
    };
    items.push(item);
    errors["requestedByName"] = item.message;
  }

  return {
    isValid: items.length === 0,
    errors,
    items,
  };
}

export function scrollToFormField(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // If the target element is an input, focus it
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.focus();
  } else {
    // Search for first input or button child
    const input = el.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLButtonElement>(
      "input, textarea, button"
    );
    if (input) input.focus();
  }
}
