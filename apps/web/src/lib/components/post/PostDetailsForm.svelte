<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import LocationAutocomplete from '$lib/components/forms/LocationAutocomplete.svelte';
	import { getCategories } from '$lib/services/category.service';
	import { getCachedUser, getProfile } from '$lib/services/user.service';
	import type { CategoryResponseDTO } from '$lib/types/category.types';

	interface FormData {
		title: string;
		categoryId: string;
		description: string;
		price: string;
		location: string;
		contactNumber: string;
		brand?: string;
		emailAddress?: string;
		deliveryMethod?: string;
		gpsLocation?: string;
	}

	interface Props {
		formData: FormData;
		errors: Record<string, string>;
		disableTitleEdit?: boolean;
	}

	let { formData = $bindable(), errors, disableTitleEdit = false }: Props = $props();

	let categories = $state<CategoryResponseDTO[]>([]);
	let isLoadingCategories = $state(true);
	let showOptionalFields = $state(false);

	const deliveryMethods = [
		{ value: 'PICKUP', label: 'Pickup Only' },
		{ value: 'DELIVERY', label: 'Delivery Available' },
		{ value: 'BOTH', label: 'Pickup or Delivery' },
		{ value: 'SHIPPING', label: 'Shipping' }
	];

	onMount(async () => {
		try {
			categories = await getCategories();
			
			// Get user data - fetch from API if not in cache or incomplete
			let user = getCachedUser();
			
			// If user doesn't have phone number, fetch fresh profile data
			if (user && !user.phoneNumber) {
				const profileResponse = await getProfile();
				if (profileResponse.success && profileResponse.data) {
					user = profileResponse.data;
				}
			}
			
			// Auto-populate phone number and email from user profile if not already set
			if (user) {
				if (!formData.contactNumber && user.phoneNumber) {
					formData.contactNumber = user.phoneNumber;
				}
				if (!formData.emailAddress && user.emailAddress) {
					formData.emailAddress = user.emailAddress;
				}
			}
		} catch (error) {
			console.error('Failed to load categories:', error);
		} finally {
			isLoadingCategories = false;
		}
	});

	function formatPrice(value: string): string {
		// Remove non-numeric characters except decimal point
		const cleaned = value.replace(/[^\d.]/g, '');
		// Ensure only one decimal point
		const parts = cleaned.split('.');
		if (parts.length > 2) {
			return parts[0] + '.' + parts.slice(1).join('');
		}
		// Limit to 2 decimal places
		if (parts.length === 2 && parts[1].length > 2) {
			return parts[0] + '.' + parts[1].substring(0, 2);
		}
		return cleaned;
	}

	function handlePriceInput(e: Event) {
		const input = e.target as HTMLInputElement;
		formData.price = formatPrice(input.value);
	}

	function handlePhoneInput(e: Event) {
		const input = e.target as HTMLInputElement;
		// Remove non-numeric characters
		formData.contactNumber = input.value.replace(/\D/g, '');
	}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-slate-900 dark:text-white mb-2">Post Details</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400">Provide information about your item</p>
	</div>

	<!-- Title -->
	<div>
		<label for="title" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
			Title <span class="text-red-500">*</span>
		</label>
		<input
			type="text"
			id="title"
			bind:value={formData.title}
			placeholder="e.g., iPhone 13 Pro Max 256GB"
			maxlength="100"
			readonly={disableTitleEdit}
			class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
				bg-white dark:bg-slate-800 text-slate-900 dark:text-white
				placeholder:text-slate-400 dark:placeholder:text-slate-500
				focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
				{errors.title ? 'border-red-500 dark:border-red-500' : ''}
				{disableTitleEdit ? 'cursor-not-allowed opacity-75 bg-slate-100 dark:bg-slate-900' : ''}"
		/>
		{#if errors.title}
			<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
		{:else if disableTitleEdit}
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				<Icon name="lock" size={14} class="inline-block mr-1" />
				Title cannot be changed after posting
			</p>
		{:else}
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				{formData.title.length}/100 characters
			</p>
		{/if}
	</div>

	<!-- Category -->
	<div>
		<label for="category" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
			Category <span class="text-red-500">*</span>
		</label>
		{#if isLoadingCategories}
			<div
				class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800"
			>
				<div class="flex items-center gap-2 text-slate-500 dark:text-slate-400">
					<div
						class="w-4 h-4 border-2 border-[#13ecec] border-t-transparent rounded-full animate-spin"
					></div>
					<span class="text-sm">Loading categories...</span>
				</div>
			</div>
		{:else}
			<select
				id="category"
				bind:value={formData.categoryId}
				class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
					bg-white dark:bg-slate-800 text-slate-900 dark:text-white
					focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
					{errors.categoryId ? 'border-red-500 dark:border-red-500' : ''}"
			>
				<option value="">Select a category</option>
				{#each categories as category (category.id)}
					<option value={category.id.toString()}>
						{category.name} ({category.postCount})
					</option>
				{/each}
			</select>
			{#if errors.categoryId}
				<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.categoryId}</p>
			{/if}
		{/if}
	</div>

	<!-- Description -->
	<div>
		<label
			for="description"
			class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
		>
			Description <span class="text-red-500">*</span>
		</label>
		<textarea
			id="description"
			bind:value={formData.description}
			placeholder="Describe your item in detail. Include condition, features, and any other relevant information..."
			rows="6"
			maxlength="2000"
			class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
				bg-white dark:bg-slate-800 text-slate-900 dark:text-white
				placeholder:text-slate-400 dark:placeholder:text-slate-500
				focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
				resize-none
				{errors.description ? 'border-red-500 dark:border-red-500' : ''}"
		></textarea>
		{#if errors.description}
			<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description}</p>
		{:else}
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				{formData.description.length}/2000 characters (minimum 20)
			</p>
		{/if}
	</div>

	<!-- Price -->
	<div>
		<label for="price" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
			Price <span class="text-red-500">*</span>
		</label>
		<div class="relative">
			<span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400">
				Ush
			</span>
			<input
				type="text"
				id="price"
				value={formData.price}
				oninput={handlePriceInput}
				placeholder="0.00"
				class="w-full pl-16 pr-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
					bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
					placeholder:text-slate-400 dark:placeholder:text-slate-500
					focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
					{errors.price ? 'border-red-500 dark:border-red-500' : ''}"
			/>
		</div>
		{#if errors.price}
			<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price}</p>
		{:else}
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				Enter the price in Uganda Shillings
			</p>
		{/if}
	</div>

	<!-- Location with Autocomplete -->
	<LocationAutocomplete
		bind:value={formData.location}
		bind:coordinates={formData.gpsLocation}
		error={errors.location}
		label="Location"
		placeholder="e.g., Kiwatule, Kampala"
		required
		showCoordinates={false}
		onLocationSelect={(loc) => {
			formData.location = loc.displayName;
			formData.gpsLocation = `${loc.lat},${loc.lon}`;
		}}
	/>

	<!-- Contact Number -->
	<div>
		<label
			for="contactNumber"
			class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
		>
			Contact Number <span class="text-red-500">*</span>
		</label>
		<input
			type="tel"
			id="contactNumber"
			value={formData.contactNumber}
			oninput={handlePhoneInput}
			placeholder="256781000111"
			maxlength="15"
			class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
				bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
				placeholder:text-slate-400 dark:placeholder:text-slate-500
				focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent
				{errors.contactNumber ? 'border-red-500 dark:border-red-500' : ''}"
		/>
		{#if errors.contactNumber}
			<p class="mt-1 text-sm text-red-600 dark:text-red-400">{errors.contactNumber}</p>
		{:else}
			<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
				Include country code (e.g., 256 for Uganda)
			</p>
		{/if}
	</div>

	<!-- Optional fields toggle -->
	<button
		type="button"
		onclick={() => (showOptionalFields = !showOptionalFields)}
		class="flex items-center gap-2 text-[#13ecec] dark:text-[#13ecec] hover:text-[#13ecec] dark:hover:text-[#13ecec] font-medium"
	>
		<Icon name={showOptionalFields ? 'expand_less' : 'expand_more'} size={20} />
		{showOptionalFields ? 'Hide' : 'Show'} optional fields
	</button>

	<!-- Optional fields -->
	{#if showOptionalFields}
		<div
			class="space-y-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
		>
			<!-- Brand -->
			<div>
				<label
					for="brand"
					class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
				>
					Brand / Make
				</label>
				<input
					type="text"
					id="brand"
					bind:value={formData.brand}
					placeholder="e.g., Apple, Samsung, Toyota"
					class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
						bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
						placeholder:text-slate-400 dark:placeholder:text-slate-500
						focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent"
				/>
			</div>

			<!-- Email Address -->
			<div>
				<label
					for="emailAddress"
					class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
				>
					Email Address
				</label>
				<input
					type="email"
					id="emailAddress"
					bind:value={formData.emailAddress}
					placeholder="your.email@example.com"
					class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
						bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
						placeholder:text-slate-400 dark:placeholder:text-slate-500
						focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent"
				/>
				<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Alternative contact method</p>
			</div>

			<!-- Delivery Method -->
			<div>
				<label
					for="deliveryMethod"
					class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
				>
					Delivery Method
				</label>
				<select
					id="deliveryMethod"
					bind:value={formData.deliveryMethod}
					class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
						bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
						focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent"
				>
					<option value="">Select delivery method</option>
					{#each deliveryMethods as method (method.value)}
						<option value={method.value}>{method.label}</option>
					{/each}
				</select>
			</div>

			<!-- GPS Location -->
			 
			<div>
				<label
					for="gpsLocation"
					class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
				>
					GPS Coordinates
				</label>
				<input
					type="text"
					id="gpsLocation"
					bind:value={formData.gpsLocation}
					placeholder="e.g., -6.7924, 39.2083"
					readonly
					class="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600
						bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100
						placeholder:text-slate-400 dark:placeholder:text-slate-500
						cursor-not-allowed opacity-75
						focus:outline-none focus:ring-2 focus:ring-[#13ecec] focus:border-transparent"
				/>
				<p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
					<Icon name="lock" size={14} class="inline-block mr-1" />
					Automatically set from location selection
				</p>
			</div>
		</div>
	{/if}

	<!-- Info message -->
	<div
		class="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
	>
		<Icon name="info" size={20} class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
		<p class="text-sm text-blue-700 dark:text-blue-300">
			All information will be visible to potential buyers. Make sure your contact details are
			correct.
		</p>
	</div>
</div>
