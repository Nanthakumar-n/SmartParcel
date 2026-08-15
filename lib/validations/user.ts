import { z } from 'zod';

const INDIA_PHONE_REGEX = /^(\+91)?[6-9]\d{9}$/;

export const inviteUserSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name is too long'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .trim()
      .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number (+91...)'),
    user_role: z.enum(['hub_manager', 'fleet_owner']),
    password: z
      .string()
      .min(6, 'Password must be at least 6 characters')
      .optional()
      .or(z.literal('')),
    assigned_hub_ids: z.array(z.string().uuid()),
    is_active: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.user_role === 'hub_manager') {
        return data.assigned_hub_ids.length > 0;
      }
      return true;
    },
    {
      message: 'Hub Managers must be assigned to at least one hub branch',
      path: ['assigned_hub_ids'],
    }
  );

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name is too long'),
    phone: z
      .string()
      .trim()
      .regex(INDIA_PHONE_REGEX, 'Enter a valid 10-digit Indian mobile number (+91...)'),
    user_role: z.enum(['hub_manager', 'fleet_owner']),
    assigned_hub_ids: z.array(z.string().uuid()),
    is_active: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.user_role === 'hub_manager') {
        return data.assigned_hub_ids.length > 0;
      }
      return true;
    },
    {
      message: 'Hub Managers must be assigned to at least one hub branch',
      path: ['assigned_hub_ids'],
    }
  );

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
