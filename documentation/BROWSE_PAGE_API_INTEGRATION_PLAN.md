# Browse Page API Integration Plan

**Date**: January 6, 2026  
**Status**: Planning Phase  
**Objective**: Wire the browse page Svelte front-end to the API backend with infinite scroll functionality

---

## Executive Summary

The browse page currently displays hardcoded mock data and needs integration with the existing API infrastructure. All backend services, stores, and utilities are already implemented—this task focuses on connecting the front-end to leverage them and implementing infinite scroll functionality.

**Current State**: Static mock data implementation  
**Target State**: Dynamic API-driven feed with infinite scroll  
**Complexity**: Low to Medium (infrastructure exists, needs wiring)

---

## 1. Current State Analysis

### 1.1 Browse Page Front-End

**Location**: `apps/web/src/routes/(dashboard)/browse/+page.svelte`

**Current Implementation**:
- ❌ Uses hardcoded mock data (5 static posts)
- ❌ No API integration
- ❌ No pagination or infinite scroll
- ❌ No loading/error states
- ❌ Type mismatch with API types

**Component Structure**:
```svelte
<script lang="ts">
  import PostCard, { type Post } from '$lib/components/cards/PostCard.svelte';
  
  const mockPosts: Post[] = [/* 5 hardcoded posts */];
  let posts = mockPosts;
  let activeTab = 'home';
</script>
```

### 1.2 API Backend Status

**Endpoint**: `GET /api/posts/feed`

**Implementation Status**: ✅ FULLY FUNCTIONAL

**Features**:
- ✅ Pagination support (page, limit)
- ✅ Category filtering (categoryId)
- ✅ User filtering (userId)
- ✅ Optional authentication (`optionalAuth` middleware)
- ✅ Rate limiting
- ✅ Validation

**Query Parameters**:
```typescript
interface FeedOptionsDTO {
  page?: number;      // Default: 1
  limit?: number;     // Default: 20
  categoryId?: number;
  userId?: number;
}
```

**Response Structure**:
```typescript
interface PaginatedResponse<PostResponseDTO> {
  success: boolean;
  data: PostResponseDTO[];
  pagination: {
    total: number;    // Total posts
    page: number;     // Current page
    limit: number;    // Posts per page
    pages: number;    // Total pages
  };
  error?: ApiError;
}
```

### 1.3 Supporting Infrastructure

**All components are IMPLEMENTED and READY**:

✅ **API Client** (`apps/web/src/lib/api/client.ts`)
- Axios instance with base URL configuration
- Automatic token injection
- Token refresh on 401 errors
- Request/response interceptors
- Error handling and retry logic

✅ **Post Service** (`apps/web/src/lib/services/post.service.ts`)
- `getFeed(options)` - Fetch feed with pagination
- `loadMoreFeedPosts(currentPage)` - Infinite scroll helper
- Automatic store updates
- Caching mechanism

✅ **Post Store** (`apps/web/src/lib/stores/post.store.ts`)
- `feedPosts` - Array of posts
- `feedLoading` - Loading state
- `feedError` - Error state
- `feedHasMore` - Pagination flag
- `feedPage` - Current page
- Methods: `setFeedPosts()`, `appendFeedPosts()`, `resetFeed()`

✅ **Infinite Scroll Utilities** (`apps/web/src/lib/services/post.service.ts`)
- `setupInfiniteScroll()` - Generic intersection observer
- Configurable threshold and root margin

✅ **Reference Implementation** (`apps/web/src/routes/(dashboard)/my-listings/+page.svelte`)
- Working example of infinite scroll pattern
- Can be used as template

---

## 2. Type System Issues

### 2.1 Current Problem

**PostCard Component** uses its own local `Post` interface instead of `PostResponseDTO` from the API.

**Type Comparison**:

