import { categoryRepository } from "../dal/repositories";
import {
  CreateCategoryDTO,
  UpdateCategoryDTO,
  CategoryResponseDTO,
} from "../types/category/category.types";
import { ApiResponse, ErrorCode } from "../types/common/api-response.types";

/**
 * Category service
 */
export class CategoryService {
  /**
   * Get all categories with post counts
   */
  async getAllCategories(): Promise<ApiResponse<CategoryResponseDTO[]>> {
    try {
      const categories = await categoryRepository.getCategoriesWithCount();

      const categoryList: CategoryResponseDTO[] = categories.map(
        (cat: any) => ({
          id: cat.id,
          name: cat.name,
          description: cat.description || undefined,
          iconUrl: undefined, // Not in schema yet
          postCount: cat._count.posts,
          createdAt: cat.createdAt,
        })
      );

      return {
        success: true,
        data: categoryList,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get categories",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get category by ID
   */
  async getCategoryById(
    categoryId: number
  ): Promise<ApiResponse<CategoryResponseDTO>> {
    try {
      const category = await categoryRepository.findById(categoryId);

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

      // Get post count for this category
      const categoriesWithCount =
        await categoryRepository.getCategoriesWithCount();
      const categoryWithCount = categoriesWithCount.find(
        (c: any) => c.id === categoryId
      );

      return {
        success: true,
        data: {
          id: category.id,
          name: category.name,
          description: category.description || undefined,
          iconUrl: undefined, // Not in schema yet
          postCount: categoryWithCount?._count?.posts || 0,
          createdAt: category.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get category",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Create a new category
   */
  async createCategory(
    data: CreateCategoryDTO
  ): Promise<ApiResponse<CategoryResponseDTO>> {
    try {
      // Check if category name already exists
      const existingCategory = await categoryRepository.findByName(data.name);

      if (existingCategory) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_ALREADY_EXISTS,
            message: "Category name already exists",
            statusCode: 409,
          },
        };
      }

      // Create category
      const category = await categoryRepository.createCategory({
        name: data.name,
        description: data.description,
      });

      return {
        success: true,
        data: {
          id: category.id,
          name: category.name,
          description: category.description || undefined,
          iconUrl: data.iconUrl,
          postCount: 0,
          createdAt: category.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create category",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Update a category
   */
  async updateCategory(
    categoryId: number,
    data: UpdateCategoryDTO
  ): Promise<ApiResponse<CategoryResponseDTO>> {
    try {
      // Check if category exists
      const category = await categoryRepository.findById(categoryId);

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

      // Check if new name already exists (if name is being updated)
      if (data.name && data.name !== category.name) {
        const existingCategory = await categoryRepository.findByName(data.name);
        if (existingCategory) {
          return {
            success: false,
            error: {
              code: ErrorCode.RESOURCE_ALREADY_EXISTS,
              message: "Category name already exists",
              statusCode: 409,
            },
          };
        }
      }

      // Update category
      const updatedCategory = await categoryRepository.update(categoryId, data);

      // Get post count
      const categoriesWithCount =
        await categoryRepository.getCategoriesWithCount();
      const categoryWithCount = categoriesWithCount.find(
        (c: any) => c.id === categoryId
      );

      return {
        success: true,
        data: {
          id: updatedCategory.id,
          name: updatedCategory.name,
          description: updatedCategory.description || undefined,
          iconUrl: data.iconUrl,
          postCount: categoryWithCount?._count?.posts || 0,
          createdAt: updatedCategory.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to update category",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Delete a category
   */
  async deleteCategory(
    categoryId: number
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      // Check if category exists
      const category = await categoryRepository.findById(categoryId);

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

      // Check if category has posts
      const categoriesWithCount =
        await categoryRepository.getCategoriesWithCount();
      const categoryWithCount = categoriesWithCount.find(
        (c: any) => c.id === categoryId
      );

      if (categoryWithCount && categoryWithCount._count.posts > 0) {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: `Cannot delete category with ${categoryWithCount._count.posts} existing posts`,
            statusCode: 400,
          },
        };
      }

      // Delete category
      await categoryRepository.delete(categoryId);

      return {
        success: true,
        data: {
          message: "Category deleted successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to delete category",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }
}

// Export singleton instance
export const categoryService = new CategoryService();
