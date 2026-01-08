<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface ImageCarouselProps {
		images: string[];
		aspectRatio?: string;
		autoPlay?: boolean;
		autoPlayInterval?: number;
		showThumbnails?: boolean;
		showCounter?: boolean;
		class?: string;
		onImageClick?: (index: number) => void;
	}

	let {
		images,
		aspectRatio = '16:9',
		autoPlay = false,
		autoPlayInterval = 3000,
		showThumbnails = false,
		showCounter = true,
		class: className = '',
		onImageClick
	}: ImageCarouselProps = $props();

	let currentIndex = $state(0);
	let isDragging = $state(false);
	let startX = $state(0);
	let scrollLeft = $state(0);
	let carouselRef = $state<HTMLDivElement>();
	let autoPlayTimer: ReturnType<typeof setInterval> | null = null;

	function goToSlide(index: number) {
		currentIndex = Math.max(0, Math.min(index, images.length - 1));
		resetAutoPlay();
	}

	function nextSlide() {
		currentIndex = (currentIndex + 1) % images.length;
		resetAutoPlay();
	}

	function prevSlide() {
		currentIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
		resetAutoPlay();
	}

	function handleDragStart(e: MouseEvent | TouchEvent) {
		isDragging = true;
		startX = 'touches' in e ? e.touches[0].pageX : e.pageX;
		if (carouselRef) {
			scrollLeft = carouselRef.scrollLeft;
		}
	}

	function handleDragMove(e: MouseEvent | TouchEvent) {
		if (!isDragging || !carouselRef) return;
		// e.preventDefault();
		const x = 'touches' in e ? e.touches[0].pageX : e.pageX;
		const walk = (x - startX) * 2;
		carouselRef.scrollLeft = scrollLeft - walk;
	}

	function handleDragEnd(e: MouseEvent | TouchEvent) {
		if (!isDragging || !carouselRef) return;
		isDragging = false;
		const x = 'changedTouches' in e ? e.changedTouches[0].pageX : e.pageX;
		const diff = startX - x;

		if (Math.abs(diff) > 50) {
			if (diff > 0) {
				nextSlide();
			} else {
				prevSlide();
			}
		}
	}

	function handleImageClick() {
		onImageClick?.(currentIndex);
	}

	function startAutoPlay() {
		if (autoPlay && images.length > 1) {
			autoPlayTimer = setInterval(() => {
				nextSlide();
			}, autoPlayInterval);
		}
	}

	function stopAutoPlay() {
		if (autoPlayTimer) {
			clearInterval(autoPlayTimer);
			autoPlayTimer = null;
		}
	}

	function resetAutoPlay() {
		stopAutoPlay();
		startAutoPlay();
	}

	$effect(() => {
		startAutoPlay();
		return () => stopAutoPlay();
	});

	function getAspectRatioClass() {
		const ratios: Record<string, string> = {
			'16:9': 'aspect-video',
			'4:3': 'aspect-[4/3]',
			'1:1': 'aspect-square',
			'3:4': 'aspect-[3/4]'
		};
		return ratios[aspectRatio] || 'aspect-video';
	}
</script>

<div class="relative w-full {className}">
	<!-- Main Image Display -->
	<div
		bind:this={carouselRef}
		class="relative {getAspectRatioClass()} bg-gray-100 dark:bg-slate-800 rounded-2xl overflow-hidden cursor-pointer group"
		role="button"
		tabindex="0"
		onmousedown={handleDragStart}
		onmousemove={handleDragMove}
		onmouseup={handleDragEnd}
		onmouseleave={() => (isDragging = false)}
		ontouchstart={handleDragStart}
		ontouchmove={handleDragMove}
		ontouchend={handleDragEnd}
		onclick={handleImageClick}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				handleImageClick();
			} else if (e.key === 'ArrowLeft') {
				e.preventDefault();
				prevSlide();
			} else if (e.key === 'ArrowRight') {
				e.preventDefault();
				nextSlide();
			}
		}}
	>
		<img
			src={images[currentIndex]}
			alt={`Image ${currentIndex + 1} of ${images.length}`}
			class="size-full object-cover select-none transition-opacity duration-300"
			draggable="false"
		/>

		<!-- Navigation Arrows (only if more than 1 image) -->
		{#if images.length > 1}
			<button
				type="button"
				class="absolute left-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white dark:hover:bg-slate-700"
				onclick={(e) => {
					e.stopPropagation();
					prevSlide();
				}}
				aria-label="Previous image"
			>
				<Icon name="chevron_left" size={24} class="text-slate-900 dark:text-white" />
			</button>

			<button
				type="button"
				class="absolute right-4 top-1/2 -translate-y-1/2 size-10 rounded-full bg-white/90 dark:bg-slate-800/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white dark:hover:bg-slate-700"
				onclick={(e) => {
					e.stopPropagation();
					nextSlide();
				}}
				aria-label="Next image"
			>
				<Icon name="chevron_right" size={24} class="text-slate-900 dark:text-white" />
			</button>
		{/if}

		<!-- Counter -->
		{#if showCounter && images.length > 1}
			<div
				class="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-sm font-semibold"
			>
				{currentIndex + 1} / {images.length}
			</div>
		{/if}

		<!-- Dot Indicators -->
		{#if images.length > 1 && images.length <= 5}
			<div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
				{#each images as _, index}
					<button
						type="button"
						class="size-2 rounded-full transition-all duration-300 {index === currentIndex
							? 'bg-white w-6'
							: 'bg-white/50 hover:bg-white/75'}"
						onclick={(e) => {
							e.stopPropagation();
							goToSlide(index);
						}}
						aria-label={`Go to image ${index + 1}`}
					></button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Thumbnail Strip -->
	{#if showThumbnails && images.length > 1}
		<div class="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-thin">
			{#each images as image, index}
				<button
					type="button"
					class="flex-shrink-0 size-16 rounded-lg overflow-hidden border-2 transition-all {index ===
					currentIndex
						? 'border-primary ring-2 ring-primary/20'
						: 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}"
					onclick={() => goToSlide(index)}
				>
					<img src={image} alt={`Thumbnail ${index + 1}`} class="size-full object-cover" />
				</button>
			{/each}
		</div>
	{/if}
</div>
