'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserCheck, Plus, Edit2, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { driverSchema, type DriverInput } from '@/lib/validations/driver';
import { createDriverAction, updateDriverAction } from '../actions';
import type { DriverRow } from '@/lib/db/drivers';

interface DriverDialogProps {
  driver?: DriverRow | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DriverDialog({
  driver,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: DriverDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const isEditing = !!driver;

  const form = useForm<DriverInput>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      full_name: driver?.full_name ?? '',
      phone: driver?.phone ?? '',
      license_number: driver?.license_number ?? '',
      is_active: driver?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        full_name: driver?.full_name ?? '',
        phone: driver?.phone ?? '',
        license_number: driver?.license_number ?? '',
        is_active: driver?.is_active ?? true,
      });
    }
  }, [open, driver, form]);

  const onSubmit = async (values: DriverInput) => {
    try {
      const result = isEditing
        ? await updateDriverAction(driver.id, values)
        : await createDriverAction(values);

      if (!result.success) {
        Object.entries(result.error).forEach(([field, messages]) => {
          if (field === '_form') {
            toast.error(messages.join(', '));
          } else {
            form.setError(field as keyof DriverInput, {
              type: 'manual',
              message: messages.join(', '),
            });
          }
        });
        return;
      }

      toast.success(
        isEditing
          ? `Driver "${values.full_name}" updated successfully`
          : `Driver "${values.full_name}" registered successfully`
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
              <span>Add New Driver</span>
            </Button>
          }
        />
      ) : null}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <UserCheck className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isEditing ? 'Edit Profile' : 'Driver Registration'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? `Edit Driver: ${driver.full_name}` : 'Add Driver Record'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            {isEditing
              ? 'Update driver contact details or driving license number.'
              : 'Add a commercial driver to assign to trucks and dispatches.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ramesh Kumar" {...field} />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Mobile Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+91 98765 43210"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Driving License Number */}
            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Driving License Number (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="DL-1420110012345"
                      className="uppercase font-mono placeholder:normal-case"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
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
                    <span>Update Driver</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Add Driver</span>
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
