import { ApiResponse } from "../common/api-response.types";

/**
 * Uploaded image data returned to client
 */
export interface UploadedImageDTO {
  url: string; // Full signed URL to blob (includes SAS token)
  filename: string; // Original filename (sanitized)
  size: number; // File size in bytes
  mimeType: string; // MIME type (image/jpeg, image/png, image/webp)
}

/**
 * Response from single image upload
 */
export type UploadImageResponseDTO = ApiResponse<UploadedImageDTO>;

/**
 * Response from multiple images upload (batch)
 */
export interface BatchUploadResultItem {
  success: boolean;
  url?: string; // Only present if upload succeeded
  filename: string;
  size: number;
  mimeType: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export type UploadMultipleImagesResponseDTO = ApiResponse<
  BatchUploadResultItem[]
>;

/**
 * Upload validation error codes
 */
export enum UploadErrorCode {
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  INVALID_FILE_TYPE = "INVALID_FILE_TYPE",
  NO_FILE_PROVIDED = "NO_FILE_PROVIDED",
  NO_FILES_PROVIDED = "NO_FILES_PROVIDED",
  TOO_MANY_FILES = "TOO_MANY_FILES",
  MULTIPLE_FILES_NOT_ALLOWED = "MULTIPLE_FILES_NOT_ALLOWED",
  FILE_INTEGRITY_ERROR = "FILE_INTEGRITY_ERROR",
  AZURE_SERVICE_UNAVAILABLE = "AZURE_SERVICE_UNAVAILABLE",
  AZURE_UPLOAD_ERROR = "AZURE_UPLOAD_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}