| Field | PostCard.Post | PostResponseDTO | Issue |
|-------|---------------|-----------------|-------|
| `id` | `string` | `number` | ❌ Type mismatch |
| `images` | `string[]` | `PostImageDTO[]` | ❌ Structure mismatch |
| `user.id` | `string` | `number` | ❌ Type mismatch |
| `user.name` | `string` | - (uses `fullName`) | ❌ Field mismatch |
| `user.avatar` | `string?` | - (uses `profilePictureUrl`) | ❌ Field mismatch |
| `category` | ❌ Missing | `CategoryDTO` | ❌ Missing field |
| `brand` | ❌ Missing | `string?` | ❌ Missing field |

### 2.2 PostImageDTO Structure

```typescript
interface PostImageDTO {
  id: number;
  url: string;
  blobPath?: string;
  displayOrder: number;
  previewUrl?: string;
}
```

### 2.3 Solution Options

**Option A: Update PostCard Component** (RECOMMENDED)
- Modify PostCard to accept `PostResponseDTO`
- Map fields internally: `user.fullName` → display name
- Handle `PostImageDTO[]` → extract URLs
- ✅ Cleaner, maintains type safety
- ✅ One source of truth
- ⚠️ May affect other usages of PostCard

**Option B: Create Adapter Function**
- Transform `PostResponseDTO` → `Post` in browse page
- Keep PostCard unchanged
- ✅ Preserves component interface
- ❌ Adds indirection and boilerplate
- ❌ Duplicate type definitions

**RECOMMENDATION**: Use Option A - update PostCard component

---

## 3. Implementation Plan

### Phase 1: Fix Type Compatibility

**File**: `apps/web/src/lib/components/cards/PostCard.svelte`

**Changes**:
1. Remove local `Post` interface
2. Import `PostResponseDTO` from shared types
3. Update component props to accept `PostResponseDTO`
4. Map fields in component logic:
   ```typescript
   const userName = post.user.fullName;
   const userAvatar = post.user.profilePictureUrl;
   const imageUrls = post.images.map(img => img.url);
   ```
5. Update any derived values to use correct field names

**Testing**: Verify PostCard renders correctly with API data structure

---

### Phase 2: Initialize Feed Data

**File**: `apps/web/src/routes/(dashboard)/browse/+page.svelte`

**Changes**:

1. **Import dependencies**:
```typescript
import { onMount } from 'svelte';
import { postStore } from '$lib/stores/post.store';
import { getFeed } from '$lib/services/post.service';
```

2. **Replace mock data with store**:
```typescript
// Remove: const mockPosts: Post[] = [...];
// Remove: let posts = mockPosts;

// Add reactive store values
const feedPosts = $derived($postStore.feedPosts);
const isLoading = $derived($postStore.feedLoading);
const hasMore = $derived($postStore.feedHasMore);
const error = $derived($postStore.feedError);
```

3. **Load initial data**:
```typescript
onMount(async () => {
  // Reset feed state
  postStore.resetFeed();
  
  // Load first page
  await getFeed({ page: 1, limit: 20 });
});
```

4. **Update template to use store**:
```svelte
{#if isLoading && feedPosts.length === 0}
  <!-- Loading skeleton -->
{:else if error}
  <!-- Error state -->
{:else if feedPosts.length === 0}
  <!-- Empty state -->
{:else}
  {#each feedPosts as post (post.id)}
    <PostCard {post} variant="feed" />
  {/each}
{/if}
```

---

### Phase 3: Implement Infinite Scroll

**File**: `apps/web/src/routes/(dashboard)/browse/+page.svelte`

**Implementation Pattern** (based on my-listings reference):

1. **Add state variables**:
```typescript
let currentPage = $state(1);
let loadMoreTrigger = $state<HTMLElement | undefined>();
let observer: IntersectionObserver;
```

2. **Setup intersection observer**:
```typescript
onMount(() => {
  // ... initial load ...
  
  // Setup infinite scroll observer
  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore) {
        loadMore();
      }
    },
    { 
      rootMargin: '100px',  // Trigger 100px before element
      threshold: 0.1 
    }
  );

  if (loadMoreTrigger) {
    observer.observe(loadMoreTrigger);
  }

  // Cleanup
  return () => {
    observer?.disconnect();
  };
});
```

