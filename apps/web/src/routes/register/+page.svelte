<script lang="ts">
	import { goto } from '$app/navigation';
	import { parsePhoneNumber } from 'libphonenumber-js';
	import * as authService from '$lib/services/auth.service';
	import * as userService from '$lib/services/user.service';
	import AvatarPicker from '$lib/components/media/AvatarPicker.svelte';
	import PhoneInput from '$lib/components/forms/PhoneInput.svelte';

	// Step management
	let currentStep = 1;
	const totalSteps = 3;

	// Form fields
	let email = '';
	let password = '';
	let confirmPassword = '';
	let fullName = '';
	let phoneNumber = '';
	let phoneCountryCode = '+256';
	let phoneDigits = '';
	let checkingPhone = false;
	let phoneCheckTimeout: number;
	let profilePicture = '';
	let location = '';
	let bio = '';
	let agreedToTerms = false;

	// UI state
	let loading = false;
	let error = '';

	// Touched state for validation
	let emailTouched = false;
	let passwordTouched = false;
	let confirmPasswordTouched = false;
	let fullNameTouched = false;
	let phoneNumberTouched = false;

	// Validation errors
	let emailError = '';
	let passwordError = '';
	let confirmPasswordError = '';
	let fullNameError = '';
	let phoneNumberError = '';

	// Password strength
	let passwordStrength = { score: 0, message: '', color: '' };

	// Validation functions
	function validateEmail(value: string): string {
		if (!value) return 'Email is required';
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(value)) return 'Please enter a valid email address';
		return '';
	}

	function validatePassword(value: string): string {
		if (!value) return 'Password is required';
		if (value.length < 8) return 'Password must be at least 8 characters';
		if (!/[A-Z]/.test(value)) return 'Password must contain an uppercase letter';
		if (!/[a-z]/.test(value)) return 'Password must contain a lowercase letter';
		if (!/[0-9]/.test(value)) return 'Password must contain a number';
		if (!/[^A-Za-z0-9]/.test(value)) return 'Password must contain a special character';
		return '';
	}

	function validateConfirmPassword(value: string, passwordValue: string): string {
		if (!value) return 'Please confirm your password';
		if (value !== passwordValue) return 'Passwords do not match';
		return '';
	}

	function validateFullName(value: string): string {
		if (!value) return 'Full name is required';
		if (value.length < 2) return 'Full name must be at least 2 characters';
		if (value.length > 100) return 'Full name must not exceed 100 characters';
		return '';
	}

	function validatePhoneNumber(fullNumber: string): string {
		if (!fullNumber || fullNumber === phoneCountryCode) {
			return 'Phone number is required';
		}

		try {
			const parsed = parsePhoneNumber(fullNumber);
			if (!parsed || !parsed.isValid()) {
				return 'Please enter a valid phone number';
			}
			return '';
		} catch {
			return 'Invalid phone number format';
		}
	}

	// Check phone availability with debounce
	async function checkPhoneAvailability(fullNumber: string) {
		if (!fullNumber || fullNumber === phoneCountryCode) return;

		// Clear existing timeout
		if (phoneCheckTimeout) clearTimeout(phoneCheckTimeout);

		// Debounce: wait 500ms after user stops typing
		phoneCheckTimeout = setTimeout(async () => {
			checkingPhone = true;

			try {
				const response = await fetch(
					`http://localhost:3000/api/v1/auth/check-phone?phoneNumber=${encodeURIComponent(fullNumber)}`
				);
				const data = await response.json();

				if (data.success && !data.data.available) {
					phoneNumberError = 'This phone number is already registered';
				} else {
					phoneNumberError = validatePhoneNumber(fullNumber);
				}
			} catch (err) {
				console.error('Phone check failed:', err);
				// Don't show error to user, just validate format
				phoneNumberError = validatePhoneNumber(fullNumber);
			} finally {
				checkingPhone = false;
			}
		}, 500);
	}

	// Handle phone number change from PhoneInput component
	function handlePhoneChange(event: CustomEvent<string>) {
		const fullNumber = event.detail;
		phoneNumber = fullNumber;

		if (phoneNumberTouched) {
			checkPhoneAvailability(fullNumber);
		}
	}

	function calculatePasswordStrength(value: string) {
		let score = 0;
		if (value.length >= 8) score++;
		if (value.length >= 12) score++;
		if (/[A-Z]/.test(value)) score++;
		if (/[a-z]/.test(value)) score++;
		if (/[0-9]/.test(value)) score++;
		if (/[^A-Za-z0-9]/.test(value)) score++;

		if (score <= 2) {
			passwordStrength = { score, message: 'Weak', color: 'bg-danger-500' };
		} else if (score <= 4) {
			passwordStrength = { score, message: 'Fair', color: 'bg-warning-500' };
		} else if (score <= 5) {
			passwordStrength = { score, message: 'Good', color: 'bg-primary' };
		} else {
			passwordStrength = { score, message: 'Strong', color: 'bg-success-500' };
		}
	}

	// Reactive validation (only show errors for touched fields)
	$: emailError = emailTouched ? validateEmail(email) : '';
	$: {
		passwordError = passwordTouched ? validatePassword(password) : '';
		if (password) calculatePasswordStrength(password);
	}
	$: confirmPasswordError = confirmPasswordTouched
		? validateConfirmPassword(confirmPassword, password)
		: '';
	$: fullNameError = fullNameTouched ? validateFullName(fullName) : '';
	$: phoneNumberError = phoneNumberTouched ? validatePhoneNumber(phoneNumber) : '';

	// Step validation - reactive variables
	$: canProceedFromStep1 = (() => {
		if (!email || !password || !confirmPassword || !agreedToTerms) return false;
		// Always validate, regardless of touched state
		const realEmailError = validateEmail(email);
		const realPasswordError = validatePassword(password);
		const realConfirmPasswordError = validateConfirmPassword(confirmPassword, password);
		if (realEmailError || realPasswordError || realConfirmPasswordError) return false;
		return true;
	})();

	$: canProceedFromStep2 = (() => {
		if (!fullName || !phoneNumber || checkingPhone) return false;
		// Always validate, regardless of touched state
		const realFullNameError = validateFullName(fullName);
		const realPhoneNumberError = validatePhoneNumber(phoneNumber);
		if (realFullNameError || realPhoneNumberError) return false;
		return true;
	})();

	// Step navigation
	function nextStep() {
		error = '';
		if (currentStep === 1 && !canProceedFromStep1) {
			error = 'Please fill in all required fields correctly';
			return;
		}
		if (currentStep === 2 && !canProceedFromStep2) {
			error = 'Please fill in all required fields correctly';
			return;
		}
		if (currentStep < totalSteps) {
			currentStep++;
		}
	}

	function previousStep() {
		error = '';
		if (currentStep > 1) {
			currentStep--;
		}
	}

	function skipStep3() {
		handleSubmit();
	}

	async function handleSubmit() {
		if (!canProceedFromStep1 || !canProceedFromStep2) {
			error = 'Please complete all required fields';
			currentStep = 1;
			return;
		}

		loading = true;
		error = '';

		try {
			const registerData = {
				emailAddress: email,
				password: password,
				fullName: fullName,
				phoneNumber: phoneNumber, // Already in E.164 format from PhoneInput
				profilePictureUrl: profilePicture || undefined,
				location: location || undefined,
				bio: bio || undefined
			};

			const response = await authService.register(registerData);

			if (response.success && response.data) {
				// Auth service automatically stores tokens and user data
				// All profile data including avatar is now saved in registration

				// Redirect to browse or onboarding
				await goto('/browse');
			} else {
				error = response.error?.message || 'Registration failed. Please try again.';
			}
		} catch (err: any) {
			console.error('Registration error:', err);
			error = err.message || 'An unexpected error occurred. Please try again.';
		} finally {
			loading = false;
		}
	}

	async function handleGoogleSignUp() {
		loading = true;
		error = '';
		try {
			console.log('Google sign up clicked');
			error = 'Google OAuth not yet implemented. Coming soon!';
		} catch (err: any) {
			error = err.message || 'Google sign-up failed';
		} finally {
			loading = false;
		}
	}

	async function handleMicrosoftSignUp() {
		loading = true;
		error = '';
		try {
			console.log('Microsoft sign up clicked');
			error = 'Microsoft OAuth not yet implemented. Coming soon!';
		} catch (err: any) {
			error = err.message || 'Microsoft sign-up failed';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Sign Up - Tunda Plug</title>
</svelte:head>

<div class="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
	<div class="flex-grow flex flex-col justify-center py-8">
		<!-- Logo -->
		<div class="flex justify-center pt-4 pb-4">
			<div class="flex-1 flex justify-center">
				<img src="/images/tunda-hub-logo.fw.png" alt="Tunda Plug" class="h-14 object-contain" />
			</div>
		</div>

		<!-- Title -->
		<h1 class="text-white text-lg font-bold leading-tight tracking-[-0.015em] text-center px-4">
			Create your account
		</h1>

		<!-- Step Indicator -->
		<div class="flex justify-center w-full px-4 pt-6 pb-4">
			<div class="flex items-center gap-2 max-w-md w-full">
				{#each Array(totalSteps) as _, i}
					<div class="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
						<div
							class="h-full bg-primary transition-all duration-300"
							style="width: {currentStep > i ? '100%' : currentStep === i + 1 ? '50%' : '0%'}"
						></div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Step Counter -->
		<p class="text-center text-gray-400 text-sm pb-4">Step {currentStep} of {totalSteps}</p>

		<!-- Error Message -->
		{#if error}
			<div class="flex justify-center w-full px-4 pb-4">
				<div class="max-w-md w-full">
					<div
						class="bg-danger-500/10 border border-danger-500 text-danger-500 px-4 py-3 rounded-lg text-sm"
					>
						{error.message || error}
					</div>
				</div>
			</div>
		{/if}

		<!-- Step 1: Account Credentials -->
		{#if currentStep === 1}
			<!-- OAuth Buttons -->
			<div class="flex justify-center w-full">
				<div class="flex w-full flex-1 gap-3 max-w-md flex-col items-stretch px-4 py-4">
					<button
						on:click={handleGoogleSignUp}
						disabled={loading}
						class="flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-white text-gray-900 text-base font-semibold leading-normal w-full gap-3 hover:bg-[#f8f9fa] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] hover:shadow-[0_1px_3px_0_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)]"
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
						<span class="truncate">Sign up with Google</span>
					</button>

					<button
						on:click={handleMicrosoftSignUp}
						disabled={loading}
						class="flex min-w-[84px] max-w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 px-5 bg-[#2F2F2F] text-white text-base font-semibold leading-normal w-full gap-3 hover:bg-[#1F1F1F] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
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

			<p class="text-gray-400 text-sm font-normal leading-normal pb-3 pt-1 px-4 text-center">or</p>

			<!-- Email Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">
							Email Address <span class="text-danger-500">*</span>
						</p>
						<input
							bind:value={email}
							on:blur={() => (emailTouched = true)}
							type="email"
							placeholder="Enter your email"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-2={emailError}
							class:border-danger-500={emailError}
						/>
						{#if emailError}
							<p class="text-danger-500 text-xs mt-1">{emailError}</p>
						{/if}
					</label>
				</div>
			</div>

			<!-- Password Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">
							Password <span class="text-danger-500">*</span>
						</p>
						<input
							bind:value={password}
							on:blur={() => (passwordTouched = true)}
							type="password"
							placeholder="Create a password"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-2={passwordError}
							class:border-danger-500={passwordError}
						/>
						{#if password && !passwordError}
							<div class="mt-2">
								<div class="flex items-center gap-2 mb-1">
									<div class="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
										<div
											class="h-full transition-all duration-300 {passwordStrength.color}"
											style="width: {(passwordStrength.score / 6) * 100}%"
										></div>
									</div>
									<span class="text-xs text-gray-400">{passwordStrength.message}</span>
								</div>
							</div>
						{/if}
						{#if passwordError}
							<p class="text-danger-500 text-xs mt-1">{passwordError}</p>
						{/if}
					</label>
				</div>
			</div>

			<!-- Confirm Password Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">
							Confirm Password <span class="text-danger-500">*</span>
						</p>
						<input
							bind:value={confirmPassword}
							on:blur={() => (confirmPasswordTouched = true)}
							type="password"
							placeholder="Confirm your password"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-2={confirmPasswordError}
							class:border-danger-500={confirmPasswordError}
						/>
						{#if confirmPasswordError}
							<p class="text-danger-500 text-xs mt-1">{confirmPasswordError}</p>
						{/if}
					</label>
				</div>
			</div>

			<!-- Terms Checkbox -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full px-4 py-3">
					<label class="flex items-start gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={agreedToTerms}
							disabled={loading}
							class="mt-1 w-5 h-5 rounded border-2 border-gray-400 bg-transparent checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
						/>
						<p class="text-gray-400 text-sm leading-normal">
							I agree to the <a href="/terms" class="text-primary hover:underline"
								>Terms of Service</a
							>
							and <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>
							<span class="text-danger-500">*</span>
						</p>
					</label>
				</div>
			</div>

			<!-- Next Button -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full px-4 py-3">
					<button
						on:click={nextStep}
						disabled={loading || !canProceedFromStep1}
						class="w-full h-12 rounded-lg bg-primary text-background-dark text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Continue
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 2: Personal Information -->
		{#if currentStep === 2}
			<p class="text-center text-gray-300 text-sm px-4 pb-6">Help us personalize your experience</p>

			<!-- Full Name Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">
							Full Name <span class="text-danger-500">*</span>
						</p>
						<input
							bind:value={fullName}
							on:blur={() => (fullNameTouched = true)}
							type="text"
							placeholder="Enter your full name"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
							class:border-2={fullNameError}
							class:border-danger-500={fullNameError}
						/>
						{#if fullNameError}
							<p class="text-danger-500 text-xs mt-1">{fullNameError}</p>
						{/if}
					</label>
				</div>
			</div>

			<!-- Phone Number Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<p class="text-white text-base font-medium leading-normal pb-2">
						Phone Number <span class="text-danger-500">*</span>
					</p>
					<PhoneInput
						bind:value={phoneDigits}
						bind:countryCode={phoneCountryCode}
						placeholder="700 123 456"
						required={true}
						disabled={loading}
						error={phoneNumberTouched ? phoneNumberError : undefined}
						on:change={handlePhoneChange}
						on:blur={() => {
							phoneNumberTouched = true;
							if (phoneNumber) checkPhoneAvailability(phoneNumber);
						}}
					/>
					{#if checkingPhone}
						<p class="text-gray-400 text-xs mt-1">Checking availability...</p>
					{/if}
				</div>
			</div>

			<!-- Navigation Buttons -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full gap-3 px-4 py-3">
					<button
						on:click={previousStep}
						disabled={loading}
						class="flex-1 h-12 rounded-lg bg-transparent border-2 border-primary text-primary text-base font-bold hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Back
					</button>
					<button
						on:click={nextStep}
						disabled={loading || !canProceedFromStep2}
						class="flex-1 h-12 rounded-lg bg-primary text-background-dark text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Continue
					</button>
				</div>
			</div>
		{/if}

		<!-- Step 3: Optional Profile -->
		{#if currentStep === 3}
			<p class="text-center text-gray-300 text-sm px-4 pb-2">Enhance your profile (optional)</p>
			<p class="text-center text-gray-500 text-xs px-4 pb-6">You can complete this later</p>

			<!-- Avatar Picker -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-2xl w-full flex-col px-4 py-2">
					<AvatarPicker {email} bind:selected={profilePicture} />
				</div>
			</div>

			<!-- Location Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">Location</p>
						<input
							bind:value={location}
							type="text"
							placeholder="City, Country"
							maxlength="255"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] h-12 px-4 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
						/>
					</label>
				</div>
			</div>

			<!-- Bio Field -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full flex-col px-4 py-2">
					<label class="flex flex-col flex-1">
						<p class="text-white text-base font-medium leading-normal pb-2">Bio</p>
						<textarea
							bind:value={bio}
							placeholder="Tell us about yourself..."
							maxlength="500"
							rows="3"
							disabled={loading}
							class="rounded-lg text-white bg-[#2D2D2D] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
						></textarea>
						<p class="text-gray-500 text-xs mt-1">{bio.length}/500 characters</p>
					</label>
				</div>
			</div>

			<!-- Navigation Buttons -->
			<div class="flex justify-center w-full">
				<div class="flex max-w-md w-full gap-3 px-4 py-3">
					<button
						on:click={previousStep}
						disabled={loading}
						class="flex-1 h-12 rounded-lg bg-transparent border-2 border-primary text-primary text-base font-bold hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Back
					</button>
					<button
						on:click={skipStep3}
						disabled={loading}
						class="flex-1 h-12 rounded-lg bg-transparent border-2 border-gray-600 text-gray-400 text-base font-bold hover:bg-gray-600/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Skip
					</button>
					<button
						on:click={handleSubmit}
						disabled={loading}
						class="flex-1 h-12 rounded-lg bg-primary text-background-dark text-base font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{loading ? 'Creating...' : 'Complete'}
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Footer -->
	<div class="flex flex-col items-center justify-center gap-3 px-4 pb-8 pt-4 text-center">
		<p class="text-gray-400 text-sm">
			Already have an account? <a href="/login" class="font-bold text-primary hover:underline"
				>Log In</a
			>
		</p>
	</div>
</div>
