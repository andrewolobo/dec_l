/**
 * Upload Service Unit Tests
 */
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { UploadService } from "../../../services/upload.service";
import { azureConfig } from "../../../config/azure.config";
import {
  createMockFile,
  createMockFiles,
  createMockPngBuffer,
  createMockWebpBuffer,
  createInvalidFileBuffer,
  createLargeFileBuffer,
} from "../../helpers/upload-test-data";
import { ErrorCode } from "../../../types/common/api-response.types";

type MockedFunction = jest.MockedFunction<any>;

// Mock Azure SDK
const mockUpload = jest.fn<any>();
const mockDelete = jest.fn<any>();
const mockGetBlockBlobClient = jest.fn<any>();

jest.mock("../../../config/azure.config", () => ({
  azureConfig: {
    blobStorageAccount: "declutterimg",
    containerName: "images",
    sasToken: "mock-sas-token",
    upload: {
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      allowedExtensions: ["jpg", "jpeg", "png", "webp"],
      maxRetries: 3,
      retryDelayMs: [0, 100, 200, 400], // Faster retries for testing
      maxFilesPerBatch: 10,
      enableAutoCleanup: true,
    },
    getContainerClient: jest.fn(() => ({
      getBlockBlobClient: mockGetBlockBlobClient,
    })),
  },
}));

