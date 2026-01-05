<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import ImageUploader from '$lib/components/post/ImageUploader.svelte';
	import PostDetailsForm from '$lib/components/post/PostDetailsForm.svelte';
	import TierSelection from '$lib/components/post/TierSelection.svelte';
	import { createPost } from '$lib/services/post.service';

	// Step state
	let currentStep = $state(1);
	const totalSteps = 3;

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
		selectedTier?: 'BASIC' | 'STANDARD' | 'PREMIUM';
	}>({
		images: [],
		title: '',
		categoryId: '',
		description: '',
		price: '',
		location: '',
		contactNumber: ''
	});

	// Validation state
	let validationErrors = $state<Record<string, string>>({});
	let isSubmitting = $state(false);

	// Step labels
	const stepLabels = ['Add Images', 'Post Details', 'Select Tier'];

	// Navigation functions
	function goToStep(step: number) {
		if (step < 1 || step > totalSteps) return;
		if (step > currentStep && !validateCurrentStep()) return;
		currentStep = step;
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	function nextStep() {
		if (validateCurrentStep()) {
			goToStep(currentStep + 1);
		}
	}

	function previousStep() {
		goToStep(currentStep - 1);
	}

	// Validation
	function validateCurrentStep(): boolean {
		validationErrors = {};

		if (currentStep === 1) {
			if (formData.images.length === 0) {
				validationErrors.images = 'Please add at least one image';
				return false;
			}
			if (formData.images.length > 10) {
				validationErrors.images = 'Maximum 10 images allowed';
				return false;
			}
		}

		if (currentStep === 2) {
			if (!formData.title.trim()) {
				validationErrors.title = 'Title is required';
			}
			if (formData.title.length > 100) {
				validationErrors.title = 'Title must be 100 characters or less';
			}
			if (!formData.categoryId) {
				validationErrors.categoryId = 'Category is required';
			}
			if (!formData.description.trim()) {
				validationErrors.description = 'Description is required';
			}
			if (formData.description.length < 20) {
				validationErrors.description = 'Description must be at least 20 characters';
			}
			if (!formData.price || parseFloat(formData.price) <= 0) {
				validationErrors.price = 'Valid price is required';
			}
			if (!formData.location.trim()) {
				validationErrors.location = 'Location is required';
			}
			if (!formData.contactNumber.trim()) {
				validationErrors.contactNumber = 'Contact number is required';
			}
			return Object.keys(validationErrors).length === 0;
		}

		return true;
	}

	// Form submission
	async function handleSubmit(isDraft: boolean = false) {
		if (!isDraft && !formData.selectedTier) {
			validationErrors.tier = 'Please select a pricing tier';
			return;
		}

		isSubmitting = true;

		try {
			const payload = {
				title: formData.title,
				categoryId: parseInt(formData.categoryId, 10),
				description: formData.description,
				price: parseFloat(formData.price),
				location: formData.location,
				contactNumber: formData.contactNumber,
				images: formData.images.map((url, index) => ({
					imageUrl: url,
					displayOrder: index
				})),
				...(formData.brand && { brand: formData.brand }),
				...(formData.emailAddress && { emailAddress: formData.emailAddress }),
				...(formData.deliveryMethod && { deliveryMethod: formData.deliveryMethod }),
				...(formData.gpsLocation && { gpsLocation: formData.gpsLocation })
			};

			const result = await createPost(payload);

			if (result.success && result.data) {
				// Redirect to the created post or listings page
				goto(`/post/${result.data.id}`);
				// goto('/my-listing');
			} else {
				throw new Error(result.error?.message || 'Failed to create post');
			}
		} catch (error) {
			console.error('Error creating post:', error);
			validationErrors.submit = error instanceof Error ? error.message : 'Failed to create post';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="flex h-screen overflow-hidden bg-[#f6f8f8] dark:bg-[#102222]">
	<!-- Sidebar - Desktop Only -->
	<div class="hidden lg:block">
		<Sidebar activeRoute="/post/create" />
	</div>

	<!-- Main Content -->
	<main class="flex-1 overflow-y-auto">
		<!-- Sticky Header -->
		<header
			class="sticky top-0 z-10 bg-white dark:bg-[rgb(16_34_34/0.9)] border-b border-slate-200 dark:border-slate-700 backdrop-blur-sm"
		>
			<div class="flex items-center justify-between px-4 py-3">
				<button
					onclick={() => goto('/post/my-listings')}
					class="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
				>
					<Icon name="arrow_back" size={24} />
					<span class="hidden sm:inline">Back</span>
				</button>

				<h1 class="text-lg font-semibold text-slate-900 dark:text-white">Create Post</h1>

				<div class="w-16"></div>
				<!-- Spacer for centering -->
			</div>

			<!-- Step indicator -->
			<div class="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
				<div class="max-w-2xl mx-auto flex justify-center">
					<div class="flex items-center gap-4">
						{#each Array(totalSteps) as _, index}
							{@const stepNumber = index + 1}
							{@const isActive = stepNumber === currentStep}
							{@const isCompleted = stepNumber < currentStep}

							<div class="flex items-center">
								<!-- Step circle -->
								<button
									onclick={() => stepNumber <= currentStep && goToStep(stepNumber)}
									class="flex items-center justify-center w-8 h-8 rounded-full transition-colors
									{isActive ? 'bg-[#13ecec] text-slate-900' : ''}
									{isCompleted ? 'bg-[#13ecec] text-slate-900' : ''}
									{!isActive && !isCompleted
										? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
										: ''}
										{stepNumber <= currentStep ? 'cursor-pointer hover:opacity-80' : 'cursor-not-allowed'}"
									disabled={stepNumber > currentStep}
								>
									{#if isCompleted}
										<Icon name="check" size={20} />
									{:else}
										{stepNumber}
									{/if}
								</button>

								<!-- Step label (hidden on mobile) -->
								<span
									class="hidden sm:inline ml-2 text-sm
									{isActive ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-slate-400'}"
								>
									{stepLabels[index]}
								</span>

								<!-- Connector line -->
								{#if index < totalSteps - 1}
									<div
										class="w-16 sm:w-24 h-0.5
										{isCompleted ? 'bg-[#13ecec]' : 'bg-slate-300 dark:bg-slate-700'}"
									></div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
		</header>

		<!-- Content area -->
		<div class="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-6">
			<!-- Step 1: Image Upload -->
			{#if currentStep === 1}
				<ImageUploader bind:images={formData.images} error={validationErrors.images} />
			{/if}

			<!-- Step 2: Post Details -->
			{#if currentStep === 2}
				<PostDetailsForm bind:formData errors={validationErrors} />
			{/if}

			<!-- Step 3: Tier Selection -->
			{#if currentStep === 3}
				<TierSelection
					bind:selectedTier={formData.selectedTier}
					error={validationErrors.tier}
					onSubmit={(isDraft) => handleSubmit(isDraft)}
					{isSubmitting}
					submitError={validationErrors.submit}
				/>
			{/if}

			<!-- Navigation buttons -->
			<div class="mt-8 flex gap-3">
				{#if currentStep > 1}
					<button
						onclick={previousStep}
						disabled={isSubmitting}
						class="flex-1 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600
						text-slate-700 dark:text-slate-300 font-medium
						hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
							disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Back
					</button>
				{/if}

				{#if currentStep < totalSteps}
					<button
						onclick={nextStep}
						disabled={isSubmitting}
						class="flex-1 px-6 py-3 rounded-lg bg-[#13ecec] hover:bg-[#0fd5d5] text-slate-900 font-semibold transition-colors
							disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Next
					</button>
				{/if}
			</div>
		</div>
	</main>

	<!-- Mobile bottom navigation -->
	<MobileBottomNav activeRoute="/post/create" />
</div>
