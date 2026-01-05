<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { getPost } from '$lib/services/post.service';
	import type { PostResponseDTO } from '$lib/types/post.types';

	let post = $state<PostResponseDTO | null>(null);
	let isLoading = $state(true);
	let error = $state<string | null>(null);
	let currentImageIndex = $state(0);
	let showContactInfo = $state(false);

	// Get post ID from URL
	$effect(() => {
		const postId = parseInt($page.params.id);
		if (!isNaN(postId)) {
			loadPost(postId);
		} else {
			error = 'Invalid post ID';
			isLoading = false;
		}
	});

	async function loadPost(postId: number) {
		isLoading = true;
		error = null;

		try {
			const result = await getPost(postId);

			if (result.success && result.data) {
				post = result.data;
			} else {
				error = result.error?.message || 'Failed to load post';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			isLoading = false;
		}
	}

	function formatPrice(price: number): string {
		return new Intl.NumberFormat('en-UG', {
			style: 'currency',
			currency: 'UGX',
			minimumFractionDigits: 0
		}).format(price);
	}

	function formatDate(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
			Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
			'day'
		);
	}

	function nextImage() {
		if (post && post.images.length > 0) {
			currentImageIndex = (currentImageIndex + 1) % post.images.length;
		}
	}

	function previousImage() {
		if (post && post.images.length > 0) {
			currentImageIndex = (currentImageIndex - 1 + post.images.length) % post.images.length;
		}
	}

	function handleContact() {
		showContactInfo = true;
	}

	function handleMessage() {
		if (post?.user.id) {
			goto(`/messages/${post.user.id}`);
		}
	}
</script>

