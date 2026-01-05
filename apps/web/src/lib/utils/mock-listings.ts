import type { PostResponseDTO } from '$lib/types/post.types';
import { PostStatus } from '$lib/types/post.types';

/**
 * Get mock user listings with various statuses
 * Simulates backend pagination with infinite scroll
 */
export function getMockListings(page: number = 1, pageSize: number = 10): PostResponseDTO[] {
	const allListings: PostResponseDTO[] = [
		// Active listings

		// Scheduled listings
		{
			id: 10,
			title: 'Honda Civic 2021 - Excellent Condition',
			description:
				'One owner, regularly serviced Honda Civic. Fuel efficient, great for daily commute. Clean title.',
			price: 3200000,
			location: 'Kingston, Jamaica',
			brand: 'Honda',
			deliveryMethod: 'Pickup only',
			contactNumber: '+1876-555-0110',
			status: PostStatus.SCHEDULED,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 2,
				name: 'Vehicles'
			},
			images: [
				{
					id: 14,
					imageUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800',
					displayOrder: 0
				},
				{
					id: 15,
					imageUrl: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800',
					displayOrder: 1
				}
			],
			likeCount: 0,
			viewCount: 0,
			isLiked: false,
			scheduledPublishTime: new Date('2026-01-08T08:00:00'),
			createdAt: new Date('2026-01-01T15:30:00'),
			updatedAt: new Date('2026-01-01T15:30:00')
		},

		// More active listings for infinite scroll testing
		{
			id: 11,
			title: 'PlayStation 5 Digital Edition with Games',
			description:
				'PS5 Digital Edition with 5 games included. Excellent condition, comes with extra controller.',
			price: 699.99,
			location: 'Kingston, Jamaica',
			brand: 'Sony',
			deliveryMethod: 'Meet up',
			contactNumber: '+1876-555-0111',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 16,
					imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800',
					displayOrder: 0
				}
			],
			likeCount: 67,
			viewCount: 892,
			isLiked: false,
			publishedAt: new Date('2025-12-25T16:00:00'),
			expiresAt: new Date('2026-01-25T16:00:00'),
			createdAt: new Date('2025-12-25T15:45:00'),
			updatedAt: new Date('2025-12-25T15:45:00')
		},
		{
			id: 12,
			title: 'Office Desk - Solid Wood, Executive Style',
			description:
				'Beautiful executive desk in dark mahogany. Very sturdy, includes matching filing cabinet.',
			price: 45000,
			location: 'Kingston, Jamaica',
			deliveryMethod: 'Buyer arranges pickup',
			contactNumber: '+1876-555-0112',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 4,
				name: 'Furniture'
			},
			images: [
				{
					id: 17,
					imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
					displayOrder: 0
				}
			],
			likeCount: 31,
			viewCount: 445,
			isLiked: false,
			publishedAt: new Date('2025-12-22T11:30:00'),
			expiresAt: new Date('2026-01-22T11:30:00'),
			createdAt: new Date('2025-12-22T11:15:00'),
			updatedAt: new Date('2025-12-22T11:15:00')
		},
		{
			id: 13,
			title: 'Mountain Bike - Trek X-Caliber 9',
			description:
				'High-performance mountain bike. Great for trails and rough terrain. Well maintained with recent tune-up.',
			price: 85000,
			location: 'Ocho Rios, Jamaica',
			brand: 'Trek',
			deliveryMethod: 'Meet up',
			contactNumber: '+1876-555-0113',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 6,
				name: 'Sports'
			},
			images: [
				{
					id: 18,
					imageUrl: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800',
					displayOrder: 0
				}
			],
			likeCount: 22,
			viewCount: 312,
			isLiked: false,
			publishedAt: new Date('2025-12-18T09:15:00'),
			expiresAt: new Date('2026-01-18T09:15:00'),
			createdAt: new Date('2025-12-18T09:00:00'),
			updatedAt: new Date('2025-12-18T09:00:00')
		},
		{
			id: 14,
			title: 'Dining Table Set - 6 Seater Glass Top',
			description:
				'Modern glass-top dining table with 6 comfortable chairs. Perfect condition, smoke-free home.',
			price: 95000,
			location: 'Portmore, Jamaica',
			deliveryMethod: 'Delivery available for fee',
			contactNumber: '+1876-555-0114',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 4,
				name: 'Furniture'
			},
			images: [
				{
					id: 19,
					imageUrl: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?w=800',
					displayOrder: 0
				},
				{
					id: 20,
					imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?w=800',
					displayOrder: 1
				}
			],
			likeCount: 45,
			viewCount: 567,
			isLiked: false,
			publishedAt: new Date('2025-12-12T14:45:00'),
			expiresAt: new Date('2026-01-12T14:45:00'),
			createdAt: new Date('2025-12-12T14:30:00'),
			updatedAt: new Date('2025-12-12T14:30:00')
		},
		{
			id: 15,
			title: 'iPhone 13 128GB Blue - Unlocked',
			description:
				'iPhone 13 in excellent condition. Battery health 95%, no scratches, includes charger and case.',
			price: 899.99,
			location: 'Kingston, Jamaica',
			brand: 'Apple',
			deliveryMethod: 'Meet up or Delivery',
			contactNumber: '+1876-555-0115',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 21,
					imageUrl: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800',
					displayOrder: 0
				}
			],
			likeCount: 38,
			viewCount: 521,
			isLiked: false,
			publishedAt: new Date('2025-12-10T10:20:00'),
			expiresAt: new Date('2026-01-10T10:20:00'),
			createdAt: new Date('2025-12-10T10:00:00'),
			updatedAt: new Date('2025-12-10T10:00:00')
		},
		{
			id: 1,
			title: 'iPhone 14 Pro Max 256GB Deep Purple',
			description:
				'Brand new iPhone 14 Pro Max in Deep Purple. Still sealed in box with all original accessories. Amazing camera and battery life.',
			price: 1299.99,
			location: 'Kingston, Jamaica',
			brand: 'Apple',
			deliveryMethod: 'Meet up or Delivery',
			contactNumber: '+1876-555-0101',
			emailAddress: 'seller1@example.com',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 1,
					imageUrl: 'https://images.unsplash.com/photo-1678652197950-eb2562306454?w=800',
					displayOrder: 0
				},
				{
					id: 2,
					imageUrl: 'https://images.unsplash.com/photo-1678652197950-eb2562306454?w=800',
					displayOrder: 1
				}
			],
			likeCount: 24,
			viewCount: 342,
			isLiked: false,
			publishedAt: new Date('2025-12-28T10:30:00'),
			expiresAt: new Date('2026-01-28T10:30:00'),
			createdAt: new Date('2025-12-28T10:00:00'),
			updatedAt: new Date('2025-12-28T10:00:00')
		},
		{
			id: 2,
			title: 'Toyota Corolla 2019 - Low Mileage',
			description:
				'Well maintained Toyota Corolla, single owner, full service history. Perfect condition inside and out.',
			price: 2800000,
			location: 'Montego Bay, Jamaica',
			brand: 'Toyota',
			deliveryMethod: 'Pickup only',
			contactNumber: '+1876-555-0102',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 2,
				name: 'Vehicles'
			},
			images: [
				{
					id: 3,
					imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
					displayOrder: 0
				}
			],
			likeCount: 56,
			viewCount: 789,
			isLiked: false,
			publishedAt: new Date('2025-12-20T14:15:00'),
			expiresAt: new Date('2026-01-20T14:15:00'),
			createdAt: new Date('2025-12-20T14:00:00'),
			updatedAt: new Date('2025-12-20T14:00:00')
		},
		{
			id: 3,
			title: 'Modern 3BR Apartment - Waterfront View',
			description:
				'Stunning 3-bedroom apartment with ocean view. Fully furnished, modern appliances, 24/7 security.',
			price: 350000,
			location: 'Ocho Rios, Jamaica',
			deliveryMethod: 'Viewing by appointment',
			contactNumber: '+1876-555-0103',
			emailAddress: 'realty@example.com',
			status: PostStatus.ACTIVE,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 3,
				name: 'Real Estate'
			},
			images: [
				{
					id: 4,
					imageUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
					displayOrder: 0
				},
				{
					id: 5,
					imageUrl: 'https://images.unsplash.com/photo-1502672260066-6bc35f0a1881?w=800',
					displayOrder: 1
				},
				{
					id: 6,
					imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
					displayOrder: 2
				}
			],
			likeCount: 103,
			viewCount: 1456,
			isLiked: false,
			publishedAt: new Date('2025-12-15T09:00:00'),
			expiresAt: new Date('2026-01-15T09:00:00'),
			createdAt: new Date('2025-12-15T08:30:00'),
			updatedAt: new Date('2025-12-15T08:30:00')
		},

		// Pending Payment listings
		{
			id: 4,
			title: 'MacBook Pro M2 14" 512GB Space Gray',
			description:
				'Latest MacBook Pro with M2 chip. Perfect for developers and creators. Includes USB-C adapter and case.',
			price: 2499.99,
			location: 'Spanish Town, Jamaica',
			brand: 'Apple',
			deliveryMethod: 'Meet up or Delivery',
			contactNumber: '+1876-555-0104',
			status: PostStatus.PENDING_PAYMENT,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 7,
					imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
					displayOrder: 0
				}
			],
			likeCount: 0,
			viewCount: 0,
			isLiked: false,
			scheduledPublishTime: new Date('2026-01-10T12:00:00'),
			createdAt: new Date('2026-01-05T10:30:00'),
			updatedAt: new Date('2026-01-05T10:30:00')
		},
		{
			id: 5,
			title: 'Gaming PC Setup - RTX 4080, i9-13900K',
			description:
				'High-end gaming PC with RGB lighting. Includes 32GB RAM, 2TB NVMe SSD, 850W PSU. Monitor and keyboard included.',
			price: 3999.99,
			location: 'Portmore, Jamaica',
			brand: 'Custom Built',
			deliveryMethod: 'Pickup only',
			contactNumber: '+1876-555-0105',
			emailAddress: 'gamer@example.com',
			status: PostStatus.PENDING_PAYMENT,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 8,
					imageUrl: 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=800',
					displayOrder: 0
				},
				{
					id: 9,
					imageUrl: 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=800',
					displayOrder: 1
				}
			],
			likeCount: 0,
			viewCount: 0,
			isLiked: false,
			createdAt: new Date('2026-01-04T16:20:00'),
			updatedAt: new Date('2026-01-04T16:20:00')
		},

		// Expired listings
		{
			id: 6,
			title: 'Samsung 65" 4K Smart TV - QLED',
			description:
				'Excellent condition Samsung QLED TV. Stunning picture quality, smart features, wall mount included.',
			price: 899.99,
			location: 'Kingston, Jamaica',
			brand: 'Samsung',
			deliveryMethod: 'Buyer arranges pickup',
			contactNumber: '+1876-555-0106',
			status: PostStatus.EXPIRED,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 10,
					imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800',
					displayOrder: 0
				}
			],
			likeCount: 42,
			viewCount: 623,
			isLiked: false,
			publishedAt: new Date('2025-11-15T11:00:00'),
			expiresAt: new Date('2025-12-15T11:00:00'),
			createdAt: new Date('2025-11-15T10:45:00'),
			updatedAt: new Date('2025-11-15T10:45:00')
		},
		{
			id: 7,
			title: 'Sectional Sofa - Gray Fabric, Like New',
			description:
				"Modern sectional sofa, only 6 months old. Moving and can't take it with us. Very comfortable, pet-free home.",
			price: 75000,
			location: 'Mandeville, Jamaica',
			deliveryMethod: 'Buyer arranges pickup',
			contactNumber: '+1876-555-0107',
			status: PostStatus.EXPIRED,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 4,
				name: 'Furniture'
			},
			images: [
				{
					id: 11,
					imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800',
					displayOrder: 0
				},
				{
					id: 12,
					imageUrl: 'https://images.unsplash.com/photo-1540574163026-643ea20ade25?w=800',
					displayOrder: 1
				}
			],
			likeCount: 18,
			viewCount: 234,
			isLiked: false,
			publishedAt: new Date('2025-11-20T13:30:00'),
			expiresAt: new Date('2025-12-20T13:30:00'),
			createdAt: new Date('2025-11-20T13:15:00'),
			updatedAt: new Date('2025-11-20T13:15:00')
		},

		// Draft listings
		{
			id: 8,
			title: 'Canon EOS R6 Mark II Camera Body',
			description:
				'Professional mirrorless camera body. Excellent for photography and videography. Barely used, includes original box.',
			price: 2199.99,
			location: 'Kingston, Jamaica',
			brand: 'Canon',
			deliveryMethod: 'Meet up',
			contactNumber: '+1876-555-0108',
			status: PostStatus.DRAFT,
			user: {
				id: 1,
				fullName: 'Current User',
				profilePictureUrl: 'https://i.pravatar.cc/150?img=33'
			},
			category: {
				id: 1,
				name: 'Electronics'
			},
			images: [
				{
					id: 13,
					imageUrl: 'https://images.unsplash.com/photo-1606980703706-c6fc1f4e4ed6?w=800',
					displayOrder: 0
				}
			],
			likeCount: 0,
			viewCount: 0,
			isLiked: false,
			createdAt: new Date('2026-01-03T09:45:00'),
			updatedAt: new Date('2026-01-03T09:45:00')
		}
	];

	// Simulate pagination
	const startIndex = (page - 1) * pageSize;
	const endIndex = startIndex + pageSize;
	return allListings.slice(startIndex, endIndex);
}

/**
 * Get total count of mock listings (for infinite scroll)
 */
export function getMockListingsCount(): number {
	return 15;
}

/**
 * Filter listings by status
 */
export function filterListingsByStatus(
	listings: PostResponseDTO[],
	status: PostStatus | 'all'
): PostResponseDTO[] {
	if (status === 'all') {
		return listings;
	}
	return listings.filter((listing) => listing.status === status);
}

/**
 * Get count of listings by status
 */
export function getListingCountByStatus(status: PostStatus | 'all'): number {
	const allListings = getMockListings(1, 100); // Get all listings
	return filterListingsByStatus(allListings, status).length;
}
