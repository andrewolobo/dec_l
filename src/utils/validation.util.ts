import Joi from 'joi';
import {
  RegisterDTO,
  LoginDTO,
  OAuthLoginDTO,
} from '../types/auth/auth.types';
import {
  CreatePostDTO,
  UpdatePostDTO,
  SearchOptionsDTO,
} from '../types/post/post.types';
import {
  UpdateProfileDTO,
  ChangePasswordDTO,
} from '../types/user/user.types';
import { CreatePaymentDTO } from '../types/payment/payment.types';

/**
 * Validation utility using Joi
 */
export class ValidationUtil {
  // Auth validation schemas
  static readonly registerSchema = Joi.object<RegisterDTO>({
    emailAddress: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    fullName: Joi.string().min(2).max(100).required(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
  });

  static readonly loginSchema = Joi.object<LoginDTO>({
    emailAddress: Joi.string().email().required(),
    password: Joi.string().required(),
  });

  static readonly oauthLoginSchema = Joi.object<OAuthLoginDTO>({
    provider: Joi.string().valid('Google', 'Microsoft').required(),
    accessToken: Joi.string().required(),
  });

  // Post validation schemas
  static readonly createPostSchema = Joi.object<CreatePostDTO>({
    title: Joi.string().min(5).max(200).required(),
    categoryId: Joi.number().integer().positive().required(),
    description: Joi.string().min(10).max(2000).required(),
    price: Joi.number().positive().required(),
    location: Joi.string().min(2).max(200).required(),
    contactNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required(),
    brand: Joi.string().max(100).optional(),
    emailAddress: Joi.string().email().optional(),
    deliveryMethod: Joi.string().max(200).optional(),
    gpsLocation: Joi.string().max(500).optional(),
    images: Joi.array()
      .items(
        Joi.object({
          imageUrl: Joi.string().uri().required(),
          displayOrder: Joi.number().integer().min(1).required(),
        })
      )
      .max(10)
      .optional(),
  });

  static readonly updatePostSchema = Joi.object<UpdatePostDTO>({
    title: Joi.string().min(5).max(200).optional(),
    description: Joi.string().min(10).max(2000).optional(),
    price: Joi.number().positive().optional(),
    location: Joi.string().min(2).max(200).optional(),
    categoryId: Joi.number().integer().positive().optional(),
    brand: Joi.string().max(100).optional(),
    deliveryMethod: Joi.string().max(200).optional(),
    contactNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
    emailAddress: Joi.string().email().optional(),
  });

  static readonly searchPostsSchema = Joi.object<SearchOptionsDTO>({
    query: Joi.string().min(1).required(),
    categoryId: Joi.number().integer().positive().optional(),
    minPrice: Joi.number().positive().optional(),
    maxPrice: Joi.number().positive().optional(),
    location: Joi.string().optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.object({
      field: Joi.string().required(),
      order: Joi.string().valid('asc', 'desc').required(),
    }).optional(),
  });

  // User validation schemas
  static readonly updateProfileSchema = Joi.object<UpdateProfileDTO>({
    fullName: Joi.string().min(2).max(100).optional(),
    phoneNumber: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .optional(),
    profilePictureUrl: Joi.string().uri().optional(),
    location: Joi.string().max(200).optional(),
    bio: Joi.string().max(500).optional(),
  });

  static readonly changePasswordSchema = Joi.object<ChangePasswordDTO>({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  });

  // Payment validation schemas
  static readonly createPaymentSchema = Joi.object<CreatePaymentDTO>({
    postId: Joi.number().integer().positive().required(),
    pricingTierId: Joi.number().integer().positive().required(),
    paymentMethod: Joi.string()
      .valid('Card', 'MobileMoney', 'BankTransfer')
      .required(),
  });

  /**
   * Validate data against a schema
   * @param schema - Joi schema
   * @param data - Data to validate
   * @returns Validation result
   */
  static validate<T>(
    schema: Joi.Schema,
    data: unknown
  ): { valid: boolean; errors?: string[]; value?: T } {
    const { error, value } = schema.validate(data, { abortEarly: false });

    if (error) {
      return {
        valid: false,
        errors: error.details.map((detail) => detail.message),
      };
    }

    return {
      valid: true,
      value: value as T,
    };
  }
}
