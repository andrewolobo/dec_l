# Azure Blob Storage Image Upload Implementation Plan

**Status:** Ready for Implementation  
**Date Created:** December 30, 2025  
**Target Completion:** January 13, 2026  
**Estimated Effort:** 13-20 hours

---

## Executive Summary

This document outlines the implementation plan for Azure Blob Storage image upload functionality in the DEC_L API. The backend will accept multipart file uploads from the frontend, validate them against frontend rules, upload to Azure Blob Storage, and return storage URLs that can be included in post creation requests.

**Current State:**
- ✅ Azure Blob Storage configured with new SAS token (`sp=racwdli` - full read/write permissions)
- ✅ Database schema ready (`PostImage`, `User.profilePictureUrl`)
- ✅ Frontend upload service complete and waiting for backend endpoints
- ✅ PostImage repository fully implemented
- ❌ Backend upload service, controller, routes, and validation not yet implemented

---

## 1. Implementation Overview

### Architecture

The image upload implementation follows a **separate upload endpoints** pattern (not inline with post creation). This matches the frontend implementation and provides better separation of concerns:

```
┌──────────────────────────────────────────────────────────────────┐
│                          Frontend                                 │
│    Select Images → Validate → Compress → Upload to Backend        │
└──────────────────────────────────────────────────────────────────┘
                                    │
                    POST /api/v1/upload/image(s)
                                    │
┌──────────────────────────────────────────────────────────────────┐
│                     Backend Upload Service                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. Receive multipart file(s)                             │   │
│  │ 2. Parse with multer middleware                          │   │
│  │ 3. Validate file (type, size, integrity)                │   │
│  │ 4. Generate unique blob name: {userId}-{ts}-{uuid}.ext  │   │
│  │ 5. Upload to Azure Blob Storage                         │   │
│  │ 6. Return signed URL                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
        Response with URLs                  Image stored in Azure
        {                                   (declutterimg.blob.core.
         success: true,                      windows.net/images/)
         data: {
           url: "https://...",
           filename: "...",
           size: 12345,
           mimeType: "image/jpeg"
         }
        }
                    │
┌──────────────────────────────────────────────────────────────────┐
│                          Frontend                                 │
│  Receive URLs → Store in state → Include in Post Creation        │
│  POST /api/v1/posts (with imageUrls in body)                    │
└──────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────┐
│                      Backend Post Service                        │
│  Create Post → Create PostImage records with URLs → Success      │
└──────────────────────────────────────────────────────────────────┘
```

### Response Format (Matches Frontend Expectations)

**Single Image Upload:**
```json
{
  "success": true,
  "data": {
    "url": "https://declutterimg.blob.core.windows.net/images/12345-1704067440000-a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4p5.jpeg?sp=r&sv=2024-11-04&sig=...",
    "filename": "living-room-couch.jpeg",
    "size": 245632,
    "mimeType": "image/jpeg"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "File validation failed",
    "details": "File exceeds maximum size of 5MB",
    "statusCode": 400
  }
}
```

---

## 2. Technical Decisions

### 2.1 File Validation Strategy

**Decision:** Server-side validation mirrors frontend rules with additional security checks.

**Frontend Rules (from `apps/api/src/config/app.config.ts`):**
- Maximum file size: **5 MB**
- Allowed MIME types: **image/jpeg**, **image/png**, **image/webp**

**Server-side Implementation:**
1. **Multer configuration** validates size and mimetype upfront
2. **Manual validation** re-checks file type and size (defense-in-depth)
3. **File integrity check** verifies content matches declared MIME type
4. **Sanitization** removes suspicious file extensions/metadata
5. **Future enhancement** - integrate virus scanning service

**Rationale:** Server-side validation protects against:
- Client-side validation bypass attempts
- Man-in-the-middle attacks modifying files
- Malicious file uploads with spoofed MIME types
- Buffer overflow and path traversal attacks

### 2.2 Blob Naming Convention

**Decision:** `{userId}-{timestamp}-{uuid}.{ext}` format

**Example:** `12345-1704067440000-a1b2c3d4-e5f6-4g7h-8i9j-k0l1m2n3o4p5.jpeg`

**Components:**
- `{userId}` - Database user ID (12345) - enables owner verification and cleanup
- `{timestamp}` - Unix timestamp in milliseconds (1704067440000) - enables sorting and date-based queries
- `{uuid}` - Cryptographically random UUID (a1b2c3d4-...) - prevents collisions
- `{ext}` - Original file extension from sanitized filename (jpeg, png, webp)

**Benefits:**
- ✅ Prevents naming collisions even with identical filenames
- ✅ Enables easy user-specific cleanup (list all blobs starting with `{userId}-`)
- ✅ Maintains chronological order (timestamp based)
- ✅ Preserves file type information
- ✅ No container folder structure needed (flat namespace scales better)
- ✅ Original filename never exposed in blob name (security/privacy)

**Alternative Considered (Rejected):** Container folders by user ID or date
- ❌ Adds complexity
- ❌ Azure doesn't have true folder structure (uses path prefixes)
- ❌ Makes cleanup harder (need to list container folders)
- ❌ Doesn't improve performance significantly

