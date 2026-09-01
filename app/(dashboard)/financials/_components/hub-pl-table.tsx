'use client';

import React from 'react';
import type { HubPLRow, HubReceivableLR, DateRangeFilter } from '@/lib/db/financials';
import { getHubReceivablesAction } from '@/app/(dashboard)/financials/actions';
import { HubReceivablesSection } from './hub-receivables-section';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import { Building2, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Eye, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface HubPLTableProps {
  hubRows: HubPLRow[];
  dateRange?: DateRangeFilter;
}

export function HubPLTable({ hubRows, dateRange }: HubPLTableProps) {
  const [expandedHubId, setExpandedHubId] = React.useState<string | null>(null);
  const [receivablesCache, setReceivablesCache] = React.useState<Record<string, HubReceivableLR[]>>({});
  const [loadingHubId, setLoadingHubId] = React.useState<string | null>(null);

  const toggleExpand = async (hubId: string) => {
    if (expandedHubId === hubId) {
      setExpandedHubId(null);
      return;
    }

    setExpandedHubId(hubId);

    // If not cached, fetch via Server Action
    if (!receivablesCache[hubId]) {
      setLoadingHubId(hubId);
      try {
        const res = await getHubReceivablesAction(hubId, dateRange);
        if (res.success) {
          setReceivablesCache((prev) => ({ ...prev, [hubId]: res.data }));
        } else {
          toast.error('Failed to load hub receivables');
        }
      } catch {
        toast.error('Error fetching receivables');
      } finally {
        setLoadingHubId(null);
      }
    }
  };

  // Compute fleet totals across all hubs
  const totalBooked = hubRows.reduce((sum, h) => sum + h.bookedRevenuePaise, 0);
  const totalCollected = hubRows.reduce((sum, h) => sum + h.collectedRevenuePaise, 0);
  const totalOutstanding = hubRows.reduce((sum, h) => sum + h.outstandingReceivablesPaise, 0);
  const totalExpenses = hubRows.reduce((sum, h) => sum + h.totalExpensesPaise, 0);
  const totalNet = hubRows.reduce((sum, h) => sum + h.netPLPaise, 0);
  const totalMargin = totalBooked > 0 ? Math.round(((totalBooked - totalExpenses) / totalBooked) * 1000) / 10 : 0;

  return (
    <div className="w-full space-y-4">
      {/* Table Header Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Hub Branch Profit & Loss Matrix</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-700 border-slate-200">
                {hubRows.length} Branches
              </Badge>
            </h3>
            <p className="text-xs text-slate-500">
              Breakdown of booked freight, cash collected, unpaid receivables, and trip dispatch expenses per branch.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold">
            Fleet Net: {paiseToCurrency(totalNet)}
          </Badge>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                <TableHead className="w-[36px]"></TableHead>
                <TableHead className="font-semibold text-slate-700">Hub Branch</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Booked Freight</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Collected</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Outstanding</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Trip Expenses</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Net Operating P/L</TableHead>
                <TableHead className="text-center font-semibold text-slate-700">Margin</TableHead>
                <TableHead className="text-right w-[110px] font-semibold text-slate-700">Receivables</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hubRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Layers className="h-8 w-8 text-slate-300" />
                      <span>No active branch hubs recorded for this period.</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                hubRows.map((hub, idx) => {
                  const isExpanded = expandedHubId === hub.hubId;
                  const isPositive = hub.netPLPaise >= 0;

                  return (
                    <React.Fragment key={hub.hubId}>
                      <TableRow
                        className={cn(
                          'text-xs cursor-pointer transition-colors border-b border-slate-100 hover:bg-slate-50/80',
                          idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white',
                          isExpanded && 'bg-blue-50/30 border-blue-200'
                        )}
                        onClick={() => toggleExpand(hub.hubId)}
                      >
                        <TableCell className="p-2 text-slate-400 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-blue-600 inline" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800 border-slate-200">
                              {hub.hubCode}
                            </Badge>
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{hub.hubName}</span>
                              <span className="text-[10px] text-slate-500">{hub.city}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-slate-900 font-sans">
                          <div>{paiseToCurrency(hub.bookedRevenuePaise)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {hub.bookedLRCount} LRs
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-emerald-700 font-medium font-sans">
                          <div>{paiseToCurrency(hub.collectedRevenuePaise)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {hub.collectedLRCount} paid
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-amber-700 font-medium font-sans">
                          <div>{paiseToCurrency(hub.outstandingReceivablesPaise)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {hub.outstandingLRCount} uncollected
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-rose-700 font-medium font-sans">
                          {paiseToCurrency(hub.totalExpensesPaise)}
                        </TableCell>
                        <TableCell className="text-right font-bold font-sans">
                          <div
                            className={cn(
                              'flex items-center justify-end gap-1',
                              isPositive ? 'text-emerald-700' : 'text-rose-700'
                            )}
                          >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>{paiseToCurrency(hub.netPLPaise)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-bold px-1.5 py-0.5',
                              isPositive
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 text-rose-700 border-rose-300'
                            )}
                          >
                            {hub.profitMarginPercent}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(hub.hubId)}
                            className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md"
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            <span>Audit</span>
                          </Button>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Section for Receivables */}
                      {isExpanded && (
                        <TableRow className="hover:bg-transparent bg-slate-50/70 border-y border-blue-100">
                          <TableCell colSpan={9} className="p-0">
                            <HubReceivablesSection
                              hubCode={hub.hubCode}
                              hubName={hub.hubName}
                              receivables={receivablesCache[hub.hubId] || []}
                              isLoading={loadingHubId === hub.hubId}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}

              {/* Total Summary Row */}
              {hubRows.length > 0 && (
                <TableRow className="bg-slate-100/90 font-bold text-xs border-t-2 border-slate-300 shadow-2xs">
                  <TableCell></TableCell>
                  <TableCell className="uppercase text-slate-900 tracking-wider font-bold">Consolidated Fleet Total</TableCell>
                  <TableCell className="text-right text-slate-900 font-sans">{paiseToCurrency(totalBooked)}</TableCell>
                  <TableCell className="text-right text-emerald-800 font-sans">{paiseToCurrency(totalCollected)}</TableCell>
                  <TableCell className="text-right text-amber-800 font-sans">{paiseToCurrency(totalOutstanding)}</TableCell>
                  <TableCell className="text-right text-rose-800 font-sans">{paiseToCurrency(totalExpenses)}</TableCell>
                  <TableCell className={cn('text-right font-sans', totalNet >= 0 ? 'text-emerald-800' : 'text-rose-800')}>
                    {paiseToCurrency(totalNet)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-[10px] bg-white font-bold text-slate-900 border-slate-300">
                      {totalMargin}%
                    </Badge>
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
