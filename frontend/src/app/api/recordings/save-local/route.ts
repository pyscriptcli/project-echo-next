import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Returns the resolved path to the user's "Documents/Echo Meetings" directory.
 */
function getEchoMeetingsDir(): string {
  const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const echoDir = path.join(userHome, "Documents", "Echo Meetings");
  if (!fs.existsSync(echoDir)) {
    fs.mkdirSync(echoDir, { recursive: true });
  }
  return echoDir;
}

/**
 * Format a timestamp safe for filenames: YYYY-MM-DD_HH-mm-ss
 */
function getSafeTimestamp(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

export async function GET() {
  try {
    const echoDir = getEchoMeetingsDir();
    const files = fs.readdirSync(echoDir).map((fileName) => {
      const filePath = path.join(echoDir, fileName);
      const stat = fs.statSync(filePath);
      return {
        name: fileName,
        path: filePath,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isCheckpoint: fileName.startsWith("CHECKPOINT_"),
      };
    });

    return NextResponse.json({
      directory: echoDir,
      fileCount: files.length,
      files: files.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()),
    });
  } catch (error) {
    console.error("[Local Save API] Error reading Echo Meetings directory:", error);
    return NextResponse.json(
      { error: "Could not read Echo Meetings directory" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const sessionId = (formData.get("sessionId") as string) || `session_${Date.now()}`;
    const status = (formData.get("status") as string) || "completed"; // "completed" | "interrupted" | "checkpoint"
    const mediaType = (formData.get("mediaType") as string) || "audio";
    const customFileName = formData.get("fileName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const echoDir = getEchoMeetingsDir();
    const ext = mediaType === "video" || file.type.startsWith("video/") ? "webm" : "webm";
    const buffer = Buffer.from(await file.arrayBuffer());

    let finalFileName: string;

    if (status === "checkpoint") {
      // Rolling checkpoint file (overwrites previous checkpoint for this session)
      finalFileName = `CHECKPOINT_${sessionId}.${ext}`;
    } else if (status === "interrupted") {
      // Interrupted recovery file
      finalFileName = customFileName || `INTERRUPTED_${sessionId}_${getSafeTimestamp()}.${ext}`;
    } else {
      // Final completed meeting recording
      finalFileName = customFileName || `Echo_Meeting_${getSafeTimestamp()}_${sessionId.slice(-6)}.${ext}`;

      // Clean up previous rolling checkpoints for this session now that completed file is written
      try {
        const checkpointName = `CHECKPOINT_${sessionId}.${ext}`;
        const checkpointPath = path.join(echoDir, checkpointName);
        if (fs.existsSync(checkpointPath)) {
          fs.unlinkSync(checkpointPath);
        }
      } catch (err) {
        console.warn("[Local Save API] Failed to clean up checkpoint:", err);
      }
    }

    const targetPath = path.join(echoDir, finalFileName);
    fs.writeFileSync(targetPath, buffer);

    console.log(`[Local Save API] Saved recording (${status}): ${targetPath} [${buffer.length} bytes]`);

    return NextResponse.json({
      success: true,
      directory: echoDir,
      fileName: finalFileName,
      filePath: targetPath,
      sizeBytes: buffer.length,
      status,
    });
  } catch (error) {
    console.error("[Local Save API] Failed to save recording locally:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save file locally" },
      { status: 500 }
    );
  }
}
