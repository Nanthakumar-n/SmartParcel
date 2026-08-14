export type LRStatus =
  | 'BOOKING_PENDING'
  | 'BOOKED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMode = 'PAID' | 'TO_PAY' | 'TBB';

export type LRSource = 'HUB_DIRECT' | 'CUSTOMER_REQUEST';

export type CollectionPaymentMode = 'CASH' | 'UPI' | 'BANK_TRANSFER';

export type VehicleType = 'TRUCK' | 'MINI_TRUCK' | 'TEMPO';

export type VehicleStatus = 'AVAILABLE' | 'IN_TRANSIT' | 'UNDER_MAINTENANCE';

export type TripStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type BookingRequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';
