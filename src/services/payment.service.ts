import {
  paymentRepository,
  userRepository,
  postRepository,
} from "../dal/repositories";
import {
  CreatePaymentDTO,
  PaymentResponseDTO,
  PaymentConfirmationDTO,
  UserPaymentHistoryDTO,
  PricingTierDTO,
} from "../types/payment/payment.types";
import { ApiResponse, ErrorCode } from "../types/common/api-response.types";

/**
 * Payment service
 */
export class PaymentService {
  /**
   * Create a new payment
   */
  async createPayment(
    userId: number,
    data: CreatePaymentDTO
  ): Promise<ApiResponse<PaymentResponseDTO>> {
    try {
      // Verify user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      // Verify post exists
      const post = await postRepository.findById(data.postId);
      if (!post) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Post not found",
            statusCode: 404,
          },
        };
      }

      // Check if user is the post owner
      if (post.userId === userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "You cannot make payment for your own post",
            statusCode: 400,
          },
        };
      }

      // TODO: Get pricing tier details from database
      // For now, use post price
      const amount = post.price;

      // Create payment record
      const payment = await paymentRepository.createPayment({
        postId: data.postId,
        userId,
        amount: Number(amount),
        currency: "UGX",
        paymentMethod: data.paymentMethod,
      });

      return {
        success: true,
        data: {
          id: payment.id,
          postId: payment.postId,
          userId: payment.userId,
          pricingTier: {
            id: data.pricingTierId,
            name: "Standard",
            price: Number(amount),
            durationDays: 30,
          },
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod as any,
          paymentStatus: payment.status as any,
          transactionReference: payment.transactionReference || undefined,
          paymentDate: payment.confirmedAt || undefined,
          createdAt: payment.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to create payment",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Confirm a payment
   */
  async confirmPayment(
    data: PaymentConfirmationDTO
  ): Promise<ApiResponse<PaymentResponseDTO>> {
    try {
      // Find payment
      const payment = await paymentRepository.findById(data.paymentId);

      if (!payment) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Payment not found",
            statusCode: 404,
          },
        };
      }

      // Check if payment is already confirmed
      if (payment.status === "Confirmed") {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "Payment already confirmed",
            statusCode: 400,
          },
        };
      }

      // Update payment with transaction reference and confirm
      const confirmedPayment = await paymentRepository.update(payment.id, {
        transactionReference: data.transactionReference,
        status: "Confirmed",
        confirmedAt: new Date(),
      });

      return {
        success: true,
        data: {
          id: confirmedPayment.id,
          postId: confirmedPayment.postId,
          userId: confirmedPayment.userId,
          pricingTier: {
            id: 1,
            name: "Standard",
            price: Number(confirmedPayment.amount),
            durationDays: 30,
          },
          amount: Number(confirmedPayment.amount),
          paymentMethod: confirmedPayment.paymentMethod as any,
          paymentStatus: confirmedPayment.status as any,
          transactionReference:
            confirmedPayment.transactionReference || undefined,
          paymentDate: confirmedPayment.confirmedAt || undefined,
          createdAt: confirmedPayment.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to confirm payment",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(
    paymentId: number
  ): Promise<ApiResponse<PaymentResponseDTO>> {
    try {
      const payment = await paymentRepository.findById(paymentId);

      if (!payment) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Payment not found",
            statusCode: 404,
          },
        };
      }

      return {
        success: true,
        data: {
          id: payment.id,
          postId: payment.postId,
          userId: payment.userId,
          pricingTier: {
            id: 1,
            name: "Standard",
            price: Number(payment.amount),
            durationDays: 30,
          },
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod as any,
          paymentStatus: payment.status as any,
          transactionReference: payment.transactionReference || undefined,
          paymentDate: payment.confirmedAt || undefined,
          createdAt: payment.createdAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get payment",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get user payment history
   */
  async getUserPaymentHistory(
    userId: number
  ): Promise<ApiResponse<UserPaymentHistoryDTO>> {
    try {
      const user = await userRepository.findById(userId);

      if (!user) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "User not found",
            statusCode: 404,
          },
        };
      }

      const payments = await paymentRepository.getUserPayments(userId);

      const paymentList: PaymentResponseDTO[] = payments.map(
        (payment: any) => ({
          id: payment.id,
          postId: payment.postId,
          userId: payment.userId,
          pricingTier: {
            id: 1,
            name: "Standard",
            price: Number(payment.amount),
            durationDays: 30,
          },
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.status,
          transactionReference: payment.transactionReference || undefined,
          paymentDate: payment.confirmedAt || undefined,
          createdAt: payment.createdAt,
        })
      );

      const totalSpent = payments.reduce(
        (sum: number, payment: any) =>
          payment.status === "Confirmed" ? sum + Number(payment.amount) : sum,
        0
      );

      return {
        success: true,
        data: {
          payments: paymentList,
          totalSpent,
          totalPayments: payments.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get payment history",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Get post payments
   */
  async getPostPayments(
    postId: number
  ): Promise<ApiResponse<PaymentResponseDTO[]>> {
    try {
      const post = await postRepository.findById(postId);

      if (!post) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Post not found",
            statusCode: 404,
          },
        };
      }

      const payments = await paymentRepository.getPostPayments(postId);

      const paymentList: PaymentResponseDTO[] = payments.map(
        (payment: any) => ({
          id: payment.id,
          postId: payment.postId,
          userId: payment.userId,
          pricingTier: {
            id: 1,
            name: "Standard",
            price: Number(payment.amount),
            durationDays: 30,
          },
          amount: Number(payment.amount),
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.status,
          transactionReference: payment.transactionReference || undefined,
          paymentDate: payment.confirmedAt || undefined,
          createdAt: payment.createdAt,
        })
      );

      return {
        success: true,
        data: paymentList,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to get post payments",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Cancel a payment (mark as failed)
   */
  async cancelPayment(
    paymentId: number,
    userId: number
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      const payment = await paymentRepository.findById(paymentId);

      if (!payment) {
        return {
          success: false,
          error: {
            code: ErrorCode.RESOURCE_NOT_FOUND,
            message: "Payment not found",
            statusCode: 404,
          },
        };
      }

      // Check if user owns the payment
      if (payment.userId !== userId) {
        return {
          success: false,
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "You can only cancel your own payments",
            statusCode: 403,
          },
        };
      }

      // Check if payment can be cancelled
      if (payment.status === "Confirmed") {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "Cannot cancel confirmed payment",
            statusCode: 400,
          },
        };
      }

      if (payment.status === "Failed") {
        return {
          success: false,
          error: {
            code: ErrorCode.BAD_REQUEST,
            message: "Payment already cancelled",
            statusCode: 400,
          },
        };
      }

      // Mark payment as failed
      await paymentRepository.failPayment(paymentId);

      return {
        success: true,
        data: {
          message: "Payment cancelled successfully",
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: "Failed to cancel payment",
          details: error instanceof Error ? error.message : undefined,
          statusCode: 500,
        },
      };
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
