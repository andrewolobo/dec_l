import { BaseRepository } from "./base.repository";
import { Post, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class PostRepository extends BaseRepository<Post> {
  protected modelName = Prisma.ModelName.Post;

  /**
   * Get published posts feed with pagination
   */
  async getFeed(options: {
    limit?: number;
    offset?: number;
    categoryId?: number;
  }) {
    const { limit = 20, offset = 0, categoryId } = options;

    return prisma.post.findMany({
      where: {
        status: "Active",
        ...(categoryId && { categoryId }),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { publishedAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get single post with details
   */
  async getPostDetails(postId: number) {
    return prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
            phoneNumber: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { likes: true, views: true },
        },
      },
    });
  }

  /**
   * Create post with images
   */
  async createPost(data: {
    userId: number;
    title: string;
    categoryId: number;
    description: string;
    price: number;
    location: string;
    contactNumber: string;
    brand?: string;
    emailAddress?: string;
    deliveryMethod?: string;
    status?: string;
    images?: Array<{ imageUrl: string; displayOrder: number }>;
  }) {
    const { images, ...postData } = data;

    return prisma.post.create({
      data: {
        ...postData,
        status: postData.status || "Draft",
        images: images
          ? {
              create: images,
            }
          : undefined,
      },
      include: {
        images: true,
        category: true,
      },
    });
  }

  /**
   * Update post
   */
  async updatePost(
    postId: number,
    data: Partial<{
      title: string;
      description: string;
      price: number;
      location: string;
      categoryId: number;
      brand: string;
      deliveryMethod: string;
      contactNumber: string;
      emailAddress: string;
    }>
  ) {
    return prisma.post.update({
      where: { id: postId },
      data,
      include: {
        images: true,
        category: true,
      },
    });
  }

  /**
   * Get user's posts
   */
  async getUserPosts(userId: number, status?: string) {
    return prisma.post.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { likes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get pending posts for admin approval
   */
  async getPendingPosts() {
    return prisma.post.findMany({
      where: {
        status: "PendingPayment",
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Approve post
   */
  async approvePost(postId: number) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        status: "Active",
        publishedAt: new Date(),
      },
    });
  }

  /**
   * Reject post
   */
  async rejectPost(postId: number) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        status: "Rejected",
      },
    });
  }

  /**
   * Schedule post
   */
  async schedulePost(postId: number, scheduledTime: Date) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        status: "Scheduled",
        scheduledPublishTime: scheduledTime,
      },
    });
  }

  /**
   * Increment view count
   */
  async incrementViewCount(postId: number) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }

  /**
   * Update like count
   */
  async updateLikeCount(postId: number, increment: boolean = true) {
    return prisma.post.update({
      where: { id: postId },
      data: {
        likeCount: increment ? { increment: 1 } : { decrement: 1 },
      },
    });
  }

  /**
   * Search posts
   */
  async searchPosts(query: string, limit: number = 20) {
    return prisma.post.findMany({
      where: {
        status: "Active",
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
          { brand: { contains: query } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        _count: {
          select: { likes: true },
        },
      },
      take: limit,
      orderBy: { publishedAt: "desc" },
    });
  }

  /**
   * Search posts with filters
   */
  async search(
    query: string,
    categoryId?: number,
    minPrice?: number,
    maxPrice?: number,
    location?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const where: any = {
      status: "Active",
      AND: [
        {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { brand: { contains: query } },
          ],
        },
      ],
    };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined) {
      where.price = { ...where.price, gte: minPrice };
    }

    if (maxPrice !== undefined) {
      where.price = { ...where.price, lte: maxPrice };
    }

    if (location) {
      where.location = { contains: location };
    }

    return prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        likes: true,
        views: true,
      },
      orderBy: { publishedAt: "desc" },
    });
  }

  /**
   * Find posts by user ID with pagination
   */
  async findByUserId(userId: number, page: number = 1, limit: number = 20) {
    return prisma.post.findMany({
      where: { userId },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: true,
        images: {
          orderBy: { displayOrder: "asc" },
        },
        likes: true,
        views: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
