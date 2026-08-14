'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Building2, Plus, Edit2, Loader2 } from 'lucide-react';
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
import { hubSchema, type HubInput } from '@/lib/validations/hub';
import { createHubAction, updateHubAction } from '../actions';
import type { HubRow } from '@/lib/db/hubs';

interface HubDialogProps {
  hub?: HubRow | null;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function HubDialog({
  hub,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onSuccess,
}: HubDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (controlledOnOpenChange ?? (() => {})) : setInternalOpen;

  const isEditing = !!hub;

  const form = useForm<HubInput>({
    resolver: zodResolver(hubSchema),
    defaultValues: {
      hub_code: hub?.hub_code ?? '',
      name: hub?.name ?? '',
      address_line1: hub?.address_line1 ?? '',
      city: hub?.city ?? '',
      state: hub?.state ?? '',
      pin_code: hub?.pin_code ?? '',
      contact_phone: hub?.contact_phone ?? '',
      latitude: hub?.latitude ? String(hub.latitude) : '',
      longitude: hub?.longitude ? String(hub.longitude) : '',
      is_active: hub?.is_active ?? true,
    },
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        hub_code: hub?.hub_code ?? '',
        name: hub?.name ?? '',
        address_line1: hub?.address_line1 ?? '',
        city: hub?.city ?? '',
        state: hub?.state ?? '',
        pin_code: hub?.pin_code ?? '',
        contact_phone: hub?.contact_phone ?? '',
        latitude: hub?.latitude ? String(hub.latitude) : '',
        longitude: hub?.longitude ? String(hub.longitude) : '',
        is_active: hub?.is_active ?? true,
      });
    }
  }, [open, hub, form]);

  const onSubmit = async (values: HubInput) => {
    try {
      const result = isEditing
        ? await updateHubAction(hub.id, values)
        : await createHubAction(values);

      if (!result.success) {
        Object.entries(result.error).forEach(([field, messages]) => {
          if (field === '_form') {
            toast.error(messages.join(', '));
          } else {
            form.setError(field as keyof HubInput, {
              type: 'manual',
              message: messages.join(', '),
            });
          }
        });
        return;
      }

      toast.success(
        isEditing
          ? `Hub "${values.name}" updated successfully`
          : `Hub "${values.name}" (${result.data.hub_code}) created successfully`
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
              <span>Add New Hub</span>
            </Button>
          }
        />
      ) : null}

      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Building2 className="h-5 w-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {isEditing ? 'Edit Branch' : 'New Branch'}
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEditing ? `Edit Hub: ${hub.name}` : 'Register Hub Branch'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            {isEditing
              ? 'Update location, code, or contact details for this logistics hub.'
              : 'Add a new physical hub branch. Hub code will be used as the prefix for Lorry Receipts (e.g. MUM-2026-000001).'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Hub Code */}
              <FormField
                control={form.control}
                name="hub_code"
                render={({ field }) => (
                  <FormItem className="sm:col-span-1">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Hub Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="MUM"
                        maxLength={10}
                        className="font-mono uppercase tracking-wider placeholder:normal-case"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* Hub Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Hub / Branch Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai Central Hub" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Address Line */}
            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Street Address / Warehouse No. <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Plot 42, Transport Nagar, Bhiwandi" {...field} />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      City <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Mumbai" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* State */}
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      State <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Maharashtra" {...field} />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {/* PIN Code */}
              <FormField
                control={form.control}
                name="pin_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      PIN Code <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="400001"
                        maxLength={6}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.replace(/\D/g, ''))}
                      />
                    </FormControl>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Phone */}
            <FormField
              control={form.control}
              name="contact_phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Hub Contact Mobile Phone <span className="text-red-500">*</span>
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
                    <span>Update Hub</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    <span>Create Hub</span>
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
