import { apiClient } from './api.client';
import type { ApiResponse } from '$types/api.types';
import { config } from '$lib/config';

/**
 * Upload Service
 * Handles file uploads (images, documents)
 */

// ============================================================================
// Types
// ============================================================================

export interface UploadResponse {
	url: string; // Blob path for storage (e.g., "123-uuid.jpg")
	previewUrl: string; // Full URL with SAS token for display
	filename: string;
	size: number;
	mimeType: string;
}

export interface UploadProgress {
	loaded: number;
	total: number;
	percentage: number;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

export interface UploadOptions {
	onProgress?: UploadProgressCallback;
	maxSize?: number; // in bytes
	allowedTypes?: string[]; // MIME types
	compress?: boolean;
	maxWidth?: number;
	maxHeight?: number;
	quality?: number; // 0-1 for image compression
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_OPTIONS: Required<Omit<UploadOptions, 'onProgress'>> = {
	maxSize: 5 * 1024 * 1024, // 5MB
	allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
	compress: true,
	maxWidth: 1920,
	maxHeight: 1080,
	quality: 0.85
};

// ============================================================================
// Image Upload Functions
// ============================================================================

/**
 * Upload a single image
 */
export async function uploadImage(
	file: File,
	options: UploadOptions = {}
): Promise<ApiResponse<UploadResponse>> {
	// Merge with default options
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Validate file
	validateFile(file, opts);

	// Compress image if needed
	let processedFile = file;
	if (opts.compress && file.type.startsWith('image/')) {
		processedFile = await compressImage(file, {
			maxWidth: opts.maxWidth,
			maxHeight: opts.maxHeight,
			quality: opts.quality
		});
	}

	// Create FormData
	const formData = new FormData();
	formData.append('image', processedFile);

	// Upload with progress tracking
	const response = await apiClient.post<ApiResponse<UploadResponse>>('/upload/image', formData, {
		headers: {
			'Content-Type': 'multipart/form-data'
		},
		onUploadProgress: (progressEvent) => {
			if (opts.onProgress && progressEvent.total) {
				opts.onProgress({
					loaded: progressEvent.loaded,
					total: progressEvent.total,
					percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total)
				});
			}
		}
	});

