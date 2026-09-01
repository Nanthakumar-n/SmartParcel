import { z } from 'zod';
import { INDIA_PHONE_REGEX } from '@/lib/utils/format-phone';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PIN_CODE_REGEX = /^\d{6}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Company Profile schema for editing tenant details.
 */
export const companyProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug must be at least 3 characters')
    .max(40, 'Slug must be at most 40 characters')
    .regex(SLUG_REGEX, 'Slug can only contain lowercase alphanumeric characters and single hyphens (e.g. patel-logistics)'),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Enter a valid 15-digit GSTIN (e.g. 27ABCDE1234F1Z5)')
    .optional()
    .or(z.literal('')),
  contact_phone: z
    .string()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number (+91 or 10 digits)'),
  address_line1: z
    .string()
    .min(5, 'Address must be at least 5 characters')
    .max(200, 'Address must be less than 200 characters'),
  city: z
    .string()
    .min(2, 'City is required')
    .max(50, 'City must be less than 50 characters'),
  state: z
    .string()
    .min(2, 'State is required')
    .max(50, 'State must be less than 50 characters'),
  pin_code: z
    .string()
    .regex(PIN_CODE_REGEX, 'Enter a valid 6-digit Indian PIN code'),
});

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;

/**
 * LR & Waybill Format defaults schema.
 */
export const lrSettingsSchema = z.object({
  lr_terms_and_conditions: z
    .string()
    .max(2000, 'Terms and conditions must be under 2000 characters')
    .optional()
    .or(z.literal('')),
  lr_default_remarks: z
    .string()
    .max(500, 'Default remarks must be under 500 characters')
    .optional()
    .or(z.literal('')),
  waybill_format: z.enum(['THERMAL_3INCH', 'A4_STANDARD', 'A5_LANDSCAPE']),
  waybill_copies: z.number().int().min(1, 'Minimum 1 copy').max(3, 'Maximum 3 copies'),
  show_gst_breakdown: z.boolean(),
  show_tracking_qr: z.boolean(),
  show_terms_on_print: z.boolean(),
});

export type LRSettingsInput = z.infer<typeof lrSettingsSchema>;

/**
 * WhatsApp / WATI configuration schema.
 */
export const whatsappSettingsSchema = z.object({
  whatsapp_enabled: z.boolean(),
  wati_api_endpoint: z
    .string()
    .trim()
    .url('Enter a valid URL (e.g. https://live-server-12345.wati.io)')
    .optional()
    .or(z.literal('')),
  wati_api_token: z
    .string()
    .trim()
    .optional()
    .or(z.literal('')),
  notification_preferences: z.object({
    BOOKED: z.boolean(),
    IN_TRANSIT: z.boolean(),
    ARRIVED: z.boolean(),
    OUT_FOR_DELIVERY: z.boolean(),
    DELIVERED: z.boolean(),
    PAYMENT_REMINDER: z.boolean(),
  }),
  payment_reminder_days: z
    .number()
    .int()
    .min(1, 'Minimum 1 day delay')
    .max(30, 'Maximum 30 days delay'),
});

export type WhatsAppSettingsInput = z.infer<typeof whatsappSettingsSchema>;

/**
 * Connection test schema.
 */
export const testWatiConnectionSchema = z.object({
  wati_api_endpoint: z.string().trim().url('Enter a valid WATI API endpoint URL'),
  wati_api_token: z.string().trim().min(5, 'Enter a valid WATI API token'),
});

export type TestWatiConnectionInput = z.infer<typeof testWatiConnectionSchema>;
