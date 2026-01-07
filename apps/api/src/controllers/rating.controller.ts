/**
 * Rating Controller
 * Handles seller rating operations
 */
import { Request, Response, NextFunction } from "express";
import { RatingService } from "../services/rating.service";
import { RateSellerDTO, UpdateRatingDTO } from "../types/rating/rating.types";

const ratingService = new RatingService();

export class RatingController {
  /**
   * Create a new rating
   * POST /api/v1/ratings
   */
  async createRating(req: Request, res: Response, next: NextFunction) {
    try {
      const raterId = req.user!.userId;
      const dto: RateSellerDTO = req.body;

      const result = await ratingService.createRating(raterId, dto);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an existing rating
   * PUT /api/v1/ratings/:id
   */
  async updateRating(req: Request, res: Response, next: NextFunction) {
    try {
      const raterId = req.user!.userId;
      const ratingId = parseInt(req.params.id, 10);
      const dto: UpdateRatingDTO = req.body;

      const result = await ratingService.updateRating(raterId, ratingId, dto);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a rating
   * DELETE /api/v1/ratings/:id
   */
  async deleteRating(req: Request, res: Response, next: NextFunction) {
    try {
      const raterId = req.user!.userId;
      const ratingId = parseInt(req.params.id, 10);

      const result = await ratingService.deleteRating(raterId, ratingId);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ratings for a seller
   * GET /api/v1/ratings/seller/:sellerId
   */
  async getSellerRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const sellerId = parseInt(req.params.sellerId, 10);
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await ratingService.getSellerRatings(
        sellerId,
        limit,
        offset
      );

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get seller score and statistics
   * GET /api/v1/ratings/seller/:sellerId/score
   */
  async getSellerScore(req: Request, res: Response, next: NextFunction) {
    try {
      const sellerId = parseInt(req.params.sellerId, 10);

      const result = await ratingService.getSellerScore(sellerId);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rating distribution for a seller
   * GET /api/v1/ratings/seller/:sellerId/distribution
   */
  async getRatingDistribution(req: Request, res: Response, next: NextFunction) {
    try {
      const sellerId = parseInt(req.params.sellerId, 10);

      const result = await ratingService.getRatingDistribution(sellerId);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ratings given by the current user
   * GET /api/v1/ratings/my-ratings
   */
  async getMyRatings(req: Request, res: Response, next: NextFunction) {
    try {
      const raterId = req.user!.userId;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await ratingService.getRatingsGivenByUser(
        raterId,
        limit,
        offset
      );

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top-rated sellers
   * GET /api/v1/ratings/top-sellers
   */
  async getTopRatedSellers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const minRatings = parseInt(req.query.minRatings as string) || 3;

      const result = await ratingService.getTopRatedSellers(limit, minRatings);

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user can rate a seller
   * GET /api/v1/ratings/can-rate
   */
  async canRateSeller(req: Request, res: Response, next: NextFunction) {
    try {
      const raterId = req.user!.userId;
      const sellerId = parseInt(req.query.sellerId as string);
      const postId = req.query.postId
        ? parseInt(req.query.postId as string)
        : undefined;

      if (!sellerId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "sellerId is required",
            statusCode: 400,
          },
        });
      }

      const result = await ratingService.canUserRateSeller(
        raterId,
        sellerId,
        postId
      );

      if (!result.success) {
        return res.status(result.error!.statusCode).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const ratingController = new RatingController();
