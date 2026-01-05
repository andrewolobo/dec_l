import {
  postRepository,
  categoryRepository,
  likeRepository,
  viewRepository,
  userRepository,
  postImageRepository,
} from "../dal/repositories";
import { uploadService } from "./upload.service";
import {
  CreatePostDTO,
  UpdatePostDTO,
  PostResponseDTO,
  SearchOptionsDTO,
  FeedOptionsDTO,
  SchedulePostDTO,
  LikeResponseDTO,
  PostStatus,
  PostUserDTO,
  CategoryDTO,
  PostImageDTO,
} from "../types/post/post.types";
import {
  ApiResponse,
  ErrorCode,
  PaginatedResponse,
} from "../types/common/api-response.types";

/**
 * Post service
 */
export class PostService {
  /**
   * Create a new post
   */
  async createPost(
    userId: number,
    data: CreatePostDTO
  ): Promise<ApiResponse<PostResponseDTO>> {
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

      // Verify category exists
      const category = await categoryRepository.findById(data.categoryId);
      if (!category) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Category not found",
            statusCode: 404,
          },
        };
      }

      // Create post
      const post = await postRepository.create({
        userId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        price: data.price,
        location: data.location,
        contactNumber: data.contactNumber,
        brand: data.brand,
        emailAddress: data.emailAddress,
        deliveryMethod: data.deliveryMethod,
        gpsLocation: data.gpsLocation,
        status: "Draft", // Default to draft
      });

      // Create post images if provided
      if (data.images && data.images.length > 0) {
        for (const image of data.images) {
          await postImageRepository.addImage(post.id, {
            imageUrl: image.imageUrl,
            displayOrder: image.displayOrder,
          });
        }
      }

      // Fetch complete post with relations
      const completePost = await postRepository.findById(post.id);
      if (!completePost) {
        throw new Error("Failed to fetch created post");
      }

      return {
        success: true,
        data: this.mapToPostResponse(completePost, user, category),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get post by ID
   */
  async getPost(
    postId: number,
    viewerId?: number
  ): Promise<ApiResponse<PostResponseDTO>> {
    try {
      // Use getPostDetails to include images relation with proper ordering
      const post = await postRepository.getPostDetails(postId);

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

      // Track view if viewer provided
      if (viewerId) {
        await viewRepository.create({
          postId,
          userId: viewerId,
        });
      }

      // Get user and category
      const user = await userRepository.findById(post.userId);
      const category = await categoryRepository.findById(post.categoryId);

      if (!user || !category) {
        throw new Error("Failed to fetch post relations");
      }

      // Check if viewer liked the post
      let isLiked = false;
      if (viewerId) {
        const like = await likeRepository.findByUserAndPost(viewerId, postId);
        isLiked = !!like;
      }

      const response = this.mapToPostResponse(post, user, category);
      response.isLiked = isLiked;

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update post
   */
  async updatePost(
    postId: number,
    userId: number,
    data: UpdatePostDTO
  ): Promise<ApiResponse<PostResponseDTO>> {
    try {
      const post = await postRepository.findById(postId);

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

      // Check ownership
      if (post.userId !== userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You do not have permission to update this post",
            statusCode: 403,
          },
        };
      }

      // Verify category if being updated
      if (data.categoryId) {
        const category = await categoryRepository.findById(data.categoryId);
        if (!category) {
          return {
            success: false,
            error: {
              code: ErrorCode.RESOURCE_NOT_FOUND,
              message: "Category not found",
              statusCode: 404,
            },
          };
        }
      }

      // Update post
      const updatedPost = await postRepository.update(postId, data);

      // Get user and category
      const user = await userRepository.findById(updatedPost.userId);
      const category = await categoryRepository.findById(
        updatedPost.categoryId
      );

      if (!user || !category) {
        throw new Error("Failed to fetch post relations");
      }

      return {
        success: true,
        data: this.mapToPostResponse(updatedPost, user, category),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to update post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete post
   */
  async deletePost(
    postId: number,
    userId: number
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const post = await postRepository.findById(postId);

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

      // Check ownership
      if (post.userId !== userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You do not have permission to delete this post",
            statusCode: 403,
          },
        };
      }

      await postRepository.delete(postId);

      return {
        success: true,
        data: {
          message: "Post deleted successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to delete post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get feed (paginated active posts)
   */
  async getFeed(
    options: FeedOptionsDTO
  ): Promise<PaginatedResponse<PostResponseDTO>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;

      // Build filter for active posts
      const where: any = {
        status: "Active",
      };

      if (options.categoryId) {
        where.categoryId = options.categoryId;
      }

      if (options.userId) {
        where.userId = options.userId;
      }

      // Get posts
      const posts = await postRepository.findAll({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          publishedAt: "desc",
        },
      });

      // Get total count for pagination
      const total = await postRepository.count(where);

      // Map posts to response format
      const mappedPosts: PostResponseDTO[] = [];
      for (const post of posts) {
        const user = await userRepository.findById(post.userId);
        const category = await categoryRepository.findById(post.categoryId);

        if (user && category) {
          mappedPosts.push(this.mapToPostResponse(post, user, category));
        }
      }

      return {
        success: true,
        data: mappedPosts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          pages: 0,
        },
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get feed",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Search posts
   */
  async searchPosts(
    options: SearchOptionsDTO
  ): Promise<PaginatedResponse<PostResponseDTO>> {
    try {
      const page = options.page || 1;
      const limit = options.limit || 20;

      const posts = await postRepository.search(
        options.query,
        options.categoryId,
        options.minPrice,
        options.maxPrice,
        options.location,
        page,
        limit
      );

      // For simplicity, we'll estimate total (in production, add count to search method)
      const total = posts.length;

      // Map posts to response format
      const mappedPosts: PostResponseDTO[] = [];
      for (const post of posts) {
        const user = await userRepository.findById(post.userId);
        const category = await categoryRepository.findById(post.categoryId);

        if (user && category) {
          mappedPosts.push(this.mapToPostResponse(post, user, category));
        }
      }

      return {
        success: true,
        data: mappedPosts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          pages: 0,
        },
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to search posts",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Like or unlike a post
   */
  async toggleLike(
    postId: number,
    userId: number
  ): Promise<ApiResponse<LikeResponseDTO>> {
    try {
      const post = await postRepository.findById(postId);

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

      // Check if already liked
      const existingLike = await likeRepository.findByUserAndPost(
        userId,
        postId
      );

      let liked: boolean;

      if (existingLike) {
        // Unlike
        await likeRepository.delete(existingLike.id);
        liked = false;
      } else {
        // Like
        await likeRepository.create({
          postId,
          userId,
        });
        liked = true;
      }

      // Get updated like count
      const likeCount = await likeRepository.countByPost(postId);

      return {
        success: true,
        data: {
          liked,
          likeCount,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to toggle like",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Schedule post for publishing
   */
  async schedulePost(
    postId: number,
    userId: number,
    data: SchedulePostDTO
  ): Promise<ApiResponse<PostResponseDTO>> {
    try {
      const post = await postRepository.findById(postId);

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

      // Check ownership
      if (post.userId !== userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You do not have permission to schedule this post",
            statusCode: 403,
          },
        };
      }

      // Validate scheduled time is in the future
      const scheduledTime = new Date(data.scheduledTime);
      if (scheduledTime <= new Date()) {
        return {
          success: false,
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Scheduled time must be in the future",
            statusCode: 400,
          },
        };
      }

      // Update post with scheduled time and status
      const updatedPost = await postRepository.update(postId, {
        scheduledPublishTime: scheduledTime,
        status: "Scheduled",
      });

      // Get user and category
      const user = await userRepository.findById(updatedPost.userId);
      const category = await categoryRepository.findById(
        updatedPost.categoryId
      );

      if (!user || !category) {
        throw new Error("Failed to fetch post relations");
      }

      return {
        success: true,
        data: this.mapToPostResponse(updatedPost, user, category),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to schedule post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Publish a draft or scheduled post
   */
  async publishPost(
    postId: number,
    userId: number
  ): Promise<ApiResponse<PostResponseDTO>> {
    try {
      const post = await postRepository.findById(postId);

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

      // Check ownership
      if (post.userId !== userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You do not have permission to publish this post",
            statusCode: 403,
          },
        };
      }

      // Check if post can be published
      if (post.status !== "Draft" && post.status !== "Scheduled") {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "Only draft or scheduled posts can be published",
            statusCode: 400,
          },
        };
      }

      // Calculate expiry date (30 days from now by default)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Update post status to active
      const updatedPost = await postRepository.update(postId, {
        status: "Active",
        publishedAt: new Date(),
        expiresAt,
      });

      // Get user and category
      const user = await userRepository.findById(updatedPost.userId);
      const category = await categoryRepository.findById(
        updatedPost.categoryId
      );

      if (!user || !category) {
        throw new Error("Failed to fetch post relations");
      }

      return {
        success: true,
        data: this.mapToPostResponse(updatedPost, user, category),
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to publish post",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get user's posts
   */
  async getUserPosts(
    userId: number,
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<PostResponseDTO>> {
    try {
      const posts = await postRepository.findByUserId(userId, page, limit);
      const total = await postRepository.count({ userId });

      const user = await userRepository.findById(userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Map posts to response format
      const mappedPosts: PostResponseDTO[] = [];
      for (const post of posts) {
        const category = await categoryRepository.findById(post.categoryId);

        if (category) {
          mappedPosts.push(this.mapToPostResponse(post, user, category));
        }
      }

      return {
        success: true,
        data: mappedPosts,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get user posts",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Map database post to response DTO
   */
  private mapToPostResponse(
    post: any,
    user: any,
    category: any
  ): PostResponseDTO {
    // Prepare image data
    const images: PostImageDTO[] =
      post.images?.map((img: any) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        displayOrder: img.displayOrder,
      })) || [];

    // Transform image URLs with error handling
    let transformedImages: PostImageDTO[] = [];
    try {
      transformedImages = uploadService.transformImageUrls(images);
    } catch (error) {
      console.error("Error transforming image URLs:", error);
      // Fall back to original images if transformation fails
      transformedImages = images;
    }

    // Prepare user data
    const userData: PostUserDTO = {
      id: user.id,
      fullName: user.fullName,
      profilePictureUrl: user.profilePictureUrl || undefined,
    };

    return {
      id: post.id,
      title: post.title,
      description: post.description,
      price: post.price,
      location: post.location,
      brand: post.brand || undefined,
      deliveryMethod: post.deliveryMethod || undefined,
      contactNumber: post.contactNumber,
      emailAddress: post.emailAddress || undefined,
      status: post.status as PostStatus,
      // Transform user profile picture with fresh SAS token
      user: uploadService.transformUserProfileUrl(userData) || userData,
      category: {
        id: category.id,
        name: category.name,
        description: category.description || undefined,
      },
      // Use transformed images (with error handling above)
      images: transformedImages,
      likeCount: post.likes?.length || 0,
      viewCount: post.views?.length || 0,
      scheduledPublishTime: post.scheduledPublishTime || undefined,
      publishedAt: post.publishedAt || undefined,
      expiresAt: post.expiresAt || undefined,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }
}

// Export singleton instance
export const postService = new PostService();
