import { azureConfig } from "../config/azure.config";
import {
  UploadedImageDTO,
  UploadImageResponseDTO,
  UploadMultipleImagesResponseDTO,
  BatchUploadResultItem,
  UploadErrorCode,
} from "../types/upload/upload.types";
import { ErrorCode } from "../types/common/api-response.types";
import { v4 as uuidv4 } from "uuid";
import path from "path";

/**
 * Upload service for handling file uploads to Azure Blob Storage
 */
export class UploadService {
  /**
   * Upload a single image to Azure Blob Storage
   */
  async uploadSingleImage(
    userId: number,
    file: Express.Multer.File
  ): Promise<UploadImageResponseDTO> {
    try {
      // Validate file
      const validationError = this.validateFile(file);
      if (validationError) {
        return validationError;
      }

      // Generate unique blob name
      const blobName = this.generateBlobName(userId, file);

      // Upload to Azure with retry logic
      const containerClient = azureConfig.getContainerClient();
      await this.uploadToAzure(
        containerClient,
        blobName,
        file.buffer,
        file.mimetype
      );

      // Generate signed URL
      const url = this.generateSignedUrl(blobName);

      // Return success response
      return {
        success: true,
        data: {
          url,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        },
      };
    } catch (error: any) {
      console.error("Upload single image error:", error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to upload image",
          details: error.message,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Upload multiple images to Azure Blob Storage
   */
  async uploadMultipleImages(
    userId: number,
    files: Express.Multer.File[]
  ): Promise<UploadMultipleImagesResponseDTO> {
    try {
      // Validate batch size
      if (files.length > azureConfig.upload.maxFilesPerBatch) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: `Maximum ${azureConfig.upload.maxFilesPerBatch} files per batch`,
            statusCode: 400,
          },
        };
      }

      // Upload all files in parallel
      const uploadPromises = files.map((file) =>
        this.uploadSingleFile(userId, file)
      );
      const results = await Promise.all(uploadPromises);

      return {
        success: true,
        data: results,
      };
    } catch (error: any) {
      console.error("Upload multiple images error:", error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to upload images",
          details: error.message,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Upload a single file and return result item (used in batch uploads)
   */
  private async uploadSingleFile(
    userId: number,
    file: Express.Multer.File
  ): Promise<BatchUploadResultItem> {
    try {
      // Validate file
      const validationError = this.validateFile(file);
      if (validationError) {
        return {
          success: false,
          filename: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
          error: {
            code: validationError.error!.code.toString(),
            message: validationError.error!.message,
            details: validationError.error!.details,
          },
        };
      }

      // Generate unique blob name
      const blobName = this.generateBlobName(userId, file);

      // Upload to Azure with retry logic
      const containerClient = azureConfig.getContainerClient();
      await this.uploadToAzure(
        containerClient,
        blobName,
        file.buffer,
        file.mimetype
      );

      // Generate signed URL
      const url = this.generateSignedUrl(blobName);

      return {
        success: true,
        url,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      console.error(`Upload file ${file.originalname} error:`, error);
      return {
        success: false,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        error: {
          code: UploadErrorCode.AZURE_UPLOAD_ERROR,
          message: "Failed to upload file",
          details: error.message,
        },
      };
    }
  }

  /**
   * Validate file meets requirements
   */
  private validateFile(
    file: Express.Multer.File
  ): UploadImageResponseDTO | null {
    // Check file size
    if (file.size > azureConfig.upload.maxFileSize) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `File exceeds maximum size of ${azureConfig.upload.maxFileSize / 1024 / 1024}MB`,
          statusCode: 413,
        },
      };
    }

    // Check MIME type
    if (!azureConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `File type not allowed. Allowed: ${azureConfig.upload.allowedMimeTypes.join(", ")}`,
          statusCode: 400,
        },
      };
    }

