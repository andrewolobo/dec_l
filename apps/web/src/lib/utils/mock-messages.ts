/**
 * Mock Message Data
 * Generates sample conversations and messages for development and testing
 * Based on API schema types
 */

import type { ConversationPreviewDTO, MessageResponseDTO } from '$lib/types/message.types';

/**
 * Mock user profile pictures from the HTML mockup
 */
const mockProfilePictures = [
	'https://lh3.googleusercontent.com/aida-public/AB6AXuCPl4zdqlgeMAVYWvjNc3msEFB_Htgp_rQJF7vmpA0WZwA6pXJ4A9SzymNhyOIA8KDz0L0GYL-LWYTOGRtKu3DyYVxGUjtxKckCgR8OnFJCU2jdCWW-vErfbwpZB0JaUc_YBsOJSud3CAm_CsUH4um1JazEPfL5R8PbOwafAeCg9eJbJGdVjNimHN5yG2Wej-x_CNaMcNyZGDjtCMmR3cFzrkOIf47q2uzKxjyomSDtM9DGHi2vj7ICQq_ujdN6BAsqdbBrD_wfyDKJ',
	'https://lh3.googleusercontent.com/aida-public/AB6AXuAZqQQiMYSk2ySAkTiLAh77FNBnQqBsNsAsQU87PqURocMT5nOBc8WHq7eWRHyaWZI0_1X1_miV27VzcUJrddslBg9hGcnOeihAYsNsypaDHnprmzmUTwCjPenlI3lueWJzeaKxi07Tg7tkuZgPdJBQtReM69V-ZKgasAUyookdBQImVwenoav6pj2NXD2hHRnm2qiFxd87koRrSOiCveur2uDuNlwS2P4bgAgphfBsWsJ2Uvv97xBwc8UqZ0UJ9-PGjtvImmTAl7xZ',
	'https://lh3.googleusercontent.com/aida-public/AB6AXuA3tN9AUER5NKuiNywBJqcbwJK9N90DxdO5FwWrxgWc74T66bSfvYnQewmBDGfO_mhqzN37JQ9exONxOqCSO9VHH6P9q5NFZrhfhW0thb55jFQdEIZfluBCg0FMQScGv5QRo1QCWFF9giNTgnQObjvQZ4BiwKKdzM5NjXp8A9wxObRzZ1UW0d9PeTt-TsIDQoR762kLUSHYM1RDKyXDc78USCwkmgE5eU0qxWYBBAm0vRZjW2UWA1Ct5AuxbEuOv8PYjkbBy2P2ODe6',
	'https://lh3.googleusercontent.com/aida-public/AB6AXuB35bToPfZyOkBRZnJi59N8zzy1PJYMZyFPwBwxlVNjQqMxYMvgFAPwqNe5z0gHc9FyeWwmCO9d1gc3v3esJILQ4mofiJb25-etCqP8MVbMmqIyFivRXXF0gHwIglCqXibToDedzWDrPgS4i-scBqDFdYYSuw9O5FWhXjh5cJc2eyRTrBypeCSqJRPq6BX6AN6XuDsGdvG1YTk1c4BaFhd6zT9d9AS8myXeX8wd6_2007BLgbsSblQ4uF8RkLM8bbsETXy3a6bnAanE',
	'https://lh3.googleusercontent.com/aida-public/AB6AXuBmKScMQ1tvDsT1vv9GvZnc3k9Dujup74s-4RdaylDCau-QejeRKmVa512TY_o_LsH68amqqtZWe0kZOlr5sa4lQbuYEOw-tnsjBjX86bgqQLWjJKFhK2rRhQSZHy3VIC5qIueO-pGPPan3GbkNlw8FyW15tZITLmrcncwsWoEkgTNObBIuATumxdoEEp61PIZt539dgSmayFsVyHEENYzR8P1kuaUe_HWrLDcbc-mo2U_INNBaA4JHO7Ikka_EF5wtxHqInMbEnYZO',
	'https://lh3.googleusercontent.com/aida-public/AB6AXuCFpu5K6WZNxD3d6UhVM0OjWE-cXxpjcHpCCUaU-Dclp3DneL2CWR0mwTq8Jgezcaj_zLHjcup2vKCZyNquSaa2xa9sFgb86xUoarmpWYIKaBzpEbm_Gd7A61W-PE30uCfJykDDHqkKUop0_lHHlKCo9vpOhVLI-clpdPQqhEI_2SCuP6MJU74d0EjMS5wkvhfMqpP0uFoJCGOzWtd5tLl4mYq-36_Oe6bCWGloJVTqT4Sarm_6qZ9EZPFACfGom0kEi6h6AlwYhq8V'
];

/**
 * Generate mock conversation previews
 */
export function getMockConversations(): ConversationPreviewDTO[] {
	const now = new Date();

	return [
		{
			userId: 1,
			fullName: 'Sarah L.',
			profilePictureUrl: mockProfilePictures[0],
			lastMessage: 'Great, I can meet you tomorrow.',
			lastMessageAt: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
			lastMessageSenderId: 1,
			unreadCount: 1,
			isOnline: true
		},
		{
			userId: 2,
			fullName: 'Mark J.',
			profilePictureUrl: mockProfilePictures[1],
			lastMessage: 'Is the vintage armchair still available?',
			lastMessageAt: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
			lastMessageSenderId: 2,
			unreadCount: 0,
			isOnline: false
		},
		{
			userId: 3,
			fullName: 'Emily R.',
			profilePictureUrl: mockProfilePictures[2],
			lastMessage: 'Perfect! See you then.',
			lastMessageAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Yesterday
			lastMessageSenderId: 3,
			unreadCount: 0,
			isOnline: true
		},
		{
			userId: 4,
			fullName: 'David P.',
			profilePictureUrl: mockProfilePictures[3],
			lastMessage: "You're welcome!",
			lastMessageAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
			lastMessageSenderId: 4,
			unreadCount: 0,
			isOnline: false
		},
		{
			userId: 5,
			fullName: 'Chloe B.',
			profilePictureUrl: mockProfilePictures[4],
			lastMessage: 'Can you do $50 for the mirror?',
			lastMessageAt: new Date('2026-03-15T14:30:00'), // March 15
			lastMessageSenderId: 5,
			unreadCount: 0,
			isOnline: false
		},
		{
			userId: 6,
			fullName: 'James K.',
			profilePictureUrl: mockProfilePictures[5],
			lastMessage: 'Item received, thank you!',
			lastMessageAt: new Date('2026-03-12T10:00:00'), // March 12
			lastMessageSenderId: 6,
			unreadCount: 0,
			isOnline: false
		}
	];
}

