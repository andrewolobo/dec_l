import { BaseRepository } from "./base.repository";
import { PostImage, Prisma } from "@prisma/client";
import prisma from "../prisma.client";

export class PostImageRepository extends BaseRepository<PostImage> {
  protected modelName = Prisma.ModelName.PostImage;

  /**
   * Add image to post
   */
  async addImage(
    postId: number,
    data: { imageUrl: string; displayOrder: number }
  ) {
    return prisma.postImage.create({
      data: {
        postId,
        imageUrl: data.imageUrl,
        displayOrder: data.displayOrder,
      },
    });
  }

  /**
   * Get all images for a post
   */
  async getByPostId(postId: number) {
    return prisma.postImage.findMany({
      where: { postId },
      orderBy: { displayOrder: "asc" },
    });
  }

  /**
   * Update image display order
   */
  async updateDisplayOrder(imageId: number, displayOrder: number) {
    return prisma.postImage.update({
      where: { id: imageId },
      data: { displayOrder },
    });
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: number) {
    return prisma.postImage.delete({
      where: { id: imageId },
    });
  }

  /**
   * Delete all images for a post
   */
  async deleteByPostId(postId: number) {
    return prisma.postImage.deleteMany({
      where: { postId },
    });
  }

  /**
   * Count images for a post
   */
  async countByPostId(postId: number) {
    return prisma.postImage.count({
      where: { postId },
    });
  }

  /**
   * Reorder images for a post
   */
  async reorderImages(
    postId: number,
    imageOrders: { imageId: number; displayOrder: number }[]
  ) {
    const updates = imageOrders.map(({ imageId, displayOrder }) =>
      prisma.postImage.update({
        where: { id: imageId },
        data: { displayOrder },
      })
    );

    return prisma.$transaction(updates);
  }
}
