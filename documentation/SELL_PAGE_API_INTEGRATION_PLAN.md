# Sell Page (Post Creation) API Integration Plan

**Date**: January 6, 2026  
**Status**: Planning Phase  
**Objective**: Complete the wiring of the post creation flow to the API backend with draft functionality and payment integration

---

## Executive Summary

The "sell page" refers to the post creation flow located at `/post/create`. This is a **3-step wizard form** for creating new listings with image upload, post details, and tier selection. The page is **80% complete** with all UI components, form validation, and basic structure implemented, but requires completion of draft functionality, payment workflow clarification, and authentication verification.

**Current State**: Partially integrated - image upload and category loading work, but draft save and payment flow incomplete  
**Target State**: Full end-to-end post creation with draft saving, tier selection, and payment workflow  
**Complexity**: Medium (requires payment integration and business logic decisions)

---

## 1. Current State Analysis

### 1.1 Post Creation Page Structure

**Location**: `apps/web/src/routes/post/create/+page.svelte`  
**Route**: `/post/create`  
**Authentication**: Required (protected route)

**Multi-Step Form**:
1. **Step 1: Image Upload** - Drag & drop, multiple images (max 10)
2. **Step 2: Post Details** - Required and optional fields
3. **Step 3: Tier Selection** - Pricing tiers and terms acceptance

### 1.2 Form Components

#### **ImageUploader Component**

**Location**: `apps/web/src/lib/components/post/ImageUploader.svelte`

**Status**: ✅ FULLY INTEGRATED WITH API

**Features**:
- Drag & drop file upload
- Multiple file selection (max 10 images)
- File validation (JPEG, PNG, WebP, max 10MB per file)
- Image preview with SAS URLs
- Reordering via drag & drop
- Delete functionality
- Upload progress tracking
- Real-time error feedback

**Integration**:
```typescript
const result = await uploadImages(validFiles, {
  onProgress: (progress) => {
    uploadProgress = uploadProgress.map(() => progress.percentage);
  }
});

if (result.success && result.data) {
  // Store blob paths for database
  const blobPaths = result.data.map((item) => item.url);
  images = [...images, ...blobPaths];
  
  // Map preview URLs for display
  result.data.forEach((item) => {
    previewUrlMap.set(item.url, item.previewUrl);
  });
}
```

**API Endpoint**: `POST /api/v1/uploads/multiple`  
**Storage**: Azure Blob Storage with dynamic SAS token generation

#### **PostDetailsForm Component**

**Location**: `apps/web/src/lib/components/post/PostDetailsForm.svelte`

**Status**: ✅ CATEGORY LOADING INTEGRATED

**Required Fields**:
- **Title** - 5-100 characters
- **Category** - Dropdown from API (✅ integrated)
- **Description** - Min 20 chars, max 2000 chars
- **Price** - Positive number, TZS currency
- **Location** - Text input
- **Contact Number** - Numeric, format validated

**Optional Fields** (collapsible section):
- **Brand/Make** - Text input
- **Email Address** - Email validation
- **Delivery Method** - Dropdown (PICKUP, DELIVERY, BOTH, SHIPPING)
- **GPS Coordinates** - Latitude, longitude format

**Category Integration**:
```typescript
onMount(async () => {
  try {
    categories = await getCategories();
  } catch (error) {
    console.error('Failed to load categories:', error);
  } finally {
    isLoadingCategories = false;
  }
});
```

**API Endpoint**: `GET /api/v1/categories`  
**Service**: Uses caching strategy from category store

#### **TierSelection Component**

**Location**: `apps/web/src/lib/components/post/TierSelection.svelte`

**Status**: ⚠️ COLLECTED BUT NOT SENT TO API

**Pricing Tiers**:
- **Basic** - $1 for 3 days
- **Standard** - $2 for 7 days
- **Premium** - $3 for 30 days

**Features**:
- Visual tier comparison cards
- Terms & conditions checkbox
- Two submission buttons:
  - **Save as Draft** - No tier required
  - **Post Now** - Requires tier selection

**Current Issue**: `selectedTier` stored in form state but not included in API payload

### 1.3 Form State Management

**Location**: `apps/web/src/routes/post/create/+page.svelte` (lines 15-34)

```typescript
let formData = $state<{
  images: string[];
  title: string;
  categoryId: string;
  description: string;
  price: string;
  location: string;
  contactNumber: string;
  brand?: string;
  emailAddress?: string;
  deliveryMethod?: string;
  gpsLocation?: string;
  selectedTier?: 'BASIC' | 'STANDARD' | 'PREMIUM';
}>({
  images: [],
  title: '',
  categoryId: '',
  description: '',
  price: '',
  location: '',
  contactNumber: '',
  selectedTier: undefined
});
```

### 1.4 Current Submit Handler

**Location**: `apps/web/src/routes/post/create/+page.svelte` (lines 108-149)

```typescript
async function handleSubmit(isDraft: boolean = false) {
  if (!isDraft && !formData.selectedTier) {
    validationErrors.tier = 'Please select a pricing tier';
    return;
  }

  isSubmitting = true;

  try {
    const payload = {
      title: formData.title,
      categoryId: parseInt(formData.categoryId, 10),
      description: formData.description,
      price: parseFloat(formData.price),
      location: formData.location,
      contactNumber: formData.contactNumber,
      images: formData.images.map((url, index) => ({
        imageUrl: url,
        displayOrder: index
      })),
      ...(formData.brand && { brand: formData.brand }),
      ...(formData.emailAddress && { emailAddress: formData.emailAddress }),
      ...(formData.deliveryMethod && { deliveryMethod: formData.deliveryMethod }),
      ...(formData.gpsLocation && { gpsLocation: formData.gpsLocation })
    };

    const result = await createPost(payload);

    if (result.success && result.data) {
      goto(`/post/${result.data.id}`); // ⚠️ Always goes to post detail
    } else {
      throw new Error(result.error?.message || 'Failed to create post');
    }
  } catch (error) {
    validationErrors.submit = error.message;
  } finally {
    isSubmitting = false;
  }
}
```

