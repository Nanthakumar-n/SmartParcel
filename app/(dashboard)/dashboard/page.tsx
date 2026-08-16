import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getDashboardMetrics } from '@/lib/db/dashboard';
import { getRecentLRsByTenant } from '@/lib/db/lorry-receipts';
import { getTenantById } from '@/lib/db/tenants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { DashboardMetricCards } from './_components/dashboard-metric-cards';
import { RecentLRsTable } from './_components/recent-lrs-table';
import { SetupChecklist } from './_components/setup-checklist';
import { OperationsOverview } from './_components/operations-overview';

export const metadata: Metadata = {
  title: 'Dashboard | SmartParcel Logistics',
  description: 'Real-time fleet operations, lorry receipts pipeline, and dispatch metrics.',
};

export default async function DashboardPage() {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  // Fetch metrics, recent LRs, and tenant details in parallel per developer standards
  const [metrics, recentLrs, tenant] = await Promise.all([
    getDashboardMetrics(supabase),
    getRecentLRsByTenant(supabase, 5),
    getTenantById(supabase, session.tenantId),
  ]);

  const isFleetOwner = session.role === 'fleet_owner';
  const tenantName = tenant?.name ?? 'SmartParcel Logistics';
  const { isSetupComplete } = metrics.onboardingStatus;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Operational Dashboard
            </h1>
            <Badge
              variant="outline"
              className="text-xs bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider"
            >
              {isFleetOwner ? 'Fleet Overview' : 'Branch View'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time consignment metrics, dispatch status, and active operations for{' '}
            <span className="font-semibold text-slate-700">{tenantName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/lorry-receipts/new">
            <Button size="sm" className="gap-2 font-semibold shadow-xs bg-blue-600 hover:bg-blue-700 text-white">
              <PlusCircle className="h-4 w-4" />
              <span>New Lorry Receipt (F2)</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Live Metric Cards */}
      <DashboardMetricCards metrics={metrics} />

      {/* Main Grid: Recent LRs & Setup / Operations Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent LRs Table */}
        <div className="lg:col-span-2 space-y-6">
          <RecentLRsTable recentLrs={recentLrs} tenantName={tenantName} />
        </div>

        {/* Right 1 Col: Dynamic Setup Checklist OR Operations Overview */}
        <div className="space-y-6">
          {isSetupComplete ? (
            <OperationsOverview metrics={metrics} />
          ) : (
            <SetupChecklist onboarding={metrics.onboardingStatus} />
          )}
        </div>
      </div>
    </div>
  );
}
