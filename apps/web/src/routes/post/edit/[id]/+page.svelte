<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import Button from '$lib/components/buttons/Button.svelte';
	import IconButton from '$lib/components/buttons/IconButton.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ImageUploader from '$lib/components/post/ImageUploader.svelte';
	import PostDetailsForm from '$lib/components/post/PostDetailsForm.svelte';
	import { getPost, updatePost } from '$lib/services/post.service';
	import { currentUser } from '$lib/stores';
	import type { PostResponseDTO } from '$lib/types/post.types';

	// Get post ID from route params
	let postId = $state(0);
	
	// Form state
	let formData = $state<{
		images: string[];
		title: string;
		categoryId: string;
		description: string;
		price: string;
		location: string;
		contactNumber: string;
		brand?: string;
		emailAddress?: string;
		deliveryMethod?: string;
		gpsLocation?: string;
	}>({
		images: [],
		title: '',
		categoryId: '',
		description: '',
		price: '',
		location: '',
		contactNumber: '',
		gpsLocation: ''
	});

	// Original values for dirty check
	let originalData = $state<typeof formData>({
		images: [],
		title: '',
		categoryId: '',
		description: '',
		price: '',
		location: '',
		contactNumber: '',
		gpsLocation: ''
	});

	// Validation state
	let validationErrors = $state<Record<string, string>>({});

	// UI state
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let isDirty = $state(false);
	let showCancelDialog = $state(false);
	let loadError = $state('');

	// Load post data
	onMount(async () => {
		// Extract post ID from route params
		const id = $page.params.id;
		postId = parseInt(id);

		if (!postId || isNaN(postId)) {
			loadError = 'Invalid post ID';
			isLoading = false;
			return;
		}

		const user = $currentUser;
		if (!user) {
			// Redirect to login if not authenticated
			goto('/login');
			return;
		}

		try {
			// Fetch the post
			const result = await getPost(postId);

			if (!result.success || !result.data) {
				loadError = result.error?.message || 'Post not found';
				isLoading = false;
				return;
			}

			const post = result.data;

			// Check ownership - only owner can edit
			if (post.user.id !== user.id) {
				loadError = 'You do not have permission to edit this post';
				setTimeout(() => goto('/post/my-listings'), 2000);
				isLoading = false;
				return;
			}

			// Populate form with post data
			formData = {
				images: post.images.map((img) => img.imageUrl),
				title: post.title,
				categoryId: post.category.id.toString(),
				description: post.description,
				price: post.price.toString(),
				location: post.location,
				contactNumber: post.contactNumber,
				brand: post.brand || '',
				emailAddress: post.emailAddress || '',
				deliveryMethod: post.deliveryMethod || '',
				gpsLocation: post.gpsLocation || ''
			};

			// Store original values for dirty checking
			originalData = JSON.parse(JSON.stringify(formData));
			
			isLoading = false;
		} catch (error) {
			console.error('Error loading post:', error);
			loadError = error instanceof Error ? error.message : 'Failed to load post';
			isLoading = false;
		}
	});

	// Check if form has changes
	$effect(() => {
		isDirty = JSON.stringify(formData) !== JSON.stringify(originalData);
	});

	// Validation
	function validateForm(): boolean {
		validationErrors = {};

		// Title validation
		if (!formData.title.trim()) {
			validationErrors.title = 'Title is required';
		} else if (formData.title.length < 5) {
			validationErrors.title = 'Title must be at least 5 characters';
		} else if (formData.title.length > 100) {
			validationErrors.title = 'Title must be 100 characters or less';
		}

		// Category validation
		if (!formData.categoryId) {
			validationErrors.categoryId = 'Category is required';
		}

		// Description validation
		if (!formData.description.trim()) {
			validationErrors.description = 'Description is required';
		} else if (formData.description.length < 20) {
			validationErrors.description = 'Description must be at least 20 characters';
		} else if (formData.description.length > 2000) {
			validationErrors.description = 'Description must be 2000 characters or less';
		}

		// Price validation
		const priceNum = parseFloat(formData.price);
		if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
			validationErrors.price = 'Valid price is required';
		}

		// Location validation
		if (!formData.location.trim()) {
			validationErrors.location = 'Location is required';
		}

		// Contact number validation
		if (!formData.contactNumber.trim()) {
			validationErrors.contactNumber = 'Contact number is required';
		}

		// Images validation
		if (formData.images.length === 0) {
			validationErrors.images = 'At least one image is required';
		} else if (formData.images.length > 10) {
			validationErrors.images = 'Maximum 10 images allowed';
		}

		return Object.keys(validationErrors).length === 0;
	}

	// Handle form submission
	async function handleSubmit() {
		if (!validateForm()) {
			// Scroll to first error
			window.scrollTo({ top: 0, behavior: 'smooth' });
			return;
		}

		isSubmitting = true;

		try {
			const updateData = {
				title: formData.title.trim(),
				categoryId: parseInt(formData.categoryId),
				description: formData.description.trim(),
				price: parseFloat(formData.price),
				location: formData.location.trim(),
				contactNumber: formData.contactNumber.trim(),
				...(formData.brand && { brand: formData.brand.trim() }),
				...(formData.emailAddress && { emailAddress: formData.emailAddress.trim() }),
				...(formData.deliveryMethod && { deliveryMethod: formData.deliveryMethod })
			};

			const result = await updatePost(postId, updateData);

			if (result.success) {
				// Navigate to the post detail page
				goto(`/post/${postId}`);
			} else {
				validationErrors.submit = result.error?.message || 'Failed to update post';
			}
		} catch (error) {
			console.error('Error updating post:', error);
			validationErrors.submit = error instanceof Error ? error.message : 'Failed to update post';
		} finally {
			isSubmitting = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		if (isDirty) {
			showCancelDialog = true;
		} else {
			goto(`/post/${postId}`);
		}
	}

	// Confirm cancel
	function confirmCancel() {
		showCancelDialog = false;
		goto(`/post/${postId}`);
	}
</script>

<svelte:head>
	<title>Edit Post - TundaHub</title>
</svelte:head>

<div class="flex h-screen overflow-hidden bg-[#f6f8f8] dark:bg-[#102222]">
	<!-- Sidebar - Desktop Only -->
	<div class="hidden lg:block">
		<Sidebar activeRoute="/post/my-listings" />
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto">
		<!-- Sticky Header -->
		<header
			class="sticky top-0 z-10 bg-white dark:bg-[rgb(16_34_34/0.9)] border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm"
		>
			<div class="flex items-center justify-between px-4 py-3 max-w-2xl mx-auto">
				<IconButton
					icon="arrow_back"
					ariaLabel="Back"
					variant="default"
					onclick={handleCancel}
				/>
				<h1 class="text-lg font-semibold text-slate-900 dark:text-white">Edit Post</h1>
				<div class="w-12"></div>
			</div>
		</header>

		<!-- Content area -->
		<div class="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
			{#if isLoading}
				<div class="flex items-center justify-center py-12">
					<div class="flex flex-col items-center gap-4">
						<div
							class="w-12 h-12 border-4 border-[#13ecec] border-t-transparent rounded-full animate-spin"
						></div>
						<p class="text-slate-600 dark:text-slate-400">Loading post...</p>
					</div>
				</div>
			{:else if loadError}
				<div
					class="flex flex-col items-center justify-center py-12 px-4 text-center"
				>
					<Icon name="error" size={64} class="text-red-500 mb-4" />
					<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
						{loadError}
					</h2>
					<Button onclick={() => goto('/post/my-listings')} variant="primary" class="mt-4">
						Go to My Listings
					</Button>
				</div>
			{:else}
				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-8">
					<!-- Images Section 
					<div>
						<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
							Images
						</h2>
						<p class="text-sm text-slate-600 dark:text-slate-400 mb-4">
							Update your post images (1-10 images required)
						</p>
						<ImageUploader bind:images={formData.images} error={validationErrors.images} />
					</div>
                    -->

					<!-- Post Details Section -->
					<PostDetailsForm bind:formData errors={validationErrors} disableTitleEdit={true} />

					<!-- Error Message -->
					{#if validationErrors.submit}
						<div
							class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
						>
							<p class="text-red-600 dark:text-red-400 text-sm">
								{validationErrors.submit}
							</p>
						</div>
					{/if}

					<!-- Action Buttons -->
					<div class="flex flex-col sm:flex-row gap-3 pt-4">
						<Button
							type="submit"
							variant="primary"
							loading={isSubmitting}
							disabled={!isDirty || isSubmitting}
							fullWidth
						>
							Save Changes
						</Button>
						<Button
							type="button"
							variant="ghost"
							onclick={handleCancel}
							disabled={isSubmitting}
							fullWidth
						>
							Cancel
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</main>

	<!-- Mobile bottom navigation -->
	<MobileBottomNav activeRoute="/post/my-listings" />
</div>

<!-- Cancel Confirmation Dialog -->
{#if showCancelDialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={() => (showCancelDialog = false)}
		onkeydown={(e) => e.key === 'Escape' && (showCancelDialog = false)}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<div
			class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md mx-4 p-6"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
				Discard Changes?
			</h3>
			<p class="text-slate-600 dark:text-slate-400 mb-6">
				You have unsaved changes. Are you sure you want to leave without saving?
			</p>
			<div class="flex gap-3">
				<Button variant="danger" onclick={confirmCancel} fullWidth>
					Discard
				</Button>
				<Button variant="ghost" onclick={() => (showCancelDialog = false)} fullWidth>
					Keep Editing
				</Button>
			</div>
		</div>
	</div>
{/if}
