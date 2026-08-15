import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { LRStatus, PaymentMode } from '@/lib/types/lr';
import {
  Clock,
  CheckCircle2,
  PackageCheck,
  Truck,
  MapPin,
  Send,
  CheckCheck,
  XCircle,
} from 'lucide-react';

interface LRStatusBadgeProps {
  status: LRStatus | string;
  className?: string;
}

export function LRStatusBadge({ status, className }: LRStatusBadgeProps) {
  switch (status) {
    case 'BOOKING_PENDING':
      return (
        <Badge
          variant="outline"
          className={`bg-amber-50 text-amber-700 border-amber-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <Clock className="h-3 w-3 text-amber-600" />
          <span>Pending Acceptance</span>
        </Badge>
      );
    case 'BOOKED':
      return (
        <Badge
          variant="outline"
          className={`bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <PackageCheck className="h-3 w-3 text-blue-600" />
          <span>Booked (Ready)</span>
        </Badge>
      );
    case 'PICKED_UP':
      return (
        <Badge
          variant="outline"
          className={`bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <CheckCircle2 className="h-3 w-3 text-indigo-600" />
          <span>Loaded on Truck</span>
        </Badge>
      );
    case 'IN_TRANSIT':
      return (
        <Badge
          variant="outline"
          className={`bg-sky-50 text-sky-700 border-sky-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <Truck className="h-3 w-3 text-sky-600" />
          <span>In Transit</span>
        </Badge>
      );
    case 'ARRIVED':
      return (
        <Badge
          variant="outline"
          className={`bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <MapPin className="h-3 w-3 text-purple-600" />
          <span>Arrived at Dest Hub</span>
        </Badge>
      );
    case 'OUT_FOR_DELIVERY':
      return (
        <Badge
          variant="outline"
          className={`bg-orange-50 text-orange-700 border-orange-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <Send className="h-3 w-3 text-orange-600" />
          <span>Out for Delivery</span>
        </Badge>
      );
    case 'DELIVERED':
      return (
        <Badge
          variant="outline"
          className={`bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <CheckCheck className="h-3 w-3 text-emerald-600" />
          <span>Delivered</span>
        </Badge>
      );
    case 'CANCELLED':
      return (
        <Badge
          variant="outline"
          className={`bg-rose-50 text-rose-700 border-rose-200 font-semibold text-xs flex items-center gap-1 w-fit ${className}`}
        >
          <XCircle className="h-3 w-3 text-rose-600" />
          <span>Cancelled</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`text-slate-600 text-xs ${className}`}>
          {status}
        </Badge>
      );
  }
}

export function PaymentModeBadge({ mode }: { mode: PaymentMode | string }) {
  switch (mode) {
    case 'PAID':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px] px-1.5 py-0"
        >
          PAID
        </Badge>
      );
    case 'TO_PAY':
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-[11px] px-1.5 py-0"
        >
          TO-PAY
        </Badge>
      );
    case 'TBB':
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px] px-1.5 py-0"
        >
          TO BE BILLED
        </Badge>
      );
    default:
      return <Badge variant="secondary">{mode}</Badge>;
  }
}
