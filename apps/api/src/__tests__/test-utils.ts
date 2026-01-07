/**
 * Test Configuration and Utilities
 * Shared setup for unit, integration, and E2E tests
 */

import prisma from "../dal/prisma.client";
import { UserRepository } from "../dal/repositories/user.repository";
import { MessageRepository } from "../dal/repositories/message.repository";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret-key";

/**
 * Test data factory for creating consistent test data
 */
export class TestDataFactory {
  private userRepo: UserRepository;
  private messageRepo: MessageRepository;
  private createdUserIds: number[] = [];
  private createdPostIds: number[] = [];

  constructor() {
    this.userRepo = new UserRepository();
    this.messageRepo = new MessageRepository();
  }

  /**
   * Create a test user
   */
  async createUser(
    overrides?: Partial<{
      emailAddress: string;
      fullName: string;
      phoneNumber: string;
    }>
  ) {
    const timestamp = Date.now();
    const user = await this.userRepo.create({
      emailAddress:
        overrides?.emailAddress || `test_user_${timestamp}@example.com`,
      passwordHash: "test_hash_" + timestamp,
      fullName: overrides?.fullName || `Test User ${timestamp}`,
      phoneNumber:
        overrides?.phoneNumber || `555${String(timestamp).slice(-7)}`,
    });

    this.createdUserIds.push(user.id);
    return user;
  }

  /**
   * Create a test post
   */
  async createPost(
    userId: number,
    overrides?: Partial<{
      title: string;
      description: string;
      price: number;
      categoryId: number;
    }>
  ) {
    const post = await prisma.post.create({
      data: {
        userId,
        title: overrides?.title || "Test Post",
        description: overrides?.description || "Test Description",
        price: overrides?.price || 99.99,
        categoryId: overrides?.categoryId || 1,
        location: "Test Location",
        status: "Active",
      },
    });

    this.createdPostIds.push(post.id);
    return post;
  }

  /**
   * Create a message exchange between two users
   */
  async createMessageExchange(
    senderId: number,
    recipientId: number,
    postId?: number
  ) {
    const message1 = await this.messageRepo.create({
      senderId,
      recipientId,
      postId,
      messageText: "Hello, is this available?",
      isRead: false,
      isDeleted: false,
    });

    const message2 = await this.messageRepo.create({
      senderId: recipientId,
      recipientId: senderId,
      postId,
      messageText: "Yes, it is available!",
      isRead: false,
      isDeleted: false,
    });

    return [message1, message2];
  }

  /**
   * Generate JWT token for a user
   */
  generateToken(userId: number, email: string): string {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: "1h" });
  }

  /**
   * Clean up all created test data
   */
  async cleanup() {
    // Delete ratings first (foreign key constraint)
    await prisma.sellerRating.deleteMany({
      where: {
        OR: [
          { sellerId: { in: this.createdUserIds } },
          { raterId: { in: this.createdUserIds } },
        ],
      },
    });

    // Delete messages
    await prisma.message.deleteMany({
      where: {
        OR: [
          { senderId: { in: this.createdUserIds } },
          { recipientId: { in: this.createdUserIds } },
        ],
      },
    });

    // Delete posts
    await prisma.post.deleteMany({
      where: {
        id: { in: this.createdPostIds },
      },
    });

    // Delete users
    await prisma.user.deleteMany({
      where: {
        id: { in: this.createdUserIds },
      },
    });

    // Reset tracking arrays
    this.createdUserIds = [];
    this.createdPostIds = [];
  }
}

/**
 * Database test helpers
 */
export class DatabaseTestHelper {
  /**
   * Clear all ratings from the database
   */
  static async clearAllRatings() {
    await prisma.sellerRating.deleteMany({});
  }

  /**
   * Reset user aggregate scores
   */
  static async resetUserAggregates(userId: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        sellerRating: 0,
        totalRatings: 0,
        positiveRatings: 0,
      },
    });
  }

  /**
   * Get rating count for a seller
   */
  static async getRatingCount(sellerId: number): Promise<number> {
    return await prisma.sellerRating.count({
      where: { sellerId },
    });
  }

  /**
   * Get user by email
   */
  static async getUserByEmail(email: string) {
    return await prisma.user.findUnique({
      where: { emailAddress: email },
    });
  }

  /**
   * Create database snapshot for rollback
   */
  static async createSnapshot() {
    const [users, posts, messages, ratings] = await Promise.all([
      prisma.user.findMany(),
      prisma.post.findMany(),
      prisma.message.findMany(),
      prisma.sellerRating.findMany(),
    ]);

    return { users, posts, messages, ratings };
  }

  /**
   * Verify database constraints
   */
  static async verifyConstraints() {
    // Check unique constraint on (sellerId, raterId)
    const duplicateCheck = await prisma.$queryRaw<
      Array<{ sellerId: number; raterId: number; count: number }>
    >`
      SELECT SellerId as sellerId, RaterId as raterId, COUNT(*) as count
      FROM SellerRatings
      GROUP BY SellerId, RaterId
      HAVING COUNT(*) > 1
    `;

    // Check aggregate score consistency
    const aggregateCheck = await prisma.user.findMany({
      where: {
        totalRatings: { gt: 0 },
      },
      select: {
        id: true,
        fullName: true,
        totalRatings: true,
        positiveRatings: true,
        sellerRating: true,
      },
    });

    const inconsistencies = [];
    for (const user of aggregateCheck) {
      const actualCount = await prisma.sellerRating.count({
        where: { sellerId: user.id },
      });

      if (actualCount !== user.totalRatings) {
        inconsistencies.push({
          userId: user.id,
          userName: user.fullName,
          issue: "totalRatings mismatch",
          stored: user.totalRatings,
          actual: actualCount,
        });
      }
    }

    return {
      duplicates: duplicateCheck,
      aggregateInconsistencies: inconsistencies,
      isValid: duplicateCheck.length === 0 && inconsistencies.length === 0,
    };
  }
}

