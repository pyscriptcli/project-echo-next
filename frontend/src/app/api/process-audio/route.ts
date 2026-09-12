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

/** Formats a seconds value (e.g. 63.5) into [MM:SS] display. */
function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `[${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}]`;
}

async function transcribeWithOpenAI(buffer: Buffer, fileName: string, mimeType: string, apiKey: string): Promise<string> {
  const formData = new FormData();
  const fileBlob = new Blob([new Uint8Array(buffer)], { type: mimeType || "audio/wav" });
  formData.append("file", fileBlob, fileName || "recording.wav");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `OpenAI Whisper transcription failed (${res.status})`);
  }

  const data = await res.json();
  
  // Produce timestamped transcript from segments when available
  if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
    return data.segments
      .map((seg: { start: number; text: string }) => `${formatTimestamp(seg.start)} ${seg.text.trim()}`)
      .join("\n");
  }
  
  return data.text || "";
}

function getAudioFormat(mimeType: string, fileName?: string): string {
  const m = (mimeType || "").toLowerCase();
  const f = (fileName || "").toLowerCase();
  if (m.includes("mp3") || f.endsWith(".mp3")) return "mp3";
  if (m.includes("m4a") || f.endsWith(".m4a")) return "m4a";
  if (m.includes("mp4") || f.endsWith(".mp4")) return "mp4";
  if (m.includes("webm") || f.endsWith(".webm")) return "webm";
  if (m.includes("ogg") || f.endsWith(".ogg") || f.endsWith(".oga")) return "ogg";
  if (m.includes("flac") || f.endsWith(".flac")) return "flac";
  if (m.includes("aac") || f.endsWith(".aac")) return "aac";
  return "wav";
}

async function transcribeWithOpenRouter(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  apiKey: string
): Promise<string> {
  const base64Audio = buffer.toString("base64");
  const format = getAudioFormat(mimeType, fileName);

  // Strategy 1: Dedicated OpenRouter Speech-to-Text endpoint with Whisper Large V3
  try {
    const sttRes = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://project-echo.app",
        "X-Title": "Project Echo Audio Transcriber",
      },
      body: JSON.stringify({
        model: "openai/whisper-large-v3",
        input_audio: {
          data: base64Audio,
          format: format,
        },
      }),
    });

    if (sttRes.ok) {
      const data = await sttRes.json();
      if (data.text && data.text.trim().length > 0) {
        return data.text.trim();
      }
    } else {
      const errJson = await sttRes.json().catch(() => ({}));
      console.warn("OpenRouter STT failed, trying chat completions:", errJson);
    }
  } catch (sttErr: any) {
    console.warn("OpenRouter STT request error:", sttErr.message);
  }

  // Strategy 2: OpenRouter Multimodal Chat Completions with google/gemini-2.0-flash using input_audio
  const candidateModels = ["google/gemini-2.0-flash", "google/gemini-flash-1.5"];
  let lastError = "";

  for (const model of candidateModels) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://project-echo.app",
          "X-Title": "Project Echo Audio Transcriber",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please transcribe this corporate meeting audio completely and accurately. Return ONLY the full verbatim transcription text without any preamble, markdown wrapper, or commentary.",
                },
                {
                  type: "input_audio",
                  input_audio: {
                    data: base64Audio,
                    format: format,
                  },
                },
              ],
            },
          ],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (text.trim().length > 0) {
          return text.trim();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = errData?.error?.message || `Failed with status ${res.status}`;
      }
    } catch (chatErr: any) {
      lastError = chatErr.message;
    }
  }

  throw new Error(lastError || "OpenRouter audio transcription failed across all endpoints.");
}

async function transcribeWithGemini(
  buffer: Buffer, 
  fileName: string, 
  mimeType: string, 
  geminiKey: string
): Promise<{ text: string; tempPath?: string }> {
  const isSmallAudio = buffer.length < 15 * 1024 * 1024;
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `Please transcribe this corporate meeting audio accurately, capturing all speaker discussions and decisions:`;

  if (isSmallAudio) {
    const result = await model.generateContent([
      { inlineData: { mimeType: mimeType || "audio/wav", data: buffer.toString("base64") } },
      { text: prompt }
    ]);
    return { text: result.response.text() };
  } else {
    const tempDir = os.tmpdir();
    const ext = path.extname(fileName) || ".wav";
    const tempPath = path.join(tempDir, `upload-${Date.now()}${ext}`);
    await fs.writeFile(tempPath, buffer);
    const fileManager = new GoogleAIFileManager(geminiKey);
    const uploadResult = await fileManager.uploadFile(tempPath, { mimeType: mimeType || "audio/wav", displayName: fileName });
    const result = await model.generateContent([
      { fileData: { mimeType: uploadResult.file.mimeType, fileUri: uploadResult.file.uri } },
      { text: prompt }
    ]);
    return { text: result.response.text(), tempPath };
  }
}