    // Check file extension
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (!azureConfig.upload.allowedExtensions.includes(ext)) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: `File extension not allowed. Allowed: ${azureConfig.upload.allowedExtensions.join(", ")}`,
          statusCode: 400,
        },
      };
    }

    // Validate file integrity (magic number check)
    const integrityError = this.validateFileIntegrity(file);
    if (integrityError) {
      return integrityError;
    }

    return null; // No validation errors
  }

  /**
   * Validate file content matches declared MIME type (magic number check)
   */
  private validateFileIntegrity(
    file: Express.Multer.File
  ): UploadImageResponseDTO | null {
    if (!file.buffer || file.buffer.length === 0) {
      return {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "File buffer is empty",
          statusCode: 400,
        },
      };
    }

    // JPEG magic numbers: FF D8 FF
    if (file.mimetype === "image/jpeg") {
      const isValidJpeg =
        file.buffer[0] === 0xff &&
        file.buffer[1] === 0xd8 &&
        file.buffer[2] === 0xff;
      if (!isValidJpeg) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "File content doesn't match declared JPEG type",
            statusCode: 400,
          },
        };
      }
    }

    // PNG magic numbers: 89 50 4E 47 0D 0A 1A 0A
    if (file.mimetype === "image/png") {
      const isValidPng =
        file.buffer[0] === 0x89 &&
        file.buffer[1] === 0x50 &&
        file.buffer[2] === 0x4e &&
        file.buffer[3] === 0x47;
      if (!isValidPng) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "File content doesn't match declared PNG type",
            statusCode: 400,
          },
        };
      }
    }

    // WebP magic numbers: RIFF....WEBP
    if (file.mimetype === "image/webp") {
      const isValidWebp =
        file.buffer[0] === 0x52 && // R
        file.buffer[1] === 0x49 && // I
        file.buffer[2] === 0x46 && // F
        file.buffer[3] === 0x46 && // F
        file.buffer[8] === 0x57 && // W
        file.buffer[9] === 0x45 && // E
        file.buffer[10] === 0x42 && // B
        file.buffer[11] === 0x50; // P
      if (!isValidWebp) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "File content doesn't match declared WebP type",
            statusCode: 400,
          },
        };
      }
    }

    return null; // File integrity check passed
  }

  /**
   * Generate unique blob name: {userId}-{timestamp}-{uuid}.{ext}
   */
  private generateBlobName(userId: number, file: Express.Multer.File): string {
    const timestamp = Date.now();
    const uuid = uuidv4();
    const ext = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(".", "");
    const sanitizedExt = ext || "jpg"; // Default to jpg if no extension

    return `${userId}-${timestamp}-${uuid}.${sanitizedExt}`;
  }

  /**
   * Upload file to Azure Blob Storage with retry logic
   */
  private async uploadToAzure(
    containerClient: any,
    blobName: string,
    buffer: Buffer,
    mimeType: string,
    retryAttempt: number = 0
  ): Promise<void> {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
      });
    } catch (error: any) {
      console.error(
        `Azure upload attempt ${retryAttempt + 1} failed:`,
        error.message
      );

      // Check if we should retry
      if (
        retryAttempt < azureConfig.upload.maxRetries &&
        this.isTransientError(error)
      ) {
        // Wait before retrying (exponential backoff)
        const delay = azureConfig.upload.retryDelayMs[retryAttempt] || 4000;
        await this.sleep(delay);

        // Retry upload
        return this.uploadToAzure(
          containerClient,
          blobName,
          buffer,
          mimeType,
          retryAttempt + 1
        );
      }

      // Max retries exceeded or non-transient error
      if (retryAttempt >= azureConfig.upload.maxRetries) {
        // Attempt cleanup
        await this.deleteBlob(blobName);
      }

      throw new Error(
        `Azure upload failed after ${retryAttempt + 1} attempts: ${error.message}`
      );
    }
  }

  /**
   * Check if error is transient (should retry)
   */
  private isTransientError(error: any): boolean {
    const transientErrors = [
      "ECONNREFUSED",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ENETUNREACH",
      "Service Unavailable",
      "503",
    ];

    const errorString = error.toString();
    return transientErrors.some((transientError) =>
      errorString.includes(transientError)
    );
  }

  /**
   * Delete blob from Azure (best effort cleanup)
   */
  private async deleteBlob(blobName: string): Promise<void> {
    try {
      if (azureConfig.upload.enableAutoCleanup) {
        const containerClient = azureConfig.getContainerClient();
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.delete();
        console.log(`Cleaned up blob: ${blobName}`);
      }
    } catch (error: any) {
      // Log but don't throw - best effort cleanup
      console.error(`Failed to cleanup blob ${blobName}:`, error.message);
    }
  }

  /**
   * Generate signed URL for blob
   */
  private generateSignedUrl(blobName: string): string {
    const baseUrl = `https://${azureConfig.blobStorageAccount}.blob.core.windows.net/${azureConfig.containerName}/${blobName}`;
    return `${baseUrl}?${azureConfig.sasToken}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const uploadService = new UploadService();
