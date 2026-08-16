import { z } from 'zod';

const INDIA_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

export const customerBookingSchema = z.object({
  customer_name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name is too long'),
  customer_phone: z
    .string()
    .trim()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number (+91...)'),
  origin_city: z
    .string()
    .trim()
    .min(2, 'Origin city must be at least 2 characters')
    .max(100, 'Origin city is too long'),
  destination_city: z
    .string()
    .trim()
    .min(2, 'Destination city must be at least 2 characters')
    .max(100, 'Destination city is too long'),
  goods_description: z
    .string()
    .trim()
    .min(2, 'Goods description must be at least 2 characters')
    .max(255, 'Description is too long'),
  quantity: z
    .string()
    .trim()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number.isInteger(Number(v)), {
      message: 'Quantity must be a positive integer',
    }),
  weight_kg: z
    .string()
    .trim()
    .refine((v) => !v || (!isNaN(Number(v)) && Number(v) > 0 && Number(v) <= 50000), {
      message: 'Weight must be a positive number up to 50,000 kg',
    })
    .optional()
    .or(z.literal('')),
  num_packages: z
    .string()
    .trim()
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number.isInteger(Number(v)), {
      message: 'Number of packages must be a positive integer',
    }),
});

export type CustomerBookingInput = z.infer<typeof customerBookingSchema>;

export const rejectBookingSchema = z.object({
  rejection_reason: z
    .string()
    .trim()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(500, 'Rejection reason is too long'),
});

export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;
