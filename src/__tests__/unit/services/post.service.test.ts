import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PostService } from "../../../services/post.service";
import {
  postRepository,
  userRepository,
  categoryRepository,
  likeRepository,
  viewRepository,
  postImageRepository,
} from "../../../dal/repositories";
import {
  createMockUser,
  createMockPost,
  createMockCategory,
  createMockLike,
} from "../../helpers/test-data";
import { ErrorCode } from "../../../types/common/api-response.types";

type MockedFunction = jest.MockedFunction<any>;

// Mock all repositories
jest.mock("../../../dal/repositories", () => ({
  postRepository: {
    findById: jest.fn<any>(),
    create: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
    findAll: jest.fn<any>(),
    count: jest.fn<any>(),
    search: jest.fn<any>(),
    findByUserId: jest.fn<any>(),
  },
  userRepository: {
    findById: jest.fn<any>(),
  },
  categoryRepository: {
    findById: jest.fn<any>(),
  },
  likeRepository: {
    findByUserAndPost: jest.fn<any>(),
    create: jest.fn<any>(),
    delete: jest.fn<any>(),
    countByPost: jest.fn<any>(),
  },
  viewRepository: {
    create: jest.fn<any>(),
  },
  postImageRepository: {
    addImage: jest.fn<any>(),
  },
}));

