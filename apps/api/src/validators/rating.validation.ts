/**
 * Validation schemas for rating endpoints
 */
import Joi from "joi";

/**
 * Validation schema for creating a rating
 */
export const createRatingSchema = Joi.object({
  sellerId: Joi.number().integer().positive().required().messages({
    "number.base": "Seller ID must be a number",
    "number.integer": "Seller ID must be an integer",
    "number.positive": "Seller ID must be a positive number",
    "any.required": "Seller ID is required",
  }),
  postId: Joi.number().integer().positive().optional().messages({
    "number.base": "Post ID must be a number",
    "number.integer": "Post ID must be an integer",
    "number.positive": "Post ID must be a positive number",
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be an integer",
    "number.min": "Rating must be between 1 and 5",
    "number.max": "Rating must be between 1 and 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(1000).optional().messages({
    "string.max": "Comment must not exceed 1000 characters",
  }),
});

/**
 * Validation schema for updating a rating
 */
export const updateRatingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).optional().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be an integer",
    "number.min": "Rating must be between 1 and 5",
    "number.max": "Rating must be between 1 and 5",
  }),
  comment: Joi.string().max(1000).optional().messages({
    "string.max": "Comment must not exceed 1000 characters",
  }),
});

/**
 * Validation schema for rating ID parameter
 */
export const ratingIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Rating ID must be a number",
    "number.integer": "Rating ID must be an integer",
    "number.positive": "Rating ID must be a positive number",
    "any.required": "Rating ID is required",
  }),
});

/**
 * Validation schema for seller ID parameter
 */
export const sellerIdParamSchema = Joi.object({
  sellerId: Joi.number().integer().positive().required().messages({
    "number.base": "Seller ID must be a number",
    "number.integer": "Seller ID must be an integer",
    "number.positive": "Seller ID must be a positive number",
    "any.required": "Seller ID is required",
  }),
});

/**
 * Validation schema for pagination query parameters
 */
export const paginationQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must not exceed 100",
    }),
  offset: Joi.number().integer().min(0).optional().default(0).messages({
    "number.base": "Offset must be a number",
    "number.integer": "Offset must be an integer",
    "number.min": "Offset must be at least 0",
  }),
});

/**
 * Validation schema for top sellers query parameters
 */
export const topSellersQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must not exceed 100",
    }),
  minRatings: Joi.number().integer().min(1).optional().default(3).messages({
    "number.base": "Minimum ratings must be a number",
    "number.integer": "Minimum ratings must be an integer",
    "number.min": "Minimum ratings must be at least 1",
  }),
});

/**
 * Validation schema for can rate seller query parameters
 */
export const canRateSellerQuerySchema = Joi.object({
  sellerId: Joi.number().integer().positive().required().messages({
    "number.base": "Seller ID must be a number",
    "number.integer": "Seller ID must be an integer",
    "number.positive": "Seller ID must be a positive number",
    "any.required": "Seller ID is required",
  }),
  postId: Joi.number().integer().positive().optional().messages({
    "number.base": "Post ID must be a number",
    "number.integer": "Post ID must be an integer",
    "number.positive": "Post ID must be a positive number",
  }),
});
