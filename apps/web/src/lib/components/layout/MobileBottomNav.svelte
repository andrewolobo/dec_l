<script lang="ts">
	/**
	 * MobileBottomNav Component
	 * Bottom navigation bar for mobile devices
	 * Fixed positioning with badge support for notifications
	 */
	
	import Icon from '$lib/components/ui/Icon.svelte';
	import { isAuthenticated } from '$lib/stores';
	import { unreadCount } from '$lib/stores/message.store';
	
	interface Props {
		/** Current active route */
		activeRoute: string;
	}
	
	let {
		activeRoute
	}: Props = $props();
	
	// All navigation items
	const allNavItems = [
		{ icon: 'home', label: 'Home', route: '/', requiresAuth: false },
		{ icon: 'chat', label: 'Messages', route: '/messages', requiresAuth: true },
		{ icon: 'add_circle', label: 'Post', route: '/post/create', requiresAuth: false },
		{ icon: 'person', label: 'Profile', route: '/profile', requiresAuth: true },
		{ icon: 'more_horiz', label: 'More', route: '/more', requiresAuth: false }
	];
	
	// Filter navigation items based on auth state
	const navItems = $derived(
		allNavItems.filter(item => !item.requiresAuth || $isAuthenticated)
	);
	
	function isActive(route: string): boolean {
		if (route === '/') {
			return activeRoute === '/';
		}
		return activeRoute.startsWith(route);
	}
	
	function getBadgeCount(route: string): number {
		if (route === '/messages') {
			return $unreadCount;
		}
		return 0;
	}
</script>

<nav 
	class="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-background-dark border-t border-gray-200 dark:border-gray-700 safe-bottom md:hidden"
>
	<div class="flex items-center justify-around h-16 px-2">
		{#each navItems as item}
			{@const badge = getBadgeCount(item.route)}
			{@const active = isActive(item.route)}
			
			<a
				href={item.route}
				class="flex flex-col items-center justify-center flex-1 h-full relative transition-colors"
				class:text-primary={active}
				class:text-gray-600={!active}
				class:dark:text-gray-400={!active}
				aria-label={item.label}
			>
				<div class="relative">
					<Icon 
						name={item.icon}
						size={24}
						fill={active ? 1 : 0}
						weight={active ? 700 : 400}
					/>
					
					{#if badge > 0}
						<span class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-danger-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
							{badge > 99 ? '99+' : badge}
						</span>
					{/if}
				</div>
				
				<span 
					class="text-xs font-medium mt-1"
					class:font-semibold={active}
				>
					{item.label}
				</span>
			</a>
		{/each}
	</div>
</nav>

<style>
	/* Ensure bottom nav stays above content */
	nav {
		box-shadow: 0 -1px 3px 0 rgba(0, 0, 0, 0.1), 0 -1px 2px 0 rgba(0, 0, 0, 0.06);
	}
</style>
