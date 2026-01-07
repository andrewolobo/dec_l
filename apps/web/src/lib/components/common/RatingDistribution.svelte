<script lang="ts">
	/**
	 * RatingDistribution Component
	 * Shows a bar chart visualization of rating distribution (1-5 stars)
	 * 
	 * @example
	 * <RatingDistribution {sellerId} />
	 */
	
	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getRatingDistribution, calculateRatingPercentage, type RatingDistributionDTO } from '$lib/services/rating.service';
	
	interface Props {
		/** Seller user ID */
		sellerId: number;
		/** Additional CSS classes */
		class?: string;
	}
	
	let {
		sellerId,
		class: className = ''
	}: Props = $props();
	
	// State
	let distribution = $state<RatingDistributionDTO | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	
	// Load distribution
	async function loadDistribution() {
		loading = true;
		error = null;
		
		try {
			const result = await getRatingDistribution(sellerId);
			
			if (result.success && result.data) {
				distribution = result.data;
			} else {
				error = result.error?.message || 'Failed to load distribution';
			}
		} catch (err: any) {
			error = err.message || 'An error occurred while loading distribution';
		} finally {
			loading = false;
		}
	}
	
	// Calculate bar widths
	const bars = $derived(() => {
		if (!distribution) return [];
		
		return [5, 4, 3, 2, 1].map(stars => ({
			stars,
			count: distribution.distribution[stars as keyof typeof distribution.distribution],
			percentage: calculateRatingPercentage(
				distribution.distribution[stars as keyof typeof distribution.distribution],
				distribution.totalRatings
			)
		}));
	});
	
	// Initial load
	onMount(() => {
		loadDistribution();
	});
</script>

<div class="rating-distribution {className}">
	{#if loading}
		<!-- Loading State -->
		<div class="loading-state">
			<Icon name="progress_activity" size={32} class="text-slate-400 animate-spin" />
			<p class="text-sm text-slate-600 dark:text-slate-400">Loading distribution...</p>
		</div>
	{:else if error}
		<!-- Error State -->
		<div class="error-state">
			<Icon name="error" size={32} class="text-red-500" />
			<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
		</div>
	{:else if distribution && distribution.totalRatings > 0}
		<!-- Distribution Bars -->
		<div class="distribution-container">
			<h3 class="distribution-title">Rating Breakdown</h3>
			
			<div class="bars-container">
				{#each bars() as bar (bar.stars)}
					<div class="bar-row">
						<!-- Star Label -->
						<div class="star-label">
							<span class="text-sm font-medium text-slate-700 dark:text-slate-300">
								{bar.stars}
							</span>
							<Icon name="star" size={16} class="text-amber-500" fill={1} />
						</div>
						
						<!-- Bar -->
						<div class="bar-container">
							<div 
								class="bar-fill" 
								style="width: {bar.percentage}%"
								class:bar-5={bar.stars === 5}
								class:bar-4={bar.stars === 4}
								class:bar-3={bar.stars === 3}
								class:bar-2={bar.stars === 2}
								class:bar-1={bar.stars === 1}
							></div>
						</div>
						
						<!-- Count -->
						<div class="count-label">
							<span class="text-sm text-slate-600 dark:text-slate-400">
								{bar.count}
							</span>
						</div>
						
						<!-- Percentage -->
						<div class="percentage-label">
							<span class="text-xs text-slate-500">
								{bar.percentage}%
							</span>
						</div>
					</div>
				{/each}
			</div>
			
			<!-- Total -->
			<div class="total-summary">
				<span class="text-sm text-slate-600 dark:text-slate-400">
					Based on {distribution.totalRatings} {distribution.totalRatings === 1 ? 'rating' : 'ratings'}
				</span>
			</div>
		</div>
	{:else}
		<!-- Empty State -->
		<div class="empty-state">
			<Icon name="bar_chart" size={40} class="text-slate-300 dark:text-slate-600" />
			<p class="text-sm text-slate-600 dark:text-slate-400">No rating data available</p>
		</div>
	{/if}
</div>

<style>
	.rating-distribution {
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
		padding: 2rem 1rem;
		gap: 0.75rem;
		text-align: center;
	}
	
	/* Distribution Container */
	.distribution-container {
		padding: 1.5rem;
		background-color: white;
		border: 1px solid rgb(226 232 240);
		border-radius: 0.75rem;
	}
	
	:global(.dark) .distribution-container {
		background-color: rgba(255, 255, 255, 0.03);
		border-color: rgba(255, 255, 255, 0.1);
	}
	
	.distribution-title {
		font-size: 1rem;
		font-weight: 600;
		color: rgb(15 23 42);
		margin-bottom: 1.25rem;
	}
	
	:global(.dark) .distribution-title {
		color: white;
	}
	
	/* Bars */
	.bars-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	
	.bar-row {
		display: grid;
		grid-template-columns: auto 1fr auto auto;
		align-items: center;
		gap: 0.75rem;
	}
	
	.star-label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		min-width: 2.5rem;
	}
	
	.bar-container {
		position: relative;
		height: 1.5rem;
		background-color: rgb(241 245 249);
		border-radius: 0.25rem;
		overflow: hidden;
	}
	
	:global(.dark) .bar-container {
		background-color: rgba(255, 255, 255, 0.05);
	}
	
	.bar-fill {
		position: absolute;
		top: 0;
		left: 0;
		height: 100%;
		border-radius: 0.25rem;
		transition: width 0.5s ease-out;
	}
	
	.bar-fill.bar-5 {
		background: linear-gradient(to right, rgb(34 197 94), rgb(22 163 74));
	}
	
	.bar-fill.bar-4 {
		background: linear-gradient(to right, rgb(132 204 22), rgb(101 163 13));
	}
	
	.bar-fill.bar-3 {
		background: linear-gradient(to right, rgb(250 204 21), rgb(234 179 8));
	}
	
	.bar-fill.bar-2 {
		background: linear-gradient(to right, rgb(251 146 60), rgb(249 115 22));
	}
	
	.bar-fill.bar-1 {
		background: linear-gradient(to right, rgb(239 68 68), rgb(220 38 38));
	}
	
	.count-label {
		min-width: 2rem;
		text-align: right;
	}
	
	.percentage-label {
		min-width: 2.5rem;
		text-align: right;
	}
	
	/* Total Summary */
	.total-summary {
		padding-top: 1rem;
		border-top: 1px solid rgb(241 245 249);
		text-align: center;
	}
	
	:global(.dark) .total-summary {
		border-top-color: rgba(255, 255, 255, 0.05);
	}
	
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
	
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}
</style>