### 2.3 Error Handling & Cleanup Strategy

**Decision:** Implement cleanup for failed uploads + retry logic for transient failures

**Implementation Details:**

#### A. Transient Failure Retry Logic
```typescript
// Retry up to 3 times with exponential backoff for transient errors:
// - Azure service temporarily unavailable (503 Service Unavailable)
// - Network timeout
// - Connection refused

Retry Strategy:
- Attempt 1: Immediate
- Attempt 2: After 1 second
- Attempt 3: After 2 seconds
- Attempt 4: After 4 seconds (fail after this)
```

#### B. Failed Upload Cleanup
```typescript
// If Azure upload succeeds but API response fails:
// 1. Attempt to delete blob from Azure (best effort)
// 2. Log cleanup attempt to error tracking
// 3. Return error to client (user can retry)

// If blob deletion fails:
// 1. Log to error tracking with blob name
// 2. Schedule background job to clean up orphaned blobs
```

#### C. Orphaned Blob Cleanup Job (Future Enhancement)
```typescript
// Daily job that:
// 1. Lists all blobs in container
// 2. Queries database for referenced URLs
// 3. Identifies blobs not referenced in PostImage or User tables
// 4. Deletes unreferenced blobs older than 24 hours
// 5. Logs deletion activity
```

#### D. Error Codes & User Messages

| Error | Code | HTTP Status | Message | User Sees |
|-------|------|-------------|---------|-----------|
| File too large | `FILE_TOO_LARGE` | 413 | "File exceeds maximum size of 5MB" | "Image is too large. Maximum 5MB." |
| Invalid MIME type | `INVALID_FILE_TYPE` | 400 | "File type not allowed. Allowed: image/jpeg, image/png, image/webp" | "File type not supported. Use JPG, PNG, or WebP." |
| No file provided | `NO_FILE_PROVIDED` | 400 | "No file provided in request" | "Please select a file to upload." |
| Multiple files (single endpoint) | `MULTIPLE_FILES_NOT_ALLOWED` | 400 | "Only one file allowed. Use /upload/images for multiple." | "Upload only one file at a time." |
| Too many files (batch endpoint) | `TOO_MANY_FILES` | 400 | "Maximum 10 files per batch. Use multiple requests." | "Maximum 10 images at a time." |
| Azure upload failed (transient) | `AZURE_SERVICE_UNAVAILABLE` | 503 | "Upload service temporarily unavailable. Please try again." | "Server busy. Please try again in a moment." |
| Azure upload failed (permanent) | `AZURE_UPLOAD_ERROR` | 500 | "Failed to upload file to storage. [Details]" | "Upload failed. Please try again." |
| File integrity check failed | `FILE_INTEGRITY_ERROR` | 400 | "File content doesn't match declared type" | "File appears to be corrupted. Try again." |
| Virus scan failed | `VIRUS_SCAN_ERROR` | 500 | "Security scan failed. Please try again." | "Security check failed. Try again." |

---

## 3. Implementation Steps

### Step 1: Install Dependencies and Configure Azure Blob Storage

**Time Estimate:** 1-2 hours

#### 1.1 Install Packages

**File:** `apps/api/package.json`

Add to `dependencies`:
```json
{
  "@azure/storage-blob": "^12.17.0",
  "multer": "^1.4.5-lts.1",
  "uuid": "^9.0.1"
}
```

Add to `devDependencies`:
```json
{
  "@types/multer": "^1.4.11"
}
```

**Command:**
```bash
cd apps/api
npm install @azure/storage-blob@^12.17.0 multer@^1.4.5-lts.1 uuid@^9.0.1
npm install --save-dev @types/multer@^1.4.11
```

#### 1.2 Update Azure Configuration in .env

**File:** `apps/api/.env`

**Current Status:** ✅ Already updated with new SAS token
- ✅ `SAS_TOKEN` with `sp=racwdli` (full read/write/delete permissions)
- ✅ Token format: `sp=racwdli&st=2025-12-30T10:11:40Z&se=2025-12-30T18:26:40Z&spr=https&sv=2024-11-04&sr=c&sig=...`

**Verify in .env:**
```dotenv
[REMOVED TOKEN AND URL]
```

**Note on SAS Token Expiry:** Current token expires on December 30, 2025 (today). Before going to production:
1. Generate new SAS token with 1-year expiry (December 30, 2026)
2. Use same permissions: `racwdli` (Read, Add, Create, Write, Delete, List)
3. Update `.env` and `.env.production`
4. Set up reminder to refresh token 30 days before expiry

#### 1.3 Create Azure Configuration File

**File:** `apps/api/src/config/azure.config.ts`

**Purpose:** Centralized Azure Blob Storage configuration following existing patterns in `app.config.ts`

