/**
 * Message and Conversation Type Definitions
 * Based on API Schema and Backend Implementation
 */

// ============================================================================
// Message Types
// ============================================================================

/**
 * Message type enum
 */
export type MessageType = 'text' | 'image' | 'system';

/**
 * Full message response from API
 */
export interface MessageResponseDTO {
	messageId: number;
	senderId: number;
	recipientId: number;
	postId?: number;
	messageContent: string;
	messageType: MessageType;
	attachmentUrl?: string;
	isRead: boolean;
	readAt?: Date | string;
	isDeleted: boolean;
	deletedBy?: number;
	isEdited: boolean;
	editedAt?: Date | string;
	parentMessageId?: number;
	createdAt: Date | string;
	updatedAt: Date | string;
	// Populated relations
	sender?: MessageUserDTO;
	recipient?: MessageUserDTO;
	post?: MessagePostDTO;
}

/**
 * User information in message context
 */
export interface MessageUserDTO {
	userId: number;
	fullName: string;
	profilePictureUrl?: string;
	isOnline?: boolean;
}

/**
 * Post information in message context
 */
export interface MessagePostDTO {
	postId: number;
	title: string;
	price: number;
	imageUrl?: string;
	status: string;
}

/**
 * Create message DTO
 */
export interface CreateMessageDTO {
	recipientId: number;
	messageContent: string;
	messageType?: MessageType;
	postId?: number;
	attachmentUrl?: string;
	parentMessageId?: number;
}

/**
 * Update message DTO
 */
export interface UpdateMessageDTO {
	messageContent?: string;
	isRead?: boolean;
	isDeleted?: boolean;
}

// ============================================================================
// Conversation Types
// ============================================================================

/**
 * Conversation preview for list view
 */
export interface ConversationPreviewDTO {
	userId: number;
	fullName: string;
	profilePictureUrl?: string;
	lastMessage: string;
	lastMessageAt: Date | string;
	lastMessageSenderId: number;
	unreadCount: number;
	isOnline?: boolean;
	postId?: number;
	postTitle?: string;
}

/**
 * Full conversation with messages
 */
export interface ConversationResponseDTO {
	conversationId: number;
	userId: number;
	user: MessageUserDTO;
	messages: MessageResponseDTO[];
	unreadCount: number;
	postId?: number;
	post?: MessagePostDTO;
}

/**
 * Conversation by ID DTO
 */
export interface ConversationByIdDTO {
	conversationId: number;
	user1Id: number;
	user2Id: number;
	lastMessageAt: Date | string;
	postId?: number;
	createdAt: Date | string;
	updatedAt: Date | string;
	user1: MessageUserDTO;
	user2: MessageUserDTO;
	messages: MessageResponseDTO[];
	post?: MessagePostDTO;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket message type enum
 */
export type WebSocketMessageType =
	| 'message'
	| 'message_read'
	| 'message_edited'
	| 'message_deleted'
	| 'typing'
	| 'ping'
	| 'pong';

/**
 * WebSocket message payload
 */
export interface WebSocketMessage {
	type: WebSocketMessageType;
	message?: MessageResponseDTO;
	messageId?: number;
	conversationId?: number;
	userId?: number;
	isTyping?: boolean;
}

// ============================================================================
// UI-Specific Types
// ============================================================================

/**
 * Message group by date
 */
export interface MessageGroup {
	date: string;
	messages: MessageResponseDTO[];
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
	conversationId: number;
	userId: number;
	timestamp: Date;
}

/**
 * Message statistics
 */
export interface MessageStats {
	totalMessages: number;
	unreadMessages: number;
	readMessages: number;
	totalConversations: number;
	unreadConversations: number;
}

/**
 * Conversation filter options
 */
export interface ConversationFilters {
	unreadOnly?: boolean;
	onlineOnly?: boolean;
	postId?: number;
	searchQuery?: string;
}

/**
 * Message search result
 */
export interface MessageSearchResult {
	message: MessageResponseDTO;
	conversation: ConversationPreviewDTO;
	highlights: string[];
}
