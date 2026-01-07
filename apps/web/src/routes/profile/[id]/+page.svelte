<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Avatar from '$lib/components/media/Avatar.svelte';
	import Button from '$lib/components/buttons/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/buttons/IconButton.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SellerRatingDisplay from '$lib/components/common/SellerRatingDisplay.svelte';
	import RatingList from '$lib/components/common/RatingList.svelte';
	import RatingDistribution from '$lib/components/common/RatingDistribution.svelte';
	import RatingModal from '$lib/components/overlay/RatingModal.svelte';
	import { currentUser } from '$lib/stores';
	import * as ratingService from '$lib/services/rating.service';
	import * as userService from '$lib/services/user.service';
	import * as postService from '$lib/services/post.service';
	import { apiClient } from '$lib/services/api.client';
	import type { UserProfileDTO } from '$lib/types/user.types';
	import type { ApiResponse, PaginatedResponse } from '$lib/types/api.types';
	import type { PostResponseDTO } from '$lib/types/post.types';

	// Get user ID from URL
	const sellerId = $derived(parseInt($page.params.id));

	// State
	let seller: UserProfileDTO | null = $state(null);
	let stats = $state({
		listings: 0,
		sold: 0
	});

	let sellerScore = $state({
		sellerId: 0,
		averageRating: 0,
		totalRatings: 0,
		positiveRatings: 0,
		displayText: 'New Seller'
	});

	let isLoadingUser = $state(true);
	let isLoadingRatings = $state(true);
	let error = $state<string | null>(null);
	let canRate = $state(false);
	let hasAlreadyRated = $state(false);
	let myRating = $state<any>(null);
	let showRatingModal = $state(false);
	let showRatingsSection = $state(true);

	// Check if viewing own profile
	const isOwnProfile = $derived($currentUser?.id === sellerId);

	// Load seller profile
	async function loadSellerProfile() {
		try {
			const result = await userService.getUserById(sellerId);
			
			if (result.success && result.data) {
				seller = result.data;
				// Load user's post count
				loadPostsCount();
			} else {
				console.error('Failed to load user:', result.error);
				error = result.error?.message || 'User not found';
			}
		} catch (err) {
			console.error('Error loading seller profile:', err);
			error = 'Failed to load user profile';
		} finally {
			isLoadingUser = false;
		}
	}

	// Load user's posts count
	async function loadPostsCount() {
		try {
			// Use the dedicated user posts endpoint: GET /posts/user/:userId
			const response = await apiClient.get<ApiResponse<PaginatedResponse<PostResponseDTO>>>(
				`/posts/user/${sellerId}`,
				{ params: { page: 1, limit: 1 } }
			);
			
			console.log('Posts API response:', response.data);
			
			if (response.data.success && response.data.data) {
				// The API returns an array of posts, not a PaginatedResponse wrapper
				// Access pagination directly from response.data
				if (response.data.pagination) {
					stats.listings = response.data.pagination.total || response.data.pagination.totalCount || 0;
				} else {
					// Fallback: count the array length
					stats.listings = Array.isArray(response.data.data) ? response.data.data.length : 0;
				}
			}
		} catch (err) {
			console.error('Error loading posts count:', err);
			// Non-critical, don't show error to user
		}
	}

	// Load seller ratings
	async function loadSellerRatings() {
		try {
			const scoreResult = await ratingService.getSellerScore(sellerId);
			if (scoreResult.success && scoreResult.data) {
				sellerScore = scoreResult.data;
			}
		} catch (error) {
			console.error('Error loading seller ratings:', error);
		} finally {
			isLoadingRatings = false;
		}
	}

	// Check if current user can rate this seller
	async function checkCanRate() {
		if (!$currentUser || isOwnProfile) {
			canRate = false;
			return;
		}

		try {
			const eligibilityResult = await ratingService.canRateSeller({ sellerId });
			if (eligibilityResult.success && eligibilityResult.data) {
				canRate = eligibilityResult.data.canRate;
				hasAlreadyRated = eligibilityResult.data.alreadyRated;

				// If already rated, load the existing rating from my ratings
				if (hasAlreadyRated) {
					const myRatingsResult = await ratingService.getMyRatings();
					if (myRatingsResult.success && myRatingsResult.data) {
						// Find the rating for this specific seller
						myRating = myRatingsResult.data.find((r) => r.sellerId === sellerId);
					}
				}
			}
		} catch (error) {
			console.error('Error checking rating eligibility:', error);
		}
	}

	// Handle rating submission
	function handleRatingSubmit(rating?: any) {
		console.log('Rating submitted:', rating);
		showRatingModal = false;
		// Reload ratings
		loadSellerRatings();
		checkCanRate();
	}

	onMount(() => {
		if (isOwnProfile) {
			// Redirect to own profile page
			goto('/profile');
			return;
		}

		loadSellerProfile();
		loadSellerRatings();
		checkCanRate();
	});
</script>

<svelte:head>
	<title>{seller?.fullName || 'User'} - Profile | TundaHub</title>
</svelte:head>

<div
	class="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark"
