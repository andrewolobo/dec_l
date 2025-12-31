/**
 * Upload Controller
 * Handles file upload endpoints for Azure Blob Storage
 */
import { Request, Response, NextFunction } from "express";
import { uploadService } from "../services";
import { ErrorCode } from "../types/common/api-response.types";

export class UploadController {
  /**
   * Upload a single image
   * POST /api/v1/upload/image
   * @access Private - Requires authentication
   */
  async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const file = req.file;

      // Check if file was provided
      if (!file) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "No file provided in request",
            details: "Please upload a file using the 'image' field",
            statusCode: 400,
          },
        });
      }

      // Upload to Azure Blob Storage
      const result = await uploadService.uploadSingleImage(userId, file);

      // Return error if upload failed
      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      // Return success response
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple images (batch)
   * POST /api/v1/upload/images
   * @access Private - Requires authentication
   */
  async uploadImages(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const files = req.files as Express.Multer.File[];

      // Check if files were provided
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "No files provided in request",
            details: "Please upload files using the 'images' field",
            statusCode: 400,
          },
        });
      }

      // Upload all files to Azure Blob Storage
      const result = await uploadService.uploadMultipleImages(userId, files);

      // Return error if upload failed
      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      // Return success response (includes partial results for mixed success/failure)
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const uploadController = new UploadController();