<div class="flex h-screen overflow-hidden bg-[#f6f8f8] dark:bg-[#102222]">
	<!-- Sidebar - Desktop Only -->
	<div class="hidden lg:block">
		<Sidebar activeRoute="/browse" />
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto">
		<!-- Header -->
		<header
			class="sticky top-0 z-10 bg-white dark:bg-[rgb(16_34_34/0.9)] border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm"
		>
			<div class="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
				<button
					onclick={() => window.history.back()}
					class="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-[#13ecec] transition-colors"
				>
					<Icon name="arrow_back" size={20} />
					<span>Back</span>
				</button>

				<div class="flex items-center gap-2">
					<button
						class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
						aria-label="Share"
					>
						<Icon name="share" size={20} />
					</button>
					<button
						class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
						aria-label="Favorite"
					>
						<Icon name="favorite" size={20} />
					</button>
				</div>
			</div>
		</header>

		<!-- Content -->
		<div class="max-w-2xl mx-auto px-4 py-6 pb-24 lg:pb-6">
			{#if isLoading}
				<!-- Loading State -->
				<div class="flex items-center justify-center min-h-[400px]">
					<div class="text-center">
						<div
							class="w-12 h-12 border-4 border-[#13ecec] border-t-transparent rounded-full animate-spin mx-auto mb-4"
						></div>
						<p class="text-slate-600 dark:text-slate-400">Loading post...</p>
					</div>
				</div>
			{:else if error}
				<!-- Error State -->
				<div class="flex items-center justify-center min-h-[400px]">
					<div class="text-center max-w-md">
						<Icon name="error" size={64} />
						<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
							Error Loading Post
						</h2>
						<p class="text-slate-600 dark:text-slate-400 mb-4">{error}</p>
						<button
							onclick={() => window.history.back()}
							class="px-6 py-2 bg-[#13ecec] text-slate-900 rounded-lg font-medium hover:bg-[#13ecec]/90 transition-colors"
						>
							Go Back
						</button>
					</div>
				</div>
			{:else if post}
				<!-- Post Content -->
				<div class="space-y-6">
					<!-- Image Gallery -->
					<div class="bg-[#1a3333] rounded-xl overflow-hidden shadow-sm border border-slate-700">
						{#if post.images && post.images.length > 0}
							<div class="relative aspect-video bg-slate-100 dark:bg-slate-800">
								<img
									src={post.images[currentImageIndex].imageUrl}
									alt={post.title}
									class="w-full h-full object-contain"
								/>

								<!-- Navigation Arrows -->
								{#if post.images.length > 1}
									<button
										onclick={previousImage}
									class="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
									aria-label="Previous image"
								>
									<Icon name="chevron_left" size={24} />
								</button>
								<button
									onclick={nextImage}
									class="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
									aria-label="Next image"
								>
									<Icon name="chevron_right" size={24} />
								</button>

									<!-- Image Counter -->
									<div
										class="absolute bottom-4 right-4 px-3 py-1 bg-black/70 text-white text-sm rounded-full"
									>
										{currentImageIndex + 1} / {post.images.length}
									</div>
								{/if}
							</div>

							<!-- Thumbnail Strip -->
							{#if post.images.length > 1}
								<div class="flex gap-2 p-4 overflow-x-auto">
									{#each post.images as image, index}
										<button
											onclick={() => (currentImageIndex = index)}
											class="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all {currentImageIndex ===
											index
												? 'border-[#13ecec] scale-105'
												: 'border-transparent opacity-60 hover:opacity-100'}"
										>
											<img
												src={image.imageUrl}
												alt={`${post.title} thumbnail ${index + 1}`}
												class="w-full h-full object-cover"
											/>
										</button>
									{/each}
								</div>
							{/if}
						{:else}
							<div
								class="aspect-video bg-slate-100 dark:bg-slate-800 flex items-center justify-center"
							>
								<Icon name="image" size={64} />
							</div>
						{/if}
					</div>

					<!-- Description -->
					<div class="bg-[#102222] rounded-xl p-6 shadow-sm border border-slate-700">
						<h2 class="text-2xl font-bold text-slate-900 dark:text-white mb-4">
							{post.title}
						</h2>

						<div
							class="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-600 dark:text-slate-400"
						>
							<div class="flex items-center gap-1">
								<Icon name="location_on" size={16} />
								<span>{post.location}</span>
							</div>
							<div class="flex items-center gap-1">
								<Icon name="schedule" size={16} />
								<span>Posted {formatDate(post.createdAt)}</span>
							</div>
							<div class="flex items-center gap-1">
								<Icon name="visibility" size={16} />
								<span>{post.viewCount} views</span>
							</div>
							<div class="flex items-center gap-1">
								<Icon name="favorite" size={16} />
								<span>{post.likeCount} likes</span>
							</div>
						</div>

						<div class="prose prose-slate dark:prose-invert max-w-none">
							<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-2">Description</h3>
							<p class="text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
								{post.description}
							</p>
						</div>

						<!-- Additional Details -->
						{#if post.brand || post.deliveryMethod}
							<div class="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
								<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-3">
									Additional Details
								</h3>
								<dl class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{#if post.brand}
										<div>
											<dt class="text-sm text-slate-600 dark:text-slate-400">Brand</dt>
											<dd class="text-base font-medium text-slate-900 dark:text-white">
												{post.brand}
											</dd>
										</div>
									{/if}
									{#if post.deliveryMethod}
										<div>
											<dt class="text-sm text-slate-600 dark:text-slate-400">Delivery Method</dt>
											<dd class="text-base font-medium text-slate-900 dark:text-white">
												{post.deliveryMethod}
											</dd>
										</div>
									{/if}
									<div>
										<dt class="text-sm text-slate-600 dark:text-slate-400">Category</dt>
										<dd class="text-base font-medium text-slate-900 dark:text-white">
											{post.category.name}
										</dd>
									</div>
									<div>
										<dt class="text-sm text-slate-600 dark:text-slate-400">Status</dt>
										<dd class="text-base font-medium">
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {post.status ===
												'Active'
													? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
													: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400'}"
											>
												{post.status}
											</span>
										</dd>
									</div>
								</dl>
							</div>
						{/if}
					</div>
				</div>

				<!-- Price Card -->
				<div class="bg-[#102222] rounded-xl p-6 shadow-sm mt-6 border border-slate-700">
					<div class="mb-6">
						<p class="text-sm text-slate-600 dark:text-slate-400 mb-1">Price</p>
						<p class="text-3xl font-bold text-[#13ecec]">{formatPrice(post.price)}</p>
					</div>

					<!-- Action Buttons -->
					<div class="space-y-3">
						<button
							onclick={handleMessage}
							class="w-full px-6 py-3 bg-[#13ecec] text-slate-900 rounded-lg font-semibold hover:bg-[#13ecec]/90 transition-colors flex items-center justify-center gap-2"
						>
							<Icon name="chat" size={20} />
							<span>Send Message</span>
						</button>

						<button
							onclick={handleContact}
							class="w-full px-6 py-3 bg-white dark:bg-[#1a3333] border-2 border-[#13ecec] text-[#13ecec] rounded-lg font-semibold hover:bg-[#13ecec]/10 dark:hover:bg-[#13ecec]/20 transition-colors flex items-center justify-center gap-2"
						>
							<Icon name="phone" size={20} />
							<span>Show Contact</span>
						</button>
					</div>

					<!-- Contact Information -->
					{#if showContactInfo}
						<div
							class="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
						>
							<p class="text-sm font-semibold text-slate-900 dark:text-white mb-2">
								Contact Information
							</p>
							<div class="space-y-2">
								<div class="flex items-center gap-2 text-sm">
									<Icon name="phone" size={16} />
									<a href={`tel:${post.contactNumber}`} class="text-[#13ecec] hover:underline">
										{post.contactNumber}
									</a>
								</div>
								{#if post.emailAddress}
									<div class="flex items-center gap-2 text-sm">
										<Icon name="mail" size={16} />
										<a href={`mailto:${post.emailAddress}`} class="text-[#13ecec] hover:underline">
											{post.emailAddress}
										</a>
									</div>
								{/if}
							</div>
						</div>
					{/if}
				</div>

				<!-- Seller Card -->
				<div class="bg-[#102222] rounded-xl p-6 shadow-sm mt-6 border border-slate-700">
					<h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">
						Seller Information
					</h3>

					<div class="flex items-center gap-3 mb-4">
						{#if post.user.profilePictureUrl}
							<img
								src={post.user.profilePictureUrl}
								alt={post.user.fullName}
								class="w-12 h-12 rounded-full object-cover"
							/>
						{:else}
							<div class="w-12 h-12 rounded-full bg-[#13ecec]/20 flex items-center justify-center">
								<Icon name="person" size={24} />
							</div>
						{/if}

						<div class="flex-1">
							<p class="font-semibold text-slate-900 dark:text-white">
								{post.user.fullName}
							</p>
							<p class="text-sm text-slate-600 dark:text-slate-400">Seller</p>
						</div>
					</div>

					<button
						onclick={() => post && goto(`/profile/${post.user.id}`)}
						class="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
					>
						View Profile
					</button>
				</div>

				<!-- Safety Tips -->
				<div class="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 shadow-sm mt-6">
					<div class="flex items-start gap-3">
						<Icon name="shield" size={20} />
						<div>
							<h3 class="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
								Safety Tips
							</h3>
							<ul class="text-xs text-amber-800 dark:text-amber-300 space-y-1">
								<li>• Meet in a public place</li>
								<li>• Check the item before payment</li>
								<li>• Pay only after collecting</li>
								<li>• Report suspicious behavior</li>
							</ul>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</main>

	<!-- Mobile Bottom Navigation -->
	<div class="lg:hidden">
		<MobileBottomNav activeRoute="/browse" />
	</div>
</div>
