import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getFleetPL,
  getHubPL,
  getTripPLByTenant,
  type DateRangeFilter,
} from '@/lib/db/financials';
import { DateRangePicker, type DatePreset } from './_components/date-range-picker';
import { FinancialsTabs, type FinancialsTabId } from './_components/financials-tabs';
import { FleetPLTab } from './_components/fleet-pl-tab';
import { HubPLTab } from './_components/hub-pl-tab';
import { TripPLTab } from './_components/trip-pl-tab';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Revenue Management & Fleet P/L | SmartParcel Logistics',
  description: 'Running Profit & Loss statement for the fleet, per hub branch, and per trip.',
};

interface FinancialsPageProps {
  searchParams?: {
    tab?: string;
    preset?: DatePreset;
    from?: string;
    to?: string;
  };
}

function computeDefaultMonthRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const firstDay = `${year}-${month}-01`;
  const lastDayObj = new Date(year, now.getMonth() + 1, 0);
  const lastDay = `${year}-${month}-${String(lastDayObj.getDate()).padStart(2, '0')}`;
  return { from: firstDay, to: lastDay };
}

export default async function FinancialsPage({ searchParams }: FinancialsPageProps) {
  // Fleet Owner only access
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();

  const currentTab = (searchParams?.tab as FinancialsTabId) || 'fleet-pl';
  const preset = searchParams?.preset || 'month';

  let dateFrom = searchParams?.from;
  let dateTo = searchParams?.to;

  // If no date params provided and preset is 'month', default to current calendar month
  if (!dateFrom && !dateTo && preset === 'month') {
    const def = computeDefaultMonthRange();
    dateFrom = def.from;
    dateTo = def.to;
  }

  const dateRange: DateRangeFilter = {
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  // Parallel server-side data fetching
  const [fleetMetrics, hubRows, tripRows] = await Promise.all([
    getFleetPL(supabase, dateRange),
    getHubPL(supabase, dateRange),
    getTripPLByTenant(supabase, dateRange),
  ]);

  const isNetPositive = fleetMetrics.netPLPaise >= 0;

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Banner Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Revenue Management & Fleet P/L</span>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Executive Ledger</span>
              </Badge>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Consolidated profit & loss statement, cash realization rate, receivables aging, and route-level cost analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs bg-slate-50 text-slate-700 font-semibold px-2.5 py-1 font-mono border-slate-200"
          >
            {hubRows.length} Branch Hubs
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-bold px-2.5 py-1',
              isNetPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            )}
          >
            Margin: {fleetMetrics.profitMarginPercent}% Net
          </Badge>
        </div>
      </div>

      {/* Date Range Picker Filter Strip */}
      <DateRangePicker
        currentPreset={preset}
        dateFrom={dateFrom || ''}
        dateTo={dateTo || ''}
      />

      {/* Excel Workbook Sheet Tabs */}
      <FinancialsTabs
        activeTab={currentTab}
        hubCount={hubRows.length}
        tripCount={tripRows.length}
      >
        {currentTab === 'fleet-pl' && (
          <FleetPLTab metrics={fleetMetrics} />
        )}

        {currentTab === 'hub-pl' && (
          <HubPLTab hubRows={hubRows} dateRange={dateRange} />
        )}

        {currentTab === 'trip-pl' && (
          <TripPLTab trips={tripRows} />
        )}
      </FinancialsTabs>
    </div>
  );
}
