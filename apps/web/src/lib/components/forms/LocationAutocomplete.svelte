<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { searchLocations, formatLocationDisplay, formatCoordinates } from '$lib/services/geocoding.service';
	import type { NominatimResult } from '$lib/services/geocoding.service';

	interface Props {
		value: string;
		coordinates?: string;
		error?: string;
		label?: string;
		placeholder?: string;
		required?: boolean;
		disabled?: boolean;
		showCoordinates?: boolean;
		onLocationSelect?: (location: {
			displayName: string;
			lat: string;
			lon: string;
			address: NominatimResult['address'];
		}) => void;
	}

	let {
		value = $bindable(''),
		coordinates = $bindable(''),
		error,
		label = 'Location',
		placeholder = 'Search for a location...',
		required = false,
		disabled = false,
		showCoordinates = true,
		onLocationSelect
	}: Props = $props();

	// State
	let inputValue = $state(value);
	let searchResults = $state<NominatimResult[]>([]);
	let isOpen = $state(false);
	let isLoading = $state(false);
	let selectedIndex = $state(-1);
	let searchError = $state('');
	let containerRef: HTMLDivElement;
	let inputRef: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;

	// Sync inputValue with value prop
	$effect(() => {
		if (value !== inputValue) {
			inputValue = value;
		}
	});

	// Setup click outside handler
	onMount(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Element;
			if (containerRef && !containerRef.contains(target)) {
				isOpen = false;
				selectedIndex = -1;
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			clearTimeout(debounceTimer);
		};
	});

	// Handle input changes
	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		inputValue = target.value;
		value = target.value;

		clearTimeout(debounceTimer);

		if (inputValue.length < 3) {
			searchResults = [];
			isOpen = false;
			searchError = '';
			return;
		}

		debounceTimer = setTimeout(() => {
			performSearch(inputValue);
		}, 400);
	}

	// Perform location search
	async function performSearch(query: string) {
		isLoading = true;
		searchError = '';

		try {
			const results = await searchLocations(query, {
				countryCode: 'ug',
				limit: 8
			});

			searchResults = results;
			isOpen = results.length > 0;
			selectedIndex = -1;

			if (results.length === 0) {
				searchError = 'No locations found';
			}
		} catch (err) {
			console.error('Location search error:', err);
			searchError = 'Failed to search locations. Please try again.';
			searchResults = [];
			isOpen = false;
		} finally {
			isLoading = false;
		}
	}

	// Handle location selection
	function handleSelect(result: NominatimResult) {
		const formatted = formatLocationDisplay(result);
		inputValue = result.display_name;
		value = result.display_name;
		coordinates = `${result.lat},${result.lon}`;
		isOpen = false;
		selectedIndex = -1;
		searchResults = [];

		// Trigger callback
		onLocationSelect?.({
			displayName: result.display_name,
			lat: result.lat,
			lon: result.lon,
			address: result.address
		});

		// Blur input
		inputRef?.blur();
	}

	// Keyboard navigation
	function handleKeyDown(e: KeyboardEvent) {
		if (!isOpen || searchResults.length === 0) return;

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, searchResults.length - 1);
				scrollToSelected();
				break;
			case 'ArrowUp':
				e.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, -1);
				scrollToSelected();
				break;
			case 'Enter':
				e.preventDefault();
				if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
					handleSelect(searchResults[selectedIndex]);
				}
				break;
			case 'Escape':
				e.preventDefault();
				isOpen = false;
				selectedIndex = -1;
				inputRef?.blur();
				break;
		}
	}

	// Scroll to selected item in dropdown
	function scrollToSelected() {
		if (selectedIndex < 0) return;
		
		const dropdown = containerRef?.querySelector('[role="listbox"]');
		const item = dropdown?.children[selectedIndex] as HTMLElement;
		
		if (item && dropdown) {
			const dropdownRect = dropdown.getBoundingClientRect();
			const itemRect = item.getBoundingClientRect();
			
			if (itemRect.bottom > dropdownRect.bottom) {
				item.scrollIntoView({ block: 'nearest' });
			} else if (itemRect.top < dropdownRect.top) {
				item.scrollIntoView({ block: 'nearest' });
			}
		}
	}

	// Clear input
	function handleClear() {
		inputValue = '';
		value = '';
		coordinates = '';
		searchResults = [];
		isOpen = false;
		selectedIndex = -1;
		searchError = '';
		inputRef?.focus();
	}

	// Handle focus
	function handleFocus() {
		if (searchResults.length > 0) {
			isOpen = true;
		}
	}
