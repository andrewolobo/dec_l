<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import { uploadImages } from '$lib/services/upload.service';

	interface Props {
		images: string[];
		error?: string;
	}

	let { images = $bindable([]), error }: Props = $props();

	let isDragging = $state(false);
	let isUploading = $state(false);
	let uploadProgress = $state<number[]>([]);
	let uploadError = $state('');
	
	// Map blob paths to preview URLs for display
	let previewUrlMap = $state<Map<string, string>>(new Map());

	const maxImages = 10;
	const maxFileSize = 10 * 1024 * 1024; // 10MB
	const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;

		const files = Array.from(e.dataTransfer?.files || []);
		await uploadFiles(files);
	}

	async function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		const files = Array.from(input.files || []);
		await uploadFiles(files);
		// Reset input so same file can be selected again
		input.value = '';
	}

	async function uploadFiles(files: File[]) {
		uploadError = '';

		// Validate file count
		if (images.length + files.length > maxImages) {
			uploadError = `Maximum ${maxImages} images allowed`;
			return;
		}

		// Validate files
		const validFiles: File[] = [];
		for (const file of files) {
			if (!acceptedTypes.includes(file.type)) {
				uploadError = `Invalid file type: ${file.name}. Only JPEG, PNG, and WebP are allowed.`;
				continue;
			}
			if (file.size > maxFileSize) {
				uploadError = `File too large: ${file.name}. Maximum 10MB per image.`;
				continue;
			}
			validFiles.push(file);
		}

		if (validFiles.length === 0) return;

		isUploading = true;
		uploadProgress = new Array(validFiles.length).fill(0);

		try {
			// Upload all files using the upload service
			const result = await uploadImages(validFiles, {
				onProgress: (progress) => {
					// Update overall progress
					uploadProgress = uploadProgress.map(() => progress.percentage);
				}
			});

			if (result.success && result.data) {
			// Store blob paths (for form submission) and map to preview URLs (for display)
			const blobPaths = result.data.map((item) => item.url);
			
			// Store blob paths in the images array (sent to API)
			images = [...images, ...blobPaths];
			
			// Map each blob path to its preview URL for display
			result.data.forEach((item) => {
				previewUrlMap.set(item.url, item.previewUrl);
			});
			} else {
				throw new Error(result.error?.message || 'Upload failed');
			}
		} catch (err) {
			uploadError = err instanceof Error ? err.message : 'Upload failed';
			console.error('Upload error:', err);
		} finally {
			isUploading = false;
			uploadProgress = [];
		}
	}

	function removeImage(index: number) {
		images = images.filter((_, i) => i !== index);
	}

	function moveImage(fromIndex: number, toIndex: number) {
		if (toIndex < 0 || toIndex >= images.length) return;

		const newImages = [...images];
		const [removed] = newImages.splice(fromIndex, 1);
		newImages.splice(toIndex, 0, removed);
		images = newImages;
	}

	function handleImageKeyDown(e: KeyboardEvent, index: number) {
		if (e.key === 'Delete' || e.key === 'Backspace') {
			e.preventDefault();
			removeImage(index);
		} else if (e.key === 'ArrowLeft' && index > 0) {
			e.preventDefault();
			moveImage(index, index - 1);
		} else if (e.key === 'ArrowRight' && index < images.length - 1) {
			e.preventDefault();
			moveImage(index, index + 1);
		}
	}
</script>

