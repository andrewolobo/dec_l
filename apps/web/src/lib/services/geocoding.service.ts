/**
 * Geocoding Service
 * Provides location search and reverse geocoding using Nominatim OpenStreetMap API
 */

export interface NominatimAddress {
	road?: string;
	suburb?: string;
	neighbourhood?: string;
	city?: string;
	town?: string;
	village?: string;
	county?: string;
	state?: string;
	country?: string;
	country_code?: string;
	postcode?: string;
}

export interface NominatimResult {
	place_id: number;
	display_name: string;
	lat: string;
	lon: string;
	address: NominatimAddress;
	boundingbox: [string, string, string, string];
	type?: string;
	importance?: number;
}

interface CacheEntry {
	data: NominatimResult[];
	timestamp: number;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CacheEntry>();

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second as per Nominatim policy

/**
 * Ensures requests are rate-limited to comply with Nominatim usage policy
 */
async function throttleRequest(): Promise<void> {
	const now = Date.now();
	const timeSinceLastRequest = now - lastRequestTime;
	
	if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
		const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
		await new Promise(resolve => setTimeout(resolve, delay));
	}
	
	lastRequestTime = Date.now();
}

/**
 * Search for locations using Nominatim API
 * 
 * @param query - Search query string
 * @param options - Search options
 * @returns Array of location results
 */
export async function searchLocations(
	query: string,
	options: {
		countryCode?: string;
		limit?: number;
		language?: string;
	} = {}
): Promise<NominatimResult[]> {
	const { countryCode = 'ug', limit = 8, language = 'en' } = options;
	
	// Check cache first
	const cacheKey = `${query}-${countryCode}-${limit}`;
	const cached = searchCache.get(cacheKey);
	
	if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
		return cached.data;
	}
	
	// Build URL
	const params = new URLSearchParams({
		q: query,
		format: 'jsonv2',
		addressdetails: '1',
		limit: limit.toString(),
		'accept-language': language
	});
	
	if (countryCode) {
		params.append('countrycodes', countryCode);
	}
	
	const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;
	
	try {
		// Throttle request to comply with rate limits
		await throttleRequest();
		
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'TundaHub/1.0 (Marketplace Application)'
			}
		});
		
		if (!response.ok) {
			throw new Error(`Nominatim API error: ${response.status}`);
		}
		
		const data: NominatimResult[] = await response.json();
		
		// Cache the results
		searchCache.set(cacheKey, {
			data,
			timestamp: Date.now()
		});
		
		// Clean old cache entries
		cleanCache();
		
		return data;
	} catch (error) {
		console.error('Error searching locations:', error);
		throw error;
	}
}

/**
 * Reverse geocode coordinates to get address
 * 
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns Location result or null
 */
export async function reverseGeocode(
	lat: number,
	lon: number
): Promise<NominatimResult | null> {
	const params = new URLSearchParams({
		lat: lat.toString(),
		lon: lon.toString(),
		format: 'jsonv2',
		addressdetails: '1'
	});
	
	const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;
	
	try {
		await throttleRequest();
		
		const response = await fetch(url, {
			headers: {
				'User-Agent': 'TundaHub/1.0 (Marketplace Application)'
			}
		});
		
		if (!response.ok) {
			throw new Error(`Nominatim API error: ${response.status}`);
		}
		
		const data: NominatimResult = await response.json();
		return data;
	} catch (error) {
		console.error('Error reverse geocoding:', error);
		return null;
	}
}

/**
 * Format location result for display
 * Returns primary text (main location) and secondary text (additional details)
 */
export function formatLocationDisplay(result: NominatimResult): {
	primary: string;
	secondary: string;
} {
	const addr = result.address;
	
	// Primary: Most specific location
	const primary = addr.road || 
		addr.neighbourhood || 
		addr.suburb || 
		addr.village ||
		addr.town ||
		addr.city || 
		result.display_name.split(',')[0];
	
	// Secondary: Context (area, city, region)
	const secondaryParts: string[] = [];
	
	if (addr.suburb && addr.suburb !== primary) secondaryParts.push(addr.suburb);
	if (addr.city && addr.city !== primary) secondaryParts.push(addr.city);
	if (addr.town && addr.town !== primary) secondaryParts.push(addr.town);
	if (addr.county && !secondaryParts.length) secondaryParts.push(addr.county);
	
	const secondary = secondaryParts.length > 0 
		? secondaryParts.slice(0, 2).join(', ')
		: result.display_name.split(',').slice(1, 3).join(',').trim();
	
	return { primary, secondary };
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
	const now = Date.now();
	const keysToDelete: string[] = [];
	
	searchCache.forEach((entry, key) => {
		if (now - entry.timestamp > CACHE_DURATION) {
			keysToDelete.push(key);
		}
	});
	
	keysToDelete.forEach(key => searchCache.delete(key));
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: string | number, lon: string | number): string {
	const latNum = typeof lat === 'string' ? parseFloat(lat) : lat;
	const lonNum = typeof lon === 'string' ? parseFloat(lon) : lon;
	
	return `${latNum.toFixed(6)}, ${lonNum.toFixed(6)}`;
}

/**
 * Parse coordinates string "lat,lon" into object
 */
export function parseCoordinates(coords: string): { lat: number; lon: number } | null {
	if (!coords) return null;
	
	const parts = coords.split(',').map(s => s.trim());
	if (parts.length !== 2) return null;
	
	const lat = parseFloat(parts[0]);
	const lon = parseFloat(parts[1]);
	
	if (isNaN(lat) || isNaN(lon)) return null;
	
	return { lat, lon };
}
