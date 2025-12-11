import { BaseRepository } from './base.repository';
import { View, Prisma } from '@prisma/client';
import prisma from '../prisma.client';

export class ViewRepository extends BaseRepository<View> {
  protected modelName = Prisma.ModelName.View;

  /**
   * Record a new view
   */
  async recordView(data: {
    postId: number;
    userId?: number;
    ipAddress?: string;
    userAgent?: string;
    referrerUrl?: string;
    sessionId?: string;
  }): Promise<View> {
    // Check if this is a unique view
    const isUnique = await this.isUniqueView(
      data.postId,
      data.userId,
      data.ipAddress,
      data.sessionId
    );

    return prisma.view.create({
      data: {
        ...data,
        isUnique,
      },
    });
  }

  /**
   * Check if this is a unique view (not viewed in last 24 hours)
   */
  async isUniqueView(
    postId: number,
    userId?: number,
    ipAddress?: string,
    sessionId?: string
  ): Promise<boolean> {
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const existingView = await prisma.view.findFirst({
      where: {
        postId,
        createdAt: { gte: oneDayAgo },
        OR: [
          userId ? { userId } : {},
          ipAddress ? { ipAddress } : {},
          sessionId ? { sessionId } : {},
        ].filter(obj => Object.keys(obj).length > 0),
      },
    });

    return !existingView;
  }

  /**
   * Update view duration
   */
  async updateViewDuration(viewId: number, duration: number): Promise<View> {
    return prisma.view.update({
      where: { id: viewId },
      data: { viewDuration: duration },
    });
  }

  /**
   * Get total view count for a post
   */
  async getPostViewCount(postId: number): Promise<number> {
    return prisma.view.count({
      where: { postId },
    });
  }

  /**
   * Get unique view count for a post
   */
  async getPostUniqueViewCount(postId: number): Promise<number> {
    return prisma.view.count({
      where: { postId, isUnique: true },
    });
  }

  /**
   * Get trending posts based on recent views
   */
  async getTrendingPosts(limit: number = 10, hours: number = 24) {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const trendingPosts = await prisma.view.groupBy({
      by: ['postId'],
      where: {
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: limit,
    });

    return trendingPosts.map(post => ({
      postId: post.postId,
      viewCount: post._count.id,
    }));
  }
}
