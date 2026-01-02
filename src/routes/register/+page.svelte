<script lang="ts">
	import { goto } from '$app/navigation';
	import { authService } from '$lib/services/auth.service';
	import { authStore } from '$lib/stores/auth.store';
	import Button from '$lib/components/Button.svelte';
	import Input from '$lib/components/Input.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { onMount } from 'svelte';

	let formData = {
		name: '',
		email: '',
		password: '',
		confirmPassword: '',
		phone: '',
		agreeToTerms: false
	};

	let errors: Record<string, string> = {};
	let isLoading = false;
	let showToast = false;
	let toastMessage = '';
	let toastType: 'success' | 'error' | 'info' = 'info';

	// Redirect if already authenticated
	onMount(() => {
		if ($authStore.isAuthenticated) {
			goto('/');
		}
	});

	function validateForm(): boolean {
		errors = {};

		if (!formData.name.trim()) {
			errors.name = 'Name is required';
		}

		if (!formData.email.trim()) {
			errors.email = 'Email is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errors.email = 'Invalid email format';
		}

		if (!formData.password) {
			errors.password = 'Password is required';
		} else if (formData.password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		} else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
			errors.password = 'Password must contain uppercase, lowercase, and number';
		}

		if (formData.password !== formData.confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		if (formData.phone && !/^\+?[1-9]\d{1,14}$/.test(formData.phone.replace(/\s/g, ''))) {
			errors.phone = 'Invalid phone number format';
		}

		if (!formData.agreeToTerms) {
			errors.terms = 'You must agree to the Terms of Service';
		}

		return Object.keys(errors).length === 0;
	}

	async function handleSubmit() {
		if (!validateForm()) return;

		isLoading = true;
		try {
			await authService.register({
				name: formData.name,
				email: formData.email,
				password: formData.password,
				phone: formData.phone || undefined
			});

			toastMessage = 'Registration successful! Redirecting...';
			toastType = 'success';
			showToast = true;

			setTimeout(() => {
				goto('/');
			}, 1500);
		} catch (error: any) {
			toastMessage = error.message || 'Registration failed. Please try again.';
			toastType = 'error';
			showToast = true;
		} finally {
			isLoading = false;
		}
	}

	async function handleOAuthRegister(provider: 'google' | 'microsoft' | 'facebook') {
		isLoading = true;
		try {
			await authService.loginWithOAuth(provider);
		} catch (error: any) {
			toastMessage = error.message || `${provider} registration failed`;
			toastType = 'error';
			showToast = true;
			isLoading = false;
		}
	}

	function getPasswordStrength(): { strength: number; label: string; color: string } {
		const password = formData.password;
		if (!password) return { strength: 0, label: '', color: '' };

		let strength = 0;
		if (password.length >= 8) strength++;
		if (password.length >= 12) strength++;
		if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
		if (/\d/.test(password)) strength++;
		if (/[^a-zA-Z\d]/.test(password)) strength++;

		if (strength <= 2)
			return { strength: (strength / 5) * 100, label: 'Weak', color: 'bg-red-500' };
		if (strength === 3)
			return { strength: (strength / 5) * 100, label: 'Fair', color: 'bg-yellow-500' };
		if (strength === 4)
			return { strength: (strength / 5) * 100, label: 'Good', color: 'bg-blue-500' };
		return { strength: 100, label: 'Strong', color: 'bg-green-500' };
	}

	$: passwordStrength = getPasswordStrength();
</script>

<svelte:head>
	<title>Sign Up - ReGoods</title>
	<meta name="description" content="Create your ReGoods account to start buying and selling" />
</svelte:head>

