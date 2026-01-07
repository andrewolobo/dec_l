/**
 * Rating API Endpoint Tests
 * Tests all rating API endpoints with authentication, validation, and error handling
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import request from "supertest";
import express from "express";
import ratingRoutes from "../src/routes/rating.routes";
import prisma from "../src/dal/prisma.client";
import jwt from "jsonwebtoken";
import { UserRepository } from "../src/dal/repositories/user.repository";
import { MessageRepository } from "../src/dal/repositories/message.repository";

const app = express();
app.use(express.json());
app.use("/api/v1/ratings", ratingRoutes);

// Mock JWT secret
const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

describe("Rating API Endpoints", () => {
  let sellerToken: string;
  let raterToken: string;
  let sellerId: number;
  let raterId: number;
  let postId: number;
  let userRepo: UserRepository;
  let messageRepo: MessageRepository;

  beforeAll(async () => {
    userRepo = new UserRepository();
    messageRepo = new MessageRepository();

    // Create test users
    const seller = await userRepo.create({
      emailAddress: `api_seller_${Date.now()}@example.com`,
      passwordHash: "test_hash",
      fullName: "API Test Seller",
      phoneNumber: "1234567890",
    });
    sellerId = seller.id;
    sellerToken = jwt.sign(
      { userId: sellerId, email: seller.emailAddress },
      JWT_SECRET
    );

    const rater = await userRepo.create({
      emailAddress: `api_rater_${Date.now()}@example.com`,
      passwordHash: "test_hash",
      fullName: "API Test Rater",
      phoneNumber: "0987654321",
    });
    raterId = rater.id;
    raterToken = jwt.sign(
      { userId: raterId, email: rater.emailAddress },
      JWT_SECRET
    );

    // Create test post
    const post = await prisma.post.create({
      data: {
        userId: sellerId,
        title: "API Test Post",
        description: "Test Description",
        price: 100,
        categoryId: 1,
        location: "Test Location",
        status: "Active",
      },
    });
    postId = post.id;

    // Create message exchange
    await messageRepo.create({
      senderId: raterId,
      recipientId: sellerId,
      postId: postId,
      messageText: "Hello",
      isRead: false,
      isDeleted: false,
    });

    await messageRepo.create({
      senderId: sellerId,
      recipientId: raterId,
      postId: postId,
      messageText: "Hi",
      isRead: false,
      isDeleted: false,
    });
  });

  afterAll(async () => {
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
    await prisma.sellerRating.deleteMany({ where: { raterId } });
    await prisma.user.update({
      where: { id: sellerId },
      data: { sellerRating: 0, totalRatings: 0, positiveRatings: 0 },
    });
  });

  describe("POST /api/v1/ratings", () => {
    it("should create rating with valid authenticated request", async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({
          sellerId,
          postId,
          rating: 5,
          comment: "Excellent!",
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
    });

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(app).post("/api/v1/ratings").send({
        sellerId,
        rating: 5,
      });

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid rating value", async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({
          sellerId,
          rating: 6, // Invalid: must be 1-5
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({
          // Missing sellerId
          rating: 5,
        });

      expect(response.status).toBe(400);
    });

    it("should prevent duplicate ratings", async () => {
      // Create first rating
      await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 5 });

      // Attempt duplicate
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 4 });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("ALREADY_RATED");
    });

    it("should enforce rate limiting", async () => {
      // Note: This test depends on your rate limit configuration
      // Adjust the loop count based on your createLimiter settings
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .post("/api/v1/ratings")
            .set("Authorization", `Bearer ${raterToken}`)
            .send({ sellerId: 999999, rating: 5 })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });
  });

  describe("GET /api/v1/ratings/seller/:sellerId", () => {
    beforeEach(async () => {
      // Create some test ratings
      await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 5, comment: "Great seller!" });
    });

    it("should return seller ratings (public access)", async () => {
      const response = await request(app).get(
        `/api/v1/ratings/seller/${sellerId}`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data.ratings)).toBe(true);
      expect(response.body.data.ratings.length).toBeGreaterThan(0);
    });

    it("should support pagination", async () => {
      const response = await request(app)
        .get(`/api/v1/ratings/seller/${sellerId}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(10);
    });

    it("should filter by minimum rating", async () => {
      const response = await request(app)
        .get(`/api/v1/ratings/seller/${sellerId}`)
        .query({ minRating: 4 });

      expect(response.status).toBe(200);
      response.body.data.ratings.forEach((rating: any) => {
        expect(rating.rating).toBeGreaterThanOrEqual(4);
      });
    });

    it("should return 404 for non-existent seller", async () => {
      const response = await request(app).get("/api/v1/ratings/seller/999999");

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/ratings/seller/:sellerId/score", () => {
    it("should return seller score (public access)", async () => {
      await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 5 });

      const response = await request(app).get(
        `/api/v1/ratings/seller/${sellerId}/score`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sellerId).toBe(sellerId);
      expect(response.body.data.totalRatings).toBeGreaterThan(0);
    });

    it('should return "New Seller" for unrated seller', async () => {
      const response = await request(app).get(
        `/api/v1/ratings/seller/${sellerId}/score`
      );

      expect(response.status).toBe(200);
      expect(response.body.data.displayText).toBe("New Seller");
    });
  });

  describe("GET /api/v1/ratings/seller/:sellerId/distribution", () => {
    beforeEach(async () => {
      // Create ratings with different values
      const users = [];
      for (let i = 0; i < 5; i++) {
        const user = await userRepo.create({
          emailAddress: `dist_user_${i}_${Date.now()}@example.com`,
          passwordHash: "test_hash",
          fullName: `Dist User ${i}`,
          phoneNumber: `555000000${i}`,
        });
        users.push(user);

        // Create message exchange
        await messageRepo.create({
          senderId: user.id,
          recipientId: sellerId,
          messageText: "Test",
          isRead: false,
          isDeleted: false,
        });

        // Create rating (1-5 stars)
        const token = jwt.sign(
          { userId: user.id, email: user.emailAddress },
          JWT_SECRET
        );
        await request(app)
          .post("/api/v1/ratings")
          .set("Authorization", `Bearer ${token}`)
          .send({ sellerId, rating: (i % 5) + 1 });
      }

      // Cleanup users after test
      afterAll(async () => {
        await prisma.sellerRating.deleteMany({
          where: { raterId: { in: users.map((u) => u.id) } },
        });
        await prisma.message.deleteMany({
          where: { senderId: { in: users.map((u) => u.id) } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: users.map((u) => u.id) } },
        });
      });
    });

    it("should return rating distribution", async () => {
      const response = await request(app).get(
        `/api/v1/ratings/seller/${sellerId}/distribution`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.distribution).toBeDefined();
      expect(Object.keys(response.body.data.distribution)).toHaveLength(5);
    });

    it("should calculate percentages correctly", async () => {
      const response = await request(app).get(
        `/api/v1/ratings/seller/${sellerId}/distribution`
      );

      const distribution = response.body.data.distribution;
      const total = Object.values(distribution).reduce(
        (sum: number, val: any) => sum + val.count,
        0
      );

      Object.values(distribution).forEach((data: any) => {
        const expectedPercentage = (data.count / total) * 100;
        expect(data.percentage).toBeCloseTo(expectedPercentage, 1);
      });
    });
  });

  describe("PUT /api/v1/ratings/:ratingId", () => {
    let ratingId: number;

    beforeEach(async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 3, comment: "Initial" });

      ratingId = response.body.data.id;
    });

    it("should update own rating", async () => {
      const response = await request(app)
        .put(`/api/v1/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ rating: 5, comment: "Updated!" });

      expect(response.status).toBe(200);
      expect(response.body.data.rating).toBe(5);
      expect(response.body.data.comment).toBe("Updated!");
    });

    it("should return 401 for unauthenticated update", async () => {
      const response = await request(app)
        .put(`/api/v1/ratings/${ratingId}`)
        .send({ rating: 5 });

      expect(response.status).toBe(401);
    });

    it("should return 403 for updating another user's rating", async () => {
      const response = await request(app)
        .put(`/api/v1/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${sellerToken}`)
        .send({ rating: 1 });

      expect(response.status).toBe(403);
    });

    it("should return 404 for non-existent rating", async () => {
      const response = await request(app)
        .put("/api/v1/ratings/999999")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ rating: 5 });

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/ratings/:ratingId", () => {
    let ratingId: number;

    beforeEach(async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 4 });

      ratingId = response.body.data.id;
    });

    it("should delete own rating", async () => {
      const response = await request(app)
        .delete(`/api/v1/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${raterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("should return 401 for unauthenticated delete", async () => {
      const response = await request(app).delete(`/api/v1/ratings/${ratingId}`);

      expect(response.status).toBe(401);
    });

    it("should return 403 for deleting another user's rating", async () => {
      const response = await request(app)
        .delete(`/api/v1/ratings/${ratingId}`)
        .set("Authorization", `Bearer ${sellerToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe("GET /api/v1/ratings/can-rate/:sellerId", () => {
    it("should return eligibility status (authenticated)", async () => {
      const response = await request(app)
        .get(`/api/v1/ratings/can-rate/${sellerId}`)
        .set("Authorization", `Bearer ${raterToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.canRate).toBeDefined();
      expect(typeof response.body.data.canRate).toBe("boolean");
    });

    it("should return 401 for unauthenticated request", async () => {
      const response = await request(app).get(
        `/api/v1/ratings/can-rate/${sellerId}`
      );

      expect(response.status).toBe(401);
    });
  });

  describe("Database Constraints", () => {
    it("should enforce unique constraint on (sellerId, raterId)", async () => {
      // Create first rating
      await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: 5 });

      // Try to create duplicate directly in DB (bypassing service validation)
      await expect(
        prisma.sellerRating.create({
          data: {
            sellerId,
            raterId,
            rating: 4,
          },
        })
      ).rejects.toThrow();
    });

    it("should cascade delete ratings when user is deleted", async () => {
      // Create temporary user
      const tempUser = await userRepo.create({
        emailAddress: `temp_${Date.now()}@example.com`,
        passwordHash: "test_hash",
        fullName: "Temp User",
        phoneNumber: "0000000000",
      });

      // Create message exchange
      await messageRepo.create({
        senderId: tempUser.id,
        recipientId: sellerId,
        messageText: "Test",
        isRead: false,
        isDeleted: false,
      });

      // Create rating
      const token = jwt.sign(
        { userId: tempUser.id, email: tempUser.emailAddress },
        JWT_SECRET
      );
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${token}`)
        .send({ sellerId, rating: 5 });

      const ratingId = response.body.data.id;

      // Delete user
      await prisma.user.delete({ where: { id: tempUser.id } });

      // Verify rating was cascade deleted
      const rating = await prisma.sellerRating.findUnique({
        where: { id: ratingId },
      });
      expect(rating).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should return proper error format for validation errors", async () => {
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId, rating: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toBeDefined();
    });

    it("should handle server errors gracefully", async () => {
      // Force a server error by using invalid data type
      const response = await request(app)
        .post("/api/v1/ratings")
        .set("Authorization", `Bearer ${raterToken}`)
        .send({ sellerId: "not-a-number", rating: 5 });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.success).toBe(false);
    });
  });
});
