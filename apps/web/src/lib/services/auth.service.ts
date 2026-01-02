import { apiClient } from './api.client';
import type { ApiResponse } from '$types/api.types';
import type {
	RegisterDTO,
	LoginDTO,
	OAuthLoginDTO,
	AuthResponse,
	AuthTokens,
	RefreshTokenDTO,
	PhoneVerificationDTO
} from '$types/auth.types';
import { STORAGE_KEYS } from '$lib/config/constants';

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

/**
 * Register a new user with email and password
 */
export async function register(data: RegisterDTO): Promise<ApiResponse<AuthResponse>> {
	const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data);

	// Save tokens and user to localStorage
	if (response.data.success && response.data.data) {
		setAuthData(response.data.data);
	}

	return response.data;
}

/**
 * Login with email and password
 */
export async function login(data: LoginDTO): Promise<ApiResponse<AuthResponse>> {
	const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data);

	// Save tokens and user to localStorage
	if (response.data.success && response.data.data) {
		setAuthData(response.data.data);
	}

	return response.data;
}

/**
 * Login with OAuth provider (Google, Microsoft, Facebook)
 */
export async function loginWithOAuth(data: OAuthLoginDTO): Promise<ApiResponse<AuthResponse>> {
	const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/oauth', data);

	// Save tokens and user to localStorage
	if (response.data.success && response.data.data) {
		setAuthData(response.data.data);
	}

	return response.data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> {
	const response = await apiClient.post<ApiResponse<{ accessToken: string }>>('/auth/refresh', {
		refreshToken
	} as RefreshTokenDTO);

	// Update access token in localStorage (keep existing refresh token)
	if (response.data.success && response.data.data) {
		const currentTokens = getAuthTokens();
		if (currentTokens) {
			setAuthTokens({
				accessToken: response.data.data.accessToken,
				refreshToken: currentTokens.refreshToken
			});
		}
	}

	return response.data;
}

/**
 * Logout - clear tokens and user data
 */
export async function logout(): Promise<void> {
	try {
		// Call logout endpoint to invalidate refresh token
		await apiClient.post('/auth/logout');
	} catch (error) {
		// Continue with local cleanup even if API call fails
		console.error('Logout API call failed:', error);
	} finally {
		// Always clear local data
		clearAuthData();
	}
}

/**
 * Verify phone number
 */
export async function verifyPhone(data: PhoneVerificationDTO): Promise<ApiResponse<void>> {
	const response = await apiClient.post<ApiResponse<void>>('/auth/verify-phone', data);
	return response.data;
}

/**
 * Request password reset
 */
export async function requestPasswordReset(emailAddress: string): Promise<ApiResponse<void>> {
	const response = await apiClient.post<ApiResponse<void>>('/auth/forgot-password', {
		emailAddress
	});
	return response.data;
}

/**
 * Reset password with token
 */
export async function resetPassword(
	token: string,
	newPassword: string
): Promise<ApiResponse<void>> {
	const response = await apiClient.post<ApiResponse<void>>('/auth/reset-password', {
		token,
		newPassword
	});
	return response.data;
}

/**
 * Resend email verification
 */
export async function resendEmailVerification(): Promise<ApiResponse<void>> {
	const response = await apiClient.post<ApiResponse<void>>('/auth/resend-verification');
	return response.data;
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<ApiResponse<void>> {
	const response = await apiClient.get<ApiResponse<void>>(`/auth/verify-email/${token}`);
	return response.data;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Save authentication data (tokens + user) to localStorage
 */
function setAuthData(authResponse: AuthResponse): void {
	if (typeof window === 'undefined') return;

	setAuthTokens(authResponse.tokens);
	localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(authResponse.user));
}

/**
 * Save authentication tokens to localStorage
 */
export function setAuthTokens(tokens: AuthTokens): void {
	if (typeof window === 'undefined') return;

	localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
	localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
}

/**
 * Clear all authentication data from localStorage
 */
export function clearAuthData(): void {
	if (typeof window === 'undefined') return;

	localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
	localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
	localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Get current authentication tokens
 */
export function getAuthTokens(): AuthTokens | null {
	if (typeof window === 'undefined') return null;

	const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
	const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

	if (!accessToken || !refreshToken) return null;

	return { accessToken, refreshToken };
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	return getAuthTokens() !== null;
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): AuthResponse['user'] | null {
	if (typeof window === 'undefined') return null;

	const userJson = localStorage.getItem(STORAGE_KEYS.USER);
	if (!userJson) return null;

	try {
		return JSON.parse(userJson);
	} catch {
		return null;
	}
}