**Issues**:
- ❌ `isDraft` parameter not used properly
- ❌ `selectedTier` not included in payload
- ❌ Always navigates to post detail (should go to my-listings for drafts)
- ❌ No different handling for draft vs publish flow

### 1.5 Validation Implementation

**Client-Side Validation** (lines 62-106):

**Step 1 - Images**:
```typescript
if (currentStep === 1 && formData.images.length === 0) {
  validationErrors.images = 'Please upload at least one image';
  return false;
}
```

**Step 2 - Required Fields**:
- Title: 5-100 characters
- Category: Must be selected
- Description: Minimum 20 characters
- Price: Positive number
- Location: Required
- Contact Number: Required

**Step 3 - Tier** (only for "Post Now"):
```typescript
if (!isDraft && !formData.selectedTier) {
  validationErrors.tier = 'Please select a pricing tier';
  return false;
}
```

---

## 2. API Backend Analysis

### 2.1 Create Post Endpoint

**Route**: `POST /api/v1/posts`  
**Controller**: `apps/api/src/controllers/post.controller.ts`  
**Service**: `apps/api/src/services/post.service.ts`  
**Authentication**: ✅ Required (JWT Bearer token)  
**Rate Limit**: 20 requests/min

#### **Request Schema**

**Validation**: `apps/api/src/validation/post.validation.ts` (lines 1-59)

```typescript
{
  title: string,              // 5-255 chars, required
  categoryId: number,         // required
  description: string,        // min 10 chars, required
  price: number,              // positive, required
  location: string,           // required
  contactNumber: string,      // required
  brand?: string,
  emailAddress?: string,      // email format
  deliveryMethod?: string,
  gpsLocation?: string,
  images?: Array<{
    imageUrl: string,         // blob path or URL
    displayOrder: number      // 0+
  }>                          // max 10
}
```

#### **Response Structure**

```typescript
{
  success: boolean,
  data?: PostResponseDTO,
  error?: {
    code: ErrorCode,
    message: string,
    details?: string,
    statusCode: number
  }
}
```

#### **Post Creation Logic**

**Service**: `apps/api/src/services/post.service.ts` (lines 40-103)

**Flow**:
1. ✅ Validate user exists (from JWT token)
2. ✅ Validate category exists
3. ✅ Create post with **status: "Draft"** (default)
4. ✅ Create post images if provided with display order
5. ✅ Return complete post with relations (user, category, images)

**IMPORTANT**: All posts are created as **"Draft"** by default, not "Active"

### 2.2 Publish Post Endpoint

**Route**: `POST /api/v1/posts/:id/publish`  
**Purpose**: Publish a draft post (make it Active and visible)  
**Service**: `apps/api/src/services/post.service.ts`

**Logic**:
- ✅ Verifies user ownership
- ✅ Only drafts or scheduled posts can be published
- ✅ Sets status to "Active"
- ✅ Sets `publishedAt` timestamp to now
- ✅ Sets `expiresAt` to 30 days from now (default)

**Request**: No body required  
**Response**: Updated `PostResponseDTO`

### 2.3 Schedule Post Endpoint

**Route**: `POST /api/v1/posts/:id/schedule`  
**Purpose**: Schedule a post for future publishing  

**Request Body**:
```typescript
{
  scheduledPublishTime: string  // ISO 8601 format, must be future
}
```

### 2.4 Update Post Endpoint

**Route**: `PUT /api/v1/posts/:id`  
**Purpose**: Update existing post (drafts or active)  
**Logic**: Similar to create, but updates existing record

### 2.5 Delete Post Endpoint

**Route**: `DELETE /api/v1/posts/:id`  
**Purpose**: Delete a post (user must be owner)

### 2.6 Post Status Enum

```typescript
enum PostStatus {
  DRAFT = 'DRAFT',                    // Created but not published
  PENDING_PAYMENT = 'PENDING_PAYMENT', // Waiting for payment confirmation
  ACTIVE = 'ACTIVE',                   // Published and visible
  EXPIRED = 'EXPIRED',                 // Past expiration date
  SCHEDULED = 'SCHEDULED'              // Scheduled for future publish
}
```

### 2.7 Image Upload Endpoints

#### **Multiple Images Upload**

**Route**: `POST /api/v1/uploads/multiple`  
**Body**: `multipart/form-data` with `images` field (max 10)  
**Controller**: `apps/api/src/controllers/upload.controller.ts`  
**Service**: `apps/api/src/services/upload.service.ts`

**Response**:
```typescript
{
  success: boolean,
  data?: Array<{
    url: string,           // Blob path (e.g., "posts/uuid/image.jpg")
    previewUrl: string,    // SAS URL with token for preview
    originalName: string,
    size: number,
    mimeType: string
  }>,
  error?: ApiError
}
```

**Storage**: Azure Blob Storage  
**Path Structure**: `posts/{userId}/{timestamp}_{uuid}_{filename}`  
**SAS Token**: Generated dynamically, valid for 1 hour

#### **Single Image Upload**

**Route**: `POST /api/v1/uploads/single`  
**Body**: `multipart/form-data` with `image` field

---

## 3. Integration Status Assessment

### 3.1 ✅ Already Integrated

