<script lang="ts">
	/**
	 * RatingModal Component
	 * Modal for submitting or editing a seller rating
	 * 
	 * @example
	 * <RatingModal 
	 *   bind:open={showModal}
	 *   {sellerId}
	 *   {postId}
	 *   {existingRating}
	 *   onSubmit={handleRatingSubmitted}
	 * />
	 */
	
	import Modal from '$lib/components/overlay/Modal.svelte';
	import StarRating from '$lib/components/common/StarRating.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { createRating, updateRating, type RateSellerDTO, type UpdateRatingDTO, type SellerRatingResponseDTO } from '$lib/services/rating.service';
	import { isValidComment } from '$lib/services/rating.service';
	
	interface Props {
		/** Whether modal is open */
		open?: boolean;
		/** Seller user ID being rated */
		sellerId: number;
		/** Optional post ID context */
		postId?: number;
		/** Existing rating (for edit mode) */
		existingRating?: SellerRatingResponseDTO;
		/** Seller name for display */
		sellerName?: string;
		/** Callback when rating is successfully submitted */
		onSubmit?: (rating: SellerRatingResponseDTO) => void;
		/** Callback when modal is closed */
		onClose?: () => void;
	}
	
	let {
		open = $bindable(false),
		sellerId,
		postId,
		existingRating,
		sellerName = 'this seller',
		onSubmit,
		onClose
	}: Props = $props();
	
	// Form state
	let rating = $state(existingRating?.rating || 0);
	let comment = $state(existingRating?.comment || '');
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);
	
	// Edit mode
	const isEditMode = $derived(!!existingRating);
	
	// Form validation
	const isRatingValid = $derived(rating >= 1 && rating <= 5);
	const isCommentValid = $derived(isValidComment(comment));
	const canSubmit = $derived(isRatingValid && isCommentValid && !isSubmitting);
	
	// Character count
	const remainingChars = $derived(1000 - comment.length);
	const showCharacterWarning = $derived(remainingChars < 100);
	
	// Reset form when modal opens
	$effect(() => {
		if (open) {
			rating = existingRating?.rating || 0;
			comment = existingRating?.comment || '';
			error = null;
			success = false;
		}
	});
	
	// Handle rating change
	function handleRatingChange(newRating: number) {
		rating = newRating;
		error = null;
	}
	
	// Handle submit
	async function handleSubmit() {
		if (!canSubmit) return;
		
		isSubmitting = true;
		error = null;
		
		try {
			let result;
			
			if (isEditMode) {
				// Update existing rating
				const updateData: UpdateRatingDTO = {
					rating,
					comment: comment.trim() || undefined
				};
				result = await updateRating(existingRating.id, updateData);
			} else {
				// Create new rating
				const createData: RateSellerDTO = {
					sellerId,
					postId,
					rating,
					comment: comment.trim() || undefined
				};
				result = await createRating(createData);
			}
			
			if (result.success && result.data) {
				success = true;
				
				// Call callback after short delay to show success state
				setTimeout(() => {
					if (onSubmit) {
						onSubmit(result.data!);
					}
					handleClose();
				}, 800);
			} else {
				error = result.error?.message || 'Failed to submit rating';
			}
		} catch (err: any) {
			error = err.message || 'An error occurred while submitting your rating';
		} finally {
			isSubmitting = false;
		}
	}
	
	// Handle close
	function handleClose() {
		open = false;
		if (onClose) {
			onClose();
		}
	}
	
	// Handle textarea input
	function handleCommentInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		comment = target.value;
	}
</script>

<Modal bind:open onClose={handleClose} title="{isEditMode ? 'Edit' : 'Submit'} Rating" size="md">
	{#snippet children()}
		<div class="rating-modal-content">
			{#if success}
				<!-- Success State -->
				<div class="success-state">
					<div class="success-icon">
						<Icon name="check_circle" size={64} class="text-green-500" />
					</div>
					<h3 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
						Rating {isEditMode ? 'Updated' : 'Submitted'}!
					</h3>
					<p class="text-slate-600 dark:text-slate-400">
						Thank you for your feedback
					</p>
				</div>
			{:else}
				<!-- Form -->
				<div class="space-y-6">
					<!-- Description -->
					<p class="text-slate-600 dark:text-slate-400">
						{isEditMode ? 'Update your rating for' : 'Rate your experience with'} <span class="font-semibold text-slate-900 dark:text-white">{sellerName}</span>
					</p>
					
					<!-- Star Rating Input -->
					<div class="rating-input-section">
						<label class="block text-sm font-semibold text-slate-900 dark:text-white mb-3">
							Your Rating <span class="text-red-500">*</span>
						</label>
						<div class="flex justify-center">
							<StarRating 
								bind:rating={rating}
								interactive={true}
								size="large"
								onChange={handleRatingChange}
							/>
						</div>
						{#if rating > 0}
							<p class="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
								{#if rating === 5}
									Excellent!
								{:else if rating === 4}
									Good
								{:else if rating === 3}
									Average
								{:else if rating === 2}
									Below Average
								{:else}
									Poor
								{/if}
							</p>
						{/if}
					</div>
					
					<!-- Comment Input -->
					<div class="comment-input-section">
						<label for="comment" class="block text-sm font-semibold text-slate-900 dark:text-white mb-2">
							Your Review <span class="text-slate-500 font-normal">(Optional)</span>
						</label>
						<textarea
							id="comment"
							bind:value={comment}
							oninput={handleCommentInput}
							placeholder="Share details about your experience..."
							class="w-full px-4 py-3 border border-gray-300 dark:border-white/10 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 resize-none"
							rows="4"
							maxlength="1000"
						></textarea>
						<div class="flex justify-between items-center mt-1">
							<p class="text-xs text-slate-500">
								Be respectful and constructive
							</p>
							<p class="text-xs" class:text-slate-500={!showCharacterWarning} class:text-orange-500={showCharacterWarning && remainingChars > 0} class:text-red-500={remainingChars < 0}>
								{remainingChars} characters remaining
							</p>
						</div>
					</div>
					
					<!-- Error Message -->
					{#if error}
						<div class="error-alert">
							<Icon name="error" size={20} class="text-red-500" />
							<p class="text-sm text-red-600 dark:text-red-400">
								{error}
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/snippet}
	
	{#snippet footer()}
		{#if !success}
			<button
				type="button"
				onclick={handleClose}
				class="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors"
				disabled={isSubmitting}
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSubmit}
				disabled={!canSubmit}
				class="px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
			>
				{#if isSubmitting}
					<Icon name="progress_activity" size={20} class="animate-spin" />
					Submitting...
				{:else}
					{isEditMode ? 'Update Rating' : 'Submit Rating'}
				{/if}
			</button>
		{/if}
	{/snippet}
</Modal>

<style>
	.rating-modal-content {
		min-height: 300px;
		display: flex;
		flex-direction: column;
	}
	
	.success-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 2rem;
	}
	
	.success-icon {
		margin-bottom: 1rem;
		animation: scaleIn 0.4s ease-out;
	}
	
	.error-alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background-color: rgb(254 242 242);
		border: 1px solid rgb(254 226 226);
		border-radius: 0.5rem;
	}
	
	:global(.dark) .error-alert {
		background-color: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.2);
	}
	
	@keyframes scaleIn {
		from {
			transform: scale(0);
			opacity: 0;
		}
		to {
			transform: scale(1);
			opacity: 1;
		}
	}
	
	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
	
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>
