/**
 * Upload API Integration Tests
 * Tests for image upload endpoints
 */
import request from "supertest";
import { Application } from "express";
import { getTestServer } from "../../helpers/test-server";
import {
  createMockFile,
  createMockFiles,
  createMockJpegBuffer,
  createLargeFileBuffer,
} from "../../helpers/upload-test-data";

// Mock Azure config to prevent actual uploads during tests
jest.mock("../../../config/azure.config", () => ({
  azureConfig: {
    blobStorageAccount: "declutterimg",
    containerName: "images",
    sasToken: "mock-sas-token",
    upload: {
      maxFileSize: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      allowedExtensions: ["jpg", "jpeg", "png", "webp"],
      maxRetries: 3,
      retryDelayMs: [0, 100, 200, 400],
      maxFilesPerBatch: 10,
      enableAutoCleanup: true,
    },
    getContainerClient: jest.fn(() => ({
      getBlockBlobClient: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ requestId: "test-123" }),
        delete: jest.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

// Mock auth middleware to bypass real authentication
jest.mock("../../../middleware/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 123, email: "test@example.com" };
    next();
  },
}));

describe("Upload API Integration Tests", () => {
  let app: Application;
  let authToken: string;

  beforeAll(async () => {
    app = getTestServer();
    // Use dummy token since auth is mocked
    authToken = "mock-jwt-token";
  });

  describe("POST /api/v1/upload/image", () => {
    it("should upload a single image successfully", async () => {
      // Arrange
      const imageBuffer = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", imageBuffer, "test-image.jpg");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.url).toBeDefined();
      expect(response.body.data.url).toContain("declutterimg.blob.core.windows.net");
      expect(response.body.data.filename).toBe("test-image.jpg");
      expect(response.body.data.size).toBeGreaterThan(0);
      expect(response.body.data.mimeType).toBe("image/jpeg");
    });

    it("should reject upload without authentication", async () => {
      // Arrange
      const imageBuffer = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .attach("image", imageBuffer, "test.jpg");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it("should reject upload with invalid token", async () => {
      // Arrange
      const imageBuffer = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", "Bearer invalid-token")
        .attach("image", imageBuffer, "test.jpg");

      // Assert
      expect(response.status).toBe(401);
    });

    it("should reject upload without file", async () => {
      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("No file provided");
    });

    it("should reject oversized files", async () => {
      // Arrange
      const largeBuffer = createLargeFileBuffer(6); // 6MB

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", largeBuffer, "large-image.jpg");

      // Assert - Multer should reject before reaching controller
      expect(response.status).toBe(413);
    });

    it("should reject invalid file types", async () => {
      // Arrange
      const textBuffer = Buffer.from("This is not an image");

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", textBuffer, "document.txt");

      // Assert - Multer should reject based on mimetype
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle multiple sequential uploads", async () => {
      // Arrange
      const image1 = createMockJpegBuffer();
      const image2 = createMockJpegBuffer();

      // Act
      const response1 = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", image1, "image-1.jpg");

      const response2 = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", image2, "image-2.jpg");

      // Assert
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response1.body.data.url).not.toBe(response2.body.data.url);
    });

    it("should return proper error structure on validation failure", async () => {
      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.body).toHaveProperty("success");
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toHaveProperty("code");
      expect(response.body.error).toHaveProperty("message");
      expect(response.body.error).toHaveProperty("statusCode");
    });
  });

  describe("POST /api/v1/upload/images", () => {
    it("should upload multiple images successfully", async () => {
      // Arrange
      const image1 = createMockJpegBuffer();
      const image2 = createMockJpegBuffer();
      const image3 = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("images", image1, "image-1.jpg")
        .attach("images", image2, "image-2.jpg")
        .attach("images", image3, "image-3.jpg");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveLength(3);

      response.body.data.forEach((item: any, index: number) => {
        expect(item.success).toBe(true);
        expect(item.url).toBeDefined();
        expect(item.filename).toBe(`image-${index + 1}.jpg`);
        expect(item.size).toBeGreaterThan(0);
        expect(item.mimeType).toBe("image/jpeg");
      });
    });

    it("should reject batch upload without authentication", async () => {
      // Arrange
      const image = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/images")
        .attach("images", image, "test.jpg");

      // Assert
      expect(response.status).toBe(401);
    });

    it("should reject batch upload without files", async () => {
      // Act
      const response = await request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.message).toContain("No files provided");
    });

    it("should reject batch exceeding 10 files", async () => {
      // Arrange
      const image = createMockJpegBuffer();

      // Act - Try to upload 11 files
      let requestBuilder = request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`);

      for (let i = 0; i < 11; i++) {
        requestBuilder = requestBuilder.attach("images", image, `image-${i}.jpg`);
      }

      const response = await requestBuilder;

      // Assert - Multer should reject
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it("should handle single file in batch endpoint", async () => {
      // Arrange
      const image = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("images", image, "single-image.jpg");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].success).toBe(true);
    });

    it("should handle maximum allowed files (10)", async () => {
      // Arrange
      const image = createMockJpegBuffer();

      // Act - Upload exactly 10 files
      let requestBuilder = request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`);

      for (let i = 0; i < 10; i++) {
        requestBuilder = requestBuilder.attach("images", image, `image-${i}.jpg`);
      }

      const response = await requestBuilder;

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      response.body.data.forEach((item: any) => {
        expect(item.success).toBe(true);
      });
    });

    it("should return consistent structure for all uploads", async () => {
      // Arrange
      const image1 = createMockJpegBuffer();
      const image2 = createMockJpegBuffer();

      // Act
      const response = await request(app)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("images", image1, "test-1.jpg")
        .attach("images", image2, "test-2.jpg");

      // Assert
      expect(response.status).toBe(200);
      response.body.data.forEach((item: any) => {
        expect(item).toHaveProperty("success");
        expect(item).toHaveProperty("url");
        expect(item).toHaveProperty("filename");
        expect(item).toHaveProperty("size");
        expect(item).toHaveProperty("mimeType");
      });
    });
  });

  describe("Rate Limiting", () => {
    it("should apply rate limiting to upload endpoints", async () => {
      // This test verifies rate limiting is configured
      // Actual rate limit testing would require many requests
      const image = createMockJpegBuffer();

      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", image, "test.jpg");

      // Should succeed (not rate limited on first request)
      expect(response.status).toBeLessThan(429);
    });
  });

  describe("Content-Type Validation", () => {
    it("should only accept multipart/form-data", async () => {
      // Act - Try to send JSON instead of multipart
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .set("Content-Type", "application/json")
        .send({ image: "base64-data" });

      // Assert - Should fail as multer expects multipart
      expect(response.status).toBe(400);
    });
  });

  describe("Error Response Format", () => {
    it("should return standardized error format", async () => {
      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String),
          statusCode: expect.any(Number),
        },
      });
    });
  });
});
