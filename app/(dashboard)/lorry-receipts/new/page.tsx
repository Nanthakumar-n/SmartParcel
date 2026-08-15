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

export default async function NewLRPage() {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const [hubsResult, assignedHubIds, tripsResult] = await Promise.all([
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
  ]);

  const hubs = hubsResult.data;
  const availableTrips = (tripsResult.data as unknown as AvailableTrip[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/lorry-receipts"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Issue New Lorry Receipt (Builty)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete the waybill details below to issue a digital LR and slot cargo into upcoming trips.
          </p>
        </div>
      </div>

      {/* Form */}
      <LRForm
        hubs={hubs}
        userAssignedHubIds={assignedHubIds}
        userRole={session.role}
        availableTrips={availableTrips}
      />
    </div>
  );
}
