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
import { Truck, ArrowRight, TrendingUp, TrendingDown, ExternalLink, Search } from 'lucide-react';

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
        return matchesRoute || matchesVehicle || matchesDriver;
      }
      return true;
    });
  }, [trips, search, statusFilter]);

  const totalRevenue = filteredTrips.reduce((sum, t) => sum + t.freightRevenuePaise, 0);
  const totalExpenses = filteredTrips.reduce((sum, t) => sum + t.totalExpensesPaise, 0);
  const totalNet = filteredTrips.reduce((sum, t) => sum + t.netPLPaise, 0);

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by route, vehicle, driver..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-xs h-8"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <Button
            type="button"
            variant={statusFilter === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('ALL')}
            className="text-xs h-7 px-2.5"
          >
            All Trips ({trips.length})
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'IN_TRANSIT' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('IN_TRANSIT')}
            className="text-xs h-7 px-2.5"
          >
            In Transit
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'COMPLETED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('COMPLETED')}
            className="text-xs h-7 px-2.5"
          >
            Completed
          </Button>
          <Button
            type="button"
            variant={statusFilter === 'SCHEDULED' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('SCHEDULED')}
            className="text-xs h-7 px-2.5"
          >
            Scheduled
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Trip-Level Revenue, Cost & Profitability Statement
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Showing {filteredTrips.length} trips
          </span>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <TableHead>Route Corridor</TableHead>
                <TableHead>Vehicle & Driver</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Manifest</TableHead>
                <TableHead className="text-right">Freight Revenue</TableHead>
                <TableHead className="text-right">Road Expenses</TableHead>
                <TableHead className="text-right">Net Trip P/L</TableHead>
                <TableHead className="text-right">Driver Balance</TableHead>
                <TableHead className="text-right w-[110px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-xs text-slate-500">
                    No trips match the current filter or date range.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const isPositive = trip.netPLPaise >= 0;

                  return (
                    <TableRow key={trip.id} className="text-xs hover:bg-slate-50/80">
                      {/* Route */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold">
                          <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-800">
                            {trip.fromHub.hub_code}
                          </Badge>
                          <ArrowRight className="h-3 w-3 text-slate-400" />
                          <Badge variant="outline" className="font-mono text-[10px] bg-slate-100 text-slate-800">
                            {trip.toHub.hub_code}
                          </Badge>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {trip.fromHub.city} → {trip.toHub.city}
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
                          className={`text-[10px] font-semibold ${
                            trip.status === 'IN_TRANSIT'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : trip.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {trip.status}
                        </Badge>
                      </TableCell>

                      {/* Manifest count */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-800">
                          {trip.lrCount} LRs
                        </Badge>
                      </TableCell>

                      {/* Freight Revenue */}
                      <TableCell className="text-right font-bold text-slate-900">
                        {paiseToCurrency(trip.freightRevenuePaise)}
                      </TableCell>

                      {/* Trip Expenses */}
                      <TableCell className="text-right text-rose-700 font-medium">
                        {paiseToCurrency(trip.totalExpensesPaise)}
                      </TableCell>

                      {/* Net Trip P/L */}
                      <TableCell className="text-right font-bold">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {paiseToCurrency(trip.netPLPaise)}
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
                            className={`text-xs font-semibold ${
                              trip.driverBalancePaise > 0
                                ? 'text-blue-700'
                                : trip.driverBalancePaise < 0
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
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
                            className="h-7 text-xs px-2.5 font-semibold text-blue-700 bg-blue-50/70 border-blue-200 hover:bg-blue-100 shadow-2xs"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Ledger
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Total Row */}
              {filteredTrips.length > 0 && (
                <TableRow className="bg-slate-100/70 font-bold text-xs border-t-2 border-slate-300">
                  <TableCell colSpan={4} className="uppercase text-slate-800 tracking-wider">
                    Total ({filteredTrips.length} Trips)
                  </TableCell>
                  <TableCell className="text-right text-slate-900">{paiseToCurrency(totalRevenue)}</TableCell>
                  <TableCell className="text-right text-rose-800">{paiseToCurrency(totalExpenses)}</TableCell>
                  <TableCell className={`text-right ${totalNet >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
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
