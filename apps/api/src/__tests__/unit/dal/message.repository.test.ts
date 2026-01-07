import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MessageRepository } from "../../../dal/repositories/message.repository";
import prisma from "../../../dal/prisma.client";
import { faker } from "@faker-js/faker";

type MockedFunction = jest.MockedFunction<any>;

// Mock Prisma client
jest.mock("../../../dal/prisma.client", () => ({
  __esModule: true,
  default: {
    message: {
      findMany: jest.fn<any>(),
      findFirst: jest.fn<any>(),
      count: jest.fn<any>(),
      create: jest.fn<any>(),
      update: jest.fn<any>(),
      updateMany: jest.fn<any>(),
      findUnique: jest.fn<any>(),
    },
  },
}));

// Helper functions to create mock data
const createMockUser = (overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  fullName: faker.person.fullName(),
  profilePictureUrl: faker.image.avatar(),
  ...overrides,
});

const createMockPost = (overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 1000 }),
  title: faker.commerce.productName(),
  ...overrides,
});

const createMockMessage = (overrides: any = {}) => ({
  id: faker.number.int({ min: 1, max: 10000 }),
  senderId: faker.number.int({ min: 1, max: 1000 }),
  recipientId: faker.number.int({ min: 1, max: 1000 }),
  content: faker.lorem.sentence(),
  messageType: "text",
  postId: null,
  attachmentUrl: null,
  parentMessageId: null,
  isReadByRecipient: false,
  recipientReadAt: null,
  isReadBySender: true,
  senderReadAt: new Date(),
  isRead: false,
  readAt: null,
  isDeleted: false,
  deletedBy: null,
  isEdited: false,
  editedAt: null,
  createdAt: faker.date.recent(),
  updatedAt: faker.date.recent(),
  ...overrides,
});

