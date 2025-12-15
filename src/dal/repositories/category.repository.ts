import { BaseRepository } from "./base.repository";
import { Category, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class CategoryRepository extends BaseRepository<Category> {
  protected modelName = Prisma.ModelName.Category;

  /**
   * Get all categories
   */
  async getAllCategories() {
    return prisma.category.findMany({
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get category with post count
   */
  async getCategoriesWithCount() {
    return prisma.category.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Get category by name
   */
  async findByName(name: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { name },
    });
  }

  /**
   * Create category
   */
  async createCategory(data: {
    name: string;
    description?: string;
    iconUrl?: string;
  }): Promise<Category> {
    return prisma.category.create({
      data,
    });
  }
}
