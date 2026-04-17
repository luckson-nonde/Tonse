// Payment types
export interface Payment {
  id: string;
  transactionId: string;
  userId: string;
  type: PaymentType;
  amount: number;
  fee: number;
  netAmount: number;
  status: PaymentStatus;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentType {
  DEPOSIT = 'DEPOSIT',
  PAYMENT = 'PAYMENT',
  WITHDRAWAL = 'WITHDRAWAL',
  REFUND = 'REFUND',
  TRANSFER = 'TRANSFER',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface PaymentFilter {
  type?: PaymentType;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}
