<script lang="ts">
	/**
	 * StarRating Component
	 * Displays or allows input of a 1-5 star rating
	 * 
	 * @example
	 * <!-- Display mode -->
	 * <StarRating rating={4.5} />
	 * 
	 * <!-- Interactive mode -->
	 * <StarRating bind:rating={userRating} interactive={true} />
	 */
	
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getRatingColorClass } from '$lib/services/rating.service';
	
	interface Props {
		/** Current rating value (0-5) */
		rating?: number;
		/** Whether user can click to change rating */
		interactive?: boolean;
		/** Size variant */
		size?: 'small' | 'medium' | 'large';
		/** Show numeric value next to stars */
		showValue?: boolean;
		/** Maximum stars to display */
		maxStars?: number;
		/** Additional CSS classes */
		class?: string;
		/** Callback when rating changes (for interactive mode) */
		onChange?: (rating: number) => void;
	}
	
	let {
		rating = $bindable(0),
		interactive = false,
		size = 'medium',
		showValue = false,
		maxStars = 5,
		class: className = '',
		onChange
	}: Props = $props();
	
	// Hover state for interactive mode
	let hoverRating = $state(0);
	
	// Size configurations
	const sizes = {
		small: { iconSize: 16, textClass: 'text-sm' },
		medium: { iconSize: 24, textClass: 'text-base' },
		large: { iconSize: 32, textClass: 'text-lg' }
	};
	
	const sizeConfig = $derived(sizes[size]);
	
	// Color class based on rating
	const colorClass = $derived(getRatingColorClass(rating));
	
	// Handle star click
	function handleStarClick(starValue: number) {
		if (!interactive) return;
		
		rating = starValue;
		hoverRating = 0;
		
		if (onChange) {
			onChange(starValue);
		}
	}
	
	// Handle mouse enter
	function handleMouseEnter(starValue: number) {
		if (!interactive) return;
		hoverRating = starValue;
	}
	
	// Handle mouse leave
	function handleMouseLeave() {
		if (!interactive) return;
		hoverRating = 0;
	}
	
	// Determine if star should be filled
	function isStarFilled(starIndex: number): boolean {
		const displayRating = hoverRating || rating;
		
		// Full star
		if (starIndex <= Math.floor(displayRating)) {
			return true;
		}
		
		// Partial star (only in display mode)
		if (!interactive && starIndex === Math.ceil(displayRating)) {
			const fraction = displayRating % 1;
			return fraction >= 0.3; // Show filled if at least 30% filled
		}
		
		return false;
	}
	
	// Get star icon name
	function getStarIcon(starIndex: number): string {
		const displayRating = hoverRating || rating;
		
		if (starIndex <= Math.floor(displayRating)) {
			return 'star'; // Filled star
		}
		
		// Half star for display mode
		if (!interactive && starIndex === Math.ceil(displayRating)) {
			const fraction = displayRating % 1;
			if (fraction >= 0.3 && fraction < 0.7) {
				return 'star_half';
			} else if (fraction >= 0.7) {
				return 'star';
			}
		}
		
		return 'star_outline'; // Empty star
	}
</script>

<div class="star-rating {className}" class:interactive>
	<div class="stars-container" role={interactive ? 'radiogroup' : 'img'} aria-label="Rating">
		{#each Array.from({ length: maxStars }, (_, i) => i + 1) as starValue}
			<button
				type="button"
				class="star-button {colorClass}"
				class:pointer-events-none={!interactive}
				class:cursor-pointer={interactive}
				disabled={!interactive}
				onclick={() => handleStarClick(starValue)}
				onmouseenter={() => handleMouseEnter(starValue)}
				onmouseleave={handleMouseLeave}
				aria-label="{starValue} star{starValue === 1 ? '' : 's'}"
				role={interactive ? 'radio' : undefined}
				aria-checked={interactive && rating === starValue}
			>
				<Icon 
					name={getStarIcon(starValue)} 
					size={sizeConfig.iconSize}
					fill={isStarFilled(starValue) ? 1 : 0}
					weight={500}
				/>
			</button>
		{/each}
	</div>
	
	{#if showValue && rating > 0}
		<span class="rating-value {sizeConfig.textClass} {colorClass}">
			{rating.toFixed(1)}
		</span>
	{/if}
</div>

<style>
	.star-rating {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.stars-container {
		display: inline-flex;
		gap: 0.125rem;
	}
	
	.star-button {
		background: none;
		border: none;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: transform 0.2s ease, opacity 0.2s ease;
	}
	
	.star-button:disabled {
		cursor: default;
	}
	
	.interactive .star-button:not(:disabled):hover {
		transform: scale(1.1);
	}
	
	.interactive .star-button:not(:disabled):active {
		transform: scale(0.95);
	}
	
	.rating-value {
		font-weight: 600;
		line-height: 1;
	}
	
	/* Accessibility */
	.star-button:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
		border-radius: 0.125rem;
	}
</style>
