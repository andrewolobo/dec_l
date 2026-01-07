import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MessageService } from "../../../services/message.service";
import { messageRepository, userRepository } from "../../../dal/repositories";
import { ErrorCode } from "../../../types/common/api-response.types";

type MockedFunction = jest.MockedFunction<any>;

// Mock repositories
jest.mock("../../../dal/repositories", () => ({
  messageRepository: {
    getConversationList: jest.fn<any>(),
    findByConversation: jest.fn<any>(),
    create: jest.fn<any>(),
    markAsReadByRecipient: jest.fn<any>(),
    markConversationAsReadByRecipient: jest.fn<any>(),
  },
  userRepository: {
    findById: jest.fn<any>(),
  },
  postRepository: {},
  categoryRepository: {},
  likeRepository: {},
  viewRepository: {},
  postImageRepository: {},
  paymentRepository: {},
}));

describe("MessageService", () => {
  let messageService: MessageService;

  beforeEach(() => {
    jest.clearAllMocks();
    messageService = new MessageService();
  });

  describe("getConversations", () => {
    it("should return conversations with correct DTO structure", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };

      const mockConversations = [
        {
          userId: 2,
          fullName: "Partner One",
          profilePictureUrl: "https://example.com/avatar.jpg",
          lastMessage: "Hello there",
          lastMessageAt: new Date("2026-01-07T12:00:00Z"),
          lastMessageSenderId: 2,
          unreadCount: 3,
          postId: 100,
          postTitle: "Test Post",
        },
        {
          userId: 3,
          fullName: "Partner Two",
          profilePictureUrl: null, // Should be converted to undefined
          lastMessage: "Hi",
          lastMessageAt: new Date("2026-01-07T11:00:00Z"),
          lastMessageSenderId: 1,
          unreadCount: 0,
          postId: null, // Should be converted to undefined
          postTitle: null, // Should be converted to undefined
        },
      ];

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockResolvedValue(mockConversations);

      // Act
      const result = await messageService.getConversations(userId, {
        limit: 20,
        offset: 0,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      // Verify first conversation
      expect(result.data![0]).toMatchObject({
        userId: 2,
        fullName: "Partner One",
        profilePictureUrl: "https://example.com/avatar.jpg",
        lastMessage: "Hello there",
        lastMessageSenderId: 2,
        unreadCount: 3,
        postId: 100,
        postTitle: "Test Post",
      });

      // Verify null to undefined conversion
      expect(result.data![1].profilePictureUrl).toBeUndefined();
      expect(result.data![1].postId).toBeUndefined();
      expect(result.data![1].postTitle).toBeUndefined();

      // Verify repository was called correctly
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(messageRepository.getConversationList).toHaveBeenCalledWith(
        userId,
        {
          limit: 20,
          offset: 0,
        }
      );
    });

    it("should return error when user not found", async () => {
      // Arrange
      const userId = 999;
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await messageService.getConversations(userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: ErrorCode.RESOURCE_NOT_FOUND,
        message: "User not found",
        statusCode: 404,
      });
      expect(messageRepository.getConversationList).not.toHaveBeenCalled();
    });

    it("should handle repository errors gracefully", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };
      const mockError = new Error("Database connection failed");

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockRejectedValue(mockError);

      // Act
      const result = await messageService.getConversations(userId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toMatchObject({
        code: ErrorCode.INTERNAL_ERROR,
        message: "Failed to fetch conversations",
        details: "Database connection failed",
        statusCode: 500,
      });
    });

    it("should return empty array when user has no conversations", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockResolvedValue([]);

      // Act
      const result = await messageService.getConversations(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it("should pass pagination options to repository", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };
      const options = { limit: 10, offset: 5 };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockResolvedValue([]);

      // Act
      await messageService.getConversations(userId, options);

      // Assert
      expect(messageRepository.getConversationList).toHaveBeenCalledWith(
        userId,
        options
      );
    });

    it("should handle conversations with all optional fields present", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };

      const mockConversations = [
        {
          userId: 2,
          fullName: "Partner",
          profilePictureUrl: "https://example.com/avatar.jpg",
          lastMessage: "Message",
          lastMessageAt: new Date(),
          lastMessageSenderId: 2,
          unreadCount: 1,
          postId: 100,
          postTitle: "Post Title",
        },
      ];

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockResolvedValue(mockConversations);

      // Act
      const result = await messageService.getConversations(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data![0]).toHaveProperty("profilePictureUrl");
      expect(result.data![0]).toHaveProperty("postId");
      expect(result.data![0]).toHaveProperty("postTitle");
      expect(result.data![0].profilePictureUrl).toBe(
        "https://example.com/avatar.jpg"
      );
      expect(result.data![0].postId).toBe(100);
      expect(result.data![0].postTitle).toBe("Post Title");
    });

    it("should maintain conversation order from repository", async () => {
      // Arrange
      const userId = 1;
      const mockUser = { id: userId, fullName: "Test User" };

      const mockConversations = [
        {
          userId: 3,
          fullName: "Most Recent",
          profilePictureUrl: null,
          lastMessage: "Latest message",
          lastMessageAt: new Date("2026-01-07T12:00:00Z"),
          lastMessageSenderId: 3,
          unreadCount: 5,
          postId: null,
          postTitle: null,
        },
        {
          userId: 2,
          fullName: "Second",
          profilePictureUrl: null,
          lastMessage: "Older message",
          lastMessageAt: new Date("2026-01-07T10:00:00Z"),
          lastMessageSenderId: 2,
          unreadCount: 0,
          postId: null,
          postTitle: null,
        },
      ];

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (
        messageRepository.getConversationList as MockedFunction
      ).mockResolvedValue(mockConversations);

      // Act
      const result = await messageService.getConversations(userId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data![0].userId).toBe(3); // Most recent first
      expect(result.data![1].userId).toBe(2);
    });
  });
});
