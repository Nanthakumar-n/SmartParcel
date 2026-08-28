'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  FileText,
  User,
  Package,
  IndianRupee,
  Truck,
  CheckCircle2,
  PlusCircle,
  List,
  Loader2,
  Building2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { lrCreateSchema, type LRCreateInput } from '@/lib/validations/lr';
import { createLorryReceiptAction } from '@/app/(dashboard)/lorry-receipts/actions';
import { formatINR } from '@/lib/utils/format-currency';
import type { BookingRequestWithLR } from '@/lib/db/booking-requests';
import type { HubRow } from '@/lib/db/hubs';
import { Badge } from '@/components/ui/badge';

interface LRFormProps {
  hubs: HubRow[];
  userAssignedHubIds: string[];
  userRole: 'fleet_owner' | 'hub_manager' | 'driver';
  availableTrips: {
    id: string;
    from_hub_id: string;
    to_hub_id: string;
    scheduled_departure: string | null;
    status: string;
    vehicle: {
      registration_number: string;
      vehicle_type: string;
    } | null;
    driver: {
      full_name: string;
      phone: string;
    } | null;
  }[];
  prefilledBooking?: {
    id: string;
    booking_ref?: string;
    consignor_name: string;
    consignor_phone: string;
    consignee_name?: string;
    consignee_phone?: string;
    consignor_address_line1?: string;
    consignor_address_line2?: string;
    consignor_pin_code?: string;
    consignee_address_line1?: string;
    consignee_address_line2?: string;
    consignee_pin_code?: string;
    from_hub_id: string;
    to_hub_id: string;
    goods_description: string;
    quantity: string;
    weight_kg: string;
    num_packages: string;
  } | null;
  pendingBookings?: BookingRequestWithLR[];
}

