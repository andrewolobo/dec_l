import { Router } from "express";
import { postController } from "../controllers";
import {
  authenticate,
  optionalAuth,
  validate,
  validateParams,
  validateQuery,
} from "../middleware";
import {
  createLimiter,
  readLimiter,
} from "../middleware/rate-limit.middleware";
import {
  createPostSchema,
  updatePostSchema,
  postIdSchema,
  userIdSchema,
  feedOptionsSchema,
  searchOptionsSchema,
  schedulePostSchema,
} from "../validation/post.validation";

const router = Router();

/**
 * @route   POST /api/v1/posts
 * @desc    Create a new post
 * @access  Private
 */
router.post(
  "/",
  authenticate,
  createLimiter,
  validate(createPostSchema),
  postController.createPost
);

/**
 * @route   GET /api/v1/posts/feed
 * @desc    Get personalized post feed
 * @access  Public (optional auth for personalization)
 */
router.get(
  "/feed",
  optionalAuth,
  readLimiter,
  validateQuery(feedOptionsSchema),
  postController.getFeed
);

/**
 * @route   GET /api/v1/posts/search
 * @desc    Search posts with filters
 * @access  Public
 */
router.get(
  "/search",
  readLimiter,
  validateQuery(searchOptionsSchema),
  postController.searchPosts
);

/**
 * @route   GET /api/v1/posts/user/:userId
 * @desc    Get posts by user ID
 * @access  Public
 */
router.get(
  "/user/:userId",
  readLimiter,
  validateParams(userIdSchema),
  postController.getUserPosts
);

/**
 * @route   GET /api/v1/posts/:id
 * @desc    Get single post by ID
 * @access  Public (optional auth for likes status)
 */
router.get(
  "/:id",
  optionalAuth,
  readLimiter,
  validateParams(postIdSchema),
  postController.getPost
);

/**
 * @route   PUT /api/v1/posts/:id
 * @desc    Update a post
 * @access  Private (owner only)
 */
router.put(
  "/:id",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  validate(updatePostSchema),
  postController.updatePost
);

/**
 * @route   DELETE /api/v1/posts/:id
 * @desc    Delete a post
 * @access  Private (owner only)
 */
router.delete(
  "/:id",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  postController.deletePost
);

/**
 * @route   POST /api/v1/posts/:id/like
 * @desc    Like a post (or toggle like)
 * @access  Private
 */
router.post(
  "/:id/like",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  postController.toggleLike
);

/**
 * @route   DELETE /api/v1/posts/:id/like
 * @desc    Unlike a post
 * @access  Private
 */
router.delete(
  "/:id/like",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  postController.toggleLike
);

/**
 * @route   POST /api/v1/posts/:id/schedule
 * @desc    Schedule a post for future publishing
 * @access  Private (owner only)
 */
router.post(
  "/:id/schedule",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  validate(schedulePostSchema),
  postController.schedulePost
);

/**
 * @route   POST /api/v1/posts/:id/publish
 * @desc    Publish a draft or scheduled post immediately
 * @access  Private (owner only)
 */
router.post(
  "/:id/publish",
  authenticate,
  createLimiter,
  validateParams(postIdSchema),
  postController.publishPost
);

export default router;
