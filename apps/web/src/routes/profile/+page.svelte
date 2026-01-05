<script lang="ts">
	import Avatar from '$lib/components/media/Avatar.svelte';
	import Button from '$lib/components/buttons/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IconButton from '$lib/components/buttons/IconButton.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import { currentUser } from '$lib/stores';
	import * as authService from '$lib/services/auth.service';

	// Mock user data - replace with actual data from store
	const user = $derived(
		$currentUser || {
			fullName: 'Guest User',
			emailAddress: 'guest@example.com',
			profilePictureUrl: '',
			bio: 'No bio available'
		}
	);

	// Mock stats - replace with actual data
	const stats = {
		listings: 24,
		sold: 15,
		rating: 4.8
	};

	// Navigation items
	const navItems = [
		{ icon: 'list_alt', label: 'My Listings', route: '/profile/listings' },
		// { icon: 'bookmark', label: 'Saved Items', route: '/profile/saved' },
		// { icon: 'shopping_bag', label: 'My Purchases', route: '/profile/purchases' },
		{ icon: 'help', label: 'Help & Support', route: '/help' }
	];

	async function handleLogout() {
		try {
			await authService.logout();
			window.location.href = '/login';
		} catch (error) {
			console.error('Logout error:', error);
		}
	}
</script>

<svelte:head>
	<title>Profile - TundaPlug</title>
</svelte:head>

<div
	class="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark"
>
	<!-- Side Navigation (Desktop) -->
	<aside class="hidden md:block">
		<Sidebar activeRoute="/profile" collapsed={false} />
	</aside>

	<div class="flex-1 flex flex-col overflow-hidden">
		<div
			class="min-h-screen bg-background-light dark:bg-background-dark pb-24 md:pb-0 overflow-y-auto"
		>
			<!-- Top App Bar -->
			<header
				class="sticky top-0 z-10 bg-background-light dark:bg-background-dark border-b border-slate-200/30 dark:border-slate-600/20"
			>
				<div class="flex items-center justify-between p-4 max-w-2xl mx-auto">
					<div class="w-12"></div>
					<h1 class="text-lg font-bold text-slate-900 dark:text-white">Profile</h1>
					<IconButton
						icon="settings"
						ariaLabel="Settings"
						variant="default"
						onclick={() => (window.location.href = '/settings')}
					/>
				</div>
			</header>

			<!-- Centered Content Container -->
			<div class="max-w-2xl mx-auto">
				<!-- Profile Header -->
				<div class="p-4">
					<div class="flex flex-col items-center gap-4">
						<!-- Avatar -->
						<Avatar src={user.profilePictureUrl} alt={user.fullName} size="xl" editable={false} />

						<!-- User Info -->
						<div class="flex flex-col items-center text-center">
							<h2 class="text-[22px] font-bold text-slate-900 dark:text-white">
								{user.fullName}
							</h2>
							<p class="text-base text-slate-500 dark:text-[#92c9c9] mt-1">
								@{user.fullName.toLowerCase().replace(/\s+/g, '')}
							</p>
							{#if user.bio}
								<p class="text-base text-slate-500 dark:text-[#92c9c9] mt-1 max-w-md">
									{user.bio}
								</p>
							{/if}
						</div>

						<!-- Action Buttons -->
						<div class="flex w-full max-w-[480px] gap-3 pt-2">
							<Button
								variant="secondary"
								size="md"
								fullWidth={true}
								onclick={() => (window.location.href = '/profile/edit')}
							>
								Edit Profile
							</Button>
							<Button variant="primary" size="md" fullWidth={true}>Share Profile</Button>
						</div>
					</div>
				</div>

				<!-- Profile Stats -->
				<div class="flex flex-wrap gap-3 px-4 py-3">
					<div
						class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] dark:bg-transparent p-3 items-center text-center"
					>
						<p class="text-slate-900 dark:text-white text-2xl font-bold">{stats.listings}</p>
						<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Listings</p>
					</div>
					<div
						class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] dark:bg-transparent p-3 items-center text-center"
					>
						<p class="text-slate-900 dark:text-white text-2xl font-bold">{stats.sold}</p>
						<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Sold</p>
					</div>
					<div
						class="flex min-w-[111px] flex-1 basis-[fit-content] flex-col gap-2 rounded-xl border border-slate-200 dark:border-[#326767] ark:bg-transparent p-3 items-center text-center"
					>
						<p class="text-slate-900 dark:text-white text-2xl font-bold">{stats.rating} ★</p>
						<p class="text-slate-500 dark:text-[#92c9c9] text-sm">Rating</p>
					</div>
				</div>

				<!-- Divider -->
				<div class="px-4 py-3">
					<div class="w-full border-t border-slate-200 dark:border-[#326767]"></div>
				</div>

				<!-- Navigation List -->
				<div class="flex flex-col w-full pb-4">
					{#each navItems as item}
						<a
							href={item.route}
							class="flex items-center gap-4 px-4 min-h-14 hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
						>
							<div
								class="text-slate-900 dark:text-white flex items-center justify-center rounded-lg bg-primary/20 shrink-0 size-10"
							>
								<Icon name={item.icon} size={24} />
							</div>
							<p class="text-slate-900 dark:text-white text-base flex-1">{item.label}</p>
							<Icon name="chevron_right" size={24} class="text-slate-400 dark:text-white" />
						</a>
					{/each}
				</div>
			</div>
		</div>

		<!-- Fixed Logout Button (Mobile Only) -->
		<div
			class="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-background-light dark:bg-background-dark border-t border-slate-200/30 dark:border-slate-600/20"
		>
			<div class="max-w-2xl mx-auto">
				<button
					onclick={handleLogout}
					class="w-full flex items-center gap-4 px-4 py-4 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
				>
					<div
						class="flex items-center justify-center rounded-lg bg-danger-100 dark:bg-danger-900/20 shrink-0 size-10"
					>
						<Icon name="logout" size={24} class="text-danger-500" />
					</div>
					<p class="text-danger-500 text-base flex-1">Log Out</p>
				</button>
			</div>
		</div>
	</div>
</div>
