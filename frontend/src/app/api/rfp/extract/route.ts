import { NextRequest, NextResponse } from "next/server";
import { getTokenFromRequest } from "@/lib/auth";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!getTokenFromRequest(req)) return NextResponse.json({ success: false, message: "ClickUp authentication required" }, { status: 401 });
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No quotation document provided" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

    if (!apiKey || apiKey === "mock" || apiKey.startsWith("your_")) {
      return NextResponse.json(
        {
          success: false,
          message:
            "GEMINI_API_KEY is not configured in .env.local. Please provide a valid Gemini API key to enable live quotation scanning.",
        },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    // Strictly normalize MIME type for Gemini Vision
    let mimeType = file.type || "";
    const ext = file.name.toLowerCase().split(".").pop() || "";
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

    const ai = new GoogleGenAI({ apiKey });

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

    // Attempt Gemini call with retry for transient 503 / 429 demand spikes
    let response: any = null;
    let delay = 1000;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType,
                  },
                },
                {
                  text: "Extract all supplier quotation line items, vendor name, bank info, and total amount into strict JSON according to the schema.",
                },
              ],
            },
          ],
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
          },
        });
        break; // Successfully received response
      } catch (geminiErr: any) {
        const isTransient =
          geminiErr?.status === 503 ||
          geminiErr?.status === 429 ||
          geminiErr?.message?.includes("503") ||
          geminiErr?.message?.includes("high demand") ||
          geminiErr?.message?.includes("UNAVAILABLE") ||
          geminiErr?.message?.includes("rate");

        if (isTransient && attempt < maxRetries) {
          console.warn(`Gemini Vision attempt ${attempt} transient error; retrying in ${delay}ms...`);
          await new Promise((r) => setTimeout(r, delay));
          delay *= 1.5;
        } else {
          throw geminiErr;
        }
      }
    }

    let rawText = (response?.text || "{}").trim();
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
    console.error("Gemini Vision extraction error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to process quotation document with Gemini Vision.",
      },
      { status: 500 }
    );
  }
}
