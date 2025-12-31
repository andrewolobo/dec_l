import multer from "multer";
import { azureConfig } from "../config/azure.config";
import { Request } from "express";

/**
 * Upload Middleware
 * Configures multer for file uploads to Azure Blob Storage
 */

// Store files in memory (not on disk) since we upload directly to Azure
const memoryStorage = multer.memoryStorage();

// Configure multer with file size limits and type filtering
const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: azureConfig.upload.maxFileSize, // 5MB
    files: azureConfig.upload.maxFilesPerBatch, // 10 files max
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    // Check if MIME type is allowed
    if (azureConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true); // Accept file
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed types: ${azureConfig.upload.allowedMimeTypes.join(", ")}`
        )
      );
    }
  },
});

/**
 * Middleware for single file upload
 * Field name: "image"
 */
export const uploadSingleMiddleware = uploadMiddleware.single("image");

/**
 * Middleware for multiple files upload (batch)
 * Field name: "images"
 * Max: 10 files
 */
export const uploadMultipleMiddleware = uploadMiddleware.array(
  "images",
  azureConfig.upload.maxFilesPerBatch
);
