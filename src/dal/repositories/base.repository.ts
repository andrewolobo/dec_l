import prisma from '../prisma.client';
import { Prisma } from '@prisma/client';

/**
 * Base Repository
 * Provides common CRUD operations for all repositories
 */
export abstract class BaseRepository<T> {
  protected abstract modelName: Prisma.ModelName;

  /**
   * Get Prisma delegate for the model
   */
  protected getModel() {
    return (prisma as any)[this.modelName.toLowerCase()];
  }

  /**
   * Find by ID
   */
  async findById(id: number, include?: any): Promise<T | null> {
    return this.getModel().findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Find all with optional filters
   */
  async findAll(options?: {
    where?: any;
    include?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<T[]> {
    return this.getModel().findMany(options);
  }

  /**
   * Find one by criteria
   */
  async findOne(where: any, include?: any): Promise<T | null> {
    return this.getModel().findFirst({
      where,
      include,
    });
  }

  /**
   * Create new record
   */
  async create(data: any): Promise<T> {
    return this.getModel().create({ data });
  }

  /**
   * Update record
   */
  async update(id: number, data: any): Promise<T> {
    return this.getModel().update({
      where: { id },
      data,
    });
  }

  /**
   * Delete record
   */
  async delete(id: number): Promise<T> {
    return this.getModel().delete({
      where: { id },
    });
  }

  /**
   * Count records
   */
  async count(where?: any): Promise<number> {
    return this.getModel().count({ where });
  }

  /**
   * Check if record exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.getModel().count({ where });
    return count > 0;
  }

  /**
   * Execute transaction
   */
  async transaction<R>(
    callback: (tx: Prisma.TransactionClient) => Promise<R>
  ): Promise<R> {
    return prisma.$transaction(callback);
  }
}
