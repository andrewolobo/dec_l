import { BaseRepository } from "./base.repository";
import { User, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class UserRepository extends BaseRepository<User> {
  protected modelName = Prisma.ModelName.User;

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: { phoneNumber },
    });
  }

  /**
   * Find user by OAuth provider
   */
  async findByOAuth(
    provider: string,
    providerId: string
  ): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        oauthProvider: provider,
        oauthProviderId: providerId,
      },
    });
  }

  /**
   * Create user with OAuth
   */
  async createOAuthUser(data: {
    email: string;
    phoneNumber: string;
    fullName: string;
    oauthProvider: string;
    oauthProviderId: string;
    profilePictureUrl?: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Create user with password
   */
  async createPasswordUser(data: {
    email: string;
    phoneNumber: string;
    fullName: string;
    passwordHash: string;
    profilePictureUrl?: string;
  }): Promise<User> {
    return prisma.user.create({
      data,
    });
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: number,
    data: {
      fullName?: string;
      phoneNumber?: string;
      profilePictureUrl?: string;
      location?: string;
      bio?: string;
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * Get user with posts
   */
  async getUserWithPosts(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        posts: {
          include: {
            category: true,
            images: true,
            _count: {
              select: { likes: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Deactivate user account
   */
  async deactivate(userId: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });
  }

  /**
   * Activate user account
   */
  async activate(userId: number): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  }
}