3. **Load more function**:
```typescript
async function loadMore() {
  currentPage += 1;
  await getFeed({ 
    page: currentPage, 
    limit: 20 
  });
}
```

4. **Add trigger element to template**:
```svelte
{#each feedPosts as post (post.id)}
  <PostCard {post} variant="feed" />
{/each}

{#if hasMore}
  <div bind:this={loadMoreTrigger} class="flex justify-center items-center py-8">
    {#if isLoading}
      <div class="flex items-center gap-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span>Loading more posts...</span>
      </div>
    {/if}
  </div>
{/if}
```

**Configuration**: Uses environment variables from `apps/web/src/lib/config/app.config.ts`:
- `VITE_POSTS_PER_PAGE`: Posts per page (default: 20)
- `VITE_INFINITE_SCROLL_THRESHOLD`: Scroll threshold in px (default: 200)

---

### Phase 4: Add Loading and Error States

**File**: `apps/web/src/routes/(dashboard)/browse/+page.svelte`

**Templates to Add**:

1. **Loading Skeleton** (initial load):
```svelte
{#if isLoading && feedPosts.length === 0}
  <div class="space-y-4">
    {#each Array(3) as _}
      <div class="animate-pulse bg-base-200 rounded-lg h-64"></div>
    {/each}
  </div>
{/if}
```

2. **Error State**:
```svelte
{#if error}
  <div class="flex flex-col items-center justify-center py-12">
    <div class="text-error text-xl mb-4">Failed to load posts</div>
    <p class="text-base-content/60 mb-4">{error}</p>
    <button 
      class="btn btn-primary"
      onclick={() => {
        postStore.resetFeed();
        getFeed({ page: 1 });
      }}
    >
      Try Again
    </button>
  </div>
{/if}
```

3. **Empty State**:
```svelte
{#if !isLoading && !error && feedPosts.length === 0}
  <div class="flex flex-col items-center justify-center py-12">
    <div class="text-2xl mb-4">No posts found</div>
    <p class="text-base-content/60">Check back later for new listings</p>
  </div>
{/if}
```

---

### Phase 5: Optional Enhancements

#### 5.1 Category Filtering

**If browse page should support category filters**:

1. Add category state:
```typescript
let selectedCategoryId = $state<number | undefined>(undefined);
```

2. Update feed fetch:
```typescript
await getFeed({ 
  page: currentPage, 
  limit: 20,
  categoryId: selectedCategoryId 
});
```

3. Add category selector UI (use existing CategoryDTO from API)

#### 5.2 Like Functionality

**Wire PostCard like button to API**:

1. Import like functions:
```typescript
import { likePost, unlikePost } from '$lib/services/post.service';
```

2. Pass like handlers to PostCard:
```svelte
<PostCard 
  {post} 
  variant="feed"
  onLike={() => post.isLiked ? unlikePost(post.id) : likePost(post.id)}
/>
```

3. Update PostCard to emit like events and call handlers

**Note**: Service includes optimistic updates automatically

#### 5.3 Search Integration

**If search should be implemented**:

1. Import search service:
```typescript
import { searchPosts } from '$lib/services/post.service';
```

2. Add SearchBar component (already exists)
3. Handle search submission
4. Switch between `getFeed()` and `searchPosts()` based on search state

---

## 4. Testing Plan

### 4.1 Unit Testing

**PostCard Component**:
- [ ] Renders with `PostResponseDTO` data
- [ ] Correctly maps `user.fullName` → display name
- [ ] Correctly maps `user.profilePictureUrl` → avatar
- [ ] Handles `PostImageDTO[]` → extracts URLs
- [ ] Displays category if provided

**Browse Page**:
- [ ] Loads initial feed on mount
- [ ] Displays loading state during fetch
- [ ] Handles empty feed state
- [ ] Handles error state with retry

### 4.2 Integration Testing

**Infinite Scroll**:
- [ ] Loads more posts when scrolling to bottom
- [ ] Doesn't trigger multiple loads simultaneously
- [ ] Stops loading when no more posts (`hasMore = false`)
- [ ] Appends new posts to existing list