<div class="space-y-4">
	<div>
		<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">Add Images</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400">
			Upload up to {maxImages} images. The first image will be the cover photo.
		</p>
	</div>

	<!-- Upload zone -->
	{#if images.length < maxImages}
		<div
			role="button"
			tabindex="0"
			class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
				{isDragging
				? 'border-[#13ecec] bg-[#13ecec]/10 dark:bg-[#13ecec]/5'
				: 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'}"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
		>
			<input
				type="file"
				id="image-upload"
				class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
				accept={acceptedTypes.join(',')}
				multiple
				disabled={isUploading}
				onchange={handleFileSelect}
			/>

			<div class="pointer-events-none">
				<Icon
					name={isDragging ? 'cloud_upload' : 'add_photo_alternate'}
					size={48}
					class="mx-auto mb-3 text-slate-400 dark:text-slate-500"
				/>

				<p class="text-slate-700 dark:text-slate-300 font-medium mb-1">
					{isDragging ? 'Drop images here' : 'Drag and drop images here'}
				</p>

				<p class="text-sm text-slate-500 dark:text-slate-400 mb-3">or click to browse</p>

				<p class="text-xs text-slate-400 dark:text-slate-500">
					JPEG, PNG, or WebP • Max 10MB per image
				</p>
			</div>

			{#if isUploading}
				<div class="mt-4 pointer-events-none">
					<div class="flex items-center justify-center gap-2">
						<div
							class="w-5 h-5 border-2 border-[#13ecec] border-t-transparent rounded-full animate-spin"
						></div>
						<span class="text-sm text-slate-600 dark:text-slate-400">Uploading...</span>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Error messages -->
	{#if error || uploadError}
		<div
			class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
		>
			<Icon name="error" size={20} class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
			<p class="text-sm text-red-700 dark:text-red-300">{error || uploadError}</p>
		</div>
	{/if}

	<!-- Image grid -->
	{#if images.length > 0}
		<div>
			<div class="flex items-center justify-between mb-3">
				<p class="text-sm text-slate-600 dark:text-slate-400">
					{images.length} / {maxImages} images
				</p>
				<p class="text-xs text-slate-500 dark:text-slate-500">
					Drag to reorder • First image is the cover
				</p>
			</div>

			<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
				{#each images as image, index (image)}
					<div
						class="relative group aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800"
					>
						<!-- Image -->
						<img
							src={previewUrlMap.get(image) || image}
							alt="Upload {index + 1}"
							class="w-full h-full object-cover"
							draggable="true"
							ondragstart={(e) => {
								e.dataTransfer!.effectAllowed = 'move';
								e.dataTransfer!.setData('text/plain', index.toString());
							}}
							ondragover={(e) => {
								e.preventDefault();
								e.dataTransfer!.dropEffect = 'move';
							}}
							ondrop={(e) => {
								e.preventDefault();
								const fromIndex = parseInt(e.dataTransfer!.getData('text/plain'));
								moveImage(fromIndex, index);
							}}
						/>

						<!-- Cover badge -->
						{#if index === 0}
							<div
								class="absolute top-2 left-2 px-2 py-0.5 bg-[#13ecec] text-slate-900 text-xs font-medium rounded"
							>
								Cover
							</div>
						{/if}

						<!-- Actions overlay -->
						<div class="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors">
							<div
								class="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
							>
								<!-- Move left -->
								{#if index > 0}
									<button
										onclick={() => moveImage(index, index - 1)}
										class="p-2 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
										aria-label="Move left"
									>
										<Icon name="chevron_left" size={20} />
									</button>
								{/if}

								<!-- Delete -->
								<button
									onclick={() => removeImage(index)}
									class="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
									aria-label="Remove image"
								>
									<Icon name="delete" size={20} />
								</button>

								<!-- Move right -->
								{#if index < images.length - 1}
									<button
										onclick={() => moveImage(index, index + 1)}
										class="p-2 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
										aria-label="Move right"
									>
										<Icon name="chevron_right" size={20} />
									</button>
								{/if}
							</div>
						</div>

						<!-- Image number -->
						<div
							class="absolute bottom-2 right-2 w-6 h-6 bg-black/70 text-white text-xs font-medium rounded-full flex items-center justify-center"
						>
							{index + 1}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Info message when empty -->
	{#if images.length === 0 && !isUploading}
		<div
			class="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
		>
			<Icon name="info" size={20} class="text-blue-600 dark:text-blue-400 flex-shrink-0" />
			<p class="text-sm text-blue-700 dark:text-blue-300">
				Add at least one image to continue. High-quality images help your post get more views.
			</p>
		</div>
	{/if}
</div>