**Image Upload**:
- Frontend: ImageUploader component
- Service: `uploadImages()` from `apps/web/src/lib/services/upload.service.ts`
- Backend: `POST /api/v1/uploads/multiple`
- Status: **Fully functional**
- Returns blob paths for database storage
- Generates preview URLs with SAS tokens

**Category Loading**:
- Frontend: PostDetailsForm component
- Service: `getCategories()` from `apps/web/src/lib/services/category.service.ts`
- Backend: `GET /api/v1/categories`
- Status: **Fully functional**
- Uses cache-first strategy
- Updates category store

**API Client**:
- Configuration: `apps/web/src/lib/api/client.ts`
- Base URL from environment
- Auth interceptor adds JWT token
- Token refresh on 401
- Retry logic for network errors
- Status: **Fully configured**

**Post Service**:
- File: `apps/web/src/lib/services/post.service.ts`
- Has `createPost()` function
- Error handling implemented
- Store integration ready
- Status: **Implementation exists**

### 3.2 ⚠️ Partially Implemented

**Post Creation Form**:
- ✅ All UI components built
- ✅ Client-side validation working
- ✅ Form state management in place
- ✅ Calls `createPost()` service
- ⚠️ Draft save button exists but doesn't work correctly
- ⚠️ Tier selection not sent to API
- ⚠️ Always navigates to post detail (even for drafts)

**Authentication**:
- ✅ Auth service implemented
- ✅ Token storage in localStorage
- ✅ Auth interceptor configured
- ⚠️ Need to verify tokens are being sent
- ⚠️ Need to test 401 handling

### 3.3 ❌ Not Yet Implemented

**Draft Functionality**:
- ❌ "Save as Draft" button not properly wired
- ❌ Navigation doesn't differentiate draft vs publish
- ❌ No draft recovery mechanism
- ❌ No auto-save to localStorage

**Payment Integration**:
- ❌ No payment page exists
- ❌ No payment service implemented
- ❌ Tier selection not sent anywhere
- ❌ No publish after payment flow

**Post Status Workflow**:
- ❌ Unclear when posts should become "Active"
- ❌ No publish endpoint call from frontend
- ❌ No handling of `PENDING_PAYMENT` status

**Draft Management**:
- ❌ No draft listing on my-listings page
- ❌ No edit draft functionality
- ❌ No delete draft option

---

## 4. Implementation Gaps & Decisions Needed

### 4.1 Critical Gaps

#### **Gap 1: Draft Functionality**

**Problem**: "Save as Draft" button exists but `isDraft` parameter not used properly

**Current Behavior**:
```typescript
async function handleSubmit(isDraft: boolean = false) {
  // isDraft checked for validation only
  // Not used to differentiate behavior
  // Always navigates to post detail page
}
```

**Required Behavior**:
- Skip tier validation when `isDraft = true`
- Don't navigate to post detail
- Navigate to my-listings page instead
- Show success toast: "Draft saved successfully"
- Allow user to continue editing or view drafts

#### **Gap 2: Tier Selection Not Sent**

**Problem**: Tier collected in form but not included in API payload

**Decision Required**: When/how to handle tier?

**Option A: Store Tier Separately**
- Create post as draft
- Store tier in localStorage or separate state
- After payment, update post and publish

**Option B: Include Tier in Post Creation** (NOT RECOMMENDED)
- Send tier with create request
- Backend stores tier field on post
- Requires database schema change

**Option C: Payment-First Flow** (RECOMMENDED)
- Create post as draft
- Redirect to payment page with post ID and tier
- After payment success, call publish endpoint
- Tier associated with payment record, not post

#### **Gap 3: Post Status Flow Unclear**

**Question**: When should a post become "Active"?

**Current Backend Behavior**:
- All posts created with status: "Draft"
- Must explicitly call `/posts/:id/publish` to activate
- Publish sets `publishedAt` and `expiresAt`

**Frontend Questions**:
- Should posts auto-publish after payment?
- Should free tier skip payment?
- Should there be manual approval step?
- How to handle payment failures?

**Recommended Flow**:
1. User fills form → Create post (status: DRAFT)
2. User selects tier → Redirect to payment
3. Payment processed → Call publish endpoint
4. Post published → Status: ACTIVE
5. Redirect to post detail page

#### **Gap 4: Payment Integration**

**Problem**: No payment service or page exists

**Required**:
- Payment page at `/post/payment/[id]`
- Payment service integration (Stripe/Paystack/M-Pesa)
- Payment confirmation webhook
- Error handling for failed payments
- Refund handling

**Complexity**: HIGH - requires external service integration

### 4.2 Business Logic Decisions

#### **Decision 1: Free Tier Handling**

**Question**: Should Basic tier ($1/3 days) require payment?

**Options**:
- **Option A**: All tiers require payment
- **Option B**: Basic is free, others require payment
- **Option C**: First post free, subsequent posts require payment

#### **Decision 2: Draft Expiration**

**Question**: Should drafts expire or be automatically deleted?

**Options**:
- **Option A**: Drafts never expire (remain until deleted)
- **Option B**: Drafts expire after 30 days
- **Option C**: Limit number of drafts per user (e.g., max 10)

#### **Decision 3: Post Editing**

**Question**: Can users edit active posts?

**Options**:
- **Option A**: No editing after publish (only delete/repost)
- **Option B**: Allow editing (mark as "updated")
- **Option C**: Allow editing but requires re-approval

#### **Decision 4: Image Upload Timing**

**Question**: When are images uploaded?

**Current**: Images uploaded during Step 1 (before post created)

**Alternatives**:
- **Option A**: Upload after post creation (associate with post ID)
- **Option B**: Upload during form fill (current approach)
- **Option C**: Upload on final submit only

