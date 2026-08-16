import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getTripsByTenant } from '@/lib/db/trips';
import { getHubsByTenant } from '@/lib/db/hubs';
import { getVehiclesByTenant } from '@/lib/db/vehicles';
import { getDriversByTenant } from '@/lib/db/drivers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Compass, CheckCircle2 } from 'lucide-react';
import { TripTable } from './_components/trip-table';
import { TripDialog } from './_components/trip-dialog';

export const metadata: Metadata = {
  title: 'Trip Dispatches | SmartParcel',
  description: 'Manage cargo loading manifests, verify driver assignments, and execute transit dispatches.',
};

export default async function TripDispatchesPage() {
  await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const [tripsResult, hubsResult, vehiclesResult, driversResult] =
    await Promise.all([
      getTripsByTenant(supabase, { pageSize: 100 }),
      getHubsByTenant(supabase, { pageSize: 100 }),
      getVehiclesByTenant(supabase, { pageSize: 100 }),
      getDriversByTenant(supabase, { pageSize: 100 }),
    ]);

  const trips = tripsResult.data;
  const hubs = hubsResult.data;
  const vehicles = vehiclesResult.data;
  const drivers = driversResult.data;

  const scheduledTripsCount = trips.filter((t) => t.status === 'SCHEDULED').length;
  const transitTripsCount = trips.filter((t) => t.status === 'IN_TRANSIT').length;
  const completedTripsCount = trips.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trip Dispatches & Manifests
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Build loading sheets, manage manifest assignments, and execute transit runs.
          </p>
        </div>
        <TripDialog hubs={hubs} vehicles={vehicles} drivers={drivers} />
      </div>

      {/* Metric Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Scheduled Runs
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{scheduledTripsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting cargo load confirmation</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Dispatches
            </CardTitle>
            <Compass className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{transitTripsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Vehicles in transit between hubs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Completed Runs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{completedTripsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Runs arrived at destination hubs</p>
          </CardContent>
        </Card>
      </div>

      {/* Trips Table */}
      <TripTable initialTrips={trips} />
    </div>
  );
}
