import { BaseRepository } from './base.repository';
import { Payment, Prisma } from '@prisma/client';
import prisma from '../prisma.client';

export class PaymentRepository extends BaseRepository<Payment> {
  protected modelName = Prisma.ModelName.Payment;

  /**
   * Create payment record
   */
  async createPayment(data: {
    postId: number;
    userId: number;
    amount: number;
    currency?: string;
    paymentMethod: string;
    transactionReference?: string;
  }): Promise<Payment> {
    return prisma.payment.create({
      data: {
        ...data,
        status: 'Pending',
        currency: data.currency || 'UGX',
      },
    });
  }

  /**
   * Confirm payment
   */
  async confirmPayment(paymentId: number): Promise<Payment> {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'Confirmed',
        confirmedAt: new Date(),
      },
    });
  }

  /**
   * Mark payment as failed
   */
  async failPayment(paymentId: number): Promise<Payment> {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'Failed',
      },
    });
  }

  /**
   * Find payment by transaction reference
   */
  async findByTransactionRef(reference: string): Promise<Payment | null> {
    return prisma.payment.findFirst({
      where: { transactionReference: reference },
    });
  }

  /**
   * Get post payments
   */
  async getPostPayments(postId: number) {
    return prisma.payment.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user payments
   */
  async getUserPayments(userId: number) {
    return prisma.payment.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending payments
   */
  async getPendingPayments() {
    return prisma.payment.findMany({
      where: { status: 'Pending' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
