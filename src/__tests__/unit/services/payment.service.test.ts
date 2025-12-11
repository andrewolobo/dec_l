import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PaymentService } from "../../../services/payment.service";
import {
  paymentRepository,
  userRepository,
  postRepository,
} from "../../../dal/repositories";
import {
  createMockUser,
  createMockPost,
  createMockPayment,
} from "../../helpers/test-data";
import { ErrorCode } from "../../../types/common/api-response.types";

type MockedFunction = jest.MockedFunction<any>;

// Mock repositories
jest.mock("../../../dal/repositories", () => ({
  paymentRepository: {
    findById: jest.fn<any>(),
    createPayment: jest.fn<any>(),
    update: jest.fn<any>(),
    getUserPayments: jest.fn<any>(),
    getPostPayments: jest.fn<any>(),
    failPayment: jest.fn<any>(),
  },
  userRepository: {
    findById: jest.fn<any>(),
  },
  postRepository: {
    findById: jest.fn<any>(),
  },
  categoryRepository: {},
  likeRepository: {},
  viewRepository: {},
  postImageRepository: {},
}));

describe("PaymentService", () => {
  let paymentService: PaymentService;
  let mockUser: any;
  let mockPost: any;
  let mockPayment: any;

  beforeEach(() => {
    jest.clearAllMocks();
    paymentService = new PaymentService();
    mockUser = createMockUser();
    mockPost = createMockPost(999, 1); // Different user owns the post
    mockPayment = createMockPayment(mockUser.id, mockPost.id);
  });

  describe("createPayment", () => {
    it("should create payment successfully", async () => {
      // Arrange
      const createData = {
        postId: mockPost.id,
        pricingTierId: 1,
        paymentMethod: "MobileMoney" as any,
      };

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (paymentRepository.createPayment as MockedFunction).mockResolvedValue(
        mockPayment
      );

      // Act
      const result = await paymentService.createPayment(
        mockUser.id,
        createData
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.postId).toBe(mockPost.id);
      expect(result.data?.userId).toBe(mockUser.id);
      expect(result.data?.paymentStatus).toBe(mockPayment.status);
      expect(paymentRepository.createPayment).toHaveBeenCalledWith({
        postId: createData.postId,
        userId: mockUser.id,
        amount: Number(mockPost.price),
        currency: "UGX",
        paymentMethod: createData.paymentMethod,
      });
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.createPayment(999, {
        postId: mockPost.id,
        pricingTierId: 1,
        paymentMethod: "MobileMoney" as any,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("User not found");
    });

    it("should return error when post not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.createPayment(mockUser.id, {
        postId: 999,
        pricingTierId: 1,
        paymentMethod: "Card" as any,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Post not found");
    });

    it("should return error when user tries to pay for own post", async () => {
      // Arrange
      const ownPost = createMockPost(mockUser.id, 1); // User owns this post

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findById as MockedFunction).mockResolvedValue(ownPost);

      // Act
      const result = await paymentService.createPayment(mockUser.id, {
        postId: ownPost.id,
        pricingTierId: 1,
        paymentMethod: "Card" as any,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toBe(
        "You cannot make payment for your own post"
      );
    });

    it("should handle database error during payment creation", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (paymentRepository.createPayment as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.createPayment(mockUser.id, {
        postId: mockPost.id,
        pricingTierId: 1,
        paymentMethod: "Card" as any,
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to create payment");
    });
  });

  describe("confirmPayment", () => {
    it("should confirm payment successfully", async () => {
      // Arrange
      const confirmData = {
        paymentId: mockPayment.id,
        transactionReference: "TXN-12345",
      };
      const confirmedPayment = {
        ...mockPayment,
        status: "Confirmed",
        transactionReference: "TXN-12345",
        confirmedAt: new Date(),
      };

      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        mockPayment
      );
      (paymentRepository.update as MockedFunction).mockResolvedValue(
        confirmedPayment
      );

      // Act
      const result = await paymentService.confirmPayment(confirmData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.paymentStatus).toBe("Confirmed");
      expect(result.data?.transactionReference).toBe("TXN-12345");
      expect(paymentRepository.update).toHaveBeenCalledWith(
        mockPayment.id,
        expect.objectContaining({
          transactionReference: "TXN-12345",
          status: "Confirmed",
        })
      );
    });

    it("should return error when payment not found", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.confirmPayment({
        paymentId: 999,
        transactionReference: "TXN-12345",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Payment not found");
    });

    it("should return error when payment already confirmed", async () => {
      // Arrange
      const confirmedPayment = createMockPayment(mockUser.id, mockPost.id, {
        status: "Confirmed",
      });

      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        confirmedPayment
      );

      // Act
      const result = await paymentService.confirmPayment({
        paymentId: confirmedPayment.id,
        transactionReference: "TXN-12345",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toBe("Payment already confirmed");
    });

    it("should handle database error during confirmation", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        mockPayment
      );
      (paymentRepository.update as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.confirmPayment({
        paymentId: mockPayment.id,
        transactionReference: "TXN-12345",
      });

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to confirm payment");
    });
  });

  describe("getPaymentById", () => {
    it("should get payment by ID successfully", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        mockPayment
      );

      // Act
      const result = await paymentService.getPaymentById(mockPayment.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe(mockPayment.id);
      expect(result.data?.postId).toBe(mockPayment.postId);
      expect(result.data?.userId).toBe(mockPayment.userId);
    });

    it("should return error when payment not found", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.getPaymentById(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Payment not found");
    });

    it("should handle database error", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.getPaymentById(mockPayment.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get payment");
    });
  });

  describe("getUserPaymentHistory", () => {
    it("should get user payment history successfully", async () => {
      // Arrange
      const payments = [
        createMockPayment(mockUser.id, mockPost.id, {
          status: "Confirmed",
          amount: 50000,
        }),
        createMockPayment(mockUser.id, mockPost.id, {
          status: "Confirmed",
          amount: 30000,
        }),
        createMockPayment(mockUser.id, mockPost.id, {
          status: "Pending",
          amount: 20000,
        }),
      ];

      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (paymentRepository.getUserPayments as MockedFunction).mockResolvedValue(
        payments
      );

      // Act
      const result = await paymentService.getUserPaymentHistory(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.payments.length).toBe(3);
      expect(result.data?.totalPayments).toBe(3);
      expect(result.data?.totalSpent).toBe(80000); // Only confirmed payments
    });

    it("should return empty history for user with no payments", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (paymentRepository.getUserPayments as MockedFunction).mockResolvedValue(
        []
      );

      // Act
      const result = await paymentService.getUserPaymentHistory(mockUser.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.payments.length).toBe(0);
      expect(result.data?.totalPayments).toBe(0);
      expect(result.data?.totalSpent).toBe(0);
    });

    it("should return error when user not found", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.getUserPaymentHistory(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("User not found");
    });

    it("should handle database error", async () => {
      // Arrange
      (userRepository.findById as MockedFunction).mockResolvedValue(mockUser);
      (paymentRepository.getUserPayments as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.getUserPaymentHistory(mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get payment history");
    });
  });

  describe("getPostPayments", () => {
    it("should get post payments successfully", async () => {
      // Arrange
      const payments = [
        createMockPayment(mockUser.id, mockPost.id),
        createMockPayment(999, mockPost.id),
      ];

      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (paymentRepository.getPostPayments as MockedFunction).mockResolvedValue(
        payments
      );

      // Act
      const result = await paymentService.getPostPayments(mockPost.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBe(2);
      expect(paymentRepository.getPostPayments).toHaveBeenCalledWith(
        mockPost.id
      );
    });

    it("should return empty array for post with no payments", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (paymentRepository.getPostPayments as MockedFunction).mockResolvedValue(
        []
      );

      // Act
      const result = await paymentService.getPostPayments(mockPost.id);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(0);
    });

    it("should return error when post not found", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.getPostPayments(999);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Post not found");
    });

    it("should handle database error", async () => {
      // Arrange
      (postRepository.findById as MockedFunction).mockResolvedValue(mockPost);
      (paymentRepository.getPostPayments as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.getPostPayments(mockPost.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to get post payments");
    });
  });

  describe("cancelPayment", () => {
    it("should cancel payment successfully", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        mockPayment
      );
      (paymentRepository.failPayment as MockedFunction).mockResolvedValue({
        ...mockPayment,
        status: "Failed",
      });

      // Act
      const result = await paymentService.cancelPayment(
        mockPayment.id,
        mockUser.id
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Payment cancelled successfully");
      expect(paymentRepository.failPayment).toHaveBeenCalledWith(
        mockPayment.id
      );
    });

    it("should return error when payment not found", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(null);

      // Act
      const result = await paymentService.cancelPayment(999, mockUser.id);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      expect(result.error?.statusCode).toBe(404);
      expect(result.error?.message).toBe("Payment not found");
    });

    it("should return error when user does not own payment", async () => {
      // Arrange
      const otherUserPayment = createMockPayment(999, mockPost.id);
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        otherUserPayment
      );

      // Act
      const result = await paymentService.cancelPayment(
        otherUserPayment.id,
        mockUser.id
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.error?.statusCode).toBe(403);
      expect(result.error?.message).toBe(
        "You can only cancel your own payments"
      );
    });

    it("should return error when trying to cancel confirmed payment", async () => {
      // Arrange
      const confirmedPayment = createMockPayment(mockUser.id, mockPost.id, {
        status: "Confirmed",
      });
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        confirmedPayment
      );

      // Act
      const result = await paymentService.cancelPayment(
        confirmedPayment.id,
        mockUser.id
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toBe("Cannot cancel confirmed payment");
    });

    it("should return error when payment already cancelled", async () => {
      // Arrange
      const failedPayment = createMockPayment(mockUser.id, mockPost.id, {
        status: "Failed",
      });
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        failedPayment
      );

      // Act
      const result = await paymentService.cancelPayment(
        failedPayment.id,
        mockUser.id
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.BAD_REQUEST);
      expect(result.error?.statusCode).toBe(400);
      expect(result.error?.message).toBe("Payment already cancelled");
    });

    it("should handle database error during cancellation", async () => {
      // Arrange
      (paymentRepository.findById as MockedFunction).mockResolvedValue(
        mockPayment
      );
      (paymentRepository.failPayment as MockedFunction).mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const result = await paymentService.cancelPayment(
        mockPayment.id,
        mockUser.id
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.error?.statusCode).toBe(500);
      expect(result.error?.message).toBe("Failed to cancel payment");
    });
  });
});
