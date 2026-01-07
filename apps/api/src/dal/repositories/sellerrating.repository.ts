import { BaseRepository } from "./base.repository";
import { SellerRating, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

/**
 * SellerRating Repository
 * Handles all database operations for seller ratings
 */
export class SellerRatingRepository extends BaseRepository<SellerRating> {
  protected modelName = Prisma.ModelName.SellerRating;

  /**
   * Create a new rating
   */
  async createRating(data: {
    sellerId: number;
    raterId: number;
    postId?: number;
    rating: number;
    comment?: string;
  }): Promise<SellerRating> {
    return this.create(data);
  }

  /**
   * Get all ratings for a seller with rater and post details
   */
  async getRatingsByUser(
    sellerId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    return this.findAll({
      where: { sellerId },
      include: {
        rater: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get ratings given by a user
   */
  async getRatingsByRater(
    raterId: number,
    limit: number = 10,
    offset: number = 0
  ): Promise<any[]> {
    return this.findAll({
      where: { raterId },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Calculate aggregate seller scores
   * Compatible with both PostgreSQL and SQL Server
   */
  async calculateSellerScore(sellerId: number): Promise<{
    averageRating: number;
    totalRatings: number;
    positiveRatings: number;
  }> {
    const result = await prisma.sellerRating.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    });

    const positiveCount = await prisma.sellerRating.count({
      where: { sellerId, rating: { gte: 4 } },
    });

    return {
      averageRating: result._avg.rating || 0,
      totalRatings: result._count.id,
      positiveRatings: positiveCount,
    };
  }

  /**
   * Check if a user has already rated a specific post
   */
  async hasUserRatedPost(raterId: number, postId: number): Promise<boolean> {
    const rating = await this.findOne({ raterId, postId });
    return !!rating;
  }

  /**
   * Check if a user has rated a seller (for any post or general rating)
   */
  async hasUserRatedSeller(
    raterId: number,
    sellerId: number
  ): Promise<boolean> {
    const rating = await this.findOne({ raterId, sellerId });
    return !!rating;
  }

  /**
   * Get rating by seller, rater, and post combination
   */
  async findRating(
    sellerId: number,
    raterId: number,
    postId?: number
  ): Promise<SellerRating | null> {
    return this.findOne({ sellerId, raterId, postId });
  }

  /**
   * Get rating details by ID with relations
   */
  async getRatingDetails(ratingId: number): Promise<any | null> {
    return prisma.sellerRating.findUnique({
      where: { id: ratingId },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
            email: true,
          },
        },
        rater: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
          },
        },
      },
    });
  }

  /**
   * Update a rating (for edit functionality)
   */
  async updateRating(
    ratingId: number,
    data: {
      rating?: number;
      comment?: string;
    }
  ): Promise<SellerRating> {
    return this.update(ratingId, data);
  }

  /**
   * Delete a rating (soft delete or hard delete)
   */
  async deleteRating(ratingId: number): Promise<SellerRating> {
    return this.delete(ratingId);
  }

  /**
   * Get recent ratings across the platform
   * Useful for admin dashboard or homepage
   */
  async getRecentRatings(limit: number = 10): Promise<any[]> {
    return prisma.sellerRating.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        seller: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        rater: {
          select: {
            id: true,
            fullName: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Get rating distribution for a seller
   * Returns count for each rating value (1-5 stars)
   */
  async getRatingDistribution(sellerId: number): Promise<
    Array<{
      rating: number;
      count: number;
    }>
  > {
    const distribution = await prisma.sellerRating.groupBy({
      by: ["rating"],
      where: { sellerId },
      _count: { rating: true },
      orderBy: { rating: "desc" },
    });

    return distribution.map((item) => ({
      rating: item.rating,
      count: item._count.rating,
    }));
  }

  /**
   * Get top-rated sellers
   * Returns sellers with highest average ratings (minimum rating count required)
   */
  async getTopRatedSellers(
    limit: number = 10,
    minRatings: number = 3
  ): Promise<any[]> {
    return prisma.user.findMany({
      where: {
        totalRatings: { gte: minRatings },
      },
      select: {
        id: true,
        fullName: true,
        profilePictureUrl: true,
        sellerRating: true,
        totalRatings: true,
        positiveRatings: true,
      },
      orderBy: { sellerRating: "desc" },
      take: limit,
    });
  }

  /**
   * Get ratings for a specific post
   */
  async getRatingsByPost(postId: number): Promise<any[]> {
    return this.findAll({
      where: { postId },
      include: {
        rater: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Count total ratings in the system
   */
  async getTotalRatingsCount(): Promise<number> {
    return this.count();
  }

  /**
   * Get average rating across the platform
   */
  async getPlatformAverageRating(): Promise<number> {
    const result = await prisma.sellerRating.aggregate({
      _avg: { rating: true },
    });
    return result._avg.rating || 0;
  }
}
