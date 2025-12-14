/**
 * Pricing tier DTO
 */
export interface PricingTierDTO {
  id: number;
  name: string;
  description?: string;
  price: number;
  durationDays: number;
  features?: string[];
}

/**
 * Create payment DTO
 */
export interface CreatePaymentDTO {
  postId: number;
  pricingTierId: number;
  paymentMethod: PaymentMethod;
}

/**
 * Payment response DTO
 */
export interface PaymentResponseDTO {
  id: number;
  postId: number;
  userId: number;
  pricingTier: PricingTierDTO;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionReference?: string;
  paymentDate?: Date;
  createdAt: Date;
}

/**
 * Payment method enum
 */
export enum PaymentMethod {
  CARD = 'Card',
  MOBILE_MONEY = 'MobileMoney',
  BANK_TRANSFER = 'BankTransfer',
}

/**
 * Payment status enum
 */
export enum PaymentStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  FAILED = 'Failed',
  REFUNDED = 'Refunded',
}

/**
 * Payment confirmation DTO
 */
export interface PaymentConfirmationDTO {
  paymentId: number;
  transactionReference: string;
}

/**
 * User payment history DTO
 */
export interface UserPaymentHistoryDTO {
  payments: PaymentResponseDTO[];
  totalSpent: number;
  totalPayments: number;
}
