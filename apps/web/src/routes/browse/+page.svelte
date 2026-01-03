<script lang="ts">
	// Mock data for feed listings
	const mockListings = [
		{
			id: 1,
			username: 'jane.doe',
			userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane',
			location: 'San Francisco, CA',
			title: 'Mid-Century Modern Armchair',
			description:
				'Vintage armchair in great condition. Minor scuffs on the left leg. Perfect for a reading nook...',
			price: 250,
			images: [
				'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
				'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800',
				'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'
			],
			currentImageIndex: 0,
			saved: false
		},
		{
			id: 2,
			username: 'john.smith',
			userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john',
			location: 'New York, NY',
			title: 'Vintage Wooden Bookshelf',
			description: 'Solid oak bookshelf, 5 shelves. Perfect for any living space or office.',
			price: 150,
			images: [
				'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800',
				'https://images.unsplash.com/photo-1507032760419-81c77ead6f87?w=800'
			],
			currentImageIndex: 0,
			saved: true
		},
		{
			id: 3,
			username: 'sarah_p',
			userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah',
			location: 'Chicago, IL',
			title: 'Designer Floor Lamp',
			description: 'Sleek, minimalist floor lamp with a warm LED bulb. Adds a modern touch.',
			price: 85,
			images: [
				'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
				'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
				'https://images.unsplash.com/photo-1524532326935-09ff8e90317f?w=800',
				'https://images.unsplash.com/photo-1535231540604-72e8fbaf8cdb?w=800'
			],
			currentImageIndex: 0,
			saved: false
		},
		{
			id: 4,
			username: 'mike_r',
			userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike',
			location: 'Austin, TX',
			title: 'Dining Table Set',
			description: 'Modern dining table with 4 chairs. Excellent condition, barely used.',
			price: 450,
			images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800'],
			currentImageIndex: 0,
			saved: false
		},
		{
			id: 5,
			username: 'emily_w',
			userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily',
			location: 'Seattle, WA',
			title: 'Vintage Rug - Persian Style',
			description: 'Beautiful hand-woven rug with intricate patterns. Adds warmth to any room.',
			price: 320,
			images: [
				'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800',
				'https://images.unsplash.com/photo-1610160981843-e36d4e70d0ba?w=800'
			],
			currentImageIndex: 0,
			saved: false
		}
	];

	let listings = mockListings;
	let activeTab = 'home';

	function toggleSave(listingId: number) {
		listings = listings.map((listing) =>
			listing.id === listingId ? { ...listing, saved: !listing.saved } : listing
		);
	}

	function formatPrice(price: number): string {
		return `$${price}`;
	}
</script>

<svelte:head>
	<title>Marketplace - Tunda Plug</title>
</svelte:head>

<div
	class="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark"
