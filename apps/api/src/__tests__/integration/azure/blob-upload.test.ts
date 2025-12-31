/**
 * Azure Blob Storage Integration Test
 * Tests actual upload to Azure Blob Storage with mocked authentication
 */
import request from "supertest";
import { Application } from "express";
import { getTestServer } from "../../helpers/test-server";
import { createMockJpegBuffer } from "../../helpers/upload-test-data";
import { azureConfig } from "../../../config/azure.config";

// Mock auth middleware to bypass real authentication
jest.mock("../../../middleware/auth.middleware", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 999, email: "azure-test@example.com" };
    next();
  },
}));

describe("Azure Blob Storage Integration Tests", () => {
  let app: Application;
  let uploadedBlobName: string | null = null;

  beforeAll(() => {
    app = getTestServer();
  });

  afterAll(async () => {
    // Cleanup: Delete uploaded blob if test succeeded
    if (uploadedBlobName) {
      try {
        const containerClient = azureConfig.getContainerClient();
        const blobClient = containerClient.getBlockBlobClient(uploadedBlobName);
        await blobClient.delete();
        console.log(`Cleaned up test blob: ${uploadedBlobName}`);
      } catch (error) {
        console.error("Failed to cleanup test blob:", error);
      }
    }
  });

  describe("Real Azure Upload", () => {
    it("should upload a file to Azure Blob Storage", async () => {
      // Arrange
      const imageBuffer = createMockJpegBuffer();
      const filename = "test-azure-upload.jpg";

      // Act
      const response = await request(app)
        .post("/api/v1/upload/image")
        .set("Authorization", "Bearer mock-token")
        .attach("image", imageBuffer, filename);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.url).toMatch(/https:\/\/declutterimg\.blob\.core\.windows\.net\/images\//);
      expect(response.body.data.filename).toBe(filename);
      expect(response.body.data.size).toBeGreaterThan(0);
      expect(response.body.data.mimeType).toBe("image/jpeg");

      // Extract blob name from URL for cleanup
      const urlParts = response.body.data.url.split("/");
      const blobNameWithQuery = urlParts[urlParts.length - 1];
      uploadedBlobName = blobNameWithQuery.split("?")[0];

      console.log("✅ File uploaded successfully to Azure:", uploadedBlobName);
    }, 30000); // 30 second timeout for network operations

    it("should verify uploaded blob exists in Azure", async () => {
      // Skip if previous test didn't upload
      if (!uploadedBlobName) {
        console.log("⏭️ Skipping verification - no blob uploaded");
        return;
      }

      // Arrange
      const containerClient = azureConfig.getContainerClient();
      const blobClient = containerClient.getBlockBlobClient(uploadedBlobName);

      // Act
      const exists = await blobClient.exists();
      const properties = await blobClient.getProperties();

      // Assert
      expect(exists).toBe(true);
      expect(properties.contentType).toBe("image/jpeg");
      expect(properties.contentLength).toBeGreaterThan(0);

      console.log("✅ Blob verified in Azure storage");
      console.log("   - Content-Type:", properties.contentType);
      console.log("   - Size:", properties.contentLength, "bytes");
    }, 15000);

    it("should upload multiple files to Azure", async () => {
      // Arrange
      const imageBuffer1 = createMockJpegBuffer();
      const imageBuffer2 = createMockJpegBuffer();
      const uploadedBlobs: string[] = [];

      try {
        // Act
        const response = await request(app)
          .post("/api/v1/upload/images")
          .set("Authorization", "Bearer mock-token")
          .attach("images", imageBuffer1, "batch-image-1.jpg")
          .attach("images", imageBuffer2, "batch-image-2.jpg");

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].success).toBe(true);
        expect(response.body.data[1].success).toBe(true);

        // Extract blob names for cleanup
        response.body.data.forEach((item: any) => {
          const urlParts = item.url.split("/");
          const blobNameWithQuery = urlParts[urlParts.length - 1];
          const blobName = blobNameWithQuery.split("?")[0];
          uploadedBlobs.push(blobName);
        });

        console.log("✅ Batch upload successful:", uploadedBlobs.length, "files");

        // Cleanup batch uploads
        const containerClient = azureConfig.getContainerClient();
        for (const blobName of uploadedBlobs) {
          try {
            const blobClient = containerClient.getBlockBlobClient(blobName);
            await blobClient.delete();
            console.log("   Cleaned up:", blobName);
          } catch (error) {
            console.error("   Failed to cleanup:", blobName);
          }
        }
      } catch (error) {
        // Attempt cleanup even if test fails
        const containerClient = azureConfig.getContainerClient();
        for (const blobName of uploadedBlobs) {
          try {
            const blobClient = containerClient.getBlockBlobClient(blobName);
            await blobClient.delete();
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
        throw error;
      }
    }, 45000); // 45 second timeout for multiple uploads
  });

  describe("Azure Configuration", () => {
    it("should have valid Azure configuration", () => {
      expect(azureConfig.blobStorageAccount).toBe("declutterimg");
      expect(azureConfig.containerName).toBe("images");
      expect(azureConfig.sasToken).toBeDefined();
      expect(azureConfig.sasToken.length).toBeGreaterThan(0);
    });

    it("should be able to connect to Azure container", async () => {
      // Arrange
      const containerClient = azureConfig.getContainerClient();

      // Act
      const exists = await containerClient.exists();
      const properties = await containerClient.getProperties();

      // Assert
      expect(exists).toBe(true);
      expect(properties).toBeDefined();

      console.log("✅ Successfully connected to Azure container");
      console.log("   - Container:", azureConfig.containerName);
      console.log("   - Account:", azureConfig.blobStorageAccount);
    }, 15000);
  });
});
