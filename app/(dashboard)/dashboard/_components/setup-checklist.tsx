import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Building2,
  Truck,
  Users,
  ArrowRight,
} from 'lucide-react';
import type { DashboardMetrics } from '@/lib/db/dashboard';

interface SetupChecklistProps {
  onboarding: DashboardMetrics['onboardingStatus'];
}

export function SetupChecklist({ onboarding }: SetupChecklistProps) {
  const { hasHubs, hasVehicles, hasDrivers, completedSteps, totalSteps } =
    onboarding;

  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  return (
    <Card className="border-slate-200 shadow-xs bg-white">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-slate-900">
            Setup Checklist
          </CardTitle>
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold"
          >
            {completedSteps}/{totalSteps} Done
          </Badge>
        </div>
        <CardDescription className="text-xs text-slate-500">
          Complete initial steps to activate full logistics workflows
        </CardDescription>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-3">
        {/* Step 1: Workspace */}
        <div className="flex items-start gap-3 p-2.5 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-slate-900 block">1. Company Workspace</span>
            <span className="text-slate-500 text-[11px]">Tenant account created and active.</span>
          </div>
        </div>

        {/* Step 2: Hubs */}
        {hasHubs ? (
          <div className="flex items-start gap-3 p-2.5 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-slate-900 block">2. Branch Hubs Configured</span>
              <span className="text-slate-500 text-[11px]">Origin and destination branch codes active.</span>
            </div>
          </div>
        ) : (
          <Link
            href="/hubs"
            className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
          >
            <Building2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-blue-600">
                  2. Configure Hubs
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600" />
              </div>
              <span className="text-slate-500 text-[11px]">
                Add origin & destination branch codes (e.g. MUM, DEL).
              </span>
            </div>
          </Link>
        )}

        {/* Step 3: Vehicles */}
        {hasVehicles ? (
          <div className="flex items-start gap-3 p-2.5 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-slate-900 block">3. Trucks Registered</span>
              <span className="text-slate-500 text-[11px]">Fleet vehicles ready for cargo slotting.</span>
            </div>
          </div>
        ) : (
          <Link
            href="/vehicles"
            className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
          >
            <Truck className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-purple-600">
                  3. Register Trucks
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-purple-600" />
              </div>
              <span className="text-slate-500 text-[11px]">
                Add registration numbers and vehicle capacities.
              </span>
            </div>
          </Link>
        )}

        {/* Step 4: Drivers */}
        {hasDrivers ? (
          <div className="flex items-start gap-3 p-2.5 rounded-md bg-emerald-50/60 border border-emerald-100 text-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-slate-900 block">4. Drivers Registered</span>
              <span className="text-slate-500 text-[11px]">Driver profiles and licenses recorded.</span>
            </div>
          </div>
        ) : (
          <Link
            href="/drivers"
            className="flex items-start gap-3 p-2.5 rounded-md hover:bg-slate-50 border border-slate-200 text-xs transition-colors group"
          >
            <Users className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-900 group-hover:text-amber-600">
                  4. Register Drivers
                </span>
                <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-amber-600" />
              </div>
              <span className="text-slate-500 text-[11px]">
                Add driver contact phone and commercial license details.
              </span>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
