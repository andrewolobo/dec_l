/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}

/**
 * Paginated API Response
 */
export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
  error?: ApiError;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * API Error structure
 */
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: any;
  statusCode: number;
  timestamp?: Date;
}

/**
 * Error codes enum
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  INVALID_TOKEN = "INVALID_TOKEN",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  BAD_REQUEST = "BAD_REQUEST",

  // Resource errors
  RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS",
  CONFLICT = "CONFLICT",

  // Business logic
  PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
  PAYMENT_FAILED = "PAYMENT_FAILED",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
  SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
  NOT_IMPLEMENTED = "NOT_IMPLEMENTED",
}

/**
 * Pagination options for queries
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Date range filter
 */
export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Sort options
 */
export interface SortOptions {
  field: string;
  order: "asc" | "desc";
}