**Current approach is fine** - allows preview and reordering

---

## 5. Implementation Plan

### Phase 1: Core Integration (High Priority)

#### **Task 1.1: Verify Authentication**

**File**: `apps/web/src/lib/api/client.ts`

**Actions**:
1. Add debug logging to verify token is sent:
```typescript
// Add to request interceptor
if (isDevelopment && appConfig.dev.debugMode) {
  const tokens = getTokens();
  console.log('[API Client] Request auth:', {
    hasAccessToken: !!tokens?.accessToken,
    endpoint: config.url,
    method: config.method
  });
}
```

2. Test token refresh on 401
3. Verify token expiration handling
4. Test create post with valid token
5. Test create post without token (should fail)

**Testing**:
- [ ] Check network tab shows Authorization header
- [ ] Test token refresh flow
- [ ] Test expired token handling
- [ ] Verify redirect to login on 401

#### **Task 1.2: Fix Draft Save Functionality**

**File**: `apps/web/src/routes/post/create/+page.svelte`

**Changes**:
```typescript
async function handleSubmit(isDraft: boolean = false) {
  // Validate tier only if not saving as draft
  if (!isDraft && !formData.selectedTier) {
    validationErrors.tier = 'Please select a pricing tier';
    return;
  }

  isSubmitting = true;

  try {
    const payload = {
      title: formData.title,
      categoryId: parseInt(formData.categoryId, 10),
      description: formData.description,
      price: parseFloat(formData.price),
      location: formData.location,
      contactNumber: formData.contactNumber,
      images: formData.images.map((url, index) => ({
        imageUrl: url,
        displayOrder: index
      })),
      ...(formData.brand && { brand: formData.brand }),
      ...(formData.emailAddress && { emailAddress: formData.emailAddress }),
      ...(formData.deliveryMethod && { deliveryMethod: formData.deliveryMethod }),
      ...(formData.gpsLocation && { gpsLocation: formData.gpsLocation })
    };

    const result = await createPost(payload);

    if (result.success && result.data) {
      if (isDraft) {
        // Show success message
        toast.success('Draft saved successfully');
        
        // Navigate to my listings
        goto('/post/my-listings');
      } else {
        // Navigate to payment page with tier
        const tier = formData.selectedTier!;
        goto(`/post/payment/${result.data.id}?tier=${tier}`);
      }
    } else {
      throw new Error(result.error?.message || 'Failed to create post');
    }
  } catch (error) {
    console.error('Error creating post:', error);
    
    // Enhanced error handling
    if (error.response?.status === 401) {
      validationErrors.submit = 'Session expired. Please log in again.';
      setTimeout(() => goto('/auth/login?redirect=/post/create'), 2000);
    } else if (error.response?.status === 429) {
      validationErrors.submit = 'Too many requests. Please try again in a moment.';
    } else if (error.response?.data?.error) {
      validationErrors.submit = error.response.data.error.message;
    } else {
      validationErrors.submit = error instanceof Error 
        ? error.message 
        : 'Failed to create post. Please try again.';
    }
  } finally {
    isSubmitting = false;
  }
}
```

**Testing**:
- [ ] Click "Save as Draft" without tier selection
- [ ] Verify post created with status: DRAFT
- [ ] Verify navigation to my-listings
- [ ] Verify success message shown
- [ ] Test with missing required fields (should fail)

#### **Task 1.3: Add Toast Notifications**

**File**: `apps/web/src/routes/post/create/+page.svelte`

**Install toast library** (if not present):
```typescript
import { toast } from 'svelte-sonner'; // or similar
```

**Add to layout** (`apps/web/src/routes/+layout.svelte`):
```svelte
<Toaster />
```

**Usage**:
- Success: `toast.success('Draft saved successfully')`
- Error: `toast.error('Failed to create post')`
- Info: `toast.info('Uploading images...')`

#### **Task 1.4: Test Existing Integration**

**Manual Testing Checklist**:
- [ ] Open `/post/create` in browser
- [ ] Upload 1-3 images
- [ ] Check network tab: POST to `/api/v1/uploads/multiple`
- [ ] Verify images appear in preview
- [ ] Fill all required fields
- [ ] Select category (verify dropdown populated)
- [ ] Click "Next" through all steps
- [ ] Click "Save as Draft"
- [ ] Check network tab: POST to `/api/v1/posts`
- [ ] Verify Authorization header present
- [ ] Check response status (should be 201)
- [ ] Verify navigation to my-listings

---

### Phase 2: Payment Integration (Medium Priority)

#### **Task 2.1: Create Payment Page**

**New File**: `apps/web/src/routes/post/payment/[id]/+page.svelte`

**Purpose**: Handle payment for post publishing

