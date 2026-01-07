# My-Listings Page API Integration Plan

**Document Created:** January 7, 2026  
**Status:** Ready for Implementation  
**Priority:** High - Frontend page currently non-functional with real backend

---

## Executive Summary

The my-listings page currently uses mock data. This document outlines the plan to integrate it with the backend API to display live data from the database for the authenticated user's posts, implementing infinite scroll and status filtering.

### Key Findings

- **Current Issue:** Frontend calls non-existent `/posts/my-posts` endpoint
- **Solution:** Use existing `/posts/user/:userId` endpoint with current user's ID
- **Authentication:** Token automatically injected via API client interceptor
- **Pagination:** Backend supports pagination; frontend needs proper integration
- **Filtering:** Implement client-side status filtering (Active, Draft, Expired, etc.)

---

## 1. Current State Analysis

### Frontend (My-Listings Page)
- **File:** `apps/web/src/routes/post/my-listings/+page.svelte`
- **Current Implementation:** Uses mock data from `$lib/utils/mock-listings`
- **Features Implemented:** 
  - Infinite scroll UI
  - Status filter chips (All, Active, Pending, Expired, Draft)
  - Empty states
  - Loading states
  - Action handlers (edit, delete, manage, renew, relist)

### Backend API
- **Endpoint:** `GET /api/v1/posts/user/:userId`
- **Controller:** `apps/api/src/controllers/post.controller.ts`
- **Service:** `apps/api/src/services/post.service.ts`
- **Authentication:** Currently public (no auth required)
- **Pagination Support:** ✅ Yes (page, limit query params)
- **Status Filtering:** ❌ Not implemented (returns all posts)

### Frontend Service
- **File:** `apps/web/src/lib/services/post.service.ts`
- **Issue:** `getMyPosts()` calls non-existent `/posts/my-posts` endpoint
- **Fix Required:** Update to use `/posts/user/:userId` with current user ID

---

## 2. Implementation Plan

### Phase 1: Fix Frontend Service (15 minutes)

**File:** `apps/web/src/lib/services/post.service.ts`

**Task:** Update `getMyPosts()` function to use existing endpoint

**Changes Required:**
```typescript
export async function getMyPosts(
  options: { page?: number; limit?: number; status?: PostStatus } = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
  try {
    // Get current user ID from store
    const userId = userStore.getCurrentUserId();
    
    if (!userId) {
      return {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          statusCode: 401
        }
      };
    }
    
    const { page = 1, limit = 20 } = options;
    
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    
    postStore.setMyPostsLoading(true);
    
    // Use existing /posts/user/:userId endpoint
    const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
      `/posts/user/${userId}?${params.toString()}`
    );
    
    if (response.data.success && response.data.data) {
      const { data: posts, pagination } = response.data.data;
      const hasMore = pagination.page < pagination.pages;
      
      if (page === 1) {
        postStore.setMyPosts(posts, hasMore);
      } else {
        postStore.appendMyPosts(posts, hasMore);
      }
      
      // Cache individual posts
      posts.forEach((post) => postStore.setPost(post));
    }
    
    postStore.setMyPostsLoading(false);
    return response.data;
  } catch (error) {
    postStore.setMyPostsError(
      error instanceof Error ? error.message : 'Failed to load my posts'
    );
    throw handleError(error);
  }
}
```

**Key Points:**
- Get user ID from `userStore.getCurrentUserId()`
- Call `/posts/user/${userId}` endpoint
- Update store with posts and pagination info
- Handle errors appropriately

---

### Phase 2: Update My-Listings Page (30 minutes)

**File:** `apps/web/src/routes/post/my-listings/+page.svelte`

#### Step 2.1: Replace Imports

**Remove:**
```typescript
import {
  getMockListings,
  getMockListingsCount,
  filterListingsByStatus,
  getListingCountByStatus
} from '$lib/utils/mock-listings';
```

**Add:**
```typescript
import { getMyPosts, loadMoreMyPosts } from '$lib/services/post.service';
import { 
  myPosts, 
  myPostsLoading, 
  myPostsHasMore, 
  myPostsError 
} from '$lib/stores/post.store';
```