export function LRForm({
  hubs,
  userAssignedHubIds,
  userRole,
  availableTrips,
  prefilledBooking,
  pendingBookings = [],
}: LRFormProps) {
  const router = useRouter();

  // Success modal state
  const [createdLR, setCreatedLR] = useState<{
    id: string;
    lr_number: string;
    data: LRCreateInput;
  } | null>(null);

  // Available origin hubs based on user role and assignments
  const activeHubs = hubs.filter((h) => h.is_active);
  const originHubs =
    userRole === 'hub_manager' && userAssignedHubIds.length > 0
      ? activeHubs.filter((h) => userAssignedHubIds.includes(h.id))
      : activeHubs;

  const defaultOriginHub = originHubs.length > 0 ? originHubs[0].id : '';

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LRCreateInput>({
    resolver: zodResolver(lrCreateSchema),
    defaultValues: {
      booking_date: new Date().toISOString().split('T')[0],
      from_hub_id: prefilledBooking?.from_hub_id || defaultOriginHub,
      to_hub_id: prefilledBooking?.to_hub_id || '',
      trip_id: '',
      consignor_name: prefilledBooking?.consignor_name || '',
      consignor_phone: prefilledBooking?.consignor_phone || '+91',
      consignor_gstin: '',
      consignor_address_line1: prefilledBooking?.consignor_address_line1 || '',
      consignor_address_line2: prefilledBooking?.consignor_address_line2 || '',
      consignor_pin_code: prefilledBooking?.consignor_pin_code || '',
      consignee_name: prefilledBooking?.consignee_name || '',
      consignee_phone: prefilledBooking?.consignee_phone || '+91',
      consignee_gstin: '',
      consignee_address_line1: prefilledBooking?.consignee_address_line1 || '',
      consignee_address_line2: prefilledBooking?.consignee_address_line2 || '',
      consignee_pin_code: prefilledBooking?.consignee_pin_code || '',
      goods_description: prefilledBooking?.goods_description || '',
      quantity: prefilledBooking?.quantity || '1',
      weight_kg: prefilledBooking?.weight_kg || '',
      num_packages: prefilledBooking?.num_packages || '1',
      freight_amount_rupees: '0',
      payment_mode: 'PAID',
      expected_delivery_date: '',
      booking_request_id: prefilledBooking?.id || '',
    },
  });

  const selectedBookingRequestId = watch('booking_request_id');

  const handleSelectPendingBooking = (bookingId: string) => {
    if (!bookingId || bookingId === 'none') {
      setValue('booking_request_id', '');
      return;
    }
    const req = pendingBookings.find((b) => b.id === bookingId);
    if (!req) return;
    setValue('booking_request_id', req.id);
    setValue('consignor_name', req.customer_name);
    setValue('consignor_phone', req.customer_phone);
    if (req.consignee_name) setValue('consignee_name', req.consignee_name);
    if (req.consignee_phone) setValue('consignee_phone', req.consignee_phone);
    if (req.consignor_address_line1) setValue('consignor_address_line1', req.consignor_address_line1);
    if (req.consignor_address_line2) setValue('consignor_address_line2', req.consignor_address_line2);
    if (req.consignor_pin_code) setValue('consignor_pin_code', req.consignor_pin_code);
    if (req.consignee_address_line1) setValue('consignee_address_line1', req.consignee_address_line1);
    if (req.consignee_address_line2) setValue('consignee_address_line2', req.consignee_address_line2);
    if (req.consignee_pin_code) setValue('consignee_pin_code', req.consignee_pin_code);
    setValue('goods_description', req.goods_description);
    setValue('quantity', req.quantity ? req.quantity.toString() : '1');
    if (req.weight_kg) setValue('weight_kg', req.weight_kg.toString());
    if (req.num_packages) setValue('num_packages', req.num_packages.toString());

    // Match hubs
    if (req.origin_city) {
      const matchedFromHub = hubs.find(
        (h) => h.city && h.city.toLowerCase() === req.origin_city.toLowerCase()
      )?.id;
      if (matchedFromHub) setValue('from_hub_id', matchedFromHub);
    }
    if (req.destination_city) {
      const matchedToHub = hubs.find(
        (h) => h.city && h.city.toLowerCase() === req.destination_city.toLowerCase()
      )?.id;
      if (matchedToHub) setValue('to_hub_id', matchedToHub);
    }
    toast.info(`Imported details from booking request ${req.booking_ref}`);
  };

  const selectedFromHub = watch('from_hub_id');
  const selectedToHub = watch('to_hub_id');
  const paymentMode = watch('payment_mode');
  const freightRupees = watch('freight_amount_rupees') || '0';

  // Filter destination hubs (cannot match origin hub)
  const destinationHubs = activeHubs.filter((h) => h.id !== selectedFromHub);

  // Filter matching trips for the selected origin & destination
  const matchingTrips = availableTrips.filter(
    (t) => t.from_hub_id === selectedFromHub && t.to_hub_id === selectedToHub
  );

  // Reset form helper
  const handleReset = useCallback(() => {
    reset({
      booking_date: new Date().toISOString().split('T')[0],
      from_hub_id: defaultOriginHub,
      to_hub_id: '',
      trip_id: '',
      consignor_name: '',
      consignor_phone: '+91',
      consignor_gstin: '',
      consignor_address_line1: '',
      consignor_address_line2: '',
      consignor_pin_code: '',
      consignee_name: '',
      consignee_phone: '+91',
      consignee_gstin: '',
      consignee_address_line1: '',
      consignee_address_line2: '',
      consignee_pin_code: '',
      goods_description: '',
      quantity: '1',
      weight_kg: '',
      num_packages: '1',
      freight_amount_rupees: '0',
      payment_mode: 'PAID',
      expected_delivery_date: '',
      booking_request_id: '',
    });
    setCreatedLR(null);
  }, [defaultOriginHub, reset]);

  const handleCreateAnother = useCallback(() => {
    handleReset();
  }, [handleReset]);

  // Keyboard shortcut: Escape resets form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleReset();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleReset]);

  // Auto-slot to the first available matching trip if not manually set
  useEffect(() => {
    if (matchingTrips.length > 0) {
      setValue('trip_id', matchingTrips[0].id);
    } else {
      setValue('trip_id', '');
    }
  }, [selectedFromHub, selectedToHub, matchingTrips, setValue]);

  const onSubmit = async (data: LRCreateInput) => {
    try {
      const result = await createLorryReceiptAction(data);

      if (result.success) {
        toast.success(`Lorry Receipt ${result.data.lr_number} created successfully!`);
        setCreatedLR({
          id: result.data.id,
          lr_number: result.data.lr_number,
          data,
        });
        reset({
          booking_date: new Date().toISOString().split('T')[0],
          from_hub_id: defaultOriginHub,
          to_hub_id: '',
          trip_id: '',
          consignor_name: '',
          consignor_phone: '+91',
          consignor_gstin: '',
          consignor_address_line1: '',
          consignor_address_line2: '',
          consignor_pin_code: '',
          consignee_name: '',
          consignee_phone: '+91',
          consignee_gstin: '',
          consignee_address_line1: '',
          consignee_address_line2: '',
          consignee_pin_code: '',
          goods_description: '',
          quantity: '1',
          weight_kg: '',
          num_packages: '1',
          freight_amount_rupees: '0',
          payment_mode: 'PAID',
          expected_delivery_date: '',
          booking_request_id: '',
        });
        router.refresh();
      } else {
        Object.entries(result.error).forEach(([field, messages]) => {
          const errList = messages as string[];
          if (field === '_form') {
            toast.error(errList[0]);
          } else {
            setError(field as keyof LRCreateInput, {
              message: errList[0],
            });
          }
        });
      }
    } catch {
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  const originHubObj = hubs.find((h) => h.id === selectedFromHub);
  const destHubObj = hubs.find((h) => h.id === selectedToHub);
  const matchedSelectedBooking = pendingBookings.find((b) => b.id === selectedBookingRequestId);

  return (
    <div className="space-y-6">
      {/* Keyboard Helper Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
          <span className="font-semibold">
            Keyboard-First Data Entry:
          </span>
          <span className="text-blue-700">
            Use <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[11px]">Tab</kbd> to advance fields and <kbd className="px-1.5 py-0.5 bg-white border border-blue-300 rounded font-mono text-[11px]">Enter</kbd> to issue LR.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-blue-700 font-mono">
          <span>Shortcuts:</span>
          <span className="bg-blue-100 px-1.5 py-0.5 rounded border border-blue-300 font-bold">F2: Reset Form</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* SECTION 1: Route & Booking Information */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span>1. Route & Booking Information</span>
              </div>
              {prefilledBooking?.booking_ref && (
                <Badge className="bg-blue-50 text-blue-800 border-blue-200 font-mono text-xs">
                  Ref: {prefilledBooking.booking_ref}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            {/* Booking Reference Selector or Banner */}
            {prefilledBooking?.booking_ref ? (
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <span className="text-xs font-semibold text-blue-900">Converted from Online Booking Request:</span>
                    <span className="ml-2 font-mono font-bold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200 text-xs">
                      {prefilledBooking.booking_ref}
                    </span>
                  </div>
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                  Online Request
                </Badge>
              </div>
            ) : pendingBookings.length > 0 ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="booking_ref_select" className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span>Link Inbound Booking Request (Optional)</span>
                  </Label>
                  {matchedSelectedBooking && (
                    <span className="text-[11px] font-mono text-blue-600 font-semibold">
                      Ref: {matchedSelectedBooking.booking_ref}
                    </span>
                  )}
                </div>
                <Select
                  value={selectedBookingRequestId || 'none'}
                  onValueChange={(val) => handleSelectPendingBooking(val || '')}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="booking_ref_select" className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Direct / Walk-in Booking (No online reference)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      Direct / Walk-in Booking (No online reference)
                    </SelectItem>
                    {pendingBookings.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        <span className="font-mono font-bold text-blue-600 mr-2">[{b.booking_ref}]</span>
                        <span>{b.customer_name} ({b.origin_city} → {b.destination_city})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      disabled={isSubmitting || (userRole === 'hub_manager' && originHubs.length === 1)}
                    >
                      <SelectTrigger className="text-xs h-9">
                        {(() => {
                          const hub = originHubs.find((h) => h.id === field.value);
                          return hub ? (
                            <span className="flex items-center">
                              <span className="font-mono font-bold text-blue-600 mr-1.5">[{hub.hub_code}]</span>
                              {hub.city} - {hub.name}
                            </span>
                          ) : <SelectValue placeholder="Select origin hub" />;
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        {originHubs.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id} className="text-xs">
                            <span className="font-mono font-bold text-blue-600 mr-1.5">
                              [{hub.hub_code}]
                            </span>
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
                              {hub.city} - {hub.name}
                            </span>
                          ) : <SelectValue placeholder="Select destination hub" />;
                        })()}
                      </SelectTrigger>
                      <SelectContent>
                        {destinationHubs.map((hub) => (
                          <SelectItem key={hub.id} value={hub.id} className="text-xs">
                            <span className="font-mono font-bold text-emerald-600 mr-1.5">
                              [{hub.hub_code}]
                            </span>
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

              {/* Booking Date */}
              <div className="space-y-1.5">
                <Label htmlFor="booking_date" className="text-xs font-semibold text-slate-700">
                  Booking Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="booking_date"
                  type="date"
                  {...register('booking_date')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.booking_date && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.booking_date.message}
                  </p>
                )}
              </div>
            </div>

            {/* Next Scheduled Trip Auto-Slotting */}
            {selectedFromHub && selectedToHub && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Corridor: {originHubObj?.city} [{originHubObj?.hub_code}] → {destHubObj?.city} [{destHubObj?.hub_code}]
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {matchingTrips.length > 0
                        ? `${matchingTrips.length} active trip(s) scheduled on this corridor`
                        : 'No upcoming trips scheduled. LR will be slotted into the next dispatch run.'}
                    </p>
                  </div>
                </div>

                {matchingTrips.length > 0 && (
                  <div className="w-full sm:w-64">
                    <Controller
                      control={control}
                      name="trip_id"
                      render={({ field }) => (
                        <Select
                          value={field.value || 'none'}
                          onValueChange={(val) => field.onChange(val === 'none' || !val ? '' : val)}
                        >
                          <SelectTrigger className="text-xs h-8 bg-white">
                            <SelectValue placeholder="Select Trip Assignment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" className="text-xs">
                              Unassigned (Slot later)
                            </SelectItem>
                            {matchingTrips.map((trip) => (
                              <SelectItem key={trip.id} value={trip.id} className="text-xs">
                                <span className="font-mono font-bold">
                                  {trip.vehicle?.registration_number || 'Truck'}
                                </span>
                                {trip.driver && ` (${trip.driver.full_name})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: Consignor & Consignee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Consignor (Sender) */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span>2. Consignor Details (Sender)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="consignor_name" className="text-xs font-semibold text-slate-700">
                  Consignor Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consignor_name"
                  placeholder="e.g. Ramesh Trading Co. / Ramesh Kumar"
                  {...register('consignor_name')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.consignor_name && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignor_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor_phone" className="text-xs font-semibold text-slate-700">
                  Consignor Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consignor_phone"
                  placeholder="+91 98765 43210"
                  {...register('consignor_phone')}
                  disabled={isSubmitting}
                  className="text-xs h-9 font-mono"
                />
                {errors.consignor_phone && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignor_phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor_gstin" className="text-xs font-semibold text-slate-700">
                  Consignor GSTIN
                </Label>
                <Input
                  id="consignor_gstin"
                  placeholder="27ABCDE1234F1Z5"
                  {...register('consignor_gstin')}
                  disabled={isSubmitting}
                  className="text-xs h-9 font-mono uppercase"
                />
                {errors.consignor_gstin && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignor_gstin.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor_address_line1" className="text-xs font-semibold text-slate-700">
                  Address Line 1
                </Label>
                <Input
                  id="consignor_address_line1"
                  placeholder="Flat/House No, Building"
                  {...register('consignor_address_line1')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor_address_line2" className="text-xs font-semibold text-slate-700">
                  Landmark & Area
                </Label>
                <Input
                  id="consignor_address_line2"
                  placeholder="Street, Landmark, Area"
                  {...register('consignor_address_line2')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignor_pin_code" className="text-xs font-semibold text-slate-700">
                  PIN Code
                </Label>
                <Input
                  id="consignor_pin_code"
                  placeholder="6-digit code"
                  {...register('consignor_pin_code')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.consignor_pin_code && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignor_pin_code.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Consignee (Receiver) */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600" />
                <span>3. Consignee Details (Receiver)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="consignee_name" className="text-xs font-semibold text-slate-700">
                  Consignee Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consignee_name"
                  placeholder="e.g. Suresh Enterprises / Suresh Patel"
                  {...register('consignee_name')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.consignee_name && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignee_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee_phone" className="text-xs font-semibold text-slate-700">
                  Consignee Phone <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="consignee_phone"
                  placeholder="+91 91234 56789"
                  {...register('consignee_phone')}
                  disabled={isSubmitting}
                  className="text-xs h-9 font-mono"
                />
                {errors.consignee_phone && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignee_phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee_gstin" className="text-xs font-semibold text-slate-700">
                  Consignee GSTIN
                </Label>
                <Input
                  id="consignee_gstin"
                  placeholder="27ABCDE1234F1Z5"
                  {...register('consignee_gstin')}
                  disabled={isSubmitting}
                  className="text-xs h-9 font-mono uppercase"
                />
                {errors.consignee_gstin && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignee_gstin.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee_address_line1" className="text-xs font-semibold text-slate-700">
                  Address Line 1
                </Label>
                <Input
                  id="consignee_address_line1"
                  placeholder="Flat/House No, Building"
                  {...register('consignee_address_line1')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee_address_line2" className="text-xs font-semibold text-slate-700">
                  Landmark & Area
                </Label>
                <Input
                  id="consignee_address_line2"
                  placeholder="Street, Landmark, Area"
                  {...register('consignee_address_line2')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="consignee_pin_code" className="text-xs font-semibold text-slate-700">
                  PIN Code
                </Label>
                <Input
                  id="consignee_pin_code"
                  placeholder="6-digit code"
                  {...register('consignee_pin_code')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.consignee_pin_code && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.consignee_pin_code.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 3: Cargo & Goods Details */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span>4. Cargo & Goods Specification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {/* Goods Description */}
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="goods_description" className="text-xs font-semibold text-slate-700">
                  Goods Description <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goods_description"
                  placeholder="e.g. 5 boxes textile garments / Machine spare parts"
                  {...register('goods_description')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.goods_description && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.goods_description.message}
                  </p>
                )}
              </div>

              {/* Number of Packages */}
              <div className="space-y-1.5">
                <Label htmlFor="num_packages" className="text-xs font-semibold text-slate-700">
                  No. of Packages <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="num_packages"
                  type="number"
                  min={1}
                  {...register('num_packages')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.num_packages && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.num_packages.message}
                  </p>
                )}
              </div>

              {/* Weight in kg */}
              <div className="space-y-1.5">
                <Label htmlFor="weight_kg" className="text-xs font-semibold text-slate-700">
                  Total Weight (kg)
                </Label>
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 45.5"
                  {...register('weight_kg')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.weight_kg && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.weight_kg.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 4: Financials & Payment Mode */}
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-emerald-600" />
              <span>5. Freight Pricing & Payment Mode</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* Freight Amount (Rupees) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="freight_amount_rupees" className="text-xs font-semibold text-slate-700">
                    Total Freight Amount (₹) <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[11px] text-emerald-700 font-bold font-mono">
                    {formatINR(parseFloat(freightRupees) || 0)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold text-xs">
                    ₹
                  </span>
                  <Input
                    id="freight_amount_rupees"
                    type="number"
                    min={0}
                    step="1"
                    placeholder="0"
                    {...register('freight_amount_rupees')}
                    disabled={isSubmitting}
                    className="text-xs h-9 pl-7 font-mono font-bold text-slate-900"
                  />
                </div>
                {errors.freight_amount_rupees && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.freight_amount_rupees.message}
                  </p>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Payment Mode <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['PAID', 'TO_PAY', 'TBB'] as const).map((mode) => {
                    const isSelected = paymentMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setValue('payment_mode', mode)}
                        className={`py-2 px-2 text-xs font-bold rounded-md border transition-all text-center ${
                          isSelected
                            ? mode === 'PAID'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : mode === 'TO_PAY'
                              ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                              : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expected Delivery Date */}
              <div className="space-y-1.5">
                <Label htmlFor="expected_delivery_date" className="text-xs font-semibold text-slate-700">
                  Expected Delivery Date (Optional)
                </Label>
                <Input
                  id="expected_delivery_date"
                  type="date"
                  {...register('expected_delivery_date')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleCreateAnother}
            disabled={isSubmitting}
            className="text-xs w-full sm:w-auto"
          >
            Clear Form (Esc / F2)
          </Button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/lorry-receipts')}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-6 h-10 shadow-sm font-semibold flex items-center gap-2 w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Issuing Lorry Receipt...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>Issue Lorry Receipt (Enter)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Success Confirmation Modal */}
      <Dialog
        open={!!createdLR}
        onOpenChange={(open) => !open && setCreatedLR(null)}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Lorry Receipt Created Successfully!
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Waybill generated and saved to active cargo manifests.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {createdLR && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center space-y-1">
                <span className="text-[11px] text-slate-500 uppercase tracking-wider block">
                  Generated LR Number
                </span>
                <span className="font-mono font-bold text-xl text-blue-900 tracking-widest block">
                  {createdLR.lr_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">CONSIGNOR</span>
                  <span className="font-semibold text-slate-900">{createdLR.data.consignor_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">CONSIGNEE</span>
                  <span className="font-semibold text-slate-900">{createdLR.data.consignee_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">FREIGHT AMOUNT</span>
                  <span className="font-bold text-slate-900">
                    {formatINR(parseFloat(createdLR.data.freight_amount_rupees) || 0)} ({createdLR.data.payment_mode})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PACKAGES</span>
                  <span className="font-semibold text-slate-900">{createdLR.data.num_packages} pkgs</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreatedLR(null);
                router.push('/lorry-receipts');
              }}
              className="text-xs flex items-center gap-1.5"
            >
              <List className="h-3.5 w-3.5" />
              <span>View All LRs</span>
            </Button>

            <Button
              type="button"
              onClick={handleCreateAnother}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span>Create Another (F2)</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
