# UI-API/Client-Server Mapping Document

**Project:** DEC_L Classifieds Platform  
**Version:** 1.0  
**Last Updated:** December 23, 2025  
**Architecture:** Monorepo (Express.js API + SvelteKit UI)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [API Endpoint Inventory](#3-api-endpoint-inventory)
4. [Client Service Layer Mappings](#4-client-service-layer-mappings)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Data Flow Patterns](#6-data-flow-patterns)
7. [Type Contracts & DTOs](#7-type-contracts--dtos)
8. [Environment Configuration](#8-environment-configuration)
9. [Error Handling](#9-error-handling)
10. [Implementation Gaps](#10-implementation-gaps)
11. [Roadmap & Recommendations](#11-roadmap--recommendations)

---

## 1. Executive Summary

### Project Status

| Component | Status | Completion |
|-----------|--------|------------|
| **Backend API** | ✅ Complete | 100% (35 endpoints) |
| **Frontend Services** | ✅ Complete | 100% (5 service modules) |
| **Frontend Components** | 🟡 Partial | ~60% (26/42 components) |
| **Frontend Pages** | ❌ Minimal | ~10% (routes not implemented) |
| **Shared Types** | ❌ Not Used | 0% (types duplicated) |

### Quick Reference

| Aspect | Backend (API) | Frontend (UI) |
|--------|---------------|---------------|
| **Framework** | Express.js 5.2.1 | SvelteKit 2.5+ (Svelte 5) |
| **Language** | TypeScript 5.6+ | TypeScript 5.6+ |
| **ORM/HTTP** | Prisma | Axios |
| **Auth** | JWT + OAuth | Token Storage + Interceptors |
| **Dev URL** | `http://localhost:3000` | `http://localhost:5173` |
| **API Base** | `/api/v1` | `VITE_API_URL` |

---

## 2. Architecture Overview

### 2.1 System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (SvelteKit)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Pages     │  │ Components  │  │   Stores    │  │   Types     │        │
│  │  /routes/*  │  │  /lib/comp  │  │ /lib/stores │  │ /lib/types  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────────────┘        │
│         │                │                │                                  │
│         └────────────────┼────────────────┘                                  │
│                          ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    SERVICE LAYER                               │          │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │          │
│  │  │  Auth    │ │  Post    │ │  User    │ │  Upload  │         │          │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │         │          │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘         │          │
│  │       └────────────┼────────────┼────────────┘               │          │
│  │                    ▼                                          │          │
│  │            ┌───────────────┐                                  │          │
│  │            │  API Client   │  (Axios + Interceptors)          │          │
│  │            │  api.client.ts│                                  │          │
│  │            └───────┬───────┘                                  │          │
│  └────────────────────┼──────────────────────────────────────────┘          │
└───────────────────────┼─────────────────────────────────────────────────────┘
                        │ HTTP/HTTPS
                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SERVER (Express.js)                             │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                      MIDDLEWARE STACK                          │          │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │          │
│  │  │ CORS   │ │ Helmet │ │  Rate  │ │  Auth  │ │ Valid. │      │          │
│  │  │        │ │        │ │ Limit  │ │  JWT   │ │  Joi   │      │          │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘      │          │
│  └───────────────────────────────────────────────────────────────┘          │
│                          │                                                   │
│  ┌───────────────────────▼───────────────────────────────────────┐          │
│  │                       ROUTE LAYER                              │          │
│  │  /api/v1/auth/* │ /api/v1/users/* │ /api/v1/posts/* │ ...    │          │
│  └───────────────────────┬───────────────────────────────────────┘          │
│                          ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    CONTROLLER LAYER                            │          │
│  │  authController │ userController │ postController │ ...       │          │
│  └───────────────────────┬───────────────────────────────────────┘          │
│                          ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                     SERVICE LAYER                              │          │
│  │  AuthService │ UserService │ PostService │ PaymentService     │          │
│  └───────────────────────┬───────────────────────────────────────┘          │
│                          ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────┐          │
│  │                    DATA ACCESS LAYER                           │          │
│  │               Prisma ORM + PostgreSQL/SQL Server               │          │
│  └───────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 File Structure Reference

```
apps/
├── api/                          # Backend API
│   ├── src/
│   │   ├── routes/               # Express route definitions
│   │   ├── controllers/          # Request handlers
│   │   ├── services/             # Business logic
│   │   ├── dal/                  # Data Access Layer (Prisma)
│   │   ├── middleware/           # Auth, validation, rate limiting
│   │   ├── types/                # TypeScript DTOs
│   │   └── validation/           # Joi schemas
│   └── prisma/                   # Database schema
│
└── web/                          # Frontend SvelteKit
    └── src/
        ├── routes/               # SvelteKit pages
        └── lib/
            ├── services/         # API client wrappers
            ├── components/       # Svelte components
            ├── types/            # TypeScript types
            ├── stores/           # Svelte stores (TBD)
            └── utils/            # Utilities
```

---

## 3. API Endpoint Inventory

### 3.1 Authentication Endpoints

**Base Path:** `/api/v1/auth`  
**Route File:** `apps/api/src/routes/auth.routes.ts`  
**Controller:** `apps/api/src/controllers/auth.controller.ts`  
**Service:** `apps/api/src/services/auth.service.ts`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/auth/register` | Public | 5/15min | Register new user |
| `POST` | `/auth/login` | Public | 5/15min | Email/password login |
| `POST` | `/auth/refresh` | Public | 5/15min | Refresh access token |
| `POST` | `/auth/oauth` | Public | 5/15min | OAuth login (Google/MS/FB) |
| `POST` | `/auth/logout` | Private | 5/15min | Logout and invalidate tokens |

**Request/Response Contracts:**

```typescript
// POST /auth/register
Request: {
  emailAddress: string;      // Valid email format
  password: string;          // Min 8 chars, uppercase, lowercase, number
  firstName: string;         // 2-50 chars
  lastName: string;          // 2-50 chars
  phoneNumber?: string;      // Optional, E.164 format
}
Response: {
  success: true;
  data: {
    user: UserResponseDTO;
    tokens: { accessToken: string; refreshToken: string; }
  }
}

// POST /auth/login
Request: {
  emailAddress: string;
  password: string;
}
Response: {
  success: true;
  data: {
    user: UserResponseDTO;
    tokens: { accessToken: string; refreshToken: string; }
  }
}

// POST /auth/refresh
Request: {
  refreshToken: string;
}
Response: {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
  }
}

// POST /auth/oauth
Request: {
  provider: 'google' | 'microsoft' | 'facebook';
  accessToken: string;       // OAuth provider token
  idToken?: string;          // For Google
}
Response: {
  success: true;
  data: {
    user: UserResponseDTO;
    tokens: { accessToken: string; refreshToken: string; }
    isNewUser: boolean;
  }
}
```

---

### 3.2 User Endpoints

**Base Path:** `/api/v1/users`  
**Route File:** `apps/api/src/routes/user.routes.ts`  
**Controller:** `apps/api/src/controllers/user.controller.ts`  
**Service:** `apps/api/src/services/user.service.ts`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/users/profile` | Private | 100/min | Get current user profile |
| `PUT` | `/users/profile` | Private | 20/min | Update profile |
| `POST` | `/users/change-password` | Private | 20/min | Change password |
| `DELETE` | `/users/account` | Private | 20/min | Delete account |
| `GET` | `/users/posts-summary` | Private | 100/min | Get posts count summary |
| `POST` | `/users/request-password-reset` | Public | 20/min | Request password reset |
| `POST` | `/users/reset-password` | Public | 20/min | Reset password with token |
| `POST` | `/users/verify-email` | Public | 20/min | Verify email with token |
| `POST` | `/users/verify-phone` | Private | 20/min | Verify phone with code |

**Request/Response Contracts:**

```typescript
// GET /users/profile
Response: {
  success: true;
  data: UserResponseDTO;
}

// PUT /users/profile
Request: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
}
Response: {
  success: true;
  data: UserResponseDTO;
}

// POST /users/change-password
Request: {
  currentPassword: string;
  newPassword: string;
}
Response: {
  success: true;
  message: "Password changed successfully";
}

// GET /users/posts-summary
Response: {
  success: true;
  data: {
    total: number;
    active: number;
    pending: number;
    expired: number;
    draft: number;
  }
}
```

---

### 3.3 Post Endpoints

**Base Path:** `/api/v1/posts`  
**Route File:** `apps/api/src/routes/post.routes.ts`  
**Controller:** `apps/api/src/controllers/post.controller.ts`  
**Service:** `apps/api/src/services/post.service.ts`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/posts` | Private | 20/min | Create new post |
| `GET` | `/posts/feed` | Optional | 100/min | Get paginated feed |
| `GET` | `/posts/search` | Public | 100/min | Search posts with filters |
| `GET` | `/posts/user/:userId` | Public | 100/min | Get posts by user |
| `GET` | `/posts/:id` | Optional | 100/min | Get single post |
| `PUT` | `/posts/:id` | Private (Owner) | 20/min | Update post |
| `DELETE` | `/posts/:id` | Private (Owner) | 20/min | Delete post |
| `POST` | `/posts/:id/like` | Private | 20/min | Toggle like on post |
| `POST` | `/posts/:id/schedule` | Private (Owner) | 20/min | Schedule post publication |
| `POST` | `/posts/:id/publish` | Private (Owner) | 20/min | Publish draft immediately |

**Request/Response Contracts:**

```typescript
// POST /posts
Request: {
  title: string;              // 5-100 chars
  description: string;        // 20-5000 chars
  price: number;              // >= 0
  categoryId: string;         // UUID
  images?: string[];          // Array of image URLs
  location?: string;
  condition?: 'new' | 'like_new' | 'good' | 'fair' | 'poor';
  isDraft?: boolean;
}
Response: {
  success: true;
  data: PostResponseDTO;
}

// GET /posts/feed
Query Parameters: {
  page?: number;              // Default: 1
  limit?: number;             // Default: 20, Max: 50
  categoryId?: string;
  sortBy?: 'createdAt' | 'price' | 'views';
  sortOrder?: 'asc' | 'desc';
}
Response: {
  success: true;
  data: PostResponseDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
}

// GET /posts/search
Query Parameters: {
  q: string;                  // Search query
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  location?: string;
  page?: number;
  limit?: number;
}
Response: {
  success: true;
  data: PostResponseDTO[];
  pagination: PaginationDTO;
}

// POST /posts/:id/like
Response: {
  success: true;
  data: {
    liked: boolean;           // Current like state
    likesCount: number;       // Updated count
  }
}
```

---

### 3.4 Category Endpoints

**Base Path:** `/api/v1/categories`  
**Route File:** `apps/api/src/routes/category.routes.ts`  
**Controller:** `apps/api/src/controllers/category.controller.ts`  
**Service:** `apps/api/src/services/category.service.ts`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `GET` | `/categories` | Public | 100/min | Get all categories |
| `GET` | `/categories/:id` | Public | 100/min | Get category by ID |
| `POST` | `/categories` | Admin | 20/min | Create category |
| `PUT` | `/categories/:id` | Admin | 20/min | Update category |
| `DELETE` | `/categories/:id` | Admin | 20/min | Delete category |

**Request/Response Contracts:**

```typescript
// GET /categories
Response: {
  success: true;
  data: CategoryResponseDTO[];
}

// CategoryResponseDTO
{
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  parentId?: string;
  children?: CategoryResponseDTO[];
  postsCount: number;
  createdAt: string;
}
```

---

### 3.5 Payment Endpoints

**Base Path:** `/api/v1/payments`  
**Route File:** `apps/api/src/routes/payment.routes.ts`  
**Controller:** `apps/api/src/controllers/payment.controller.ts`  
**Service:** `apps/api/src/services/payment.service.ts`

| Method | Endpoint | Auth | Rate Limit | Description |
|--------|----------|------|------------|-------------|
| `POST` | `/payments` | Private | 20/min | Create payment intent |
| `POST` | `/payments/:id/confirm` | Private | 20/min | Confirm payment |
| `POST` | `/payments/:id/cancel` | Private | 20/min | Cancel payment |
| `GET` | `/payments/:id` | Private (Owner) | 100/min | Get payment details |
| `GET` | `/payments/user/history` | Private | 100/min | Get payment history |
| `GET` | `/payments/post/:postId` | Private (Owner) | 100/min | Get post payments |

**Request/Response Contracts:**

```typescript
// POST /payments
Request: {
  postId: string;
  tier: 'basic' | 'featured' | 'premium';
  paymentMethod: 'stripe' | 'mtn_momo' | 'airtel_money';
  phoneNumber?: string;       // For mobile money
}
Response: {
  success: true;
  data: {
    paymentId: string;
    clientSecret?: string;    // For Stripe
    paymentUrl?: string;      // For mobile money
    amount: number;
    currency: string;
  }
}
```

---

## 4. Client Service Layer Mappings

### 4.1 API Client Configuration

**File:** `apps/web/src/lib/services/api.client.ts`

```typescript
// Base Configuration
const apiClient = axios.create({
  baseURL: config.api.baseUrl,      // http://localhost:3000/api/v1
  timeout: config.api.timeout,       // 30000ms
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
// - Attaches Bearer token from localStorage
// - Logs requests in development mode

// Response Interceptor
// - Handles 401 with automatic token refresh
// - Queues failed requests during refresh
// - Retries with exponential backoff (3 attempts)
// - Handles rate limiting (429)
// - Global error transformation
```

### 4.2 Auth Service Mapping

**File:** `apps/web/src/lib/services/auth.service.ts`

| Client Function | API Endpoint | Purpose |
|-----------------|--------------|---------|
| `register(data)` | `POST /auth/register` | User registration |
| `login(data)` | `POST /auth/login` | Email/password login |
| `loginWithOAuth(data)` | `POST /auth/oauth` | OAuth provider login |
| `refreshAccessToken()` | `POST /auth/refresh` | Token refresh |
| `logout()` | `POST /auth/logout` | Logout |
| `requestPasswordReset(email)` | `POST /users/request-password-reset` | Password reset request |
| `resetPassword(data)` | `POST /users/reset-password` | Password reset |
| `verifyEmail(token)` | `POST /users/verify-email` | Email verification |
| `verifyPhone(code)` | `POST /users/verify-phone` | Phone verification |

**Helper Functions (Client-Only):**
- `saveAuthData(tokens, user)` - Save to localStorage
- `clearAuthData()` - Clear localStorage
- `getStoredTokens()` - Retrieve tokens
- `isAuthenticated()` - Check auth status
- `getCurrentUser()` - Get cached user

### 4.3 Post Service Mapping

**File:** `apps/web/src/lib/services/post.service.ts`

| Client Function | API Endpoint | Purpose |
|-----------------|--------------|---------|
| `createPost(data)` | `POST /posts` | Create new post |
| `getPostById(id)` | `GET /posts/:id` | Get single post |
| `updatePost(id, data)` | `PUT /posts/:id` | Update post |
| `deletePost(id)` | `DELETE /posts/:id` | Delete post |
| `getFeed(params)` | `GET /posts/feed` | Get paginated feed |
| `searchPosts(params)` | `GET /posts/search` | Search posts |
| `getPostsByCategory(id, params)` | `GET /posts/feed?categoryId=X` | Category posts |
| `getUserPosts(userId, params)` | `GET /posts/user/:userId` | User's posts |
| `getMyPosts(params)` | `GET /posts/my-posts` | Current user's posts |
| `likePost(id)` | `POST /posts/:id/like` | Like post |
| `unlikePost(id)` | `DELETE /posts/:id/like` | Unlike post |
| `schedulePost(id, date)` | `POST /posts/:id/schedule` | Schedule publication |
| `publishPost(id)` | `POST /posts/:id/publish` | Publish immediately |

### 4.4 User Service Mapping

**File:** `apps/web/src/lib/services/user.service.ts`

| Client Function | API Endpoint | Purpose |
|-----------------|--------------|---------|
| `getProfile()` | `GET /users/profile` | Get current user |
| `updateProfile(data)` | `PUT /users/profile` | Update profile |
| `getPublicProfile(userId)` | `GET /users/:userId` | Get public profile |
| `changePassword(data)` | `POST /users/change-password` | Change password |
| `deleteAccount()` | `DELETE /users/account` | Delete account |
| `getPostsSummary()` | `GET /users/posts-summary` | Posts count summary |
| `updateAvatar(url)` | `PUT /users/profile` | Update avatar only |

### 4.5 Upload Service Mapping

**File:** `apps/web/src/lib/services/upload.service.ts`

| Client Function | API Endpoint | Purpose |
|-----------------|--------------|---------|
| `uploadImage(file, options)` | `POST /upload/image` | Upload single image |
| `uploadImages(files, options)` | `POST /upload/images` | Upload multiple images |
| `uploadBase64Image(data)` | `POST /upload/base64` | Upload from base64 |
| `uploadAvatar(file)` | `POST /upload/avatar` | Upload avatar |

**⚠️ Note:** Upload API endpoints are NOT YET IMPLEMENTED on the backend.

---

## 5. Authentication & Authorization

### 5.1 JWT Token Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │    API      │     │   Database  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │  POST /auth/login │                   │
       │  {email, password}│                   │
       │──────────────────>│                   │
       │                   │  Validate User    │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │                   │                   │
       │                   │  Generate JWT     │
       │                   │  (access + refresh)
       │                   │                   │
       │  { tokens, user } │                   │
       │<──────────────────│                   │
       │                   │                   │
       │  Store in         │                   │
       │  localStorage     │                   │
       │                   │                   │
       │  GET /posts/feed  │                   │
       │  Authorization:   │                   │
       │  Bearer <token>   │                   │
       │──────────────────>│                   │
       │                   │  Verify JWT       │
       │                   │  (auth.middleware)│
       │                   │                   │
       │                   │  Query Posts      │
       │                   │──────────────────>│
       │                   │<──────────────────│
       │  { posts }        │                   │
       │<──────────────────│                   │
```

### 5.2 Token Refresh Flow

```typescript
// Automatic token refresh in api.client.ts

// 1. API returns 401 Unauthorized
// 2. Interceptor catches error
// 3. Check if refresh already in progress
//    - If yes: queue this request
//    - If no: start refresh process
// 4. Call POST /auth/refresh with refreshToken
// 5. On success:
//    - Update tokens in localStorage
//    - Retry all queued requests with new token
// 6. On failure:
//    - Clear auth data
//    - Redirect to login
```

### 5.3 Token Storage

**Location:** Browser localStorage

| Key | Value | Purpose |
|-----|-------|---------|
| `decl_access_token` | JWT string | API authentication |
| `decl_refresh_token` | JWT string | Token refresh |
| `decl_user` | JSON string | Cached user data |

### 5.4 Middleware Types

**File:** `apps/api/src/middleware/auth.middleware.ts`

| Middleware | Usage | Behavior |
|------------|-------|----------|
| `authenticateToken` | Private routes | Requires valid JWT, rejects 401 if missing/invalid |
| `optionalAuth` | Public routes with auth features | Attaches user if token valid, continues if absent |
| `requireAdmin` | Admin routes | Checks user role after authentication |

---

## 6. Data Flow Patterns

### 6.1 Feed Loading (Infinite Scroll)

```typescript
// UI Component (Not yet implemented)
let posts = $state([]);
let pagination = $state({ page: 1, hasNext: true });
let loading = $state(false);

async function loadMore() {
  if (loading || !pagination.hasNext) return;
  
  loading = true;
  const result = await postService.getFeed({
    page: pagination.page,
    limit: 20,
  });
  
  if (result.success) {
    posts = [...posts, ...result.data];
    pagination = result.pagination;
  }
  loading = false;
}

// Trigger on scroll threshold (200px from bottom)
```

### 6.2 Post Creation with Images

```typescript
// Step 1: Upload images
const uploadResult = await uploadService.uploadImages(files, {
  onProgress: (progress) => {
    uploadProgress = progress.percentage;
  }
});

// Step 2: Create post with image URLs
const postResult = await postService.createPost({
  title,
  description,
  price,
  categoryId,
  images: uploadResult.data.map(img => img.url),
});

// Step 3: Handle result
if (postResult.success) {
  goto(`/posts/${postResult.data.id}`);
} else {
  showError(postResult.error.message);
}
```

### 6.3 Like Toggle Pattern

```typescript
// Optimistic update pattern
async function toggleLike(postId: string) {
  // 1. Optimistically update UI
  post.isLiked = !post.isLiked;
  post.likesCount += post.isLiked ? 1 : -1;
  
  // 2. Make API call
  const result = post.isLiked 
    ? await postService.likePost(postId)
    : await postService.unlikePost(postId);
  
  // 3. Revert if failed
  if (!result.success) {
    post.isLiked = !post.isLiked;
    post.likesCount += post.isLiked ? 1 : -1;
    showError(result.error.message);
  }
}
```

---

## 7. Type Contracts & DTOs

### 7.1 Current Type Locations

| Location | Types | Status |
|----------|-------|--------|
| `apps/api/src/types/` | Backend DTOs | ✅ Complete |
| `apps/web/src/lib/types/` | Frontend types | ✅ Complete |
| `packages/shared/src/types/` | Shared types | ❌ Empty |

### 7.2 Key DTOs

#### UserResponseDTO
```typescript
interface UserResponseDTO {
  id: string;
  emailAddress: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}
```

#### PostResponseDTO
```typescript
interface PostResponseDTO {
  id: string;
  title: string;
  description: string;
  price: number;
  formattedPrice: string;
  images: string[];
  location?: string;
  condition?: PostCondition;
  status: PostStatus;
  viewsCount: number;
  likesCount: number;
  isLiked?: boolean;         // Only if user authenticated
  category: CategoryResponseDTO;
  author: UserResponseDTO;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  publishedAt?: string;
}

type PostStatus = 'draft' | 'pending' | 'active' | 'expired' | 'rejected';
type PostCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';
```

#### PaginatedResponse
```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
```

#### ApiError
```typescript
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, unknown>;
  };
}
```

---

## 8. Environment Configuration

### 8.1 Backend Environment

**File:** `apps/api/.env`

```env
# Database
DATABASE_URL=postgresql://admin:admin@localhost:5432/dec_l?schema=public

# JWT Configuration
JWT_SECRET=your-secret-key-change-this-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth Providers
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1
CORS_ORIGIN=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 8.2 Frontend Environment

**File:** `apps/web/.env` (create from `.env.example`)

```env
# API Configuration
VITE_API_URL=http://localhost:3000/api/v1
VITE_API_TIMEOUT=30000
VITE_API_RETRY_ATTEMPTS=3
VITE_API_RETRY_DELAY=1000

# OAuth Configuration
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_MICROSOFT_CLIENT_ID=your-microsoft-client-id
VITE_FACEBOOK_APP_ID=your-facebook-app-id
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback

# App Configuration
VITE_APP_NAME=DEC_L
VITE_APP_URL=http://localhost:5173
VITE_CURRENCY=UGX

# Upload Configuration
VITE_MAX_UPLOAD_SIZE=5242880
VITE_MAX_IMAGES_PER_POST=5

# Feed Configuration
VITE_POSTS_PER_PAGE=20
VITE_INFINITE_SCROLL_THRESHOLD=200
```

---

## 9. Error Handling

### 9.1 Error Codes

| Code | HTTP | Description | Client Action |
|------|------|-------------|---------------|
| `VALIDATION_ERROR` | 400 | Request validation failed | Show field errors |
| `UNAUTHORIZED` | 401 | Invalid/expired token | Redirect to login |
| `FORBIDDEN` | 403 | Insufficient permissions | Show access denied |
| `NOT_FOUND` | 404 | Resource not found | Show 404 page |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Show retry message |
| `INTERNAL_ERROR` | 500 | Server error | Show generic error |

### 9.2 Error Handling Utilities

**File:** `apps/web/src/lib/utils/error-handler.ts`

```typescript
// Parse API error response
function handleApiError(error: unknown): ClientError {
  if (isAxiosError(error)) {
    return {
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.error?.message || 'An error occurred',
      statusCode: error.response?.status || 500,
    };
  }
  return { code: 'NETWORK_ERROR', message: 'Network error', statusCode: 0 };
}

// Check error types
function isAuthError(error: ClientError): boolean {
  return error.statusCode === 401 || error.statusCode === 403;
}

function isNetworkError(error: ClientError): boolean {
  return error.statusCode === 0;
}
```

---

## 10. Implementation Gaps

### 10.1 Critical Gaps

| Gap | Impact | Priority | Est. Effort |
|-----|--------|----------|-------------|
| **Upload API Endpoints** | Image upload fails | 🔴 Critical | 1-2 days |
| **Authentication Pages** | Users cannot sign in | 🔴 Critical | 2-3 days |
| **Feed Page** | Cannot browse posts | 🔴 Critical | 3-4 days |
| **Post Management Pages** | Cannot create/edit posts | 🔴 Critical | 4-5 days |

### 10.2 Missing Backend Components

```
apps/api/src/
├── routes/
│   └── upload.routes.ts          ❌ Not implemented
├── controllers/
│   └── upload.controller.ts      ❌ Not implemented
├── services/
│   └── upload.service.ts         ❌ Not implemented
└── middleware/
    └── upload.middleware.ts      ❌ Not implemented (multer)
```

### 10.3 Missing Frontend Pages

```
apps/web/src/routes/
├── (auth)/
│   ├── login/
│   │   └── +page.svelte          ❌ Not implemented
│   ├── register/
│   │   └── +page.svelte          ❌ Not implemented
│   └── callback/
│       └── +page.ts              ❌ Not implemented (OAuth)
├── posts/
│   ├── +page.svelte              ❌ Not implemented (feed)
│   ├── [id]/
│   │   └── +page.svelte          ❌ Not implemented (detail)
│   ├── create/
│   │   └── +page.svelte          ❌ Not implemented
│   └── edit/[id]/
│       └── +page.svelte          ❌ Not implemented
├── profile/
│   ├── +page.svelte              ❌ Not implemented
│   └── edit/
│       └── +page.svelte          ❌ Not implemented
└── search/
    └── +page.svelte              ❌ Not implemented
```

### 10.4 Missing State Management

```
apps/web/src/lib/stores/
├── auth.ts                       ❌ Not implemented
├── posts.ts                      ❌ Not implemented
├── user.ts                       ❌ Not implemented
└── theme.ts                      ❌ Not implemented
```

### 10.5 Type System Gap

**Problem:** Types are duplicated between API and UI, creating sync risk.

**Solution:** Move shared types to `packages/shared/`:

```typescript
// packages/shared/src/types/index.ts
export * from './user.types';
export * from './post.types';
export * from './auth.types';
export * from './api.types';

// Usage in both API and UI:
import type { UserResponseDTO } from '@dec_l/shared/types';
```

---

## 11. Roadmap & Recommendations

### 11.1 MVP Implementation Order

```
Week 1:
├── Day 1-2: Upload API endpoints
├── Day 3-4: Auth pages (login, register)
└── Day 5: OAuth callback handler

Week 2:
├── Day 1-2: Auth store + feed page
├── Day 3-4: Post detail page
└── Day 5: Post creation form

Week 3:
├── Day 1-2: Post edit + delete
├── Day 3: Profile pages
├── Day 4: Search page
└── Day 5: Testing & fixes
```

### 11.2 Recommended Next Steps

1. **Implement Upload Endpoints** (Blocker)
   - Add multer middleware for file handling
   - Create upload routes, controller, service
   - Support local storage initially (cloud later)

2. **Create Auth Pages**
   - Login form with validation
   - Register form with validation
   - OAuth buttons integration
   - Callback handler for OAuth

3. **Implement Svelte Stores**
   - Auth store with user state
   - Posts store with feed cache
   - Use Svelte 5 runes ($state, $derived)

4. **Build Feed Page**
   - PostCard component
   - Infinite scroll implementation
   - Category filtering

5. **Consolidate Types**
   - Move shared types to packages/shared
   - Update imports in both apps
   - Add type validation with Zod

---

## Appendix A: Quick Reference Tables

### A.1 Complete Endpoint-Service Mapping

| API Endpoint | HTTP | Client Service | Client Function |
|--------------|------|----------------|-----------------|
| `/auth/register` | POST | authService | `register()` |
| `/auth/login` | POST | authService | `login()` |
| `/auth/oauth` | POST | authService | `loginWithOAuth()` |
| `/auth/refresh` | POST | authService | `refreshAccessToken()` |
| `/auth/logout` | POST | authService | `logout()` |
| `/users/profile` | GET | userService | `getProfile()` |
| `/users/profile` | PUT | userService | `updateProfile()` |
| `/users/change-password` | POST | userService | `changePassword()` |
| `/users/account` | DELETE | userService | `deleteAccount()` |
| `/users/posts-summary` | GET | userService | `getPostsSummary()` |
| `/users/request-password-reset` | POST | authService | `requestPasswordReset()` |
| `/users/reset-password` | POST | authService | `resetPassword()` |
| `/users/verify-email` | POST | authService | `verifyEmail()` |
| `/users/verify-phone` | POST | authService | `verifyPhone()` |
| `/posts` | POST | postService | `createPost()` |
| `/posts/feed` | GET | postService | `getFeed()` |
| `/posts/search` | GET | postService | `searchPosts()` |
| `/posts/:id` | GET | postService | `getPostById()` |
| `/posts/:id` | PUT | postService | `updatePost()` |
| `/posts/:id` | DELETE | postService | `deletePost()` |
| `/posts/:id/like` | POST | postService | `likePost()` |
| `/posts/:id/like` | DELETE | postService | `unlikePost()` |
| `/posts/:id/schedule` | POST | postService | `schedulePost()` |
| `/posts/:id/publish` | POST | postService | `publishPost()` |
| `/posts/user/:userId` | GET | postService | `getUserPosts()` |
| `/categories` | GET | categoryService | `getCategories()` |
| `/categories/:id` | GET | categoryService | `getCategoryById()` |
| `/payments` | POST | paymentService | `createPayment()` |
| `/payments/:id/confirm` | POST | paymentService | `confirmPayment()` |
| `/payments/:id/cancel` | POST | paymentService | `cancelPayment()` |
| `/payments/:id` | GET | paymentService | `getPaymentById()` |
| `/payments/user/history` | GET | paymentService | `getPaymentHistory()` |

### A.2 Rate Limits Summary

| Route Pattern | Limit | Window |
|---------------|-------|--------|
| `/auth/*` | 5 requests | 15 minutes |
| `POST/PUT/DELETE` | 20 requests | 1 minute |
| `GET` | 100 requests | 1 minute |

---

*Document maintained by: Development Team*  
*Next Review: January 2026*
