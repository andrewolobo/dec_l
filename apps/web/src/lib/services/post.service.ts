import { apiClient } from './api.client';
import type { ApiResponse, PaginatedResponse } from '$types/api.types';
import type {
	CreatePostDTO,
	UpdatePostDTO,
	PostResponseDTO,
	FeedOptionsDTO,
	SearchOptionsDTO,
	SchedulePostDTO,
	LikeResponseDTO
} from '$types/post.types';
import { postStore } from '$lib/stores/post.store';
import { userStore } from '$lib/stores/user.store';
import { handleError } from '$lib/utils/error-handler';

/**
 * Post Service
 * Handles all post-related API calls with integrated state management
 *
 * Features:
 * - Automatic store updates
 * - Optimistic updates for likes
 * - Error handling
 * - Caching
 */

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * Create a new post
 * Automatically adds to my posts in store
 */
export async function createPost(data: CreatePostDTO): Promise<ApiResponse<PostResponseDTO>> {
	try {
		const response = await apiClient.post<ApiResponse<PostResponseDTO>>('/posts', data);

		// Add to store if successful
		if (response.data.success && response.data.data) {
			postStore.addMyPost(response.data.data);
			postStore.setPost(response.data.data);
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Get a single post by ID
 * Checks cache first, then fetches if needed
 */
export async function getPost(
	postId: number,
	forceRefresh: boolean = false
): Promise<ApiResponse<PostResponseDTO>> {
	try {
		// Check cache first unless force refresh
		if (!forceRefresh && postStore.hasPost(postId)) {
			const cachedPost = postStore.getPost(postId);
			if (cachedPost) {
				return {
					success: true,
					data: cachedPost,
					message: 'Post retrieved from cache'
				};
			}
		}

		postStore.setPostLoading(postId, true);
		const response = await apiClient.get<ApiResponse<PostResponseDTO>>(`/posts/${postId}`);

		// Update store if successful
		if (response.data.success && response.data.data) {
			postStore.setPost(response.data.data);
		}

		postStore.setPostLoading(postId, false);
		return response.data;
	} catch (error) {
		postStore.setPostError(postId, error instanceof Error ? error.message : 'Failed to load post');
		throw handleError(error);
	}
}

/**
 * Update an existing post
 * Updates all instances in store
 */
export async function updatePost(
	postId: number,
	data: UpdatePostDTO
): Promise<ApiResponse<PostResponseDTO>> {
	try {
		const response = await apiClient.put<ApiResponse<PostResponseDTO>>(`/posts/${postId}`, data);

		// Update store if successful
		if (response.data.success && response.data.data) {
			postStore.setPost(response.data.data);
			postStore.updatePost(postId, response.data.data);
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Delete a post
 * Removes from all store locations
 */
export async function deletePost(postId: number): Promise<ApiResponse<void>> {
	try {
		const response = await apiClient.delete<ApiResponse<void>>(`/posts/${postId}`);

		// Remove from store if successful
		if (response.data.success) {
			postStore.removePost(postId);
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

// ============================================================================
// Feed & Discovery
// ============================================================================

/**
 * Get main feed with pagination
 * Supports infinite scroll by passing page parameter
 * Automatically updates feed store
 */
export async function getFeed(
	options: FeedOptionsDTO = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
	try {
		const { page = 1, limit = 20, categoryId, userId } = options;

		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});

		if (categoryId) params.append('categoryId', categoryId.toString());
		if (userId) params.append('userId', userId.toString());

		postStore.setFeedLoading(true);
		const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
			`/posts/feed?${params.toString()}`
		);

		if (response.data.success && response.data.data) {
			const { data: posts, pagination } = response.data.data;
			const hasMore = pagination.page < pagination.pages;

			if (page === 1) {
				postStore.setFeedPosts(posts, hasMore);
			} else {
				postStore.appendFeedPosts(posts, hasMore);
			}

			// Cache individual posts
			posts.forEach((post) => postStore.setPost(post));
		}

		postStore.setFeedLoading(false);
		return response.data;
	} catch (error) {
		postStore.setFeedError(error instanceof Error ? error.message : 'Failed to load feed');
		throw handleError(error);
	}
}

/**
 * Search posts with filters
 * Automatically updates search store
 */
export async function searchPosts(
	options: SearchOptionsDTO
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
	try {
		const { query, page = 1, limit = 20, categoryId, minPrice, maxPrice, location, sort } = options;

		const params = new URLSearchParams({
			query,
			page: page.toString(),
			limit: limit.toString()
		});

		if (categoryId) params.append('categoryId', categoryId.toString());
		if (minPrice !== undefined) params.append('minPrice', minPrice.toString());
		if (maxPrice !== undefined) params.append('maxPrice', maxPrice.toString());
		if (location) params.append('location', location);
		if (sort?.field) params.append('sortBy', sort.field);
		if (sort?.order) params.append('sortOrder', sort.order);

		postStore.setSearchLoading(true);
		const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
			`/posts/search?${params.toString()}`
		);

		if (response.data.success && response.data.data) {
			const { data: posts, pagination } = response.data.data;
			const hasMore = pagination.page < pagination.pages;

			if (page === 1) {
				postStore.setSearchResults(posts, query, hasMore);
			} else {
				postStore.appendSearchResults(posts, hasMore);
			}

			// Cache individual posts
			posts.forEach((post) => postStore.setPost(post));
		}

		postStore.setSearchLoading(false);
		return response.data;
	} catch (error) {
		postStore.setSearchError(error instanceof Error ? error.message : 'Search failed');
		throw handleError(error);
	}
}

/**
 * Get posts by category
 */
export async function getPostsByCategory(
	categoryId: number,
	options: { page?: number; limit?: number } = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
	return getFeed({ ...options, categoryId });
}

/**
 * Get posts by user
 */
export async function getPostsByUser(
	userId: number,
	options: { page?: number; limit?: number } = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
	return getFeed({ ...options, userId });
}

/**
 * Get current user's posts
 * Automatically updates my posts store
 */
export async function getMyPosts(
	options: { page?: number; limit?: number } = {}
): Promise<PaginatedResponse<PostResponseDTO>> {
	try {
		// Get current user ID from store
		const userId = userStore.getCurrentUserId();

		if (!userId) {
			postStore.setMyPostsError('User not authenticated');
			return {
				success: false,
				data: [],
				pagination: { total: 0, page: 1, limit: 20, pages: 0 },
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
		const response = await apiClient.get<PaginatedResponse<PostResponseDTO>>(
			`/posts/user/${userId}?${params.toString()}`
		);

		if (response.data.success && response.data.data) {
			const { data: posts, pagination } = response.data;
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
		postStore.setMyPostsError(error instanceof Error ? error.message : 'Failed to load my posts');
		throw handleError(error);
	}
}

/**
 * Get similar posts based on a post ID
 * Caches results
 */
export async function getSimilarPosts(
	postId: number,
	limit: number = 5
): Promise<ApiResponse<PostResponseDTO[]>> {
	try {
		const response = await apiClient.get<ApiResponse<PostResponseDTO[]>>(
			`/posts/${postId}/similar?limit=${limit}`
		);

		// Cache the similar posts
		if (response.data.success && response.data.data) {
			response.data.data.forEach((post) => postStore.setPost(post));
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

// ============================================================================
// Post Actions
// ============================================================================

/**
 * Like a post
 * Uses optimistic updates for instant UI feedback
 */
export async function likePost(postId: number): Promise<ApiResponse<LikeResponseDTO>> {
	try {
		// Optimistic update
		postStore.toggleLike(postId, true);

		const response = await apiClient.post<ApiResponse<LikeResponseDTO>>(`/posts/${postId}/like`);

		// If API call fails, revert the optimistic update
		if (!response.data.success) {
			postStore.toggleLike(postId, false);
		} else if (response.data.data) {
			// Ensure store matches server state
			postStore.updatePost(postId, {
				isLiked: response.data.data.liked,
				likeCount: response.data.data.likeCount
			});
		}

		return response.data;
	} catch (error) {
		// Revert optimistic update on error
		postStore.toggleLike(postId, false);
		throw handleError(error);
	}
}

/**
 * Unlike a post
 * Uses optimistic updates for instant UI feedback
 */
export async function unlikePost(postId: number): Promise<ApiResponse<LikeResponseDTO>> {
	try {
		// Optimistic update
		postStore.toggleLike(postId, false);

		const response = await apiClient.delete<ApiResponse<LikeResponseDTO>>(`/posts/${postId}/like`);

		// If API call fails, revert the optimistic update
		if (!response.data.success) {
			postStore.toggleLike(postId, true);
		} else if (response.data.data) {
			// Ensure store matches server state
			postStore.updatePost(postId, {
				isLiked: response.data.data.liked,
				likeCount: response.data.data.likeCount
			});
		}

		return response.data;
	} catch (error) {
		// Revert optimistic update on error
		postStore.toggleLike(postId, true);
		throw handleError(error);
	}
}

/**
 * Increment view count for a post
 */
export async function incrementViewCount(postId: number): Promise<ApiResponse<void>> {
	const response = await apiClient.post<ApiResponse<void>>(`/posts/${postId}/view`);
	return response.data;
}

/**
 * Schedule a post for later publication
 */
export async function schedulePost(
	postId: number,
	data: SchedulePostDTO
): Promise<ApiResponse<PostResponseDTO>> {
	const response = await apiClient.post<ApiResponse<PostResponseDTO>>(
		`/posts/${postId}/schedule`,
		data
	);
	return response.data;
}

/**
 * Publish a draft post immediately
 * Removes from drafts and adds to my posts
 */
export async function publishPost(postId: number): Promise<ApiResponse<PostResponseDTO>> {
	try {
		const response = await apiClient.post<ApiResponse<PostResponseDTO>>(`/posts/${postId}/publish`);

		if (response.data.success && response.data.data) {
			postStore.removeDraft(postId);
			postStore.addMyPost(response.data.data);
			postStore.setPost(response.data.data);
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Save post as draft
 * Adds to drafts in store
 */
export async function saveDraft(data: CreatePostDTO): Promise<ApiResponse<PostResponseDTO>> {
	try {
		const response = await apiClient.post<ApiResponse<PostResponseDTO>>('/posts/draft', data);

		if (response.data.success && response.data.data) {
			postStore.addDraft(response.data.data);
			postStore.setPost(response.data.data);
		}

		return response.data;
	} catch (error) {
		throw handleError(error);
	}
}

/**
 * Update draft post
 */
export async function updateDraft(
	postId: number,
	data: UpdatePostDTO
): Promise<ApiResponse<PostResponseDTO>> {
	const response = await apiClient.put<ApiResponse<PostResponseDTO>>(
		`/posts/draft/${postId}`,
		data
	);
	return response.data;
}

// ============================================================================
// Admin Operations
// ============================================================================

/**
 * Get posts pending approval (admin only)
 */
export async function getPendingPosts(
	options: { page?: number; limit?: number } = {}
): Promise<ApiResponse<PaginatedResponse<PostResponseDTO>>> {
	const { page = 1, limit = 20 } = options;

	const params = new URLSearchParams({
		page: page.toString(),
		limit: limit.toString()
	});

	const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
		`/posts/pending?${params.toString()}`
	);
	return response.data;
}

/**
 * Approve a post (admin only)
 */
export async function approvePost(postId: number): Promise<ApiResponse<PostResponseDTO>> {
	const response = await apiClient.post<ApiResponse<PostResponseDTO>>(`/posts/${postId}/approve`);
	return response.data;
}

/**
 * Reject a post (admin only)
 */
export async function rejectPost(
	postId: number,
	reason?: string
): Promise<ApiResponse<PostResponseDTO>> {
	const response = await apiClient.post<ApiResponse<PostResponseDTO>>(`/posts/${postId}/reject`, {
		reason
	});
	return response.data;
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get post analytics (views, likes, engagement)
 */
export async function getPostAnalytics(postId: number): Promise<
	ApiResponse<{
		views: number;
		likes: number;
		shares: number;
		engagement: number;
		viewsByDay: Array<{ date: string; count: number }>;
	}>
> {
	const response = await apiClient.get(`/posts/${postId}/analytics`);
	return response.data;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Build query string for feed options
 */
export function buildFeedQueryString(options: FeedOptionsDTO): string {
	const params = new URLSearchParams();

	if (options.page) params.append('page', options.page.toString());
	if (options.limit) params.append('limit', options.limit.toString());
	if (options.categoryId) params.append('categoryId', options.categoryId.toString());
	if (options.userId) params.append('userId', options.userId.toString());

	return params.toString();
}

/**
 * Calculate if there are more pages to load
 */
export function hasMorePages(response: PaginatedResponse<any>): boolean {
	return response.pagination.page < response.pagination.pages;
}

/**
 * Get next page number
 */
export function getNextPage(response: PaginatedResponse<any>): number | null {
	return hasMorePages(response) ? response.pagination.page + 1 : null;
}

// ============================================================================
// Infinite Scroll Helper Functions
// ============================================================================

/**
 * Infinite scroll handler for feed
 * Call this function when user scrolls near the bottom
 */
export async function loadMoreFeedPosts(
	currentPage: number,
	options?: Omit<FeedOptionsDTO, 'page'>
): Promise<boolean> {
	try {
		const response = await getFeed({ ...options, page: currentPage + 1 });
		return response.success && hasMorePages(response.data!);
	} catch (error) {
		console.error('Failed to load more feed posts:', error);
		return false;
	}
}

/**
 * Infinite scroll handler for my posts
 */
export async function loadMoreMyPosts(currentPage: number): Promise<boolean> {
	try {
		const response = await getMyPosts({ page: currentPage + 1 });
		return response.success && hasMorePages(response.data!);
	} catch (error) {
		console.error('Failed to load more my posts:', error);
		return false;
	}
}

/**
 * Infinite scroll handler for search results
 */
export async function loadMoreSearchResults(
	currentPage: number,
	searchOptions: SearchOptionsDTO
): Promise<boolean> {
	try {
		const response = await searchPosts({ ...searchOptions, page: currentPage + 1 });
		return response.success && hasMorePages(response.data!);
	} catch (error) {
		console.error('Failed to load more search results:', error);
		return false;
	}
}

/**
 * Infinite scroll handler for user posts
 */
export async function loadMoreUserPosts(userId: number, currentPage: number): Promise<boolean> {
	try {
		const response = await getPostsByUser(userId, { page: currentPage + 1 });

		if (response.success && response.data) {
			const { data: posts, pagination } = response.data;
			postStore.appendUserPosts(userId, posts);
			return pagination.page < pagination.pages;
		}

		return false;
	} catch (error) {
		console.error('Failed to load more user posts:', error);
		return false;
	}
}

/**
 * Generic intersection observer setup for infinite scroll
 * Usage: Call this function with a sentinel element and load function
 *
 * @param element - The sentinel element (typically at bottom of list)
 * @param onIntersect - Function to call when element is visible
 * @param options - IntersectionObserver options
 * @returns Cleanup function to disconnect observer
 *
 * @example
 * ```typescript
 * const cleanup = setupInfiniteScroll(
 *   sentinelElement,
 *   () => loadMoreFeedPosts(currentPage),
 *   { rootMargin: '100px' }
 * );
 * // Later: cleanup();
 * ```
 */
export function setupInfiniteScroll(
	element: Element,
	onIntersect: () => void | Promise<void>,
	options: IntersectionObserverInit = {}
): () => void {
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					onIntersect();
				}
			});
		},
		{
			root: null,
			rootMargin: '200px',
			threshold: 0,
			...options
		}
	);

	observer.observe(element);

	// Return cleanup function
	return () => observer.disconnect();
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Refresh feed (clear and reload from page 1)
 */
export async function refreshFeed(options?: Omit<FeedOptionsDTO, 'page'>): Promise<void> {
	postStore.resetFeed();
	await getFeed({ ...options, page: 1 });
}

/**
 * Refresh my posts
 */
export async function refreshMyPosts(): Promise<void> {
	await getMyPosts({ page: 1 });
}

/**
 * Clear all cached posts
 */
export function clearPostCache(): void {
	postStore.reset();
}

/**
 * Preload a post (fetch and cache without waiting)
 */
export function preloadPost(postId: number): void {
	getPost(postId).catch(() => {
		// Silently fail - this is just preloading
	});
}

/**
 * Batch preload multiple posts
 */
export function preloadPosts(postIds: number[]): void {
	postIds.forEach((id) => preloadPost(id));
}

// ============================================================================
// Toggle Like Utility (determines whether to like or unlike)
// ============================================================================

/**
 * Toggle like/unlike based on current state
 * Automatically detects current state and calls appropriate function
 */
export async function togglePostLike(postId: number): Promise<ApiResponse<LikeResponseDTO>> {
	const post = postStore.getPost(postId);

	if (post?.isLiked) {
		return unlikePost(postId);
	} else {
		return likePost(postId);
	}
}

// ============================================================================
// Drafts Management
// ============================================================================

/**
 * Get all drafts for current user
 */
export async function getDrafts(): Promise<ApiResponse<PostResponseDTO[]>> {
	try {
		postStore.setDraftsLoading(true);

		// Assuming the API has a drafts endpoint
		// If not, we filter from my posts with status === 'DRAFT'
		const response = await getMyPosts({ limit: 100 });

		if (response.success && response.data) {
			const drafts = response.data.data.filter((post) => post.status === 'DRAFT');
			postStore.setDrafts(drafts);

			return {
				success: true,
				data: drafts,
				message: 'Drafts loaded successfully'
			};
		}

		postStore.setDraftsLoading(false);
		return response as any;
	} catch (error) {
		postStore.setDraftsLoading(false);
		throw handleError(error);
	}
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: number): Promise<ApiResponse<void>> {
	const result = await deletePost(draftId);
	if (result.success) {
		postStore.removeDraft(draftId);
	}
	return result;
}