**Structure**:
```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { publishPost } from '$lib/services/post.service';
  
  const postId = $derived(parseInt($page.params.id));
  const tier = $derived($page.url.searchParams.get('tier') as 'BASIC' | 'STANDARD' | 'PREMIUM');
  
  let isProcessing = $state(false);
  let error = $state<string | null>(null);
  
  const tierPrices = {
    BASIC: { amount: 1, duration: '3 days' },
    STANDARD: { amount: 2, duration: '7 days' },
    PREMIUM: { amount: 3, duration: '30 days' }
  };
  
  const selectedTierInfo = $derived(tierPrices[tier]);
  
  async function handlePayment() {
    isProcessing = true;
    error = null;
    
    try {
      // TODO: Integrate with payment service
      // For now, simulate payment success
      
      // Publish the post
      const result = await publishPost(postId);
      
      if (result.success) {
        toast.success('Post published successfully!');
        goto(`/post/${postId}`);
      } else {
        throw new Error(result.error?.message || 'Failed to publish post');
      }
    } catch (err) {
      console.error('Payment error:', err);
      error = err instanceof Error ? err.message : 'Payment failed';
    } finally {
      isProcessing = false;
    }
  }
  
  function handleCancel() {
    goto('/post/my-listings');
  }
</script>

<div class="container mx-auto px-4 py-8 max-w-2xl">
  <h1 class="text-3xl font-bold mb-6">Complete Your Listing</h1>
  
  <div class="card bg-base-100 shadow-xl mb-6">
    <div class="card-body">
      <h2 class="card-title">Payment Summary</h2>
      <div class="divider"></div>
      
      <div class="space-y-2">
        <div class="flex justify-between">
          <span>Selected Tier:</span>
          <span class="font-semibold">{tier}</span>
        </div>
        <div class="flex justify-between">
          <span>Duration:</span>
          <span>{selectedTierInfo.duration}</span>
        </div>
        <div class="flex justify-between text-lg font-bold">
          <span>Total:</span>
          <span>${selectedTierInfo.amount}</span>
        </div>
      </div>
    </div>
  </div>
  
  {#if error}
    <div class="alert alert-error mb-6">
      <span>{error}</span>
    </div>
  {/if}
  
  <div class="flex gap-4">
    <button 
      class="btn btn-primary flex-1"
      onclick={handlePayment}
      disabled={isProcessing}
    >
      {isProcessing ? 'Processing...' : 'Pay Now'}
    </button>
    
    <button 
      class="btn btn-outline"
      onclick={handleCancel}
      disabled={isProcessing}
    >
      Cancel
    </button>
  </div>
  
  <p class="text-sm text-base-content/60 mt-4 text-center">
    Your post will be published immediately after payment confirmation
  </p>
</div>
```

**Testing**:
- [ ] Navigate from create page with tier parameter
- [ ] Verify tier information displayed correctly
- [ ] Test "Pay Now" button
- [ ] Verify publishPost() called
- [ ] Test cancel navigation

#### **Task 2.2: Implement Publish Service Call**

**File**: `apps/web/src/lib/services/post.service.ts`

**Check if exists**, if not add:
```typescript
/**
 * Publish a draft post
 * Makes the post active and visible to all users
 */
export async function publishPost(
  postId: number
): Promise<ApiResponse<PostResponseDTO>> {
  try {
    const response = await apiClient.post<ApiResponse<PostResponseDTO>>(
      `/posts/${postId}/publish`
    );

    if (response.data.success && response.data.data) {
      const post = response.data.data;
      
      // Update store
      postStore.setPost(post);
      
      // If in my posts, update that too
      postStore.updateMyPost(post);
    }

    return response.data;
  } catch (error) {
    throw handleError(error);
  }
}
```

**Testing**:
- [ ] Call publishPost() with valid draft ID
- [ ] Verify POST to `/api/v1/posts/:id/publish`
- [ ] Check response has updated post with status: ACTIVE
- [ ] Verify store updated

#### **Task 2.3: Add Payment Service Stub**

**New File**: `apps/web/src/lib/services/payment.service.ts`

**Purpose**: Placeholder for future payment integration

```typescript
import type { ApiResponse } from '$lib/types/api.types';
import { apiClient, handleError } from '$lib/api/client';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed';
  clientSecret?: string;
}

export interface CreatePaymentOptions {
  postId: number;
  tier: 'BASIC' | 'STANDARD' | 'PREMIUM';
  amount: number;
}

/**
 * Create payment intent
 * TODO: Integrate with payment provider (Stripe/Paystack/M-Pesa)
 */
export async function createPaymentIntent(
  options: CreatePaymentOptions
): Promise<ApiResponse<PaymentIntent>> {
  try {
    // TODO: Replace with real payment service call
    // const response = await apiClient.post<ApiResponse<PaymentIntent>>(
    //   '/payments/create-intent',
    //   options
    // );
    
    // Simulate payment intent creation
    const mockIntent: PaymentIntent = {
      id: `pi_${Date.now()}`,
      amount: options.amount,
      currency: 'USD',
      status: 'pending'
    };
    
    return {
      success: true,
      data: mockIntent
    };
  } catch (error) {
    throw handleError(error);
  }
}

/**
 * Confirm payment
 */
export async function confirmPayment(
  paymentIntentId: string
): Promise<ApiResponse<PaymentIntent>> {
  try {
    // TODO: Replace with real payment confirmation
    // const response = await apiClient.post<ApiResponse<PaymentIntent>>(
    //   '/payments/confirm',
    //   { paymentIntentId }
    // );
    
    // Simulate successful payment
    const mockConfirmed: PaymentIntent = {
      id: paymentIntentId,
      amount: 0,
      currency: 'USD',
      status: 'succeeded'
    };
    
    return {
      success: true,
      data: mockConfirmed
    };
  } catch (error) {
    throw handleError(error);
  }
}
```

---

### Phase 3: Draft Management (Low Priority)

#### **Task 3.1: Display Drafts in My Listings**

**File**: `apps/web/src/routes/(dashboard)/my-listings/+page.svelte`

**Changes**:
1. Add tabs for "Active" and "Drafts"
2. Filter posts by status
3. Add edit button for drafts
4. Add delete button for drafts
5. Add publish button for drafts

**UI Addition**:
```svelte
<div class="tabs tabs-boxed mb-4">
  <button 
    class="tab"
    class:tab-active={activeTab === 'active'}
    onclick={() => activeTab = 'active'}
  >
    Active Posts ({activePosts.length})
  </button>
  <button 
    class="tab"
    class:tab-active={activeTab === 'drafts'}
    onclick={() => activeTab = 'drafts'}
  >
    Drafts ({draftPosts.length})
  </button>
</div>

{#if activeTab === 'drafts'}
  {#each draftPosts as post}
    <ListingCard 
      {post}
      showEdit={true}
      showDelete={true}
      showPublish={true}
    />
  {/each}
{/if}
```

