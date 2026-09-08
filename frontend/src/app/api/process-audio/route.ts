import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import mammoth from "mammoth";

async function extractMetadataWithAI(text: string, apiKey: string) {
  if (!apiKey) return {};
  try {
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an expert executive meeting assistant.
Extract meeting metadata in strict valid JSON matching this schema:
{
  "client_name": "Company or Client Name (or Internal if internal)",
  "meeting_type": "Internal" | "External" | "Team",
  "location": "Venue or meeting room mentioned",
  "attendees": ["List of attendee names mentioned"]
}`
          },
          {
            role: "user",
            content: `Extract metadata from this meeting content:\n${text.substring(0, 15000)}`
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || "";
      let cleaned = content.trim();
      if (cleaned.includes("```json")) {
        cleaned = cleaned.split("```json")[1].split("```")[0].trim();
      } else if (cleaned.includes("```")) {
        cleaned = cleaned.split("```")[1].split("```")[0].trim();
      }
      return JSON.parse(cleaned);
    }
  } catch (e) {
    console.warn("Metadata extraction fallback error:", e);
  }
  return {};
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    const headerKey = req.headers.get("x-api-key") || req.headers.get("x-deepseek-api-key");
    const aiKey = headerKey || process.env.DEEPSEEK_API_KEY || "";
    const geminiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const directText = formData.get("text") as string | null;

    if (!file && (!directText || directText.trim().length === 0)) {
      return NextResponse.json({ error: "Please upload a file or paste meeting text." }, { status: 400 });
    }

    let transcript = "";
    let metadata: any = {};

    // CASE 1: Direct Pasted Text
    if (!file && directText) {
      transcript = directText;
      metadata = await extractMetadataWithAI(transcript, aiKey);
      return NextResponse.json({ transcript, metadata });
    }

    if (!file) {
      return NextResponse.json({ error: "No input provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.name.toLowerCase();
    const mimeType = file.type || "";

    // CASE 2: Word Document (.docx)
    if (fileName.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
      const { value: extractedText } = await mammoth.extractRawText({ buffer });
      transcript = extractedText;
      metadata = await extractMetadataWithAI(transcript, aiKey);
      return NextResponse.json({ transcript, metadata });
    }

    // CASE 3: Text file (.txt, .srt, .vtt)
    if (fileName.endsWith(".txt") || fileName.endsWith(".srt") || fileName.endsWith(".vtt") || mimeType.startsWith("text/")) {
      transcript = buffer.toString("utf-8");
      metadata = await extractMetadataWithAI(transcript, aiKey);
      return NextResponse.json({ transcript, metadata });
    }

    // CASE 4: PDF Document (.pdf)
    if (fileName.endsWith(".pdf") || mimeType === "application/pdf") {
      // If Gemini Key available, use it for native PDF parsing
      if (geminiKey) {
        const isSmall = buffer.length < 15 * 1024 * 1024;
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const prompt = `Transcribe and summarize all text and discussion in this PDF document:`;
        
        let result;
        if (isSmall) {
          result = await model.generateContent([
            { inlineData: { mimeType: "application/pdf", data: buffer.toString("base64") } },
            { text: prompt }
          ]);
        } else {
          const tempDir = os.tmpdir();
          tempFilePath = path.join(tempDir, `doc-${Date.now()}.pdf`);
          await fs.writeFile(tempFilePath, buffer);
          const fileManager = new GoogleAIFileManager(geminiKey);
          const uploadResult = await fileManager.uploadFile(tempFilePath, { mimeType: "application/pdf", displayName: file.name });
          result = await model.generateContent([
            { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
            { text: prompt }
          ]);
        }
        transcript = result.response.text();
      } else {
        // Fallback: extract plain text from buffer
        transcript = buffer.toString("utf-8").replace(/[^\x20-\x7E\n\r\t]/g, " ");
      }
      metadata = await extractMetadataWithAI(transcript, aiKey);
      return NextResponse.json({ transcript, metadata });
    }

    // CASE 5: Audio / Video recording
    if (!geminiKey) {
      return NextResponse.json({ 
        error: "Audio transcription requires media transcription configuration. Alternatively, upload a document (PDF, Word) or paste text directly." 
      }, { status: 400 });
    }

    const isSmallAudio = buffer.length < 15 * 1024 * 1024;
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const prompt = `Please transcribe this corporate meeting audio accurately, capturing all speaker discussions and decisions:`;

    let result;
    if (isSmallAudio) {
      result = await model.generateContent([
        { inlineData: { mimeType: mimeType || "audio/wav", data: buffer.toString("base64") } },
        { text: prompt }
      ]);
    } else {
      const tempDir = os.tmpdir();
      const ext = path.extname(file.name) || ".wav";
      tempFilePath = path.join(tempDir, `upload-${Date.now()}${ext}`);
      await fs.writeFile(tempFilePath, buffer);
      const fileManager = new GoogleAIFileManager(geminiKey);
      const uploadResult = await fileManager.uploadFile(tempFilePath, { mimeType: mimeType || "audio/wav", displayName: file.name });
      result = await model.generateContent([
        { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
        { text: prompt }
      ]);
    }

    transcript = result.response.text();
    metadata = await extractMetadataWithAI(transcript, aiKey);
    return NextResponse.json({ transcript, metadata });
  } catch (error: any) {
    console.error("Error processing source file:", error);
    const msg = error?.message || String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (tempFilePath) {
      try { await fs.unlink(tempFilePath); } catch (e) {}
    }
  }
}