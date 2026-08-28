'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Loader2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTripSchema, type CreateTripInput } from '@/lib/validations/trip';
import { createTripAction, getAvailableFleetAction } from '../actions';
import type { HubRow } from '@/lib/db/hubs';
import type { VehicleWithDriver, AvailableVehicleOption } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';

interface TripDialogProps {
  hubs: HubRow[];
  vehicles: VehicleWithDriver[];
  drivers: DriverRow[];
}

export function TripDialog({ hubs, drivers }: TripDialogProps) {
  const [open, setOpen] = useState(false);
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicleOption[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);

  const activeHubs = hubs.filter((h) => h.is_active);
  const activeDrivers = drivers.filter((d) => d.is_active);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateTripInput>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      from_hub_id: '',
      to_hub_id: '',
      vehicle_id: '',
      driver_id: '',
      scheduled_departure: '',
      notes: '',
    },
  });

  const selectedFromHub = watch('from_hub_id');
  const destinationHubs = activeHubs.filter((h) => h.id !== selectedFromHub);

  // Fetch available vehicles whenever origin hub changes
  React.useEffect(() => {
    if (!selectedFromHub) {
      setAvailableVehicles([]);
      return;
    }
    setIsLoadingVehicles(true);
    getAvailableFleetAction(selectedFromHub)
      .then((res) => {
        if (res.success) {
          setAvailableVehicles(res.data.vehicles);
        }
      })
      .catch(() => {
        // silent
      })
      .finally(() => setIsLoadingVehicles(false));
  }, [selectedFromHub]);

  const onSubmit = async (data: CreateTripInput) => {
    try {
      const result = await createTripAction(data);

      if (result.success) {
        toast.success('Ad-hoc trip scheduled successfully!');
        reset();
        setOpen(false);
      } else {
        if (result.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            const errList = messages as string[];
            if (field === '_form') {
              toast.error(errList[0]);
            } else {
              setError(field as keyof CreateTripInput, {
                message: errList[0],
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
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) reset();
    }}>
      {/* Bug 1 fix: correct @base-ui-react DialogTrigger pattern */}
      <DialogTrigger
        render={
          <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
            <PlusCircle className="h-4 w-4" />
            <span>Create Ad-hoc Trip</span>
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[500px] bg-white border border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900 font-bold">Schedule Ad-hoc Trip</DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Deploy a vehicle run for custom deliveries. Automatically slots any LRs booked on this route.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin Hub */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Origin Hub (From) <span className="text-red-500">*</span>
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
                    <SelectTrigger className="text-xs h-9">
                      {(() => {
                        const hub = activeHubs.find((h) => h.id === field.value);
                        return hub ? (
                          <span className="flex items-center">
                            <span className="font-mono font-bold text-blue-600 mr-1.5">[{hub.hub_code}]</span>
                            {hub.city}
                          </span>
                        ) : <SelectValue placeholder="Select origin" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {activeHubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id} className="text-xs">
                          <span className="font-mono font-bold text-blue-600 mr-1.5">[{hub.hub_code}]</span>
                          {hub.city} - {hub.name}
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

            {/* Destination Hub */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Destination Hub (To) <span className="text-red-500">*</span>
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
                    <SelectTrigger className="text-xs h-9">
                      {(() => {
                        const hub = activeHubs.find((h) => h.id === field.value);
                        return hub ? (
                          <span className="flex items-center">
                            <span className="font-mono font-bold text-emerald-600 mr-1.5">[{hub.hub_code}]</span>
                            {hub.city}
                          </span>
                        ) : <SelectValue placeholder="Select destination" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {destinationHubs.map((hub) => (
                        <SelectItem key={hub.id} value={hub.id} className="text-xs">
                          <span className="font-mono font-bold text-emerald-600 mr-1.5">[{hub.hub_code}]</span>
                          {hub.city} - {hub.name}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vehicle Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Vehicle / Truck
              </Label>
              <Controller
                control={control}
                name="vehicle_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      const chosenVal = val ?? '';
                      field.onChange(chosenVal);
                      if (chosenVal) {
                        const chosen = availableVehicles.find((v) => v.id === chosenVal);
                        if (chosen?.default_driver_id && !watch('driver_id')) {
                          setValue('driver_id', chosen.default_driver_id);
                        }
                      }
                    }}
                    disabled={isSubmitting || !selectedFromHub || isLoadingVehicles}
                  >
                    <SelectTrigger className="text-xs h-9">
                      {(() => {
                        if (!selectedFromHub) {
                          return <span className="text-slate-400">Select origin hub first</span>;
                        }
                        if (isLoadingVehicles) {
                          return (
                            <span className="flex items-center text-slate-400">
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Loading vehicles...
                            </span>
                          );
                        }
                        const v = availableVehicles.find((vh) => vh.id === field.value);
                        return v ? (
                          <span className="font-semibold">{v.registration_number}</span>
                        ) : <SelectValue placeholder="Select vehicle" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-400">
                          No available vehicles currently at this hub.
                        </div>
                      ) : (
                        availableVehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            <div className="flex items-center justify-between w-full gap-2">
                              <span className="font-mono font-semibold">{v.registration_number}</span>
                              <span className="text-slate-400">({v.vehicle_type} - {v.capacity_tonnes}T)</span>
                            </div>
                          </SelectItem>
                        ))
                      )}
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

            {/* Driver Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Assigned Driver
              </Label>
              <Controller
                control={control}
                name="driver_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => field.onChange(val ?? '')}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="text-xs h-9">
                      {(() => {
                        const d = activeDrivers.find((dr) => dr.id === field.value);
                        return d ? (
                          <span>{d.full_name}</span>
                        ) : <SelectValue placeholder="Select driver" />;
                      })()}
                    </SelectTrigger>
                    <SelectContent>
                      {activeDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.full_name} <span className="text-slate-400">({d.phone || d.license_number || 'Driver'})</span>
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

          {/* Scheduled Departure */}
          <div className="space-y-1.5">
            <Label htmlFor="scheduled_departure" className="text-xs font-semibold text-slate-700">
              Scheduled Departure <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="scheduled_departure"
                type="datetime-local"
                {...register('scheduled_departure')}
                disabled={isSubmitting}
                className="text-xs h-9 pl-9"
              />
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
            {errors.scheduled_departure && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.scheduled_departure.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-semibold text-slate-700">
              Remarks / Notes
            </Label>
            <Textarea
              id="notes"
              placeholder="e.g. urgent express run, special cargo packaging needed..."
              {...register('notes')}
              disabled={isSubmitting}
              className="text-xs resize-none h-20"
            />
            {errors.notes && (
              <p className="text-[11px] text-red-500 font-medium">
                {errors.notes.message}
              </p>
            )}
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
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Run'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
