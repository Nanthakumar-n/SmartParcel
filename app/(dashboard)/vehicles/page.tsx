import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getVehiclesByTenant } from '@/lib/db/vehicles';
import { getDriversByTenant } from '@/lib/db/drivers';
import { Truck, CheckCircle2, Activity, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VehicleTable } from './_components/vehicle-table';
import { VehicleDialog } from './_components/vehicle-dialog';

export const metadata: Metadata = {
  title: 'Truck Registry | SmartParcel',
  description: 'Manage fleet vehicles, truck capacity, and default driver assignments.',
};

export default async function VehiclesPage() {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();

  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    getVehiclesByTenant(supabase, { pageSize: 100 }),
    getDriversByTenant(supabase, { isActive: true, pageSize: 100 }),
  ]);

  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter((v) => v.status === 'AVAILABLE' && v.is_active).length;
  const inTransitVehicles = vehicles.filter((v) => v.status === 'IN_TRANSIT').length;
  const maintenanceVehicles = vehicles.filter((v) => v.status === 'UNDER_MAINTENANCE').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Truck Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain your transport fleet, vehicle registrations, payload capacities, and primary drivers.
          </p>
        </div>
        <VehicleDialog drivers={drivers} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Fleet
            </CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalVehicles}</div>
            <p className="text-xs text-slate-500 mt-1">Total registered trucks/tempos</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Available
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{availableVehicles}</div>
            <p className="text-xs text-slate-500 mt-1">Ready for trip loading & dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Transit
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inTransitVehicles}</div>
            <p className="text-xs text-slate-500 mt-1">Currently on active highway trips</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Maintenance
            </CardTitle>
            <Wrench className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{maintenanceVehicles}</div>
            <p className="text-xs text-slate-500 mt-1">Under repair or scheduled service</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Listing Table */}
      <VehicleTable initialVehicles={vehicles} drivers={drivers} />
    </div>
  );
}
