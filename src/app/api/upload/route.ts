import { NextRequest, NextResponse } from "next/server";
import { uploadAvatar, uploadAttachment } from "@/lib/upload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string; // 'avatar' or 'attachment'

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload based on type
    let result;
    if (type === "avatar") {
      result = await uploadAvatar(file);
    } else if (type === "attachment") {
      result = await uploadAttachment(file);
    } else {
      return NextResponse.json(
        { error: 'Invalid upload type. Use "avatar" or "attachment"' },
        { status: 400 }
      );
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      filename: result.filename,
    });
  } catch (error: any) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