**Store Integration**:
- [ ] Store updates correctly on fetch
- [ ] `feedPosts` contains merged data
- [ ] `feedHasMore` reflects pagination state
- [ ] Error state propagates to UI

### 4.3 E2E Testing

**User Flow**:
- [ ] User navigates to browse page
- [ ] Sees loading state initially
- [ ] Feed loads with 20 posts
- [ ] Scrolls down
- [ ] More posts load automatically
- [ ] Reaches end of feed (no more posts)

**Error Scenarios**:
- [ ] Network error shows error state
- [ ] Retry button reloads feed
- [ ] 401 error triggers token refresh

---

## 5. Reference Implementations

### 5.1 My Listings Page

**File**: `apps/web/src/routes/(dashboard)/my-listings/+page.svelte`

**Pattern Used**:
```typescript
// State
let page = $state(1);
let hasMore = $state(true);
let loadMoreTrigger = $state<HTMLElement | undefined>();

// Observer
onMount(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !$feedLoading && $feedHasMore) {
        loadListings();
      }
    },
    { rootMargin: '100px' }
  );
  
  observer.observe(loadMoreTrigger);
  return () => observer?.disconnect();
});

// Load function
async function loadListings() {
  await getUserPosts($userStore.currentUser!.id, { page: page + 1 });
  page += 1;
}
```

**Template**:
```svelte
{#each listings as post}
  <ListingCard {post} />
{/each}

{#if hasMore}
  <div bind:this={loadMoreTrigger}>
    {#if isLoading}
      <LoadingSpinner />
    {/if}
  </div>
{/if}
```

### 5.2 Post Service Patterns

**File**: `apps/web/src/lib/services/post.service.ts`

**Feed Loading**:
```typescript
export async function getFeed(
  options: FeedOptionsDTO = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
  const { page = 1, limit = 20, categoryId, userId } = options;
  
  postStore.setFeedLoading(true);
  
  const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
    `/posts/feed?${params.toString()}`
  );

  if (response.data.success) {
    const { data: posts, pagination } = response.data.data;
    const hasMore = pagination.page < pagination.pages;

    if (page === 1) {
      postStore.setFeedPosts(posts, hasMore);
    } else {
      postStore.appendFeedPosts(posts, hasMore);
    }
  }
  
  postStore.setFeedLoading(false);
  return response.data;
}
```

---

## 6. Configuration

### 6.1 Environment Variables

**File**: `apps/web/.env`

```bash
# API Configuration
VITE_API_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000

# Feed Configuration
VITE_POSTS_PER_PAGE=20
VITE_INFINITE_SCROLL_THRESHOLD=200
VITE_FEED_CACHE_DURATION=300000  # 5 minutes
```

### 6.2 App Config

**File**: `apps/web/src/lib/config/app.config.ts`

```typescript
export const config = {
  api: {
    baseUrl: env.VITE_API_URL,
    timeout: env.VITE_API_TIMEOUT,
  },
  feed: {
    postsPerPage: env.VITE_POSTS_PER_PAGE,
    scrollThreshold: env.VITE_INFINITE_SCROLL_THRESHOLD,
    cacheDuration: env.VITE_FEED_CACHE_DURATION,
  }
};
```

---

## 7. Performance Considerations

### 7.1 Caching Strategy

**Current Implementation**:
- Posts cached in `postStore` by ID
- Feed cached with TTL (5 minutes default)
- Optimistic updates for likes

### 7.2 Optimization Opportunities

**Image Loading**:
- Use `loading="lazy"` for post images
- Consider implementing progressive image loading
- Use Azure Blob preview URLs when available

**Data Fetching**:
- Already implemented: pagination (20 posts per page)
- Consider: prefetch next page when user is 80% through current page

**Rendering**:
- Use Svelte's `{#key}` blocks for efficient list updates
- Consider virtual scrolling for very long lists (100+ posts)

---

## 8. Security & Authentication

### 8.1 Optional Authentication

