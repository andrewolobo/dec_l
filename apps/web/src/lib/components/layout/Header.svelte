<script lang="ts">
	/**
	 * Header Component
	 * Top navigation bar with logo, search, and user menu
	 * Provides consistent navigation across all pages
	 */
	
	import Icon from '$lib/components/ui/Icon.svelte';
	import { isAuthenticated, currentUser } from '$lib/stores';
	import { unreadCount } from '$lib/stores/message.store';
	
	interface Props {
		/** Show/hide search bar */
		showSearch?: boolean;
		/** Transparent background with glassmorphism */
		transparent?: boolean;
		/** Search callback */
		onSearch?: (query: string) => void;
		/** Menu toggle callback for mobile */
		onMenuToggle?: () => void;
	}
	
	let {
		showSearch = true,
		transparent = false,
		onSearch,
		onMenuToggle
	}: Props = $props();
	
	// Search state
	let searchQuery = $state('');
	let showSearchResults = $state(false);
	
	// User menu state
	let showUserMenu = $state(false);
	
	function handleSearch(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		if (onSearch) {
			onSearch(searchQuery);
		}
		showSearchResults = searchQuery.length > 0;
	}
	
	function toggleUserMenu() {
		showUserMenu = !showUserMenu;
	}
	
	function closeUserMenu() {
		showUserMenu = false;
	}
</script>

<header 
	class="fixed top-0 left-0 right-0 z-30 h-16 safe-top"
	class:glass-header={transparent}
	class:bg-white={!transparent}
	class:dark:bg-background-dark={!transparent}
	class:border-b={!transparent}
	class:border-gray-200={!transparent}
	class:dark:border-gray-700={!transparent}
>
	<div class="h-full px-4 flex items-center justify-between gap-4">
		<!-- Left: Logo & Menu Toggle -->
		<div class="flex items-center gap-4">
			<!-- Mobile Menu Toggle -->
			<button
				class="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				onclick={onMenuToggle}
				aria-label="Toggle menu"
			>
				<Icon name="menu" size={24} />
			</button>
			
			<!-- Logo -->
			<a href="/" class="flex items-center gap-2">
				<Icon name="storefront" size={32} class="text-primary" />
				<span class="text-xl font-bold text-gray-900 dark:text-white hidden sm:inline">
					DEC_L
				</span>
			</a>
		</div>
		
		<!-- Center: Search Bar -->
		{#if showSearch}
			<div class="flex-1 max-w-2xl relative">
				<div class="relative">
					<Icon 
						name="search" 
						size={20} 
						class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="search"
						placeholder="Search for items, users, or categories..."
						value={searchQuery}
						oninput={handleSearch}
						onfocus={() => showSearchResults = searchQuery.length > 0}
						onblur={() => setTimeout(() => showSearchResults = false, 200)}
						class="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
					/>
				</div>
				
				<!-- Search Results Dropdown (placeholder) -->
				{#if showSearchResults}
					<div class="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-modal border border-gray-200 dark:border-gray-700 p-4">
						<p class="text-sm text-gray-500">Searching for "{searchQuery}"...</p>
						<!-- TODO: Add actual search results -->
					</div>
				{/if}
			</div>
		{/if}
		
		<!-- Right: Actions & User Menu -->
		<div class="flex items-center gap-2">
			<!-- Post Button -->
			<a
				href="/post/create"
				class="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
			>
				<Icon name="add" size={20} />
				<span>Post</span>
			</a>
			
			<!-- Notifications -->
			{#if $isAuthenticated}
				<button
					class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					aria-label="Notifications"
				>
					<Icon name="notifications" size={24} />
					{#if $unreadCount > 0}
						<span class="absolute top-1 right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
							{$unreadCount > 9 ? '9+' : $unreadCount}
						</span>
					{/if}
				</button>
			{/if}
			
			<!-- User Menu -->
			{#if $isAuthenticated && $currentUser}
				<div class="relative">
					<button
						class="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
						onclick={toggleUserMenu}
						aria-label="User menu"
					>
						<img
							src={$currentUser.profilePictureUrl || '/default-avatar.png'}
							alt={$currentUser.fullName || 'User'}
							class="w-8 h-8 rounded-full object-cover"
						/>
						<Icon name="expand_more" size={20} class="hidden sm:block" />
					</button>
					
					<!-- Dropdown Menu -->
					{#if showUserMenu}
						<div 
							class="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-modal border border-gray-200 dark:border-gray-700 py-2"
							role="menu"
							tabindex="-1"
							onmouseleave={closeUserMenu}
						>
							<!-- User Info -->
							<div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
								<p class="text-sm font-semibold text-gray-900 dark:text-white">
								{$currentUser.fullName || 'User'}
							</p>
							<p class="text-xs text-gray-500 truncate">
								{$currentUser.emailAddress}							</p>
						</div>
													<!-- Menu Items -->
							<a
								href="/profile"
								class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								<Icon name="person" size={20} />
								<span>Profile</span>
							</a>
							
							<a
								href="/settings"
								class="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
							>
								<Icon name="settings" size={20} />
								<span>Settings</span>
							</a>
							
							<hr class="my-2 border-gray-200 dark:border-gray-700" />
							
							<button
								class="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger-500 hover:bg-gray-100 dark:hover:bg-gray-700"
								onclick={() => window.location.href = '/logout'}
							>
								<Icon name="logout" size={20} />
								<span>Sign Out</span>
							</button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- Sign In/Sign Up -->
				<div class="flex items-center gap-2">
					<a
						href="/login"
						class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
					>
						Sign In
					</a>
					<a
						href="/register"
						class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
					>
						Sign Up
					</a>
				</div>
			{/if}
		</div>
	</div>
</header>

<!-- Header spacer to prevent content from going under fixed header -->
<div class="h-16"></div>
