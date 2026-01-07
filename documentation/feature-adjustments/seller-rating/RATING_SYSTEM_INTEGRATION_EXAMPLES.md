# Rating System Integration Examples

This document provides complete examples of integrating the rating system components into various pages.

## Components Overview

The rating system consists of the following components:

1. **StarRating** - Display or input star ratings
2. **SellerRatingDisplay** - Show seller's rating badge
3. **RatingModal** - Modal for creating/editing ratings
4. **RatingList** - List of ratings with pagination
5. **RatingDistribution** - Bar chart of rating breakdown

## Example 1: Seller Profile Page

```svelte
<!-- routes/profile/[userId]/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
	import RatingList from '$lib/components/common/RatingList.svelte';
	import RatingDistribution from '$lib/components/common/RatingDistribution.svelte';
	import RatingModal from '$lib/components/overlay/RatingModal.svelte';
	import { getSellerScore, canRateSeller, type SellerScoreDTO, type SellerRatingResponseDTO } from '$lib/services/rating.service';
	import { authStore } from '$lib/stores/auth.store';
	
	// Get user ID from route params
	const userId = $derived(parseInt($page.params.userId));
	
	// State
	let sellerScore = $state<SellerScoreDTO | null>(null);
	let canRate = $state(false);
	let showRatingModal = $state(false);
	let editingRating = $state<SellerRatingResponseDTO | null>(null);
	
	// Check if current user can rate this seller
	async function checkEligibility() {
		if (!$authStore.isAuthenticated || $authStore.user?.id === userId) {
			canRate = false;
			return;
		}
		
		try {
			const result = await canRateSeller({ sellerId: userId });
			canRate = result.success && result.data?.canRate || false;
		} catch (error) {
			console.error('Failed to check rating eligibility:', error);
			canRate = false;
		}
	}
	
	// Load seller score
	async function loadSellerScore() {
		try {
			const result = await getSellerScore(userId);
			if (result.success && result.data) {
				sellerScore = result.data;
			}
		} catch (error) {
			console.error('Failed to load seller score:', error);
		}
	}
	
	// Handle rating submitted
	function handleRatingSubmitted(rating: SellerRatingResponseDTO) {
		showRatingModal = false;
		editingRating = null;
		// Reload seller score to reflect new rating
		loadSellerScore();
		// Optionally reload rating list
	}
	
	// Handle edit rating
	function handleEditRating(rating: SellerRatingResponseDTO) {
		editingRating = rating;
		showRatingModal = true;
	}
	
	onMount(() => {
		loadSellerScore();
		checkEligibility();
	});
</script>

<div class="profile-page">
	<!-- Seller Info Header -->
	<div class="seller-header">
		<div class="seller-info">
			<img src={sellerAvatar} alt={sellerName} class="seller-avatar" />
			<div>
				<h1>{sellerName}</h1>
				<p>Member since {memberSince}</p>
			</div>
		</div>
		
		<!-- Rating Badge -->
		{#if sellerScore}
			<SellerRatingDisplay 
				{sellerScore}
				size="large"
				showDetails={true}
				onClick={() => {
					// Scroll to reviews section
					document.getElementById('reviews-section')?.scrollIntoView({ behavior: 'smooth' });
				}}
			/>
		{/if}
	</div>
	
	<!-- Rate Seller Button -->
	{#if canRate}
		<div class="actions">
			<button 
				onclick={() => { showRatingModal = true; }}
				class="btn-primary"
			>
				Rate this Seller
			</button>
		</div>
	{/if}
	
	<!-- Reviews Section -->
	<section id="reviews-section" class="reviews-section">
		<h2>Customer Reviews</h2>
		
		<!-- Rating Distribution -->
		{#if sellerScore && sellerScore.totalRatings > 0}
			<RatingDistribution sellerId={userId} />
		{/if}
		
		<!-- Rating List -->
		<div class="reviews-list">
			<RatingList 
				sellerId={userId}
				limit={10}
			/>
		</div>
	</section>
	
	<!-- Rating Modal -->
	<RatingModal 
		bind:open={showRatingModal}
		sellerId={userId}
		existingRating={editingRating}
		sellerName={sellerName}
		onSubmit={handleRatingSubmitted}
	/>
</div>

<style>
	.profile-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}
	
	.seller-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 2rem;
		background: white;
		border-radius: 1rem;
		margin-bottom: 2rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.seller-info {
		display: flex;
		gap: 1.5rem;
		align-items: center;
	}
	
	.seller-avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		object-fit: cover;
	}
	
	.actions {
		margin-bottom: 2rem;
	}
	
	.reviews-section {
		margin-top: 3rem;
	}
	
	.reviews-section h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 1.5rem;
	}
	
	.reviews-list {
		margin-top: 2rem;
	}
	
	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: #3b82f6;
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		transition: all 0.2s;
	}
	
	.btn-primary:hover {
		background: #2563eb;
	}
</style>
```

