import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getDriversByTenant } from '@/lib/db/drivers';
import { UserCheck, CheckCircle2, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverTable } from './_components/driver-table';
import { DriverDialog } from './_components/driver-dialog';

export const metadata: Metadata = {
  title: 'Driver Registry | SmartParcel',
  description: 'Manage commercial driver profiles and contact details.',
};

export default async function DriversPage() {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  const { data: drivers } = await getDriversByTenant(supabase, { pageSize: 100 });

  const totalDrivers = drivers.length;
  const activeDrivers = drivers.filter((d) => d.is_active).length;
  const inactiveDrivers = totalDrivers - activeDrivers;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Driver Registry
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Maintain driver profiles, driving license records, and assign drivers to truck trips.
          </p>
        </div>
        <DriverDialog />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Drivers
            </CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalDrivers}</div>
            <p className="text-xs text-slate-500 mt-1">Registered drivers on payroll/contract</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Drivers
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeDrivers}</div>
            <p className="text-xs text-slate-500 mt-1">Available for truck dispatch assignment</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Inactive / On Leave
            </CardTitle>
            <UserX className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{inactiveDrivers}</div>
            <p className="text-xs text-slate-500 mt-1">Temporarily unavailable for trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Driver Table */}
      <DriverTable initialDrivers={drivers} />
    </div>
  );
}