<div class="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
	<!-- Logo and Header -->
	<div class="flex justify-center pt-8 pb-6">
		<span class="material-symbols-outlined text-primary text-5xl">sell</span>
	</div>

	<h2
		class="text-gray-900 dark:text-white text-2xl font-bold leading-tight tracking-[-0.015em] text-center px-4"
	>
		Create your account
	</h2>

	<!-- OAuth Buttons -->
	<div class="flex justify-center w-full">
		<div class="flex w-full flex-1 gap-3 max-w-md flex-col items-stretch px-4 py-8">
			<Button
				variant="secondary"
				fullWidth
				onclick={() => handleOAuthRegister('google')}
				disabled={isLoading}
			>
				<img
					src="https://lh3.googleusercontent.com/aida-public/AB6AXuDUY-I7GiccGGN63r2PGH2fxocC8u-x56hiS05iI0UxkWm0JUecLQI77PypW8Pp6Gl75J-mbdYM3Kk-LfQ4vFfM1H75txh0eunqEYrX35E4GuoZZjyIvigjgOLnnYkppWruh05mNSPmd9h0Ly_5wz4d2vkpbX9f_bKW5QGRkTHzw28LUtGcqPK8zMQUp5-3FdS-7wBKd-4K5CmYWGfNNAldfCkJihaQIHHhQSUkBbNLplcl2LxUGVOjojR8ep-V0gfM7MEIPL-GRVt8"
					alt="Google logo"
					class="w-6 h-6"
				/>
				Sign up with Google
			</Button>

			<Button
				variant="secondary"
				fullWidth
				onclick={() => handleOAuthRegister('microsoft')}
				disabled={isLoading}
			>
				<img
					src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXG9AKzw5s_T7CXKmyTExyqOURQE0-vRfWmZarHTcPK_4Pl3aqw4xZnTybibKW3TIbX7P0LDxPdg31EC-U6vDNzMW3ThMbgISpn_KPzCUt2GwNWj1MJGRPOyq9OflCRoGcUDNAeddVnpV9J0tcHrJhCGmqohF4bEe75J4oKILxLJUk57_GtObl-WvjQPnNH-IeDmTOEHny80EMrHyXtGwcYH4K_dhM6I6HiijRVXCnh9ERl-a_TExfavmo6M7meC8kYiBOJvWTiNNe"
					alt="Microsoft logo"
					class="w-6 h-6"
				/>
				Sign up with Microsoft
			</Button>
		</div>
	</div>

	<!-- Divider -->
	<p class="text-gray-400 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center">or</p>

	<!-- Registration Form -->
	<form on:submit|preventDefault={handleSubmit} class="flex flex-col items-center w-full">
		<div class="flex max-w-md w-full flex-col gap-4 px-4">
			<!-- Name Input -->
			<Input
				label="Full Name"
				type="text"
				placeholder="John Doe"
				bind:value={formData.name}
				error={errors.name}
				disabled={isLoading}
				required
			/>

			<!-- Email Input -->
			<Input
				label="Email Address"
				type="email"
				placeholder="john@example.com"
				bind:value={formData.email}
				error={errors.email}
				disabled={isLoading}
				required
			/>

			<!-- Phone Input (Optional) -->
			<Input
				label="Phone Number (Optional)"
				type="tel"
				placeholder="+1 234 567 8900"
				bind:value={formData.phone}
				error={errors.phone}
				helperText="For account verification and notifications"
				disabled={isLoading}
			/>

			<!-- Password Input -->
			<div class="flex flex-col gap-2">
				<Input
					label="Password"
					type="password"
					placeholder="••••••••"
					bind:value={formData.password}
					error={errors.password}
					disabled={isLoading}
					required
				/>

				<!-- Password Strength Indicator -->
				{#if formData.password}
					<div class="flex items-center gap-2">
						<div class="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
							<div
								class="h-full transition-all duration-300 {passwordStrength.color}"
								style="width: {passwordStrength.strength}%"
							></div>
						</div>
						<span class="text-sm text-gray-400">{passwordStrength.label}</span>
					</div>
				{/if}
			</div>

			<!-- Confirm Password Input -->
			<Input
				label="Confirm Password"
				type="password"
				placeholder="••••••••"
				bind:value={formData.confirmPassword}
				error={errors.confirmPassword}
				disabled={isLoading}
				required
			/>

			<!-- Terms and Conditions -->
			<label class="flex items-start gap-3 cursor-pointer">
				<input
					type="checkbox"
					bind:checked={formData.agreeToTerms}
					disabled={isLoading}
					class="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-700 text-primary focus:ring-primary focus:ring-2"
				/>
				<span class="text-sm text-gray-400">
					I agree to the
					<a href="/terms" class="text-primary hover:underline">Terms of Service</a>
					and
					<a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>
				</span>
			</label>
			{#if errors.terms}
				<p class="text-red-500 text-sm -mt-2">{errors.terms}</p>
			{/if}

			<!-- Submit Button -->
			<div class="pt-3">
				<Button type="submit" variant="primary" fullWidth loading={isLoading}>
					{isLoading ? 'Creating Account...' : 'Sign Up'}
				</Button>
			</div>
		</div>
	</form>

	<!-- Footer -->
	<div class="flex flex-col items-center justify-center gap-4 px-4 pb-12 pt-6 text-center">
		<p class="text-gray-400 text-sm">
			Already have an account?
			<a href="/login" class="font-bold text-primary hover:underline">Log In</a>
		</p>
	</div>
</div>

<!-- Toast Notification -->
{#if showToast}
	<Toast message={toastMessage} type={toastType} onclose={() => (showToast = false)} />
{/if}