**Current Setup**:
- Feed endpoint uses `optionalAuth` middleware
- Works without authentication
- Includes `isLiked` flag when authenticated

**Behavior**:
- **Unauthenticated**: See all public posts, no like status
- **Authenticated**: See all posts + personal like status + personalization

### 8.2 Token Management

**Handled by API Client**:
- Token stored in localStorage (`decl_access_token`)
- Automatic injection in Authorization header
- Automatic refresh on 401 errors
- Refresh token stored separately (`decl_refresh_token`)

---

## 9. Error Handling

### 9.1 Network Errors

**Handled by API Client**:
```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) 
      || error.response?.status === 429;
  }
};
```

### 9.2 API Errors

**Error Response Structure**:
```typescript
interface ApiError {
  code: ErrorCode;
  message: string;
  details?: string;
  statusCode: number;
}
```

**Common Error Codes**:
- `INTERNAL_ERROR`: Server error (500)
- `VALIDATION_ERROR`: Invalid query params (400)
- `RATE_LIMIT_EXCEEDED`: Too many requests (429)
- `UNAUTHORIZED`: Invalid/expired token (401)

### 9.3 UI Error States

**User-Facing Messages**:
- Network error: "Unable to connect. Please check your internet connection."
- Server error: "Something went wrong. Please try again."
- Empty feed: "No posts found. Check back later for new listings."

---

## 10. Future Enhancements

### 10.1 Potential Features

**Short Term**:
- [ ] Pull-to-refresh on mobile
- [ ] Skeleton loading (instead of spinner)
- [ ] Post preview modal (quick view without navigation)
- [ ] Share post functionality

**Medium Term**:
- [ ] Advanced filters (price range, location, date)
- [ ] Sort options (recent, price, popularity)
- [ ] Save/bookmark posts
- [ ] Feed personalization based on user interests

**Long Term**:
- [ ] Infinite scroll with virtual scrolling for performance
- [ ] Real-time updates (new posts via WebSocket)
- [ ] Feed algorithm (ML-based recommendations)
- [ ] A/B testing different feed layouts

### 10.2 Analytics

**Metrics to Track**:
- Feed load time
- Posts viewed per session
- Scroll depth
- Like/engagement rate
- Error rate

---

## 11. Dependencies

### 11.1 Existing Infrastructure (No Changes Needed)

✅ `apps/api/src/controllers/post.controller.ts`  
✅ `apps/api/src/services/post.service.ts`  
✅ `apps/api/src/routes/post.routes.ts`  
✅ `apps/web/src/lib/api/client.ts`  
✅ `apps/web/src/lib/services/post.service.ts`  
✅ `apps/web/src/lib/stores/post.store.ts`  
✅ `apps/web/src/lib/config/app.config.ts`  

### 11.2 Files to Modify

📝 `apps/web/src/lib/components/cards/PostCard.svelte` - Fix type compatibility  
📝 `apps/web/src/routes/(dashboard)/browse/+page.svelte` - Main integration  

### 11.3 Files to Reference

📖 `apps/web/src/routes/(dashboard)/my-listings/+page.svelte` - Infinite scroll pattern  
📖 `packages/shared/src/types/post.types.ts` - Type definitions  

---

## 12. Implementation Checklist

### Phase 1: Type Compatibility
- [ ] Update PostCard to accept `PostResponseDTO`
- [ ] Map `user.fullName` → display name
- [ ] Map `user.profilePictureUrl` → avatar URL
- [ ] Handle `PostImageDTO[]` → extract image URLs
- [ ] Test PostCard renders correctly with API data

### Phase 2: Basic Integration
- [ ] Import `getFeed` and `postStore` in browse page
- [ ] Replace mock data with reactive store values
- [ ] Load initial feed on mount
- [ ] Update template to use `feedPosts` from store
- [ ] Test initial feed load

### Phase 3: Infinite Scroll
- [ ] Add intersection observer setup
- [ ] Add trigger element to template
- [ ] Implement load more function
- [ ] Test infinite scroll behavior
- [ ] Test "no more posts" state