## Example 2: Post Details Page

```svelte
<!-- routes/post/[id]/+page.svelte -->
<script lang="ts">
	import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
	import { getSellerScore, type SellerScoreDTO } from '$lib/services/rating.service';
	import { onMount } from 'svelte';
	
	export let post: PostResponseDTO;
	
	let sellerScore = $state<SellerScoreDTO | null>(null);
	
	async function loadSellerScore() {
		if (!post.userId) return;
		
		try {
			const result = await getSellerScore(post.userId);
			if (result.success && result.data) {
				sellerScore = result.data;
			}
		} catch (error) {
			console.error('Failed to load seller score:', error);
		}
	}
	
	onMount(() => {
		loadSellerScore();
	});
</script>

<div class="post-details">
	<!-- Post Content -->
	<div class="post-content">
		<h1>{post.title}</h1>
		<p>{post.description}</p>
		<p class="price">${post.price}</p>
	</div>
	
	<!-- Seller Info Card -->
	<div class="seller-card">
		<h3>Seller Information</h3>
		<div class="seller-info">
			<img src={post.userProfilePicture} alt={post.userName} />
			<div>
				<a href="/profile/{post.userId}" class="seller-name">
					{post.userName}
				</a>
				{#if sellerScore}
					<SellerRatingDisplay 
						{sellerScore}
						size="small"
						onClick={() => {
							window.location.href = `/profile/${post.userId}#reviews-section`;
						}}
					/>
				{/if}
			</div>
		</div>
		
		<button class="btn-contact">
			Contact Seller
		</button>
	</div>
</div>
```

## Example 3: Message Thread - Rate After Transaction

```svelte
<!-- routes/messages/[threadId]/+page.svelte -->
<script lang="ts">
	import RatingModal from '$lib/components/overlay/RatingModal.svelte';
	import { canRateSeller } from '$lib/services/rating.service';
	
	export let thread: MessageThread;
	export let otherUser: User; // The other participant
	
	let showRatingPrompt = $state(false);
	let showRatingModal = $state(false);
	
	// Check if user can rate after message exchange
	async function checkIfCanRate() {
		try {
			const result = await canRateSeller({ 
				sellerId: otherUser.id,
				postId: thread.postId 
			});
			
			if (result.success && result.data?.canRate) {
				// Show rating prompt if eligible
				showRatingPrompt = true;
			}
		} catch (error) {
			console.error('Failed to check rating eligibility:', error);
		}
	}
	
	onMount(() => {
		checkIfCanRate();
	});
</script>

