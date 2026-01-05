<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Badge from '$lib/components/media/Badge.svelte';
	import ImageCarousel from '$lib/components/media/ImageCarousel.svelte';
	import DropdownMenu, { type MenuItem } from '$lib/components/buttons/DropdownMenu.svelte';
	import type { PostResponseDTO } from '$lib/types/post.types';
	import { PostStatus } from '$lib/types/post.types';

	interface Props {
		post: PostResponseDTO;
		onEdit?: () => void;
		onDelete?: () => void;
		onManage?: () => void;
		onRenew?: () => void;
		onRelist?: () => void;
		onClick?: () => void;
	}

	let { post, onEdit, onDelete, onManage, onRenew, onRelist, onClick }: Props = $props();

	const menuItems = $derived.by(() => {
		const items: MenuItem[] = [];

		// Edit option for Active, Expired, Draft, Scheduled
		if (
			onEdit &&
			(post.status === PostStatus.ACTIVE ||
				post.status === PostStatus.EXPIRED ||
				post.status === PostStatus.DRAFT ||
				post.status === PostStatus.SCHEDULED)
		) {
			items.push({ icon: 'edit', label: 'Edit', action: onEdit });
		}

		// Manage option for Pending Payment
		if (onManage && post.status === PostStatus.PENDING_PAYMENT) {
			items.push({ icon: 'settings', label: 'Manage', action: onManage });
		}

		// Renew option for Expired
		if (onRenew && post.status === PostStatus.EXPIRED) {
			items.push({ icon: 'refresh', label: 'Renew', action: onRenew });
		}

		// Relist option for Expired
		if (onRelist && post.status === PostStatus.EXPIRED) {
			items.push({ icon: 'repeat', label: 'Relist', action: onRelist });
		}

		// Delete option for all statuses
		if (onDelete) {
			items.push({ icon: 'delete', label: 'Delete', action: onDelete, danger: true });
		}

		return items;
	});

	const statusConfig = $derived.by(() => {
		switch (post.status) {
			case PostStatus.ACTIVE:
				return { color: 'success' as const, label: 'Active' };
			case PostStatus.EXPIRED:
				return { color: 'danger' as const, label: 'Expired' };
			case PostStatus.PENDING_PAYMENT:
				return { color: 'warning' as const, label: 'Pending' };
			case PostStatus.DRAFT:
				return { color: 'info' as const, label: 'Draft' };
			case PostStatus.SCHEDULED:
				return { color: 'info' as const, label: 'Scheduled' };
			case PostStatus.REJECTED:
				return { color: 'danger' as const, label: 'Rejected' };
			default:
				return { color: 'primary' as const, label: post.status };
		}
	});

	const formatDate = (date: Date | undefined) => {
		if (!date) return '';
		const now = new Date();
		const dateObj = new Date(date);
		const diff = now.getTime() - dateObj.getTime();
		const days = Math.floor(diff / 86400000);

		if (days < 1) return 'Today';
		if (days < 7) return `${days}d ago`;
		return dateObj.toLocaleDateString();
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-JM', {
			style: 'currency',
			currency: 'JMD',
			minimumFractionDigits: 0
		}).format(price);
	};

	// Apply grayscale filter for expired posts
	const isExpired = $derived(post.status === PostStatus.EXPIRED);
</script>

<div
	class="bg-white dark:bg-[rgb(16_34_34/0.8)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-slate-200 dark:border-slate-700 flex flex-col"
	class:opacity-70={isExpired}
	role="button"
	tabindex="0"
	onclick={onClick}
	onkeydown={(e) => e.key === 'Enter' && onClick?.()}
>
	<!-- Image Section -->
	<div class="w-full aspect-[4/3]">
		{#if post.images && post.images.length > 0}
			<div class:grayscale={isExpired}>
				<ImageCarousel
					images={post.images.map((img) => img.imageUrl)}
					showThumbnails={false}
					autoPlay={false}
				/>
			</div>
		{:else}
			<div
				class="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center"
				class:grayscale={isExpired}
			>
				<Icon name="image" size={48} class="text-slate-400 dark:text-slate-500" />
			</div>
		{/if}
	</div>

	<!-- Content Section -->
	<div class="p-4 flex-1 flex flex-col">
		<!-- Header: Status & Menu -->
		<div class="flex items-center justify-between mb-2">
			<Badge variant="status" color={statusConfig.color}>{statusConfig.label}</Badge>
			<DropdownMenu items={menuItems} align="end">
				{#snippet children()}
					<button
						class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
						aria-label="More options"
						onclick={(e) => e.stopPropagation()}
					>
						<Icon name="more_vert" size={20} />
					</button>
				{/snippet}
			</DropdownMenu>
		</div>

		<!-- Title -->
		<h3 class="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 mb-2">
			{post.title}
		</h3>

		<!-- Description -->
		<p class="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
			{post.description}
		</p>

		<!-- Location & Price -->
		<div class="flex items-center justify-between mb-3 mt-auto">
			<!-- <div class="flex items-center gap-1 text-slate-500 dark:text-slate-400">
				<Icon name="location_on" size={16} />
				<span class="text-sm">{post.location}</span>
			</div> -->
			<span class="text-lg font-bold text-primary-600 dark:text-primary-400">
				{formatPrice(post.price)}
			</span>
		</div>

		<!-- Stats Row -->
		<div class="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
			<div class="flex items-center gap-1">
				<Icon name="visibility" size={16} />
				<span>{post.viewCount}</span>
			</div>
			{#if post.status === PostStatus.ACTIVE || post.status === PostStatus.EXPIRED}
				<div class="flex items-center gap-1">
					<Icon name="favorite" size={16} />
					<span>{post.likeCount}</span>
				</div>
			{/if}
			{#if post.publishedAt}
				<div class="flex items-center gap-1 ml-auto">
					<Icon name="schedule" size={16} />
					<span>{formatDate(post.publishedAt)}</span>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
			{#if post.status === PostStatus.ACTIVE && onEdit}
				<button
					class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
					onclick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
				>
					<Icon name="edit" size={18} />
					Edit
				</button>
			{/if}

			{#if post.status === PostStatus.PENDING_PAYMENT && onManage}
				<button
					class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
					onclick={(e) => {
						e.stopPropagation();
						onManage();
					}}
				>
					<Icon name="settings" size={18} />
					Manage
				</button>
			{/if}

			{#if post.status === PostStatus.EXPIRED}
				{#if onRenew}
					<button
						class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
						onclick={(e) => {
							e.stopPropagation();
							onRenew();
						}}
					>
						<Icon name="refresh" size={18} />
						Renew
					</button>
				{/if}
				{#if onRelist}
					<button
						class="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
						onclick={(e) => {
							e.stopPropagation();
							onRelist();
						}}
					>
						<Icon name="repeat" size={18} />
						Relist
					</button>
				{/if}
			{/if}

			{#if post.status === PostStatus.DRAFT && onEdit}
				<button
					class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
					onclick={(e) => {
						e.stopPropagation();
						onEdit();
					}}
				>
					<Icon name="edit" size={18} />
					Continue Editing
				</button>
			{/if}

			{#if post.status === PostStatus.SCHEDULED}
				<button
					class="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
					disabled
				>
					<Icon name="schedule" size={18} />
					Scheduled for {formatDate(post.scheduledPublishTime)}
				</button>
			{/if}
		</div>
	</div>
</div>
