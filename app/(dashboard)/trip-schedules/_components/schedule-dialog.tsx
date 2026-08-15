'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Edit2, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  tripScheduleSchema,
  type TripScheduleInput,
} from '@/lib/validations/trip-schedule';
import {
  createTripScheduleAction,
  updateTripScheduleAction,
} from '../actions';
import { DaySelector } from './day-selector';
import type { TripScheduleWithDetails } from '@/lib/db/trip-schedules';
import type { HubRow } from '@/lib/db/hubs';
import type { VehicleWithDriver } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';

interface ScheduleDialogProps {
  schedule?: TripScheduleWithDetails;
  hubs: HubRow[];
  vehicles: VehicleWithDriver[];
  drivers: DriverRow[];
  trigger?: React.ReactElement;
}

export function ScheduleDialog({
  schedule,
  hubs,
  vehicles,
  drivers,
  trigger,
}: ScheduleDialogProps) {
  const isEditing = !!schedule;
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TripScheduleInput>({
    resolver: zodResolver(tripScheduleSchema),
    defaultValues: {
      from_hub_id: schedule?.from_hub_id ?? '',
      to_hub_id: schedule?.to_hub_id ?? '',
      days_of_week: schedule?.days_of_week ?? [1, 2, 3, 4, 5],
      departure_time: schedule?.departure_time
        ? schedule.departure_time.slice(0, 5)
        : '',
      vehicle_id: schedule?.vehicle_id ?? '',
      driver_id: schedule?.driver_id ?? '',
      is_active: schedule?.is_active ?? true,
    },
  });

  const selectedFromHub = watch('from_hub_id');

  const onSubmit = async (data: TripScheduleInput) => {
    try {
      const result = isEditing
        ? await updateTripScheduleAction(schedule.id, data)
        : await createTripScheduleAction(data);

      if (result.success) {
        toast.success(
          isEditing
            ? 'Trip schedule updated successfully.'
            : 'Trip schedule created successfully.'
        );
        setOpen(false);
        if (!isEditing) {
          reset();
        }
      } else {
        if (result.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(messages[0]);
            } else {
              setError(field as keyof TripScheduleInput, {
                message: messages[0],
              });
            }
          });
        }
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Create Trip Schedule</span>
            </Button>
          }
        />
      )}

      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              {isEditing ? <Edit2 className="h-5 w-5" /> : <CalendarDays className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                {isEditing ? 'Edit Trip Schedule' : 'New Trip Schedule'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Define recurring transport routes and operating days between hubs.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Route Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Origin Hub <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="from_hub_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val ?? '')}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-xs">
                      {(() => {
                        const hub = hubs.find((h) => h.id === field.value);
                        return hub ? (
                          <span className="flex items-center">
                            <span className="font-semibold text-blue-600 mr-1.5">[{hub.hub_code}]</span>
                            {hub.name} ({hub.city})
                          </span>
                        ) : <SelectValue placeholder="Select origin hub" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {hubs
                        .filter((h) => h.is_active)
                        .map((hub) => (
                          <SelectItem key={hub.id} value={hub.id} className="text-xs">
                            <span className="font-semibold text-blue-600 mr-1.5">
                              [{hub.hub_code}]
                            </span>
                            {hub.name} ({hub.city})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.from_hub_id && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.from_hub_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Destination Hub <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="to_hub_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val ?? '')}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-xs">
                      {(() => {
                        const hub = hubs.find((h) => h.id === field.value);
                        return hub ? (
                          <span className="flex items-center">
                            <span className="font-semibold text-emerald-600 mr-1.5">[{hub.hub_code}]</span>
                            {hub.name} ({hub.city})
                          </span>
                        ) : <SelectValue placeholder="Select destination hub" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {hubs
                        .filter((h) => h.is_active && h.id !== selectedFromHub)
                        .map((hub) => (
                          <SelectItem key={hub.id} value={hub.id} className="text-xs">
                            <span className="font-semibold text-emerald-600 mr-1.5">
                              [{hub.hub_code}]
                            </span>
                            {hub.name} ({hub.city})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.to_hub_id && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.to_hub_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Operating Days */}
          <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <Label className="text-xs font-semibold text-slate-700">
              Operating Days <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="days_of_week"
              render={({ field }) => (
                <DaySelector
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.days_of_week && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.days_of_week.message}
              </p>
            )}
          </div>

          {/* Departure Time */}
          <div className="space-y-1.5">
            <Label htmlFor="departure_time" className="text-xs font-semibold text-slate-700">
              Scheduled Departure Time (Optional)
            </Label>
            <Input
              id="departure_time"
              type="time"
              {...register('departure_time')}
              disabled={isSubmitting}
              className="text-xs"
            />
            {errors.departure_time && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.departure_time.message}
              </p>
            )}
          </div>

          {/* Assigned Vehicle & Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Default Vehicle (Optional)
              </Label>
              <Controller
                control={control}
                name="vehicle_id"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' || !val ? '' : val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-xs">
                      {(() => {
                        if (!field.value || field.value === 'none') return <SelectValue placeholder="Select default vehicle" />;
                        const v = vehicles.find((v) => v.id === field.value);
                        return v ? (
                          <span>
                            <span className="font-mono font-bold mr-1.5">{v.registration_number}</span>
                            ({v.vehicle_type})
                          </span>
                        ) : <SelectValue placeholder="Select default vehicle" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-slate-500">
                        None (Assign per trip)
                      </SelectItem>
                      {vehicles
                        .filter((v) => v.is_active)
                        .map((vehicle) => (
                          <SelectItem key={vehicle.id} value={vehicle.id} className="text-xs">
                            <span className="font-mono font-bold mr-1.5">
                              {vehicle.registration_number}
                            </span>
                            ({vehicle.vehicle_type})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.vehicle_id && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.vehicle_id.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Default Driver (Optional)
              </Label>
              <Controller
                control={control}
                name="driver_id"
                render={({ field }) => (
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(val) => field.onChange(val === 'none' || !val ? '' : val)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full text-xs">
                      {(() => {
                        if (!field.value || field.value === 'none') return <SelectValue placeholder="Select default driver" />;
                        const d = drivers.find((d) => d.id === field.value);
                        return d ? (
                          <span>{d.full_name} ({d.phone})</span>
                        ) : <SelectValue placeholder="Select default driver" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs text-slate-500">
                        None (Assign per trip)
                      </SelectItem>
                      {drivers
                        .filter((d) => d.is_active)
                        .map((driver) => (
                          <SelectItem key={driver.id} value={driver.id} className="text-xs">
                            {driver.full_name} ({driver.phone})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.driver_id && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.driver_id.message}
                </p>
              )}
            </div>
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-slate-800">
                Schedule Status
              </Label>
              <p className="text-[11px] text-slate-500">
                Active schedules auto-appear for LR assignment and trip generation
              </p>
            </div>
            <Controller
              control={control}
              name="is_active"
              render={({ field }) => (
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : isEditing ? (
                'Update Schedule'
              ) : (
                'Create Schedule'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
