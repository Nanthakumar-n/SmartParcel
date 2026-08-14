'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Truck, Plus, Edit2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  vehicleSchema,
  type VehicleInput,
  type VehicleType,
  type VehicleStatus,
} from '@/lib/validations/vehicle';
import { createVehicleAction, updateVehicleAction } from '../actions';
import type { VehicleWithDriver } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';

interface VehicleDialogProps {
  vehicle?: VehicleWithDriver | null;
  drivers: DriverRow[];
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function VehicleDialog({
  vehicle,
  drivers,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: VehicleDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const isEditing = !!vehicle;

  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      registration_number: vehicle?.registration_number ?? '',
      vehicle_type: (vehicle?.vehicle_type as VehicleType) ?? 'TRUCK',
      capacity_tonnes: vehicle?.capacity_tonnes ? String(vehicle.capacity_tonnes) : '',
      default_driver_id: vehicle?.default_driver_id ?? '',
      status: (vehicle?.status as VehicleStatus) ?? 'AVAILABLE',
      is_active: vehicle?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        registration_number: vehicle?.registration_number ?? '',
        vehicle_type: (vehicle?.vehicle_type as VehicleType) ?? 'TRUCK',
        capacity_tonnes: vehicle?.capacity_tonnes ? String(vehicle.capacity_tonnes) : '',
        default_driver_id: vehicle?.default_driver_id ?? '',
        status: (vehicle?.status as VehicleStatus) ?? 'AVAILABLE',
        is_active: vehicle?.is_active ?? true,
      });
    }
  }, [open, vehicle, form]);

  const onSubmit = async (values: VehicleInput) => {
    try {
      const result = isEditing
        ? await updateVehicleAction(vehicle.id, values)
        : await createVehicleAction(values);

      if (!result.success) {
        Object.entries(result.error).forEach(([field, messages]) => {
          if (field === '_form') {
            toast.error(messages.join(', '));
          } else {
            form.setError(field as keyof VehicleInput, {
              type: 'manual',
              message: messages.join(', '),
            });
          }
        });
        return;
      }

      toast.success(
        isEditing
          ? `Vehicle "${values.registration_number}" updated successfully`
          : `Vehicle "${result.data.registration_number}" registered successfully`
      );

      setOpen(false);
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : !isControlled ? (
        <DialogTrigger
          render={
            <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Add New Vehicle</span>
            </Button>
          }
        />
      ) : null}

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Truck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isEditing ? 'Edit Vehicle' : 'Fleet Registration'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? `Edit Truck: ${vehicle.registration_number}` : 'Register New Vehicle'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            {isEditing
              ? 'Update vehicle details, assigned driver, or operational status.'
              : 'Add a new truck, mini-truck, or tempo to your transport fleet.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Registration Number */}
              <FormField
                control={form.control}
                name="registration_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Registration Number <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MH 12 AB 1234"
                        className="font-mono uppercase tracking-wider placeholder:normal-case font-bold"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Vehicle Type */}
              <FormField
                control={form.control}
                name="vehicle_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Vehicle Type <span className="text-red-500">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TRUCK">Heavy Truck / Lorry</SelectItem>
                        <SelectItem value="MINI_TRUCK">Mini Truck (Eicher / 407)</SelectItem>
                        <SelectItem value="TEMPO">Tempo (Tata Ace / Pickup)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Capacity in Tonnes */}
              <FormField
                control={form.control}
                name="capacity_tonnes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Gross Capacity (Tonnes)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="10.5"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Operational Status */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Operational Status
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">Available</SelectItem>
                        <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                        <SelectItem value="UNDER_MAINTENANCE">Under Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Default Driver Assignment */}
            <FormField
              control={form.control}
              name="default_driver_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Assigned Primary Driver (Optional)
                  </FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === 'unassigned' ? '' : val)}
                    value={field.value || 'unassigned'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a default driver" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">-- No default driver --</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.full_name} ({driver.phone})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={form.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
              >
                {form.formState.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </span>
                ) : isEditing ? (
                  <span className="flex items-center gap-2">
                    <Edit2 className="h-4 w-4" />
                    <span>Update Vehicle</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Vehicle</span>
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
