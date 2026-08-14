import { z } from 'zod';
import { INDIA_PHONE_REGEX } from '@/lib/utils/format-phone';

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const PIN_CODE_REGEX = /^\d{6}$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Tenant Self-Registration schema for Fleet Owners
 */
export const tenantRegisterSchema = z.object({
  // Company / Tenant Profile
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(
      SLUG_REGEX,
      'Slug must contain only lowercase letters, numbers, and hyphens (e.g. sharma-logistics)'
    ),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN_REGEX, 'Enter a valid 15-digit GSTIN (e.g. 27ABCDE1234F1Z5)')
    .optional()
    .or(z.literal('')),
  contactPhone: z
    .string()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  addressLine1: z
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
  pinCode: z
    .string()
    .regex(PIN_CODE_REGEX, 'Enter a valid 6-digit Indian PIN code'),

  // Fleet Owner User Account
  fullName: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export type TenantRegisterInput = z.infer<typeof tenantRegisterSchema>;

/**
 * Email/Password Login schema
 */
export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Phone OTP Login schemas
 */
export const phoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
});

export type PhoneOtpRequestInput = z.infer<typeof phoneOtpRequestSchema>;

export const phoneOtpVerifySchema = z.object({
  phone: z
    .string()
    .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number'),
  token: z.string().length(6, 'Enter the 6-digit verification code'),
});

export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;
