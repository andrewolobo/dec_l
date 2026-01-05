# Azure Blob URL Transformation Implementation Plan

## Overview

Implement dynamic SAS token generation in API responses to securely serve images from a private Azure container. Currently, static SAS tokens are stored with image URLs, which will expire. This plan transforms URLs at response time with fresh, short-lived SAS tokens.

## Current State Analysis

| Aspect                      | Current State                                     |
| --------------------------- | ------------------------------------------------- |
| **Azure Package**           | `@azure/storage-blob` v12.29.1 ✅                 |
| **SAS Token Type**          | Static token from env (not dynamically generated) |
| **URL Storage**             | Full signed URL stored in `PostImage.imageUrl`    |
| **Response Transform**      | `mapToPostResponse` - no URL transformation       |
| **Dynamic SAS Generation**  | ❌ Not implemented                                |
| **Centralized URL Utility** | ❌ None exists                                    |

## Relevant Files

| Purpose                         | File Path                                           |
| ------------------------------- | --------------------------------------------------- |
| Azure config                    | `apps/api/src/config/azure.config.ts`               |
| Upload service                  | `apps/api/src/services/upload.service.ts`           |
| Post service (response mapping) | `apps/api/src/services/post.service.ts`             |
| Post controller                 | `apps/api/src/controllers/post.controller.ts`       |
| Image types                     | `apps/api/src/types/upload.types.ts`                |
| Image repository                | `apps/api/src/dal/repositories/image.repository.ts` |
| Prisma schema                   | `apps/api/prisma/schema.prisma`                     |

---

## Implementation Steps

### Step 1: Add Dynamic SAS Generation Utility

**File**: `apps/api/src/services/upload.service.ts`

Add imports and create the dynamic SAS generation method:

```typescript
import {
  BlobServiceClient,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

/**
 * Generate a dynamic SAS URL for a blob
 * @param blobUrl - The full blob URL or blob path
 * @param expiryMinutes - How long the SAS token is valid (default: 60)
 * @returns Signed URL with fresh SAS token
 */
public generateDynamicSasUrl(blobUrl: string, expiryMinutes: number = 60): string {
  if (!blobUrl) return '';

  // Extract blob name from full URL or use as-is if already a path
  const blobName = this.extractBlobName(blobUrl);

  const sharedKeyCredential = new StorageSharedKeyCredential(
    azureConfig.blobStorageAccount,
    azureConfig.storageAccountKey
  );

  const startsOn = new Date();
  const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

  const sasToken = generateBlobSASQueryParameters({
    containerName: azureConfig.containerName,
    blobName,
    permissions: BlobSASPermissions.parse('r'), // Read only
    startsOn,
    expiresOn,
  }, sharedKeyCredential).toString();

  const baseUrl = `https://${azureConfig.blobStorageAccount}.blob.core.windows.net/${azureConfig.containerName}/${blobName}`;
  return `${baseUrl}?${sasToken}`;
}

/**
 * Extract blob name from a full Azure blob URL
 */
private extractBlobName(blobUrl: string): string {
  // If it's already just a path (no http), return as-is
  if (!blobUrl.startsWith('http')) {
    return blobUrl;
  }

  try {
    const url = new URL(blobUrl);
    // Remove leading slash and container name from path
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Skip container name (first part), return the rest
    return pathParts.slice(1).join('/');
  } catch {
    // If URL parsing fails, return original
    return blobUrl;
  }
}
```

---

### Step 2: Update Azure Config

**File**: `apps/api/src/config/azure.config.ts`

Add the storage account key for credential-based SAS generation:

```typescript
export const azureConfig = {
  blobStorageAccount: "declutterimg",
  containerName: "images",
  baseUrl: process.env.BLOB_URL || "",
  sasToken: process.env.SAS_TOKEN || "",
  storageAccountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "", // ADD THIS

  // SAS token settings
  sas: {
    defaultExpiryMinutes: 60, // Default expiry for API responses
    shortExpiryMinutes: 15, // For sensitive images
    longExpiryMinutes: 1440, // 24 hours for special cases
  },

  upload: {
    maxFileSize: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    maxRetries: 3,
    retryDelayMs: [0, 1000, 2000, 4000],
    maxFilesPerBatch: 10,
  },
  // ... rest of config
};
```

---

### Step 3: Create URL Transformation Helpers

**File**: `apps/api/src/services/upload.service.ts`

Add helper methods for transforming image URLs in responses:

```typescript
import { PostImageDTO, PostUserDTO } from '../types/post.types';

/**
 * Transform an array of post images with fresh SAS URLs
 */
public transformImageUrls(images: PostImageDTO[] | undefined): PostImageDTO[] {
  if (!images || images.length === 0) return [];

  return images.map(img => ({
    ...img,
    imageUrl: this.generateDynamicSasUrl(img.imageUrl),
  }));
}

/**
 * Transform a user's profile picture URL with fresh SAS token
 */
