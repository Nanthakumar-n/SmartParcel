'use client';

import React from 'react';
import type { HubPLRow, HubReceivableLR, DateRangeFilter } from '@/lib/db/financials';
import { getHubReceivablesAction } from '@/app/(dashboard)/financials/actions';
import { HubReceivablesSection } from './hub-receivables-section';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import { Building2, ChevronDown, ChevronRight, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

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

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">
            Hub-Wise Profit & Loss Statement
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          {hubRows.length} active branch hubs
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Hub Branch</TableHead>
              <TableHead className="text-right">Booked Revenue</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead className="text-right">Expenses (Origin)</TableHead>
              <TableHead className="text-right">Net Operating P/L</TableHead>
              <TableHead className="text-center">Margin</TableHead>
              <TableHead className="text-right w-[110px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hubRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-xs text-slate-500">
                  No active hubs found.
                </TableCell>
              </TableRow>
            ) : (
              hubRows.map((hub) => {
                const isExpanded = expandedHubId === hub.hubId;
                const isPositive = hub.netPLPaise >= 0;

                return (
                  <React.Fragment key={hub.hubId}>
                    <TableRow
                      className={`text-xs hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isExpanded ? 'bg-blue-50/20' : ''
                      }`}
                      onClick={() => toggleExpand(hub.hubId)}
                    >
                      <TableCell className="p-2 text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[10px] font-bold bg-slate-100 text-slate-800">
                            {hub.hubCode}
                          </Badge>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{hub.hubName}</span>
                            <span className="text-[10px] text-slate-500">{hub.city}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-slate-900">
                        <div>{paiseToCurrency(hub.bookedRevenuePaise)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {hub.bookedLRCount} LRs
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-emerald-700 font-medium">
                        <div>{paiseToCurrency(hub.collectedRevenuePaise)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {hub.collectedLRCount} paid
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-amber-700 font-medium">
                        <div>{paiseToCurrency(hub.outstandingReceivablesPaise)}</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {hub.outstandingLRCount} uncollected
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-rose-700 font-medium">
                        {paiseToCurrency(hub.totalExpensesPaise)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            isPositive ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {paiseToCurrency(hub.netPLPaise)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
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
                          className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Receivables
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Section for Receivables */}
                    {isExpanded && (
                      <TableRow className="hover:bg-transparent">
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

            {/* Total Row */}
            {hubRows.length > 0 && (
              <TableRow className="bg-slate-100/70 font-bold text-xs border-t-2 border-slate-300">
                <TableCell></TableCell>
                <TableCell className="uppercase text-slate-800 tracking-wider">Fleet Total</TableCell>
                <TableCell className="text-right text-slate-900">{paiseToCurrency(totalBooked)}</TableCell>
                <TableCell className="text-right text-emerald-800">{paiseToCurrency(totalCollected)}</TableCell>
                <TableCell className="text-right text-amber-800">{paiseToCurrency(totalOutstanding)}</TableCell>
                <TableCell className="text-right text-rose-800">{paiseToCurrency(totalExpenses)}</TableCell>
                <TableCell className={`text-right ${totalNet >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                  {paiseToCurrency(totalNet)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-[10px] bg-white font-bold text-slate-900 border-slate-300">
                    {totalBooked > 0 ? Math.round(((totalBooked - totalExpenses) / totalBooked) * 1000) / 10 : 0}%
                  </Badge>
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
