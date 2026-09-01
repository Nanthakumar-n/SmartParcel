'use client';

import React from 'react';
import Link from 'next/link';
import type { TripPLRow } from '@/lib/db/financials';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import { ArrowRight, TrendingUp, TrendingDown, ExternalLink, Search, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripPLTableProps {
  trips: TripPLRow[];
}

export function TripPLTable({ trips }: TripPLTableProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'IN_TRANSIT' | 'COMPLETED' | 'SCHEDULED'>('ALL');

  const filteredTrips = React.useMemo(() => {
    return trips.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }
      if (search.trim() !== '') {
        const s = search.toLowerCase();
        const matchesRoute =
          t.fromHub.hub_code.toLowerCase().includes(s) ||
          t.toHub.hub_code.toLowerCase().includes(s) ||
          t.fromHub.city.toLowerCase().includes(s) ||
          t.toHub.city.toLowerCase().includes(s);
        const matchesVehicle = t.vehicle?.registration_number.toLowerCase().includes(s);
        const matchesDriver = t.driver?.full_name.toLowerCase().includes(s);
        return Boolean(matchesRoute || matchesVehicle || matchesDriver);
      }
      return true;
    });
  }, [trips, search, statusFilter]);

  const totalRevenue = filteredTrips.reduce((sum, t) => sum + t.freightRevenuePaise, 0);
  const totalExpenses = filteredTrips.reduce((sum, t) => sum + t.totalExpensesPaise, 0);
  const totalNet = filteredTrips.reduce((sum, t) => sum + t.netPLPaise, 0);

  return (
    <div className="w-full space-y-4">
      {/* Search & Status Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search route code, vehicle reg, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8 bg-white border-slate-200 focus-visible:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-200/60 p-1 rounded-lg">
          {(['ALL', 'IN_TRANSIT', 'COMPLETED', 'SCHEDULED'] as const).map((st) => {
            const isSelected = statusFilter === st;
            const label = st === 'ALL' ? `All (${trips.length})` : st === 'IN_TRANSIT' ? 'In Transit' : st === 'COMPLETED' ? 'Completed' : 'Scheduled';
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-md transition-all shrink-0 select-none',
                  isSelected
                    ? 'bg-white text-blue-700 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <TableHead className="font-semibold text-slate-700">Route Corridor</TableHead>
                <TableHead className="font-semibold text-slate-700">Vehicle & Driver</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Manifest</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Freight Revenue</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Direct Road Costs</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Net Trip P/L</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Driver Ledger</TableHead>
                <TableHead className="text-right w-[100px] font-semibold text-slate-700">Ledger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-slate-300" />
                      <span>No trips match the current filter or date range.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip, idx) => {
                  const isPositive = trip.netPLPaise >= 0;

                  return (
                    <TableRow
                      key={trip.id}
                      className={cn(
                        'text-xs hover:bg-slate-50/80 border-b border-slate-100 transition-colors',
                        idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                      )}
                    >
                      {/* Route */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold">
                          <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-800 border-slate-200">
                            {trip.fromHub.hub_code}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-800 border-slate-200">
                            {trip.toHub.hub_code}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {trip.fromHub.city} &rarr; {trip.toHub.city}
                        </div>
                      </TableCell>

                      {/* Vehicle & Driver */}
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900 font-mono">
                            {trip.vehicle?.registration_number || 'Unassigned'}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {trip.driver ? (
                              <>
                                {trip.driver.full_name} ({formatPhoneDisplay(trip.driver.phone)})
                              </>
                            ) : (
                              'Contractor / No Driver'
                            )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold',
                            trip.status === 'IN_TRANSIT' && 'bg-blue-50 text-blue-800 border-blue-200',
                            trip.status === 'COMPLETED' && 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            trip.status === 'SCHEDULED' && 'bg-slate-100 text-slate-700 border-slate-200'
                          )}
                        >
                          {trip.status}
                        </Badge>
                      </TableCell>

                      {/* Manifest count */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700 font-mono border-slate-200">
                          {trip.lrCount} LRs
                        </Badge>
                      </TableCell>

                      {/* Freight Revenue */}
                      <TableCell className="text-right font-bold text-slate-900 font-sans">
                        {paiseToCurrency(trip.freightRevenuePaise)}
                      </TableCell>

                      {/* Trip Expenses */}
                      <TableCell className="text-right text-rose-700 font-medium font-sans">
                        {paiseToCurrency(trip.totalExpensesPaise)}
                      </TableCell>

                      {/* Net Trip P/L */}
                      <TableCell className="text-right font-bold font-sans">
                        <div
                          className={cn(
                            'flex items-center justify-end gap-1',
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          )}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>{paiseToCurrency(trip.netPLPaise)}</span>
                        </div>
                      </TableCell>

                      {/* Driver Advance Ledger Balance */}
                      <TableCell className="text-right">
                        {trip.isSettled ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                            Settled
                          </Badge>
                        ) : (
                          <span
                            className={cn(
                              'text-xs font-semibold font-sans',
                              trip.driverBalancePaise > 0
                                ? 'text-blue-700'
                                : trip.driverBalancePaise < 0
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            )}
                          >
                            {paiseToCurrency(trip.driverBalancePaise)}
                          </span>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Link href="/trip-expenses">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2.5 font-semibold text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100 shadow-2xs rounded-md"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            <span>Expenses</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Total Summary Row */}
              {filteredTrips.length > 0 && (
                <TableRow className="bg-slate-100/90 font-bold text-xs border-t-2 border-slate-300 shadow-2xs">
                  <TableCell colSpan={4} className="uppercase text-slate-900 tracking-wider font-bold">
                    Filtered Total ({filteredTrips.length} Trips)
                  </TableCell>
                  <TableCell className="text-right text-slate-900 font-sans">{paiseToCurrency(totalRevenue)}</TableCell>
                  <TableCell className="text-right text-rose-800 font-sans">{paiseToCurrency(totalExpenses)}</TableCell>
                  <TableCell className={cn('text-right font-sans', totalNet >= 0 ? 'text-emerald-800' : 'text-rose-800')}>
                    {paiseToCurrency(totalNet)}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
