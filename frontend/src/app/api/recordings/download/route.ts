import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

function getMosaicMeetingsDir(): string {
  const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
  const directory = path.join(userHome, "Documents", "Mosaic Meetings");
  if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function getLegacyEchoMeetingsDir() {
  const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
  return path.join(userHome, "Documents", "Echo Meetings");
}

export async function GET(req: NextRequest) {
  try {
    const fileName = req.nextUrl.searchParams.get("fileName");
    if (!fileName) {
      return NextResponse.json({ error: "fileName parameter is required" }, { status: 400 });
    }

    // Prevent directory traversal
    const safeBaseName = path.basename(fileName);
    const filePath = [
      path.join(getMosaicMeetingsDir(), safeBaseName),
      path.join(getLegacyEchoMeetingsDir(), safeBaseName),
    ].find((candidate) => fs.existsSync(candidate));

    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const ext = path.extname(safeBaseName).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".m4a") contentType = "audio/mp4";
    else if (ext === ".ogg") contentType = "audio/ogg";

    const fileStream = fs.createReadStream(filePath);
    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", String(stat.size));
    headers.set("Content-Disposition", `attachment; filename="${safeBaseName}"`);

    // Stream the file back
    return new NextResponse(fileStream as any, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    console.error("[Recordings Download API] Error downloading file:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to download recording file" },
      { status: 500 }
    );
  }
}
