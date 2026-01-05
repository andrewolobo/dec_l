<script lang="ts">
	/**
	 * Sidebar Component
	 * Left navigation menu with main app sections
	 * Supports collapse/expand and active state highlighting
	 */

	import Icon from '$lib/components/ui/Icon.svelte';
	import { isAuthenticated, currentUser } from '$lib/stores';
	import { unreadCount } from '$lib/stores/message.store';
	import * as authService from '$lib/services/auth.service';

	interface Props {
		/** Current active route */
		activeRoute: string;
		/** Collapsed state */
		collapsed?: boolean;
		/** Navigation callback */
		onNavigate?: (route: string) => void;
	}

	let { activeRoute, collapsed = false, onNavigate }: Props = $props();

	// All navigation items
	const allNavItems = [
		{ icon: 'home', label: 'Home', route: '/browse', requiresAuth: false },
		{ icon: 'add_circle', label: 'Sell', route: '/post/my-listings', requiresAuth: true },
		{ icon: 'chat', label: 'Messages', route: '/messages', requiresAuth: true },
		{ icon: 'person', label: 'Profile', route: '/profile', requiresAuth: true }
		// { icon: 'analytics', label: 'Post Analytics', route: '/analytics', requiresAuth: true }
	];

	// Filter navigation items based on auth state
	const navItems = $derived(allNavItems.filter((item) => !item.requiresAuth || $isAuthenticated));

	const adminItems = [
		{ icon: 'admin_panel_settings', label: 'Admin Dashboard', route: '/admin' },
		{ icon: 'category', label: 'Categories', route: '/admin/categories' },
		{ icon: 'report', label: 'Reports', route: '/admin/reports', badge: 12 }
	];

	// TODO: Add isAdmin property to user type and check actual user role
	// Check actual user role for admin section (temporarily disabled)
	const isAdmin = $derived(false);

	function handleNavigation(route: string) {
		if (onNavigate) {
			onNavigate(route);
		}
	}

	function isActive(route: string): boolean {
		if (route === '/') {
			return activeRoute === '/';
		}
		return activeRoute.startsWith(route);
	}

	async function handleLogout() {
		try {
			await authService.logout();
			window.location.href = '/';
		} catch (error) {
			console.error('Logout error:', error);
		}
	}
</script>

<aside
	class="h-full bg-white dark:bg-background-dark border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col"
	class:w-64={!collapsed}
	class:w-16={collapsed}
>
	<!-- Navigation Items -->
	<nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
		{#each navItems as item}
			<a
				href={item.route}
				onclick={() => handleNavigation(item.route)}
				class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group"
				class:bg-slate-800={isActive(item.route)}
				class:dark:bg-slate-700={isActive(item.route)}
				class:text-slate-900={isActive(item.route)}
				class:dark:text-slate-100={isActive(item.route)}
				class:text-gray-700={!isActive(item.route)}
				class:dark:text-gray-300={!isActive(item.route)}
				class:hover:bg-gray-100={!isActive(item.route)}
				class:dark:hover:bg-gray-800={!isActive(item.route)}
				aria-label={item.label}
			>
				<Icon
					name={item.icon}
					size={24}
					class={isActive(item.route)
						? 'text-slate-900 dark:text-slate-100'
						: 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}
				/>

				{#if !collapsed}
					<span class="flex-1 font-medium">
						{item.label}
					</span>

					{#if item.route === '/messages' && $unreadCount > 0}
						<span
							class="px-2 py-0.5 text-xs font-bold rounded-full"
							class:bg-white={isActive(item.route)}
							class:text-primary={isActive(item.route)}
							class:bg-primary={!isActive(item.route)}
							class:text-white={!isActive(item.route)}
						>
							{$unreadCount > 99 ? '99+' : $unreadCount}
						</span>
					{/if}
				{:else if item.route === '/messages' && $unreadCount > 0}
					<span
						class="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center"
					>
						{$unreadCount > 9 ? '9+' : $unreadCount}
					</span>
				{/if}
			</a>
		{/each}

		<!-- Admin Section -->
		{#if isAdmin}
			<div class="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
				{#if !collapsed}
					<p
						class="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Admin
					</p>
				{/if}

				{#each adminItems as item}
					<a
						href={item.route}
						onclick={() => handleNavigation(item.route)}
						class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative group"
						class:bg-primary={isActive(item.route)}
						class:text-white={isActive(item.route)}
						class:text-gray-700={!isActive(item.route)}
						class:dark:text-gray-300={!isActive(item.route)}
						class:hover:bg-gray-100={!isActive(item.route)}
						class:dark:hover:bg-gray-800={!isActive(item.route)}
						aria-label={item.label}
					>
						<Icon
							name={item.icon}
							size={24}
							class={isActive(item.route)
								? 'text-white'
								: 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'}
						/>

						{#if !collapsed}
							<span class="flex-1 font-medium text-sm">
								{item.label}
							</span>

							{#if item.badge}
								<span class="px-2 py-0.5 text-xs font-bold rounded-full bg-danger-500 text-white">
									{item.badge}
								</span>
							{/if}
						{:else if item.badge}
							<span
								class="absolute -top-1 -right-1 w-5 h-5 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
							>
								{item.badge > 9 ? '9+' : item.badge}
							</span>
						{/if}
					</a>
				{/each}
			</div>
		{/if}
	</nav>

	<!-- Logo Section -->
	<div class="px-3 py-4">
		<div class="flex-1 flex justify-center">
			<img src="/images/tunda-hub-logo.fw.png" alt="Tunda Plug" class="h-8 object-contain" />
		</div>
	</div>

	<!-- Bottom Actions -->
	<div class="p-3 border-t border-gray-200 dark:border-gray-700 space-y-1">
		<!-- Login/Logout Button -->
		{#if $isAuthenticated}
			<button
				onclick={handleLogout}
				class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
				aria-label="Sign Out"
			>
				<Icon name="logout" size={24} class="text-danger-500" />
				{#if !collapsed}
					<span class="font-medium">Sign Out</span>
				{/if}
			</button>
		{:else}
			<a
				href="/login"
				class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
				aria-label="Sign In"
			>
				<Icon name="login" size={24} class="text-primary-500" />
				{#if !collapsed}
					<span class="font-medium">Sign In</span>
				{/if}
			</a>
		{/if}

		<!-- Settings Button -->
		<button
			class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
			aria-label="Settings"
		>
			<Icon name="settings" size={24} class="text-gray-500 dark:text-gray-400" />
			{#if !collapsed}
				<span class="font-medium">Settings</span>
			{/if}
		</button>
	</div>
</aside>

<style>
	/* Custom scrollbar for sidebar */
	nav::-webkit-scrollbar {
		width: 6px;
	}

	nav::-webkit-scrollbar-track {
		background: transparent;
	}

	nav::-webkit-scrollbar-thumb {
		background: rgba(156, 163, 175, 0.3);
		border-radius: 3px;
	}

	nav::-webkit-scrollbar-thumb:hover {
		background: rgba(156, 163, 175, 0.5);
	}
</style>