**Content:**
```typescript
import { BlobServiceClient } from "@azure/storage-blob";

export const azureConfig = {
  // Blob Storage Configuration
  blobStorageAccount: "declutterimg",
  containerName: "images",
  baseUrl: process.env.BLOB_URL || "",
  sasToken: process.env.SAS_TOKEN || "",

  // Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB (matches frontend)
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    
    // Retry configuration for transient failures
    maxRetries: 3,
    retryDelayMs: [0, 1000, 2000, 4000], // Exponential backoff
    
    // Batch upload configuration
    maxFilesPerBatch: 10,
    
    // Cleanup configuration
    enableAutoCleanup: true,
    orphanedBlobCleanupAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  },

  // Initialize Blob Service Client
  createBlobServiceClient: () => {
    const blobUrl = `https://${azureConfig.blobStorageAccount}.blob.core.windows.net`;
    return new BlobServiceClient(`${blobUrl}?${azureConfig.sasToken}`);
  },

  // Get container client
  getContainerClient: () => {
    const blobServiceClient = azureConfig.createBlobServiceClient();
    return blobServiceClient.getContainerClient(azureConfig.containerName);
  },
};
```

**Validation:**
- ✅ Uses environment variables for sensitive data
- ✅ Follows existing config pattern from `app.config.ts`
- ✅ Centralizes all upload settings
- ✅ Provides helper functions for Azure client initialization

---

### Step 2: Create Upload Service with Azure Integration

**Time Estimate:** 4-6 hours

**File:** `apps/api/src/services/upload.service.ts`

**Pattern:** Follows existing service architecture (see `post.service.ts`, `user.service.ts`)

**Key Methods:**

#### 2.1 `uploadSingleImage(userId: number, file: Express.Multer.File): Promise<ServiceResponse>`

**Process:**
1. Validate file (type, size, integrity)
2. Generate unique blob name
3. Upload to Azure with retries
4. Return standardized response with image URL

**Error Handling:**
- Validates MIME type matches extension
- Implements retry logic for transient Azure failures
- Cleans up on failure (best effort)
- Returns descriptive error messages

#### 2.2 `uploadMultipleImages(userId: number, files: Express.Multer.File[]): Promise<ServiceResponse>`

**Process:**
1. Validate batch (max 10 files)
2. Validate each file individually
3. Upload all files to Azure in parallel (Promise.all)
4. Return array of results (per-file success/failure tracking)

**Error Handling:**
- If batch has errors: return partial results (mixed success/failure)
- Each file result includes success status and error details
- Successful uploads are not rolled back if some fail

#### 2.3 Private Helper Methods

**`validateFile(file: Express.Multer.File): void`**
- Check MIME type is in allowed list
- Check file size <= 5MB
- Check extension is allowed
- Verify content matches MIME type (magic number check)
- Throw validation error with descriptive message

**`generateBlobName(userId: number, file: Express.Multer.File): string`**
- Extract and sanitize file extension
- Generate format: `{userId}-{timestamp}-{uuid}.{ext}`
- Return sanitized blob name

**`uploadToAzure(containerClient, blobName, buffer, mimeType, retryAttempt = 0): Promise<void>`**
- Create blob client from container client
- Upload buffer to blob with metadata (original mime type)
- Handle transient failures with retry logic
- On success: ensure response is received
- On failure: attempt cleanup (delete blob if partially uploaded)

**`deleteBlob(blobName): Promise<void>` (best effort)**
- Attempt to delete blob from Azure
- Catch and log errors (don't throw - best effort cleanup)
- Used when upload succeeds but API response fails

**`generateSignedUrl(blobName): string`**
- Construct read-only signed URL for blob
- Include SAS token with current permissions
- Return full URL including query string

---

### Step 3: Build API Endpoints with File Upload Middleware

**Time Estimate:** 2-3 hours

#### 3.1 Multer Configuration

**File:** `apps/api/src/middleware/upload.middleware.ts`

**Configuration:**
```typescript
import multer from "multer";
import { azureConfig } from "../config/azure.config";

// Store files in memory (not on disk) since we upload to Azure
const memoryStorage = multer.memoryStorage();

