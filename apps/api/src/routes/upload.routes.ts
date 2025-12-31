/**
 * Upload Routes
 * Defines routes for file upload endpoints
 */
import { Router } from "express";
import { uploadController } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  uploadSingleMiddleware,
  uploadMultipleMiddleware,
} from "../middleware/upload.middleware";
import { createLimiter } from "../middleware/rate-limit.middleware";

const router = Router();

/**
 * @route   POST /api/v1/upload/image
 * @desc    Upload a single image to Azure Blob Storage
 * @access  Private - Requires authentication
 * @body    multipart/form-data with 'image' field
 */
router.post(
  "/image",
  authenticate, // JWT authentication required
  createLimiter, // Rate limiting for write operations
  uploadSingleMiddleware, // Multer single file parsing
  uploadController.uploadImage // Controller handler
);

/**
 * @route   POST /api/v1/upload/images
 * @desc    Upload multiple images (batch) to Azure Blob Storage
 * @access  Private - Requires authentication
 * @body    multipart/form-data with 'images' field (max 10 files)
 */
router.post(
  "/images",
  authenticate, // JWT authentication required
  createLimiter, // Rate limiting for write operations
  uploadMultipleMiddleware, // Multer multiple files parsing (max 10)
  uploadController.uploadImages // Controller handler
);

export const uploadRoutes = router;
