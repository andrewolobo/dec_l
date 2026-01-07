/**
 * Rating Routes
 * API endpoints for seller rating operations
 */
import { Router } from "express";
import { ratingController } from "../controllers/rating.controller";
import {
  authenticate,
  validate,
  validateParams,
  validateQuery,
} from "../middleware";
import {
  createLimiter,
  readLimiter,
} from "../middleware/rate-limit.middleware";
import {
  createRatingSchema,
  updateRatingSchema,
  ratingIdParamSchema,
  sellerIdParamSchema,
  paginationQuerySchema,
  topSellersQuerySchema,
  canRateSellerQuerySchema,
} from "../validators/rating.validation";

const router = Router();

/**
 * @route   POST /api/v1/ratings
 * @desc    Create a new rating for a seller
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  createLimiter,
  validate(createRatingSchema),
  ratingController.createRating
);

/**
 * @route   PUT /api/v1/ratings/:id
 * @desc    Update an existing rating
 * @access  Private
 */
router.put(
  "/:id",
  authenticate,
  createLimiter,
  validateParams(ratingIdParamSchema),
  validate(updateRatingSchema),
  ratingController.updateRating
);

/**
 * @route   DELETE /api/v1/ratings/:id
 * @desc    Delete a rating
 * @access  Private
 */
router.delete(
  "/:id",
  authenticate,
  createLimiter,
  validateParams(ratingIdParamSchema),
  ratingController.deleteRating
);

/**
 * @route   GET /api/v1/ratings/seller/:sellerId
 * @desc    Get all ratings for a specific seller
 * @access  Public
 */
router.get(
  "/seller/:sellerId",
  readLimiter,
  validateParams(sellerIdParamSchema),
  validateQuery(paginationQuerySchema),
  ratingController.getSellerRatings
);

/**
 * @route   GET /api/v1/ratings/seller/:sellerId/score
 * @desc    Get seller's rating score and statistics
 * @access  Public
 */
router.get(
  "/seller/:sellerId/score",
  readLimiter,
  validateParams(sellerIdParamSchema),
  ratingController.getSellerScore
);

/**
 * @route   GET /api/v1/ratings/seller/:sellerId/distribution
 * @desc    Get rating distribution for a seller
 * @access  Public
 */
router.get(
  "/seller/:sellerId/distribution",
  readLimiter,
  validateParams(sellerIdParamSchema),
  ratingController.getRatingDistribution
);

/**
 * @route   GET /api/v1/ratings/my-ratings
 * @desc    Get ratings given by the current user
 * @access  Private
 */
router.get(
  "/my-ratings",
  authenticate,
  readLimiter,
  validateQuery(paginationQuerySchema),
  ratingController.getMyRatings
);

/**
 * @route   GET /api/v1/ratings/top-sellers
 * @desc    Get top-rated sellers
 * @access  Public
 */
router.get(
  "/top-sellers",
  readLimiter,
  validateQuery(topSellersQuerySchema),
  ratingController.getTopRatedSellers
);

/**
 * @route   GET /api/v1/ratings/can-rate
 * @desc    Check if user can rate a seller
 * @access  Private
 */
router.get(
  "/can-rate",
  authenticate,
  readLimiter,
  validateQuery(canRateSellerQuerySchema),
  ratingController.canRateSeller
);

export default router;