#### Step 2.2: Update State Management

**Replace:**
```typescript
// Old state
let listings = $state<PostResponseDTO[]>([]);
let filteredListings = $state<PostResponseDTO[]>([]);
let isLoading = $state(false);
let hasMore = $state(true);
let page = $state(1);
```

**With:**
```typescript
// State from store subscriptions
let listings = $state<PostResponseDTO[]>([]);
let isLoading = $state(false);
let hasMore = $state(true);
let error = $state<string | null>(null);
let page = $state(1);

// Subscribe to store
$effect(() => {
  const unsubscribe = myPosts.subscribe(posts => {
    listings = posts;
  });
  return unsubscribe;
});

$effect(() => {
  const unsubscribe = myPostsLoading.subscribe(loading => {
    isLoading = loading;
  });
  return unsubscribe;
});

$effect(() => {
  const unsubscribe = myPostsHasMore.subscribe(more => {
    hasMore = more;
  });
  return unsubscribe;
});

$effect(() => {
  const unsubscribe = myPostsError.subscribe(err => {
    error = err;
  });
  return unsubscribe;
});

// Client-side filtering
let filteredListings = $derived(
  activeFilter === 'all' 
    ? listings 
    : listings.filter(post => post.status === activeFilter)
);
```

#### Step 2.3: Update Load Functions

**Replace:**
```typescript
function loadListings() {
  if (isLoading || !hasMore) return;

  isLoading = true;

  // Simulate API delay
  setTimeout(() => {
    const newListings = getMockListings(page, pageSize);

    if (newListings.length === 0) {
      hasMore = false;
    } else {
      listings = [...listings, ...newListings];
      page += 1;
    }

    isLoading = false;
  }, 500);
}
```

**With:**
```typescript
async function loadListings() {
  if (isLoading || !hasMore) return;

  try {
    await getMyPosts({ page, limit: pageSize });
    page += 1;
  } catch (err) {
    console.error('Failed to load listings:', err);
    error = err instanceof Error ? err.message : 'Failed to load listings';
  }
}
```

#### Step 2.4: Update onMount

**Replace:**
```typescript
onMount(() => {
  loadListings();
  setupInfiniteScroll();

  return () => {
    observer?.disconnect();
  };
});
```

**With:**
```typescript
onMount(async () => {
  // Load initial page
  try {
    await getMyPosts({ page: 1, limit: pageSize });
    page = 2; // Next page to load
  } catch (err) {
    console.error('Failed to load initial listings:', err);
  }
  
  setupInfiniteScroll();

  return () => {
    observer?.disconnect();
  };
});
```

#### Step 2.5: Update Infinite Scroll Observer

**Replace:**
```typescript
function setupInfiniteScroll() {
  observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore) {
        loadListings();
      }
    },
    {
      rootMargin: '100px'
    }
  );

  if (loadMoreTrigger) {
    observer.observe(loadMoreTrigger);
  }
}
```

**With:**
```typescript
function setupInfiniteScroll() {
  observer = new IntersectionObserver(
    async (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && !isLoading && hasMore) {
        try {
          await loadMoreMyPosts(page);
          page += 1;
        } catch (err) {
          console.error('Failed to load more listings:', err);
        }
      }
    },
    {
      rootMargin: '100px'
    }
  );

  if (loadMoreTrigger) {
    observer.observe(loadMoreTrigger);
  }
}
```

#### Step 2.6: Update Filter Counts

**Replace:**
```typescript
const filters = $derived([
  { id: 'all' as FilterStatus, label: 'All', count: getListingCountByStatus('all') },
  { id: PostStatus.ACTIVE, label: 'Active', count: getListingCountByStatus(PostStatus.ACTIVE) },
  // ...
]);
```

