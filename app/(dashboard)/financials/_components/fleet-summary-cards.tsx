'use client';

import React from 'react';
import type { FleetPLMetrics } from '@/lib/db/financials';
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
  Percent,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FleetSummaryCardsProps {
  metrics: FleetPLMetrics;
}

export function FleetSummaryCards({ metrics }: FleetSummaryCardsProps) {
  const isNetPositive = metrics.netPLPaise >= 0;
  const collectionRate = Math.min(100, Math.max(0, metrics.collectionRatePercent));

  return (
    <div className="w-full space-y-6">
      {/* Top Financial Health Summary Ribbon */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl font-bold shadow-2xs',
            isNetPositive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
          )}>
            {isNetPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Fleet Net Operating Status</div>
            <div className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{isNetPositive ? 'Operating at Profit' : 'Operating at Deficit'}</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs font-bold px-2 py-0.5',
                  isNetPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                )}
              >
                {metrics.profitMarginPercent}% Margin
              </Badge>
            </div>
          </div>
        </div>

        {/* Realization Progress Bar */}
        <div className="flex-1 max-w-md bg-white border border-slate-200 rounded-lg p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <Percent className="h-3 w-3 text-blue-600" />
              <span>Cash Realization Rate</span>
            </span>
            <span className="font-mono text-emerald-700 font-bold">{collectionRate}% Realized</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${collectionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Row 1: Primary Revenue Flow Matrix (4 Columns) */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 select-none">
          1. Consolidated Revenue Inflow
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Booked Revenue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Booked Revenue
              </span>
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {paiseToCurrency(metrics.bookedRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{metrics.bookedLRCount} consignments</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50/50 text-blue-700 border-blue-200">
                Gross Invoiced
              </Badge>
            </div>
          </div>

          {/* 2. Collected Revenue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Collected In-Hand
              </span>
              <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-700 tracking-tight font-sans">
              {paiseToCurrency(metrics.collectedRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{metrics.collectedLRCount} LRs settled</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                Cash / Bank
              </Badge>
            </div>
          </div>

          {/* 3. Outstanding Receivables */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Outstanding Receivables
              </span>
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-amber-700 tracking-tight font-sans">
              {paiseToCurrency(metrics.outstandingReceivablesPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{metrics.outstandingLRCount} pending LRs</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                To-Pay / Credit
              </Badge>
            </div>
          </div>

          {/* 4. Pipeline Revenue */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Pipeline / On-Road
              </span>
              <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                <Truck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-700 tracking-tight font-sans">
              {paiseToCurrency(metrics.pipelineRevenuePaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{metrics.pipelineLRCount} active in-transit</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-purple-50 text-purple-700 border-purple-200">
                Active Trips
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Operating Expenses & Net P&L (3 Columns) */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 select-none">
          2. Fleet Cost & Profitability Statement
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 5. Total Trip Expenses */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Direct Trip Costs
              </span>
              <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700 tracking-tight font-sans">
              {paiseToCurrency(metrics.totalExpensesPaise)}
            </div>
            <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
              Diesel, toll taxes, driver bhatta, repairs & labour
            </p>
          </div>

          {/* 6. Net Profit / Loss */}
          <div className={cn(
            'p-4 rounded-xl border shadow-2xs space-y-2 transition-colors',
            isNetPositive ? 'bg-emerald-50/30 border-emerald-200' : 'bg-rose-50/30 border-rose-200'
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Net Operating P/L
              </span>
              <div className={cn(
                'p-1.5 rounded-lg border',
                isNetPositive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'
              )}>
                {isNetPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </div>
            </div>
            <div className={cn(
              'text-2xl font-bold tracking-tight font-sans',
              isNetPositive ? 'text-emerald-700' : 'text-rose-700'
            )}>
              {paiseToCurrency(metrics.netPLPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
              <span>Overall Fleet Profit Margin</span>
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-bold px-2 py-0.5',
                  isNetPositive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-rose-50 text-rose-700 border-rose-300'
                )}
              >
                {metrics.profitMarginPercent}% Net
              </Badge>
            </div>
          </div>

          {/* 7. Driver Advance Outstanding */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-2 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Unsettled Driver Advances
              </span>
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              {paiseToCurrency(metrics.unsettledAdvancesPaise)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>{metrics.unsettledTripsCount} trips pending settlement</span>
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                Trip Ledger Net
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Aging Receivables Breakdown Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Receivables Aging Buckets & Credit Risk
            </h4>
          </div>
          <span className="text-xs text-slate-500">
            Total Uncollected: <strong className="text-slate-900 font-mono">{paiseToCurrency(metrics.outstandingReceivablesPaise)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">🟢 0 to 7 Days (Current)</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] hover:bg-emerald-100 border border-emerald-200 font-mono">
                {metrics.aging.bucket0to7Count} LRs
              </Badge>
            </div>
            <div className="text-xl font-bold text-emerald-900 font-sans">
              {paiseToCurrency(metrics.aging.bucket0to7Paise)}
            </div>
            <p className="text-[11px] text-emerald-700">Standard counter and delivery credit cycle</p>
          </div>

          <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">🟡 7 to 30 Days (Due)</span>
              <Badge className="bg-amber-100 text-amber-800 text-[10px] hover:bg-amber-100 border border-amber-200 font-mono">
                {metrics.aging.bucket7to30Count} LRs
              </Badge>
            </div>
            <div className="text-xl font-bold text-amber-900 font-sans">
              {paiseToCurrency(metrics.aging.bucket7to30Paise)}
            </div>
            <p className="text-[11px] text-amber-700">Payment reminders actively recommended</p>
          </div>

          <div className="p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">🔴 30+ Days (Overdue)</span>
              <Badge className="bg-rose-100 text-rose-800 text-[10px] hover:bg-rose-100 border border-rose-200 font-mono">
                {metrics.aging.bucket30PlusCount} LRs
              </Badge>
            </div>
            <div className="text-xl font-bold text-rose-900 font-sans">
              {paiseToCurrency(metrics.aging.bucket30PlusPaise)}
            </div>
            <p className="text-[11px] text-rose-700">Critical overdue risk requiring manual escalation</p>
          </div>
        </div>
      </div>
    </div>
  );
}
