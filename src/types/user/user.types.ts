/**
 * User profile DTO
 */
export interface UserProfileDTO {
  id: number;
  fullName: string;
  emailAddress: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  location?: string;
  bio?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Update profile DTO
 */
export interface UpdateProfileDTO {
  fullName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  location?: string;
  bio?: string;
}

/**
 * Change password DTO
 */
export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}

/**
 * Reset password request DTO
 */
export interface ResetPasswordRequestDTO {
  emailAddress: string;
}

/**
 * Reset password DTO
 */
export interface ResetPasswordDTO {
  token: string;
  newPassword: string;
}

/**
 * User posts summary
 */
export interface UserPostsSummaryDTO {
  totalPosts: number;
  activePosts: number;
  expiredPosts: number;
  draftPosts: number;
}