**With:**
```typescript
const filters = $derived([
  { 
    id: 'all' as FilterStatus, 
    label: 'All', 
    count: listings.length 
  },
  { 
    id: PostStatus.ACTIVE, 
    label: 'Active', 
    count: listings.filter(l => l.status === PostStatus.ACTIVE).length 
  },
  {
    id: PostStatus.PENDING_PAYMENT,
    label: 'Pending',
    count: listings.filter(l => l.status === PostStatus.PENDING_PAYMENT).length
  },
  {
    id: PostStatus.EXPIRED,
    label: 'Expired',
    count: listings.filter(l => l.status === PostStatus.EXPIRED).length
  },
  { 
    id: PostStatus.DRAFT, 
    label: 'Draft', 
    count: listings.filter(l => l.status === PostStatus.DRAFT).length 
  }
]);
```

#### Step 2.7: Add Error Display

**Add after the header section:**
```svelte
{#if error}
  <div class="px-4 py-3 mx-4 mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
    <div class="flex items-center gap-2">
      <Icon name="error" size={20} class="text-red-600 dark:text-red-400" />
      <p class="text-red-800 dark:text-red-200">{error}</p>
    </div>
  </div>
{/if}
```

---

### Phase 3: Testing (30 minutes)

#### Test Cases

1. **Authentication Check**
   - [ ] Page redirects to login if user not authenticated
   - [ ] Correct user ID is sent to API

2. **Initial Load**
   - [ ] First 10-20 posts load on page mount
   - [ ] Loading spinner shows during initial load
   - [ ] Error message displays if API fails

3. **Infinite Scroll**
   - [ ] Scrolling to bottom loads next page
   - [ ] No duplicate posts appear
   - [ ] "No more listings" message shows when all loaded
   - [ ] Loading indicator shows while fetching more

4. **Status Filtering**
   - [ ] "All" filter shows all posts
   - [ ] "Active" filter shows only active posts
   - [ ] "Pending" filter shows only pending payment posts
   - [ ] "Expired" filter shows only expired posts
   - [ ] "Draft" filter shows only draft posts
   - [ ] Filter counts are accurate

5. **Empty States**
   - [ ] Correct empty state for each filter
   - [ ] "Create New Post" button works

6. **Actions**
   - [ ] Edit button navigates to edit page
   - [ ] Delete button shows confirmation and removes post
   - [ ] Manage payment navigates to payment page
   - [ ] Renew navigates to renewal page
   - [ ] Relist creates new post from existing

7. **Error Handling**
   - [ ] Network errors show error message
   - [ ] 401 errors redirect to login
   - [ ] Server errors show appropriate message

---

## 3. Future Enhancements (Optional)

### Enhancement 1: Backend Authenticated Endpoint

**Create dedicated authenticated endpoint for better security.**

#### Add Route
**File:** `apps/api/src/routes/post.routes.ts`

```typescript
router.get(
  "/my-posts",
  authenticate,  // Requires authentication
  readLimiter,
  validateQuery(feedOptionsSchema),
  postController.getMyPosts
);
```

#### Add Controller Method
**File:** `apps/api/src/controllers/post.controller.ts`

```typescript
/**
 * Get current user's posts
 * GET /api/v1/posts/my-posts
 */
async getMyPosts(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const status = req.query.status as string | undefined;
    
    const result = await postService.getUserPosts(userId, page, limit, status);
    
    if (!result.success) {
      return res.status(500).json(result);
    }
    
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
```

**Benefits:**
- More secure (requires authentication)
- Cleaner API design
- Can add user-specific business logic
- Better audit trail

---

### Enhancement 2: Server-Side Status Filtering

**Add status query parameter support for better performance.**

#### Update Service
**File:** `apps/api/src/services/post.service.ts`

```typescript
async getUserPosts(
  userId: number,
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<PaginatedResponse<PostResponseDTO>> {
  try {
    // Pass status filter to repository
    const posts = await postRepository.findByUserId(userId, page, limit, status);
    
    // Count with status filter
    const total = await postRepository.count({ 
      userId, 
      ...(status && { status }) 
    });
    
    // ... rest of implementation
  }
}
```

#### Update Repository
**File:** `apps/api/src/repositories/post.repository.ts`

```typescript
async findByUserId(
  userId: number, 
  page: number, 
  limit: number, 
  status?: string
) {
  return prisma.post.findMany({
    where: {
      userId,
      ...(status && { status }),
    },
    include: {
      category: true,
      images: {
        orderBy: { displayOrder: "asc" },
      },
      _count: {
        select: { likes: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}
```

