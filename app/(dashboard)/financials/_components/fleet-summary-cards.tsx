'use client';

import React from 'react';
import type { FleetPLMetrics } from '@/lib/db/financials';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import {
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  Truck,
  Receipt,
  PiggyBank,
  AlertCircle,
} from 'lucide-react';

interface FleetSummaryCardsProps {
  metrics: FleetPLMetrics;
}

export function FleetSummaryCards({ metrics }: FleetSummaryCardsProps) {
  const isNetPositive = metrics.netPLPaise >= 0;

  return (
    <div className="space-y-4">
      {/* 7 Key Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Booked Revenue */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Booked Revenue
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {paiseToCurrency(metrics.bookedRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>{metrics.bookedLRCount} consignments booked</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50/50 text-blue-700">
                Gross Inflow
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 2. Collected Revenue */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Collected In-Hand
              </span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight">
              {paiseToCurrency(metrics.collectedRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>{metrics.collectedLRCount} LRs paid</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                {metrics.collectionRatePercent}% realized
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 3. Outstanding Receivables */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Receivables
              </span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-md">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-700 tracking-tight">
              {paiseToCurrency(metrics.outstandingReceivablesPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>{metrics.outstandingLRCount} LRs uncollected</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                To-Pay / TBB
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 4. Pipeline Revenue */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pipeline / On Road
              </span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-md">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-700 tracking-tight">
              {paiseToCurrency(metrics.pipelineRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>{metrics.pipelineLRCount} in-transit/arrived</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200">
                Live Snapshot
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Expenses, Net P&L, Driver Advances */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* 5. Total Trip Expenses */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Trip Expenses
              </span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-md">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700 tracking-tight">
              {paiseToCurrency(metrics.totalExpensesPaise)}
            </div>
            <p className="text-xs text-slate-500 pt-1 border-t border-slate-100">
              Diesel, toll, bhatta, maintenance & labour
            </p>
          </CardContent>
        </Card>

        {/* 6. Net Profit / Loss */}
        <Card className={`border-slate-200 shadow-2xs ${isNetPositive ? 'bg-emerald-50/20' : 'bg-rose-50/20'}`}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Net Operating P/L
              </span>
              <div className={`p-1.5 rounded-md ${isNetPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {isNetPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${isNetPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {paiseToCurrency(metrics.netPLPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Margin: {metrics.profitMarginPercent}%</span>
              <Badge
                variant="outline"
                className={`text-[10px] font-semibold ${
                  isNetPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {isNetPositive ? 'Profitable' : 'Deficit'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* 7. Driver Advance Outstanding */}
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Unsettled Driver Advances
              </span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">
              {paiseToCurrency(metrics.unsettledAdvancesPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>{metrics.unsettledTripsCount} trips pending settlement</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-slate-50 text-slate-700">
                Ledger Net
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aging Receivables Breakdown Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Receivables Aging Analysis
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Total Outstanding: <strong className="text-slate-900">{paiseToCurrency(metrics.outstandingReceivablesPaise)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-800">🟢 0 to 7 Days (Current)</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] hover:bg-emerald-100">
                {metrics.aging.bucket0to7Count} LRs
              </Badge>
            </div>
            <div className="text-lg font-bold text-emerald-900">
              {paiseToCurrency(metrics.aging.bucket0to7Paise)}
            </div>
            <p className="text-[11px] text-emerald-700">Standard delivery credit window</p>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-800">🟡 7 to 30 Days (Due)</span>
              <Badge className="bg-amber-100 text-amber-800 text-[10px] hover:bg-amber-100">
                {metrics.aging.bucket7to30Count} LRs
              </Badge>
            </div>
            <div className="text-lg font-bold text-amber-900">
              {paiseToCurrency(metrics.aging.bucket7to30Paise)}
            </div>
            <p className="text-[11px] text-amber-700">Follow-up reminders recommended</p>
          </div>

          <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-md space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-800">🔴 30+ Days (Overdue)</span>
              <Badge className="bg-rose-100 text-rose-800 text-[10px] hover:bg-rose-100">
                {metrics.aging.bucket30PlusCount} LRs
              </Badge>
            </div>
            <div className="text-lg font-bold text-rose-900">
              {paiseToCurrency(metrics.aging.bucket30PlusPaise)}
            </div>
            <p className="text-[11px] text-rose-700">High collection risk</p>
          </div>
        </div>
      </div>
    </div>
  );
}