#### **Task 3.2: Implement Edit Draft**

**New Route**: `apps/web/src/routes/post/edit/[id]/+page.svelte`

**Approach**:
- Load draft by ID
- Pre-fill form with draft data
- Use same components as create page
- On save, call update endpoint instead of create

**Alternative**: Reuse create page with edit mode parameter

#### **Task 3.3: Add Auto-Save to LocalStorage**

**File**: `apps/web/src/routes/post/create/+page.svelte`

**Implementation**:
```typescript
import { browser } from '$app/environment';

const AUTO_SAVE_KEY = 'post-create-draft';

// Load from localStorage on mount
onMount(() => {
  if (browser) {
    const saved = localStorage.getItem(AUTO_SAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        formData = { ...formData, ...parsed };
        toast.info('Draft recovered');
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }
});

// Auto-save every 30 seconds
let autoSaveInterval: number;
onMount(() => {
  autoSaveInterval = setInterval(() => {
    if (browser && formData.title) {
      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(formData));
    }
  }, 30000);
  
  return () => clearInterval(autoSaveInterval);
});

// Clear on successful submit
function clearLocalDraft() {
  if (browser) {
    localStorage.removeItem(AUTO_SAVE_KEY);
  }
}
```

---

### Phase 4: Enhanced Error Handling

#### **Task 4.1: Network Error Handling**

**File**: `apps/web/src/routes/post/create/+page.svelte`

**Add to submit handler**:
```typescript
catch (error) {
  console.error('Error creating post:', error);
  
  if (!navigator.onLine) {
    validationErrors.submit = 'No internet connection. Please check your network.';
  } else if (error.response?.status === 401) {
    validationErrors.submit = 'Session expired. Redirecting to login...';
    setTimeout(() => goto('/auth/login?redirect=/post/create'), 2000);
  } else if (error.response?.status === 429) {
    validationErrors.submit = 'Too many requests. Please wait and try again.';
  } else if (error.response?.status === 413) {
    validationErrors.submit = 'Images are too large. Please reduce file sizes.';
  } else if (error.response?.status >= 500) {
    validationErrors.submit = 'Server error. Please try again later.';
  } else if (error.response?.data?.error) {
    validationErrors.submit = error.response.data.error.message;
  } else {
    validationErrors.submit = 'Failed to create post. Please try again.';
  }
}
```

#### **Task 4.2: Validation Error Display**

**Enhance field-level error display**:
```svelte
{#if validationErrors.title}
  <label class="label">
    <span class="label-text-alt text-error">{validationErrors.title}</span>
  </label>
{/if}
```

**Add retry button for server errors**:
```svelte
{#if validationErrors.submit}
  <div class="alert alert-error">
    <span>{validationErrors.submit}</span>
    {#if validationErrors.submit.includes('server') || validationErrors.submit.includes('network')}
      <button class="btn btn-sm" onclick={() => handleSubmit(false)}>
        Retry
      </button>
    {/if}
  </div>
{/if}
```

---

### Phase 5: Testing & QA

#### **Unit Tests**

**Test File**: `apps/web/src/lib/services/post.service.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { createPost, publishPost } from './post.service';

describe('Post Service', () => {
  it('should create post with valid data', async () => {
    const mockPost = {
      title: 'Test Post',
      categoryId: 1,
      description: 'Test description with enough characters',
      price: 100,
      location: 'Nairobi',
      contactNumber: '0712345678'
    };
    
    const result = await createPost(mockPost);
    expect(result.success).toBe(true);
    expect(result.data?.title).toBe(mockPost.title);
  });
  
  it('should publish draft post', async () => {
    const result = await publishPost(1);
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('Active');
  });
});
```

#### **Integration Tests**

**Test scenarios**:
- [ ] Create post with minimum required fields
- [ ] Create post with all optional fields
- [ ] Create post with images
- [ ] Save as draft
- [ ] Publish draft
- [ ] Edit draft
- [ ] Delete draft
- [ ] Handle expired token
- [ ] Handle network error
- [ ] Handle validation errors

#### **E2E Tests**

**Test File**: `apps/web/tests/post-creation.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Post Creation Flow', () => {
  test('should create post as draft', async ({ page }) => {
    await page.goto('/post/create');
    
    // Upload image
    await page.setInputFiles('input[type="file"]', 'test-image.jpg');
    await page.click('text=Next');
    
    // Fill form
    await page.fill('[name="title"]', 'Test Listing');
    await page.selectOption('[name="categoryId"]', '1');
    await page.fill('[name="description"]', 'This is a test description with enough characters');
    await page.fill('[name="price"]', '1000');
    await page.fill('[name="location"]', 'Nairobi');
    await page.fill('[name="contactNumber"]', '0712345678');
    await page.click('text=Next');
    
    // Save as draft
    await page.click('text=Save as Draft');
    
    // Should navigate to my-listings
    await expect(page).toHaveURL('/post/my-listings');
  });
  
  test('should complete full publish flow', async ({ page }) => {
    // ... similar steps ...
    
    // Select tier
    await page.click('[data-tier="STANDARD"]');
    await page.check('[name="terms"]');
    await page.click('text=Post Now');
    
    // Should navigate to payment
    await expect(page).toHaveURL(/\/post\/payment\/\d+/);
    
    // Complete payment
    await page.click('text=Pay Now');
    
    // Should navigate to post detail
    await expect(page).toHaveURL(/\/post\/\d+/);
  });
});
```