async function transcribeAudioBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  keys: { openaiKey: string; openrouterKey: string; geminiKey: string }
): Promise<{ text: string; tempPath?: string; errors: string[] }> {
  let audioTranscript = "";
  let tempFilePath: string | undefined;
  const errors: string[] = [];

  // Provider 1: OpenAI Whisper (Standard industry meeting audio transcription)
  if (keys.openaiKey) {
    try {
      audioTranscript = await transcribeWithOpenAI(buffer, fileName, mimeType, keys.openaiKey);
    } catch (e: any) {
      console.warn("OpenAI transcription failed, attempting fallbacks:", e.message);
      errors.push(`OpenAI Whisper: ${e.message}`);
    }
  }

  // Provider 2: OpenRouter Multimodal Audio
  if (!audioTranscript && keys.openrouterKey) {
    try {
      audioTranscript = await transcribeWithOpenRouter(buffer, fileName, mimeType, keys.openrouterKey);
    } catch (e: any) {
      console.warn("OpenRouter transcription failed, attempting fallbacks:", e.message);
      errors.push(`OpenRouter: ${e.message}`);
    }
  }

  // Provider 3: Google Gemini Audio
  if (!audioTranscript && keys.geminiKey) {
    try {
      const gemRes = await transcribeWithGemini(buffer, fileName, mimeType, keys.geminiKey);
      if (gemRes.tempPath) tempFilePath = gemRes.tempPath;
      audioTranscript = gemRes.text;
    } catch (e: any) {
      console.warn("Gemini transcription failed:", e.message);
      errors.push(`Gemini: ${e.message}`);
    }
  }

  return { text: audioTranscript, tempPath: tempFilePath, errors };
}

export async function POST(req: NextRequest) {
  let tempFilePath: string | null = null;
  try {
    const headerKey = req.headers.get("x-api-key") || req.headers.get("x-deepseek-api-key");
    const aiKey = headerKey || process.env.DEEPSEEK_API_KEY || "";
    const openaiKey = req.headers.get("x-openai-api-key") || process.env.OPENAI_API_KEY || "";
    const openrouterKey = req.headers.get("x-openrouter-api-key") || process.env.OPENROUTER_API_KEY || "";
    const geminiKey = req.headers.get("x-gemini-api-key") || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const directText = formData.get("text") as string | null;
    const action = formData.get("action") as string | null;

    // CASE 0: Parallel Audio Chunk Transcription (bypasses metadata extraction for intermediate segments)
    if (action === "transcribe_chunk" && file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const fileName = file.name || "chunk.wav";
      const mimeType = file.type || "audio/wav";

      const { text, tempPath, errors } = await transcribeAudioBuffer(buffer, fileName, mimeType, {
        openaiKey,
        openrouterKey,
        geminiKey,
      });
      if (tempPath) tempFilePath = tempPath;

      if (!text) {
        return NextResponse.json({
          error: `Audio chunk transcription failed: ${errors.join(" | ") || "No audio transcription API key configured"}`
        }, { status: 500 });
      }

      return NextResponse.json({ transcript: text });
    }

    if (!file && (!directText || directText.trim().length === 0)) {
      return NextResponse.json({ error: "Please upload a file or paste meeting text." }, { status: 400 });
    }

    let transcript = "";
    let metadata: any = {};

    // CASE 1: Direct Pasted Text (or combined transcript from client chunking)
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
      if (geminiKey) {
        const isSmall = buffer.length < 15 * 1024 * 1024;
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

    // CASE 5: Audio / Video recording (OpenAI Whisper -> OpenRouter -> Gemini cascade)
    const { text, tempPath, errors } = await transcribeAudioBuffer(buffer, file.name, mimeType, {
      openaiKey,
      openrouterKey,
      geminiKey,
    });
    if (tempPath) tempFilePath = tempPath;

    if (!text) {
      if (errors.length > 0) {
        return NextResponse.json({
          error: `Audio transcription failed: ${errors.join(" | ")}`
        }, { status: 500 });
      }
      return NextResponse.json({ 
        error: "Audio transcription requires an OpenAI API Key, OpenRouter Key, or Gemini Key. Please configure them in your Vercel Environment Variables (OPENAI_API_KEY / OPENROUTER_API_KEY)." 
      }, { status: 400 });
    }

    transcript = text;
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