import React from 'react';
import Link from 'next/link';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Truck,
  Inbox,
  PlusCircle,
  Building2,
  Users,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface RecentLRItem {
  id: string;
  lr_number: string | null;
  consignor_name: string;
  consignee_name: string;
  status: string;
  freight_amount: number;
  booking_date: string;
}

export default async function DashboardPage() {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  // Fetch metrics in parallel using Promise.all per developer standards
  const [
    { count: lrCount },
    { count: vehicleCount },
    { count: hubCount },
    { count: bookingCount },
    recentLrsRes,
  ] = await Promise.all([
    supabase
      .from('lorry_receipts')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'CANCELLED'),
    supabase
      .from('vehicles')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('hubs')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('booking_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
    supabase
      .from('lorry_receipts')
      .select('id, lr_number, consignor_name, consignee_name, status, freight_amount, booking_date')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const recentLrs = (recentLrsRes.data as RecentLRItem[] | null) ?? [];

  const isFleetOwner = session.role === 'fleet_owner';

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Operational Dashboard
            </h1>
            <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
              {isFleetOwner ? 'Fleet Overview' : 'Branch View'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time shipment metrics, dispatch status, and quick operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/lorry-receipts/new">
            <Button size="sm" className="gap-2 font-semibold shadow-xs">
              <PlusCircle className="h-4 w-4" />
              New Lorry Receipt (LR)
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Active LRs */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Active Lorry Receipts
            </CardTitle>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
              <FileText className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{lrCount ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active consignments in system
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Pending Booking Requests */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Pending Web Bookings
            </CardTitle>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-md">
              <Inbox className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{bookingCount ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Awaiting Hub review & acceptance
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Active Fleet Vehicles */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Active Trucks & Vehicles
            </CardTitle>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-md">
              <Truck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{vehicleCount ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Trucks in fleet registry
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Operational Hub Branches */}
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-600">
              Operational Hubs
            </CardTitle>
            <div className="p-2 bg-green-50 text-green-600 rounded-md">
              <Building2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{hubCount ?? 0}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Active branch locations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent LRs & Setup Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent LRs Table */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Recent Lorry Receipts
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Latest consignments booked across your network
              </CardDescription>
            </div>
            <Link href="/lorry-receipts">
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-blue-600 font-semibold hover:text-blue-700">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0">
            {recentLrs && recentLrs.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {recentLrs.map((lr) => (
                  <div key={lr.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{lr.lr_number}</span>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {lr.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">
                        {lr.consignor_name} → {lr.consignee_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-slate-900 block">
                        {paiseToCurrency(Number(lr.freight_amount))}
                      </span>
                      <span className="text-[11px] text-slate-400">{lr.booking_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center space-y-3">
                <div className="mx-auto w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-700">No Lorry Receipts issued yet</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Start by setting up your hubs and issuing your first digital LR with auto-numbering.
                  </p>
                </div>
                <Link href="/lorry-receipts/new">
                  <Button size="sm" className="mt-2 text-xs">
                    Issue First LR
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right 1 Col: Quick Setup & Onboarding Checklist */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold text-slate-900">
                Setup Checklist
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Initial steps to fully automate operations
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start gap-3 p-2.5 rounded-md bg-slate-50 border text-xs">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 block">1. Company Workspace</span>
                  <span className="text-slate-500 text-[11px]">Tenant account created and active.</span>
                </div>
              </div>

              <Link
                href="/hubs"
                className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
              >
                <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 group-hover:text-blue-600">2. Configure Hubs</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600" />
                  </div>
                  <span className="text-slate-500 text-[11px]">Add origin & destination branch codes (e.g. MUM, DEL).</span>
                </div>
              </Link>

              <Link
                href="/vehicles"
                className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
              >
                <Truck className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 group-hover:text-purple-600">3. Register Trucks</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-purple-600" />
                  </div>
                  <span className="text-slate-500 text-[11px]">Add registration numbers and vehicle capacities.</span>
                </div>
              </Link>

              <Link
                href="/users"
                className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
              >
                <Users className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 group-hover:text-amber-600">4. Invite Hub Managers</span>
                    <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-amber-600" />
                  </div>
                  <span className="text-slate-500 text-[11px]">Assign managers to their respective branch hubs.</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
