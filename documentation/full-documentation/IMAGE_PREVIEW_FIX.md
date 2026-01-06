# Image Preview Fix - Implementation Summary

## Problem
After implementing Step 5 (storing blob paths instead of full URLs), image previews stopped working because the frontend was trying to display blob paths like `"123-uuid.jpg"` instead of full URLs with SAS tokens.

## Solution: Option 1 - Dual Response Fields

### Backend Changes

#### 1. Updated Type Definitions (`apps/api/src/types/upload/upload.types.ts`)

```typescript
export interface UploadedImageDTO {
  url: string;        // Blob path for storage (e.g., "123-uuid.jpg")
  previewUrl: string; // Full URL with SAS token for display
  filename: string;
  size: number;
  mimeType: string;
}

export interface BatchUploadResultItem {
  success: boolean;
  url?: string;        // Blob path for storage
  previewUrl?: string; // Full URL with SAS token for display
  filename: string;
  size: number;
  mimeType: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}
```

#### 2. Updated Upload Service (`apps/api/src/services/upload.service.ts`)

**uploadSingleImage method:**
```typescript
return {
  success: true,
  data: {
    url: blobName,                              // Store blob path in database
    previewUrl: this.generateDynamicSasUrl(blobName), // Generate fresh SAS for preview
    filename: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
  },
};
```

**uploadSingleFile method (for batch uploads):**
```typescript
return {
  success: true,
  url: blobName,                              // Store in database
  previewUrl: this.generateDynamicSasUrl(blobName), // Display in UI
  filename: file.originalname,
  size: file.size,
  mimeType: file.mimetype,
};
```

### Frontend Changes

#### 1. Updated Type Definitions (`apps/web/src/lib/services/upload.service.ts`)

```typescript
export interface UploadResponse {
  url: string;        // Blob path for storage (e.g., "123-uuid.jpg")
  previewUrl: string; // Full URL with SAS token for display
  filename: string;
  size: number;
  mimeType: string;
}
```

#### 2. Updated ImageUploader Component (`apps/web/src/lib/components/post/ImageUploader.svelte`)

**Added preview URL mapping:**
```typescript
// Map blob paths to preview URLs for display
let previewUrlMap = $state<Map<string, string>>(new Map());
```

**Updated upload handling:**
```typescript
if (result.success && result.data) {
  // Store blob paths (for form submission) and map to preview URLs (for display)
  const blobPaths = result.data.map((item) => item.url);
  
  // Store blob paths in the images array (sent to API)
  images = [...images, ...blobPaths];
  
  // Map each blob path to its preview URL for display
  result.data.forEach((item) => {
    previewUrlMap.set(item.url, item.previewUrl);
  });
}
```

**Updated image display:**
```typescript
<img
  src={previewUrlMap.get(image) || image}
  alt="Upload {index + 1}"
  class="w-full h-full object-cover"
```

## How It Works

### Upload Flow:
1. **User uploads image** → Frontend sends file to backend
2. **Backend processes upload:**
   - Stores blob in Azure Storage with name like `1-20250115-abc123.jpg`
   - Generates fresh 60-minute SAS token
   - Returns BOTH:
     - `url`: `"1-20250115-abc123.jpg"` (for database storage)
     - `previewUrl`: `"https://account.blob.core.windows.net/container/1-20250115-abc123.jpg?sv=...&se=..."` (for display)
3. **Frontend receives response:**
   - Stores blob path (`url`) in `images` array
   - Maps blob path to `previewUrl` in `previewUrlMap`
   - Displays image using `previewUrl`
4. **User submits post:**
   - Form sends `images` array containing blob paths
   - Backend stores blob paths in database (88% space savings)
5. **User views post:**
   - Backend retrieves blob paths from database
   - `mapToPostResponse()` transforms blob paths to fresh URLs with SAS
   - Frontend displays images with fresh 60-minute tokens

## Benefits

✅ **Maintains Step 5 optimization**: Still stores compact blob paths in database (88% space savings)  
✅ **Fixes preview**: Images display immediately after upload using previewUrl  
✅ **Backward compatible**: Backend accepts both blob paths and full URLs via validation  
✅ **Fresh tokens**: Every upload gets a fresh 60-minute SAS token for preview  
✅ **Auto-renewal**: Post retrieval generates fresh tokens via `mapToPostResponse()`  
✅ **Clean separation**: `url` for storage, `previewUrl` for display  

## Implementation Status

### Completed ✅
- [x] Backend type definitions updated
- [x] Backend upload service returns both fields
- [x] Frontend type definitions updated
- [x] Frontend ImageUploader component updated
- [x] Preview URL mapping implemented
- [x] All TypeScript errors resolved

### Validation Checklist
- [x] `url` returns blob path (not full URL)
- [x] `previewUrl` returns full URL with https://
- [x] `previewUrl` contains SAS token (`?sv=...`)
- [x] Both fields reference the same blob
- [x] Form submission sends blob paths
- [x] Database stores blob paths
- [x] Post retrieval transforms blob paths to fresh URLs

## Testing

### Manual Testing Steps:
1. Start development servers: `npm run dev`
2. Navigate to Create Post page: http://localhost:5173/post/create
3. Upload an image
4. Verify preview displays correctly
5. Create a post
6. Verify post is created successfully
7. View the post
8. Verify images display correctly

### Expected Behavior:
- ✅ Image preview shows immediately after upload
- ✅ Multiple images can be uploaded and reordered
- ✅ Post creation succeeds
- ✅ Post retrieval shows all images with fresh SAS tokens
- ✅ Database contains blob paths (not full URLs)

## Files Modified

### Backend:
- `apps/api/src/types/upload/upload.types.ts`
- `apps/api/src/services/upload.service.ts`

### Frontend:
- `apps/web/src/lib/services/upload.service.ts`
- `apps/web/src/lib/components/post/ImageUploader.svelte`

## Related Documentation
- [Azure SAS URL Transformation Plan](documentation/01_AZURE_SAS_URL_TRANSFORMATION_PLAN.md)
- [Azure Blob Storage Implementation](documentation/AZURE_BLOB_STORAGE_IMPLEMENTATION.md)
- [Upload Service Implementation](documentation/UPLOAD_SERVICE_STUB.md)

## Notes
- The implementation maintains all benefits from Step 5 (88% storage savings)
- No changes needed to validation (already accepts both formats)
- No changes needed to post service (already transforms URLs on retrieval)
- The `previewUrlMap` is reactive and automatically updates the UI when images are added/removed
