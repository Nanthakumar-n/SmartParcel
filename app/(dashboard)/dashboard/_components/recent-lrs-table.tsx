'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  ArrowRight,
  PlusCircle,
  Calendar,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LRStatusBadge, PaymentModeBadge } from '@/app/(dashboard)/lorry-receipts/_components/lr-status-badge';
import { LRThermalDialog } from '@/app/(dashboard)/lorry-receipts/_components/lr-thermal-dialog';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import type { LRDetailed } from '@/lib/db/lorry-receipts';

interface RecentLRsTableProps {
  recentLrs: LRDetailed[];
  tenantName?: string;
}

export function RecentLRsTable({ recentLrs, tenantName }: RecentLRsTableProps) {
  return (
    <Card className="border-slate-200 shadow-xs bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
        <div>
          <CardTitle className="text-base font-bold text-slate-900">
            Recent Lorry Receipts
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Latest consignments booked across your hub network
          </CardDescription>
        </div>
        <Link href="/lorry-receipts">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-blue-600 font-semibold hover:text-blue-700 hover:bg-blue-50"
          >
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {recentLrs && recentLrs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentLrs.map((lr) => (
              <div
                key={lr.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
              >
                {/* Left: LR Number, Corridor, Sender/Receiver */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-blue-900">
                      {lr.lr_number}
                    </span>

                    {/* Corridor Badges */}
                    {lr.from_hub && lr.to_hub && (
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {lr.from_hub.hub_code}
                        </Badge>
                        <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {lr.to_hub.hub_code}
                        </Badge>
                      </div>
                    )}

                    {/* Status Badge */}
                    <LRStatusBadge status={lr.status} className="text-[11px] py-0 px-2" />
                  </div>

                  {/* Consignor -> Consignee & Details */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                    <span className="font-medium text-slate-800">
                      {lr.consignor_name}
                      <span className="text-slate-400 font-normal ml-1">
                        ({formatPhoneDisplay(lr.consignor_phone)})
                      </span>
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="font-medium text-slate-800">
                      {lr.consignee_name}
                      <span className="text-slate-400 font-normal ml-1">
                        ({formatPhoneDisplay(lr.consignee_phone)})
                      </span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3 text-slate-400" />
                      {lr.goods_description} ({lr.num_packages} pkgs{lr.weight_kg ? ` • ${lr.weight_kg} kg` : ''})
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {lr.booking_date}
                    </span>
                  </div>
                </div>

                {/* Right: Freight Amount & Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="font-bold text-sm text-slate-900 block">
                      {formatINRFromPaise(Number(lr.freight_amount))}
                    </span>
                    <div className="mt-0.5">
                      <PaymentModeBadge mode={lr.payment_mode} />
                    </div>
                  </div>

                  <LRThermalDialog lr={lr} tenantName={tenantName} />
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
                Start issuing digital Lorry Receipts with auto-generated numbering, route corridors, and thermal billing.
              </p>
            </div>
            <Link href="/lorry-receipts/new">
              <Button size="sm" className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs">
                <PlusCircle className="h-4 w-4" />
                <span>Issue First LR (F2)</span>
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
