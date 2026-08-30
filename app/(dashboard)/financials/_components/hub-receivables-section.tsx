'use client';

import React from 'react';
import type { HubReceivableLR } from '@/lib/db/financials';
import { Badge } from '@/components/ui/badge';
import { paiseToCurrency } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, Phone, AlertCircle } from 'lucide-react';

interface HubReceivablesSectionProps {
  hubCode: string;
  hubName: string;
  receivables: HubReceivableLR[];
  isLoading?: boolean;
}

export function HubReceivablesSection({
  hubCode,
  hubName,
  receivables,
  isLoading = false,
}: HubReceivablesSectionProps) {
  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
        Loading uncollected receivables for {hubCode}...
      </div>
    );
  }

  if (receivables.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-emerald-50/40 border-t border-slate-200">
        🎉 No uncollected receivables found for {hubName} ({hubCode}) in this period!
      </div>
    );
  }

  const totalOutstanding = receivables.reduce((sum, r) => sum + r.freightAmountPaise, 0);

  return (
    <div className="p-4 bg-slate-50/80 border-t border-slate-200 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            Uncollected Receivables Breakdown — {hubName} ({hubCode})
          </h5>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">{receivables.length} Consignments:</span>
          <strong className="text-amber-800 font-bold">{paiseToCurrency(totalOutstanding)}</strong>
        </div>
      </div>

      <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/70 text-[11px]">
              <TableHead className="w-[140px]">LR Number</TableHead>
              <TableHead>Consignee (Receiver)</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Booking Date</TableHead>
              <TableHead className="text-right">Freight Amount</TableHead>
              <TableHead className="text-center">Mode</TableHead>
              <TableHead className="text-right">Aging / Days</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables.map((lr) => (
              <TableRow key={lr.id} className="text-xs hover:bg-slate-50/60">
                <TableCell className="font-semibold text-slate-900 font-mono">
                  {lr.lrNumber}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">{lr.consigneeName}</span>
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {formatPhoneDisplay(lr.consigneePhone)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                    To: {lr.toHubCode}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600">
                  {lr.bookingDate}
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {paiseToCurrency(lr.freightAmountPaise)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${
                      lr.paymentMode === 'TO_PAY'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                    }`}
                  >
                    {lr.paymentMode}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {lr.agingBucket === '0-7' && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold">
                      <Clock className="h-3 w-3 mr-1" />
                      {lr.daysOutstanding}d (0-7d)
                    </Badge>
                  )}
                  {lr.agingBucket === '7-30' && (
                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 font-semibold">
                      <Clock className="h-3 w-3 mr-1" />
                      {lr.daysOutstanding}d (7-30d)
                    </Badge>
                  )}
                  {lr.agingBucket === '30+' && (
                    <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-800 border-rose-300 font-semibold">
                      <Clock className="h-3 w-3 mr-1" />
                      {lr.daysOutstanding}d (30+d)
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
