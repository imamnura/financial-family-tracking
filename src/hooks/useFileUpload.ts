"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";

interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  error?: string;
}

interface UseFileUploadOptions {
  type?: "avatar" | "attachment";
  onSuccess?: (url: string, filename?: string) => void;
  onError?: (error: string) => void;
  maxSize?: number; // in MB
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const { type = "attachment", onSuccess, onError, maxSize = 10 } = options;
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setPreview(null);
      return;
    }

    // Validate file size
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      const error = `File size exceeds ${maxSize}MB limit`;
      toast.error(error);
      if (onError) onError(error);
      return;
    }

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const uploadFile = async (file: File): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      // Simulate progress (since we don't have real progress tracking)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      toast.success("File uploaded successfully!");

      if (onSuccess) {
        onSuccess(data.url, data.filename);
      }

      return {
        success: true,
        url: data.url,
        filename: data.filename,
      };
    } catch (error: any) {
      const errorMessage = error.message || "Upload failed";
      toast.error(errorMessage);

      if (onError) {
        onError(errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    handleFileSelect(file);
    await uploadFile(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const reset = () => {
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return {
    uploading,
    progress,
    preview,
    fileInputRef,
    uploadFile,
    handleFileInputChange,
    handleFileSelect,
    triggerFileInput,
    reset,
  };
}
