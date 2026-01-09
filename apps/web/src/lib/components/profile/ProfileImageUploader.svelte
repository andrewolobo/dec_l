<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Avatar from '$lib/components/media/Avatar.svelte';
	import { uploadImage } from '$lib/services/upload.service';

	interface Props {
		currentImageUrl?: string;
		onImageChange: (url: string) => void;
		error?: string;
	}

	let { currentImageUrl, onImageChange, error }: Props = $props();

	let isUploading = $state(false);
	let uploadProgress = $state(0);
	let uploadError = $state('');
	let previewUrl = $state(currentImageUrl || '');

	const maxFileSize = 5 * 1024 * 1024; // 5MB
	const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];

		if (!file) return;

		uploadError = '';

		// Validate file type
		if (!acceptedTypes.includes(file.type)) {
			uploadError = 'Invalid file type. Only JPEG, PNG, and WebP are allowed.';
			return;
		}

		// Validate file size
		if (file.size > maxFileSize) {
			uploadError = 'File too large. Maximum 5MB allowed.';
			return;
		}

		await uploadFile(file);

		// Reset input
		input.value = '';
	}

	async function uploadFile(file: File) {
		isUploading = true;
		uploadProgress = 0;

		try {
			const result = await uploadImage(file, {
				onProgress: (progress) => {
					uploadProgress = progress.percentage;
				},
				maxWidth: 800,
				maxHeight: 800,
				quality: 0.9
			});

			if (result.success && result.data) {
				// Use blob path for storage
				previewUrl = result.data.previewUrl;
				onImageChange(result.data.url); // Send blob path to parent
			} else {
				throw new Error(result.error?.message || 'Upload failed');
			}
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
			uploadProgress = 0;
		}
	}

	function handleClick() {
		const input = document.getElementById('profile-image-input') as HTMLInputElement;
		input?.click();
	}

	// Update preview when currentImageUrl changes
	$effect(() => {
		if (currentImageUrl) {
			previewUrl = currentImageUrl;
		}
	});
</script>

<div class="profile-image-uploader">
	<div class="flex flex-col items-center gap-4">
		<!-- Avatar Preview -->
		<div class="relative group">
			<Avatar src={previewUrl} alt="Profile Picture" size="xl" editable={false} />

			<!-- Upload Overlay -->
			{#if !isUploading}
				<button
					type="button"
					onclick={handleClick}
					class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
				>
					<div class="flex flex-col items-center gap-1 text-white">
						<Icon name="photo_camera" size={24} />
						<span class="text-xs font-medium">Change</span>
					</div>
				</button>
			{/if}

			<!-- Upload Progress -->
			{#if isUploading}
				<div
					class="absolute inset-0 flex items-center justify-center rounded-full bg-black/70"
				>
					<div class="flex flex-col items-center gap-2 text-white">
						<svg
							class="animate-spin"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span class="text-xs font-medium">{uploadProgress}%</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Upload Instructions -->
		<div class="text-center">
			<button
				type="button"
				onclick={handleClick}
				disabled={isUploading}
				class="text-primary hover:text-primary/80 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{previewUrl ? 'Change Photo' : 'Upload Photo'}
			</button>
			<p class="text-xs text-slate-500 dark:text-gray-400 mt-1">
				JPG, PNG or WebP. Max 5MB.
			</p>
		</div>

		<!-- Hidden File Input -->
		<input
			id="profile-image-input"
			type="file"
			accept={acceptedTypes.join(',')}
			onchange={handleFileSelect}
			class="hidden"
		/>

		<!-- Error Messages -->
		{#if uploadError || error}
			<div class="text-red-500 text-sm text-center">
				{uploadError || error}
			</div>
		{/if}
	</div>
</div>
