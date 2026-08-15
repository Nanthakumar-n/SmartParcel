'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowRight,
  PlusCircle,
  FileText,
  Package,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LRStatusBadge, PaymentModeBadge } from './lr-status-badge';
import { LRThermalDialog } from './lr-thermal-dialog';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import type { LRDetailed } from '@/lib/db/lorry-receipts';
import type { HubRow } from '@/lib/db/hubs';

interface LRTableProps {
  initialLRs: LRDetailed[];
  hubs: HubRow[];
}

export function LRTable({ initialLRs, hubs }: LRTableProps) {
  const [lrs, setLRs] = useState(initialLRs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [originFilter, setOriginFilter] = useState<string>('ALL');
  const [destFilter, setDestFilter] = useState<string>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<string>('ALL');

  React.useEffect(() => {
    setLRs(initialLRs);
  }, [initialLRs]);

  const filteredLRs = useMemo(() => {
    return lrs.filter((lr) => {
      // Status filter
      if (statusFilter !== 'ALL' && lr.status !== statusFilter) {
        return false;
      }
      // Origin filter
      if (originFilter !== 'ALL' && lr.from_hub_id !== originFilter) {
        return false;
      }
      // Destination filter
      if (destFilter !== 'ALL' && lr.to_hub_id !== destFilter) {
        return false;
      }
      // Payment filter
      if (paymentFilter !== 'ALL' && lr.payment_mode !== paymentFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase().trim();
        const lrNo = lr.lr_number?.toLowerCase() ?? '';
        const consignor = lr.consignor_name?.toLowerCase() ?? '';
        const consignorPhone = lr.consignor_phone?.toLowerCase() ?? '';
        const consignee = lr.consignee_name?.toLowerCase() ?? '';
        const consigneePhone = lr.consignee_phone?.toLowerCase() ?? '';
        const goods = lr.goods_description?.toLowerCase() ?? '';

        return (
          lrNo.includes(query) ||
          consignor.includes(query) ||
          consignorPhone.includes(query) ||
          consignee.includes(query) ||
          consigneePhone.includes(query) ||
          goods.includes(query)
        );
      }

      return true;
    });
  }, [lrs, statusFilter, originFilter, destFilter, paymentFilter, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <Card className="border-slate-200 bg-white shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search LR #, consignor, phone, cargo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Filter className="h-3.5 w-3.5" />
                <span>Filters:</span>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="LR Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Statuses
                  </SelectItem>
                  <SelectItem value="BOOKED" className="text-xs text-blue-600 font-medium">
                    Booked (Ready)
                  </SelectItem>
                  <SelectItem value="PICKED_UP" className="text-xs text-indigo-600 font-medium">
                    Loaded on Truck
                  </SelectItem>
                  <SelectItem value="IN_TRANSIT" className="text-xs text-sky-600 font-medium">
                    In Transit
                  </SelectItem>
                  <SelectItem value="ARRIVED" className="text-xs text-purple-600 font-medium">
                    Arrived at Dest
                  </SelectItem>
                  <SelectItem value="OUT_FOR_DELIVERY" className="text-xs text-orange-600 font-medium">
                    Out for Delivery
                  </SelectItem>
                  <SelectItem value="DELIVERED" className="text-xs text-emerald-600 font-medium">
                    Delivered
                  </SelectItem>
                  <SelectItem value="CANCELLED" className="text-xs text-rose-600 font-medium">
                    Cancelled
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Origin Hub */}
              <Select value={originFilter} onValueChange={(val) => setOriginFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="Origin Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Origins
                  </SelectItem>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id} className="text-xs">
                      {hub.hub_code} ({hub.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Destination Hub */}
              <Select value={destFilter} onValueChange={(val) => setDestFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[130px]">
                  <SelectValue placeholder="Destination Hub" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Destinations
                  </SelectItem>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id} className="text-xs">
                      {hub.hub_code} ({hub.city})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Payment Mode */}
              <Select value={paymentFilter} onValueChange={(val) => setPaymentFilter(val ?? 'ALL')}>
                <SelectTrigger className="text-xs h-9 min-w-[110px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs font-medium">
                    All Payments
                  </SelectItem>
                  <SelectItem value="PAID" className="text-xs text-emerald-600 font-medium">
                    PAID
                  </SelectItem>
                  <SelectItem value="TO_PAY" className="text-xs text-amber-600 font-medium">
                    TO-PAY
                  </SelectItem>
                  <SelectItem value="TBB" className="text-xs text-blue-600 font-medium">
                    TBB (Billed)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  LR Number & Date
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Route Corridor
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Consignor (Sender)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Consignee (Receiver)
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Cargo Details
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Freight & Mode
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3">
                  Status
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-600 py-3 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLRs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="p-3 bg-slate-100 rounded-full text-slate-400 mb-2">
                        <FileText className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-semibold text-slate-700">No Lorry Receipts found</p>
                      <p className="text-xs text-slate-400 mt-0.5 max-w-sm">
                        {searchQuery || statusFilter !== 'ALL' || originFilter !== 'ALL' || destFilter !== 'ALL'
                          ? 'No receipts match your search criteria. Try adjusting the filters.'
                          : 'Issue your first digital Lorry Receipt to begin parcel booking operations.'}
                      </p>
                      {lrs.length === 0 && (
                        <div className="mt-4">
                          <Link href="/lorry-receipts/new">
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                              <PlusCircle className="h-4 w-4 mr-1.5" />
                              <span>Create New LR (F2)</span>
                            </Button>
                          </Link>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLRs.map((lr) => (
                  <TableRow
                    key={lr.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* LR Number & Date */}
                    <TableCell className="py-3.5">
                      <div>
                        <span className="font-mono font-bold text-sm text-blue-900 block">
                          {lr.lr_number}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{lr.booking_date}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Route Corridor */}
                    <TableCell className="py-3.5">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {lr.from_hub?.hub_code}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-[10px] px-1.5 py-0"
                        >
                          {lr.to_hub?.hub_code}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                        {lr.from_hub?.city} → {lr.to_hub?.city}
                      </span>
                    </TableCell>

                    {/* Consignor */}
                    <TableCell className="py-3.5 max-w-[160px]">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-900 block truncate">
                          {lr.consignor_name}
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono block truncate">
                          {formatPhoneDisplay(lr.consignor_phone)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Consignee */}
                    <TableCell className="py-3.5 max-w-[160px]">
                      <div className="text-xs">
                        <span className="font-semibold text-slate-900 block truncate">
                          {lr.consignee_name}
                        </span>
                        <span className="text-slate-500 text-[11px] font-mono block truncate">
                          {formatPhoneDisplay(lr.consignee_phone)}
                        </span>
                      </div>
                    </TableCell>

                    {/* Cargo */}
                    <TableCell className="py-3.5 max-w-[160px]">
                      <div className="text-xs">
                        <span className="font-medium text-slate-800 block truncate">
                          {lr.goods_description}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <Package className="h-3 w-3 text-slate-400" />
                          <span>{lr.num_packages} pkgs</span>
                          {lr.weight_kg && <span>• {lr.weight_kg} kg</span>}
                        </div>
                      </div>
                    </TableCell>

                    {/* Freight & Payment Mode */}
                    <TableCell className="py-3.5">
                      <div className="text-xs">
                        <span className="font-bold text-slate-900 block">
                          {formatINRFromPaise(Number(lr.freight_amount))}
                        </span>
                        <div className="mt-0.5">
                          <PaymentModeBadge mode={lr.payment_mode} />
                        </div>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-3.5">
                      <LRStatusBadge status={lr.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-3.5 text-right">
                      <LRThermalDialog lr={lr} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