// Apply upload configuration
const uploadMiddleware = multer({
  storage: memoryStorage,
  limits: {
    fileSize: azureConfig.upload.maxFileSize, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (azureConfig.upload.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: ${azureConfig.upload.allowedMimeTypes.join(", ")}`
        )
      );
    }
  },
});

export const uploadSingleMiddleware = uploadMiddleware.single("image");
export const uploadMultipleMiddleware = uploadMiddleware.array("images", 10);
```

#### 3.2 Upload Controller

**File:** `apps/api/src/controllers/upload.controller.ts`

**Endpoints:**

**POST /api/v1/upload/image** - Single file upload
```typescript
async uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_FILE_PROVIDED",
          message: "No file provided in request",
          statusCode: 400,
        },
      });
    }

    const result = await uploadService.uploadSingleImage(userId, file);

    if (!result.success) {
      return res
        .status(result.error!.statusCode)
        .json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
```

**POST /api/v1/upload/images** - Batch file upload (max 10)
```typescript
async uploadImages(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_FILES_PROVIDED",
          message: "No files provided in request",
          statusCode: 400,
        },
      });
    }

    const result = await uploadService.uploadMultipleImages(userId, files);

    if (!result.success) {
      return res
        .status(result.error!.statusCode)
        .json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
```

#### 3.3 Upload Routes

**File:** `apps/api/src/routes/upload.routes.ts`

```typescript
import { Router, Request, Response, NextFunction } from "express";
import { uploadController } from "../controllers";
import { authenticate } from "../middleware/auth.middleware";
import {
  uploadSingleMiddleware,
  uploadMultipleMiddleware,
} from "../middleware/upload.middleware";
import { validate } from "../middleware/validation.middleware";
import { uploadValidationSchema } from "../validation/upload.validation";

const router = Router();

// Single image upload
router.post(
  "/image",
  authenticate, // JWT required
  uploadSingleMiddleware, // Multer single file
  validate(uploadValidationSchema.single), // Validate (if needed for additional checks)
  (req: Request, res: Response, next: NextFunction) =>
    uploadController.uploadImage(req, res, next)
);

// Multiple images upload (batch)
router.post(
  "/images",
  authenticate, // JWT required
  uploadMultipleMiddleware, // Multer array (max 10)
  validate(uploadValidationSchema.multiple), // Validate (if needed)
  (req: Request, res: Response, next: NextFunction) =>
    uploadController.uploadImages(req, res, next)
);

export const uploadRoutes = router;
```

#### 3.4 Register Routes in App

**File:** `apps/api/src/app.ts`

Add to existing route registration:
```typescript
import { uploadRoutes } from "./routes";

// ... existing code ...

// API Routes
app.use(`${appConfig.apiPrefix}/upload`, uploadRoutes);
app.use(`${appConfig.apiPrefix}/posts`, postRoutes);
// ... other routes ...
```

---

### Step 4: Create Type Definitions and Update Exports

**Time Estimate:** 1-2 hours

#### 4.1 Upload Type Definitions

**File:** `apps/api/src/types/upload/upload.types.ts`

```typescript
import { ServiceResponse } from "../common/service-response.types";

/**
 * Uploaded image data returned to client
 */
export interface UploadedImageDTO {
  url: string; // Full signed URL to blob (includes SAS token)
  filename: string; // Original filename (sanitized)
  size: number; // File size in bytes
  mimeType: string; // MIME type (image/jpeg, image/png, image/webp)
}

/**
 * Response from single image upload
 */
export type UploadImageResponseDTO = ServiceResponse<UploadedImageDTO>;

/**
 * Response from multiple images upload (batch)
 */
export interface BatchUploadResultItem extends UploadedImageDTO {
  success: boolean;
  error?: UploadErrorDTO; // Only present if upload failed for this file
}

export type UploadMultipleImagesResponseDTO = ServiceResponse<
  BatchUploadResultItem[]
>;

/**
 * Upload validation error details
 */
export interface UploadValidationError {
  code:
    | "FILE_TOO_LARGE"
    | "INVALID_FILE_TYPE"
    | "NO_FILE_PROVIDED"
    | "NO_FILES_PROVIDED"
    | "TOO_MANY_FILES"
    | "MULTIPLE_FILES_NOT_ALLOWED"
    | "FILE_INTEGRITY_ERROR"
    | "VIRUS_SCAN_ERROR";
  message: string;
  details?: string;
}

/**
 * Upload error details
 */
export interface UploadErrorDTO {
  code:
    | "FILE_TOO_LARGE"
    | "INVALID_FILE_TYPE"
    | "NO_FILE_PROVIDED"
    | "NO_FILES_PROVIDED"
    | "TOO_MANY_FILES"
    | "MULTIPLE_FILES_NOT_ALLOWED"
    | "FILE_INTEGRITY_ERROR"
    | "VIRUS_SCAN_ERROR"
    | "AZURE_SERVICE_UNAVAILABLE"
    | "AZURE_UPLOAD_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  details?: string;
  statusCode: 400 | 413 | 500 | 503;
}

/**
 * File buffer with metadata for upload
 */
export interface FileWithMetadata {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}
```

#### 4.2 Update Service Exports

**File:** `apps/api/src/services/index.ts`

Add:
```typescript
export * from "./upload.service";
```

#### 4.3 Update Controller Exports

**File:** `apps/api/src/controllers/index.ts`

Add:
```typescript
import { UploadController } from "./upload.controller";

export const uploadController = new UploadController();
```

---

### Step 5: Implement Comprehensive Tests

**Time Estimate:** 4-6 hours

#### 5.1 Unit Tests for Upload Service

**File:** `apps/api/src/__tests__/unit/services/upload.service.test.ts`

**Test Structure:**
```typescript
describe("UploadService", () => {
  let uploadService: UploadService;
  let mockContainerClient: jest.Mocked<ContainerClient>;
  let mockBlobClient: jest.Mocked<BlockBlobClient>;

  beforeEach(() => {
    // Mock Azure SDK
    jest.clearAllMocks();
    
    mockBlobClient = {
      upload: jest.fn().mockResolvedValue({ requestId: "test-123" }),
      delete: jest.fn().mockResolvedValue({}),
    } as any;

    mockContainerClient = {
      getBlockBlobClient: jest.fn().mockReturnValue(mockBlobClient),
    } as any;

    // Mock azureConfig
    jest.mock("../../../config/azure.config", () => ({
      azureConfig: {
        getContainerClient: jest.fn().mockReturnValue(mockContainerClient),
        upload: {
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
          allowedExtensions: ["jpg", "jpeg", "png", "webp"],
          maxRetries: 3,
        },
      },
    }));

    uploadService = new UploadService();
  });

  describe("uploadSingleImage", () => {
    it("should upload a single image successfully", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 1024 * 100, // 100KB
        buffer: Buffer.from("fake image data"),
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.url).toBeDefined();
      expect(result.data?.filename).toBe("test-image.jpg");
      expect(result.data?.size).toBe(mockFile.size);
      expect(result.data?.mimeType).toBe("image/jpeg");
      expect(mockBlobClient.upload).toHaveBeenCalled();
    });

    it("should reject files exceeding 5MB", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "large-image.jpg",
        mimetype: "image/jpeg",
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.from("fake image data"),
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("FILE_TOO_LARGE");
      expect(result.error?.statusCode).toBe(413);
    });

    it("should reject invalid MIME types", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "document.pdf",
        mimetype: "application/pdf",
        size: 1024,
        buffer: Buffer.from("fake pdf"),
      });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_FILE_TYPE");
      expect(result.error?.statusCode).toBe(400);
    });

    it("should retry on transient Azure failures", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 100 * 1024,
        buffer: Buffer.from("fake image"),
      });

      // First call fails, second succeeds
      mockBlobClient.upload
        .mockRejectedValueOnce(new Error("Service Unavailable"))
        .mockResolvedValueOnce({ requestId: "retry-success" });

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(true);
      expect(mockBlobClient.upload).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries exceeded", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 100 * 1024,
        buffer: Buffer.from("fake image"),
      });

      mockBlobClient.upload.mockRejectedValue(
        new Error("Service Unavailable")
      );

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("AZURE_SERVICE_UNAVAILABLE");
      expect(mockBlobClient.upload).toHaveBeenCalledTimes(4); // 3 retries + 1 initial
    });

    it("should clean up on upload failure", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        size: 100 * 1024,
        buffer: Buffer.from("fake image"),
      });

      mockBlobClient.upload.mockRejectedValue(new Error("Upload failed"));
      mockBlobClient.delete.mockResolvedValue({});

      // Act
      const result = await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      expect(result.success).toBe(false);
      expect(mockBlobClient.delete).toHaveBeenCalled(); // Cleanup attempted
    });

    it("should generate correct blob name format", async () => {
      // Arrange
      const userId = 123;
      const mockFile = createMockFile({
        originalname: "my-image.jpeg",
        mimetype: "image/jpeg",
        size: 100 * 1024,
        buffer: Buffer.from("fake"),
      });

      // Act
      await uploadService.uploadSingleImage(userId, mockFile);

      // Assert
      const blobName = (mockContainerClient.getBlockBlobClient as jest.Mock)
        .mock.calls[0][0];
      expect(blobName).toMatch(/^123-\d+-[a-f0-9-]+\.jpe?g$/);
    });
  });

  describe("uploadMultipleImages", () => {
    it("should upload multiple images successfully", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = [
        createMockFile({
          originalname: "image1.jpg",
          mimetype: "image/jpeg",
          size: 100 * 1024,
          buffer: Buffer.from("fake1"),
        }),
        createMockFile({
          originalname: "image2.png",
          mimetype: "image/png",
          size: 150 * 1024,
          buffer: Buffer.from("fake2"),
        }),
      ];

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].success).toBe(true);
      expect(result.data?.[1].success).toBe(true);
    });

    it("should reject batches exceeding 10 files", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = Array(11)
        .fill(null)
        .map(() =>
          createMockFile({
            originalname: "image.jpg",
            mimetype: "image/jpeg",
            size: 100 * 1024,
            buffer: Buffer.from("fake"),
          })
        );

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("TOO_MANY_FILES");
    });

    it("should return partial results for mixed success/failure", async () => {
      // Arrange
      const userId = 123;
      const mockFiles = [
        createMockFile({
          originalname: "good-image.jpg",
          mimetype: "image/jpeg",
          size: 100 * 1024,
          buffer: Buffer.from("fake"),
        }),
        createMockFile({
          originalname: "bad-image.jpg",
          mimetype: "image/jpeg",
          size: 6 * 1024 * 1024, // Too large
          buffer: Buffer.from("fake"),
        }),
      ];

      // Act
      const result = await uploadService.uploadMultipleImages(userId, mockFiles);

      // Assert
      expect(result.success).toBe(true); // Batch processed
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].success).toBe(true);
      expect(result.data?.[1].success).toBe(false);
      expect(result.data?.[1].error?.code).toBe("FILE_TOO_LARGE");
    });
  });

  describe("Helper Methods", () => {
    describe("validateFile", () => {
      it("should validate file type and size", async () => {
        // ... test file validation logic
      });

      it("should verify file content matches MIME type", async () => {
        // ... test magic number validation
      });
    });

    describe("generateBlobName", () => {
      it("should generate unique blob names", async () => {
        // ... test uniqueness and format
      });

      it("should sanitize extensions", async () => {
        // ... test extension sanitization
      });
    });

    describe("generateSignedUrl", () => {
      it("should generate valid signed URLs", async () => {
        // ... test URL generation
      });
    });
  });
});
```

**Test Helpers:**

**File:** `apps/api/src/__tests__/helpers/upload-test-data.ts`

```typescript
export function createMockFile(overrides?: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: "image",
    originalname: "test-image.jpg",
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 1024 * 100,
    buffer: Buffer.from("fake image data"),
    destination: "",
    filename: "",
    path: "",
    ...overrides,
  };
}

export function createMockJpegBuffer(): Buffer {
  // Return minimal valid JPEG buffer (magic numbers: FF D8 FF)
  return Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0xFF, 0xD9)]);
}

export function createMockPngBuffer(): Buffer {
  // Return minimal valid PNG buffer (magic numbers: 89 50 4E 47)
  return Buffer.from([0x89, 0x50, 0x4E, 0x47, ...Array(100).fill(0)]);
}

export function createMockWebpBuffer(): Buffer {
  // Return minimal valid WebP buffer (RIFF...WEBP)
  return Buffer.from("RIFF...WEBP");
}
```

#### 5.2 Integration Tests for Upload Endpoints

**File:** `apps/api/src/__tests__/integration/api/upload.test.ts`

**Test Structure:**
```typescript
import request from "supertest";
import { createTestServer } from "../../helpers/test-server";

describe("Upload API Endpoints", () => {
  let server: any;
  let authToken: string;

  beforeAll(async () => {
    server = await createTestServer();
    authToken = await createTestAuthToken({ userId: 123 });
  });

  afterAll(async () => {
    await server.close();
  });

  describe("POST /api/v1/upload/image", () => {
    it("should upload a single image successfully", async () => {
      // Arrange
      const response = await request(server)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", Buffer.from("fake"), "test.jpg");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toMatch(
        /^https:\/\/declutterimg\.blob\.core\.windows\.net/
      );
      expect(response.body.data.filename).toBe("test.jpg");
      expect(response.body.data.size).toBeGreaterThan(0);
    });

    it("should reject without authentication", async () => {
      // Act
      const response = await request(server)
        .post("/api/v1/upload/image")
        .attach("image", Buffer.from("fake"), "test.jpg");

      // Assert
      expect(response.status).toBe(401);
    });

    it("should reject files without content", async () => {
      // Act
      const response = await request(server)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("NO_FILE_PROVIDED");
    });

    it("should reject oversized files", async () => {
      // Act
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const response = await request(server)
        .post("/api/v1/upload/image")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("image", largeBuffer, "large.jpg");

      // Assert
      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe("FILE_TOO_LARGE");
    });
  });

  describe("POST /api/v1/upload/images", () => {
    it("should upload multiple images successfully", async () => {
      // Act
      const response = await request(server)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("images", Buffer.from("fake1"), "image1.jpg")
        .attach("images", Buffer.from("fake2"), "image2.png");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].success).toBe(true);
      expect(response.body.data[1].success).toBe(true);
    });

    it("should reject batch exceeding 10 files", async () => {
      // Act
      const response = await request(server)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`);

      for (let i = 0; i < 11; i++) {
        response.attach("images", Buffer.from(`fake${i}`), `image${i}.jpg`);
      }

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("TOO_MANY_FILES");
    });

    it("should return partial results for mixed success/failure", async () => {
      // Act
      const response = await request(server)
        .post("/api/v1/upload/images")
        .set("Authorization", `Bearer ${authToken}`)
        .attach("images", Buffer.from("good"), "good.jpg")
        .attach("images", Buffer.alloc(6 * 1024 * 1024), "bad.jpg");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].success).toBe(true);
      expect(response.body.data[1].success).toBe(false);
      expect(response.body.data[1].error.code).toBe("FILE_TOO_LARGE");
    });
  });
});
```

#### 5.3 Test Coverage Goals

Target **80% coverage** for upload service (per [documentation/5. TEST_IMPLEMENTATION.md](documentation/5. TEST_IMPLEMENTATION.md)):

| Component | Target Coverage | Test Cases |
|-----------|-----------------|-----------|
| `uploadService.uploadSingleImage` | 95%+ | 12 test cases |
| `uploadService.uploadMultipleImages` | 90%+ | 8 test cases |
| `uploadService.validateFile` | 95%+ | 10 test cases |
| `uploadService.generateBlobName` | 100% | 5 test cases |
| `uploadService.uploadToAzure` | 90%+ | 8 test cases |
| `uploadController.uploadImage` | 85%+ | 6 test cases |
| `uploadController.uploadImages` | 85%+ | 6 test cases |
| **Total** | **80%+** | **55+ test cases** |

---

### Step 6: Test End-to-End Integration

**Time Estimate:** 2-3 hours

#### 6.1 Complete Flow Testing

**Test Scenario 1: Upload → Post Creation**
```
1. User authenticates and receives JWT token
2. User selects 2 images for a post
3. Frontend calls POST /api/v1/upload/images with both files
4. Backend uploads both images to Azure Blob Storage
5. Backend returns signed URLs for both images
6. Frontend receives URLs and stores in component state
7. User fills post details (title, price, category, etc.)
8. User submits post with image URLs included
9. Backend creates Post record
10. Backend creates PostImage records for each URL
11. Database confirms images are linked to post
12. Frontend displays post with both images
```

**Test Scenario 2: Error Handling**
```
1. User selects 3 images but 1 exceeds 5MB
2. Frontend calls POST /api/v1/upload/images
3. Backend returns partial results: 2 succeed, 1 fails
4. Frontend displays success messages for 2 images
5. Frontend displays error message for oversized image
6. User can retry uploading just the failed image
```

**Test Scenario 3: Azure Transient Failure**
```
1. User uploads image
2. Azure service temporarily unavailable (503)
3. Backend retries automatically (exponential backoff)
4. Azure service becomes available after 2 seconds
5. Retry succeeds and image uploads to Azure
6. Frontend receives URL and can include in post
```

#### 6.2 Integration Checklist

**Before Marking Complete:**

- [ ] Upload single image endpoint returns proper response
- [ ] Upload multiple images endpoint returns proper response
- [ ] Images are stored in Azure Blob Storage (verify in Azure Portal)
- [ ] Returned URLs are valid and accessible (test with curl/browser)
- [ ] Returned URLs work when included in post creation
- [ ] PostImage records created with correct URLs
- [ ] Images can be retrieved from database via PostImageRepository
- [ ] File validation rejects invalid files
- [ ] Batch upload rejects > 10 files
- [ ] Multipart form-data parsing works correctly
- [ ] Authentication is enforced (test without token)
- [ ] Error messages are user-friendly
- [ ] Blob naming follows convention: `{userId}-{timestamp}-{uuid}.{ext}`
- [ ] Azure retries work correctly
- [ ] Failed uploads are cleaned up
- [ ] Test with real files (JPEG, PNG, WebP)

---

## 4. File Structure Summary

After implementation, the following files will be created/modified:

```
apps/api/
├── package.json                           [MODIFIED: add dependencies]
├── .env                                   [ALREADY UPDATED: new SAS token]
├── src/
│   ├── app.ts                             [MODIFIED: register upload routes]
│   ├── config/
│   │   ├── app.config.ts                  [EXISTING: reference for patterns]
│   │   └── azure.config.ts                [NEW: Azure configuration]
│   ├── controllers/
│   │   ├── index.ts                       [MODIFIED: export uploadController]
│   │   ├── post.controller.ts             [EXISTING: reference for patterns]
│   │   └── upload.controller.ts           [NEW: upload endpoints]
│   ├── middleware/
│   │   ├── auth.middleware.ts             [EXISTING: used in routes]
│   │   ├── validation.middleware.ts       [EXISTING: used in routes]
│   │   └── upload.middleware.ts           [NEW: multer configuration]
│   ├── routes/
│   │   ├── index.ts                       [MODIFY: export upload routes if exists]
│   │   ├── post.routes.ts                 [EXISTING: reference for patterns]
│   │   └── upload.routes.ts               [NEW: upload endpoints routing]
│   ├── services/
│   │   ├── index.ts                       [MODIFIED: export uploadService]
│   │   ├── post.service.ts                [EXISTING: reference for patterns]
│   │   └── upload.service.ts              [NEW: Azure integration & business logic]
│   ├── types/
│   │   ├── upload/
│   │   │   └── upload.types.ts            [NEW: type definitions]
│   │   └── common/                        [EXISTING: for ServiceResponse, etc.]
│   ├── validation/
│   │   ├── post.validation.ts             [EXISTING: reference for patterns]
│   │   └── upload.validation.ts           [NEW: Joi schemas for uploads]
│   └── __tests__/
│       ├── helpers/
│       │   ├── test-data.ts               [EXISTING: base helpers]
│       │   └── upload-test-data.ts        [NEW: upload-specific mock data]
│       ├── unit/
│       │   └── services/
│       │       ├── post.service.test.ts   [EXISTING: reference for patterns]
│       │       └── upload.service.test.ts [NEW: service unit tests]
│       └── integration/
│           └── api/
│               ├── auth.test.ts           [EXISTING: reference for patterns]
│               └── upload.test.ts         [NEW: endpoint integration tests]
```

---

## 5. Dependencies to Install

```bash
cd apps/api