**Benefits:**
- Reduces data transfer (only sends filtered posts)
- Improves performance for users with many posts
- Accurate pagination counts per status
- Database-level filtering is more efficient

---

### Enhancement 3: Optimistic Updates

**Add optimistic UI updates for better UX.**

**Example for Delete:**
```typescript
function handleDelete(post: PostResponseDTO) {
  if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
    return;
  }
  
  // Optimistic update
  const originalListings = listings;
  listings = listings.filter((l) => l.id !== post.id);
  
  // Call API
  deletePost(post.id)
    .then(() => {
      // Success - already updated
      console.log('Post deleted successfully');
    })
    .catch((error) => {
      // Rollback on error
      listings = originalListings;
      alert('Failed to delete post. Please try again.');
    });
}
```

**Benefits:**
- Instant feedback for user
- Feels faster and more responsive
- Can rollback if API fails

---

### Enhancement 4: Real-Time Updates

**Add WebSocket support for real-time listing updates.**

**Use Cases:**
- Post status changes (Active → Expired)
- Payment completion (Pending → Active)
- New likes/views count updates
- Moderation actions (Active → Rejected)

**Implementation:**
- Subscribe to user-specific WebSocket channel on mount
- Update listings in real-time when events received
- Show toast notification for important updates

---

## 4. Security Considerations

### Current Concerns

1. **Public User Posts Endpoint**
   - Anyone can view any user's posts, including drafts
   - **Recommendation:** Add logic to filter non-public posts unless requesting own posts

2. **No Rate Limiting on User-Specific Endpoint**
   - Could be used to scrape all users' listings
   - **Recommendation:** Add stricter rate limiting

3. **No Ownership Verification**
   - Actions (edit, delete) rely on frontend-only checks
   - **Recommendation:** Always verify ownership in backend

### Recommended Security Enhancements

```typescript
// In post.service.ts
async getUserPosts(
  userId: number,
  requesterId?: number,  // ID of user making request
  page: number = 1,
  limit: number = 20,
  status?: string
): Promise<PaginatedResponse<PostResponseDTO>> {
  try {
    // If viewing own posts, return all
    // If viewing others' posts, only return published posts
    const isOwnPosts = requesterId === userId;
    
    const posts = await postRepository.findByUserId(
      userId, 
      page, 
      limit,
      isOwnPosts ? status : PostStatus.ACTIVE  // Force ACTIVE for others
    );
    
    // Filter out private data if not own posts
    const mappedPosts = posts.map(post => {
      if (!isOwnPosts) {
        // Remove sensitive data
        delete post.contactNumber;
        delete post.emailAddress;
      }
      return this.mapToPostResponse(post, user, category);
    });
    
    // ...
  }
}
```

---

## 5. Performance Optimization

### Current Performance Characteristics

- **Initial Load:** ~500ms (network + DB query)
- **Subsequent Pages:** ~300ms
- **Client-Side Filtering:** Instant

### Optimization Opportunities

1. **Implement Caching**
   ```typescript
   // Cache posts for 5 minutes
   const CACHE_TTL = 5 * 60 * 1000;
   
   // In post.service.ts
   const cacheKey = `user_posts_${userId}_${page}_${status}`;
   const cached = cache.get(cacheKey);
   
   if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
     return cached.data;
   }
   ```

2. **Add Database Indexes**
   ```prisma
   model Post {
     // ...
     
     @@index([userId, status, createdAt])
     @@index([userId, createdAt])
   }
   ```

3. **Lazy Load Images**
   ```svelte
   <img 
     loading="lazy" 
     src={post.images[0]?.imageUrl} 
     alt={post.title} 
   />
   ```

4. **Virtual Scrolling**
   - For users with 1000+ posts, implement virtual scrolling
   - Only render visible items in DOM
   - Use library like `svelte-virtual-list`

---

## 6. Implementation Checklist

### Backend Changes
- [ ] Review current endpoint security
- [ ] Consider adding authenticated `/posts/my-posts` endpoint
- [ ] Add status filtering parameter
- [ ] Add database indexes for performance
- [ ] Update API documentation

