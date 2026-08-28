import { z } from 'zod';
import { VEHICLE_NUMBER_REGEX } from '@/lib/utils/format-vehicle';

export const VEHICLE_TYPES = ['TRUCK', 'MINI_TRUCK', 'TEMPO'] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_STATUSES = ['AVAILABLE', 'IN_TRANSIT', 'UNDER_MAINTENANCE'] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const vehicleSchema = z.object({
  registration_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(VEHICLE_NUMBER_REGEX, 'Enter a valid Indian vehicle number (e.g. MH 12 AB 1234)'),
  vehicle_type: z.enum(['TRUCK', 'MINI_TRUCK', 'TEMPO']),
  capacity_tonnes: z
    .string()
    .trim()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0 && Number(val) <= 100),
      'Capacity must be a positive number up to 100 tonnes'
    )
    .optional()
    .or(z.literal('')),
  default_driver_id: z.string().optional().or(z.literal('')),
  current_hub_id: z.string().uuid().optional().or(z.literal('')).nullable(),
  status: z.enum(['AVAILABLE', 'IN_TRANSIT', 'UNDER_MAINTENANCE']),
  is_active: z.boolean(),
});

export type VehicleInput = z.infer<typeof vehicleSchema>;
