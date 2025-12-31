/**
 * Validation schemas for upload endpoints
 * Note: Primary validation is handled by multer middleware
 * These schemas provide additional validation layers if needed
 */
import Joi from "joi";

/**
 * Schema for single image upload
 * Validates that the file field exists after multer processing
 */
export const uploadSingleImageSchema = Joi.object({
  // Multer adds 'file' property to req after processing
  file: Joi.object({
    fieldname: Joi.string().valid("image").required(),
    originalname: Joi.string().required(),
    encoding: Joi.string().required(),
    mimetype: Joi.string()
      .valid("image/jpeg", "image/png", "image/webp")
      .required(),
    size: Joi.number().max(5 * 1024 * 1024).required(), // 5MB
    buffer: Joi.binary().required(),
  }).unknown(true),
}).unknown(true);

/**
 * Schema for multiple images upload (batch)
 * Validates that the files array exists after multer processing
 */
export const uploadMultipleImagesSchema = Joi.object({
  // Multer adds 'files' array to req after processing
  files: Joi.array()
    .items(
      Joi.object({
        fieldname: Joi.string().valid("images").required(),
        originalname: Joi.string().required(),
        encoding: Joi.string().required(),
        mimetype: Joi.string()
          .valid("image/jpeg", "image/png", "image/webp")
          .required(),
        size: Joi.number().max(5 * 1024 * 1024).required(), // 5MB per file
        buffer: Joi.binary().required(),
      }).unknown(true)
    )
    .min(1)
    .max(10)
    .required(),
}).unknown(true);

/**
 * Consolidated validation schemas export
 */
export const uploadValidationSchema = {
  single: uploadSingleImageSchema,
  multiple: uploadMultipleImagesSchema,
};
