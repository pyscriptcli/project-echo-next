import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export interface GeneratedPdfResult {
  blob: Blob;
  dataUrl: string;
}

/**
 * Generates an official high-resolution A4 PDF from the printable RFP DOM element.
 * Uses html-to-image which natively supports modern CSS (oklch, CSS variables, flexbox, SVGs).
 */
export async function generateRfpPdf(elementId: string = "rfp-printable-sheet"): Promise<GeneratedPdfResult> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for PDF generation.`);
  }

  // Capture high-DPI image via browser's native SVG/foreignObject rendering
  const imgData = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains("no-print") ||
          node.getAttribute("data-html2canvas-ignore") === "true" ||
          node.getAttribute("data-pdf-ignore") === "true"
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Scale image to fit A4 width
  const img = new Image();
  img.src = imgData;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (e) => reject(e);
  });

  const imgWidth = pdfWidth;
  const imgHeight = (img.height * pdfWidth) / img.width;

  // Smart single-page fit: if the sheet slightly exceeds 1 page (up to 15%),
  // scale it proportionally to fit 1 crisp A4 page without awkward page breaks.
  if (imgHeight <= pdfHeight * 1.15) {
    const scale = Math.min(1, pdfHeight / imgHeight);
    const renderWidth = imgWidth * scale;
    const renderHeight = imgHeight * scale;
    const xOffset = (pdfWidth - renderWidth) / 2;
    pdf.addImage(imgData, "PNG", xOffset, 0, renderWidth, renderHeight);
  } else {
    // Multi-page pagination: paginate across sequential A4 pages
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }
  }

  const blob = pdf.output("blob");
  const dataUrl = pdf.output("dataurlstring");

  return { blob, dataUrl };
}

/**
 * Triggers a browser download of the generated PDF.
 */
export function downloadPdfBlob(blob: Blob, filename: string = "Request_For_Payment.pdf") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Generates a high-resolution PNG image Blob of the printable RFP sheet for embedding in ClickUp tasks.
 */
export async function generateRfpImageBlob(elementId: string = "rfp-printable-sheet"): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for image generation.`);
  }

  const dataUrl = await toPng(element, {
    quality: 0.95,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
    filter: (node) => {
      if (node instanceof HTMLElement) {
        if (
          node.classList.contains("no-print") ||
          node.getAttribute("data-html2canvas-ignore") === "true" ||
          node.getAttribute("data-pdf-ignore") === "true"
        ) {
          return false;
        }
      }
      return true;
    },
  });

  const res = await fetch(dataUrl);
  return await res.blob();
}
