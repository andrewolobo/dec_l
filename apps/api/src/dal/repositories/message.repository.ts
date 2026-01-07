import { BaseRepository } from "./base.repository";
import { Message, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

/**
 * Message Repository
 * Handles all database operations for messages
 */
export class MessageRepository extends BaseRepository<Message> {
  protected modelName = Prisma.ModelName.Message;

  /**
   * Create a new message
   */
  async create(data: {
    senderId: number;
    recipientId: number;
    content: string;
    messageType?: string;
    postId?: number;
    attachmentUrl?: string;
    parentMessageId?: number;
  }): Promise<Message> {
    return prisma.message.create({
      data: {
        senderId: data.senderId,
        recipientId: data.recipientId,
        content: data.content,
        messageType: data.messageType || "text",
        postId: data.postId,
        attachmentUrl: data.attachmentUrl,
        parentMessageId: data.parentMessageId,
      },
    });
  }

  /**
   * Find message by ID with relations
   */
  async findById(
    id: number,
    options?: {
      includeSender?: boolean;
      includeRecipient?: boolean;
      includePost?: boolean;
    }
  ): Promise<Message | null> {
    const {
      includeSender = false,
      includeRecipient = false,
      includePost = false,
    } = options || {};

    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: includeSender
          ? {
              select: {
                id: true,
                fullName: true,
                profilePictureUrl: true,
              },
            }
          : false,
        recipient: includeRecipient
          ? {
              select: {
                id: true,
                fullName: true,
                profilePictureUrl: true,
              },
            }
          : false,
        post: includePost
          ? {
              select: {
                id: true,
                title: true,
                price: true,
                status: true,
                images: {
                  take: 1,
                  orderBy: { displayOrder: "asc" },
                  select: { imageUrl: true },
                },
              },
            }
          : false,
      },
    });
  }

  /**
   * Get messages between two users (conversation thread)
   */
  async findByConversation(
    userId1: number,
    userId2: number,
    options?: {
      limit?: number;
      offset?: number;
      postId?: number;
    }
  ) {
    const { limit = 50, offset = 0, postId } = options || {};

    return prisma.message.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId1, recipientId: userId2 },
              { senderId: userId2, recipientId: userId1 },
            ],
          },
          postId ? { postId } : {},
          { isDeleted: false },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get unique conversation partner IDs for a user
   * @private
   */
  private async getConversationPartnerIds(userId: number): Promise<number[]> {
    // Get distinct sender IDs where user is recipient
    const receivedFrom = await prisma.message.findMany({
      where: {
        recipientId: userId,
        isDeleted: false,
      },
      distinct: ["senderId"],
      select: {
        senderId: true,
      },
    });

    // Get distinct recipient IDs where user is sender
    const sentTo = await prisma.message.findMany({
      where: {
        senderId: userId,
        isDeleted: false,
      },
      distinct: ["recipientId"],
      select: {
        recipientId: true,
      },
    });

    // Combine and deduplicate
    const partnerIds = new Set<number>([
      ...receivedFrom.map((m) => m.senderId),
      ...sentTo.map((m) => m.recipientId),
    ]);

    return Array.from(partnerIds);
  }

  /**
   * Get conversation list for a user
   * Returns the last message with each unique user
   * Refactored to use Prisma Query Builder instead of raw SQL for database compatibility
   */
  async getConversationList(
    userId: number,
    options?: {
      limit?: number;
      offset?: number;
    }
  ) {
    const { limit = 20, offset = 0 } = options || {};

    // Step 1: Fetch all messages involving the user (limited by a reasonable window)
    // We need to fetch more than limit+offset to ensure we get enough unique conversations
    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
        isDeleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        recipient: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      // Fetch enough messages to ensure we get unique conversations
      // This is a heuristic - adjust based on average messages per conversation
      take: (limit + offset) * 20,
    });

    // Step 2: Group by conversation partner and get last message
    const conversationMap = new Map<
      number,
      {
        userId: number;
        fullName: string;
        profilePictureUrl: string | null;
        lastMessage: string;
        lastMessageAt: Date;
        lastMessageSenderId: number;
        unreadCount: number;
        postId: number | null;
        postTitle: string | null;
      }
    >();

    for (const message of messages) {
      const partnerId =
        message.senderId === userId ? message.recipientId : message.senderId;

      // Only add if not already in map (messages are ordered by createdAt desc)
      if (!conversationMap.has(partnerId)) {
        const partner =
          message.senderId === userId ? message.recipient : message.sender;

        conversationMap.set(partnerId, {
          userId: partnerId,
          fullName: partner.fullName,
          profilePictureUrl: partner.profilePictureUrl,
          lastMessage: message.content,
          lastMessageAt: message.createdAt,
          lastMessageSenderId: message.senderId,
          unreadCount: 0, // Will be calculated in next step
          postId: message.postId,
          postTitle: message.post?.title ?? null,
        });
      }
    }

    // Step 3: Calculate unread counts in parallel
    const conversationArray = Array.from(conversationMap.values());
    const conversationsWithUnread = await Promise.all(
      conversationArray.map(async (conv) => {
        const unreadCount = await prisma.message.count({
          where: {
            senderId: conv.userId,
            recipientId: userId,
            isReadByRecipient: false,
            isDeleted: false,
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      })
    );

    // Step 4: Apply pagination
    const paginatedConversations = conversationsWithUnread.slice(
      offset,
      offset + limit
    );

    return paginatedConversations;
  }

  /**
   * Mark a message as read by recipient
   */
  async markAsReadByRecipient(messageId: number): Promise<Message> {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        isReadByRecipient: true,
        recipientReadAt: new Date(),
        // Also update legacy fields for backward compatibility
        isRead: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Mark a message as read by sender
   */
  async markAsReadBySender(messageId: number): Promise<Message> {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        isReadBySender: true,
        senderReadAt: new Date(),
      },
    });
  }

  /**
   * Mark a message as read (legacy method - marks recipient read)
   * @deprecated Use markAsReadByRecipient or markAsReadBySender instead
   */
  async markAsRead(messageId: number): Promise<Message> {
    return this.markAsReadByRecipient(messageId);
  }

  /**
   * Mark all messages in a conversation as read by recipient
   * (messages sent by otherUser to userId)
   */
  async markConversationAsReadByRecipient(
    userId: number,
    otherUserId: number
  ): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        recipientId: userId,
        isReadByRecipient: false,
        isDeleted: false,
      },
      data: {
        isReadByRecipient: true,
        recipientReadAt: new Date(),
        // Also update legacy fields for backward compatibility
        isRead: true,
        readAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Mark all messages in a conversation as read by sender
   * (messages sent by userId to otherUser)
   */
  async markConversationAsReadBySender(
    userId: number,
    otherUserId: number
  ): Promise<number> {
    const result = await prisma.message.updateMany({
      where: {
        senderId: userId,
        recipientId: otherUserId,
        isReadBySender: false,
        isDeleted: false,
      },
      data: {
        isReadBySender: true,
        senderReadAt: new Date(),
      },
    });

    return result.count;
  }

  /**
   * Mark all messages in a conversation as read (both parties)
   * This marks incoming messages as read by recipient AND outgoing messages as read by sender
   */
  async markConversationAsRead(
    userId: number,
    otherUserId: number
  ): Promise<{ recipientCount: number; senderCount: number }> {
    const recipientCount = await this.markConversationAsReadByRecipient(
      userId,
      otherUserId
    );
    const senderCount = await this.markConversationAsReadBySender(
      userId,
      otherUserId
    );
    return { recipientCount, senderCount };
  }

  /**
   * Soft delete a message
   */
  async softDelete(messageId: number, userId: number): Promise<Message> {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedBy: userId,
      },
    });
  }

  /**
   * Update message content (for editing)
   */
  async update(messageId: number, content: string): Promise<Message> {
    return prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });
  }

  /**
   * Get unread message count for a user (messages they received but haven't read)
   */
  async getUnreadCount(userId: number): Promise<number> {
    return prisma.message.count({
      where: {
        recipientId: userId,
        isReadByRecipient: false,
        isDeleted: false,
      },
    });
  }

  /**
   * Get unread count per conversation (messages user hasn't read from other user)
   */
  async getUnreadCountByConversation(
    userId: number,
    otherUserId: number
  ): Promise<number> {
    return prisma.message.count({
      where: {
        senderId: otherUserId,
        recipientId: userId,
        isReadByRecipient: false,
        isDeleted: false,
      },
    });
  }

  /**
   * Check if user is participant in a message
   */
  async isParticipant(messageId: number, userId: number): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        senderId: true,
        recipientId: true,
      },
    });

    if (!message) return false;
    return message.senderId === userId || message.recipientId === userId;
  }

  /**
   * Check if message belongs to sender
   */
  async isSender(messageId: number, userId: number): Promise<boolean> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        senderId: true,
      },
    });

    if (!message) return false;
    return message.senderId === userId;
  }
}