describe("UploadService", () => {
  let uploadService: UploadService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock blob client
    mockGetBlockBlobClient.mockReturnValue({
      upload: mockUpload,
      delete: mockDelete,
    });

    // Default: upload succeeds
    mockUpload.mockResolvedValue({ requestId: "test-request-123" });
    mockDelete.mockResolvedValue({});

    uploadService = new UploadService();
  });

  describe("uploadSingleImage", () => {
    it("should upload a single JPEG image successfully", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 1024 * 100, // 100KB
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.url).toContain("declutterimg.blob.core.windows.net");
      expect(result.data?.url).toContain(`${userId}-`);
      expect(result.data?.filename).toBe("test-image.jpg");
      expect(result.data?.size).toBe(mockFile.size);
      expect(result.data?.mimeType).toBe("image/jpeg");
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it("should upload a PNG image successfully", async () => {
      // Arrange
      const userId = 456;
      const mockFile = createMockFile({
        originalname: "photo.png",
        mimetype: "image/png",
        buffer: createMockPngBuffer(),
        size: 1024 * 200,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.mimeType).toBe("image/png");
      expect(result.data?.filename).toBe("photo.png");
    });

    it("should upload a WebP image successfully", async () => {
      // Arrange
      const userId = 789;
      const mockFile = createMockFile({
        originalname: "image.webp",
        mimetype: "image/webp",
        buffer: createMockWebpBuffer(),
        size: 1024 * 150,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.mimeType).toBe("image/webp");
    });

    it("should reject files exceeding 5MB", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "large-image.jpg",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
        buffer: createLargeFileBuffer(6),
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toContain("exceeds maximum size");
      expect(result.error?.statusCode).toBe(413);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should reject invalid MIME types", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "document.pdf",
        mimetype: "application/pdf",
        size: 1024,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toContain("File type not allowed");
      expect(result.error?.statusCode).toBe(400);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should reject files with invalid extensions", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "image.gif",
        mimetype: "image/jpeg", // Mismatched
        size: 1024,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toContain("extension not allowed");
    });

    it("should validate JPEG file integrity (magic numbers)", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "fake.jpg",
        mimetype: "image/jpeg",
        buffer: createInvalidFileBuffer(), // Invalid JPEG
        size: 1024,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toContain("doesn't match declared JPEG type");
    });

    it("should validate PNG file integrity (magic numbers)", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "fake.png",
        mimetype: "image/png",
        buffer: createInvalidFileBuffer(), // Invalid PNG
        size: 1024,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("doesn't match declared PNG type");
    });

    it("should validate WebP file integrity (magic numbers)", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "fake.webp",
        mimetype: "image/webp",
        buffer: createInvalidFileBuffer(), // Invalid WebP
        size: 1024,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("doesn't match declared WebP type");
    });

    it("should generate unique blob names with correct format", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "my-photo.jpeg",
      });

      // Act
      await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      const uploadCall = mockUpload.mock.calls[0];
      expect(mockGetBlockBlobClient).toHaveBeenCalled();

      const blobName = mockGetBlockBlobClient.mock.calls[0][0];
      // Format: {userId}-{timestamp}-{uuid}.{ext}
      expect(blobName).toMatch(/^123-\d+-[a-f0-9-]+\.jpe?g$/);
    });

    it("should retry on transient Azure failures", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile();

      // First 2 calls fail, third succeeds
      mockUpload
        .mockRejectedValueOnce(new Error("Service Unavailable"))
        .mockRejectedValueOnce(new Error("ETIMEDOUT"))
        .mockResolvedValueOnce({ requestId: "retry-success" });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it("should fail after max retries exceeded", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile();

      // All calls fail
      mockUpload.mockRejectedValue(new Error("Service Unavailable"));

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(mockUpload).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockDelete).toHaveBeenCalled(); // Cleanup attempted
    });

    it("should attempt cleanup on upload failure", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile();

      // Mock with transient error to trigger retries, then cleanup
      mockUpload.mockRejectedValue(new Error("Service Unavailable"));
      mockDelete.mockResolvedValue({});

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(mockUpload).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
      expect(mockDelete).toHaveBeenCalled(); // Cleanup attempted after max retries
    });

    it("should handle cleanup failure gracefully", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile();

      mockUpload.mockRejectedValue(new Error("Upload failed"));
      mockDelete.mockRejectedValue(new Error("Delete failed"));

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      // Should not throw even if cleanup fails
    });

    it("should handle empty buffer", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        buffer: Buffer.alloc(0), // Empty buffer
        size: 0,
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("buffer is empty");
    });
  });

  describe("uploadMultipleImages", () => {
    it("should upload multiple images successfully", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = createMockFiles(3);

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].success).toBe(true);
      expect(result.data?.[1].success).toBe(true);
      expect(result.data?.[2].success).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(3);
    });

    it("should reject batches exceeding 10 files", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = createMockFiles(11); // 11 files

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.error?.message).toContain("Maximum 10 files");
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should return partial results for mixed success/failure", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = [
        createMockFile({ originalname: "good-1.jpg", size: 1024 * 100 }),
        createMockFile({
          originalname: "too-large.jpg",
          size: 6 * 1024 * 1024, // Too large
          buffer: createLargeFileBuffer(6),
        }),
        createMockFile({ originalname: "good-2.jpg", size: 1024 * 100 }),
      ];

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.[0].success).toBe(true);
      expect(result.data?.[1].success).toBe(false);
      expect(result.data?.[1].error?.code).toContain("VALIDATION_ERROR");
      expect(result.data?.[2].success).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(2); // Only valid files uploaded
    });

    it("should handle all files failing validation", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = [
        createMockFile({
          originalname: "large-1.jpg",
          size: 6 * 1024 * 1024,
          buffer: createLargeFileBuffer(6),
        }),
        createMockFile({
          originalname: "large-2.jpg",
          size: 7 * 1024 * 1024,
          buffer: createLargeFileBuffer(7),
        }),
      ];

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].success).toBe(false);
      expect(result.data?.[1].success).toBe(false);
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("should handle Azure upload failures in batch", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = createMockFiles(2);

      // First file succeeds, second fails
      mockUpload
        .mockResolvedValueOnce({ requestId: "success-1" })
        .mockRejectedValue(new Error("Upload failed"));

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].success).toBe(true);
      expect(result.data?.[1].success).toBe(false);
    });

    it("should upload files in parallel", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = createMockFiles(5);

      let uploadStartTimes: number[] = [];
      mockUpload.mockImplementation(async () => {
        uploadStartTimes.push(Date.now());
        await new Promise((resolve) => setTimeout(resolve, 10));
        return { requestId: "test" };
      });

      // Act
      await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      // All uploads should start around the same time (parallel)
      const timeDifferences = uploadStartTimes.slice(1).map((time, i) => 
        time - uploadStartTimes[i]
      );
      // All should start within a few ms of each other
      timeDifferences.forEach((diff) => {
        expect(diff).toBeLessThan(20);
      });
    });
  });
});
