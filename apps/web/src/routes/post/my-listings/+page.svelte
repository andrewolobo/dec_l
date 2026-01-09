<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ListingCard from '$lib/components/cards/ListingCard.svelte';
	import type { PostResponseDTO } from '$lib/types/post.types';
	import { PostStatus } from '$lib/types/post.types';
	import { getMyPosts, loadMoreMyPosts } from '$lib/services/post.service';
	import { myPosts, myPostsLoading, myPostsError, myPostsHasMore } from '$lib/stores/post.store';

	// Filter states
	type FilterStatus =
		| 'all'
		| PostStatus.ACTIVE
		| PostStatus.PENDING_PAYMENT
		| PostStatus.EXPIRED
		| PostStatus.DRAFT;
	let activeFilter = $state<FilterStatus>('all');

	// Listings state from store
	let listings = $state<PostResponseDTO[]>([]);
	let isLoading = $state(false);
	let hasMore = $state(true);
	let error = $state<string | null>(null);
	let page = $state(1);
	const pageSize = 20;

	// Subscribe to store updates
	$effect(() => {
		const unsubscribe = myPosts.subscribe((posts) => {
			listings = posts;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = myPostsLoading.subscribe((loading) => {
			isLoading = loading;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = myPostsError.subscribe((err) => {
			error = err;
		});
		return unsubscribe;
	});

	$effect(() => {
		const unsubscribe = myPostsHasMore.subscribe((more) => {
			hasMore = more;
		});
		return unsubscribe;
	});

	// Client-side filtering
	let filteredListings = $derived(
		activeFilter === 'all' ? listings : listings.filter((post) => post.status === activeFilter)
	);

	// Infinite scroll observer
	let loadMoreTrigger = $state<HTMLElement | undefined>();
	let observer: IntersectionObserver;

	// Filter configuration with counts from real data
	const filters = $derived([
		{ id: 'all' as FilterStatus, label: 'All', count: listings.length },
		{
			id: PostStatus.ACTIVE,
			label: 'Active',
			count: listings.filter((l) => l.status === PostStatus.ACTIVE).length
		},
		{
			id: PostStatus.PENDING_PAYMENT,
			label: 'Pending',
			count: listings.filter((l) => l.status === PostStatus.PENDING_PAYMENT).length
		},
		{
			id: PostStatus.EXPIRED,
			label: 'Expired',
			count: listings.filter((l) => l.status === PostStatus.EXPIRED).length
		},
		{
			id: PostStatus.DRAFT,
			label: 'Draft',
			count: listings.filter((l) => l.status === PostStatus.DRAFT).length
		}
	]);

	// Load initial listings
	onMount(() => {
		// Load initial page
		getMyPosts({ page: 1, limit: pageSize })
			.then(() => {
				page = 2; // Next page to load
			})
			.catch((err) => {
				console.error('Failed to load initial listings:', err);
			});

		setupInfiniteScroll();

		return () => {
			observer?.disconnect();
		};
	});

	// Load more listings
	async function loadListings() {
		if (isLoading || !hasMore) return;

		try {
			const result = await loadMoreMyPosts(page);
			if (result) {
				page += 1;
			} else {
				hasMore = false;
			}
		} catch (err) {
			console.error('Failed to load more listings:', err);
			error = err instanceof Error ? err.message : 'Failed to load listings';
		}
	}

	// Setup infinite scroll observer
	function setupInfiniteScroll() {
		observer = new IntersectionObserver(
			async (entries) => {
				const [entry] = entries;
				if (entry.isIntersecting && !isLoading && hasMore) {
					await loadListings();
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

	// Handle filter change
	function setFilter(filter: 'all' | PostStatus) {
		// Cast to FilterStatus since we know the filters array only contains valid FilterStatus values
		activeFilter = filter as FilterStatus;
	}

	// Action handlers
	function handleEdit(post: PostResponseDTO) {
		console.log('Edit post:', post.id);
		// Navigate to edit page
		goto(`/post/edit/${post.id}`);
	}

	function handleDelete(post: PostResponseDTO) {
		console.log('Delete post:', post.id);
		// Show confirmation dialog and delete
		if (confirm(`Are you sure you want to delete "${post.title}"?`)) {
			listings = listings.filter((l) => l.id !== post.id);
		}
	}

	function handleManage(post: PostResponseDTO) {
		console.log('Manage payment for post:', post.id);
		// Navigate to payment page
		window.location.href = `/post/payment/${post.id}`;
	}

	function handleRenew(post: PostResponseDTO) {
		console.log('Renew post:', post.id);
		// Navigate to renewal/payment page
		window.location.href = `/post/renew/${post.id}`;
	}

	function handleRelist(post: PostResponseDTO) {
		console.log('Relist post:', post.id);
		// Create new post from this one
		window.location.href = `/post/create?from=${post.id}`;
	}

	function handleCreateNew() {
		window.location.href = '/post/create';
	}

	// Empty state messages
	const emptyStateMessage = $derived.by(() => {
		switch (activeFilter) {
			case PostStatus.ACTIVE:
				return {
					icon: 'inventory_2',
					title: 'No active listings',
					description:
						"You don't have any active listings at the moment. Create a new listing to get started!"
				};
			case PostStatus.PENDING_PAYMENT:
				return {
					icon: 'payments',
					title: 'No pending payments',
					description: 'All your listings are up to date. Great job!'
				};
			case PostStatus.EXPIRED:
				return {
					icon: 'event_busy',
					title: 'No expired listings',
					description: 'All your listings are still active. Keep up the good work!'
				};
			case PostStatus.DRAFT:
				return {
					icon: 'draft',
					title: 'No drafts',
					description: "You don't have any draft listings. Start creating one today!"
				};
			default:
				return {
					icon: 'post_add',
					title: 'No listings yet',
					description: 'Start selling by creating your first listing. It only takes a few minutes!'
				};
		}
	});

	// Watch loadMoreTrigger to setup observer when it's available
	$effect(() => {
		if (loadMoreTrigger && observer) {
			observer.observe(loadMoreTrigger);
		}
	});
</script>

<div class="flex h-screen overflow-hidden bg-[#f6f8f8] dark:bg-[#102222]">
	<!-- Sidebar - Desktop Only -->
	<div class="hidden lg:block">
		<Sidebar activeRoute="/post/my-listings" />
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto">
		<!-- Sticky Header -->
		<div
			class="sticky top-0 z-10 bg-white dark:bg-[rgb(16_34_34/0.9)] border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm"
		>
			<div class="px-4 py-4 max-w-2xl mx-auto">
				<h1 class="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">
					My Listings
				</h1>
			</div>
		</div>

		<!-- Error Display -->
		{#if error}
			<div
				class="mx-4 mt-4 max-w-2xl mx-auto px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
			>
				<div class="flex items-center gap-2">
					<Icon name="error" size={20} class="text-red-600 dark:text-red-400" />
					<p class="text-red-800 dark:text-red-200">{error}</p>
				</div>
			</div>
		{/if}

		<!-- Listings Grid -->
		<div class="px-4 py-6 max-w-2xl mx-auto">
			<!-- Create New Post Button -->
			<button
				class="w-full px-6 py-2.5 mb-4 bg-[#13ecec] hover:bg-[#0fd5d5] text-slate-900 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
				onclick={handleCreateNew}
			>
				<Icon name="add" size={20} />
				Create New Post
			</button>

			<!-- Filter Chips -->
			<div class="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-4">
				{#each filters as filter}
					<button
						class="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2"
						class:bg-primary-600={activeFilter === filter.id}
						class:text-white={activeFilter === filter.id}
						class:bg-slate-100={activeFilter !== filter.id}
						class:dark:bg-slate-800={activeFilter !== filter.id}
						class:text-slate-700={activeFilter !== filter.id}
						class:dark:text-slate-300={activeFilter !== filter.id}
						onclick={() => setFilter(filter.id)}
					>
						{filter.label}
						<span
							class="px-2 py-0.5 rounded-full text-xs font-semibold {activeFilter === filter.id
								? 'bg-white bg-opacity-20'
								: 'bg-slate-200 dark:bg-slate-700'}"
						>
							{filter.count}
						</span>
					</button>
				{/each}
			</div>

			{#if filteredListings.length > 0}
				<div class="grid grid-cols-1 gap-4">
					{#each filteredListings as listing (listing.id)}
						<ListingCard
							post={listing}
							onEdit={() => handleEdit(listing)}
							onDelete={() => handleDelete(listing)}
							onManage={() => handleManage(listing)}
							onRenew={() => handleRenew(listing)}
							onRelist={() => handleRelist(listing)}
							onClick={() => {
								window.location.href = `/post/${listing.id}`;
							}}
						/>
					{/each}
				</div>

				<!-- Infinite Scroll Trigger -->
				{#if hasMore}
					<div bind:this={loadMoreTrigger} class="flex justify-center items-center py-8">
						{#if isLoading}
							<div class="flex items-center gap-2 text-slate-600 dark:text-slate-400">
								<div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
								<span>Loading more listings...</span>
							</div>
						{/if}
					</div>
				{:else if filteredListings.length > 0}
					<div class="text-center py-8">
						<p class="text-slate-600 dark:text-slate-400">
							You've reached the end of your listings
						</p>
					</div>
				{/if}
			{:else if isLoading}
				<!-- Initial Loading State -->
				<div class="flex flex-col items-center justify-center py-20">
					<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
					<p class="text-slate-600 dark:text-slate-400">Loading your listings...</p>
				</div>
			{:else}
				<!-- Empty State -->
				<div class="flex flex-col items-center justify-center py-20 px-4">
					<div class="bg-slate-100 dark:bg-slate-800 rounded-full p-6 mb-6">
						<Icon
							name={emptyStateMessage.icon}
							size={64}
							class="text-slate-400 dark:text-slate-500"
						/>
					</div>
					<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-2">
						{emptyStateMessage.title}
					</h2>
					<p class="text-slate-600 dark:text-slate-400 text-center mb-6 max-w-md">
						{emptyStateMessage.description}
					</p>
					<button
						class="px-8 py-3 bg-[#13ecec] hover:bg-[#0fd5d5] text-slate-900 rounded-lg font-semibold transition-colors flex items-center gap-2"
						onclick={handleCreateNew}
					>
						<Icon name="add" size={20} />
						Create Your First Listing
					</button>
				</div>
			{/if}
		</div>
	</main>

	<!-- Mobile: Bottom navigation -->
	<MobileBottomNav activeRoute="/post/my-listings" />
</div>

<style>
	.scrollbar-hide {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}

	.scrollbar-hide::-webkit-scrollbar {
		display: none;
	}
</style>
