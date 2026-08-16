import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PlusCircle,
  Inbox,
  Calendar,
  ArrowRight,
  Sparkles,
  Activity,
  CheckCircle2,
  Navigation,
} from 'lucide-react';
import type { DashboardMetrics } from '@/lib/db/dashboard';

interface OperationsOverviewProps {
  metrics: DashboardMetrics;
}

export function OperationsOverview({ metrics }: OperationsOverviewProps) {
  return (
    <div className="space-y-6">
      {/* Quick Action Shortcuts */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Quick Operations
              </CardTitle>
            </div>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">
              Fleet Ready
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Rapid access to core logistics workflows
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 space-y-2.5">
          {/* Action 1: Create LR */}
          <Link href="/lorry-receipts/new" className="block">
            <Button
              className="w-full justify-between bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs h-10"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Issue New Lorry Receipt (F2)
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>

          {/* Action 2: Trip Dispatches */}
          <Link href="/trip-dispatches" className="block">
            <Button
              variant="outline"
              className="w-full justify-between text-xs font-medium border-slate-200 hover:bg-slate-50 h-10 text-slate-800"
            >
              <span className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-sky-600" />
                Trip Dispatches & Manifests
              </span>
              <span className="text-[11px] text-slate-400">
                {metrics.activeTripsCount} Active
              </span>
            </Button>
          </Link>

          {/* Action 3: Booking Requests Queue */}
          <Link href="/booking-requests" className="block">
            <Button
              variant="outline"
              className="w-full justify-between text-xs font-medium border-slate-200 hover:bg-slate-50 h-10 text-slate-800"
            >
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4 text-amber-600" />
                Web Booking Queue
              </span>
              {metrics.pendingBookingsCount > 0 ? (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
                  {metrics.pendingBookingsCount} New
                </Badge>
              ) : (
                <span className="text-[11px] text-slate-400">0 Pending</span>
              )}
            </Button>
          </Link>

          {/* Action 4: Trip Schedules */}
          <Link href="/trip-schedules" className="block">
            <Button
              variant="outline"
              className="w-full justify-between text-xs font-medium border-slate-200 hover:bg-slate-50 h-10 text-slate-800"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-600" />
                Route Schedules
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Network & Transit Pulse */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <CardTitle className="text-sm font-bold text-slate-900">
              Fleet Network Status
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px] block">Trucks In Transit</span>
              <span className="text-base font-bold text-sky-700">
                {metrics.inTransitVehiclesCount} / {metrics.activeVehiclesCount}
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px] block">Operational Hubs</span>
              <span className="text-base font-bold text-emerald-700">
                {metrics.operationalHubsCount} Active
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="text-slate-700 font-medium">Registered Drivers</span>
            </div>
            <span className="font-bold text-slate-900">{metrics.activeDriversCount}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
