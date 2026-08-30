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
import { FleetPLTab } from './_components/fleet-pl-tab';
import { HubPLTab } from './_components/hub-pl-tab';
import { TripPLTab } from './_components/trip-pl-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Building2, Truck, DollarSign } from 'lucide-react';

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

  const currentTab = searchParams?.tab || 'fleet-pl';
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Revenue Management & Profit / Loss
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Financial performance, collections, receivables aging, and profitability analytics across your fleet.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs bg-slate-50 text-slate-700 font-semibold px-2.5 py-1"
          >
            {hubRows.length} Hubs Active
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs font-semibold px-2.5 py-1 ${
              fleetMetrics.netPLPaise >= 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}
          >
            Margin: {fleetMetrics.profitMarginPercent}%
          </Badge>
        </div>
      </div>

      {/* Date Range Picker Toolbar */}
      <DateRangePicker
        currentPreset={preset}
        dateFrom={dateFrom || ''}
        dateTo={dateTo || ''}
      />

      {/* Sub-Tabs: Fleet P&L / Hub P&L / Trip P&L */}
      <Tabs defaultValue={currentTab} className="space-y-6">
        <TabsList className="bg-slate-100/90 p-1 border border-slate-200 grid grid-cols-3 w-full sm:w-auto sm:inline-flex">
          <TabsTrigger
            value="fleet-pl"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Fleet P&L</span>
          </TabsTrigger>
          <TabsTrigger
            value="hub-pl"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Hub P&L</span>
          </TabsTrigger>
          <TabsTrigger
            value="trip-pl"
            className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-xs flex items-center justify-center gap-1.5"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Trip P&L</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fleet-pl" className="m-0 focus-visible:outline-none">
          <FleetPLTab metrics={fleetMetrics} />
        </TabsContent>

        <TabsContent value="hub-pl" className="m-0 focus-visible:outline-none">
          <HubPLTab hubRows={hubRows} dateRange={dateRange} />
        </TabsContent>

        <TabsContent value="trip-pl" className="m-0 focus-visible:outline-none">
          <TripPLTab trips={tripRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
