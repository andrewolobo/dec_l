<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	
	let mobileMenuOpen = false;
	
	function toggleMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}
	
	function closeMenu() {
		mobileMenuOpen = false;
	}
</script>

<svelte:head>
	<title>ReGoods - Give Your Goods a Second Life</title>
	<meta name="description" content="The easiest way to buy and sell furniture, decor, and more in your neighborhood. Community driven commerce reimagined." />
</svelte:head>

<div class="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden pb-24">
	<!-- Top App Bar -->
	<div class="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-white/5">
		<button onclick={toggleMenu} class="flex size-12 shrink-0 items-center justify-start text-slate-900 dark:text-white hover:text-primary transition-colors">
			<Icon name="menu" size={28} />
		</button>
		<h2 class="text-slate-900 dark:text-white text-xl font-extrabold leading-tight tracking-[-0.015em] flex-1 text-center">Bamboo Tree</h2>
		<div class="flex w-12 items-center justify-end">
			<a href="/login" class="text-primary hover:text-primary/80 text-base font-bold leading-normal tracking-[0.015em] shrink-0 transition-colors">
				Log In
			</a>
		</div>
	</div>

	<!-- Hero Section -->
	<div class="p-4">
		<div class="relative w-full h-[500px] rounded-xl overflow-hidden shadow-lg group">
			<div class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
				style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuA4FHxxZHI17PtBT9nRiGUja5Rh24YImveHYCkztPOLCx3VqPW_RH2pH6i88iJTTy3yF470k5h21DtQPfzXpBfGwgZFuJhhFgFyeNBi4mw7ptO5qNWdYwOLcTH-zqsf-q1Bz4ZaRjjFoR85mqSc8AL2U0SLgj161UYW280EiCv4fGlG5fdyPMU_PyGwI8wPyk3OCNLs7jsVNH4sgnGFUbHPDxY8Q9eOVfVkbzKUjAbbWCh4oJmNXarAiT1YJmT6E-afnS7ljVoj6cSU')">
			</div>
			<div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
			<div class="absolute bottom-0 left-0 w-full p-6 flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<h1 class="text-white tracking-tight text-4xl font-extrabold leading-[1.1]">
						Give Your Goods a Second Life
					</h1>
					<p class="text-gray-200 text-lg font-medium leading-relaxed max-w-[90%]">
						The easiest way to buy and sell furniture, decor, and more in your neighborhood.
					</p>
				</div>
				<div class="pt-2">
					<a href="/register" class="flex w-full sm:w-auto min-w-[140px] cursor-pointer items-center justify-center rounded-xl h-12 px-6 bg-primary text-background-dark text-base font-bold transition-transform active:scale-95 hover:bg-primary/90 shadow-[0_0_15px_rgba(19,236,236,0.3)]">
						Get Started
					</a>
				</div>
			</div>
		</div>
	</div>

	<!-- Headline: Why ReGoods? -->
	<div class="pt-8 px-4 pb-4">
		<h2 class="text-slate-900 dark:text-white tracking-tight text-[28px] font-bold leading-tight">
			Why ReGoods?
		</h2>
		<p class="text-slate-500 dark:text-gray-400 text-base mt-1">
			Community driven commerce reimagined.
		</p>
	</div>

	<!-- Feature Carousel -->
	<div class="flex overflow-x-auto pb-6 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pl-4 pr-4 gap-4 snap-x snap-mandatory">
		<!-- Feature 1 -->
		<div class="snap-center shrink-0 w-[80%] max-w-[300px] flex flex-col gap-3">
			<div class="w-full aspect-[4/5] bg-cover bg-center rounded-2xl relative overflow-hidden"
				style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuALMYPO7yByU8e4XHbe2HZY3ZyiW8hmZvKYuwII2Kjxwz1Go_6tpEeYOO_Nt6QYRLKAgbmKvRQBfj0ZFbVb5ceLHurxDjcOqgu7TLlgalKaAiGlsmVJYeQebBrfspXlk-UysyM-TN3CZq2Jq2d5VB311FggmRa0zvDFMXTI6kMdjIATF8EoDnJ2VqRpnJs6KF-Iys2FflkcDIBcUCX5T909FWJzaUlayli1kOHTwJAkT1DOnCIFOD_PP85zORFXLEZiZqaf5nzx9KWI')">
				<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-90"></div>
				<div class="absolute bottom-4 left-4 right-4">
					<div class="bg-primary/20 backdrop-blur-md rounded-full size-10 flex items-center justify-center mb-3 text-primary">
						<Icon name="grid_view" />
					</div>
					<p class="text-white text-xl font-bold leading-tight">Scroll, Love, Buy</p>
					<p class="text-primary text-sm font-medium mt-1">Shop like you social with our visual feed.</p>
				</div>
			</div>
		</div>

		<!-- Feature 2 -->
		<div class="snap-center shrink-0 w-[80%] max-w-[300px] flex flex-col gap-3">
			<div class="w-full aspect-[4/5] bg-cover bg-center rounded-2xl relative overflow-hidden"
				style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqsnELwugthYzKN395lf_39Fz-FXyZ9N67CBUt73c9mQ1H5Q6N40snxoyEzwPJiG04HTcojfEKZvTk2O-jeLw9i0YIq1vBTGGUdjsqutFlk9kwIT-P96Xb3daGxz4ht7dIjVR4HYh3ktQOpYgFfkoH3Pp-ibUKmjHWlOndSJyauwwWtK-qB0QUxBqc97J3r5tPRh-8ptvQjFgcno2-VH4ffYjE28meNDyHoZM3PYbSuGyMb7fP3KBxdL0a8d1-J6GYsSi2opT0jDFP')">
				<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-90"></div>
				<div class="absolute bottom-4 left-4 right-4">
					<div class="bg-primary/20 backdrop-blur-md rounded-full size-10 flex items-center justify-center mb-3 text-primary">
						<Icon name="photo_camera" />
					</div>
					<p class="text-white text-xl font-bold leading-tight">Snap. Post. Sold.</p>
					<p class="text-primary text-sm font-medium mt-1">Listing takes 30 seconds with our camera.</p>
				</div>
			</div>
		</div>

		<!-- Feature 3 -->
		<div class="snap-center shrink-0 w-[80%] max-w-[300px] flex flex-col gap-3">
			<div class="w-full aspect-[4/5] bg-cover bg-center rounded-2xl relative overflow-hidden"
				style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuBW4cJu_UimkXkzFVLr7IrdVUkHMbMkbRucrRqiKAEeABEe-lhdHO07vqFVtStgsp8zNEVwtaTQcRiZEjoNUjA4gEOWFDRfCDJKjknlO1jSPaUneQVAL8u4uXHDVLN8hMssraeIs9gEwlEpVZW8wd0ErmiZYltRIADPMcBkBuYfIZemHWDZ3SFPYYbbZscl4GoVowlBn6HlU6jvwvySowmKJq47snQAcHArOugiIcr8pjrE1dOtB405ZowrCaN2-0_Y3xdGDPexh9-P')">
				<div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-90"></div>
				<div class="absolute bottom-4 left-4 right-4">
					<div class="bg-primary/20 backdrop-blur-md rounded-full size-10 flex items-center justify-center mb-3 text-primary">
						<Icon name="chat_bubble" />
					</div>
					<p class="text-white text-xl font-bold leading-tight">Safe & Simple Chat</p>
					<p class="text-primary text-sm font-medium mt-1">No spam, just sales locally.</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Community Benefits Headline -->
	<div class="pt-6 px-4 pb-4">
		<h3 class="text-slate-900 dark:text-white tracking-tight text-2xl font-bold leading-tight">
			Community Benefits
		</h3>
	</div>

	<!-- Benefits Grid -->
	<div class="px-4 grid grid-cols-2 gap-3 mb-8">
		<div class="bg-white dark:bg-white/5 rounded-xl p-4 flex flex-col gap-2 border border-gray-100 dark:border-white/5">
			<Icon name="verified_user" size={30} class="text-primary" />
			<h4 class="text-slate-900 dark:text-white font-bold text-base">Verified Sellers</h4>
			<p class="text-slate-500 dark:text-gray-400 text-xs leading-normal">ID checked for peace of mind.</p>
		</div>
		<div class="bg-white dark:bg-white/5 rounded-xl p-4 flex flex-col gap-2 border border-gray-100 dark:border-white/5">
			<Icon name="location_on" size={30} class="text-primary" />
			<h4 class="text-slate-900 dark:text-white font-bold text-base">Local Pickup</h4>
			<p class="text-slate-500 dark:text-gray-400 text-xs leading-normal">Meet nearby, save on shipping.</p>
		</div>
		<div class="bg-white dark:bg-white/5 rounded-xl p-4 flex flex-col gap-2 border border-gray-100 dark:border-white/5">
			<Icon name="eco" size={30} class="text-primary" />
			<h4 class="text-slate-900 dark:text-white font-bold text-base">Eco-Friendly</h4>
			<p class="text-slate-500 dark:text-gray-400 text-xs leading-normal">Reduce waste by reusing.</p>
		</div>
		<div class="bg-white dark:bg-white/5 rounded-xl p-4 flex flex-col gap-2 border border-gray-100 dark:border-white/5">
			<Icon name="credit_card" size={30} class="text-primary" />
			<h4 class="text-slate-900 dark:text-white font-bold text-base">Secure Pay</h4>
			<p class="text-slate-500 dark:text-gray-400 text-xs leading-normal">Hold funds until pickup.</p>
		</div>
	</div>

	<!-- Trust Ticker / Social Proof -->
	<div class="mb-8 w-full overflow-hidden bg-primary/10 py-4">
		<div class="flex items-center gap-2 px-4 mb-2">
			<Icon name="trending_up" size={16} class="text-primary" />
			<p class="text-xs font-bold text-primary uppercase tracking-wider">Just Sold Nearby</p>
		</div>
		<div class="flex gap-4 px-4 overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
			<div class="flex items-center gap-3 bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 rounded-full pr-4 p-1 shrink-0">
				<div class="size-8 rounded-full bg-cover bg-center"
					style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuC82WUkf8NiRB4oKXVJD4zUbkZRj8NXXNuQKGHc78ZH4n5OaE56gddTDMgT7gvJnq81fb1o1CCNgP8ep5GUBdRLiw54gGlEzeiFetAMeru0tE0zqwZn2-XFTDljUCE19DHiV_vgdrEW4outN_Cr43D3ERF3xVBUPfi6ksDrsi5I8Pmc7119E_9j-IUjQxyaytEwwpZxODnfJMsH6JMvlfSIY8zT2SbphBmpnjNSo05LSTxTftW0afEoZIz5IipkMarYPUwG21gWJVtA')">
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-bold text-slate-900 dark:text-white">Vintage Lamp</span>
					<span class="text-[10px] text-slate-500 dark:text-gray-400">Sold 2m ago</span>
				</div>
			</div>
			<div class="flex items-center gap-3 bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 rounded-full pr-4 p-1 shrink-0">
				<div class="size-8 rounded-full bg-cover bg-center"
					style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuD8NHVcG0kvgqBqMwTKEYbea4xjDJvl_Vp1aA5pxXV496YoWTUvXqtpe9LcOanMtM8biPUJJn2RABA2t4p0_YAJmY8vRBYJAw64OHU8Xaa9exg0X96H6cZpaLGrLeknNW7lETamC14g-6Dc2_6ivJ10v7PrTeOOPNd9zTqQDCytQP6alvhTXDmEDyrR9z_BtXxdQOc5ndj1sFavO3_-LDqmV6u5QFuTmIJZ-RTUIu6avlD9Y2A2TfHkY1561XU7JPSKHj08NqwZ_rok')">
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-bold text-slate-900 dark:text-white">Fixie Bike</span>
					<span class="text-[10px] text-slate-500 dark:text-gray-400">Sold 5m ago</span>
				</div>
			</div>
			<div class="flex items-center gap-3 bg-white dark:bg-background-dark border border-gray-200 dark:border-white/10 rounded-full pr-4 p-1 shrink-0">
				<div class="size-8 rounded-full bg-cover bg-center"
					style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuAbmnz7tqUGQIukL1EGuGhJEJDUXOdNMTnfYFJm0xJvQYAk3K5VnXhfsmq8IuXSfuV5lDoNpiACSJ333mzW3ZgqA_zVPmx7sMXB_5S122h0kah8bA96u6CQOqkUVEbAVNktvxJkLdlhW3IohGt6jBrHdUV3qD5iM9Y4sDZyEcSLOTGKpyn8S75TwIdlcFpL4qLgnMrBNnGEz77HIBHlY_XFcP5IRGzK3Z6mPM3uNmNHyFIQXSSh7j7X2A7hKqJVloKwLh46e-v8wSpj')">
				</div>
				<div class="flex flex-col">
					<span class="text-xs font-bold text-slate-900 dark:text-white">Oak Table</span>
					<span class="text-[10px] text-slate-500 dark:text-gray-400">Sold 12m ago</span>
				</div>
			</div>
		</div>
	</div>

	<!-- Dual CTA Block (Fixed Bottom) -->
	<div class="fixed bottom-0 left-0 w-full p-4 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg border-t border-gray-200 dark:border-white/5 z-40">
		<div class="flex gap-3 max-w-md mx-auto">
			<button class="flex-1 h-12 rounded-xl bg-transparent border-2 border-primary text-primary dark:text-primary font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
				<Icon name="add_circle" size={20} />
				Post Item
			</button>
			<button class="flex-[2] h-12 rounded-xl bg-primary text-background-dark font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(19,236,236,0.2)] hover:shadow-[0_0_15px_rgba(19,236,236,0.4)] transition-shadow">
				<Icon name="explore" size={20} />
				Browse Nearby
			</button>
		</div>
	</div>
</div>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
	<button
		onclick={closeMenu}
		class="fixed inset-0 bg-black/50 z-[60]"
		aria-label="Close menu"
	></button>
	<div class="fixed top-0 left-0 h-full w-[280px] bg-background-light dark:bg-background-dark shadow-xl z-[70] p-6 overflow-y-auto">
		<button onclick={closeMenu} class="mb-6 text-slate-900 dark:text-white hover:text-primary transition-colors">
			<Icon name="close" size={28} />
		</button>
		<nav class="space-y-4">
			<a href="/" class="block text-slate-900 dark:text-white hover:text-primary transition-colors text-lg font-medium">Home</a>
			<a href="/browse" class="block text-slate-900 dark:text-white hover:text-primary transition-colors text-lg font-medium">Browse</a>
			<a href="/sell" class="block text-slate-900 dark:text-white hover:text-primary transition-colors text-lg font-medium">Sell</a>
			<a href="/about" class="block text-slate-900 dark:text-white hover:text-primary transition-colors text-lg font-medium">About</a>
		</nav>
	</div>
{/if}
