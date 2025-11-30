"use client";

import { useFileUpload } from "@/hooks/useFileUpload";
import Image from "next/image";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  type?: "avatar" | "attachment";
  onUploadSuccess?: (url: string, filename?: string) => void;
  onUploadError?: (error: string) => void;
  currentImage?: string;
  label?: string;
  acceptedTypes?: string;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  type = "attachment",
  onUploadSuccess,
  onUploadError,
  currentImage,
  label = "Upload File",
  acceptedTypes = "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  maxSize = 10,
  className = "",
}: FileUploadProps) {
  const {
    uploading,
    progress,
    preview,
    fileInputRef,
    handleFileInputChange,
    triggerFileInput,
    reset,
  } = useFileUpload({
    type,
    onSuccess: onUploadSuccess,
    onError: onUploadError,
    maxSize,
  });

  const displayImage = preview || currentImage;

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Preview */}
      {displayImage && (
        <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <Image
            src={displayImage}
            alt="Preview"
            fill
            className="object-cover"
          />

          {/* Remove button */}
          {!uploading && (
            <button
              type="button"
              onClick={reset}
              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Upload progress overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-60 flex flex-col items-center justify-center">
              <div className="text-white text-center space-y-3">
                <Upload className="w-8 h-8 mx-auto animate-bounce" />
                <div className="text-lg font-semibold">{progress}%</div>
                <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-sm text-gray-300">Uploading...</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Area (when no image) */}
      {!displayImage && (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />

          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploading}
            className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors flex flex-col items-center justify-center gap-3 bg-gray-50 dark:bg-gray-800/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Upload className="w-10 h-10 text-blue-500 animate-bounce" />
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {progress}%
                  </div>
                  <div className="w-48 h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden mx-auto mt-2">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {type === "avatar" ? (
                  <ImageIcon className="w-10 h-10 text-gray-400" />
                ) : (
                  <FileText className="w-10 h-10 text-gray-400" />
                )}
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Click to upload
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {type === "avatar"
                      ? "PNG, JPG, WEBP, GIF"
                      : "Images, PDF, Office docs"}
                  </div>
                </div>
              </>
            )}
          </button>
        </div>
      )}

      {/* Upload Button (when image exists) */}
      {displayImage && !uploading && (
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={uploading}
          />
          <button
            type="button"
            onClick={triggerFileInput}
            disabled={uploading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            Change File
          </button>
        </div>
      )}

      {/* Info */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {type === "avatar"
          ? "Max size: 2MB. Formats: JPG, PNG, WEBP, GIF"
          : `Max size: ${maxSize}MB. Formats: Images, PDF, Word, Excel`}
      </p>
    </div>
  );
}

/**
 * Avatar Upload Component
 * Specialized for user avatars (circular preview)
 */
interface AvatarUploadProps {
  onUploadSuccess?: (url: string) => void;
  currentAvatar?: string;
  userName?: string;
}

export function AvatarUpload({
  onUploadSuccess,
  currentAvatar,
  userName = "User",
}: AvatarUploadProps) {
  const {
    uploading,
    progress,
    preview,
    fileInputRef,
    handleFileInputChange,
    triggerFileInput,
  } = useFileUpload({
    type: "avatar",
    onSuccess: onUploadSuccess,
    maxSize: 2,
  });

  const displayImage = preview || currentAvatar;
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar Preview */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-lg">
          {displayImage ? (
            <Image
              src={displayImage}
              alt="Avatar"
              width={128}
              height={128}
              className="object-cover w-full h-full"
            />
          ) : (
            <span className="text-4xl font-bold text-gray-500 dark:text-gray-400">
              {initials}
            </span>
          )}
        </div>

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black bg-opacity-60 flex flex-col items-center justify-center">
            <Upload className="w-6 h-6 text-white mb-2 animate-bounce" />
            <span className="text-white text-sm font-semibold">
              {progress}%
            </span>
          </div>
        )}

        {/* Upload button */}
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          <Upload className="w-4 h-4" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={uploading}
        />
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Click the upload icon to change your avatar
        <br />
        Max size: 2MB
      </p>
    </div>
  );
}
