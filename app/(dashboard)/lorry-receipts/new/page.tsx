import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireRole, getUserHubIds } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getHubsByTenant } from '@/lib/db/hubs';
import { LRForm } from './_components/lr-form';

export const metadata: Metadata = {
  title: 'New Lorry Receipt | SmartParcel',
  description: 'Issue a new digital lorry receipt (builty) with keyboard-first data entry.',
};

interface AvailableTrip {
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
}

import { getBookingRequestById, getBookingRequestsByTenant } from '@/lib/db/booking-requests';

export default async function NewLRPage({
  searchParams,
}: {
  searchParams: { booking_id?: string };
}) {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const [hubsResult, assignedHubIds, tripsResult, bookingRequest, pendingBookingsResult] = await Promise.all([
    getHubsByTenant(supabase, { pageSize: 100 }),
    getUserHubIds(session.id),
    supabase
      .from('trips')
      .select(
        `
        id,
        from_hub_id,
        to_hub_id,
        scheduled_departure,
        status,
        vehicle:vehicles (
          registration_number,
          vehicle_type
        ),
        driver:drivers (
          full_name,
          phone
        )
      `
      )
      .in('status', ['SCHEDULED'])
      .order('scheduled_departure', { ascending: true })
      .limit(50),
    searchParams?.booking_id
      ? getBookingRequestById(supabase, searchParams.booking_id)
      : Promise.resolve(null),
    getBookingRequestsByTenant(supabase, { status: 'PENDING', pageSize: 100 }),
  ]);

  const hubs = hubsResult.data;
  const availableTrips = (tripsResult.data as unknown as AvailableTrip[]) ?? [];
  const pendingBookings = pendingBookingsResult.data;

  // Attempt fuzzy matches of cities to auto-select hubs
  let prefilledBooking = null;
  if (bookingRequest) {
    const matchedFromHub = hubs.find(
      (h) => h.city && h.city.toLowerCase() === bookingRequest.origin_city.toLowerCase()
    )?.id || '';
    const matchedToHub = hubs.find(
      (h) => h.city && h.city.toLowerCase() === bookingRequest.destination_city.toLowerCase()
    )?.id || '';

    prefilledBooking = {
      id: bookingRequest.id,
      booking_ref: bookingRequest.booking_ref,
      consignor_name: bookingRequest.customer_name,
      consignor_phone: bookingRequest.customer_phone,
      consignee_name: bookingRequest.consignee_name || '',
      consignee_phone: bookingRequest.consignee_phone || '',
      consignor_address_line1: bookingRequest.consignor_address_line1 || '',
      consignor_address_line2: bookingRequest.consignor_address_line2 || '',
      consignor_pin_code: bookingRequest.consignor_pin_code || '',
      consignee_address_line1: bookingRequest.consignee_address_line1 || '',
      consignee_address_line2: bookingRequest.consignee_address_line2 || '',
      consignee_pin_code: bookingRequest.consignee_pin_code || '',
      from_hub_id: matchedFromHub,
      to_hub_id: matchedToHub,
      goods_description: bookingRequest.goods_description,
      quantity: bookingRequest.quantity.toString(),
      weight_kg: bookingRequest.weight_kg ? bookingRequest.weight_kg.toString() : '',
      num_packages: bookingRequest.num_packages ? bookingRequest.num_packages.toString() : '1',
    };
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={bookingRequest ? '/booking-requests' : '/lorry-receipts'}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Issue New Lorry Receipt (Builty)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {bookingRequest
              ? `Convert online booking request ${bookingRequest.booking_ref} to a digital Lorry Receipt.`
              : 'Complete the waybill details below to issue a digital LR and slot cargo into upcoming trips.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <LRForm
        hubs={hubs}
        userAssignedHubIds={assignedHubIds}
        userRole={session.role}
        availableTrips={availableTrips}
        prefilledBooking={prefilledBooking}
        pendingBookings={pendingBookings}
      />
    </div>
  );
}
