'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  User,
  Package,
  CheckCircle2,
  Loader2,
  MapPin,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { customerBookingSchema, type CustomerBookingInput } from '@/lib/validations/booking-request';
import { submitBookingRequestAction } from '../actions';

interface BookingFormClientProps {
  companyName: string;
  tenantSlug: string;
}

export function BookingFormClient({ companyName, tenantSlug }: BookingFormClientProps) {
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerBookingInput>({
    resolver: zodResolver(customerBookingSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '+91',
      origin_city: '',
      destination_city: '',
      goods_description: '',
      weight_kg: '',
      num_packages: '1',
    },
  });

  const onSubmit = async (data: CustomerBookingInput) => {
    try {
      const result = await submitBookingRequestAction(tenantSlug, data);

      if (result.success) {
        setSuccessRef(result.data.bookingRef);
        toast.success('Booking request submitted!');
      } else {
        if (result.error) {
          Object.entries(result.error).forEach(([field, messages]) => {
            const errList = messages as string[];
            if (field === '_form') {
              toast.error(errList[0]);
            } else {
              setError(field as keyof CustomerBookingInput, {
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

  if (successRef) {
    return (
      <Card className="border-emerald-200 bg-white shadow-xs">
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 animate-bounce" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">Request Submitted Successfully!</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your shipment booking request has been queued at {companyName}. Keep the reference code below to track details.
            </p>
          </div>

          <div className="bg-slate-50 border rounded-lg p-4 max-w-xs mx-auto">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Booking Reference</span>
            <span className="text-xl font-bold font-mono text-slate-900 block mt-1">{successRef}</span>
          </div>

          <p className="text-[11px] text-slate-400">
            A Hub Manager will review your request shortly to generate a digital waybill.
          </p>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-xs"
            >
              Submit Another Request
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 bg-white shadow-xs">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-blue-600" />
          <span>Shipment Booking Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Section 1: Sender & Receiver Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender (Consignor) Info */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span>Sender Details (Consignor)</span>
              </h3>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label htmlFor="customer_name" className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customer_name"
                    placeholder="e.g. Rajesh Sharma"
                    {...register('customer_name')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.customer_name && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.customer_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="customer_phone" className="text-xs font-semibold text-slate-700">
                    Mobile Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="customer_phone"
                    placeholder="e.g. +919876543210"
                    {...register('customer_phone')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.customer_phone && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.customer_phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignor_address_line1" className="text-xs font-semibold text-slate-700">
                    Address Line 1 <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignor_address_line1"
                    placeholder="Flat/House No, Building"
                    {...register('consignor_address_line1')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignor_address_line2" className="text-xs font-semibold text-slate-700">
                    Landmark & Area <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignor_address_line2"
                    placeholder="Street, Landmark, Area"
                    {...register('consignor_address_line2')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignor_pin_code" className="text-xs font-semibold text-slate-700">
                    PIN Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignor_pin_code"
                    placeholder="6-digit code"
                    {...register('consignor_pin_code')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.consignor_pin_code && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.consignor_pin_code.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Receiver (Consignee) Info */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <User className="h-3.5 w-3.5 text-emerald-600" />
                <span>Receiver Details (Consignee)</span>
              </h3>

              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label htmlFor="consignee_name" className="text-xs font-semibold text-slate-700">
                    Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignee_name"
                    placeholder="e.g. Ramesh Patil"
                    {...register('consignee_name')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.consignee_name && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.consignee_name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignee_phone" className="text-xs font-semibold text-slate-700">
                    Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignee_phone"
                    placeholder="e.g. +919123456789"
                    {...register('consignee_phone')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.consignee_phone && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.consignee_phone.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignee_address_line1" className="text-xs font-semibold text-slate-700">
                    Address Line 1 <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignee_address_line1"
                    placeholder="Flat/House No, Building"
                    {...register('consignee_address_line1')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignee_address_line2" className="text-xs font-semibold text-slate-700">
                    Landmark & Area <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignee_address_line2"
                    placeholder="Street, Landmark, Area"
                    {...register('consignee_address_line2')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="consignee_pin_code" className="text-xs font-semibold text-slate-700">
                    PIN Code <span className="text-slate-400 font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="consignee_pin_code"
                    placeholder="6-digit code"
                    {...register('consignee_pin_code')}
                    disabled={isSubmitting}
                    className="text-xs h-9 bg-white"
                  />
                  {errors.consignee_pin_code && (
                    <p className="text-[11px] text-red-500 font-medium">
                      {errors.consignee_pin_code.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Cities */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>Route Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="origin_city" className="text-xs font-semibold text-slate-700">
                  Origin City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="origin_city"
                  placeholder="e.g. Pune"
                  {...register('origin_city')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.origin_city && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.origin_city.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="destination_city" className="text-xs font-semibold text-slate-700">
                  Destination City <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="destination_city"
                  placeholder="e.g. Mumbai"
                  {...register('destination_city')}
                  disabled={isSubmitting}
                  className="text-xs h-9"
                />
                {errors.destination_city && (
                  <p className="text-[11px] text-red-500 font-medium">
                    {errors.destination_city.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Cargo Info */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5 text-slate-400" />
              <span>Cargo & Packages</span>
            </h3>

            <div className="space-y-1">
              <Label htmlFor="goods_description" className="text-xs font-semibold text-slate-700">
                Goods Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="goods_description"
                placeholder="e.g. Cotton boxes, industrial machinery components..."
                {...register('goods_description')}
                disabled={isSubmitting}
                className="text-xs resize-none h-16"
              />
              {errors.goods_description && (
                <p className="text-[11px] text-red-500 font-medium">
                  {errors.goods_description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="weight_kg" className="text-xs font-semibold text-slate-700">
                  Total Weight (kg)
                </Label>
                <Input
                  id="weight_kg"
                  placeholder="Optional"
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

              <div className="space-y-1">
                <Label htmlFor="num_packages" className="text-xs font-semibold text-slate-700">
                  No. of Packages <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="num_packages"
                  type="number"
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
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting Request...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                Submit Shipment Booking
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