describe("PostService", () => {
  let postService: PostService;
  let mockUser: any;
  let mockCategory: any;
  let mockPost: any;

  beforeEach(() => {
    jest.clearAllMocks();
    postService = new PostService();
    mockUser = createMockUser();
    mockCategory = createMockCategory();
    mockPost = createMockPost(mockUser.id, mockCategory.id);
  });

  describe("createPost", () => {
    it("should create a post successfully", async () => {
      // Arrange
      const createPostDTO = {
        title: mockPost.title,
        categoryId: mockCategory.id,
        description: mockPost.description,
        price: mockPost.price,
        location: mockPost.location,
        contactNumber: mockPost.contactNumber,
      };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (postRepository.create as MockedFunction).mockResolvedValue(mockPost);
      (postRepository.findById as MockedFunction).mockResolvedValue({
        ...mockPost,
        user: mockUser,
        category: mockCategory,
      });

      // Act
      const result = await postService.createPost(mockUser.id, createPostDTO);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.title).toBe(mockPost.title);
      expect(userRepository.findById).toHaveBeenCalledWith(mockUser.id);
      expect(categoryRepository.findById).toHaveBeenCalledWith(mockCategory.id);
      expect(postRepository.create).toHaveBeenCalled();
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await postService.createPost(999, {} as any);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("User not found");
    });

    it("should return error when category not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await postService.createPost(mockUser.id, {
        categoryId: 999,
        title: "Test",
        description: "Test",
        price: 100,
        location: "Test",
        contactNumber: "123",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Category not found");
    });

    it("should create post with images", async () => {
      // Arrange
      const createPostDTO = {
        title: mockPost.title,
        categoryId: mockCategory.id,
        description: mockPost.description,
        price: mockPost.price,
        location: mockPost.location,
        contactNumber: mockPost.contactNumber,
        images: [
          { imageUrl: "http://example.com/image1.jpg", displayOrder: 0 },
          { imageUrl: "http://example.com/image2.jpg", displayOrder: 1 },
        ],
      };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (postRepository.create as MockedFunction).mockResolvedValue(mockPost);
      (postImageRepository.addImage as MockedFunction).mockResolvedValue({});
      (postRepository.findById as MockedFunction).mockResolvedValue({
        ...mockPost,
        user: mockUser,
        category: mockCategory,
      });

      // Act
      const result = await postService.createPost(mockUser.id, createPostDTO);

      // Assert
      expect(result.success).toBe(true);
      expect(postImageRepository.addImage).toHaveBeenCalledTimes(2);
      expect(postImageRepository.addImage).toHaveBeenCalledWith(mockPost.id, {
        imageUrl: "http://example.com/image1.jpg",
        displayOrder: 0,
      });
    });

    it("should handle database error gracefully", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (postRepository.create as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await postService.createPost(mockUser.id, {
        title: "Test",
        categoryId: mockCategory.id,
        description: "Test",
        price: 100,
        location: "Test",
        contactNumber: "123",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
    });
  });

  describe("getPost", () => {
    it("should get post successfully", async () => {
      // Arrange
      const postWithRelations = {
        ...mockPost,
        user: mockUser,
        category: mockCategory,
      };

      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );

      // Act
      const result = await postService.getPost(mockPost.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(postRepository.findById).toHaveBeenCalledWith(mockPost.id);
    });

    it("should return error when post not found", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await postService.getPost(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
    });

    it("should track view when viewerId provided", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (likeRepository.findByUserAndPost as MockedFunction).mockResolvedValue(
        null
      );
      (viewRepository.create as MockedFunction).mockResolvedValue({});

      // Act
      const result = await postService.getPost(mockPost.id, mockUser.id);

      // Assert
      expect(viewRepository.create).toHaveBeenCalledWith({
        postId: mockPost.id,
        userId: mockUser.id,
      });
    });

    it("should check if user liked the post", async () => {
      // Arrange
      const mockLike = createMockLike(mockUser.id, mockPost.id);

      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (likeRepository.findByUserAndPost as MockedFunction).mockResolvedValue(
        mockLike
      );

      // Act
      const result = await postService.getPost(mockPost.id, mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.isLiked).toBe(true);
    });
  });

  describe("toggleLike", () => {
    it("should like a post when not already liked", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (likeRepository.findByUserAndPost as MockedFunction).mockResolvedValue(
        null
      );
      (likeRepository.create as MockedFunction).mockResolvedValue({});
      (likeRepository.countByPost as MockedFunction).mockResolvedValue(1);

      // Act
      const result = await postService.toggleLike(mockPost.id, mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.liked).toBe(true);
      expect(result.data?.likeCount).toBe(1);
      expect(likeRepository.create).toHaveBeenCalled();
    });

    it("should unlike a post when already liked", async () => {
      // Arrange
      const mockLike = createMockLike(mockUser.id, mockPost.id);

      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (likeRepository.findByUserAndPost as MockedFunction).mockResolvedValue(
        mockLike
      );
      (likeRepository.delete as MockedFunction).mockResolvedValue({});
      (likeRepository.countByPost as MockedFunction).mockResolvedValue(0);

      // Act
      const result = await postService.toggleLike(mockPost.id, mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.liked).toBe(false);
      expect(result.data?.likeCount).toBe(0);
      expect(likeRepository.delete).toHaveBeenCalledWith(mockLike.id);
    });

    it("should return error when post not found", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await postService.toggleLike(999, mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
    });
  });

  describe("updatePost", () => {
    it("should update post successfully", async () => {
      // Arrange
      const updateData = { title: "Updated Title" };
      const updatedPost = { ...mockPost, ...updateData };

      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (postRepository.update as MockedFunction).mockResolvedValue(updatedPost);
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );

      // Act
      const result = await postService.updatePost(
        mockPost.id,
        mockUser.id,
        updateData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.title).toBe("Updated Title");
    });

    it("should return forbidden when user does not own post", async () => {
      // Arrange
      const differentUser = createMockUser();
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);

      // Act
      const result = await postService.updatePost(
        mockPost.id,
        differentUser.id,
        {}
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.error?.statusCode).toBe(403);
    });

    it("should verify category exists when updating category", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await postService.updatePost(mockPost.id, mockUser.id, {
        categoryId: 999,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.message).toBe("Category not found");
    });
  });

  describe("deletePost", () => {
    it("should delete post successfully", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (postRepository.delete as MockedFunction).mockResolvedValue({});

      // Act
      const result = await postService.deletePost(mockPost.id, mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Post deleted successfully");
      expect(postRepository.delete).toHaveBeenCalledWith(mockPost.id);
    });

    it("should return forbidden when user does not own post", async () => {
      // Arrange
      const differentUser = createMockUser();
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);

      // Act
      const result = await postService.deletePost(
        mockPost.id,
        differentUser.id
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.error?.statusCode).toBe(403);
    });
  });

  describe("searchPosts", () => {
    it("should search posts successfully", async () => {
      // Arrange
      const posts = [mockPost];
      (postRepository.search as MockedFunction).mockResolvedValue(posts);
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );

      // Act
      const result = await postService.searchPosts({
        query: "test",
        page: 1,
        limit: 20,
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(postRepository.search).toHaveBeenCalledWith(
        "test",
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        20
      );
    });
  });
});
