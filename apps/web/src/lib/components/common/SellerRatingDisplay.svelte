<script lang="ts">
	/**
	 * SellerRatingDisplay Component
	 * Displays seller's rating score badge with stars
	 * 
	 * @example
	 * <SellerRatingDisplay {sellerScore} size="medium" />
	 */
	
	import StarRating from './StarRating.svelte';
	import { formatRatingDisplay, getRatingColorClass } from '$lib/services/rating.service';
	import type { SellerScoreDTO } from '$types/rating.types';
	
	interface Props {
		/** Seller score data */
		sellerScore: SellerScoreDTO;
		/** Display size */
		size?: 'small' | 'medium' | 'large';
		/** Show full details (distribution link, total count) */
		showDetails?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Callback when clicked (for navigation to reviews) */
		onClick?: () => void;
	}
	
	let {
		sellerScore,
		size = 'medium',
		showDetails = false,
		class: className = '',
		onClick
	}: Props = $props();
	
	// Size configurations
	const sizes = {
		small: { 
			starSize: 'small',
			textClass: 'text-sm',
			badgeClass: 'px-2 py-1'
		},
		medium: { 
			starSize: 'medium',
			textClass: 'text-base',
			badgeClass: 'px-3 py-1.5'
		},
		large: { 
			starSize: 'large',
			textClass: 'text-lg',
			badgeClass: 'px-4 py-2'
		}
	};
	
	const sizeConfig = $derived(sizes[size]);
	
	// Display text and logic
	const displayText = $derived(formatRatingDisplay(sellerScore));
	const hasRatings = $derived(sellerScore.totalRatings > 0);
	const showStars = $derived(sellerScore.totalRatings >= 3);
	const colorClass = $derived(hasRatings ? getRatingColorClass(sellerScore.averageRating) : 'text-slate-500');
	
	// Click handler
	function handleClick() {
		if (onClick) {
			onClick();
		}
	}
</script>

<div 
	class="seller-rating-display {sizeConfig.textClass} {className}"
	class:clickable={!!onClick}
	onclick={handleClick}
	role={onClick ? 'button' : undefined}
	tabindex={onClick ? 0 : undefined}
	onkeydown={(e) => { if (onClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); handleClick(); } }}
>
	<!-- Badge Container -->
	<div class="rating-badge {sizeConfig.badgeClass} {colorClass}" class:new-seller={!hasRatings}>
		{#if showStars}
			<!-- Show stars for established sellers (3+ ratings) -->
			<div class="flex items-center gap-2">
				<StarRating 
					rating={sellerScore.averageRating}
					size={sizeConfig.starSize}
					showValue={false}
				/>
				<span class="font-semibold">
					{sellerScore.averageRating.toFixed(1)}
				</span>
			</div>
		{:else}
			<!-- Show text for new/low-rating sellers -->
			<span class="font-medium">
				{displayText}
			</span>
		{/if}
	</div>
	
	<!-- Details -->
	{#if showDetails && hasRatings}
		<div class="rating-details {sizeConfig.textClass}">
			<span class="text-slate-600 dark:text-slate-400">
				({sellerScore.totalRatings} {sellerScore.totalRatings === 1 ? 'rating' : 'ratings'})
			</span>
			{#if sellerScore.positiveRatings > 0}
				<span class="text-green-600 dark:text-green-400">
					· {Math.round((sellerScore.positiveRatings / sellerScore.totalRatings) * 100)}% positive
				</span>
			{/if}
		</div>
	{/if}
</div>

<style>
	.seller-rating-display {
		display: inline-flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	
	.rating-badge {
		display: inline-flex;
		align-items: center;
		border-radius: 9999px;
		background-color: rgb(248 250 252);
		border: 1px solid rgb(226 232 240);
		transition: all 0.2s ease;
	}
	
	:global(.dark) .rating-badge {
		background-color: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}
	
	.rating-badge.new-seller {
		color: rgb(100 116 139);
	}
	
	:global(.dark) .rating-badge.new-seller {
		color: rgb(148 163 184);
	}
	
	.clickable {
		cursor: pointer;
	}
	
	.clickable .rating-badge:hover {
		background-color: rgb(241 245 249);
		border-color: rgb(203 213 225);
		transform: scale(1.02);
	}
	
	:global(.dark) .clickable .rating-badge:hover {
		background-color: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.15);
	}
	
	.clickable:focus-visible {
		outline: 2px solid rgb(59 130 246);
		outline-offset: 2px;
		border-radius: 0.5rem;
	}
	
	.rating-details {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875em;
	}
</style>
