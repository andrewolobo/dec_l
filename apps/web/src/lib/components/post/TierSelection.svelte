<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		selectedTier?: 'BASIC' | 'STANDARD' | 'PREMIUM';
		error?: string;
		onSubmit: (isDraft: boolean) => void;
		isSubmitting: boolean;
		submitError?: string;
	}

	let { selectedTier = $bindable(), error, onSubmit, isSubmitting, submitError }: Props = $props();

	const tiers = [
		{
			id: 'BASIC' as const,
			name: 'Basic',
			price: 5000,
			duration: 3,
			features: ['3 days visibility', 'Standard listing', 'Basic support', 'Email notifications'],
			icon: 'star_outline',
			color: 'text-slate-600 dark:text-slate-400',
			borderColor: 'border-slate-300 dark:border-slate-600',
			bgColor: 'bg-slate-50 dark:bg-slate-800/50'
		},
		{
			id: 'STANDARD' as const,
			name: 'Standard',
			price: 7000,
			duration: 7,
			features: [
				'7 days visibility',
				'Featured badge',
				'Priority support',
				'Enhanced visibility',
			],
			icon: 'star_half',
			color: 'text-blue-600 dark:text-blue-400',
			borderColor: 'border-blue-300 dark:border-blue-600',
			bgColor: 'bg-blue-50 dark:bg-blue-900/20',
			popular: true
		},
		{
			id: 'PREMIUM' as const,
			name: 'Premium',
			price: 10000,
			duration: 30,
			features: [
				'30 days visibility',
				'Premium badge',
				'Top search',
				'24/7 priority support',
			],
			icon: 'star',
			color: 'text-amber-600 dark:text-amber-400',
			borderColor: 'border-amber-300 dark:border-amber-600',
			bgColor: 'bg-amber-50 dark:bg-amber-900/20'
		}
	];

	let acceptTerms = $state(false);
	let termsError = $state(false);

	function handleTierSelect(tierId: 'BASIC' | 'STANDARD' | 'PREMIUM') {
		selectedTier = tierId;
	}

	function handlePostNow() {
		if (!acceptTerms) {
			termsError = true;
			return;
		}
		termsError = false;
		onSubmit(false);
	}

	function handleSaveDraft() {
		onSubmit(true);
	}

	$effect(() => {
		if (acceptTerms) {
			termsError = false;
		}
	});
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
			Select Pricing Tier
		</h2>
		<p class="text-sm text-slate-600 dark:text-slate-400">
			Choose how long your post will be visible to buyers
		</p>
	</div>

	<!-- Tier cards -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
		{#each tiers as tier (tier.id)}
			{@const isSelected = selectedTier === tier.id}

			<button
				type="button"
				onclick={() => handleTierSelect(tier.id)}
				class="relative p-6 rounded-lg border-2 text-left transition-all
					{isSelected
					? 'border-[#13ecec] bg-[#13ecec]/10 dark:bg-primary-900/20'
					: `${tier.borderColor} ${tier.bgColor} hover:border-primary-300 dark:hover:border-primary-700`}
					{tier.popular ? 'ring-2 ring-blue-500/20' : ''}"
			>
				<!-- Popular badge -->
				{#if tier.popular}
					<div
						class="absolute -top-2 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full"
					>
						Most Popular
					</div>
				{/if}

				<!-- Selected indicator -->
				{#if isSelected}
					<div
						class="absolute top-4 right-4 w-6 h-6 bg-[#13ecec]/100 rounded-full flex items-center justify-center"
					>
						<Icon name="check" size={16} class="text-white" />
					</div>
				{/if}

				<!-- Icon -->
				<div class="mb-4">
					<Icon name={tier.icon} size={32} class={tier.color} />
				</div>

				<!-- Name & Price -->
				<div class="mb-4">
					<h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
						{tier.name}
					</h3>
					<div class="flex items-baseline gap-1">
						<span class="text-2xl font-bold text-slate-900 dark:text-slate-100">
							 Ush {tier.price} 
						</span>
						<span class="text-sm text-slate-500 dark:text-slate-400">
							/ {tier.duration} days
						</span>
					</div>
				</div>

				<!-- Features -->
				<ul class="space-y-2">
					{#each tier.features as feature}
						<li class="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
							<Icon
								name="check_circle"
								size={16}
								class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
							/>
							<span>{feature}</span>
						</li>
					{/each}
				</ul>
			</button>
		{/each}
	</div>

	<!-- Error message -->
	{#if error}
		<div
			class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
		>
			<Icon name="error" size={20} class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
			<p class="text-sm text-red-700 dark:text-red-300">{error}</p>
		</div>
	{/if}

	<!-- Submit error message -->
	{#if submitError}
		<div
			class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
		>
			<Icon name="error" size={20} class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
			<p class="text-sm text-red-700 dark:text-red-300">{submitError}</p>
		</div>
	{/if}

	<!-- Terms and conditions -->
	<div
		class="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
	>
		<label class="flex items-start gap-3 cursor-pointer">
			<input
				type="checkbox"
				bind:checked={acceptTerms}
				class="mt-1 w-4 h-4 text-[#13ecec] border-slate-300 rounded focus:ring-[#13ecec] focus:ring-2
					{termsError ? 'border-red-500' : ''}"
			/>
			<span class="text-sm text-slate-700 dark:text-slate-300">
				I agree to the
				<a href="/terms" class="text-[#13ecec] dark:text-primary-400 hover:underline"
					>Terms of Service</a
				>
				and
				<a href="/privacy" class="text-[#13ecec] dark:text-primary-400 hover:underline"
					>Privacy Policy</a
				>. I confirm that all information provided is accurate and I have the right to sell this
				item.
			</span>
		</label>
		{#if termsError}
			<p class="mt-2 text-sm text-red-600 dark:text-red-400">
				You must accept the terms and conditions to continue
			</p>
		{/if}
	</div>

	<!-- Payment info -->
	{#if selectedTier}
		{@const selected = tiers.find((t) => t.id === selectedTier)}
		{#if selected}
			<div
				class="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
			>
				<div class="flex items-start gap-2">
					<Icon
						name="info"
						size={20}
						class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
					/>
					<div class="flex-1">
						<p class="text-sm text-blue-700 dark:text-blue-300 font-medium mb-1">
							Payment Required
						</p>
						<p class="text-sm text-blue-700 dark:text-blue-300">
							You'll be redirected to payment to complete your <strong>{selected.name}</strong>
							listing (${selected.price} USD for {selected.duration} days). Your post will be published
							after successful payment.
						</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Action buttons -->
	<div class="flex flex-col sm:flex-row gap-3">
		<!-- Save as Draft -->
		<button
			type="button"
			onclick={handleSaveDraft}
			disabled={isSubmitting}
			class="flex-1 px-6 py-3 rounded-lg border border-slate-300 dark:border-slate-600
				text-slate-700 dark:text-slate-300 font-medium
				hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
				disabled:opacity-50 disabled:cursor-not-allowed
				flex items-center justify-center gap-2"
		>
			{#if isSubmitting}
				<div
					class="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"
				></div>
			{:else}
				<Icon name="save" size={20} />
			{/if}
			Save as Draft
		</button>

		<!-- Post Now -->
		<button
			type="button"
			onclick={handlePostNow}
			disabled={isSubmitting || !selectedTier}
			class="flex-1 px-6 py-3 rounded-lg bg-[#13ecec]/100 text-white font-medium
				hover:bg-primary-600 transition-colors
				disabled:opacity-50 disabled:cursor-not-allowed
				flex items-center justify-center gap-2"
		>
			{#if isSubmitting}
				<div
					class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"
				></div>
			{:else}
				<Icon name="send" size={20} />
			{/if}
			Post Now
		</button>
	</div>

	<!-- Draft info -->
	<div class="text-center">
		<p class="text-xs text-slate-500 dark:text-slate-400">
			Save as draft to publish later, or post now to proceed with payment
		</p>
	</div>
</div>

