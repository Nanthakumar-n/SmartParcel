import { z } from 'zod';
import { INDIA_PHONE_REGEX } from '@/lib/utils/format-phone';

export const driverSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be at most 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  license_number: z
    .string()
    .trim()
    .toUpperCase()
    .max(30, 'License number must be at most 30 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  is_active: z.boolean(),
});

export type DriverInput = z.infer<typeof driverSchema>;
