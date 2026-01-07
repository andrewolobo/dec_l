/**
 * Rating Type Definitions
 * TypeScript interfaces for rating system (matches backend DTOs)
 */

/**
 * Request DTO for creating a rating
 */
export interface RateSellerDTO {
	sellerId: number;
	postId?: number;
	rating: number; // 1-5
	comment?: string;
}

/**
 * Request DTO for updating a rating
 */
export interface UpdateRatingDTO {
	rating?: number; // 1-5
	comment?: string;
}

/**
 * Response DTO for a single rating
 */
export interface SellerRatingResponseDTO {
	id: number;
	sellerId: number;
	raterId: number;
	postId?: number;
	rating: number;
	comment?: string;
	createdAt: string;
	updatedAt: string;
	// Optional populated fields
	raterName?: string;
	raterProfilePicture?: string;
	postTitle?: string;
}

/**
 * Seller score/statistics DTO
 */
export interface SellerScoreDTO {
	sellerId: number;
	averageRating: number; // 0-5
	totalRatings: number;
	positiveRatings: number; // ratings >= 4
	displayText: string; // "New Seller", "X ratings", or "X.X ★"
}

/**
 * Rating distribution DTO
 */
export interface RatingDistributionDTO {
	sellerId: number;
	distribution: {
		1: number;
		2: number;
		3: number;
		4: number;
		5: number;
	};
	totalRatings: number;
}

/**
 * Can rate eligibility check DTO
 */
export interface CanRateDTO {
	canRate: boolean;
	reason: string;
	alreadyRated: boolean;
}

/**
 * Query parameters for pagination
 */
export interface RatingPaginationParams {
	limit?: number;
	offset?: number;
}

/**
 * Query parameters for top sellers
 */
export interface TopSellersParams {
	limit?: number;
	minRatings?: number;
}

/**
 * Query parameters for can rate check
 */
export interface CanRateParams {
	sellerId: number;
	postId?: number;
}

/**
 * Display options for star rating component
 */
export interface StarRatingOptions {
	interactive?: boolean; // Can user click to change rating
	size?: 'small' | 'medium' | 'large';
	showValue?: boolean; // Show numeric value next to stars
	maxStars?: number; // Default 5
}
