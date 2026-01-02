import axios from 'axios';
import type {
	AxiosInstance,
	AxiosError,
	AxiosRequestConfig,
	InternalAxiosRequestConfig
} from 'axios';
import { config as appConfig, isDevelopment } from '$lib/config';
import { STORAGE_KEYS } from '$lib/config/constants';
import type { ApiResponse, ApiError } from '$types/api.types';
import type { AuthTokens } from '$types/auth.types';
import {
	isRetryable,
	isNetworkError,
	isTimeoutError,
	isServerError,
	isRateLimitError,
	logError,
	type ClientError
} from '$lib/utils/error-handler';

/**
 * Create configured Axios instance
 */
export const apiClient: AxiosInstance = axios.create({
	baseURL: appConfig.api.baseUrl,
	timeout: appConfig.api.timeout,
	headers: {
		'Content-Type': 'application/json'
	}
});

/**
 * Get tokens from localStorage
 */
function getTokens(): AuthTokens | null {
	if (typeof window === 'undefined') return null;

	const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
	const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

	if (!accessToken || !refreshToken) return null;

	return { accessToken, refreshToken };
}

/**
 * Save tokens to localStorage
 */
function saveTokens(tokens: AuthTokens): void {
	if (typeof window === 'undefined') return;

	localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
	localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
}

/**
 * Clear tokens from localStorage
 */
function clearTokens(): void {
	if (typeof window === 'undefined') return;

	localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
	localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
	localStorage.removeItem(STORAGE_KEYS.USER);
}

/**
 * Request interceptor - Add auth token to requests
 */
apiClient.interceptors.request.use(
	(config: InternalAxiosRequestConfig) => {
		const tokens = getTokens();

		if (tokens?.accessToken && config.headers) {
			config.headers.Authorization = `Bearer ${tokens.accessToken}`;
		}

		// Enhanced logging in development
		if (isDevelopment && appConfig.dev.debugMode) {
			console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
				params: config.params,
				data: config.data,
				headers: config.headers
			});
		}

		// Add request timestamp for timing
		if (config.headers) {
			config.headers['X-Request-Start'] = Date.now().toString();
		}

		return config;
	},
	(error: AxiosError) => {
		if (isDevelopment) {
			console.error('[API Request Error]', error);
		}

		// Log error
		logError(
			{
				message: error.message,
				code: error.code,
				timestamp: Date.now()
			},
			{
				method: error.config?.method?.toUpperCase(),
				url: error.config?.url
			}
		);

		return Promise.reject(error);
	}
);

/**
 * Track if we're currently refreshing the token
 */
