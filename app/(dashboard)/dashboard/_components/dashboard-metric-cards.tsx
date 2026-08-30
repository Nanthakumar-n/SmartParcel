import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Inbox,
  Truck,
  IndianRupee,
  ArrowUpRight,
  Receipt,
} from 'lucide-react';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import type { DashboardMetrics } from '@/lib/db/dashboard';

interface DashboardMetricCardsProps {
  metrics: DashboardMetrics;
}

export function DashboardMetricCards({ metrics }: DashboardMetricCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* Metric 1: Active LRs */}
      <Link href="/lorry-receipts" className="block group">
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-blue-300 hover:shadow-xs transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 group-hover:text-blue-600 transition-colors flex items-center gap-1">
              <span>Active Consignments</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.activeLRCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.inTransitLRCount} in transit • {metrics.deliveredLRCount} delivered
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Metric 2: Pending Web Bookings */}
      <Link href="/booking-requests" className="block group">
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-amber-300 hover:shadow-xs transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 group-hover:text-amber-600 transition-colors flex items-center gap-1">
                <span>Pending Bookings</span>
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardTitle>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-slate-900">
                {metrics.pendingBookingsCount}
              </div>
              {metrics.pendingBookingsCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 font-bold hover:bg-amber-100">
                  Action Required
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.pendingBookingsCount > 0
                ? 'Awaiting hub review & acceptance'
                : 'All customer requests processed'}
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Metric 3: Active Trucks & Fleet */}
      <Link href="/vehicles" className="block group">
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-purple-300 hover:shadow-xs transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 group-hover:text-purple-600 transition-colors flex items-center gap-1">
              <span>Active Fleet</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-md">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {metrics.activeVehiclesCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {metrics.inTransitVehiclesCount} on road • {metrics.activeDriversCount} drivers
            </p>
          </CardContent>
        </Card>
      </Link>

      {/* Metric 4: Monthly Freight Revenue */}
      <Card className="border-slate-200 shadow-2xs bg-white">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Monthly Freight
          </CardTitle>
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md">
            <IndianRupee className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-slate-900">
            {formatINRFromPaise(metrics.monthlyFreightPaise)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Booked this month • {metrics.operationalHubsCount} hubs
          </p>
        </CardContent>
      </Card>

      {/* Metric 5: Unsettled Trip Expenses (Phase 1.5) */}
      <Link href="/trip-expenses" className="block group">
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-blue-300 hover:shadow-xs transition-all h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-600 group-hover:text-blue-600 transition-colors flex items-center gap-1">
              <span>Unsettled Trips</span>
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <Receipt className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-slate-900">
                {metrics.unsettledTripsCount}
              </div>
              {metrics.unsettledTripsCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0 font-bold"
                >
                  Ledger Open
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">
              Net balance: {formatINRFromPaise(Math.abs(metrics.unsettledTripsBalancePaise))}
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