public transformUserProfileUrl(user: PostUserDTO | undefined): PostUserDTO | undefined {
  if (!user) return undefined;

  return {
    ...user,
    profilePictureUrl: user.profilePictureUrl
      ? this.generateDynamicSasUrl(user.profilePictureUrl)
      : undefined,
  };
}

/**
 * Transform a single image URL
 */
public transformSingleImageUrl(imageUrl: string | undefined | null): string | undefined {
  if (!imageUrl) return undefined;
  return this.generateDynamicSasUrl(imageUrl);
}
```

---

### Step 4: Update `mapToPostResponse` in Post Service

**File**: `apps/api/src/services/post.service.ts`

Import the upload service and apply transformations:

```typescript
import { uploadService } from './upload.service';

private mapToPostResponse(
  post: any,
  user: any,
  category: any
): PostResponseDTO {
  return {
    id: post.id,
    title: post.title,
    description: post.description,
    price: post.price,
    condition: post.condition,
    status: post.status,
    viewCount: post.viewCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,

    // Transform image URLs with fresh SAS tokens
    images: uploadService.transformImageUrls(
      post.images?.map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        displayOrder: img.displayOrder,
      }))
    ),

    // Transform user profile picture URL
    user: uploadService.transformUserProfileUrl({
      id: user.id,
      fullName: user.fullName,
      profilePictureUrl: user.profilePictureUrl,
    }),

    category: category ? {
      id: category.id,
      name: category.name,
    } : undefined,
  };
}
```

---

### Step 5: Update Database Storage Strategy (Optional - Phase 2)

**File**: `apps/api/src/dal/repositories/image.repository.ts`

For new images, store only the blob path instead of the full URL:

```typescript
/**
 * Extract and store only the blob path (not full URL with SAS)
 */
async addImage(postId: number, data: { imageUrl: string; displayOrder: number }) {
  // Strip base URL if present, store only blob path
  const blobPath = this.extractBlobPath(data.imageUrl);

  return prisma.postImage.create({
    data: {
      postId,
      imageUrl: blobPath,  // Store only: posts/123/uuid.jpg
      displayOrder: data.displayOrder,
    },
  });
}

private extractBlobPath(fullUrl: string): string {
  if (!fullUrl.startsWith('http')) return fullUrl;

  try {
    const url = new URL(fullUrl.split('?')[0]); // Remove query params
    const pathParts = url.pathname.split('/').filter(Boolean);
    return pathParts.slice(1).join('/'); // Skip container name
  } catch {
    return fullUrl;
  }
}
```

---

### Step 6: Add Environment Variable

**File**: `.env.example` and `.env`

```env
# Azure Storage - Dynamic SAS Generation
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key_here
```

**To get the key:**

1. Go to Azure Portal → Storage Account → Access Keys
2. Copy `key1` or `key2`

---

## Migration Strategy

### Phase 1: Backward Compatible (Recommended First)

The `extractBlobName` function handles both formats:

- Full URLs: `https://declutterimg.blob.core.windows.net/images/posts/123/uuid.jpg?sv=...`
- Blob paths: `posts/123/uuid.jpg`

This means existing data continues to work without migration.

### Phase 2: Data Migration (Optional)

Run a migration script to convert existing full URLs to blob paths:

```sql
-- SQL migration to strip URLs to blob paths
UPDATE PostImages
SET ImageURL = SUBSTRING(
  ImageURL,
  CHARINDEX('/images/', ImageURL) + 8,
  CHARINDEX('?', ImageURL) - CHARINDEX('/images/', ImageURL) - 8
)
WHERE ImageURL LIKE 'https://%';
```

---

## Configuration Decisions

| Decision            | Recommendation             | Rationale                                       |
| ------------------- | -------------------------- | ----------------------------------------------- |
| SAS Token Duration  | 60 minutes                 | Balance between security and UX (cached images) |
| User Profile Images | Include in transformation  | Consistency, may also be private                |
| Migration Approach  | Handle both formats first  | No downtime, migrate later                      |
| Storage Format      | Blob path only (long-term) | Cleaner, smaller DB, no token in DB             |

---

## Testing Checklist

- [ ] Verify SAS URL generation works with storage account key
- [ ] Test `extractBlobName` with various URL formats
- [ ] Confirm transformed URLs load images in browser
- [ ] Test with expired static SAS tokens (should still work after transform)
- [ ] Verify user profile pictures transform correctly
- [ ] Load test to ensure performance is acceptable
- [ ] Test error handling when Azure is unavailable

---

## Rollback Plan

If issues arise:

1. Remove `uploadService.transformImageUrls()` calls
2. Revert to returning `img.imageUrl` directly
3. Ensure static SAS token in `.env` is still valid

---

## Security Notes

1. **Storage Account Key**: Keep `AZURE_STORAGE_ACCOUNT_KEY` secure, never commit to git
2. **SAS Permissions**: Only grant `read` permission, never `write` or `delete`
3. **Token Expiry**: 60 minutes is a good balance; shorter for sensitive content
4. **Logging**: Consider logging SAS generation for audit (without the token itself)