# Production dependencies
npm install @azure/storage-blob@^12.17.0
npm install multer@^1.4.5-lts.1
npm install uuid@^9.0.1

# Development dependencies
npm install --save-dev @types/multer@^1.4.11
```

**Optional (Future Enhancement):**
```bash
# For virus scanning (ClamAV)
npm install node-clamscan@^0.5.0

# For image processing (validation, compression)
npm install sharp@^0.32.0
```

---

## 6. Configuration Checklist

Before implementation, verify:

- [x] **Azure Blob Storage Account Created**
  - Account: `declutterimg`
  - Container: `images`
  - SAS Token: Generated with `sp=racwdli` (Read, Add, Create, Write, Delete, List)
  - Token Expiry: December 30, 2025, 18:26:40 UTC
  - ⚠️ **ACTION REQUIRED**: Generate new token with 1-year expiry before production

- [x] **Environment Variables Configured**
  - `BLOB_URL`: `https://declutterimg.blob.core.windows.net/images?sp=...`
  - `SAS_TOKEN`: `sp=racwdli&st=...&se=...&spr=https&sv=2024-11-04&sr=c&sig=...`

- [x] **Database Schema Ready**
  - `PostImage` table with `imageUrl` field
  - `User.profilePictureUrl` field
  - `PostImageRepository` fully implemented

