<script lang="ts">
	/**
	 * Messages Page
	 * Displays conversation list and message thread
	 * Desktop: Two-column layout with sidebar navigation visible
	 * Mobile: Single column with bottom navigation
	 */

	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Avatar from '$lib/components/media/Avatar.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import { isAuthenticated } from '$lib/stores';
	import type { ConversationPreviewDTO } from '$lib/types/message.types';
	import { getMockConversations } from '$lib/utils/mock-messages';

	// Mock data - will be replaced with API calls
	let conversations: ConversationPreviewDTO[] = [];
	let selectedConversationId: number | null = null;
	let searchQuery = '';
	let loading = true;

	// Responsive state
	let isMobile = false;

	onMount(() => {
		// Load mock conversations
		loadMockConversations();

		// Check screen size
		checkScreenSize();
		window.addEventListener('resize', checkScreenSize);

		return () => {
			window.removeEventListener('resize', checkScreenSize);
		};
	});

	function checkScreenSize() {
		isMobile = window.innerWidth < 768;
	}

	function loadMockConversations() {
		// Load mock conversations
		conversations = getMockConversations();
		loading = false;
	}

	function selectConversation(userId: number) {
		selectedConversationId = userId;
		// Navigate to conversation detail page
		window.location.href = `/messages/${userId}`;
	}

	function formatTimestamp(date: Date | string): string {
		const messageDate = new Date(date);
		const now = new Date();
		const diff = now.getTime() - messageDate.getTime();
		const minutes = Math.floor(diff / 60000);
		const hours = Math.floor(diff / 3600000);
		const days = Math.floor(diff / 86400000);

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days === 0) return 'Today';
		if (days === 1) return 'Yesterday';
		if (days < 7) return `${days}d ago`;

		return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function truncateMessage(message: string, maxLength: number = 60): string {
		if (message.length <= maxLength) return message;
		return message.substring(0, maxLength) + '...';
	}

	// Filter conversations based on search
	$: filteredConversations = conversations.filter((conv) =>
		conv.fullName.toLowerCase().includes(searchQuery.toLowerCase())
	);
</script>

<svelte:head>
	<title>Messages - DEC_L</title>
</svelte:head>

<div class="messages-container">
	<!-- Desktop: Show sidebar -->
	{#if !isMobile}
		<div class="sidebar-container">
			<Sidebar activeRoute="/messages" />
		</div>
	{/if}

	<!-- Main content area -->
	<div class="messages-content">
		<!-- Header -->
		<header
			class="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-800/50"
		>
			<div class="flex h-16 items-center justify-between px-4">
				<div class="w-12"></div>
				<h1 class="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">
					Messages
				</h1>
				<button
					class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50"
					aria-label="Search messages"
				>
					<Icon name="search" size={24} />
				</button>
			</div>
		</header>

		<!-- Conversations list -->
		<main class="flex-1 overflow-y-auto">
			{#if loading}
				<div class="flex items-center justify-center p-8">
					<p class="text-slate-500 dark:text-slate-400">Loading conversations...</p>
				</div>
			{:else if filteredConversations.length === 0}
				<div class="flex flex-col items-center justify-center p-8 text-center">
					<Icon name="chat_bubble" size={64} class="text-slate-300 dark:text-slate-600 mb-4" />
					<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">No messages yet</h2>
					<p class="text-slate-500 dark:text-slate-400">
						Start a conversation by messaging a seller about their listing
					</p>
				</div>
			{:else}
				<div class="flex flex-col">
					{#each filteredConversations as conversation (conversation.userId)}
						<button
							class="flex items-center gap-4 px-4 py-3 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left w-full"
							class:bg-slate-50={selectedConversationId === conversation.userId}
							class:dark:bg-slate-900={selectedConversationId === conversation.userId}
							onclick={() => selectConversation(conversation.userId)}
						>
							<!-- Avatar with online status -->
							<div class="relative h-14 w-14 flex-shrink-0">
								<Avatar
									src={conversation.profilePictureUrl}
									alt={conversation.fullName}
									size="md"
									status={conversation.isOnline ? 'online' : undefined}
								/>
							</div>

							<!-- Conversation info -->
							<div class="flex-1 overflow-hidden">
								<div class="flex items-center justify-between mb-1">
									<p class="font-bold text-slate-900 dark:text-white truncate">
										{conversation.fullName}
									</p>
									<p class="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">
										{formatTimestamp(conversation.lastMessageAt)}
									</p>
								</div>
								<div class="flex items-center justify-between gap-2">
									<p
										class={`truncate text-sm ${conversation.unreadCount > 0 ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-500 dark:text-slate-400'}`}
									>
										{truncateMessage(conversation.lastMessage)}
									</p>
									{#if conversation.unreadCount > 0}
										<span
											class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-background-dark"
										>
											{conversation.unreadCount}
										</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</main>

		<!-- Mobile: Bottom navigation -->
		<MobileBottomNav activeRoute="/messages" />
	</div>
</div>

<style>
	.messages-container {
		display: flex;
		min-height: 100vh;
		background-color: var(--background-light);
	}

	:global(.dark) .messages-container {
		background-color: var(--background-dark);
	}

	.sidebar-container {
		width: 256px;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
		overflow-y: auto;
	}

	.messages-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		max-width: 100%;
	}

	/* Mobile layout */
	@media (max-width: 767px) {
		.sidebar-container {
			display: none;
		}

		.messages-content {
			padding-bottom: 4rem; /* Space for bottom nav */
		}
	}

	/* Desktop layout */
	@media (min-width: 768px) {
		.messages-content {
			max-width: 800px;
			margin: 0 auto;
		}
	}
</style>
