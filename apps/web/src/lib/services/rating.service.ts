import { apiClient } from './api.client';
import type { ApiResponse, PaginatedResponse } from '$types/api.types';
import type {
	RateSellerDTO,
	UpdateRatingDTO,
	SellerRatingResponseDTO,
	SellerScoreDTO,
	RatingDistributionDTO,
	CanRateDTO,
	RatingPaginationParams,
	TopSellersParams,
	CanRateParams
} from '$types/rating.types';
import { handleError } from '$lib/utils/error-handler';

/**
 * Rating Service
 * Handles all rating-related API calls
 *
 * Features:
 * - Create, update, delete ratings
 * - Fetch seller ratings and scores
 * - Get rating statistics and distribution
 * - Check rating eligibility
 * - Error handling
 */

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new rating for a seller
 * Requires authentication
 */
export async function createRating(
	data: RateSellerDTO
): Promise<ApiResponse<SellerRatingResponseDTO>> {
	try {
		const response = await apiClient.post<ApiResponse<SellerRatingResponseDTO>>('/ratings', data);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Update an existing rating
 * Can only update your own ratings
 */
export async function updateRating(
	ratingId: number,
	data: UpdateRatingDTO
): Promise<ApiResponse<SellerRatingResponseDTO>> {
	try {
		const response = await apiClient.put<ApiResponse<SellerRatingResponseDTO>>(
			`/ratings/${ratingId}`,
			data
		);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Delete a rating
 * Can only delete your own ratings
 */
export async function deleteRating(ratingId: number): Promise<ApiResponse<void>> {
	try {
		const response = await apiClient.delete<ApiResponse<void>>(`/ratings/${ratingId}`);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

// ============================================================================
// Query Operations
// ============================================================================

/**
 * Get all ratings for a specific seller
 * Public endpoint - no authentication required
 */
export async function getSellerRatings(
	sellerId: number,
	params?: RatingPaginationParams
): Promise<ApiResponse<SellerRatingResponseDTO[]>> {
	try {
		const response = await apiClient.get<ApiResponse<SellerRatingResponseDTO[]>>(
			`/ratings/seller/${sellerId}`,
			{ params }
		);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Get seller's rating score and statistics
 * Public endpoint - no authentication required
 */
export async function getSellerScore(sellerId: number): Promise<ApiResponse<SellerScoreDTO>> {
	try {
		const response = await apiClient.get<ApiResponse<SellerScoreDTO>>(
			`/ratings/seller/${sellerId}/score`
		);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Get rating distribution for a seller (1-5 star breakdown)
 * Public endpoint - no authentication required
 */
export async function getRatingDistribution(
	sellerId: number
): Promise<ApiResponse<RatingDistributionDTO>> {
	try {
		const response = await apiClient.get<ApiResponse<RatingDistributionDTO>>(
			`/ratings/seller/${sellerId}/distribution`
		);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Get ratings given by the current user
 * Requires authentication
 */
export async function getMyRatings(
	params?: RatingPaginationParams
): Promise<ApiResponse<SellerRatingResponseDTO[]>> {
	try {
		const response = await apiClient.get<ApiResponse<SellerRatingResponseDTO[]>>(
			'/ratings/my-ratings',
			{ params }
		);
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Get top-rated sellers
 * Public endpoint - no authentication required
 */
export async function getTopRatedSellers(
	params?: TopSellersParams
): Promise<ApiResponse<SellerScoreDTO[]>> {
	try {
		const response = await apiClient.get<ApiResponse<SellerScoreDTO[]>>('/ratings/top-sellers', {
			params
		});
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Check if current user can rate a specific seller
 * Requires authentication
 * Returns eligibility status and reason
 */
export async function canRateSeller(params: CanRateParams): Promise<ApiResponse<CanRateDTO>> {
	try {
		const response = await apiClient.get<ApiResponse<CanRateDTO>>('/ratings/can-rate', {
			params
		});
		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format rating score for display
 * Follows business rules: "New Seller", "X ratings", or "X.X ★"
 */
export function formatRatingDisplay(score: SellerScoreDTO): string {
	if (score.totalRatings === 0) {
		return 'New Seller';
	}
	if (score.totalRatings < 3) {
		return `${score.totalRatings} rating${score.totalRatings === 1 ? '' : 's'}`;
	}
	return `${score.averageRating.toFixed(1)} ★`;
}

/**
 * Get rating color class based on average rating
 * Useful for applying different styles based on rating quality
 */
export function getRatingColorClass(averageRating: number): string {
	if (averageRating >= 4.5) return 'text-green-600';
	if (averageRating >= 4.0) return 'text-green-500';
	if (averageRating >= 3.5) return 'text-yellow-500';
	if (averageRating >= 3.0) return 'text-orange-500';
	return 'text-red-500';
}

/**
 * Calculate percentage for rating distribution bar
 */
export function calculateRatingPercentage(count: number, total: number): number {
	if (total === 0) return 0;
	return Math.round((count / total) * 100);
}

/**
 * Validate rating value (1-5)
 */
export function isValidRating(rating: number): boolean {
	return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Validate comment length (max 1000 characters)
 */
export function isValidComment(comment: string): boolean {
	return comment.length <= 1000;
}
