<script lang="ts">
	/**
	 * RatingList Component
	 * Displays a list of seller ratings with pagination
	 * 
	 * @example
	 * <RatingList {sellerId} limit={10} />
	 */
	
	import { onMount } from 'svelte';
	import StarRating from './StarRating.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getSellerRatings, type SellerRatingResponseDTO } from '$lib/services/rating.service';
	import { formatDistanceToNow } from 'date-fns';
	
	interface Props {
		/** Seller user ID */
		sellerId: number;
		/** Number of ratings per page */
		limit?: number;
		/** Show delete/edit actions (for user's own ratings) */
		showActions?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Callback when edit is clicked */
		onEdit?: (rating: SellerRatingResponseDTO) => void;
		/** Callback when delete is clicked */
		onDelete?: (rating: SellerRatingResponseDTO) => void;
	}
	
	let {
		sellerId,
		limit = 10,
		showActions = false,
		class: className = '',
		onEdit,
		onDelete
	}: Props = $props();
	
	// State
	let ratings = $state<SellerRatingResponseDTO[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let offset = $state(0);
	let hasMore = $state(true);
	
	// Load ratings
	async function loadRatings(append: boolean = false) {
		loading = true;
		error = null;
		
		try {
			const result = await getSellerRatings(sellerId, { limit, offset });
			
			if (result.success && result.data) {
				if (append) {
					ratings = [...ratings, ...result.data];
				} else {
					ratings = result.data;
				}
				
				hasMore = result.data.length === limit;
			} else {
				error = result.error?.message || 'Failed to load ratings';
			}
		} catch (err: any) {
			error = err.message || 'An error occurred while loading ratings';
		} finally {
			loading = false;
		}
	}
	
	// Load more ratings
	function loadMore() {
		offset += limit;
		loadRatings(true);
	}
	
	// Format date
	function formatDate(dateString: string): string {
		try {
			return formatDistanceToNow(new Date(dateString), { addSuffix: true });
		} catch {
			return 'Recently';
		}
	}
	
	// Handle edit
	function handleEdit(rating: SellerRatingResponseDTO) {
		if (onEdit) {
			onEdit(rating);
		}
	}
	
	// Handle delete
	function handleDelete(rating: SellerRatingResponseDTO) {
		if (onDelete) {
			onDelete(rating);
		}
	}
	
	// Initial load
	onMount(() => {
		loadRatings();
	});
</script>

<div class="rating-list {className}">
	{#if loading && ratings.length === 0}
		<!-- Loading State -->
		<div class="loading-state">
			<Icon name="progress_activity" size={40} class="text-slate-400 animate-spin" />
			<p class="text-slate-600 dark:text-slate-400">Loading ratings...</p>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="error-state">
			<Icon name="error" size={40} class="text-red-500" />
			<p class="text-red-600 dark:text-red-400">{error}</p>
			<button
				onclick={() => loadRatings()}
				class="retry-button"
			>
				Try Again
			</button>
		</div>
	{:else if ratings.length === 0}
		<!-- Empty State -->
		<div class="empty-state">
			<Icon name="star_outline" size={48} class="text-slate-300 dark:text-slate-600" />
			<p class="text-slate-600 dark:text-slate-400">No ratings yet</p>
			<p class="text-sm text-slate-500">Be the first to rate this seller</p>
		</div>
	{:else}
		<!-- Ratings List -->
		<div class="ratings-container">
			{#each ratings as rating (rating.id)}
				<div class="rating-item">
					<!-- Header -->
					<div class="rating-header">
						<div class="rater-info">
							{#if rating.raterProfilePicture}
								<img 
									src={rating.raterProfilePicture} 
									alt={rating.raterName || 'User'} 
									class="rater-avatar"
								/>
							{:else}
								<div class="rater-avatar-placeholder">
									<Icon name="person" size={20} class="text-slate-500" />
								</div>
							{/if}
							<div>
								<p class="rater-name">{rating.raterName || 'Anonymous'}</p>
								<p class="rating-date">{formatDate(rating.createdAt)}</p>
							</div>
						</div>
						
						{#if showActions}
							<div class="rating-actions">
								<button
									onclick={() => handleEdit(rating)}
									class="action-button"
									aria-label="Edit rating"
								>
									<Icon name="edit" size={18} />
								</button>
								<button
									onclick={() => handleDelete(rating)}
									class="action-button delete"
									aria-label="Delete rating"
								>
									<Icon name="delete" size={18} />
								</button>
							</div>
						{/if}
					</div>
					
					<!-- Star Rating -->
					<div class="rating-stars">
						<StarRating rating={rating.rating} size="small" />
					</div>
					
					<!-- Comment -->
					{#if rating.comment}
						<p class="rating-comment">{rating.comment}</p>
					{/if}
					
					<!-- Post Context -->
					{#if rating.postTitle}
						<div class="post-context">
							<Icon name="sell" size={14} class="text-slate-400" />
							<span class="text-xs text-slate-500">
								Regarding: {rating.postTitle}
							</span>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		
		<!-- Load More Button -->
		{#if hasMore}
			<div class="load-more-container">
				<button
					onclick={loadMore}
					disabled={loading}
					class="load-more-button"
				>
					{#if loading}
						<Icon name="progress_activity" size={20} class="animate-spin" />
						Loading...
					{:else}
						Load More
					{/if}
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.rating-list {
		width: 100%;
	}
	
	/* States */
	.loading-state,
	.error-state,
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 1rem;
		gap: 1rem;
		text-align: center;
	}
	
	.retry-button {
		margin-top: 0.5rem;
		padding: 0.5rem 1rem;
		background-color: rgb(239 246 255);
		color: rgb(37 99 235);
		border-radius: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s;
	}
	
	.retry-button:hover {
		background-color: rgb(219 234 254);
	}
	
	/* Ratings Container */
	.ratings-container {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.rating-item {
		padding: 1.5rem;
		background-color: white;
		border: 1px solid rgb(226 232 240);
		border-radius: 0.75rem;
		transition: all 0.2s;
	}
	
	:global(.dark) .rating-item {
		background-color: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.1);
	}
	
	.rating-item:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border-color: rgb(203 213 225);
	}
	
	/* Header */
	.rating-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
	}
	
	.rater-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	
	.rater-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
	}
	
	.rater-avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background-color: rgb(241 245 249);
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	:global(.dark) .rater-avatar-placeholder {
		background-color: rgba(255, 255, 255, 0.05);
	}
	
	.rater-name {
		font-weight: 600;
		color: rgb(15 23 42);
		font-size: 0.9375rem;
	}
	
	:global(.dark) .rater-name {
		color: white;
	}
	
	.rating-date {
		font-size: 0.8125rem;
		color: rgb(100 116 139);
	}
	
	:global(.dark) .rating-date {
		color: rgb(148 163 184);
	}
	
	/* Actions */
	.rating-actions {
		display: flex;
		gap: 0.5rem;
	}
	
	.action-button {
		padding: 0.375rem;
		border-radius: 0.375rem;
		color: rgb(100 116 139);
		transition: all 0.2s;
	}
	
	.action-button:hover {
		background-color: rgb(241 245 249);
		color: rgb(15 23 42);
	}
	
	.action-button.delete:hover {
		background-color: rgb(254 242 242);
		color: rgb(220 38 38);
	}
	
	:global(.dark) .action-button:hover {
		background-color: rgba(255, 255, 255, 0.08);
		color: white;
	}
	
	/* Stars */
	.rating-stars {
		margin-bottom: 0.75rem;
	}
	
	/* Comment */
	.rating-comment {
		color: rgb(51 65 85);
		line-height: 1.6;
		margin-bottom: 0.75rem;
	}
	
	:global(.dark) .rating-comment {
		color: rgb(203 213 225);
	}
	
	/* Post Context */
	.post-context {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding-top: 0.75rem;
		border-top: 1px solid rgb(241 245 249);
	}
	
	:global(.dark) .post-context {
		border-top-color: rgba(255, 255, 255, 0.05);
	}
	
	/* Load More */
	.load-more-container {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
	}
	
	.load-more-button {
		padding: 0.625rem 1.5rem;
		background-color: white;
		border: 1px solid rgb(226 232 240);
		border-radius: 0.5rem;
		font-weight: 500;
		color: rgb(51 65 85);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s;
	}
	
	.load-more-button:hover:not(:disabled) {
		background-color: rgb(248 250 252);
		border-color: rgb(203 213 225);
	}
	
	.load-more-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	
	:global(.dark) .load-more-button {
		background-color: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.1);
		color: rgb(203 213 225);
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>
