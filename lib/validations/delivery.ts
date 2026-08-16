import { z } from 'zod';
import { LR_STATUSES } from '@/lib/constants/lr-statuses';

export const deliveryConfirmationSchema = z.object({
  lr_id: z.string().uuid('Invalid LR ID'),
  receiver_name: z
    .string()
    .trim()
    .min(2, 'Receiver name must be at least 2 characters')
    .max(100, 'Receiver name cannot exceed 100 characters'),
  delivered_at: z.string().optional().or(z.literal('')),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal('')),
  is_to_pay: z.boolean(),
  amount_collected_rupees: z.string().optional().or(z.literal('')),
  collection_payment_mode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER']).optional().or(z.literal('')),
  collected_by: z
    .string()
    .trim()
    .max(100, 'Collector name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  collection_notes: z
    .string()
    .trim()
    .max(500, 'Collection notes cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
});

export type DeliveryConfirmationInput = z.infer<typeof deliveryConfirmationSchema>;

export const lrTransitionSchema = z.object({
  lr_id: z.string().uuid('Invalid LR ID'),
  next_status: z.enum(LR_STATUSES as [string, ...string[]]),
  notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional().or(z.literal('')),
});

export type LRTransitionInput = z.infer<typeof lrTransitionSchema>;