### Phase 4: UI States
- [ ] Add loading skeleton
- [ ] Add error state with retry
- [ ] Add empty state
- [ ] Test all UI states

### Phase 5: Polish
- [ ] Add loading indicator for infinite scroll
- [ ] Optimize image loading
- [ ] Add accessibility attributes
- [ ] Test on mobile devices
- [ ] Performance testing

---

## 13. Success Criteria

### Functional Requirements
✅ Browse page displays posts from API  
✅ Infinite scroll loads more posts automatically  
✅ Loading states show during data fetch  
✅ Error states display with retry option  
✅ Empty state shows when no posts available  
✅ Posts display with correct data (title, price, images, etc.)  

### Technical Requirements
✅ No type errors  
✅ Proper error handling  
✅ Clean separation of concerns  
✅ Follows existing patterns in codebase  
✅ No performance degradation  

### User Experience
✅ Smooth scrolling experience  
✅ Fast initial load (< 2s)  
✅ Clear feedback during loading  
✅ Graceful error handling  
✅ Mobile responsive  

---

## 14. Timeline Estimate

**Phase 1 (Type Fix)**: 1-2 hours  
**Phase 2 (Basic Integration)**: 2-3 hours  
**Phase 3 (Infinite Scroll)**: 2-3 hours  
**Phase 4 (UI States)**: 1-2 hours  
**Phase 5 (Polish & Testing)**: 2-3 hours  

**Total Estimated Time**: 8-13 hours

---

## 15. Notes & Considerations

### 15.1 Infinite Scroll Implementation

**✅ Confirmed**: Browse page needs infinite scroll functionality

**Evidence from Research**:
- Helper utilities for infinite scroll exist in codebase
- Reference implementation in my-listings page
- API supports pagination (page, limit parameters)
- Store includes pagination state (`feedHasMore`, `feedPage`)

**Pattern**: Intersection Observer API with 100px threshold

### 15.2 Type System

**Critical Issue**: PostCard uses incompatible local type

**Impact**: Must be fixed before integration

**Solution**: Update component to use shared types from `packages/shared`

### 15.3 Architecture

**Clean Architecture Observed**:
- API → Service → Store → Component
- Clear separation of concerns
- Reactive state management with Svelte stores
- Centralized error handling

---

## Appendix A: API Response Example

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "iPhone 13 Pro",
      "description": "Mint condition, barely used",
      "price": 800,
      "location": "Nairobi",
      "brand": "Apple",
      "deliveryMethod": "Pickup",
      "contactNumber": "+254712345678",
      "status": "Active",
      "user": {
        "id": 5,
        "fullName": "John Doe",
        "profilePictureUrl": "https://example.com/avatar.jpg"
      },
      "category": {
        "id": 1,
        "name": "Electronics",
        "description": "Electronic devices and gadgets"
      },
      "images": [
        {
          "id": 10,
          "url": "https://example.com/image1.jpg",
          "blobPath": "posts/1/image1.jpg",
          "displayOrder": 0,
          "previewUrl": "https://example.com/preview1.jpg"
        }
      ],
      "likeCount": 15,
      "viewCount": 120,
      "isLiked": false,
      "publishedAt": "2026-01-05T10:30:00Z",
      "createdAt": "2026-01-05T10:00:00Z",
      "updatedAt": "2026-01-05T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

## Appendix B: Store State Structure

```typescript
interface PostState {
  // Feed posts (browse page)
  feedPosts: PostResponseDTO[];
  feedLoading: boolean;
  feedError: string | null;
  feedHasMore: boolean;
  feedPage: number;

  // User posts (my-listings)
  userPosts: Record<number, PostResponseDTO[]>;
  userPostsLoading: Record<number, boolean>;
  userPostsError: Record<number, string | null>;

  // Single post cache
  posts: Record<number, PostResponseDTO>;
  
  // Other state...
}
```

---

**Document Version**: 1.0  
**Last Updated**: January 6, 2026  
**Author**: GitHub Copilot  
**Review Status**: Pending Implementation
