/**
 * Rating Service Integration Tests
 * Tests the complete rating flow including service layer, repository, and database
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { RatingService } from "../src/services/rating.service";
import { SellerRatingRepository } from "../src/dal/repositories/sellerrating.repository";
import { UserRepository } from "../src/dal/repositories/user.repository";
import { MessageRepository } from "../src/dal/repositories/message.repository";
import prisma from "../src/dal/prisma.client";
import type {
  RateSellerDTO,
  UpdateRatingDTO,
} from "../src/types/rating/rating.types";

describe("Rating Service Integration Tests", () => {
  let ratingService: RatingService;
  let sellerRatingRepo: SellerRatingRepository;
  let userRepo: UserRepository;
  let messageRepo: MessageRepository;

  // Test user IDs
  let sellerId: number;
  let raterId: number;
  let postId: number;

  beforeAll(async () => {
    // Initialize services
    ratingService = new RatingService();
    sellerRatingRepo = new SellerRatingRepository();
    userRepo = new UserRepository();
    messageRepo = new MessageRepository();

    // Create test users
    const seller = await userRepo.create({
      emailAddress: `seller_test_${Date.now()}@example.com`,
      passwordHash: "test_hash",
      fullName: "Test Seller",
      phoneNumber: "1234567890",
    });
    sellerId = seller.id;

    const rater = await userRepo.create({
      emailAddress: `rater_test_${Date.now()}@example.com`,
      passwordHash: "test_hash",
      fullName: "Test Rater",
      phoneNumber: "0987654321",
    });
    raterId = rater.id;

    // Create test post
    const post = await prisma.post.create({
      data: {
        userId: sellerId,
        title: "Test Post",
        description: "Test Description",
        price: 100,
        categoryId: 1,
        location: "Test Location",
        status: "Active",
      },
    });
    postId = post.id;

    // Create message exchange (required for rating)
    await messageRepo.create({
      senderId: raterId,
      recipientId: sellerId,
      postId: postId,
      messageText: "Hello, is this available?",
      isRead: false,
      isDeleted: false,
    });

    await messageRepo.create({
      senderId: sellerId,
      recipientId: raterId,
      postId: postId,
      messageText: "Yes, it is available!",
      isRead: false,
      isDeleted: false,
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.sellerRating.deleteMany({
      where: { OR: [{ sellerId }, { raterId }] },
    });
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: raterId }, { recipientId: raterId }] },
    });
    await prisma.post.deleteMany({ where: { userId: sellerId } });
    await prisma.user.deleteMany({
      where: { id: { in: [sellerId, raterId] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean ratings before each test
    await prisma.sellerRating.deleteMany({
      where: { raterId },
    });
    // Reset seller aggregate scores
    await prisma.user.update({
      where: { id: sellerId },
      data: { sellerRating: 0, totalRatings: 0, positiveRatings: 0 },
    });
  });

  describe("createRating", () => {
    it("should create a valid rating successfully", async () => {
      const ratingData: RateSellerDTO = {
        sellerId,
        postId,
        rating: 5,
        comment: "Excellent seller!",
      };

      const result = await ratingService.createRating(raterId, ratingData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.rating).toBe(5);
      expect(result.data!.sellerId).toBe(sellerId);
      expect(result.data!.raterId).toBe(raterId);
    });

    it("should reject rating outside 1-5 range", async () => {
      const invalidRating: RateSellerDTO = {
        sellerId,
        rating: 6,
      };

      const result = await ratingService.createRating(raterId, invalidRating);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("VALIDATION_ERROR");
    });

    it("should prevent self-rating", async () => {
      const selfRating: RateSellerDTO = {
        sellerId: raterId,
        rating: 5,
      };

      const result = await ratingService.createRating(raterId, selfRating);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SELF_RATING_NOT_ALLOWED");
    });

    it("should prevent duplicate ratings", async () => {
      const ratingData: RateSellerDTO = {
        sellerId,
        postId,
        rating: 5,
      };

      // Create first rating
      await ratingService.createRating(raterId, ratingData);

      // Attempt duplicate
      const result = await ratingService.createRating(raterId, ratingData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("ALREADY_RATED");
    });

    it("should require message exchange before rating", async () => {
      // Create new user without message exchange
      const newUser = await userRepo.create({
        emailAddress: `noexchange_${Date.now()}@example.com`,
        passwordHash: "test_hash",
        fullName: "No Exchange User",
        phoneNumber: "5555555555",
      });

      const ratingData: RateSellerDTO = {
        sellerId,
        rating: 4,
      };

      const result = await ratingService.createRating(newUser.id, ratingData);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NO_INTERACTION");

      // Cleanup
      await prisma.user.delete({ where: { id: newUser.id } });
    });

    it("should update seller aggregate scores on rating", async () => {
      const ratingData: RateSellerDTO = {
        sellerId,
        rating: 5,
      };

      await ratingService.createRating(raterId, ratingData);

      const seller = await userRepo.findById(sellerId);

      expect(seller!.totalRatings).toBe(1);
      expect(seller!.positiveRatings).toBe(1);
      expect(seller!.sellerRating).toBeGreaterThan(0);
    });

    it("should correctly calculate aggregate with multiple ratings", async () => {
      // Create multiple raters
      const rater2 = await userRepo.create({
        emailAddress: `rater2_${Date.now()}@example.com`,
        passwordHash: "test_hash",
        fullName: "Rater 2",
        phoneNumber: "1111111111",
      });

      const rater3 = await userRepo.create({
        emailAddress: `rater3_${Date.now()}@example.com`,
        passwordHash: "test_hash",
        fullName: "Rater 3",
        phoneNumber: "2222222222",
      });

      // Create message exchanges
      await messageRepo.create({
        senderId: rater2.id,
        recipientId: sellerId,
        messageText: "Test",
        isRead: false,
        isDeleted: false,
      });

      await messageRepo.create({
        senderId: rater3.id,
        recipientId: sellerId,
        messageText: "Test",
        isRead: false,
        isDeleted: false,
      });

      // Create ratings: 5, 4, 3
      await ratingService.createRating(raterId, { sellerId, rating: 5 });
      await ratingService.createRating(rater2.id, { sellerId, rating: 4 });
      await ratingService.createRating(rater3.id, { sellerId, rating: 3 });

      const seller = await userRepo.findById(sellerId);

      expect(seller!.totalRatings).toBe(3);
      expect(seller!.positiveRatings).toBe(2); // 5 and 4 are >= 4
      const expectedScore = (2 / 3) * 5; // (positiveRatings / totalRatings) * 5
      expect(seller!.sellerRating).toBeCloseTo(expectedScore, 2);

      // Cleanup
      await prisma.sellerRating.deleteMany({
        where: { raterId: { in: [rater2.id, rater3.id] } },
      });
      await prisma.message.deleteMany({
        where: { senderId: { in: [rater2.id, rater3.id] } },
      });
      await prisma.user.deleteMany({
        where: { id: { in: [rater2.id, rater3.id] } },
      });
    });
  });

  describe("updateRating", () => {
    it("should update rating successfully", async () => {
      // Create initial rating
      const createResult = await ratingService.createRating(raterId, {
        sellerId,
        rating: 3,
        comment: "Initial comment",
      });

      const ratingId = createResult.data!.id;

      // Update rating
      const updateData: UpdateRatingDTO = {
        rating: 5,
        comment: "Updated comment",
      };

      const result = await ratingService.updateRating(
        raterId,
        ratingId,
        updateData
      );

      expect(result.success).toBe(true);
      expect(result.data!.rating).toBe(5);
      expect(result.data!.comment).toBe("Updated comment");
    });

    it("should prevent updating another user's rating", async () => {
      const otherUser = await userRepo.create({
        emailAddress: `other_${Date.now()}@example.com`,
        passwordHash: "test_hash",
        fullName: "Other User",
        phoneNumber: "9999999999",
      });

      // Create rating by raterId
      const createResult = await ratingService.createRating(raterId, {
        sellerId,
        rating: 4,
      });

      const ratingId = createResult.data!.id;

      // Try to update with different user
      const result = await ratingService.updateRating(otherUser.id, ratingId, {
        rating: 1,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");

      // Cleanup
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it("should recalculate aggregates on rating update", async () => {
      // Create initial rating (positive: >= 4)
      const createResult = await ratingService.createRating(raterId, {
        sellerId,
        rating: 5,
      });

      let seller = await userRepo.findById(sellerId);
      expect(seller!.positiveRatings).toBe(1);

      // Update to non-positive rating
      await ratingService.updateRating(raterId, createResult.data!.id, {
        rating: 2,
      });

      seller = await userRepo.findById(sellerId);
      expect(seller!.positiveRatings).toBe(0);
      expect(seller!.totalRatings).toBe(1);
    });
  });

  describe("deleteRating", () => {
    it("should delete rating successfully", async () => {
      const createResult = await ratingService.createRating(raterId, {
        sellerId,
        rating: 5,
      });

      const ratingId = createResult.data!.id;

      const result = await ratingService.deleteRating(raterId, ratingId);

      expect(result.success).toBe(true);

      // Verify deletion
      const deleted = await sellerRatingRepo.findById(ratingId);
      expect(deleted).toBeNull();
    });

    it("should recalculate aggregates on rating deletion", async () => {
      await ratingService.createRating(raterId, { sellerId, rating: 5 });

      let seller = await userRepo.findById(sellerId);
      const initialTotal = seller!.totalRatings;
      const initialPositive = seller!.positiveRatings;

      const ratings = await sellerRatingRepo.findAll({ where: { raterId } });
      await ratingService.deleteRating(raterId, ratings[0].id);

      seller = await userRepo.findById(sellerId);
      expect(seller!.totalRatings).toBe(initialTotal - 1);
      expect(seller!.positiveRatings).toBe(initialPositive - 1);
    });
  });

  describe("getSellerScore", () => {
    it("should return correct seller score", async () => {
      await ratingService.createRating(raterId, { sellerId, rating: 5 });

      const result = await ratingService.getSellerScore(sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.sellerId).toBe(sellerId);
      expect(result.data!.totalRatings).toBe(1);
      expect(result.data!.averageRating).toBe(5);
    });

    it('should return "New Seller" for seller with no ratings', async () => {
      const result = await ratingService.getSellerScore(sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.displayText).toBe("New Seller");
    });

    it("should return count for seller with < 3 ratings", async () => {
      await ratingService.createRating(raterId, { sellerId, rating: 4 });

      const result = await ratingService.getSellerScore(sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.displayText).toContain("rating");
    });
  });

  describe("canUserRateSeller", () => {
    it("should return true when eligible", async () => {
      const result = await ratingService.canUserRateSeller(raterId, sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.canRate).toBe(true);
      expect(result.data!.alreadyRated).toBe(false);
    });

    it("should return false for self-rating", async () => {
      const result = await ratingService.canUserRateSeller(sellerId, sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.canRate).toBe(false);
    });

    it("should return false when already rated", async () => {
      await ratingService.createRating(raterId, { sellerId, rating: 5 });

      const result = await ratingService.canUserRateSeller(raterId, sellerId);

      expect(result.success).toBe(true);
      expect(result.data!.canRate).toBe(false);
      expect(result.data!.alreadyRated).toBe(true);
    });
  });
});
