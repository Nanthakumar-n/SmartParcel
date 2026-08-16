import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getBookingRequestsByTenant } from '@/lib/db/booking-requests';
import { BookingRequestsTable } from './_components/booking-requests-table';

export const metadata: Metadata = {
  title: 'Booking Requests | SmartParcel',
  description: 'Manage inbound customer booking requests, digitize them, or reject them with feedback.',
};

export default async function BookingRequestsPage() {
  await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const requestsResult = await getBookingRequestsByTenant(supabase, {
    pageSize: 100,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Booking Requests Queue
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Review customer requests submitted via the public portal. Accept requests to digitize them into Lorry Receipts.
        </p>
      </div>

      {/* Requests Table */}
      <BookingRequestsTable initialRequests={requestsResult.data} />
    </div>
  );
}
