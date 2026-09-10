import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { createCanvas } from "@napi-rs/canvas";

export const maxDuration = 60;

async function toVisionImages(buffer: Buffer, mimeType: string) {
  if (mimeType !== "application/pdf") return [`data:${mimeType};base64,${buffer.toString("base64")}`];
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const images: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 5); pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.8 });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvasContext: canvas.getContext("2d") as any, viewport } as any).promise;
    images.push(`data:image/jpeg;base64,${canvas.toBuffer("image/jpeg", 85).toString("base64")}`);
  }
  return images;
}

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const preparedPages = formData.getAll("pages").filter((entry): entry is File => entry instanceof File);

    if (!file && preparedPages.length === 0) {
      return NextResponse.json(
        { success: false, message: "No quotation document provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey || apiKey === "mock" || apiKey.startsWith("your_")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "DEEPSEEK_API_KEY is not configured. Please configure it to enable quotation scanning.",
        },
        { status: 500 }
      );
    }

    const buffer = file ? Buffer.from(await file.arrayBuffer()) : Buffer.alloc(0);

    // Strictly normalize MIME type for Gemini Vision
    let mimeType = file?.type || "image/jpeg";
    const ext = file?.name.toLowerCase().split(".").pop() || "jpg";
    if (ext === "pdf" || mimeType.includes("pdf")) {
      mimeType = "application/pdf";
    } else if (ext === "png" || mimeType.includes("png")) {
      mimeType = "image/png";
    } else if (ext === "webp" || mimeType.includes("webp")) {
      mimeType = "image/webp";
    } else if (
      ["jpg", "jpeg"].includes(ext) ||
      mimeType.includes("jpeg") ||
      mimeType.includes("jpg")
    ) {
      mimeType = "image/jpeg";
    } else {
      mimeType = "image/jpeg";
    }

    const systemPrompt = `You are an expert financial and procurement document intelligence model.
Your task is to analyze the attached supplier quotation, price quote, invoice, pro-forma invoice, billing statement, or official receipt and extract all relevant procurement fields needed to populate a Request for Payment (RFP) into strict JSON format.

Output JSON structure:
{
  "payee": "Full company/vendor/supplier name issuing the quotation",
  "date": "Document issue date in YYYY-MM-DD format (or today if not indicated)",
  "department": "Department if specified or inferable (e.g., IT, Sales, Marketing, HR, Admin), else ''",
  "purpose": "Brief description of the purchase or quotation project reference",
  "bank": "Bank name (e.g., BDO, BPI, Metrobank, UnionBank) if wire/bank details appear on document, else ''",
  "accountName": "Account holder name if wire/bank details appear, else ''",
  "accountNumber": "Account number if wire/bank details appear, else ''",
  "paymentMethod": "online",
  "urgency": "not_urgent",
  "items": [
    {
      "description": "Accurate description and specification of the item or service",
      "qty": 1,
      "unit": "pcs / lot / unit / set / box / license / mo / hr",
      "unitPrice": 0.00,
      "amount": 0.00
    }
  ],
  "totalAmount": 0.00
}

Strict Rules:
- Parse all item rows accurately. If multiple line items exist, extract all of them.
- Ensure 'amount' equals qty * unitPrice for each item, or matches the line total on the quotation.
- 'totalAmount' must accurately match the grand total payable indicated on the document.
- Return ONLY valid raw JSON with no Markdown backticks or extra commentary.`;

    const images = preparedPages.length > 0
      ? await Promise.all(preparedPages.slice(0, 5).map(async (page) => `data:image/jpeg;base64,${Buffer.from(await page.arrayBuffer()).toString("base64")}`))
      : await toVisionImages(buffer, mimeType);
    const content: any[] = [{ type: "text", text: `${systemPrompt}\n\nExtract the document into the required JSON schema.` }];
    for (const image of images) content.push({ type: "image_url", image_url: { url: image, detail: "high" } });
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: process.env.DEEPSEEK_VISION_MODEL || "deepseek-v4-flash-vision-exp", messages: [{ role: "user", content }], response_format: { type: "json_object" }, temperature: 0 }),
    });
    if (!response.ok) throw new Error(`DeepSeek Vision failed (${response.status}): ${await response.text()}`);
    const responseJson = await response.json();
    let rawText = String(responseJson?.choices?.[0]?.message?.content || "{}").trim();
    if (rawText.startsWith("```json")) {
      rawText = rawText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (rawText.startsWith("```")) {
      rawText = rawText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    const rawJson = JSON.parse(rawText);

    // Resilient schema normalization
    const extractedData = {
      payee: rawJson.payee || rawJson.vendor || rawJson.supplier || rawJson.vendor_name || rawJson.company_name || "",
      date: rawJson.date || new Date().toISOString().split("T")[0],
      department: rawJson.department || rawJson.dept || "",
      purpose: rawJson.purpose || rawJson.description || rawJson.project || "",
      bank: rawJson.bank || rawJson.bank_name || "",
      accountName: rawJson.accountName || rawJson.account_name || "",
      accountNumber: rawJson.accountNumber || rawJson.account_no || rawJson.account_number || "",
      paymentMethod: rawJson.paymentMethod || rawJson.payment_method || "online",
      urgency: rawJson.urgency || "not_urgent",
      items: [] as any[],
      totalAmount: 0,
    };

    const rawItems = rawJson.items || rawJson.line_items || rawJson.lineItems || [];
    if (Array.isArray(rawItems)) {
      extractedData.items = rawItems.map((item: any, i: number) => {
        const qty = Number(item.qty ?? item.quantity ?? item.count) || 1;
        const unitPrice = Number(item.unitPrice ?? item.unit_price ?? item.price ?? item.rate) || 0;
        const amount = Number(item.amount ?? item.total ?? item.total_amount) || qty * unitPrice;
        const description = item.description || item.item_description || item.item || item.name || `Item #${i + 1}`;
        const unit = item.unit || item.uom || "pcs";

        return {
          id: `ocr-${Date.now()}-${i}`,
          description,
          qty,
          unit,
          unitPrice,
          amount,
        };
      });

      extractedData.totalAmount =
        Number(rawJson.totalAmount ?? rawJson.total_amount ?? rawJson.total) ||
        extractedData.items.reduce((sum: number, it: any) => sum + (it.amount || 0), 0);
    }

    return NextResponse.json({
      success: true,
      isMock: false,
      data: extractedData,
    });
  } catch (error: any) {
    console.error("DeepSeek Vision extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process quotation document with DeepSeek Vision.",
      },
      { status: 500 }
    );
  }
}