</script>

<div bind:this={containerRef} class="relative w-full">
	<!-- Label -->
	<label for="location-input" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
		{label}
		{#if required}
			<span class="text-red-500">*</span>
		{/if}
	</label>

	<!-- Input Container -->
	<div class="relative">
		<!-- Location Icon -->
		<div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
			<Icon name="location_on" size={20} class="text-slate-400 dark:text-slate-500" />
		</div>

		<!-- Input Field -->
		<input
			bind:this={inputRef}
			type="text"
			id="location-input"
			value={inputValue}
			oninput={handleInput}
			onkeydown={handleKeyDown}
			onfocus={handleFocus}
			{placeholder}
			{disabled}
			autocomplete="off"
			role="combobox"
			aria-autocomplete="list"
			aria-expanded={isOpen}
			aria-controls="location-dropdown"
			class="w-full pl-10 pr-10 py-3 rounded-lg border border-slate-300 dark:border-slate-600
				bg-white dark:bg-slate-800 text-slate-900 dark:text-white
				placeholder:text-slate-400 dark:placeholder:text-slate-500
				focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
				disabled:opacity-50 disabled:cursor-not-allowed
				{error ? 'border-red-500 dark:border-red-500' : ''}"
		/>

		<!-- Right Icons: Loading/Clear -->
		<div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
			{#if isLoading}
				<div
					class="w-5 h-5 border-2 border-[#13ecec] border-t-transparent rounded-full animate-spin"
				></div>
			{:else if inputValue && !disabled}
				<button
					type="button"
					onclick={handleClear}
					class="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
					aria-label="Clear location"
				>
					<Icon name="close" size={18} class="text-slate-400 dark:text-slate-500" />
				</button>
			{/if}
		</div>
	</div>

	<!-- Dropdown Results -->
	{#if isOpen && searchResults.length > 0}
		<ul
			id="location-dropdown"
			role="listbox"
			class="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 max-h-80 overflow-y-auto"
		>
			{#each searchResults as result, index}
				{@const formatted = formatLocationDisplay(result)}
				<li
					role="option"
					aria-selected={index === selectedIndex}
					onclick={() => handleSelect(result)}
					onkeydown={(e) => e.key === 'Enter' && handleSelect(result)}
					onmouseenter={() => (selectedIndex = index)}
					tabindex="-1"
					class="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
						{index === selectedIndex
							? 'bg-[#13ecec]/10 dark:bg-[#13ecec]/20'
							: 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
						{index < searchResults.length - 1 ? 'border-b border-slate-200 dark:border-slate-700' : ''}"
				>
					<div class="flex-shrink-0 mt-0.5">
						<Icon
							name="location_on"
							size={20}
							class={index === selectedIndex ? 'text-[#13ecec]' : 'text-slate-400 dark:text-slate-500'}
						/>
					</div>
					<div class="flex-1 min-w-0">
						<div class="font-medium text-slate-900 dark:text-white truncate">
							{formatted.primary}
						</div>
						<div class="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">
							{formatted.secondary}
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- No Results Message -->
	{#if isOpen && !isLoading && searchResults.length === 0 && inputValue.length >= 3}
		<div
			class="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 px-4 py-6 text-center"
		>
			<Icon name="search_off" size={32} class="text-slate-300 dark:text-slate-600 mx-auto mb-2" />
			<p class="text-sm text-slate-600 dark:text-slate-400">No locations found</p>
			<p class="text-xs text-slate-500 dark:text-slate-500 mt-1">
				Try a different search term
			</p>
		</div>
	{/if}

	<!-- Error Message -->
	{#if error}
		<p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
	{:else if searchError && !isOpen}
		<p class="mt-1 text-sm text-orange-600 dark:text-orange-400">{searchError}</p>
	{/if}

	<!-- Coordinates Display (if available) -->
	{#if showCoordinates && coordinates && !error}
		<div class="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
			<Icon name="my_location" size={14} />
			<span>GPS: {coordinates ? (() => {
				const [lat, lon] = coordinates.split(',');
				return formatCoordinates(lat, lon);
			})() : ''}</span>
		</div>
	{/if}

	<!-- Help Text -->
	{#if !error && !coordinates}
		<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
			Start typing to search for a location
		</p>
	{/if}
</div>
