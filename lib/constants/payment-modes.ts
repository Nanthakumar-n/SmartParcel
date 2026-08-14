import type { PaymentMode, CollectionPaymentMode } from '@/lib/types/lr';

/**
 * LR payment modes (how the freight is paid).
 */
export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'PAID', label: 'Paid' },
  { value: 'TO_PAY', label: 'To Pay' },
  { value: 'TBB', label: 'To Be Billed (TBB)' },
];

/**
 * Collection payment modes (how To-Pay amount is collected on delivery).
 */
export const COLLECTION_PAYMENT_MODES: {
  value: CollectionPaymentMode;
  label: string;
}[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
];
