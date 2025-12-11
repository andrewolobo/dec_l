import { BaseRepository } from "./base.repository";
import { Like, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class LikeRepository extends BaseRepository<Like> {
  protected modelName = Prisma.ModelName.Like;

  /**
   * Like a post
   */
  async likePost(userId: number, postId: number): Promise<Like> {
    return prisma.like.create({
      data: {
        userId,
        postId,
      },
    });
  }

  /**
   * Unlike a post
   */
  async unlikePost(userId: number, postId: number): Promise<void> {
    await prisma.like.deleteMany({
      where: {
        userId,
        postId,
      },
    });
  }

  /**
   * Check if user has liked a post
   */
  async hasUserLiked(userId: number, postId: number): Promise<boolean> {
    const like = await prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
    });
    return !!like;
  }

  /**
   * Get post likes with user details
   */
  async getPostLikes(postId: number) {
    return prisma.like.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            profilePictureUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get user's liked posts
   */
  async getUserLikedPosts(userId: number) {
    return prisma.like.findMany({
      where: { userId },
      include: {
        post: {
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get like count for a post
   */
  async getLikeCount(postId: number): Promise<number> {
    return prisma.like.count({
      where: { postId },
    });
  }

  /**
   * Find like by user and post
   */
  async findByUserAndPost(userId: number, postId: number) {
    return prisma.like.findFirst({
      where: {
        userId,
        postId,
      },
    });
  }

  /**
   * Count likes for a post
   */
  async countByPost(postId: number): Promise<number> {
    return prisma.like.count({
      where: { postId },
    });
  }
}
