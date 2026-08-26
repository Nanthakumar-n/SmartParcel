import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getLRsByTenant } from '@/lib/db/lorry-receipts';
import { getHubsByTenant } from '@/lib/db/hubs';
import { getTenantById } from '@/lib/db/tenants';
import {
  FileText,
  Truck,
  CheckCheck,
  IndianRupee,
  PlusCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LRTable } from './_components/lr-table';
import { formatINRFromPaise } from '@/lib/utils/format-currency';

export const metadata: Metadata = {
  title: 'Lorry Receipts (LR) | SmartParcel',
  description: 'Manage digital lorry receipts, waybills, cargo tracking, and thermal billing.',
};

export default async function LorryReceiptsPage() {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const [lrsResult, hubsResult, tenant] = await Promise.all([
    getLRsByTenant(supabase, { pageSize: 100 }),
    getHubsByTenant(supabase, { pageSize: 100 }),
    getTenantById(supabase, session.tenantId),
  ]);

  const lrs = lrsResult.data;
  const hubs = hubsResult.data;
  const tenantName = tenant?.name ?? 'SmartParcel Logistics';

  const totalLRs = lrsResult.count;
  const inTransitCount = lrs.filter((l) => l.status === 'IN_TRANSIT').length;
  const deliveredCount = lrs.filter((l) => l.status === 'DELIVERED').length;
  const totalFreightPaise = lrs.reduce(
    (acc, lr) => acc + (lr.status !== 'CANCELLED' ? Number(lr.freight_amount) : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Lorry Receipts (LR / Builty)
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Issue digital waybills, manage parcel dispatch lifecycle, and print 3-inch thermal bills.
          </p>
        </div>
        <Link href="/lorry-receipts/new">
          <Button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs">
            <PlusCircle className="h-4 w-4" />
            <span>New Lorry Receipt (F2)</span>
          </Button>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total LRs Issued
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalLRs}</div>
            <p className="text-xs text-slate-500 mt-1">Waybills generated in system</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              In Transit
            </CardTitle>
            <Truck className="h-4 w-4 text-sky-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{inTransitCount}</div>
            <p className="text-xs text-slate-500 mt-1">Cargo moving between hubs</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Delivered
            </CardTitle>
            <CheckCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{deliveredCount}</div>
            <p className="text-xs text-slate-500 mt-1">Completed shipments</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Freight Value
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {formatINRFromPaise(totalFreightPaise)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Active waybill receivables</p>
          </CardContent>
        </Card>
      </div>

      {/* LR Table */}
      <LRTable initialLRs={lrs} hubs={hubs} tenantName={tenantName} userRole={session.role} />
    </div>
  );
}
