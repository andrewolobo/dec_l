import { PaginationOptions, SortOptions } from "../common/api-response.types";

/**
 * Create post DTO
 */
export interface CreatePostDTO {
  title: string;
  categoryId: number;
  description: string;
  price: number;
  location: string;
  contactNumber: string;
  brand?: string;
  emailAddress?: string;
  deliveryMethod?: string;
  gpsLocation?: string;
  images?: CreatePostImageDTO[];
}

/**
 * Create post image DTO
 */
export interface CreatePostImageDTO {
  imageUrl: string;
  displayOrder: number;
}

/**
 * Update post DTO
 */
export interface UpdatePostDTO {
  title?: string;
  description?: string;
  price?: number;
  location?: string;
  categoryId?: number;
  brand?: string;
  deliveryMethod?: string;
  contactNumber?: string;
  emailAddress?: string;
}

/**
 * Post response DTO
 */
export interface PostResponseDTO {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  brand?: string;
  deliveryMethod?: string;
  contactNumber: string;
  emailAddress?: string;
  status: PostStatus;
  user: PostUserDTO;
  category: CategoryDTO;
  images: PostImageDTO[];
  likeCount: number;
  viewCount: number;
  isLiked?: boolean;
  scheduledPublishTime?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Post user summary
 */
export interface PostUserDTO {
  id: number;
  fullName: string;
  profilePictureUrl?: string;
}

/**
 * Category DTO
 */
export interface CategoryDTO {
  id: number;
  name: string;
  description?: string;
}

/**
 * Post image DTO
 */
export interface PostImageDTO {
  id: number;
  imageUrl: string;
  displayOrder: number;
}

/**
 * Post status enum
 */
export enum PostStatus {
  DRAFT = "Draft",
  SCHEDULED = "Scheduled",
  PENDING_PAYMENT = "PendingPayment",
  ACTIVE = "Active",
  EXPIRED = "Expired",
  REJECTED = "Rejected",
}

/**
 * Feed options
 */
export interface FeedOptionsDTO extends PaginationOptions {
  categoryId?: number;
  userId?: number;
}

/**
 * Search options
 */
export interface SearchOptionsDTO extends PaginationOptions {
  query: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  sort?: SortOptions;
}

/**
 * Schedule post DTO
 */
export interface SchedulePostDTO {
  scheduledTime: Date;
}

/**
 * Like response DTO
 */
export interface LikeResponseDTO {
  liked: boolean;
  likeCount: number;
}