/**
 * Get mock user data by ID
 */
export function getMockUser(userId: number) {
	const conversations = getMockConversations();
	const conv = conversations.find((c) => c.userId === userId);
	if (conv) {
		return {
			userId: conv.userId,
			fullName: conv.fullName,
			profilePictureUrl: conv.profilePictureUrl,
			isOnline: conv.isOnline
		};
	}
	return null;
}

/**
 * Generate mock messages for a conversation
 */
export function getMockMessages(conversationUserId: number): MessageResponseDTO[] {
	const now = new Date();
	const currentUserId = 100; // Mock current user ID

	// Sample messages for different conversations
	const messagesByUser: Record<number, MessageResponseDTO[]> = {
		1: [
			{
				messageId: 1,
				senderId: 1,
				recipientId: currentUserId,
				messageContent: 'Hi! Is this item still available?',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000)
			},
			{
				messageId: 2,
				senderId: currentUserId,
				recipientId: 1,
				messageContent: 'Yes, it is! Would you like to see it?',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 90 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 90 * 60 * 1000)
			},
			{
				messageId: 3,
				senderId: 1,
				recipientId: currentUserId,
				messageContent: 'Great, I can meet you tomorrow.',
				messageType: 'text',
				isRead: false,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 10 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 10 * 60 * 1000)
			}
		],
		2: [
			{
				messageId: 4,
				senderId: 2,
				recipientId: currentUserId,
				messageContent: 'Is the vintage armchair still available?',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 60 * 60 * 1000)
			},
			{
				messageId: 15,
				senderId: currentUserId,
				recipientId: 2,
				messageContent: "Yes! It's still available. Would you like to know more about it?",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 55 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 55 * 60 * 1000)
			},
			{
				messageId: 16,
				senderId: 2,
				recipientId: currentUserId,
				messageContent: "Great! What's the condition like? Any wear and tear?",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 50 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 50 * 60 * 1000)
			}
		],
		3: [
			{
				messageId: 5,
				senderId: 3,
				recipientId: currentUserId,
				messageContent: 'Hi! Can I come see the table this weekend?',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 25 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 25 * 60 * 60 * 1000)
			},
			{
				messageId: 6,
				senderId: currentUserId,
				recipientId: 3,
				messageContent: 'Sure! Saturday at 2pm works for me.',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000 - 30 * 60 * 1000)
			},
			{
				messageId: 7,
				senderId: 3,
				recipientId: currentUserId,
				messageContent: 'Perfect! See you then.',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 24 * 60 * 60 * 1000)
			}
		],
		4: [
			{
				messageId: 8,
				senderId: currentUserId,
				recipientId: 4,
				messageContent: 'Here are some more photos of the lamp.',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 60 * 60 * 1000)
			},
			{
				messageId: 9,
				senderId: 4,
				recipientId: currentUserId,
				messageContent: 'Thank you! It looks great.',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000)
			},
			{
				messageId: 10,
				senderId: 4,
				recipientId: currentUserId,
				messageContent: "You're welcome!",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
				updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
			}
		],
		5: [
			{
				messageId: 11,
				senderId: 5,
				recipientId: currentUserId,
				messageContent: "Hi! I'm interested in the mirror.",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-15T14:00:00'),
				updatedAt: new Date('2026-03-15T14:00:00')
			},
			{
				messageId: 17,
				senderId: currentUserId,
				recipientId: 5,
				messageContent: "Great! It's in excellent condition.",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-15T14:15:00'),
				updatedAt: new Date('2026-03-15T14:15:00')
			},
			{
				messageId: 18,
				senderId: 5,
				recipientId: currentUserId,
				messageContent: 'Can you do $50 for the mirror?',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-15T14:30:00'),
				updatedAt: new Date('2026-03-15T14:30:00')
			}
		],
		6: [
			{
				messageId: 12,
				senderId: 6,
				recipientId: currentUserId,
				messageContent: 'Thanks for the quick delivery!',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-12T09:00:00'),
				updatedAt: new Date('2026-03-12T09:00:00')
			},
			{
				messageId: 13,
				senderId: currentUserId,
				recipientId: 6,
				messageContent: "You're welcome! Enjoy!",
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-12T09:30:00'),
				updatedAt: new Date('2026-03-12T09:30:00')
			},
			{
				messageId: 14,
				senderId: 6,
				recipientId: currentUserId,
				messageContent: 'Item received, thank you!',
				messageType: 'text',
				isRead: true,
				isDeleted: false,
				isEdited: false,
				createdAt: new Date('2026-03-12T10:00:00'),
				updatedAt: new Date('2026-03-12T10:00:00')
			}
		]
	};

	return messagesByUser[conversationUserId] || [];
}

/**
 * Calculate unread count for testing
 */
export function getUnreadCount(conversations: ConversationPreviewDTO[]): number {
	return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
}
