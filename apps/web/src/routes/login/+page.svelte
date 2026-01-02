<script lang="ts">
	import { goto } from '$app/navigation';

	let email = '';
	let password = '';
	let loading = false;
	let error = '';

	async function handleEmailSignIn() {
		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';

		try {
			// TODO: Integrate with authService when OAuth is implemented
			// For now, just validate and show placeholder
			console.log('Sign in with:', { email, password });

			// Placeholder - redirect to home after successful login
			// await authService.login(email, password);
			// goto('/');

			error = 'Login API not yet implemented. Coming soon!';
		} catch (err: any) {
			error = err.message || 'Login failed';
		} finally {
			loading = false;
		}
	}

	async function handleGoogleSignIn() {
		loading = true;
		error = '';
		try {
			// TODO: Implement Google OAuth
			// await authService.signInWithGoogle();
			console.log('Google sign in clicked');
			error = 'Google OAuth not yet implemented. Coming soon!';
		} catch (err: any) {
			error = err.message || 'Google sign-in failed';
		} finally {
			loading = false;
		}
	}

	async function handleMicrosoftSignIn() {
		loading = true;
		error = '';
		try {
			// TODO: Implement Microsoft OAuth
			// await authService.signInWithMicrosoft();
			console.log('Microsoft sign in clicked');
			error = 'Microsoft OAuth not yet implemented. Coming soon!';
		} catch (err: any) {
			error = err.message || 'Microsoft sign-in failed';
		} finally {
			loading = false;
		}
	}

	function handleKeyPress(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleEmailSignIn();
		}
	}
</script>

<svelte:head>
	<title>Sign In - DEC_L</title>
</svelte:head>

<div class="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
	<div class="flex-grow flex flex-col justify-center">
		<!-- Logo -->
		<div class="flex justify-center pt-8 pb-6">
			<span class="material-symbols-outlined text-white text-5xl">sell</span>
		</div>

		<!-- Title -->
		<h2 class="text-white text-2xl font-bold leading-tight tracking-[-0.015em] text-center px-4">
			Welcome back
		</h2>

		<!-- OAuth Buttons -->
		<div class="flex justify-center w-full">
			<div class="flex w-full flex-1 gap-3 max-w-md flex-col items-stretch px-4 py-8">
				<button
					on:click={handleGoogleSignIn}
					disabled={loading}
					class="flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-16 px-6 py-3 bg-white text-gray-900 text-base font-semibold leading-normal w-full gap-3 hover:bg-[#f8f9fa] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] hover:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
				>
					<svg class="w-[18px] h-[18px]" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
						<path
							fill="#4285F4"
							d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
						/>
						<path
							fill="#34A853"
							d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
						/>
						<path
							fill="#FBBC05"
							d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
						/>
						<path
							fill="#EA4335"
							d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
						/>
					</svg>
					<span class="truncate">Sign in with Google</span>
				</button>

				<button
					on:click={handleMicrosoftSignIn}
					disabled={loading}
					class="flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-16 px-6 py-3 bg-[#2F2F2F] text-white text-base font-semibold leading-normal w-full gap-3 hover:bg-[#1F1F1F] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
				>
					<svg class="w-5 h-5" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
						<rect x="0" y="0" width="11" height="11" fill="#f25022" />
						<rect x="12" y="0" width="11" height="11" fill="#00a4ef" />
						<rect x="0" y="12" width="11" height="11" fill="#7fba00" />
						<rect x="12" y="12" width="11" height="11" fill="#ffb900" />
					</svg>
					<span class="truncate">Sign in with Microsoft</span>
				</button>
			</div>
		</div>

		<!-- Divider -->
		<p class="text-gray-400 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center">or</p>

		<!-- Error Message -->
		{#if error}
			<div class="flex justify-center w-full">
				<div class="max-w-md w-full px-4 py-2">
					<div
						class="bg-danger-500/10 border border-danger-500 text-danger-500 px-4 py-3 rounded-lg text-sm"
					>
						{error}
					</div>
				</div>
			</div>
		{/if}

		<!-- Email Field -->
		<div class="flex justify-center w-full">
			<div class="flex max-w-md w-full flex-wrap items-end gap-4 px-4 py-3">
				<label class="flex flex-col min-w-40 flex-1">
					<p class="text-white text-base font-medium leading-normal pb-2">Email Address</p>
					<div class="flex w-full flex-1 items-stretch rounded-lg">
						<input
							bind:value={email}
							on:keypress={handleKeyPress}
							type="email"
							placeholder="Email Address"
							disabled={loading}
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#2D2D2D] focus:border-none h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</label>
			</div>
		</div>

		<!-- Password Field -->
		<div class="flex justify-center w-full">
			<div class="flex max-w-md w-full flex-wrap items-end gap-4 px-4 py-3">
				<label class="flex flex-col min-w-40 flex-1">
					<div class="flex items-center justify-between pb-2">
						<p class="text-white text-base font-medium leading-normal">Password</p>
						<a href="/forgot-password" class="text-primary text-sm font-medium hover:underline"
							>Forgot?</a
						>
					</div>
					<div class="flex w-full flex-1 items-stretch rounded-lg">
						<input
							bind:value={password}
							on:keypress={handleKeyPress}
							type="password"
							placeholder="Password"
							disabled={loading}
							class="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-white focus:outline-0 focus:ring-2 focus:ring-primary border-none bg-[#2D2D2D] focus:border-none h-14 placeholder:text-gray-500 p-4 text-base font-normal leading-normal disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</div>
				</label>
			</div>
		</div>

		<!-- Spacer -->
		<div class="h-5"></div>

		<!-- Sign In Button -->
		<div class="flex justify-center w-full">
			<div class="flex flex-1 gap-3 max-w-md flex-col items-stretch px-4 py-3">
				<button
					on:click={handleEmailSignIn}
					disabled={loading}
					class="flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-16 px-6 py-3 bg-primary text-background-dark text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<span class="truncate">{loading ? 'Signing in...' : 'Sign In'}</span>
				</button>
			</div>
		</div>
	</div>

	<!-- Footer -->
	<div class="flex flex-col items-center justify-center gap-4 px-4 pb-12 pt-6 text-center">
		<p class="text-gray-400 text-sm">
			Don't have an account? <a href="/register" class="font-bold text-primary hover:underline"
				>Sign Up</a
			>
		</p>
		<p class="text-gray-500 text-xs max-w-xs">
			Protected by reCAPTCHA and subject to the
			<a href="/privacy" class="font-bold text-primary hover:underline">Privacy Policy</a>
			and <a href="/terms" class="font-bold text-primary hover:underline">Terms of Service</a>.
		</p>
	</div>
</div>
