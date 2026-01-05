<script lang="ts">
	/**
	 * Conversation Detail Page
	 * Displays individual message thread with a specific user
	 * Includes message history, real-time updates, and message sending
	 */

	import { onMount, afterUpdate } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Avatar from '$lib/components/media/Avatar.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import type { MessageResponseDTO } from '$lib/types/message.types';
	import { getMockMessages, getMockUser } from '$lib/utils/mock-messages';

	// Get userId from URL parameter
	let userId = 0;

	// Extract userId from window location
	if (typeof window !== 'undefined') {
		const pathParts = window.location.pathname.split('/');
		userId = Number(pathParts[pathParts.length - 1]);
	}

	// State
	let messages: MessageResponseDTO[] = [];
	let newMessage = '';
	let loading = true;
	let sending = false;
	let messageContainer: HTMLElement;
	let isMobile = false;

	// Current user (mock)
	const currentUserId = 100;

	// Get conversation partner info (will be set in onMount)
	let otherUser: ReturnType<typeof getMockUser> = null;

	onMount(() => {
		// Get userId from URL if not already set
		if (!userId) {
			const pathParts = window.location.pathname.split('/');
			userId = Number(pathParts[pathParts.length - 1]);
		}

		// Get other user info
		otherUser = getMockUser(userId);
		if (!otherUser) {
			// User not found, redirect back to messages
			window.location.href = '/messages';
			return;
		}

		loadMessages();
		checkScreenSize();
		window.addEventListener('resize', checkScreenSize);

		return () => {
			window.removeEventListener('resize', checkScreenSize);
		};
	});

	afterUpdate(() => {
		// Auto-scroll to bottom when new messages are added
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
		}
	});

	function checkScreenSize() {
		isMobile = window.innerWidth < 768;
	}

	function loadMessages() {
		loading = true;
		// Simulate API delay
		setTimeout(() => {
			messages = getMockMessages(userId);
			loading = false;
		}, 300);
	}

	async function handleSendMessage() {
		if (!newMessage.trim() || sending) return;

		sending = true;

		// Create new message
		const message: MessageResponseDTO = {
			messageId: Date.now(),
			senderId: currentUserId,
			recipientId: userId,
			messageContent: newMessage.trim(),
			messageType: 'text',
			isRead: false,
			isDeleted: false,
			isEdited: false,
			createdAt: new Date(),
			updatedAt: new Date()
		};

		// Optimistic update
		messages = [...messages, message];
		newMessage = '';

		// Simulate API call
		setTimeout(() => {
			sending = false;
		}, 500);
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSendMessage();
		}
	}

	function formatMessageTime(date: Date | string): string {
		const messageDate = new Date(date);
		const now = new Date();
		const isToday = messageDate.toDateString() === now.toDateString();
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		const isYesterday = messageDate.toDateString() === yesterday.toDateString();

		if (isToday) {
			return messageDate.toLocaleTimeString('en-US', {
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		} else if (isYesterday) {
			return (
				'Yesterday ' +
				messageDate.toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					hour12: true
				})
			);
		} else {
			return messageDate.toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit',
				hour12: true
			});
		}
	}

	function isMyMessage(message: MessageResponseDTO): boolean {
		return message.senderId === currentUserId;
	}

	function goBack() {
		window.location.href = '/messages';
	}
</script>

<svelte:head>
	<title>{otherUser?.fullName || 'Conversation'} - Messages - DEC_L</title>
</svelte:head>

