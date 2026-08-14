import type { LRStatus } from '@/lib/types/lr';

/**
 * All LR statuses in lifecycle order.
 */
export const LR_STATUSES: LRStatus[] = [
  'BOOKING_PENDING',
  'BOOKED',
  'PICKED_UP',
  'IN_TRANSIT',
  'ARRIVED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

/**
 * Human-readable labels for LR statuses.
 */
export const LR_STATUS_LABELS: Record<LRStatus, string> = {
  BOOKING_PENDING: 'Booking Pending',
  BOOKED: 'Booked',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVED: 'Arrived',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

/**
 * Tailwind color classes for LR status badges.
 * Uses light theme colors appropriate for shadcn/ui Badge component.
 */
export const LR_STATUS_COLORS: Record<LRStatus, string> = {
  BOOKING_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  BOOKED: 'bg-blue-100 text-blue-800 border-blue-200',
  PICKED_UP: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  IN_TRANSIT: 'bg-purple-100 text-purple-800 border-purple-200',
  ARRIVED: 'bg-teal-100 text-teal-800 border-teal-200',
  OUT_FOR_DELIVERY: 'bg-orange-100 text-orange-800 border-orange-200',
  DELIVERED: 'bg-green-100 text-green-800 border-green-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

/**
 * Terminal statuses — no further transitions allowed.
 */
export const TERMINAL_STATUSES: LRStatus[] = ['DELIVERED', 'CANCELLED'];

/**
 * Active (non-terminal) statuses.
 */
export const ACTIVE_STATUSES: LRStatus[] = LR_STATUSES.filter(
  (s) => !TERMINAL_STATUSES.includes(s)
);
