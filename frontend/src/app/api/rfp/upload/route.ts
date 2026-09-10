import { NextRequest, NextResponse } from "next/server";
import { uploadAttachmentToTask } from "@/lib/forms/clickup";
import { getTokenFromRequest } from "@/lib/auth";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "ClickUp authentication required" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const taskId = formData.get("taskId")?.toString();
    const file = formData.get("file") as File | null;
    const filename = formData.get("filename")?.toString() || file?.name || "attachment";

    if (!taskId) {
      return NextResponse.json(
        { success: false, message: "Missing taskId" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof Blob) || file.size === 0) {
      return NextResponse.json(
        { success: false, message: "No valid file provided for upload" },
        { status: 400 }
      );
    }

    const result = await uploadAttachmentToTask(taskId, file, filename, { token });

    if (!result.success) {
      return NextResponse.json(
        { success: false, message: `Failed to upload attachment ${filename} to ClickUp` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      id: result.id,
      filename,
    });
  } catch (error: any) {
    console.error("Error in /api/rfp/upload:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Internal server error uploading attachment",
      },
      { status: 500 }
    );
  }
}
