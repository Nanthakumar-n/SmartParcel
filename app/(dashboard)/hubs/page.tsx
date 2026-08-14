import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getHubsByTenant } from '@/lib/db/hubs';
import { Building2, MapPin, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HubTable } from './_components/hub-table';
import { HubDialog } from './_components/hub-dialog';

export const metadata: Metadata = {
  title: 'Hub Branches | SmartParcel',
  description: 'Manage logistics hub branches, branch codes, and physical facilities.',
};

export default async function HubsPage() {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();
  const { data: hubs } = await getHubsByTenant(supabase, { pageSize: 100 });

  const totalHubs = hubs.length;
  const activeHubs = hubs.filter((h) => h.is_active).length;
  const citiesCount = new Set(hubs.map((h) => h.city?.trim()).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hub Branches
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Configure origin/destination hubs and facility codes for your fleet&apos;s LR generation.
          </p>
        </div>
        <HubDialog />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Hubs
            </CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalHubs}</div>
            <p className="text-xs text-slate-500 mt-1">Branches registered in fleet</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Hubs
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{activeHubs}</div>
            <p className="text-xs text-slate-500 mt-1">Operational for booking & dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Cities Covered
            </CardTitle>
            <MapPin className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{citiesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Distinct delivery destination cities</p>
          </CardContent>
        </Card>
      </div>

      {/* Hubs Listing Table */}
      <HubTable initialHubs={hubs} />
    </div>
  );
}