---

## 6. API Endpoints Reference

### Posts

| Method | Endpoint | Purpose | Auth | Status |
|--------|----------|---------|------|--------|
| POST | `/api/v1/posts` | Create post (draft) | ✅ | ✅ Implemented |
| GET | `/api/v1/posts/:id` | Get post details | Optional | ✅ Implemented |
| PUT | `/api/v1/posts/:id` | Update post | ✅ | ✅ Implemented |
| DELETE | `/api/v1/posts/:id` | Delete post | ✅ | ✅ Implemented |
| POST | `/api/v1/posts/:id/publish` | Publish draft | ✅ | ✅ Implemented |
| POST | `/api/v1/posts/:id/schedule` | Schedule post | ✅ | ✅ Implemented |
| GET | `/api/v1/posts/feed` | Get feed | Optional | ✅ Implemented |
| GET | `/api/v1/posts/user/:userId` | Get user posts | Optional | ✅ Implemented |

### Uploads

| Method | Endpoint | Purpose | Auth | Status |
|--------|----------|---------|------|--------|
| POST | `/api/v1/uploads/single` | Upload 1 image | ✅ | ✅ Implemented |
| POST | `/api/v1/uploads/multiple` | Upload up to 10 images | ✅ | ✅ Implemented |

### Categories

| Method | Endpoint | Purpose | Auth | Status |
|--------|----------|---------|------|--------|
| GET | `/api/v1/categories` | List categories | No | ✅ Implemented |
| GET | `/api/v1/categories/:id` | Get category | No | ✅ Implemented |

### Payments (Future)

| Method | Endpoint | Purpose | Auth | Status |
|--------|----------|---------|------|--------|
| POST | `/api/v1/payments/intent` | Create payment | ✅ | ❌ Not implemented |
| POST | `/api/v1/payments/confirm` | Confirm payment | ✅ | ❌ Not implemented |
| GET | `/api/v1/payments/:id` | Get payment | ✅ | ❌ Not implemented |

---

## 7. Type Definitions

### Frontend Types

**File**: `apps/web/src/lib/types/post.types.ts`

```typescript
export interface CreatePostDTO {
  title: string;
  categoryId: number;
  description: string;
  price: number;
  location: string;
  contactNumber: string;
  brand?: string;
  emailAddress?: string;
  deliveryMethod?: string;
  gpsLocation?: string;
  images?: CreatePostImageDTO[];
}

export interface CreatePostImageDTO {
  imageUrl: string;
  displayOrder: number;
}

export interface PostResponseDTO {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  brand?: string;
  deliveryMethod?: string;
  contactNumber: string;
  emailAddress?: string;
  status: PostStatus;
  user: PostUserDTO;
  category: CategoryDTO;
  images: PostImageDTO[];
  likeCount: number;
  viewCount: number;
  isLiked?: boolean;
  scheduledPublishTime?: Date;
  publishedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SCHEDULED = 'SCHEDULED'
}
```

---

## 8. Configuration

### Environment Variables

**File**: `apps/web/.env`

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1
VITE_API_TIMEOUT=30000

# Upload Configuration
VITE_MAX_FILE_SIZE=10485760  # 10MB
VITE_MAX_FILES=10
VITE_ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Post Configuration
VITE_MIN_TITLE_LENGTH=5
VITE_MAX_TITLE_LENGTH=100
VITE_MIN_DESCRIPTION_LENGTH=20
VITE_MAX_DESCRIPTION_LENGTH=2000

# Payment (Future)
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## 9. Success Criteria

### Functional Requirements

✅ User can create post with all required fields  
✅ User can upload 1-10 images  
✅ User can save post as draft  
✅ User can select pricing tier  
✅ User can publish post after payment  
✅ Drafts are saved and retrievable  
✅ Published posts are visible in feed  
✅ User can edit drafts  
✅ User can delete drafts  

### Technical Requirements

✅ Authentication works correctly  
✅ API requests include JWT token  
✅ Token refresh on 401  
✅ Proper error handling  
✅ Form validation (client and server)  
✅ Image upload to Azure Blob  
✅ SAS URLs for image preview  
✅ Type safety throughout  

### User Experience

✅ Clear feedback during operations  
✅ Loading states for async operations  
✅ Error messages are helpful  
✅ Form auto-saves periodically  
✅ Draft recovery after refresh  
✅ Smooth navigation between steps  
✅ Mobile responsive  

---

## 10. Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Core Integration | Auth verification, fix draft save, testing | 6-8 hours |
| Phase 2: Payment Integration | Payment page, publish flow, service stub | 8-12 hours |
| Phase 3: Draft Management | List drafts, edit, auto-save | 6-8 hours |
| Phase 4: Error Handling | Enhanced errors, retry logic | 2-4 hours |
| Phase 5: Testing & QA | Unit, integration, E2E tests | 6-8 hours |

**Total Estimated Time**: 28-40 hours

**Breakdown**:
- Core functionality (Priority 1): 6-8 hours
- Payment flow (Priority 2): 8-12 hours
- Polish & features (Priority 3): 14-20 hours

---

## 11. Risks & Mitigation

### Risk 1: Payment Integration Complexity

**Risk**: Payment service integration may be complex and time-consuming

**Mitigation**:
- Start with stub/mock payment
- Research payment provider docs early
- Consider using established libraries
- Have fallback to manual approval flow

### Risk 2: Authentication Issues

**Risk**: JWT token may not be sent or expired

**Mitigation**:
- Test auth thoroughly before proceeding
- Add debug logging
- Implement token refresh
- Clear error messages for auth failures

