import { z } from 'zod';

export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun', fullLabel: 'Sunday' },
  { value: 1, label: 'Mon', fullLabel: 'Monday' },
  { value: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { value: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { value: 4, label: 'Thu', fullLabel: 'Thursday' },
  { value: 5, label: 'Fri', fullLabel: 'Friday' },
  { value: 6, label: 'Sat', fullLabel: 'Saturday' },
] as const;

export const tripScheduleSchema = z
  .object({
    from_hub_id: z.string().uuid('Please select an origin hub'),
    to_hub_id: z.string().uuid('Please select a destination hub'),
    days_of_week: z
      .array(z.number().int().min(0).max(6))
      .min(1, 'Select at least one operating day of the week'),
    departure_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Enter a valid departure time (HH:MM)')
      .optional()
      .or(z.literal('')),
    vehicle_id: z.string().uuid('Invalid vehicle selection').optional().or(z.literal('')),
    driver_id: z.string().uuid('Invalid driver selection').optional().or(z.literal('')),
    is_active: z.boolean(),
  })
  .refine((data) => data.from_hub_id !== data.to_hub_id, {
    message: 'Origin and destination hubs cannot be the same',
    path: ['to_hub_id'],
  });

export type TripScheduleInput = z.infer<typeof tripScheduleSchema>;
