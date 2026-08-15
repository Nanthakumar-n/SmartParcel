import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getTripSchedulesByTenant } from '@/lib/db/trip-schedules';
import { getHubsByTenant } from '@/lib/db/hubs';
import { getVehiclesByTenant } from '@/lib/db/vehicles';
import { getDriversByTenant } from '@/lib/db/drivers';
import { CalendarDays, CheckCircle2, Route } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduleTable } from './_components/schedule-table';
import { ScheduleDialog } from './_components/schedule-dialog';

export const metadata: Metadata = {
  title: 'Trip Schedules | SmartParcel',
  description: 'Manage recurring transport routes, operating days, and assigned fleet assets.',
};

export default async function TripSchedulesPage() {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();

  const [schedulesResult, hubsResult, vehiclesResult, driversResult] =
    await Promise.all([
      getTripSchedulesByTenant(supabase),
      getHubsByTenant(supabase, { pageSize: 100 }),
      getVehiclesByTenant(supabase, { pageSize: 100 }),
      getDriversByTenant(supabase, { pageSize: 100 }),
    ]);

  const schedules = schedulesResult.data;
  const hubs = hubsResult.data;
  const vehicles = vehiclesResult.data;
  const drivers = driversResult.data;

  const totalSchedules = schedules.length;
  const activeSchedules = schedules.filter((s) => s.is_active).length;
  const uniqueRoutes = new Set(
    schedules.map((s) => `${s.from_hub_id}-${s.to_hub_id}`)
  ).size;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Trip Schedules
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure recurring route schedules between hubs for automated trip generation and LR slotting.
          </p>
        </div>
        <ScheduleDialog hubs={hubs} vehicles={vehicles} drivers={drivers} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Schedules
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalSchedules}</div>
            <p className="text-xs text-slate-500 mt-1">Configured recurring route templates</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Schedules
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeSchedules}</div>
            <p className="text-xs text-slate-500 mt-1">Currently operating on regular days</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Routes
            </CardTitle>
            <Route className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{uniqueRoutes}</div>
            <p className="text-xs text-slate-500 mt-1">Distinct hub-to-hub corridors</p>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List / Filter Table */}
      <ScheduleTable
        initialSchedules={schedules}
        hubs={hubs}
        vehicles={vehicles}
        drivers={drivers}
      />
    </div>
  );
}