<div class="conversation-container">
	<!-- Desktop: Show sidebar -->
	{#if !isMobile}
		<div class="sidebar-container">
			<Sidebar activeRoute="/messages" />
		</div>
	{/if}

	<!-- Main conversation area -->
	<div class="conversation-content">
		<!-- Header -->
		<header
			class="sticky top-0 z-10 bg-white dark:bg-background-dark border-b border-slate-200 dark:border-slate-800"
		>
			<div class="flex h-16 items-center gap-3 px-4">
				<!-- Back button -->
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
					onclick={goBack}
					aria-label="Go back to messages"
				>
					<Icon name="arrow_back" size={24} />
				</button>

				<!-- User info -->
				{#if otherUser}
					<div class="flex flex-1 items-center gap-3 min-w-0">
						<div class="relative flex-shrink-0">
							<Avatar
								src={otherUser.profilePictureUrl}
								alt={otherUser.fullName}
								size="sm"
								status={otherUser.isOnline ? 'online' : undefined}
							/>
						</div>
						<div class="flex-1 min-w-0">
							<h1 class="text-base font-bold text-slate-900 dark:text-white truncate">
								{otherUser.fullName}
							</h1>
							{#if otherUser.isOnline}
								<p class="text-xs text-green-500">Active now</p>
							{:else}
								<p class="text-xs text-slate-500 dark:text-slate-400">Offline</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- More options -->
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
					aria-label="More options"
				>
					<Icon name="more_vert" size={24} />
				</button>
			</div>
		</header>

		<!-- Messages container -->
		<main
			bind:this={messageContainer}
			class="flex-1 overflow-y-auto p-4 space-y-4"
			style="background: var(--background-light); height: calc(100vh - 128px);"
		>
			{#if loading}
				<div class="flex items-center justify-center h-full">
					<div class="text-center">
						<p class="text-slate-500 dark:text-slate-400">Loading messages...</p>
					</div>
				</div>
			{:else if messages.length === 0}
				<div class="flex flex-col items-center justify-center h-full text-center">
					<Icon name="chat_bubble" size={64} class="text-slate-300 dark:text-slate-600 mb-4" />
					<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">
						Start a conversation
					</h2>
					<p class="text-slate-500 dark:text-slate-400">
						Send a message to {otherUser?.fullName || 'this user'}
					</p>
				</div>
			{:else}
				<!-- Message bubbles -->
				{#each messages as message (message.messageId)}
					<div class="flex items-end gap-2" class:flex-row-reverse={isMyMessage(message)}>
						<!-- Avatar (only for other user's messages) -->
						{#if !isMyMessage(message)}
							<div class="flex-shrink-0">
								<Avatar
									src={otherUser?.profilePictureUrl}
									alt={otherUser?.fullName || 'User'}
									size="xs"
								/>
							</div>
						{/if}

						<!-- Message bubble -->
						<div class="flex flex-col max-w-[70%]" class:items-end={isMyMessage(message)}>
							<div
								class="rounded-2xl px-4 py-2 break-words"
								class:bg-primary={isMyMessage(message)}
								class:text-background-dark={isMyMessage(message)}
								class:bg-white={!isMyMessage(message)}
								class:dark:bg-slate-800={!isMyMessage(message)}
								class:text-slate-900={!isMyMessage(message)}
								class:dark:text-white={!isMyMessage(message)}
								class:rounded-br-sm={isMyMessage(message)}
								class:rounded-bl-sm={!isMyMessage(message)}
							>
								<p class="text-sm whitespace-pre-wrap">{message.messageContent}</p>
							</div>

							<!-- Timestamp and read status -->
							<div
								class="flex items-center gap-1 mt-1 px-2"
								class:flex-row-reverse={!isMyMessage(message)}
							>
								<span class="text-xs text-slate-500 dark:text-slate-400">
									{formatMessageTime(message.createdAt)}
								</span>
								{#if isMyMessage(message)}
									<span class="text-xs text-slate-500 dark:text-slate-400">
										{#if message.isRead}
											<Icon name="done_all" size={14} class="text-primary" />
										{:else}
											<Icon name="done" size={14} />
										{/if}
									</span>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</main>

		<!-- Message input -->
		<footer
			class="sticky bottom-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 p-4"
		>
			<div class="flex items-end gap-2">
				<!-- Attachment button -->
				<button
					class="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex-shrink-0"
					aria-label="Attach file"
				>
					<Icon name="add_circle" size={24} />
				</button>

				<!-- Text input -->
				<div class="flex-1 relative">
					<textarea
						bind:value={newMessage}
						onkeydown={handleKeyPress}
						placeholder="Type a message..."
						rows="1"
						class="w-full rounded-full px-4 py-2.5 pr-12 text-sm bg-slate-100 dark:bg-slate-800 border-none focus:outline-none focus:ring-2 focus:ring-primary resize-none max-h-32 overflow-y-auto"
						style="min-height: 40px;"
					></textarea>
				</div>

				<!-- Send button -->
				<button
					onclick={handleSendMessage}
					disabled={!newMessage.trim() || sending}
					class="flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0 transition-colors {newMessage.trim()
						? 'bg-primary hover:bg-primary/90'
						: 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'}"
					aria-label="Send message"
				>
					{#if sending}
						<Icon name="hourglass_empty" size={20} class="text-white animate-spin" />
					{:else}
						<Icon name="send" size={20} class="text-white" />
					{/if}
				</button>
			</div>
		</footer>
	</div>
</div>

<style>
	.conversation-container {
		display: flex;
		min-height: 100vh;
		background-color: var(--background-light);
	}

	:global(.dark) .conversation-container {
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

	.conversation-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		max-width: 100%;
		position: relative;
	}

	main {
		background: #f6f8f8;
	}

	:global(.dark) main {
		background: #102222;
	}

	/* Custom scrollbar */
	main::-webkit-scrollbar {
		width: 8px;
	}

	main::-webkit-scrollbar-track {
		background: transparent;
	}

	main::-webkit-scrollbar-thumb {
		background: #cbd5e1;
		border-radius: 4px;
	}

	:global(.dark) main::-webkit-scrollbar-thumb {
		background: #475569;
	}

	/* Textarea auto-resize */
	textarea {
		field-sizing: content;
	}

	/* Mobile layout */
	@media (max-width: 767px) {
		.sidebar-container {
			display: none;
		}

		main {
			height: calc(100vh - 144px) !important;
		}
	}

	/* Desktop layout */
	@media (min-width: 768px) {
		.conversation-content {
			max-width: 900px;
			margin: 0 auto;
		}
	}
</style>