>
	<!-- Side Navigation (Desktop) -->
	<aside class="hidden md:block">
		<Sidebar activeRoute="" collapsed={false} />
	</aside>

	<div class="flex-1 flex flex-col overflow-hidden">
		<div
			class="min-h-screen bg-background-light dark:bg-background-dark pb-24 md:pb-0 overflow-y-auto"
		>
			<!-- Top App Bar -->
			<header
				class="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200/30 dark:border-slate-600/20"
			>
				<div class="flex items-center justify-between p-4 max-w-2xl mx-auto">
					<IconButton
						icon="arrow_back"
						ariaLabel="Back"
						variant="default"
						onclick={() => window.history.back()}
					/>
					<h1 class="text-lg font-bold text-slate-900 dark:text-white">Seller Profile</h1>
					<div class="w-12"></div>
				</div>
			</header>

			<!-- Centered Content Container -->
			<div class="max-w-2xl mx-auto">
				{#if isLoadingUser}
					<!-- Loading State -->
					<div class="flex items-center justify-center p-8">
						<div class="text-slate-500 dark:text-slate-400">Loading...</div>
					</div>
				{:else if seller}
					<!-- Profile Header -->
					<div class="p-4">
						<div class="flex flex-col items-center gap-4">
							<!-- Avatar -->
							<Avatar src={seller.profilePictureUrl} alt={seller.fullName} size="xl" />

							<!-- User Info -->
							<div class="flex flex-col items-center text-center">
								<h2 class="text-[22px] font-bold text-slate-900 dark:text-white">
									{seller.fullName}
								</h2>
								<p class="text-base text-slate-500 dark:text-[#92c9c9] mt-1">
									@{seller.fullName.toLowerCase().replace(/\s+/g, '')}
								</p>
								{#if seller.bio}
									<p class="text-base text-slate-500 dark:text-[#92c9c9] mt-1 max-w-md">
										{seller.bio}
									</p>
								{/if}
							</div>

							<!-- Action Buttons -->
							<div class="flex w-full max-w-[480px] gap-3 pt-2">
								<Button
									variant="secondary"
									size="md"
									fullWidth={true}
									onclick={() => goto(`/messages/${seller.id}`)}
								>
									<Icon name="chat" size={20} class="mr-2" />
									Message
								</Button>

								{#if canRate && !hasAlreadyRated}
									<Button
										variant="primary"
										size="md"
										fullWidth={true}
										onclick={() => (showRatingModal = true)}
									>
										<Icon name="star" size={20} class="mr-2" />
										Rate Seller
									</Button>
								{:else if hasAlreadyRated}
									<Button
										variant="outline"
										size="md"
										fullWidth={true}
										onclick={() => (showRatingModal = true)}
									>
										<Icon name="edit" size={20} class="mr-2" />
										Edit Rating
									</Button>
								{/if}
							</div>
						</div>
					</div>

					<!-- Profile Stats -->
					<div class="flex flex-wrap gap-3 px-4 py-3">
						<div
							class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] dark:bg-transparent p-3 items-center text-center"
						>
							<p class="text-slate-900 dark:text-white text-2xl font-bold">{stats.listings}</p>
							<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Listings</p>
						</div>
						<!-- <div
							class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] dark:bg-transparent p-3 items-center text-center"
						>
							<p class="text-slate-900 dark:text-white text-2xl font-bold">{stats.sold}</p>
							<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Sold</p>
						</div> -->
						<button
							onclick={() => (showRatingsSection = !showRatingsSection)}
							class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] dark:bg-transparent p-3 items-center text-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
						>
							{#if isLoadingRatings}
								<div class="text-slate-400 dark:text-slate-500 text-2xl font-bold">...</div>
							{:else}
								<SellerRatingDisplay
								sellerScore={sellerScore}
									showDetails={false}
								/>
							{/if}
							<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Seller Rating</p>
						</button>
					</div>

					<!-- Ratings Section -->
					{#if showRatingsSection && !isLoadingRatings}
						<div class="px-4 py-3 space-y-4">
							<!-- Rating Distribution -->
							{#if sellerScore.totalRatings > 0}
								<div
									class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-[#326767] p-4"
								>
									<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">
										Rating Breakdown
									</h3>
									<RatingDistribution {sellerId} />
								</div>
							{/if}

							<!-- Ratings List -->
							<div
								class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-[#326767] p-4"
							>
								<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">
									{sellerScore.totalRatings > 0 ? 'Customer Reviews' : 'No Reviews Yet'}
								</h3>
								{#if sellerScore.totalRatings > 0}
									<RatingList {sellerId} showEdit={false} initialLimit={10} />
								{:else}
									<div class="text-center py-8">
										<Icon name="star_outline" size={48} class="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
										<p class="text-slate-500 dark:text-slate-400">
											No ratings yet. Be the first to rate this seller!
										</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Divider -->
					<div class="px-4 py-3">
						<div class="w-full border-t border-slate-200 dark:border-[#326767]"></div>
					</div>

					<!-- Seller's Listings (Future Enhancement) -->
					<div class="px-4 py-3">
						<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">
							Active Listings
						</h3>
						<div class="text-center py-8">
							<p class="text-slate-500 dark:text-slate-400">
								Listing display coming soon...
							</p>
						</div>
					</div>
				{:else}
					<!-- Error State -->
					<div class="flex flex-col items-center justify-center p-8">
						<Icon name="person_off" size={64} class="text-slate-300 dark:text-slate-600 mb-4" />
						<p class="text-slate-500 dark:text-slate-400 text-lg mb-2">
							{error || 'User not found'}
						</p>
						<p class="text-slate-400 dark:text-slate-500 text-sm mb-4">
							User ID: {sellerId}
						</p>
						<Button variant="primary" size="md" class="mt-4" onclick={() => goto('/browse')}>
							Back to Browse
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Rating Modal -->
{#if showRatingModal && seller}
	<RatingModal
		bind:open={showRatingModal}
		{sellerId}
		sellerName={seller.fullName}
		existingRating={myRating}
		onClose={() => (showRatingModal = false)}
		onSubmit={handleRatingSubmit}
	/>
{/if}
