<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import MobileBottomNav from '$lib/components/layout/MobileBottomNav.svelte';
	import PostCard, { type Post } from '$lib/components/cards/PostCard.svelte';

	// Mock data for feed listings
	const mockPosts: Post[] = [
		{
			id: '1',
			title: 'Mid-Century Modern Armchair',
			description:
				'Vintage armchair in great condition. Minor scuffs on the left leg. Perfect for a reading nook...',
			price: 250000,
			images: [
				'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800',
				'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=800',
				'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800'
			],
			status: 'active' as const,
			location: 'San Francisco, CA',
			createdAt: new Date('2025-01-01'),
			likesCount: 12,
			liked: false,
			user: {
				id: '1',
				name: 'jane.doe',
				avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=jane'
			}
		},
		{
			id: '2',
			title: 'Vintage Wooden Bookshelf',
			description: 'Solid oak bookshelf, 5 shelves. Perfect for any living space or office.',
			price: 150000,
			images: [
				'https://images.unsplash.com/photo-1594620302200-9a762244a156?w=800',
				'https://images.unsplash.com/photo-1507032760419-81c77ead6f87?w=800'
			],
			status: 'active' as const,
			location: 'New York, NY',
			createdAt: new Date('2025-01-02'),
			likesCount: 8,
			liked: true,
			user: {
				id: '2',
				name: 'john.smith',
				avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=john'
			}
		},
		{
			id: '3',
			title: 'Designer Floor Lamp',
			description: 'Sleek, minimalist floor lamp with a warm LED bulb. Adds a modern touch.',
			price: 85000,
			images: [
				'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
				'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=800',
				'https://images.unsplash.com/photo-1524532326935-09ff8e90317f?w=800',
				'https://images.unsplash.com/photo-1535231540604-72e8fbaf8cdb?w=800'
			],
			status: 'active' as const,
			location: 'Chicago, IL',
			createdAt: new Date('2025-01-03'),
			likesCount: 24,
			liked: false,
			user: {
				id: '3',
				name: 'sarah_p',
				avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah'
			}
		},
		{
			id: '4',
			title: 'Dining Table Set',
			description: 'Modern dining table with 4 chairs. Excellent condition, barely used.',
			price: 450000,
			images: ['https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800'],
			status: 'active' as const,
			location: 'Austin, TX',
			createdAt: new Date('2024-12-28'),
			likesCount: 15,
			liked: false,
			user: {
				id: '4',
				name: 'mike_r',
				avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mike'
			}
		},
		{
			id: '5',
			title: 'Vintage Rug - Persian Style',
			description: 'Beautiful hand-woven rug with intricate patterns. Adds warmth to any room.',
			price: 320000,
			images: [
				'https://images.unsplash.com/photo-1600166898405-da9535204843?w=800',
				'https://images.unsplash.com/photo-1610160981843-e36d4e70d0ba?w=800'
			],
			status: 'active' as const,
			location: 'Seattle, WA',
			createdAt: new Date('2024-12-30'),
			likesCount: 18,
			liked: false,
			user: {
				id: '5',
				name: 'emily_w',
				avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=emily'
			}
		}
	];

	let posts = mockPosts;
	let activeTab = 'home';
</script>

<svelte:head>
	<title>Marketplace - Tunda Plug</title>
</svelte:head>

<div
	class="relative flex h-screen w-full flex-col md:flex-row overflow-hidden bg-background-light dark:bg-background-dark"
>
	<!-- Side Navigation (Desktop) -->
	<aside class="hidden md:block">
		<Sidebar activeRoute="/browse" collapsed={false} />
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
				<h1 class="flex-1 text-center text-lg font-bold text-slate-900 dark:text-white">Home</h1>
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
			<div class="flex flex-col gap-[5px] max-w-2xl mx-auto">
				{#each posts as post (post.id)}
					<PostCard {post} variant="feed" showUser={true} />
				{/each}
			</div>
		</main>

		<!-- Bottom Navigation Bar (Mobile Only) -->
		<MobileBottomNav activeRoute="/browse" />
	</div>
</div>
