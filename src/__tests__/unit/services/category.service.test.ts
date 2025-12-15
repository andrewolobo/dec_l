import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { CategoryService } from "../../../services/category.service";
import { categoryRepository } from "../../../dal/repositories";
import { createMockCategory } from "../../helpers/test-data";
import { ErrorCode } from "../../../types/common/api-response.types";

type MockedFunction = jest.MockedFunction<any>;

// Mock repositories
jest.mock("../../../dal/repositories", () => ({
  categoryRepository: {
    findById: jest.fn<any>(),
    findByName: jest.fn<any>(),
    getCategoriesWithCount: jest.fn<any>(),
    createCategory: jest.fn<any>(),
    update: jest.fn<any>(),
    delete: jest.fn<any>(),
  },
  userRepository: {},
  postRepository: {},
  likeRepository: {},
  viewRepository: {},
  postImageRepository: {},
  paymentRepository: {},
}));

describe("CategoryService", () => {
  let categoryService: CategoryService;
  let mockCategory: any;

  beforeEach(() => {
    jest.clearAllMocks();
    categoryService = new CategoryService();
    mockCategory = createMockCategory();
  });

  describe("getAllCategories", () => {
    it("should get all categories with post counts successfully", async () => {
      // Arrange
      const categories = [
        {
          ...createMockCategory({ name: "Electronics" }),
          _count: { posts: 5 },
        },
        {
          ...createMockCategory({ name: "Furniture" }),
          _count: { posts: 3 },
        },
        {
          ...createMockCategory({ name: "Clothing" }),
          _count: { posts: 0 },
        },
      ];

      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categories);

      // Act
      const result = await categoryService.getAllCategories();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(3);
      expect(result.data?.[0].name).toBe("Electronics");
      expect(result.data?.[0].postCount).toBe(5);
      expect(result.data?.[1].postCount).toBe(3);
      expect(result.data?.[2].postCount).toBe(0);
    });

    it("should return empty array when no categories exist", async () => {
      // Arrange
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue([]);

      // Act
      const result = await categoryService.getAllCategories();

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(0);
    });

    it("should handle database error", async () => {
      // Arrange
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockRejectedValue(new Error("Database error"));

      // Act
      const result = await categoryService.getAllCategories();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get categories");
    });
  });

  describe("getCategoryById", () => {
    it("should get category by ID successfully", async () => {
      // Arrange
      const categoriesWithCount = [
        {
          ...mockCategory,
          _count: { posts: 10 },
        },
      ];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.getCategoryById(mockCategory.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockCategory.id);
      expect(result.data?.name).toBe(mockCategory.name);
      expect(result.data?.postCount).toBe(10);
      expect(categoryRepository.findById).toHaveBeenCalledWith(mockCategory.id);
    });

    it("should return error when category not found", async () => {
      // Arrange
      (categoryRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await categoryService.getCategoryById(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Category not found");
    });

    it("should return zero post count when category has no posts", async () => {
      // Arrange
      const categoriesWithCount = [
        {
          ...mockCategory,
          _count: { posts: 0 },
        },
      ];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.getCategoryById(mockCategory.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.postCount).toBe(0);
    });

    it("should handle database error", async () => {
      // Arrange
      (categoryRepository.findById as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await categoryService.getCategoryById(mockCategory.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get category");
    });
  });

  describe("createCategory", () => {
    it("should create category successfully", async () => {
      // Arrange
      const createData = {
        name: "New Category",
        description: "Category description",
        iconUrl: "https://example.com/icon.png",
      };

      (categoryRepository.findByName as MockedFunction).mockResolvedValue(null);
      (categoryRepository.createCategory as MockedFunction).mockResolvedValue(
        mockCategory
      );

      // Act
      const result = await categoryService.createCategory(createData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockCategory.id);
      expect(result.data?.name).toBe(mockCategory.name);
      expect(result.data?.postCount).toBe(0);
      expect(categoryRepository.findByName).toHaveBeenCalledWith(
        createData.name
      );
      expect(categoryRepository.createCategory).toHaveBeenCalledWith({
        name: createData.name,
        description: createData.description,
        iconUrl: createData.iconUrl,
      });
    });

    it("should create category without description", async () => {
      // Arrange
      const createData = {
        name: "Minimal Category",
      };

      (categoryRepository.findByName as MockedFunction).mockResolvedValue(null);
      (categoryRepository.createCategory as MockedFunction).mockResolvedValue(
        mockCategory
      );

      // Act
      const result = await categoryService.createCategory(createData);

      // Assert
      expect(result.success).toBe(true);
      expect(categoryRepository.createCategory).toHaveBeenCalledWith({
        name: createData.name,
        description: undefined,
      });
    });

    it("should return error when category name already exists", async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: "Electronics" });
      (categoryRepository.findByName as MockedFunction).mockResolvedValue(
        existingCategory
      );

      // Act
      const result = await categoryService.createCategory({
        name: "Electronics",
        description: "Duplicate name",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_ALREADY_EXISTS);
      expect(result.error?.statusCode).toBe(409);
      expect(result.error?.message).toBe("Category name already exists");
    });

    it("should handle database error during creation", async () => {
      // Arrange
      (categoryRepository.findByName as MockedFunction).mockResolvedValue(null);
      (categoryRepository.createCategory as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await categoryService.createCategory({
        name: "New Category",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to create category");
    });
  });

  describe("updateCategory", () => {
    it("should update category successfully", async () => {
      // Arrange
      const updateData = {
        name: "Updated Category",
        description: "Updated description",
      };
      const updatedCategory = { ...mockCategory, ...updateData };
      const categoriesWithCount = [
        { ...updatedCategory, _count: { posts: 5 } },
      ];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (categoryRepository.findByName as MockedFunction).mockResolvedValue(null);
      (categoryRepository.update as MockedFunction).mockResolvedValue(
        updatedCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.updateCategory(
        mockCategory.id,
        updateData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe(updateData.name);
      expect(result.data?.description).toBe(updateData.description);
      expect(result.data?.postCount).toBe(5);
      expect(categoryRepository.update).toHaveBeenCalledWith(
        mockCategory.id,
        updateData
      );
    });

    it("should update only description without changing name", async () => {
      // Arrange
      const updateData = {
        description: "New description only",
      };
      const updatedCategory = { ...mockCategory, ...updateData };
      const categoriesWithCount = [
        { ...updatedCategory, _count: { posts: 0 } },
      ];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (categoryRepository.update as MockedFunction).mockResolvedValue(
        updatedCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.updateCategory(
        mockCategory.id,
        updateData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.description).toBe(updateData.description);
    });

    it("should return error when category not found", async () => {
      // Arrange
      (categoryRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await categoryService.updateCategory(999, {
        name: "Updated",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Category not found");
    });

    it("should return error when new name already exists", async () => {
      // Arrange
      const existingCategory = createMockCategory({ name: "Electronics" });
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (categoryRepository.findByName as MockedFunction).mockResolvedValue(
        existingCategory
      );

      // Act
      const result = await categoryService.updateCategory(mockCategory.id, {
        name: "Electronics",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_ALREADY_EXISTS);
      expect(result.error?.statusCode).toBe(409);
      expect(result.error?.message).toBe("Category name already exists");
    });

    it("should allow updating to same name", async () => {
      // Arrange
      const updateData = {
        name: mockCategory.name,
        description: "Updated description",
      };
      const updatedCategory = { ...mockCategory, ...updateData };
      const categoriesWithCount = [
        { ...updatedCategory, _count: { posts: 0 } },
      ];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (categoryRepository.update as MockedFunction).mockResolvedValue(
        updatedCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.updateCategory(
        mockCategory.id,
        updateData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(categoryRepository.findByName).not.toHaveBeenCalled();
    });

    it("should handle database error during update", async () => {
      // Arrange
      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (categoryRepository.update as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await categoryService.updateCategory(mockCategory.id, {
        description: "Updated",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to update category");
    });
  });

  describe("deleteCategory", () => {
    it("should delete category successfully", async () => {
      // Arrange
      const categoriesWithCount = [{ ...mockCategory, _count: { posts: 0 } }];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);
      (categoryRepository.delete as MockedFunction).mockResolvedValue({});

      // Act
      const result = await categoryService.deleteCategory(mockCategory.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Category deleted successfully");
      expect(categoryRepository.delete).toHaveBeenCalledWith(mockCategory.id);
    });

    it("should return error when category not found", async () => {
      // Arrange
      (categoryRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await categoryService.deleteCategory(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Category not found");
    });

    it("should return error when category has existing posts", async () => {
      // Arrange
      const categoriesWithCount = [{ ...mockCategory, _count: { posts: 15 } }];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);

      // Act
      const result = await categoryService.deleteCategory(mockCategory.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toBe(
        "Cannot delete category with 15 existing posts"
      );
      expect(categoryRepository.delete).not.toHaveBeenCalled();
    });

    it("should handle database error during deletion", async () => {
      // Arrange
      const categoriesWithCount = [{ ...mockCategory, _count: { posts: 0 } }];

      (categoryRepository.findById as MockedFunction).mockResolvedValue(
        mockCategory
      );
      (
        categoryRepository.getCategoriesWithCount as MockedFunction
      ).mockResolvedValue(categoriesWithCount);
      (categoryRepository.delete as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await categoryService.deleteCategory(mockCategory.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to delete category");
    });
  });
});