let isRefreshing = false;
let failedQueue: Array<{
	resolve: (value: any) => void;
	reject: (error: any) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
function processQueue(error: AxiosError | null, token: string | null = null): void {
	failedQueue.forEach((promise) => {
		if (error) {
			promise.reject(error);
		} else {
			promise.resolve(token);
		}
	});

	failedQueue = [];
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(): Promise<string> {
	const tokens = getTokens();

	if (!tokens?.refreshToken) {
		throw new Error('No refresh token available');
	}

	try {
		const response = await axios.post<ApiResponse<{ accessToken: string }>>(
			`${appConfig.api.baseUrl}/auth/refresh`,
			{ refreshToken: tokens.refreshToken }
		);

		if (response.data.success && response.data.data) {
			const newAccessToken = response.data.data.accessToken;
			saveTokens({ accessToken: newAccessToken, refreshToken: tokens.refreshToken });

			if (isDevelopment && appConfig.dev.debugMode) {
				console.log('[API] Access token refreshed successfully');
			}

			return newAccessToken;
		} else {
			throw new Error('Token refresh failed');
		}
	} catch (error) {
		if (isDevelopment) {
			console.error('[API] Token refresh failed:', error);
		}
		throw error;
	}
}
/**
 * Response interceptor - Handle successful responses and errors
 */
apiClient.interceptors.response.use(
	// Success handler
	(response) => {
		if (isDevelopment && appConfig.dev.debugMode) {
			const requestStart = response.config.headers?.['X-Request-Start'];
			const duration = requestStart ? Date.now() - parseInt(requestStart as string) : 0;

			console.log(
				`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`,
				{
					status: response.status,
					duration: `${duration}ms`,
					data: response.data
				}
			);
		}

		return response;
	},
	// Error handler
	async (error: AxiosError<ApiError>) => {
		const originalRequest = error.config as AxiosRequestConfig & {
			_retry?: boolean;
			_retryCount?: number;
			_retryReason?: string;
		};

		// Don't process if no config
		if (!originalRequest) {
			return Promise.reject(error);
		}

		// Enhanced error logging
		const errorInfo: ClientError = {
			message: error.response?.data?.message || error.message,
			code: error.code,
			status: error.response?.status,
			details: error.response?.data,
			timestamp: Date.now()
		};

		if (isDevelopment) {
			const requestStart = error.config?.headers?.['X-Request-Start'];
			const duration = requestStart ? Date.now() - parseInt(requestStart as string) : 0;

			console.error('[API Response Error]', {
				url: error.config?.url,
				method: error.config?.method?.toUpperCase(),
				status: error.response?.status,
				duration: `${duration}ms`,
				message: errorInfo.message,
				error: error.response?.data
			});
		}

		// Log error with context
		logError(errorInfo, {
			method: error.config?.method?.toUpperCase(),
			url: error.config?.url
		});

		// Handle 401 Unauthorized - Try to refresh token
		if (error.response?.status === 401 && !originalRequest._retry) {
			// Check if we have a refresh token before attempting refresh
			const refreshToken =
				typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;

			if (!refreshToken) {
				// No refresh token available, can't refresh - reject with original error
				clearTokens();
				return Promise.reject(error);
			}

			if (isRefreshing) {
				// Queue this request while token is being refreshed
				return new Promise((resolve, reject) => {
					failedQueue.push({ resolve, reject });
				})
					.then((token) => {
						if (originalRequest.headers) {
							originalRequest.headers.Authorization = `Bearer ${token}`;
						}
						return apiClient(originalRequest);
					})
					.catch((err) => Promise.reject(err));
			}

			originalRequest._retry = true;
			isRefreshing = true;

			try {
				const newAccessToken = await refreshAccessToken();
				processQueue(null, newAccessToken);

				if (originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				}

				return apiClient(originalRequest);
			} catch (refreshError) {
				processQueue(error, null);
				clearTokens();

				// Redirect to login (skip in test environment)
				if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
					window.location.href =
						'/login?redirectTo=' + encodeURIComponent(window.location.pathname);
				}

				return Promise.reject(refreshError);
			} finally {
				isRefreshing = false;
			}
		}

		// Handle 403 Forbidden
		if (error.response?.status === 403) {
			if (isDevelopment) {
				console.error('[API] Forbidden - insufficient permissions');
			}
			return Promise.reject(error);
		}

		// Handle retryable errors (network, timeout, rate limit, server errors)
		const status = error.response?.status;
		const shouldRetry = isRetryable(error) && status !== 401 && status !== 403;

		if (!shouldRetry) {
			return Promise.reject(error);
		}

		// Initialize retry count
		if (!originalRequest._retryCount) {
			originalRequest._retryCount = 0;
		}

		// Determine retry reason for logging
		if (!originalRequest._retryReason) {
			if (isNetworkError(error)) {
				originalRequest._retryReason = 'Network Error';
			} else if (isTimeoutError(error)) {
				originalRequest._retryReason = 'Timeout';
			} else if (isRateLimitError(error)) {
				originalRequest._retryReason = 'Rate Limit';
			} else if (isServerError(error)) {
				originalRequest._retryReason = 'Server Error';
			} else {
				originalRequest._retryReason = 'Unknown';
			}
		}

		// Check if we should retry
		const maxRetries = isRateLimitError(error) ? 5 : appConfig.api.retryAttempts;

		if (originalRequest._retryCount < maxRetries) {
			originalRequest._retryCount++;

			// Calculate delay with exponential backoff
			let delay = appConfig.api.retryDelay * Math.pow(2, originalRequest._retryCount - 1);

			// For rate limit errors, respect Retry-After header if present
			if (isRateLimitError(error) && error.response?.headers['retry-after']) {
				const retryAfter = parseInt(error.response.headers['retry-after']);
				if (!isNaN(retryAfter)) {
					delay = retryAfter * 1000; // Convert to milliseconds
				}
			}

			// Cap maximum delay at 30 seconds
			delay = Math.min(delay, 30000);

			if (isDevelopment) {
				console.log(
					`[API Retry] ${originalRequest._retryReason} - Attempt ${originalRequest._retryCount}/${maxRetries} after ${delay}ms`,
					{
						url: originalRequest.url,
						method: originalRequest.method
					}
				);
			}

			await new Promise((resolve) => setTimeout(resolve, delay));

			return apiClient(originalRequest);
		}

		// Max retries exceeded
		if (isDevelopment) {
			console.error(
				`[API Retry] ${originalRequest._retryReason} - Max retries (${maxRetries}) exceeded for ${originalRequest.url}`
			);
		}

		return Promise.reject(error);
	}
);

/**
 * Helper function to make type-safe API calls
 */
export async function apiRequest<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
	try {
		const response = await apiClient.request<ApiResponse<T>>(config);
		return response.data;
	} catch (error) {
		if (axios.isAxiosError(error) && error.response?.data) {
			return error.response.data as ApiResponse<T>;
		}
		throw error;
	}
}

/**
 * Set auth tokens (used after login/register)
 */
export function setAuthTokens(tokens: AuthTokens): void {
	saveTokens(tokens);
}

/**
 * Clear auth tokens (used during logout)
 */
export function clearAuthTokens(): void {
	clearTokens();
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
	const tokens = getTokens();
	return tokens !== null && !!tokens.accessToken;
}

export default apiClient;
