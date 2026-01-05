/**
 * Validation schemas for post endpoints
 */
import Joi from "joi";

export const createPostSchema = Joi.object({
  title: Joi.string().min(5).max(255).required().messages({
    "string.min": "Title must be at least 5 characters long",
    "string.max": "Title cannot exceed 255 characters",
    "any.required": "Title is required",
  }),
  categoryId: Joi.number().integer().positive().required().messages({
    "number.base": "Category ID must be a number",
    "number.positive": "Category ID must be positive",
    "any.required": "Category is required",
  }),
  description: Joi.string().min(10).required().messages({
    "string.min": "Description must be at least 10 characters long",
    "any.required": "Description is required",
  }),
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be greater than 0",
    "any.required": "Price is required",
  }),
  location: Joi.string().required().messages({
    "any.required": "Location is required",
  }),
  contactNumber: Joi.string().required().messages({
    "any.required": "Contact number is required",
  }),
  brand: Joi.string().optional(),
  emailAddress: Joi.string().email().optional(),
  deliveryMethod: Joi.string().optional(),
  gpsLocation: Joi.string().optional(),
  images: Joi.array()
    .items(
      Joi.object({
        // Accept both blob paths (e.g., "123-uuid.jpg") and full URLs (backward compatibility)
        imageUrl: Joi.string()
          .pattern(/^(https?:\/\/.*|[\w-]+\.[a-zA-Z]{2,5})$/)
          .required()
          .messages({
            "string.pattern.base": "imageUrl must be either a valid URL or a blob path (e.g., filename.jpg)",
          }),
        displayOrder: Joi.number().integer().min(0).required(),
      })
    )
    .max(10)
    .optional()
    .messages({
      "array.max": "Maximum 10 images allowed per post",
    }),
});

export const updatePostSchema = Joi.object({
  title: Joi.string().min(5).max(255).optional(),
  description: Joi.string().min(10).optional(),
  price: Joi.number().positive().optional(),
  location: Joi.string().optional(),
  categoryId: Joi.number().integer().positive().optional(),
  brand: Joi.string().optional(),
  deliveryMethod: Joi.string().optional(),
  contactNumber: Joi.string().optional(),
  emailAddress: Joi.string().email().optional(),
});

export const schedulePostSchema = Joi.object({
  scheduledTime: Joi.date().iso().greater("now").required().messages({
    "date.greater": "Scheduled time must be in the future",
    "any.required": "Scheduled time is required",
  }),
});

export const feedOptionsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: Joi.number().integer().positive().optional(),
  userId: Joi.number().integer().positive().optional(),
});

export const searchOptionsSchema = Joi.object({
  query: Joi.string().min(1).required().messages({
    "any.required": "Search query is required",
  }),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  categoryId: Joi.number().integer().positive().optional(),
  minPrice: Joi.number().positive().optional(),
  maxPrice: Joi.number().positive().optional(),
  location: Joi.string().optional(),
});

export const postIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Post ID must be a number",
    "number.positive": "Invalid post ID",
    "any.required": "Post ID is required",
  }),
});

export const userIdSchema = Joi.object({
  userId: Joi.number().integer().positive().required().messages({
    "number.base": "User ID must be a number",
    "number.positive": "Invalid user ID",
    "any.required": "User ID is required",
  }),
});
