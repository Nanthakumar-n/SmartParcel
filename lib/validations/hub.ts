import { z } from 'zod';
import { INDIA_PHONE_REGEX } from '@/lib/utils/format-phone';
import { PIN_CODE_REGEX } from '@/lib/validations/auth';

export const HUB_CODE_REGEX = /^[A-Z0-9]{2,10}$/;

export const hubSchema = z.object({
  hub_code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Hub code must be at least 2 characters')
    .max(10, 'Hub code must be at most 10 characters')
    .regex(HUB_CODE_REGEX, 'Hub code must contain only uppercase letters and digits (e.g. MUM, DEL, BLR01)'),
  name: z
    .string()
    .trim()
    .min(2, 'Hub name must be at least 2 characters')
    .max(100, 'Hub name must be at most 100 characters'),
  address_line1: z
    .string()
    .trim()
    .min(3, 'Address is required')
    .max(200, 'Address must be less than 200 characters'),
  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .max(50, 'City must be less than 50 characters'),
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(50, 'State must be less than 50 characters'),
  pin_code: z
    .string()
    .trim()
    .regex(PIN_CODE_REGEX, 'Enter a valid 6-digit Indian PIN code'),
  contact_phone: z
    .string()
    .trim()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  latitude: z.string().optional().or(z.literal('')),
  longitude: z.string().optional().or(z.literal('')),
  is_active: z.boolean(),
});

export type HubInput = z.infer<typeof hubSchema>;