### Risk 3: Image Upload Failures

**Risk**: Large images or network issues may cause upload failures

**Mitigation**:
- Implement retry logic
- Show upload progress
- Validate file size before upload
- Consider client-side compression
- Save form data even if upload fails

### Risk 4: Business Logic Unclear

**Risk**: Product decisions about payment flow not finalized

**Mitigation**:
- Document assumptions clearly
- Build flexible system
- Use feature flags for A/B testing
- Implement analytics to measure effectiveness

---

## 12. Dependencies

### External Services

- **Azure Blob Storage**: Image storage (✅ configured)
- **Payment Provider**: Stripe/Paystack/M-Pesa (❌ not integrated)
- **SMS Service**: OTP verification (optional)
- **Email Service**: Notifications (optional)

### Internal Services

- **Auth Service**: ✅ Implemented
- **Upload Service**: ✅ Implemented
- **Post Service**: ✅ Implemented (needs publish function)
- **Category Service**: ✅ Implemented
- **User Service**: ✅ Implemented

### UI Dependencies

- **Toast Notifications**: Need library (svelte-sonner recommended)
- **Form Validation**: Zod (✅ available)
- **File Upload**: Native (✅ working)
- **Payment UI**: Depends on provider

---

## 13. Future Enhancements

### Short Term

- [ ] Image compression before upload
- [ ] Crop/edit images before upload
- [ ] Location autocomplete (Google Places)
- [ ] Phone number formatting
- [ ] Price suggestions based on category
- [ ] Duplicate post detection

### Medium Term

- [ ] Bulk upload (multiple posts)
- [ ] Import from CSV
- [ ] Post templates
- [ ] Analytics dashboard
- [ ] A/B test different tier pricing
- [ ] Referral discounts

### Long Term

- [ ] AI-powered title/description suggestions
- [ ] Auto-categorization using ML
- [ ] Smart pricing recommendations
- [ ] Quality score for posts
- [ ] Promoted listings
- [ ] Featured posts

---

## 14. Notes & Considerations

### Post Status Workflow

**Current Backend Logic**:
1. Post created → Status: `DRAFT`
2. Explicit publish call → Status: `ACTIVE`
3. Auto-expire after duration → Status: `EXPIRED`

**Frontend Must**:
- Create post first (always draft)
- Handle payment separately
- Call publish after payment confirmation
- Handle payment failures gracefully

### Tier Pricing

**Current Tiers**:
- Basic: $1 / 3 days
- Standard: $2 / 7 days
- Premium: $3 / 30 days

**Consider**:
- Are these prices final?
- Should prices vary by category?
- Should repeat customers get discounts?
- Free tier for first post?

### Image Storage

**Current Approach**:
- Upload to Azure Blob during form fill
- Store blob paths in database
- Generate SAS URLs for preview
- SAS tokens valid for 1 hour

**Advantages**:
- Preview before submit
- Can reorder/delete before creating post
- Immediate feedback on upload success

**Disadvantages**:
- Orphaned images if user abandons form
- Need cleanup job for unused images

---

## Appendix A: Example API Payloads

### Create Post Request

```json
POST /api/v1/posts
Authorization: Bearer <jwt_token>

{
  "title": "iPhone 13 Pro Max - Mint Condition",
  "categoryId": 1,
  "description": "Barely used iPhone 13 Pro Max in excellent condition. Comes with original box and accessories.",
  "price": 85000,
  "location": "Nairobi, CBD",
  "contactNumber": "0712345678",
  "brand": "Apple",
  "emailAddress": "seller@example.com",
  "deliveryMethod": "BOTH",
  "images": [
    {
      "imageUrl": "posts/123/1704537600_abc123_iphone1.jpg",
      "displayOrder": 0
    },
    {
      "imageUrl": "posts/123/1704537600_def456_iphone2.jpg",
      "displayOrder": 1
    }
  ]
}
```

### Create Post Response

```json
{
  "success": true,
  "data": {
    "id": 42,
    "title": "iPhone 13 Pro Max - Mint Condition",
    "description": "Barely used iPhone 13 Pro Max...",
    "price": 85000,
    "location": "Nairobi, CBD",
    "brand": "Apple",
    "deliveryMethod": "BOTH",
    "contactNumber": "0712345678",
    "emailAddress": "seller@example.com",
    "status": "DRAFT",
    "user": {
      "id": 123,
      "fullName": "John Doe",
      "profilePictureUrl": "users/123/avatar.jpg"
    },
    "category": {
      "id": 1,
      "name": "Electronics",
      "description": "Electronic devices and gadgets"
    },
    "images": [
      {
        "id": 100,
        "url": "https://storage.blob.core.windows.net/...",
        "blobPath": "posts/123/1704537600_abc123_iphone1.jpg",
        "displayOrder": 0,
        "previewUrl": "https://storage.blob.core.windows.net/...?sv=..."
      }
    ],
    "likeCount": 0,
    "viewCount": 0,
    "createdAt": "2026-01-06T10:00:00Z",
    "updatedAt": "2026-01-06T10:00:00Z"
  }
}
```

### Publish Post Request

```json
POST /api/v1/posts/42/publish
Authorization: Bearer <jwt_token>
```

### Publish Post Response

```json
{
  "success": true,
  "data": {
    "id": 42,
    "status": "ACTIVE",
    "publishedAt": "2026-01-06T10:05:00Z",
    "expiresAt": "2026-02-05T10:05:00Z",
    ...
  }
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 6, 2026  
**Author**: GitHub Copilot  
**Review Status**: Pending Implementation  
**Related Documents**: BROWSE_PAGE_API_INTEGRATION_PLAN.md
