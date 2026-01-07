/**
 * DTO for rating a seller
 */
export interface RateSellerDTO {
  sellerId: number;
  postId?: number;
  rating: number; // 1-5 scale
  comment?: string;
}

/**
 * DTO for updating a rating
 */
export interface UpdateRatingDTO {
  rating?: number; // 1-5 scale
  comment?: string;
}

/**
 * Response DTO for a seller rating
 */
export interface SellerRatingResponseDTO {
  id: number;
  rating: number;
  comment?: string;
  rater: {
    id: number;
    fullName: string;
    profilePictureUrl?: string;
  };
  seller?: {
    id: number;
    fullName: string;
    profilePictureUrl?: string;
  };
  post?: {
    id: number;
    title: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for seller score and statistics
 */
export interface SellerScoreDTO {
  score: number; // Positive ratio score (0-5)
  averageRating: number; // Average of all ratings (0-5)
  totalRatings: number;
  positiveRatings: number; // Ratings >= 4
  displayText: string; // e.g., "4.8 ★" or "New Seller"
  recentRatings?: SellerRatingResponseDTO[];
}

/**
 * DTO for rating distribution
 */
export interface RatingDistributionDTO {
  distribution: Array<{
    rating: number; // 1-5
    count: number;
  }>;
  total: number;
}

/**
 * DTO for checking if user can rate
 */
export interface CanRateDTO {
  canRate: boolean;
  reason?: string;
}