<div class="message-thread">
	<!-- Messages -->
	<div class="messages">
		{#each messages as message}
			<!-- Message display -->
		{/each}
	</div>
	
	<!-- Rating Prompt Banner -->
	{#if showRatingPrompt}
		<div class="rating-prompt">
			<div class="prompt-content">
				<Icon name="star" size={24} class="text-amber-500" />
				<div>
					<p class="font-semibold">How was your experience with {otherUser.fullName}?</p>
					<p class="text-sm text-slate-600">Help others by sharing your feedback</p>
				</div>
			</div>
			<button 
				onclick={() => { showRatingModal = true; showRatingPrompt = false; }}
				class="btn-rate"
			>
				Rate Now
			</button>
		</div>
	{/if}
	
	<!-- Rating Modal -->
	<RatingModal 
		bind:open={showRatingModal}
		sellerId={otherUser.id}
		postId={thread.postId}
		sellerName={otherUser.fullName}
		onSubmit={() => {
			showRatingPrompt = false;
			// Show success toast
		}}
	/>
</div>

<style>
	.rating-prompt {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: linear-gradient(to right, #fef3c7, #fde68a);
		border-radius: 0.75rem;
		margin-top: 1rem;
	}
	
	.prompt-content {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	
	.btn-rate {
		padding: 0.5rem 1.25rem;
		background: white;
		border-radius: 0.5rem;
		font-weight: 600;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
</style>
```

## Example 4: User's Own Ratings List

```svelte
<!-- routes/profile/my-ratings/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import RatingList from '$lib/components/common/RatingList.svelte';
	import RatingModal from '$lib/components/overlay/RatingModal.svelte';
	import { getMyRatings, deleteRating, type SellerRatingResponseDTO } from '$lib/services/rating.service';
	import { authStore } from '$lib/stores/auth.store';
	
	let myRatings = $state<SellerRatingResponseDTO[]>([]);
	let editingRating = $state<SellerRatingResponseDTO | null>(null);
	let showRatingModal = $state(false);
	
	async function loadMyRatings() {
		try {
			const result = await getMyRatings({ limit: 20 });
			if (result.success && result.data) {
				myRatings = result.data;
			}
		} catch (error) {
			console.error('Failed to load ratings:', error);
		}
	}
	
	async function handleDelete(rating: SellerRatingResponseDTO) {
		if (!confirm('Are you sure you want to delete this rating?')) return;
		
		try {
			await deleteRating(rating.id);
			// Reload list
			loadMyRatings();
		} catch (error) {
			alert('Failed to delete rating');
		}
	}
	
	function handleEdit(rating: SellerRatingResponseDTO) {
		editingRating = rating;
		showRatingModal = true;
	}
	
	onMount(() => {
		loadMyRatings();
	});
</script>

<div class="my-ratings-page">
	<h1>My Ratings</h1>
	<p class="subtitle">Ratings you've given to sellers</p>
	
	<RatingList 
		sellerId={$authStore.user?.id || 0}
		showActions={true}
		onEdit={handleEdit}
		onDelete={handleDelete}
	/>
	
	<RatingModal 
		bind:open={showRatingModal}
		sellerId={editingRating?.sellerId || 0}
		existingRating={editingRating}
		onSubmit={() => {
			showRatingModal = false;
			loadMyRatings();
		}}
	/>
</div>
```

## Example 5: Browse Page - Show Seller Ratings

```svelte
<!-- routes/browse/+page.svelte -->
<script lang="ts">
	import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
	import { getSellerScore } from '$lib/services/rating.service';
	
	// For each post card, load seller score
	async function getSellerScoreForPost(userId: number) {
		const result = await getSellerScore(userId);
		return result.success ? result.data : null;
	}
</script>

<div class="browse-grid">
	{#each posts as post}
		<div class="post-card">
			<img src={post.imageUrl} alt={post.title} />
			<h3>{post.title}</h3>
			<p class="price">${post.price}</p>
			
			<!-- Seller Info with Rating -->
			<div class="seller-info">
				<span class="seller-name">{post.userName}</span>
				{#await getSellerScoreForPost(post.userId)}
					<span class="text-slate-400 text-sm">Loading...</span>
				{:then sellerScore}
					{#if sellerScore}
						<SellerRatingDisplay 
							{sellerScore}
							size="small"
						/>
					{/if}
				{/await}
			</div>
		</div>
	{/each}
</div>
```

## API Usage Examples

### Check if User Can Rate

```typescript
import { canRateSeller } from '$lib/services/rating.service';

const result = await canRateSeller({ 
	sellerId: 123,
	postId: 456 // optional
});

if (result.success && result.data) {
	console.log('Can rate:', result.data.canRate);
	console.log('Reason:', result.data.reason);
	console.log('Already rated:', result.data.alreadyRated);
}
```

### Create a Rating

```typescript
import { createRating } from '$lib/services/rating.service';

const result = await createRating({
	sellerId: 123,
	postId: 456, // optional
	rating: 5,
	comment: 'Great seller!' // optional
});

if (result.success && result.data) {
	console.log('Rating created:', result.data);
}
```

### Update a Rating

```typescript
import { updateRating } from '$lib/services/rating.service';

const result = await updateRating(ratingId, {
	rating: 4, // optional
	comment: 'Updated review' // optional
});
```

### Get Top Rated Sellers

```typescript
import { getTopRatedSellers } from '$lib/services/rating.service';

const result = await getTopRatedSellers({
	limit: 10,
	minRatings: 3
});

if (result.success && result.data) {
	const topSellers = result.data;
	// Display top sellers...
}
```

## Styling Tips

All components use Tailwind CSS and support dark mode. You can customize colors using CSS custom properties:

```css
:root {
	--primary-500: #3b82f6;
	--primary-600: #2563eb;
	--primary-700: #1d4ed8;
}
```

## Testing Checklist

- [ ] View seller ratings on profile page
- [ ] Submit new rating via modal
- [ ] Edit existing rating
- [ ] Delete rating
- [ ] View rating distribution chart
- [ ] Check pagination in rating list
- [ ] Verify eligibility check works
- [ ] Test dark mode support
- [ ] Verify responsive design
- [ ] Check loading states
- [ ] Verify error handling