### Frontend Service Changes
- [ ] Fix `getMyPosts()` to use `/posts/user/:userId`
- [ ] Get user ID from `userStore.getCurrentUserId()`
- [ ] Update error handling
- [ ] Test with authenticated user
- [ ] Test with unauthenticated user

### Frontend Page Changes
- [ ] Replace mock data imports with API service imports
- [ ] Subscribe to post store states
- [ ] Update `onMount` to load initial data
- [ ] Fix infinite scroll to call `loadMoreMyPosts()`
- [ ] Implement client-side status filtering
- [ ] Update filter count calculations
- [ ] Add error display UI
- [ ] Test all filter states
- [ ] Test infinite scroll
- [ ] Test empty states
- [ ] Test action buttons

### Testing
- [ ] Unit tests for service functions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for page functionality
- [ ] Performance testing with large datasets
- [ ] Mobile responsive testing
- [ ] Dark mode testing

### Documentation
- [ ] Update API documentation
- [ ] Document frontend service usage
- [ ] Add code comments
- [ ] Update README if needed

---

## 7. Timeline Estimate

| Phase | Task | Time Estimate |
|-------|------|---------------|
| 1 | Fix frontend service | 15 minutes |
| 2 | Update page component | 30 minutes |
| 3 | Testing & bug fixes | 30 minutes |
| 4 | Code review & cleanup | 15 minutes |
| **Total** | **Basic Implementation** | **~1.5 hours** |
| | | |
| Optional | Backend enhancements | 1-2 hours |
| Optional | Performance optimization | 1-2 hours |
| Optional | Real-time updates | 2-3 hours |

---

## 8. Rollback Plan

If issues arise during implementation:

1. **Immediate Rollback:**
   - Revert to mock data in page component
   - Keep broken service method isolated
   - Deploy with fallback UI

2. **Partial Implementation:**
   - Keep service changes
   - Add feature flag for API vs mock data
   - Gradual rollout to users

3. **Code to Revert:**
   ```typescript
   // In +page.svelte
   const USE_MOCK_DATA = true;  // Feature flag
   
   onMount(() => {
     if (USE_MOCK_DATA) {
       loadMockListings();
     } else {
       loadRealListings();
     }
   });
   ```

---

## 9. Success Metrics

### Technical Metrics
- [ ] API response time < 500ms (p95)
- [ ] Zero client-side errors
- [ ] Infinite scroll loads next page in < 300ms
- [ ] Page initial render < 2s

### User Metrics
- [ ] Bounce rate remains same or improves
- [ ] Time on page increases (users engaging with real content)
- [ ] Action completion rate (edit, delete, etc.)

### Business Metrics
- [ ] Post creation rate
- [ ] User retention
- [ ] Support tickets related to listings page

---

## 10. Support & Maintenance

### Monitoring
- Set up error tracking (Sentry, LogRocket)
- Monitor API endpoint performance
- Track user engagement metrics
- Set up alerts for high error rates

### Known Limitations
1. Client-side filtering may be slow for users with 1000+ posts
2. Filter counts only accurate for loaded posts (not total in DB)
3. No real-time updates (requires page refresh)
4. Optimistic updates not implemented yet

### Future Improvements
- Server-side filtering
- Real-time WebSocket updates
- Bulk actions (delete multiple, change status)
- Advanced sorting options
- Export listings to CSV
- Analytics dashboard

---

## Conclusion

This plan provides a clear path to integrate the my-listings page with live API data. The implementation is straightforward and can be completed in approximately 1.5 hours for the basic functionality. Optional enhancements can be added incrementally based on user needs and performance requirements.

**Next Steps:**
1. Review and approve this plan
2. Implement Phase 1 (fix service)
3. Implement Phase 2 (update page)
4. Test thoroughly
5. Deploy to staging
6. User acceptance testing
7. Deploy to production

---

**Document Status:** Ready for Implementation  
**Last Updated:** January 7, 2026  
**Owner:** Development Team  
**Reviewers:** Backend Team, Frontend Team, QA Team