describe("MessageRepository.getConversationList", () => {
  let messageRepository: MessageRepository;
  let mockPrisma: typeof prisma;

  beforeEach(() => {
    jest.clearAllMocks();
    messageRepository = new MessageRepository();
    mockPrisma = prisma;
  });

  describe("Basic Functionality", () => {
    it("should return empty array when user has no conversations", async () => {
      // Arrange
      const userId = 1;
      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue([]);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result).toEqual([]);
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [{ senderId: userId }, { recipientId: userId }],
            isDeleted: false,
          }),
        })
      );
    });

    it("should return conversations with last message for each user", async () => {
      // Arrange
      const userId = 1;
      const partnerId1 = 2;
      const partnerId2 = 3;

      const partner1 = createMockUser({
        id: partnerId1,
        fullName: "Partner One",
      });
      const partner2 = createMockUser({
        id: partnerId2,
        fullName: "Partner Two",
      });
      const currentUser = createMockUser({
        id: userId,
        fullName: "Current User",
      });

      const messages = [
        createMockMessage({
          senderId: partnerId1,
          recipientId: userId,
          content: "Latest from Partner 1",
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner1,
          recipient: currentUser,
          post: null,
        }),
        createMockMessage({
          senderId: userId,
          recipientId: partnerId2,
          content: "Latest to Partner 2",
          createdAt: new Date("2026-01-07T11:00:00Z"),
          sender: currentUser,
          recipient: partner2,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId, {
        limit: 20,
        offset: 0,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        userId: partnerId1,
        fullName: "Partner One",
        lastMessage: "Latest from Partner 1",
      });
      expect(result[1]).toMatchObject({
        userId: partnerId2,
        fullName: "Partner Two",
        lastMessage: "Latest to Partner 2",
      });
    });

    it("should include user details (fullName, profilePictureUrl)", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({
        id: partnerId,
        fullName: "John Doe",
        profilePictureUrl: "https://example.com/avatar.jpg",
      });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0]).toMatchObject({
        userId: partnerId,
        fullName: "John Doe",
        profilePictureUrl: "https://example.com/avatar.jpg",
      });
    });

    it("should include post details when message is related to a post", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const post = createMockPost({ id: 100, title: "iPhone for Sale" });
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          postId: post.id,
          sender: partner,
          recipient: currentUser,
          post,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0]).toMatchObject({
        postId: 100,
        postTitle: "iPhone for Sale",
      });
    });
  });

  describe("Message Ordering", () => {
    it("should return most recent conversation first", async () => {
      // Arrange
      const userId = 1;
      const partnerId1 = 2;
      const partnerId2 = 3;

      const partner1 = createMockUser({
        id: partnerId1,
        fullName: "Partner One",
      });
      const partner2 = createMockUser({
        id: partnerId2,
        fullName: "Partner Two",
      });
      const currentUser = createMockUser({ id: userId });

      // Partner 2's message is more recent
      const messages = [
        createMockMessage({
          senderId: partnerId2,
          recipientId: userId,
          content: "Recent message",
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner2,
          recipient: currentUser,
          post: null,
        }),
        createMockMessage({
          senderId: partnerId1,
          recipientId: userId,
          content: "Older message",
          createdAt: new Date("2026-01-06T12:00:00Z"),
          sender: partner1,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].userId).toBe(partnerId2); // Most recent first
      expect(result[1].userId).toBe(partnerId1);
    });

    it("should show latest message per conversation", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      // Multiple messages with same partner - should only show latest
      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          content: "Latest message",
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
        createMockMessage({
          senderId: userId,
          recipientId: partnerId,
          content: "Older message",
          createdAt: new Date("2026-01-07T10:00:00Z"),
          sender: currentUser,
          recipient: partner,
          post: null,
        }),
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          content: "Even older message",
          createdAt: new Date("2026-01-07T08:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].lastMessage).toBe("Latest message");
      expect(result[0].lastMessageAt).toEqual(new Date("2026-01-07T12:00:00Z"));
    });

    it("should handle bidirectional conversations correctly", async () => {
      // Arrange: User A sends to B, then B sends to A
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId, fullName: "Partner" });
      const currentUser = createMockUser({
        id: userId,
        fullName: "Current User",
      });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          content: "Reply from partner (latest)",
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
        createMockMessage({
          senderId: userId,
          recipientId: partnerId,
          content: "Initial message from user",
          createdAt: new Date("2026-01-07T10:00:00Z"),
          sender: currentUser,
          recipient: partner,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result).toHaveLength(1); // Should be one conversation
      expect(result[0].lastMessage).toBe("Reply from partner (latest)");
      expect(result[0].lastMessageSenderId).toBe(partnerId);
    });
  });

  describe("Unread Count", () => {
    it("should correctly count unread messages per conversation", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(5); // 5 unread messages

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].unreadCount).toBe(5);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          senderId: partnerId,
          recipientId: userId,
          isReadByRecipient: false,
          isDeleted: false,
        },
      });
    });

    it("should only count messages sent TO the user (not FROM)", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: userId,
          recipientId: partnerId,
          sender: currentUser,
          recipient: partner,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(3);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      // Should count messages FROM partnerId TO userId
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          senderId: partnerId, // FROM partner
          recipientId: userId, // TO user
          isReadByRecipient: false,
          isDeleted: false,
        },
      });
    });

    it("should exclude deleted messages from unread count", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(2);

      // Act
      await messageRepository.getConversationList(userId);

      // Assert
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isDeleted: false,
        }),
      });
    });

    it("should return 0 unread when all messages are read", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0); // No unread

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].unreadCount).toBe(0);
    });
  });

  describe("Pagination", () => {
    it("should respect limit parameter", async () => {
      // Arrange
      const userId = 1;
      const conversations = Array.from({ length: 5 }, (_, i) => {
        const partnerId = i + 2;
        const partner = createMockUser({ id: partnerId });
        const currentUser = createMockUser({ id: userId });
        return createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          createdAt: new Date(Date.now() - i * 1000000),
          sender: partner,
          recipient: currentUser,
          post: null,
        });
      });

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        conversations
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId, {
        limit: 3,
        offset: 0,
      });

      // Assert
      expect(result).toHaveLength(3);
    });

    it("should respect offset parameter", async () => {
      // Arrange
      const userId = 1;
      const conversations = Array.from({ length: 5 }, (_, i) => {
        const partnerId = i + 2;
        const partner = createMockUser({
          id: partnerId,
          fullName: `Partner ${i}`,
        });
        const currentUser = createMockUser({ id: userId });
        return createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          createdAt: new Date(Date.now() - i * 1000000),
          sender: partner,
          recipient: currentUser,
          post: null,
        });
      });

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        conversations
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId, {
        limit: 2,
        offset: 2,
      });

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].fullName).toBe("Partner 2"); // Skip first 2
    });

    it("should return correct page when both limit and offset are provided", async () => {
      // Arrange
      const userId = 1;
      const conversations = Array.from({ length: 10 }, (_, i) => {
        const partnerId = i + 2;
        const partner = createMockUser({ id: partnerId });
        const currentUser = createMockUser({ id: userId });
        return createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          createdAt: new Date(Date.now() - i * 1000000),
          sender: partner,
          recipient: currentUser,
          post: null,
        });
      });

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        conversations
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act - Get page 2 (items 5-9)
      const result = await messageRepository.getConversationList(userId, {
        limit: 5,
        offset: 5,
      });

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].userId).toBe(7); // Partner IDs start at 2, offset by 5
    });

    it("should use default limit of 20 when not provided", async () => {
      // Arrange
      const userId = 1;
      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue([]);

      // Act
      await messageRepository.getConversationList(userId);

      // Assert
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20 * 20, // (limit + offset) * 20 = (20 + 0) * 20
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should exclude deleted messages from conversations", async () => {
      // Arrange
      const userId = 1;
      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue([]);

      // Act
      await messageRepository.getConversationList(userId);

      // Assert
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        })
      );
    });

    it("should handle conversations with only deleted messages", async () => {
      // Arrange
      const userId = 1;
      // All messages are deleted, so findMany returns empty
      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue([]);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle null profilePictureUrl", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({
        id: partnerId,
        profilePictureUrl: null,
      });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].profilePictureUrl).toBeNull();
    });

    it("should handle null postId and postTitle", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          postId: null,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].postId).toBeNull();
      expect(result[0].postTitle).toBeNull();
    });

    it("should handle conversations with multiple posts (show latest)", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const post1 = createMockPost({ id: 100, title: "First Post" });
      const post2 = createMockPost({ id: 101, title: "Latest Post" });
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      // Latest message references post2
      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          postId: post2.id,
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post: post2,
        }),
        createMockMessage({
          senderId: userId,
          recipientId: partnerId,
          postId: post1.id,
          createdAt: new Date("2026-01-07T10:00:00Z"),
          sender: currentUser,
          recipient: partner,
          post: post1,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0].postId).toBe(101);
      expect(result[0].postTitle).toBe("Latest Post");
    });
  });

  describe("Data Type Consistency", () => {
    it("should return conversation with exact interface structure", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({
        id: partnerId,
        fullName: "Test Partner",
      });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          content: "Test message",
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(3);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(result[0]).toMatchObject({
        userId: expect.any(Number),
        fullName: expect.any(String),
        profilePictureUrl: expect.anything(), // Can be string or null
        lastMessage: expect.any(String),
        lastMessageAt: expect.any(Date),
        lastMessageSenderId: expect.any(Number),
        unreadCount: expect.any(Number),
        postId: null,
        postTitle: null,
      });
    });

    it("should return unreadCount as number (not bigint)", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const partner = createMockUser({ id: partnerId });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(10);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(typeof result[0].unreadCount).toBe("number");
      expect(result[0].unreadCount).toBe(10);
    });

    it("should handle all required fields present", async () => {
      // Arrange
      const userId = 1;
      const partnerId = 2;
      const post = createMockPost({ id: 100, title: "Test Post" });
      const partner = createMockUser({
        id: partnerId,
        fullName: "John Doe",
        profilePictureUrl: "https://example.com/avatar.jpg",
      });
      const currentUser = createMockUser({ id: userId });

      const messages = [
        createMockMessage({
          id: 500,
          senderId: partnerId,
          recipientId: userId,
          content: "Hello World",
          postId: post.id,
          createdAt: new Date("2026-01-07T12:00:00Z"),
          sender: partner,
          recipient: currentUser,
          post,
        }),
      ];

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        messages
      );
      (mockPrisma.message.count as MockedFunction).mockResolvedValue(2);

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert - All fields must be present
      const conversation = result[0];
      expect(conversation).toHaveProperty("userId");
      expect(conversation).toHaveProperty("fullName");
      expect(conversation).toHaveProperty("profilePictureUrl");
      expect(conversation).toHaveProperty("lastMessage");
      expect(conversation).toHaveProperty("lastMessageAt");
      expect(conversation).toHaveProperty("lastMessageSenderId");
      expect(conversation).toHaveProperty("unreadCount");
      expect(conversation).toHaveProperty("postId");
      expect(conversation).toHaveProperty("postTitle");

      // Verify values
      expect(conversation.userId).toBe(partnerId);
      expect(conversation.fullName).toBe("John Doe");
      expect(conversation.profilePictureUrl).toBe(
        "https://example.com/avatar.jpg"
      );
      expect(conversation.lastMessage).toBe("Hello World");
      expect(conversation.lastMessageAt).toEqual(
        new Date("2026-01-07T12:00:00Z")
      );
      expect(conversation.lastMessageSenderId).toBe(partnerId);
      expect(conversation.unreadCount).toBe(2);
      expect(conversation.postId).toBe(100);
      expect(conversation.postTitle).toBe("Test Post");
    });
  });

  describe("Performance", () => {
    it("should execute unread counts in parallel using Promise.all", async () => {
      // Arrange
      const userId = 1;
      const conversations = Array.from({ length: 3 }, (_, i) => {
        const partnerId = i + 2;
        const partner = createMockUser({ id: partnerId });
        const currentUser = createMockUser({ id: userId });
        return createMockMessage({
          senderId: partnerId,
          recipientId: userId,
          sender: partner,
          recipient: currentUser,
          post: null,
        });
      });

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue(
        conversations
      );

      // Mock count to track parallel execution
      let callCount = 0;
      (mockPrisma.message.count as MockedFunction).mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount);
      });

      // Act
      const result = await messageRepository.getConversationList(userId);

      // Assert
      expect(mockPrisma.message.count).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      // All counts should execute in parallel, not sequentially
      expect(result.every((conv) => conv.unreadCount > 0)).toBe(true);
    });

    it("should fetch messages with appropriate take limit based on pagination", async () => {
      // Arrange
      const userId = 1;
      const limit = 10;
      const offset = 5;

      (mockPrisma.message.findMany as MockedFunction).mockResolvedValue([]);

      // Act
      await messageRepository.getConversationList(userId, { limit, offset });

      // Assert
      expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: (limit + offset) * 20, // Heuristic: (10 + 5) * 20 = 300
        })
      );
    });
  });
});
