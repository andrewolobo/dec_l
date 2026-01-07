import {
  messageRepository,
  userRepository,
  postRepository,
} from "../dal/repositories";
import {
  CreateMessageDTO,
  UpdateMessageDTO,
  MessageResponseDTO,
  ConversationPreviewDTO,
  MessageQueryOptions,
  ConversationQueryOptions,
  MessageUserDTO,
  MessagePostDTO,
} from "../types/message/message.types";
import {
  ApiResponse,
  ErrorCode,
  PaginatedResponse,
} from "../types/common/api-response.types";
import { Message, User, Post } from "@prisma/client";

/**
 * Message Service
 * Handles business logic for messaging functionality
 */
export class MessageService {
  /**
   * Send a new message
   */
  async sendMessage(
    senderId: number,
    data: CreateMessageDTO
  ): Promise<ApiResponse<MessageResponseDTO>> {
    try {
      // Verify sender exists
      const sender = await userRepository.findById(senderId);
      if (!sender) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Sender not found",
            statusCode: 404,
          },
        };
      }

      // Verify recipient exists
      const recipient = await userRepository.findById(data.recipientId);
      if (!recipient) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Recipient not found",
            statusCode: 404,
          },
        };
      }

      // Verify sender is not sending to themselves
      if (senderId === data.recipientId) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Cannot send message to yourself",
            statusCode: 400,
          },
        };
      }

      // If postId is provided, verify post exists
      if (data.postId) {
        const post = await postRepository.findById(data.postId);
        if (!post) {
          return {
            success: false,
            error: {
              code: ErrorCode.RESOURCE_NOT_FOUND,
              message: "Post not found",
              statusCode: 404,
            },
          };
        }
      }

      // If parentMessageId is provided, verify it exists and user has access
      if (data.parentMessageId) {
        const parentMessage = await messageRepository.findById(
          data.parentMessageId
        );
        if (!parentMessage) {
          return {
            success: false,
            error: {
              code: ErrorCode.RESOURCE_NOT_FOUND,
              message: "Parent message not found",
              statusCode: 404,
            },
          };
        }

        // Verify sender is part of the conversation
        const isParticipant = await messageRepository.isParticipant(
          data.parentMessageId,
          senderId
        );
        if (!isParticipant) {
          return {
            success: false,
            error: {
              code: ErrorCode.FORBIDDEN,
              message: "Cannot reply to this message",
              statusCode: 403,
            },
          };
        }
      }

      // Create the message
      const message = await messageRepository.create({
        senderId,
        recipientId: data.recipientId,
        content: data.messageContent,
        messageType: data.messageType,
        postId: data.postId,
        attachmentUrl: data.attachmentUrl,
        parentMessageId: data.parentMessageId,
      });

      // Fetch message with relations
      const messageWithRelations = await messageRepository.findById(
        message.id,
        {
          includeSender: true,
          includeRecipient: true,
          includePost: true,
        }
      );

      if (!messageWithRelations) {
        throw new Error("Failed to fetch created message");
      }

      return {
        success: true,
        data: this.mapToMessageResponse(messageWithRelations),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to send message",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get conversation list for a user
   */
  async getConversations(
    userId: number,
    options?: ConversationQueryOptions
  ): Promise<ApiResponse<ConversationPreviewDTO[]>> {
    try {
      // Verify user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      // Add performance monitoring in development
      const startTime =
        process.env.NODE_ENV === "development" ? Date.now() : null;

      const conversations = await messageRepository.getConversationList(
        userId,
        options
      );

      // Log performance metrics in development
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(
          `[MessageService] getConversationList took ${duration}ms for userId: ${userId}`
        );

        if (duration > 1000) {
          console.warn(
            `[MessageService] Performance warning: getConversationList took ${duration}ms (threshold: 1000ms)`
          );
        }
      }

      // Map null values to undefined for DTO compatibility
      const mappedConversations = conversations.map((conv) => ({
        ...conv,
        profilePictureUrl: conv.profilePictureUrl ?? undefined,
        postId: conv.postId ?? undefined,
        postTitle: conv.postTitle ?? undefined,
      }));

      return {
        success: true,
        data: mappedConversations,
      };
    } catch (error) {
      console.error("[MessageService] Error fetching conversations:", error);
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to fetch conversations",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get messages between two users
   */
  async getMessages(
    userId: number,
    otherUserId: number,
    options?: MessageQueryOptions
  ): Promise<ApiResponse<MessageResponseDTO[]>> {
    try {
      // Verify current user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      // Verify other user exists
      const otherUser = await userRepository.findById(otherUserId);
      if (!otherUser) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Other user not found",
            statusCode: 404,
          },
        };
      }

      const messages = await messageRepository.findByConversation(
        userId,
        otherUserId,
        options
      );

      return {
        success: true,
        data: messages.map((msg) => this.mapToMessageResponse(msg)),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to fetch messages",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Mark a single message as read
   * Determines whether to mark as read by sender or recipient based on who is calling
   */
  async markAsRead(
    userId: number,
    messageId: number
  ): Promise<ApiResponse<MessageResponseDTO>> {
    try {
      // Verify message exists
      const message = await messageRepository.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Message not found",
            statusCode: 404,
          },
        };
      }

      // Verify user is either the sender or recipient
      const isRecipient = message.recipientId === userId;
      const isSender = message.senderId === userId;

      if (!isRecipient && !isSender) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only mark messages in your conversations as read",
            statusCode: 403,
          },
        };
      }

      // Mark as read based on role
      let updatedMessage;
      if (isRecipient) {
        updatedMessage =
          await messageRepository.markAsReadByRecipient(messageId);
      } else {
        updatedMessage = await messageRepository.markAsReadBySender(messageId);
      }

      // Fetch with relations
      const messageWithRelations = await messageRepository.findById(
        updatedMessage.id,
        {
          includeSender: true,
          includeRecipient: true,
          includePost: true,
        }
      );

      if (!messageWithRelations) {
        throw new Error("Failed to fetch updated message");
      }

      return {
        success: true,
        data: this.mapToMessageResponse(messageWithRelations),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to mark message as read",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Mark all messages in a conversation as read
   * Marks incoming messages (from otherUser) as read by recipient (userId)
   * Also marks outgoing messages (from userId) as read by sender
   */
  async markConversationAsRead(
    userId: number,
    otherUserId: number
  ): Promise<
    ApiResponse<{ recipientCount: number; senderCount: number; count: number }>
  > {
    try {
      // Verify both users exist
      const user = await userRepository.findById(userId);
      const otherUser = await userRepository.findById(otherUserId);

      if (!user || !otherUser) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      const { recipientCount, senderCount } =
        await messageRepository.markConversationAsRead(userId, otherUserId);

      return {
        success: true,
        data: {
          recipientCount,
          senderCount,
          count: recipientCount, // Legacy field for backward compatibility
        },
        message: `Marked ${recipientCount} incoming and ${senderCount} outgoing message(s) as read`,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to mark conversation as read",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Edit a message
   */
  async editMessage(
    userId: number,
    messageId: number,
    content: string
  ): Promise<ApiResponse<MessageResponseDTO>> {
    try {
      // Verify message exists
      const message = await messageRepository.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Message not found",
            statusCode: 404,
          },
        };
      }

      // Verify user is the sender
      const isSender = await messageRepository.isSender(messageId, userId);
      if (!isSender) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only edit your own messages",
            statusCode: 403,
          },
        };
      }

      // Check if message is deleted
      if (message.isDeleted) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Cannot edit deleted message",
            statusCode: 400,
          },
        };
      }

      // Optional: Add time limit for editing (e.g., 15 minutes)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      if (message.createdAt < fifteenMinutesAgo) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Message can only be edited within 15 minutes of sending",
            statusCode: 400,
          },
        };
      }

      // Update message
      const updatedMessage = await messageRepository.update(messageId, content);

      // Fetch with relations
      const messageWithRelations = await messageRepository.findById(
        updatedMessage.id,
        {
          includeSender: true,
          includeRecipient: true,
          includePost: true,
        }
      );

      if (!messageWithRelations) {
        throw new Error("Failed to fetch updated message");
      }

      return {
        success: true,
        data: this.mapToMessageResponse(messageWithRelations),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to edit message",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(
    userId: number,
    messageId: number
  ): Promise<ApiResponse<{ messageId: number }>> {
    try {
      // Verify message exists
      const message = await messageRepository.findById(messageId);
      if (!message) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Message not found",
            statusCode: 404,
          },
        };
      }

      // Verify user is a participant (sender or recipient can delete)
      const isParticipant = await messageRepository.isParticipant(
        messageId,
        userId
      );
      if (!isParticipant) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only delete messages from your conversations",
            statusCode: 403,
          },
        };
      }

      // Check if already deleted
      if (message.isDeleted) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Message is already deleted",
            statusCode: 400,
          },
        };
      }

      // Soft delete
      await messageRepository.softDelete(messageId, userId);

      return {
        success: true,
        data: { messageId },
        message: "Message deleted successfully",
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to delete message",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get unread message count for a user
   */
  async getUnreadCount(
    userId: number
  ): Promise<ApiResponse<{ count: number }>> {
    try {
      // Verify user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      const count = await messageRepository.getUnreadCount(userId);

      return {
        success: true,
        data: { count },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get unread count",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Map database message to response DTO
   */
  private mapToMessageResponse(message: any): MessageResponseDTO {
    return {
      messageId: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      postId: message.postId ?? undefined,
      messageContent: message.content,
      messageType: message.messageType,
      attachmentUrl: message.attachmentUrl ?? undefined,
      // Dual-party read tracking
      isReadByRecipient: message.isReadByRecipient ?? message.isRead ?? false,
      recipientReadAt: message.recipientReadAt ?? message.readAt ?? undefined,
      isReadBySender: message.isReadBySender ?? true,
      senderReadAt: message.senderReadAt ?? undefined,
      // Legacy fields for backward compatibility
      isRead: message.isRead ?? message.isReadByRecipient ?? false,
      readAt: message.readAt ?? message.recipientReadAt ?? undefined,
      isDeleted: message.isDeleted,
      deletedBy: message.deletedBy ?? undefined,
      isEdited: message.isEdited,
      editedAt: message.editedAt ?? undefined,
      parentMessageId: message.parentMessageId ?? undefined,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender
        ? {
            userId: message.sender.id,
            fullName: message.sender.fullName,
            profilePictureUrl: message.sender.profilePictureUrl ?? undefined,
          }
        : undefined,
      recipient: message.recipient
        ? {
            userId: message.recipient.id,
            fullName: message.recipient.fullName,
            profilePictureUrl: message.recipient.profilePictureUrl ?? undefined,
          }
        : undefined,
      post: message.post
        ? {
            postId: message.post.id,
            title: message.post.title,
            price: Number(message.post.price),
            imageUrl: message.post.images?.[0]?.imageUrl,
            status: message.post.status,
          }
        : undefined,
    };
  }
}

// Export singleton instance
export const messageService = new MessageService();