>
	<!-- Side Navigation (Desktop) -->
	<aside
		class="hidden md:flex md:flex-col md:w-64 md:border-r border-slate-200/50 dark:border-slate-800/50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm"
	>
		<div class="flex flex-col gap-1 p-4">
			<a
				href="/browse"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'home'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span
					class="material-symbols-outlined text-2xl"
					style="font-variation-settings: 'FILL' {activeTab === 'home' ? 1 : 0};">home</span
				>
				<span class="text-base">Home</span>
			</a>
			<a
				href="/search"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'search'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">search</span>
				<span class="text-base">Search</span>
			</a>
			<a
				href="/explore"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'explore'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">explore</span>
				<span class="text-base">Explore</span>
			</a>
			<a
				href="/sell"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'sell'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">add_circle</span>
				<span class="text-base">Create</span>
			</a>
			<a
				href="/messages"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'messages'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">chat_bubble</span>
				<span class="text-base">Messages</span>
			</a>
			<a
				href="/notifications"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'notifications'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">notifications</span>
				<span class="text-base">Notifications</span>
			</a>
			<a
				href="/profile"
				class="flex items-center gap-4 px-3 py-3 rounded-lg {activeTab === 'profile'
					? 'text-primary font-bold'
					: 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
			>
				<span class="material-symbols-outlined text-2xl">person</span>
				<span class="text-base">Profile</span>
			</a>
		</div>
	</aside>

	<div class="flex-1 flex flex-col overflow-hidden">
	<!-- Top App Bar -->
	<header
		class="fixed top-0 z-10 w-full md:relative bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-sm"
	>
		<div class="flex items-center p-4 max-w-2xl mx-auto">
			<div class="flex size-12 shrink-0 items-center md:hidden">
				<!-- Placeholder for logo if needed -->
			</div>
			<h1 class="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">
				Home
			</h1>
			<div class="flex w-12 items-center justify-end gap-2 md:hidden">
				<button
					class="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
				>
					<span class="material-symbols-outlined text-2xl">search</span>
				</button>
			</div>
		</div>
	</header>

	<!-- Main Content Feed -->
	<main class="flex-1 overflow-y-auto pb-24 md:pb-0 pt-20 md:pt-0">
		<div class="flex flex-col gap-6 max-w-2xl mx-auto">
			{#each listings as listing (listing.id)}
				<!-- Item Card -->
				<div class="flex flex-col bg-background-light dark:bg-background-dark">
					<!-- User Info -->
					<div class="flex items-center gap-3 px-4 pb-3">
						<img
							class="h-10 w-10 rounded-full object-cover bg-slate-200 dark:bg-slate-700"
							src={listing.userAvatar}
							alt={listing.username}
						/>
						<div class="flex flex-col">
							<p class="text-sm font-bold leading-tight text-slate-800 dark:text-white">
								{listing.username}
							</p>
							<p class="text-xs text-slate-500 dark:text-slate-400">{listing.location}</p>
						</div>
					</div>

					<!-- Image with carousel indicators -->
					<div class="relative w-full">
						<div
							class="aspect-square w-full bg-cover bg-center bg-slate-200 dark:bg-slate-800"
							style="background-image: url('{listing.images[listing.currentImageIndex]}');"
						></div>
						{#if listing.images.length > 1}
							<div class="absolute bottom-4 right-4 flex gap-1.5">
								{#each listing.images as _, index}
									<div
										class="h-1.5 w-1.5 rounded-full {index === listing.currentImageIndex
											? 'bg-white'
											: 'bg-white/50'}"
									></div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Item Details -->
					<div class="flex flex-col gap-2 px-4 pt-4">
						<div class="flex items-start justify-between gap-4">
							<h2 class="text-lg font-bold leading-tight text-slate-900 dark:text-white">
								{listing.title}
							</h2>
							<button
								on:click={() => toggleSave(listing.id)}
								class="mt-1 text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
							>
								<span
									class="material-symbols-outlined text-2xl"
									style="font-variation-settings: 'FILL' {listing.saved ? 1 : 0};"
									>bookmark</span
								>
							</button>
						</div>
						<p class="text-sm text-slate-600 dark:text-slate-400">{listing.description}</p>
						<p class="text-xl font-extrabold text-primary">{formatPrice(listing.price)}</p>
					</div>
				</div>
			{/each}
		</div>
	</main>

	<!-- Bottom Navigation Bar (Mobile Only) -->
	<nav
		class="md:hidden fixed bottom-0 z-10 w-full border-t border-slate-200/50 bg-background-light/80 dark:border-slate-800/50 dark:bg-background-dark/80 backdrop-blur-sm"
	>
		<div class="flex h-16 items-center justify-around px-2">
			<a
				href="/browse"
				class="flex flex-1 flex-col items-center justify-center gap-1 {activeTab === 'home'
					? 'text-primary'
					: 'text-slate-500 dark:text-slate-400'} hover:text-primary transition-colors"
			>
				<span
					class="material-symbols-outlined text-2xl"
					style="font-variation-settings: 'FILL' {activeTab === 'home' ? 1 : 0};">home</span
				>
				<p class="text-xs font-medium">Home</p>
			</a>
			<a
				href="/sell"
				class="flex flex-1 flex-col items-center justify-center gap-1 {activeTab === 'sell'
					? 'text-primary'
					: 'text-slate-500 dark:text-slate-400'} hover:text-primary transition-colors"
			>
				<span class="material-symbols-outlined text-2xl">add_circle</span>
				<p class="text-xs font-medium">Sell</p>
			</a>
			<a
				href="/messages"
				class="flex flex-1 flex-col items-center justify-center gap-1 {activeTab === 'messages'
					? 'text-primary'
					: 'text-slate-500 dark:text-slate-400'} hover:text-primary transition-colors"
			>
				<span class="material-symbols-outlined text-2xl">chat_bubble</span>
				<p class="text-xs font-medium">Messages</p>
			</a>
			<a
				href="/profile"
				class="flex flex-1 flex-col items-center justify-center gap-1 {activeTab === 'profile'
					? 'text-primary'
					: 'text-slate-500 dark:text-slate-400'} hover:text-primary transition-colors"
			>
				<span class="material-symbols-outlined text-2xl">person</span>
				<p class="text-xs font-medium">Profile</p>
			</a>
		</div>
	</nav>
	</div>
</div>
