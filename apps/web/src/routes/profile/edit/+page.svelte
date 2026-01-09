<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Button from '$lib/components/buttons/Button.svelte';
	import IconButton from '$lib/components/buttons/IconButton.svelte';
	import Input from '$lib/components/forms/Input.svelte';
	import TextArea from '$lib/components/forms/TextArea.svelte';
	import AvatarPicker from '$lib/components/media/AvatarPicker.svelte';
	import { currentUser } from '$lib/stores';
	import { updateProfile } from '$lib/services/user.service';
	import { generateSeedFromEmail } from '$lib/utils/avatar.utils';

	// Form state
	let formData = $state({
		fullName: '',
		location: '',
		bio: '',
		profilePictureUrl: ''
	});

	// Original values for dirty check
	let originalData = $state({
		fullName: '',
		location: '',
		bio: '',
		profilePictureUrl: ''
	});

	// Validation state
	let validationErrors = $state<Record<string, string>>({});

	// UI state
	let isSubmitting = $state(false);
	let isLoading = $state(true);
	let isDirty = $state(false);
	let showCancelDialog = $state(false);

	// Get email for avatar generation
	let userEmail = $state('');

	// Load current user data
	onMount(() => {
		const user = $currentUser;

		if (!user) {
			// Redirect to login if not authenticated
			goto('/login');
			return;
		}

		// Store email for avatar generation
		userEmail = user.emailAddress || user.email || '';

		// Initialize form with current user data
		formData = {
			fullName: user.fullName || '',
			location: user.location || '',
			bio: user.bio || '',
			profilePictureUrl: user.profilePictureUrl || ''
		};

		// Store original values
		originalData = { ...formData };
		isLoading = false;
	});

	// Check if form has changes
	$effect(() => {
		isDirty =
			formData.fullName !== originalData.fullName ||
			formData.location !== originalData.location ||
			formData.bio !== originalData.bio ||
			formData.profilePictureUrl !== originalData.profilePictureUrl;
	});

	// Validation
	function validateForm(): boolean {
		validationErrors = {};

		// Full Name validation
		if (!formData.fullName.trim()) {
			validationErrors.fullName = 'Full name is required';
		} else if (formData.fullName.length < 2) {
			validationErrors.fullName = 'Name must be at least 2 characters';
		} else if (formData.fullName.length > 255) {
			validationErrors.fullName = 'Name cannot exceed 255 characters';
		}

		// Location validation (optional)
		if (formData.location && formData.location.length > 255) {
			validationErrors.location = 'Location cannot exceed 255 characters';
		}

		// Bio validation (optional)
		if (formData.bio && formData.bio.length > 500) {
			validationErrors.bio = 'Bio cannot exceed 500 characters';
		}

		return Object.keys(validationErrors).length === 0;
	}

	// Handle form submission
	async function handleSubmit() {
		if (!validateForm()) {
			return;
		}

		isSubmitting = true;

		try {
			// Prepare update data (only include fields that have values)
			const updateData: any = {
				fullName: formData.fullName.trim()
			};

			if (formData.location) {
				updateData.location = formData.location.trim();
			}

			if (formData.bio) {
				updateData.bio = formData.bio.trim();
			}

			if (formData.profilePictureUrl) {
				updateData.profilePictureUrl = formData.profilePictureUrl;
			}

			const result = await updateProfile(updateData);

			if (result.success) {
				// Navigate back to profile
				goto('/profile');
			} else {
				validationErrors.submit = result.error?.message || 'Failed to update profile';
			}
		} catch (error) {
			console.error('Error updating profile:', error);
			validationErrors.submit = error instanceof Error ? error.message : 'Failed to update profile';
		} finally {
			isSubmitting = false;
		}
	}

	// Handle cancel
	function handleCancel() {
		if (isDirty) {
			showCancelDialog = true;
		} else {
			goto('/profile');
		}
	}

	// Confirm cancel
	function confirmCancel() {
		showCancelDialog = false;
		goto('/profile');
	}
</script>

<svelte:head>
	<title>Edit Profile - TundaHub</title>
</svelte:head>

<div
	class="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark"
>
	<!-- Side Navigation (Desktop) -->
	<aside class="hidden md:block">
		<Sidebar activeRoute="/profile" collapsed={false} />
	</aside>

	<div class="flex-1 flex flex-col overflow-hidden">
		<div class="min-h-screen bg-background-light dark:bg-background-dark pb-24 md:pb-0 overflow-y-auto">
			<!-- Top App Bar -->
			<header
				class="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200/30 dark:border-slate-600/20 backdrop-blur-md"
			>
				<div class="flex items-center justify-between p-4 max-w-2xl mx-auto">
					<IconButton
						icon="arrow_back"
						ariaLabel="Back to Profile"
						variant="default"
						onclick={handleCancel}
					/>
					<h1 class="text-lg font-bold text-slate-900 dark:text-white">Edit Profile</h1>
					<div class="w-12"></div>
				</div>
			</header>

			<!-- Centered Content Container -->
			<div class="max-w-2xl mx-auto p-4">
				{#if isLoading}
					<div class="flex items-center justify-center py-12">
						<div class="text-slate-500 dark:text-gray-400">Loading...</div>
					</div>
				{:else}
					<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
						<!-- Profile Picture Picker -->
						{#if userEmail}
							<div class="py-4">
								<AvatarPicker
									email={userEmail}
									bind:selected={formData.profilePictureUrl}
								/>
							</div>
						{/if}

						<!-- Full Name -->
						<div>
							<Input
								type="text"
								label="Full Name"
								placeholder="Enter your full name"
								bind:value={formData.fullName}
								error={validationErrors.fullName}
								required
								autocomplete="name"
							/>
						</div>

						<!-- Location -->
						<div>
							<Input
								type="text"
								label="Location"
								placeholder="e.g., Nairobi, Kenya"
								bind:value={formData.location}
								error={validationErrors.location}
								icon="location_on"
								iconPosition="left"
								autocomplete="address-level2"
							/>
						</div>

						<!-- Bio -->
						<div>
							<TextArea
								label="Bio"
								placeholder="Tell us about yourself..."
								bind:value={formData.bio}
								rows={5}
								maxLength={500}
								error={validationErrors.bio}
								autoResize={false}
							/>
						</div>

						<!-- Error Message -->
						{#if validationErrors.submit}
							<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
		</div>
	</div>
</div>

<!-- Cancel Confirmation Dialog -->
{#if showCancelDialog}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		onclick={() => (showCancelDialog = false)}
	>
		<div
			class="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md mx-4 p-6"
			onclick={(e) => e.stopPropagation()}
		>
			<h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">
				Discard Changes?
			</h3>
			<p class="text-slate-600 dark:text-gray-400 mb-6">
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
