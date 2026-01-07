import {
  sellerRatingRepository,
  userRepository,
  messageRepository,
} from "../dal/repositories";
import { ApiResponse, ErrorCode } from "../types/common/api-response.types";
import {
  RateSellerDTO,
  SellerRatingResponseDTO,
  SellerScoreDTO,
  RatingDistributionDTO,
  UpdateRatingDTO,
} from "../types/rating/rating.types";

/**
 * RatingService
 * Handles all business logic for seller ratings
 */
export class RatingService {
  /**
   * Create a new rating for a seller
   */
  async createRating(
    raterId: number,
    data: RateSellerDTO
  ): Promise<ApiResponse<SellerRatingResponseDTO>> {
    try {
      // Validation 1: Rating must be between 1 and 5
      if (data.rating < 1 || data.rating > 5) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Rating must be between 1 and 5 stars",
            statusCode: 400,
          },
        };
      }

      // Validation 2: Cannot rate yourself
      if (data.sellerId === raterId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You cannot rate yourself",
            statusCode: 403,
          },
        };
      }

      // Validation 3: Check if seller exists
      const seller = await userRepository.findById(data.sellerId);
      if (!seller) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Seller not found",
            statusCode: 404,
          },
        };
      }

      // Validation 4: Check for duplicate rating
      if (data.postId) {
        const existingRating = await sellerRatingRepository.hasUserRatedPost(
          raterId,
          data.postId
        );
        if (existingRating) {
          return {
            success: false,
            error: {
              code: ErrorCode.CONFLICT,
              message: "You have already rated this seller for this post",
              statusCode: 409,
            },
          };
        }
      } else {
        // General seller rating (not post-specific)
        const existingRating = await sellerRatingRepository.hasUserRatedSeller(
          raterId,
          data.sellerId
        );
        if (existingRating) {
          return {
            success: false,
            error: {
              code: ErrorCode.CONFLICT,
              message: "You have already rated this seller",
              statusCode: 409,
            },
          };
        }
      }

      // Validation 5: Verify message exchange between buyer and seller
      const hasInteraction = await messageRepository.findOne({
        OR: [
          { senderId: raterId, recipientId: data.sellerId },
          { senderId: data.sellerId, recipientId: raterId },
        ],
        isDeleted: false,
      });

      if (!hasInteraction) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "You can only rate sellers you have communicated with via messages",
            statusCode: 403,
          },
        };
      }

      // Create the rating
      const rating = await sellerRatingRepository.createRating({
        sellerId: data.sellerId,
        raterId,
        postId: data.postId,
        rating: data.rating,
        comment: data.comment,
      });

      // Update seller aggregate scores
      await this.updateSellerAggregates(data.sellerId);

      // Get the rating with full details
      const ratingDetails = await sellerRatingRepository.getRatingDetails(
        rating.id
      );

      return {
        success: true,
        data: this.mapToRatingResponse(ratingDetails),
        message: "Rating submitted successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create rating",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update an existing rating
   */
  async updateRating(
    raterId: number,
    ratingId: number,
    data: UpdateRatingDTO
  ): Promise<ApiResponse<SellerRatingResponseDTO>> {
    try {
      // Get existing rating
      const existingRating =
        await sellerRatingRepository.getRatingDetails(ratingId);

      if (!existingRating) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Rating not found",
            statusCode: 404,
          },
        };
      }

      // Verify ownership
      if (existingRating.raterId !== raterId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only update your own ratings",
            statusCode: 403,
          },
        };
      }

      // Validate new rating if provided
      if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Rating must be between 1 and 5 stars",
            statusCode: 400,
          },
        };
      }

      // Update the rating
      await sellerRatingRepository.updateRating(ratingId, data);

      // If rating value changed, update seller aggregates
      if (data.rating !== undefined && data.rating !== existingRating.rating) {
        await this.updateSellerAggregates(existingRating.sellerId);
      }

      // Get updated rating with details
      const updatedRating =
        await sellerRatingRepository.getRatingDetails(ratingId);

      return {
        success: true,
        data: this.mapToRatingResponse(updatedRating),
        message: "Rating updated successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to update rating",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete a rating
   */
  async deleteRating(
    raterId: number,
    ratingId: number
  ): Promise<ApiResponse<void>> {
    try {
      // Get rating to verify ownership and get seller ID
      const rating = await sellerRatingRepository.getRatingDetails(ratingId);

      if (!rating) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Rating not found",
            statusCode: 404,
          },
        };
      }

      // Verify ownership
      if (rating.raterId !== raterId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only delete your own ratings",
            statusCode: 403,
          },
        };
      }

      // Delete the rating
      await sellerRatingRepository.deleteRating(ratingId);

      // Update seller aggregates
      await this.updateSellerAggregates(rating.sellerId);

      return {
        success: true,
        message: "Rating deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to delete rating",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get ratings for a seller
   */
  async getSellerRatings(
    sellerId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<ApiResponse<SellerRatingResponseDTO[]>> {
    try {
      // Verify seller exists
      const seller = await userRepository.findById(sellerId);
      if (!seller) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Seller not found",
            statusCode: 404,
          },
        };
      }

      const ratings = await sellerRatingRepository.getRatingsByUser(
        sellerId,
        limit,
        offset
      );

      return {
        success: true,
        data: ratings.map((r) => this.mapToRatingResponse(r)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get seller ratings",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get seller score and statistics
   */
  async getSellerScore(sellerId: number): Promise<ApiResponse<SellerScoreDTO>> {
    try {
      // Verify seller exists
      const seller = await userRepository.findById(sellerId);
      if (!seller) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Seller not found",
            statusCode: 404,
          },
        };
      }

      const scores =
        await sellerRatingRepository.calculateSellerScore(sellerId);

      // Calculate positive ratio score (0-5 scale)
      const positiveRatioScore =
        scores.totalRatings > 0
          ? (scores.positiveRatings / scores.totalRatings) * 5
          : 0;

      // Get recent ratings
      const recentRatings = await sellerRatingRepository.getRatingsByUser(
        sellerId,
        5
      );

      // Determine display text
      let displayText: string;
      if (scores.totalRatings === 0) {
        displayText = "New Seller";
      } else if (scores.totalRatings < 3) {
        displayText = `${scores.totalRatings} ${scores.totalRatings === 1 ? "rating" : "ratings"}`;
      } else {
        displayText = `${positiveRatioScore.toFixed(1)} ★`;
      }

      return {
        success: true,
        data: {
          score: Math.round(positiveRatioScore * 10) / 10,
          averageRating: Math.round(scores.averageRating * 10) / 10,
          totalRatings: scores.totalRatings,
          positiveRatings: scores.positiveRatings,
          displayText,
          recentRatings: recentRatings.map((r) => this.mapToRatingResponse(r)),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get seller score",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get rating distribution for a seller
   */
  async getRatingDistribution(
    sellerId: number
  ): Promise<ApiResponse<RatingDistributionDTO>> {
    try {
      const distribution =
        await sellerRatingRepository.getRatingDistribution(sellerId);

      // Create complete distribution (all 1-5 stars)
      const completeDistribution = [5, 4, 3, 2, 1].map((star) => {
        const found = distribution.find((d) => d.rating === star);
        return {
          rating: star,
          count: found ? found.count : 0,
        };
      });

      const total = completeDistribution.reduce((sum, d) => sum + d.count, 0);

      return {
        success: true,
        data: {
          distribution: completeDistribution,
          total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get rating distribution",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get ratings given by a user
   */
  async getRatingsGivenByUser(
    raterId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<ApiResponse<SellerRatingResponseDTO[]>> {
    try {
      const ratings = await sellerRatingRepository.getRatingsByRater(
        raterId,
        limit,
        offset
      );

      return {
        success: true,
        data: ratings.map((r) => this.mapToRatingResponse(r)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get ratings",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get top-rated sellers
   */
  async getTopRatedSellers(
    limit: number = 10,
    minRatings: number = 3
  ): Promise<ApiResponse<any[]>> {
    try {
      const topSellers = await sellerRatingRepository.getTopRatedSellers(
        limit,
        minRatings
      );

      return {
        success: true,
        data: topSellers,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get top-rated sellers",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Check if user can rate a seller
   */
  async canUserRateSeller(
    raterId: number,
    sellerId: number,
    postId?: number
  ): Promise<ApiResponse<{ canRate: boolean; reason?: string }>> {
    try {
      // Cannot rate yourself
      if (raterId === sellerId) {
        return {
          success: true,
          data: {
            canRate: false,
            reason: "Cannot rate yourself",
          },
        };
      }

      // Check if already rated
      if (postId) {
        const hasRated = await sellerRatingRepository.hasUserRatedPost(
          raterId,
          postId
        );
        if (hasRated) {
          return {
            success: true,
            data: {
              canRate: false,
              reason: "Already rated this seller for this post",
            },
          };
        }
      } else {
        const hasRated = await sellerRatingRepository.hasUserRatedSeller(
          raterId,
          sellerId
        );
        if (hasRated) {
          return {
            success: true,
            data: {
              canRate: false,
              reason: "Already rated this seller",
            },
          };
        }
      }

      // Check message exchange
      const hasInteraction = await messageRepository.findOne({
        OR: [
          { senderId: raterId, recipientId: sellerId },
          { senderId: sellerId, recipientId: raterId },
        ],
        isDeleted: false,
      });

      if (!hasInteraction) {
        return {
          success: true,
          data: {
            canRate: false,
            reason: "Must have message exchange with seller to rate",
          },
        };
      }

      return {
        success: true,
        data: {
          canRate: true,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to check rating eligibility",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update seller aggregate scores
   * Called after rating creation, update, or deletion
   */
  private async updateSellerAggregates(sellerId: number): Promise<void> {
    try {
      const scores =
        await sellerRatingRepository.calculateSellerScore(sellerId);

      // Calculate positive ratio score
      const positiveRatioScore =
        scores.totalRatings > 0
          ? (scores.positiveRatings / scores.totalRatings) * 5
          : 0;

      // Update user record with new aggregates
      await userRepository.update(sellerId, {
        sellerRating: positiveRatioScore,
        totalRatings: scores.totalRatings,
        positiveRatings: scores.positiveRatings,
      });
    } catch (error) {
      // Log error but don't throw - aggregates can be updated later
      console.error(
        `Failed to update seller aggregates for user ${sellerId}:`,
        error
      );
    }
  }

  /**
   * Map database rating to response DTO
   */
  private mapToRatingResponse(rating: any): SellerRatingResponseDTO {
    return {
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment || undefined,
      rater: {
        id: rating.rater.id,
        fullName: rating.rater.fullName,
        profilePictureUrl: rating.rater.profilePictureUrl || undefined,
      },
      seller: rating.seller
        ? {
            id: rating.seller.id,
            fullName: rating.seller.fullName,
            profilePictureUrl: rating.seller.profilePictureUrl || undefined,
          }
        : undefined,
      post: rating.post
        ? {
            id: rating.post.id,
            title: rating.post.title,
          }
        : undefined,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
    };
  }
}
