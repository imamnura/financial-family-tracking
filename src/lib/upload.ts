/**
 * File Upload Service
 * Handles avatar and attachment uploads
 */

import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { nanoid } from "nanoid";

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
  filename?: string;
}

export interface UploadOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  folder?: string;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
  ],
  folder: "uploads",
};

/**
 * Validate file
 */
function validateFile(
  file: File,
  options: UploadOptions = DEFAULT_OPTIONS
): { valid: boolean; error?: string } {
  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    const maxSizeMB = (options.maxSize / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit`,
    };
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${
        file.type
      } is not allowed. Allowed types: ${options.allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const ext = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, ext);

  // Sanitize filename
  const sanitized = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .substring(0, 30);

  // Add unique ID
  const uniqueId = nanoid(10);

  return `${sanitized}_${uniqueId}${ext}`;
}

/**
 * Upload file to local storage
 */
export async function uploadFile(
  file: File,
  options: UploadOptions = DEFAULT_OPTIONS
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateFile(file, options);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    // Generate filename and paths
    const filename = generateFilename(file.name);
    const folder = options.folder || DEFAULT_OPTIONS.folder!;
    const uploadDir = path.join(process.cwd(), "public", folder);
    const filePath = path.join(uploadDir, filename);
    const publicUrl = `/${folder}/${filename}`;

    // Create upload directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    console.log("✅ File uploaded:", publicUrl);

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      filename,
    };
  } catch (error: any) {
    console.error("❌ Upload error:", error);

    return {
      success: false,
      error: error.message || "Failed to upload file",
    };
  }
}

/**
 * Upload avatar image
 */
export async function uploadAvatar(file: File): Promise<UploadResult> {
  return uploadFile(file, {
    ...DEFAULT_OPTIONS,
    folder: "uploads/avatars",
    maxSize: 2 * 1024 * 1024, // 2MB for avatars
  });
}

/**
 * Upload transaction attachment
 */
export async function uploadAttachment(file: File): Promise<UploadResult> {
  return uploadFile(file, {
    maxSize: 10 * 1024 * 1024, // 10MB for attachments
    allowedTypes: [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
    folder: "uploads/attachments",
  });
}

/**
 * Upload multiple files
 */
export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = DEFAULT_OPTIONS
): Promise<UploadResult[]> {
  const uploadPromises = files.map((file) => uploadFile(file, options));
  return Promise.all(uploadPromises);
}

/**
 * Delete file from storage
 */
export async function deleteFile(
  filePath: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { unlink } = await import("fs/promises");
    const fullPath = path.join(process.cwd(), "public", filePath);

    if (existsSync(fullPath)) {
      await unlink(fullPath);
      console.log("✅ File deleted:", filePath);
      return { success: true };
    }

    return {
      success: false,
      error: "File not found",
    };
  } catch (error: any) {
    console.error("❌ Delete error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete file",
    };
  }
}

/**
 * Get file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate image dimensions (server-side)
 * Requires sharp package for server-side image processing
 */
export async function validateImageDimensions(
  filePath: string,
  minWidth?: number,
  minHeight?: number,
  maxWidth?: number,
  maxHeight?: number
): Promise<{
  valid: boolean;
  error?: string;
  dimensions?: { width: number; height: number };
}> {
  try {
    // For production, you would use 'sharp' package
    // For now, we'll skip this validation
    // const sharp = require('sharp');
    // const metadata = await sharp(filePath).metadata();
    // ... validation logic

    return {
      valid: true,
      dimensions: { width: 0, height: 0 },
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || "Failed to validate image",
    };
  }
}