/**
 * Mock data generators
 */
export class MockDataGenerator {
  /**
   * Generate random rating (1-5)
   */
  static randomRating(): number {
    return Math.floor(Math.random() * 5) + 1;
  }

  /**
   * Generate random comment
   */
  static randomComment(): string {
    const comments = [
      "Great seller!",
      "Fast shipping and good communication.",
      "Product as described.",
      "Would buy again.",
      "Excellent transaction.",
      "Very professional.",
      "Item arrived quickly.",
      "Highly recommended!",
      "Good experience overall.",
      "Satisfied with purchase.",
    ];
    return comments[Math.floor(Math.random() * comments.length)];
  }

  /**
   * Generate bulk ratings for testing
   */
  static async generateBulkRatings(
    sellerId: number,
    count: number,
    factory: TestDataFactory
  ): Promise<void> {
    const messageRepo = new MessageRepository();

    for (let i = 0; i < count; i++) {
      const rater = await factory.createUser();

      // Create message exchange
      await messageRepo.create({
        senderId: rater.id,
        recipientId: sellerId,
        messageText: "Test message",
        isRead: false,
        isDeleted: false,
      });

      await messageRepo.create({
        senderId: sellerId,
        recipientId: rater.id,
        messageText: "Response",
        isRead: false,
        isDeleted: false,
      });

      // Create rating
      await prisma.sellerRating.create({
        data: {
          sellerId,
          raterId: rater.id,
          rating: this.randomRating(),
          comment: this.randomComment(),
        },
      });
    }
  }
}

/**
 * Assertion helpers
 */
export class TestAssertions {
  /**
   * Assert user aggregate scores are correct
   */
  static async assertAggregatesCorrect(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const ratings = await prisma.sellerRating.findMany({
      where: { sellerId: userId },
    });

    const actualTotal = ratings.length;
    const actualPositive = ratings.filter((r) => r.rating >= 4).length;
    const expectedScore =
      actualTotal > 0 ? (actualPositive / actualTotal) * 5 : 0;

    if (user!.totalRatings !== actualTotal) {
      throw new Error(
        `TotalRatings mismatch: expected ${actualTotal}, got ${user!.totalRatings}`
      );
    }

    if (user!.positiveRatings !== actualPositive) {
      throw new Error(
        `PositiveRatings mismatch: expected ${actualPositive}, got ${user!.positiveRatings}`
      );
    }

    if (Math.abs(user!.sellerRating - expectedScore) > 0.01) {
      throw new Error(
        `SellerRating mismatch: expected ${expectedScore}, got ${user!.sellerRating}`
      );
    }
  }

  /**
   * Assert rating exists
   */
  static async assertRatingExists(sellerId: number, raterId: number) {
    const rating = await prisma.sellerRating.findFirst({
      where: { sellerId, raterId },
    });

    if (!rating) {
      throw new Error(
        `Rating not found for seller ${sellerId} by rater ${raterId}`
      );
    }

    return rating;
  }

  /**
   * Assert rating does not exist
   */
  static async assertRatingNotExists(sellerId: number, raterId: number) {
    const rating = await prisma.sellerRating.findFirst({
      where: { sellerId, raterId },
    });

    if (rating) {
      throw new Error(
        `Rating should not exist for seller ${sellerId} by rater ${raterId}`
      );
    }
  }
}

/**
 * Performance testing utilities
 */
export class PerformanceTestHelper {
  /**
   * Measure query execution time
   */
  static async measureQueryTime<T>(
    queryFn: () => Promise<T>
  ): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await queryFn();
    const time = performance.now() - start;
    return { result, time };
  }

  /**
   * Run load test
   */
  static async runLoadTest(
    testFn: () => Promise<void>,
    concurrency: number,
    iterations: number
  ): Promise<{
    totalTime: number;
    avgTime: number;
    minTime: number;
    maxTime: number;
    successCount: number;
    errorCount: number;
  }> {
    const results: number[] = [];
    let successCount = 0;
    let errorCount = 0;

    const startTime = performance.now();

    // Run in batches for concurrency
    for (let i = 0; i < iterations; i += concurrency) {
      const batch = Math.min(concurrency, iterations - i);
      const promises = Array(batch)
        .fill(null)
        .map(async () => {
          const start = performance.now();
          try {
            await testFn();
            successCount++;
            results.push(performance.now() - start);
          } catch (error) {
            errorCount++;
          }
        });

      await Promise.all(promises);
    }

    const totalTime = performance.now() - startTime;

    return {
      totalTime,
      avgTime: results.reduce((a, b) => a + b, 0) / results.length,
      minTime: Math.min(...results),
      maxTime: Math.max(...results),
      successCount,
      errorCount,
    };
  }
}

/**
 * Export all test utilities
 */
export const testUtils = {
  TestDataFactory,
  DatabaseTestHelper,
  MockDataGenerator,
  TestAssertions,
  PerformanceTestHelper,
};

export default testUtils;
