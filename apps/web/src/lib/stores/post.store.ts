import { writable, derived, get } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';
import type { PostResponseDTO, FeedOptionsDTO } from '$types/post.types';
import type { PaginatedResponse } from '$types/api.types';

// ============================================================================
// Types
// ============================================================================

interface PostState {
	// Feed posts (main feed)
	feedPosts: PostResponseDTO[];
	feedLoading: boolean;
	feedError: string | null;
	feedHasMore: boolean;
	feedPage: number;

	// User posts
	userPosts: Record<number, PostResponseDTO[]>;
	userPostsLoading: Record<number, boolean>;
	userPostsError: Record<number, string | null>;

	// Single post cache
	posts: Record<number, PostResponseDTO>;
	postLoading: Record<number, boolean>;
	postError: Record<number, string | null>;

	// My posts (current user)
	myPosts: PostResponseDTO[];
	myPostsLoading: boolean;
	myPostsError: string | null;
	myPostsHasMore: boolean;
	myPostsPage: number;

	// Drafts
	drafts: PostResponseDTO[];
	draftsLoading: boolean;

	// Search results
	searchResults: PostResponseDTO[];
	searchLoading: boolean;
	searchError: string | null;
	searchHasMore: boolean;
	searchPage: number;
	lastSearchQuery: string | null;
}

const initialState: PostState = {
	feedPosts: [],
	feedLoading: false,
	feedError: null,
	feedHasMore: true,
	feedPage: 1,

	userPosts: {},
	userPostsLoading: {},
	userPostsError: {},

	posts: {},
	postLoading: {},
	postError: {},

	myPosts: [],
	myPostsLoading: false,
	myPostsError: null,
	myPostsHasMore: true,
	myPostsPage: 1,

	drafts: [],
	draftsLoading: false,

	searchResults: [],
	searchLoading: false,
	searchError: null,
	searchHasMore: true,
	searchPage: 1,
	lastSearchQuery: null
};

// ============================================================================
// Store
// ============================================================================