- [x] **Frontend Upload Service Available**
  - `apps/web/src/lib/api/services/upload.service.ts`
  - Expects `/api/v1/upload/image` and `/api/v1/upload/images` endpoints
  - Returns signed URLs in response

- [ ] **Dependencies Installed** (run during Step 1)
- [ ] **Azure Config Created** (run during Step 1)
- [ ] **Upload Service Implemented** (run during Step 2)
- [ ] **Controllers & Routes Created** (run during Step 3)
- [ ] **Types Defined** (run during Step 4)
- [ ] **Tests Implemented** (run during Step 5)

---

## 7. Validation Schemas

**File:** `apps/api/src/validation/upload.validation.ts`

```typescript
import Joi from "joi";

export const uploadValidationSchema = {
  single: Joi.object({
    // Multer adds 'file' property automatically
    file: Joi.object().required(),
  }),

  multiple: Joi.object({
    // Multer adds 'files' array automatically
    files: Joi.array().min(1).max(10).required(),
  }),
};
```

---

## 8. Error Response Reference

All upload endpoints return standardized error responses:

**400 - Validation Error:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds maximum size of 5MB",
    "statusCode": 400
  }
}
```

**401 - Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "statusCode": 401
  }
}
```

**413 - Payload Too Large:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File exceeds maximum size of 5MB",
    "statusCode": 413
  }
}
```

**500 - Server Error:**
```json
{
  "success": false,
  "error": {
    "code": "AZURE_UPLOAD_ERROR",
    "message": "Failed to upload file to storage",
    "details": "[Azure SDK error details]",
    "statusCode": 500
  }
}
```

**503 - Service Unavailable (Temporary):**
```json
{
  "success": false,
  "error": {
    "code": "AZURE_SERVICE_UNAVAILABLE",
    "message": "Upload service temporarily unavailable. Please try again.",
    "statusCode": 503
  }
}
```

---

## 9. Post-Implementation Tasks

After implementation is complete:

1. **Update Documentation**
   - [ ] Add upload endpoints to API documentation
   - [ ] Document response formats
   - [ ] Document error codes and meanings
   - [ ] Add examples of integration with post creation

2. **Security Review**
   - [ ] Verify file validation is comprehensive
   - [ ] Review blob naming prevents information disclosure
   - [ ] Verify SAS token has minimal required permissions
   - [ ] Test for path traversal vulnerabilities
   - [ ] Review error messages don't leak sensitive info

3. **Performance Monitoring**
   - [ ] Monitor upload success rates
   - [ ] Track average upload time
   - [ ] Monitor Azure API errors
   - [ ] Set up alerts for > 1% error rate

4. **Cleanup & Maintenance**
   - [ ] Implement orphaned blob cleanup job
   - [ ] Set up blob storage lifecycle policy
   - [ ] Monitor storage costs
   - [ ] Review SAS token expiry 30 days before expiration

5. **Production Preparation**
   - [ ] Generate new SAS token with 1-year expiry
   - [ ] Update production `.env` with new token
   - [ ] Configure blob container lifecycle rules
   - [ ] Set up logging and error tracking (Sentry)
   - [ ] Performance test with multiple concurrent uploads

---

## 10. References

- **Azure Blob Storage SDK**: [@azure/storage-blob documentation](https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/)
- **Multer Documentation**: [multer npm](https://www.npmjs.com/package/multer)
- **Frontend Upload Service**: [apps/web/src/lib/api/services/upload.service.ts](apps/web/src/lib/api/services/upload.service.ts)
- **API Architecture Reference**: [documentation/6. API IMPLEMENTATION-PHASE 1.md](documentation/6. API IMPLEMENTATION-PHASE 1.md)
- **Test Implementation Guide**: [documentation/5. TEST_IMPLEMENTATION.md](documentation/5. TEST_IMPLEMENTATION.md)
- **Service Layer Patterns**: [documentation/4. SERVICE_LAYER.md](documentation/4. SERVICE_LAYER.md)

---

**Document Status:** ✅ Complete & Ready for Implementation  
**Next Step:** Begin Step 1 - Install Dependencies and Configure Azure Blob Storage
