import { z } from 'zod';

export const createTripSchema = z
  .object({
    from_hub_id: z.string().uuid('Please select an origin hub'),
    to_hub_id: z.string().uuid('Please select a destination hub'),
    vehicle_id: z.string().uuid('Please select a vehicle').optional().or(z.literal('')),
    driver_id: z.string().uuid('Please select a driver').optional().or(z.literal('')),
    scheduled_departure: z
      .string()
      .min(1, 'Please select a scheduled departure date and time')
      .refine(
        (v) => !isNaN(Date.parse(v)),
        'Please enter a valid date and time'
      ),
    notes: z.string().trim().max(500, 'Notes are too long').optional().or(z.literal('')),
  })
  .refine((data) => data.from_hub_id !== data.to_hub_id, {
    message: 'Origin and destination hubs cannot be the same',
    path: ['to_hub_id'],
  });

export type CreateTripInput = z.infer<typeof createTripSchema>;