function createPostStore() {
	const { subscribe, set, update }: Writable<PostState> = writable<PostState>(initialState);

	return {
		subscribe,

		// ============================================================================
		// Feed Management
		// ============================================================================

		/**
		 * Set feed posts (replaces existing)
		 */
		setFeedPosts: (posts: PostResponseDTO[], hasMore: boolean = true) => {
			update((state) => ({
				...state,
				feedPosts: posts,
				feedHasMore: hasMore,
				feedPage: 1,
				feedError: null
			}));
		},

		/**
		 * Append posts to feed (for infinite scroll)
		 */
		appendFeedPosts: (posts: PostResponseDTO[], hasMore: boolean) => {
			update((state) => ({
				...state,
				feedPosts: [...state.feedPosts, ...posts],
				feedHasMore: hasMore,
				feedPage: state.feedPage + 1
			}));
		},

		/**
		 * Set feed loading state
		 */
		setFeedLoading: (loading: boolean) => {
			update((state) => ({ ...state, feedLoading: loading }));
		},

		/**
		 * Set feed error
		 */
		setFeedError: (error: string | null) => {
			update((state) => ({ ...state, feedError: error, feedLoading: false }));
		},

		/**
		 * Reset feed (clear all posts and pagination)
		 */
		resetFeed: () => {
			update((state) => ({
				...state,
				feedPosts: [],
				feedHasMore: true,
				feedPage: 1,
				feedError: null
			}));
		},

		// ============================================================================
		// Single Post Management
		// ============================================================================

		/**
		 * Set a single post in cache
		 */
		setPost: (post: PostResponseDTO) => {
			update((state) => ({
				...state,
				posts: { ...state.posts, [post.id]: post },
				postError: { ...state.postError, [post.id]: null }
			}));
		},

		/**
		 * Set post loading state
		 */
		setPostLoading: (postId: number, loading: boolean) => {
			update((state) => ({
				...state,
				postLoading: { ...state.postLoading, [postId]: loading }
			}));
		},

		/**
		 * Set post error
		 */
		setPostError: (postId: number, error: string | null) => {
			update((state) => ({
				...state,
				postError: { ...state.postError, [postId]: error },
				postLoading: { ...state.postLoading, [postId]: false }
			}));
		},

		/**
		 * Update post in all relevant places (cache, feed, user posts, etc.)
		 */
		updatePost: (postId: number, updates: Partial<PostResponseDTO>) => {
			update((state) => {
				const newState = { ...state };

				// Update in cache
				if (newState.posts[postId]) {
					newState.posts[postId] = { ...newState.posts[postId], ...updates };
				}

				// Update in feed
				newState.feedPosts = newState.feedPosts.map((p) =>
					p.id === postId ? { ...p, ...updates } : p
				);

				// Update in my posts
				newState.myPosts = newState.myPosts.map((p) =>
					p.id === postId ? { ...p, ...updates } : p
				);

				// Update in user posts
				Object.keys(newState.userPosts).forEach((userId) => {
					newState.userPosts[Number(userId)] = newState.userPosts[Number(userId)].map((p) =>
						p.id === postId ? { ...p, ...updates } : p
					);
				});

				// Update in search results
				newState.searchResults = newState.searchResults.map((p) =>
					p.id === postId ? { ...p, ...updates } : p
				);

				return newState;
			});
		},

		/**
		 * Remove post from all places
		 */
		removePost: (postId: number) => {
			update((state) => {
				const newState = { ...state };

				// Remove from cache
				delete newState.posts[postId];
				delete newState.postLoading[postId];
				delete newState.postError[postId];

				// Remove from feed
				newState.feedPosts = newState.feedPosts.filter((p) => p.id !== postId);

				// Remove from my posts
				newState.myPosts = newState.myPosts.filter((p) => p.id !== postId);

				// Remove from user posts
				Object.keys(newState.userPosts).forEach((userId) => {
					newState.userPosts[Number(userId)] = newState.userPosts[Number(userId)].filter(
						(p) => p.id !== postId
					);
				});

				// Remove from search results
				newState.searchResults = newState.searchResults.filter((p) => p.id !== postId);

				// Remove from drafts
				newState.drafts = newState.drafts.filter((p) => p.id !== postId);

				return newState;
			});
		},

		// ============================================================================
		// Like Management (Optimistic Updates)
		// ============================================================================

		/**
		 * Toggle like with optimistic update
		 */
		toggleLike: (postId: number, isLiked: boolean) => {
			update((state) => {
				const delta = isLiked ? 1 : -1;
				const newState = { ...state };

				// Helper function to update a post
				const updatePostLike = (post: PostResponseDTO): PostResponseDTO => {
					if (post.id === postId) {
						return {
							...post,
							isLiked,
							likeCount: Math.max(0, post.likeCount + delta)
						};
					}
					return post;
				};

				// Update in cache
				if (newState.posts[postId]) {
					newState.posts[postId] = updatePostLike(newState.posts[postId]);
				}

				// Update in feed
				newState.feedPosts = newState.feedPosts.map(updatePostLike);

				// Update in my posts
				newState.myPosts = newState.myPosts.map(updatePostLike);

				// Update in user posts
				Object.keys(newState.userPosts).forEach((userId) => {
					newState.userPosts[Number(userId)] =
						newState.userPosts[Number(userId)].map(updatePostLike);
				});

				// Update in search results
				newState.searchResults = newState.searchResults.map(updatePostLike);

				return newState;
			});
		},

		// ============================================================================
		// User Posts Management
		// ============================================================================

		/**
		 * Set posts for a specific user
		 */
		setUserPosts: (userId: number, posts: PostResponseDTO[]) => {
			update((state) => ({
				...state,
				userPosts: { ...state.userPosts, [userId]: posts },
				userPostsError: { ...state.userPostsError, [userId]: null }
			}));
		},

		/**
		 * Append posts for a specific user
		 */
		appendUserPosts: (userId: number, posts: PostResponseDTO[]) => {
			update((state) => ({
				...state,
				userPosts: {
					...state.userPosts,
					[userId]: [...(state.userPosts[userId] || []), ...posts]
				}
			}));
		},

		/**
		 * Set user posts loading state
		 */
		setUserPostsLoading: (userId: number, loading: boolean) => {
			update((state) => ({
				...state,
				userPostsLoading: { ...state.userPostsLoading, [userId]: loading }
			}));
		},

		/**
		 * Set user posts error
		 */
		setUserPostsError: (userId: number, error: string | null) => {
			update((state) => ({
				...state,
				userPostsError: { ...state.userPostsError, [userId]: error },
				userPostsLoading: { ...state.userPostsLoading, [userId]: false }
			}));
		},

		// ============================================================================
		// My Posts Management
		// ============================================================================

		/**
		 * Set my posts (current user)
		 */
		setMyPosts: (posts: PostResponseDTO[], hasMore: boolean = true) => {
			update((state) => ({
				...state,
				myPosts: posts,
				myPostsHasMore: hasMore,
				myPostsPage: 1,
				myPostsError: null
			}));
		},

		/**
		 * Append to my posts
		 */
		appendMyPosts: (posts: PostResponseDTO[], hasMore: boolean) => {
			update((state) => ({
				...state,
				myPosts: [...state.myPosts, ...posts],
				myPostsHasMore: hasMore,
				myPostsPage: state.myPostsPage + 1
			}));
		},

		/**
		 * Set my posts loading state
		 */
		setMyPostsLoading: (loading: boolean) => {
			update((state) => ({ ...state, myPostsLoading: loading }));
		},

		/**
		 * Set my posts error
		 */
		setMyPostsError: (error: string | null) => {
			update((state) => ({ ...state, myPostsError: error, myPostsLoading: false }));
		},

		/**
		 * Add new post to my posts (prepend)
		 */
		addMyPost: (post: PostResponseDTO) => {
			update((state) => ({
				...state,
				myPosts: [post, ...state.myPosts]
			}));
		},

		// ============================================================================
		// Draft Management
		// ============================================================================

		/**
		 * Set drafts
		 */
		setDrafts: (drafts: PostResponseDTO[]) => {
			update((state) => ({ ...state, drafts }));
		},

		/**
		 * Add draft
		 */
		addDraft: (draft: PostResponseDTO) => {
			update((state) => ({
				...state,
				drafts: [draft, ...state.drafts]
			}));
		},

		/**
		 * Remove draft
		 */
		removeDraft: (draftId: number) => {
			update((state) => ({
				...state,
				drafts: state.drafts.filter((d) => d.id !== draftId)
			}));
		},

		/**
		 * Set drafts loading state
		 */
		setDraftsLoading: (loading: boolean) => {
			update((state) => ({ ...state, draftsLoading: loading }));
		},

		// ============================================================================
		// Search Management
		// ============================================================================

		/**
		 * Set search results
		 */
		setSearchResults: (posts: PostResponseDTO[], query: string, hasMore: boolean = true) => {
			update((state) => ({
				...state,
				searchResults: posts,
				searchHasMore: hasMore,
				searchPage: 1,
				searchError: null,
				lastSearchQuery: query
			}));
		},

		/**
		 * Append search results
		 */
		appendSearchResults: (posts: PostResponseDTO[], hasMore: boolean) => {
			update((state) => ({
				...state,
				searchResults: [...state.searchResults, ...posts],
				searchHasMore: hasMore,
				searchPage: state.searchPage + 1
			}));
		},

		/**
		 * Set search loading state
		 */
		setSearchLoading: (loading: boolean) => {
			update((state) => ({ ...state, searchLoading: loading }));
		},

		/**
		 * Set search error
		 */
		setSearchError: (error: string | null) => {
			update((state) => ({ ...state, searchError: error, searchLoading: false }));
		},

		/**
		 * Clear search results
		 */
		clearSearch: () => {
			update((state) => ({
				...state,
				searchResults: [],
				searchHasMore: true,
				searchPage: 1,
				searchError: null,
				lastSearchQuery: null
			}));
		},

		// ============================================================================
		// Utility
		// ============================================================================

		/**
		 * Reset entire store to initial state
		 */
		reset: () => {
			set(initialState);
		},

		/**
		 * Get post from cache
		 */
		getPost: (postId: number): PostResponseDTO | undefined => {
			return get(postStore).posts[postId];
		},

		/**
		 * Check if post is in cache
		 */
		hasPost: (postId: number): boolean => {
			return Boolean(get(postStore).posts[postId]);
		}
	};
}