	return response.data;
}

/**
 * Upload multiple images
 */
export async function uploadImages(
	files: File[],
	options: UploadOptions = {}
): Promise<ApiResponse<UploadResponse[]>> {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Validate all files
	files.forEach((file) => validateFile(file, opts));

	// Process all files
	const processedFiles = await Promise.all(
		files.map(async (file) => {
			if (opts.compress && file.type.startsWith('image/')) {
				return compressImage(file, {
					maxWidth: opts.maxWidth,
					maxHeight: opts.maxHeight,
					quality: opts.quality
				});
			}
			return file;
		})
	);

	// Create FormData with multiple files
	const formData = new FormData();
	processedFiles.forEach((file, index) => {
		formData.append('images', file);
	});

	// Calculate total size for progress
	const totalSize = processedFiles.reduce((sum, file) => sum + file.size, 0);
	let loadedSize = 0;

	// Upload with progress tracking
	const response = await apiClient.post<ApiResponse<UploadResponse[]>>('/upload/images', formData, {
		headers: {
			'Content-Type': 'multipart/form-data'
		},
		onUploadProgress: (progressEvent) => {
			if (opts.onProgress && progressEvent.total) {
				loadedSize = progressEvent.loaded;
				opts.onProgress({
					loaded: loadedSize,
					total: totalSize,
					percentage: Math.round((loadedSize * 100) / totalSize)
				});
			}
		}
	});

	return response.data;
}

/**
 * Upload image from base64 string
 */
export async function uploadBase64Image(
	base64: string,
	filename: string = 'image.png',
	options: UploadOptions = {}
): Promise<ApiResponse<UploadResponse>> {
	// Convert base64 to Blob
	const blob = base64ToBlob(base64);
	const file = new File([blob], filename, { type: blob.type });

	return uploadImage(file, options);
}

/**
 * Upload image from URL (downloads and uploads)
 */
export async function uploadImageFromUrl(
	url: string,
	options: UploadOptions = {}
): Promise<ApiResponse<UploadResponse>> {
	// Fetch image
	const response = await fetch(url);
	const blob = await response.blob();

	// Extract filename from URL
	const filename = url.split('/').pop() || 'image.jpg';
	const file = new File([blob], filename, { type: blob.type });

	return uploadImage(file, options);
}

// ============================================================================
// Profile Picture Upload
// ============================================================================

/**
 * Upload profile picture (optimized for avatars)
 */
export async function uploadProfilePicture(
	file: File,
	options: UploadOptions = {}
): Promise<ApiResponse<UploadResponse>> {
	return uploadImage(file, {
		...options,
		maxWidth: 512,
		maxHeight: 512,
		quality: 0.9,
		compress: true
	});
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate file before upload
 */
function validateFile(file: File, options: Required<Omit<UploadOptions, 'onProgress'>>): void {
	// Check file size
	if (file.size > options.maxSize) {
		throw new Error(
			`File size exceeds maximum allowed size of ${formatUploadFileSize(options.maxSize)}`
		);
	}

	// Check file type
	if (!options.allowedTypes.includes(file.type)) {
		throw new Error(
			`File type ${file.type} is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
		);
	}
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File): boolean {
	return file.type.startsWith('image/');
}

/**
 * Check if file size is within limit
 */
export function isFileSizeValid(file: File, maxSize: number = DEFAULT_OPTIONS.maxSize): boolean {
	return file.size <= maxSize;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
	return filename.split('.').pop()?.toLowerCase() || '';
}

// ============================================================================
// Image Compression
// ============================================================================

interface CompressionOptions {
	maxWidth: number;
	maxHeight: number;
	quality: number;
}

/**
 * Compress image while maintaining aspect ratio
 */
async function compressImage(file: File, options: CompressionOptions): Promise<File> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			const img = new Image();

			img.onload = () => {
				// Calculate new dimensions
				let { width, height } = img;

				if (width > options.maxWidth || height > options.maxHeight) {
					const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
					width = Math.round(width * ratio);
					height = Math.round(height * ratio);
				}

				// Create canvas and compress
				const canvas = document.createElement('canvas');
				canvas.width = width;
				canvas.height = height;

				const ctx = canvas.getContext('2d');
				if (!ctx) {
					reject(new Error('Could not get canvas context'));
					return;
				}

				ctx.drawImage(img, 0, 0, width, height);

				canvas.toBlob(
					(blob) => {
						if (!blob) {
							reject(new Error('Could not compress image'));
							return;
						}

						const compressedFile = new File([blob], file.name, {
							type: file.type,
							lastModified: Date.now()
						});

						resolve(compressedFile);
					},
					file.type,
					options.quality
				);
			};

			img.onerror = () => reject(new Error('Could not load image'));
			img.src = e.target?.result as string;
		};

		reader.onerror = () => reject(new Error('Could not read file'));
		reader.readAsDataURL(file);
	});
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string): Blob {
	// Extract base64 data and mime type
	const parts = base64.split(';base64,');
	const contentType = parts[0].split(':')[1];
	const raw = window.atob(parts[1]);

	// Convert to byte array
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) {
		bytes[i] = raw.charCodeAt(i);
	}

	return new Blob([bytes], { type: contentType });
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format file size to human readable string
 */
export function formatUploadFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Read file as data URL
 */
export function readFileAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

/**
 * Create thumbnail from image file
 */
export async function createThumbnail(
	file: File,
	maxWidth: number = 200,
	maxHeight: number = 200
): Promise<string> {
	const compressed = await compressImage(file, {
		maxWidth,
		maxHeight,
		quality: 0.8
	});

	return readFileAsDataURL(compressed);
}

/**
 * Validate image dimensions
 */
export async function validateImageDimensions(
	file: File,
	minWidth?: number,
	minHeight?: number,
	maxWidth?: number,
	maxHeight?: number
): Promise<{ valid: boolean; width: number; height: number }> {
	return new Promise((resolve) => {
		const reader = new FileReader();

		reader.onload = (e) => {
			const img = new Image();

			img.onload = () => {
				const { width, height } = img;
				let valid = true;

				if (minWidth && width < minWidth) valid = false;
				if (minHeight && height < minHeight) valid = false;
				if (maxWidth && width > maxWidth) valid = false;
				if (maxHeight && height > maxHeight) valid = false;

				resolve({ valid, width, height });
			};

			img.src = e.target?.result as string;
		};

		reader.readAsDataURL(file);
	});
}
