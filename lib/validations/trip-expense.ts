import { z } from 'zod';

export const TRIP_EXPENSE_CATEGORIES = [
  'ADVANCE',
  'FUEL',
  'TOLL',
  'MAINTENANCE',
  'BHATTA',
  'LABOUR',
  'MISC',
] as const;

export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number];

export const SETTLEMENT_MODES = ['CASH', 'UPI', 'BANK_TRANSFER'] as const;
export type SettlementPaymentMode = (typeof SETTLEMENT_MODES)[number];

export const tripExpenseCreateSchema = z
  .object({
    category: z.enum(TRIP_EXPENSE_CATEGORIES),
    amount_rupees: z
      .string()
      .trim()
      .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid amount in ₹ (e.g. 500 or 500.50)')
      .refine((val) => parseFloat(val) > 0, 'Amount must be greater than ₹0'),
    description: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === 'MISC' && (!data.description || data.description.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['description'],
        message: 'Description is mandatory for Miscellaneous expenses (min 2 chars)',
      });
    }
  });

export type TripExpenseCreateInput = z.infer<typeof tripExpenseCreateSchema>;

export const tripExpenseSettleSchema = z.object({
  settlement_mode: z.enum(SETTLEMENT_MODES),
  notes: z.string().trim().optional(),
});

export type TripExpenseSettleInput = z.infer<typeof tripExpenseSettleSchema>;

export const tripExpenseVoidSchema = z.object({
  expense_id: z.string().uuid('Invalid expense ID'),
});

export type TripExpenseVoidInput = z.infer<typeof tripExpenseVoidSchema>;