// ============================================================================
// Export Store and Derived Stores
// ============================================================================

export const postStore = createPostStore();

// Derived stores for convenient access
export const feedPosts: Readable<PostResponseDTO[]> = derived(
	postStore,
	($store) => $store.feedPosts
);
export const feedLoading: Readable<boolean> = derived(postStore, ($store) => $store.feedLoading);
export const feedError: Readable<string | null> = derived(postStore, ($store) => $store.feedError);
export const feedHasMore: Readable<boolean> = derived(postStore, ($store) => $store.feedHasMore);

export const myPosts: Readable<PostResponseDTO[]> = derived(postStore, ($store) => $store.myPosts);
export const myPostsLoading: Readable<boolean> = derived(
	postStore,
	($store) => $store.myPostsLoading
);
export const myPostsError: Readable<string | null> = derived(
	postStore,
	($store) => $store.myPostsError
);
export const myPostsHasMore: Readable<boolean> = derived(
	postStore,
	($store) => $store.myPostsHasMore
);

export const drafts: Readable<PostResponseDTO[]> = derived(postStore, ($store) => $store.drafts);
export const draftsLoading: Readable<boolean> = derived(
	postStore,
	($store) => $store.draftsLoading
);

export const searchResults: Readable<PostResponseDTO[]> = derived(
	postStore,
	($store) => $store.searchResults
);
export const searchLoading: Readable<boolean> = derived(
	postStore,
	($store) => $store.searchLoading
);
export const searchError: Readable<string | null> = derived(
	postStore,
	($store) => $store.searchError
);
