/**
 * Create category DTO
 */
export interface CreateCategoryDTO {
  name: string;
  description?: string;
  iconUrl?: string;
}

/**
 * Update category DTO
 */
export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  iconUrl?: string;
}

/**
 * Category response DTO
 */
export interface CategoryResponseDTO {
  id: number;
  name: string;
  description?: string;
  iconUrl?: string;
  postCount: number;
  createdAt: Date;
}
