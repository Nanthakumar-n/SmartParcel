import { z } from 'zod';

const INDIA_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export const lrCreateSchema = z
  .object({
    booking_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)'),
    from_hub_id: z.string().uuid('Please select an origin hub'),
    to_hub_id: z.string().uuid('Please select a destination hub'),
    trip_id: z.string().uuid().optional().or(z.literal('')),
    booking_request_id: z.string().uuid().optional().or(z.literal('')),

    // Consignor (Sender)
    consignor_name: z
      .string()
      .trim()
      .min(2, 'Consignor name must be at least 2 characters')
      .max(100, 'Consignor name is too long'),
    consignor_phone: z
      .string()
      .trim()
      .regex(INDIA_PHONE_REGEX, 'Enter a valid Indian mobile number (+91...)'),
    consignor_gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN')
      .optional()
      .or(z.literal('')),
    consignor_address_line1: z
      .string()
      .trim()
      .max(150, 'Address is too long')
      .optional()
      .or(z.literal('')),
    consignor_address_line2: z
      .string()
      .trim()
      .max(150, 'Address/Landmark is too long')
      .optional()
      .or(z.literal('')),
    consignor_pin_code: z
      .string()
      .trim()
      .refine((v) => !v || /^\d{6}$/.test(v), {
        message: 'Enter a valid 6-digit PIN code',
      })
      .optional()
      .or(z.literal('')),

    // Consignee (Receiver)
    consignee_name: z
      .string()
      .trim()
      .min(2, 'Consignee name must be at least 2 characters')
      .max(100, 'Consignee name is too long'),
    consignee_phone: z
      .string()
      .trim()
      .regex(INDIA_PHONE_REGEX, 'Enter a valid Indian mobile number (+91...)'),
    consignee_gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN')
      .optional()
      .or(z.literal('')),
    consignee_address_line1: z
      .string()
      .trim()
      .max(150, 'Address is too long')
      .optional()
      .or(z.literal('')),
    consignee_address_line2: z
      .string()
      .trim()
      .max(150, 'Address/Landmark is too long')
      .optional()
      .or(z.literal('')),
    consignee_pin_code: z
      .string()
      .trim()
      .refine((v) => !v || /^\d{6}$/.test(v), {
        message: 'Enter a valid 6-digit PIN code',
      })
      .optional()
      .or(z.literal('')),

    // Cargo Details
    goods_description: z
      .string()
      .trim()
      .min(2, 'Please provide a goods description')
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

    // Financials
    freight_amount_rupees: z
      .string()
      .trim()
      .refine((v) => !isNaN(Number(v)) && Number(v) >= 0, {
        message: 'Freight amount must be a positive number',
      }),
    payment_mode: z.enum(['PAID', 'TO_PAY', 'TBB']),
    expected_delivery_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date (YYYY-MM-DD)')
      .optional()
      .or(z.literal('')),
  })
  .refine((data) => data.from_hub_id !== data.to_hub_id, {
    message: 'Origin and Destination hubs cannot be the same',
    path: ['to_hub_id'],
  });

export type LRCreateInput = z.infer<typeof lrCreateSchema>;
