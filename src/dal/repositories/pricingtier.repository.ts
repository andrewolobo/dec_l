import { BaseRepository } from "./base.repository";
import { PricingTier, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class PricingTierRepository extends BaseRepository<PricingTier> {
  protected modelName = Prisma.ModelName.PricingTier;

  /**
   * Get all active pricing tiers
   */
  async getActiveTiers(): Promise<PricingTier[]> {
    return prisma.pricingTier.findMany({
      where: { isActive: true },
      orderBy: { price: "asc" },
    });
  }

  /**
   * Get all pricing tiers (including inactive)
   */
  async getAllTiers(): Promise<PricingTier[]> {
    return prisma.pricingTier.findMany({
      orderBy: { price: "asc" },
    });
  }

  /**
   * Get pricing tier by ID
   */
  async getTierById(id: number): Promise<PricingTier | null> {
    return prisma.pricingTier.findUnique({
      where: { id },
    });
  }

  /**
   * Create pricing tier
   */
  async createTier(data: {
    name: string;
    visibilityDays: number;
    price: number;
    description?: string;
  }): Promise<PricingTier> {
    return prisma.pricingTier.create({
      data,
    });
  }

  /**
   * Update pricing tier
   */
  async updateTier(
    id: number,
    data: {
      name?: string;
      visibilityDays?: number;
      price?: number;
      description?: string;
      isActive?: boolean;
    }
  ): Promise<PricingTier> {
    return prisma.pricingTier.update({
      where: { id },
      data,
    });
  }

  /**
   * Deactivate pricing tier
   */
  async deactivateTier(id: number): Promise<PricingTier> {
    return prisma.pricingTier.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Activate pricing tier
   */
  async activateTier(id: number): Promise<PricingTier> {
    return prisma.pricingTier.update({
      where: { id },
      data: { isActive: true },
    });
  }

  /**
   * Get pricing tier with post count
   */
  async getTierWithPostCount(id: number) {
    return prisma.pricingTier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  }

  /**
   * Get all tiers with post counts
   */
  async getAllTiersWithPostCounts() {
    return prisma.pricingTier.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { price: "asc" },
    });
  }
}
