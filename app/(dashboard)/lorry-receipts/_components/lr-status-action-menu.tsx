'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  MoreHorizontal,
  CheckCheck,
  MapPin,
  Printer,
  XCircle,
  FileCheck,
  Loader2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { transitionLRStatusAction } from '../actions';
import { DeliveryDialog } from './delivery-dialog';
import { PODDetailsDialog } from './pod-details-dialog';
import { LRThermalDialog } from './lr-thermal-dialog';
import type { LRDetailed } from '@/lib/db/lorry-receipts';
import type { LRStatus } from '@/lib/types/lr';

interface LRStatusActionMenuProps {
  lr: LRDetailed;
  userRole?: string;
  tenantName?: string;
}

export function LRStatusActionMenu({ lr, userRole, tenantName }: LRStatusActionMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [podDetailsOpen, setPodDetailsOpen] = useState(false);
  const [thermalDialogOpen, setThermalDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const status = lr.status as LRStatus;
  const isFleetOwner = userRole === 'fleet_owner';

  const handleStatusTransition = (nextStatus: LRStatus, notes?: string) => {
    startTransition(async () => {
      const res = await transitionLRStatusAction({
        lr_id: lr.id,
        next_status: nextStatus,
        notes,
      });

      if (!res.success) {
        toast.error(res.error._form ? res.error._form[0] : 'Failed to update status');
        return;
      }

      toast.success(`LR ${lr.lr_number} updated to ${nextStatus.replace(/_/g, ' ')}`);
      setCancelDialogOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <DropdownMenu>
        {/* Bug 1 fix: correct @base-ui-react render prop pattern — Button is wired via render={<element>} */}
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
              <span className="sr-only">Open LR menu</span>
            </Button>
          }
        />

        <DropdownMenuContent align="end" className="w-56 text-xs">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
              Consignment Actions
            </DropdownMenuLabel>

            {/* BOOKED: awaiting trip dispatch — show disabled info state */}
            {status === 'BOOKED' && (
              <DropdownMenuItem
                disabled
                className="text-xs text-slate-400 gap-2 cursor-default"
              >
                <Clock className="h-3.5 w-3.5 text-slate-300" />
                <span>Awaiting Trip Dispatch</span>
              </DropdownMenuItem>
            )}

            {/* IN_TRANSIT: Fleet Owner can override a single LR to ARRIVED (per-LR override) */}
            {status === 'IN_TRANSIT' && isFleetOwner && (
              <DropdownMenuItem
                onClick={() => handleStatusTransition('ARRIVED', 'Manual override — marked arrived by Fleet Owner')}
                className="text-xs text-purple-700 font-medium focus:text-purple-800 focus:bg-purple-50 gap-2 cursor-pointer"
              >
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                <span>Override: Mark Arrived</span>
              </DropdownMenuItem>
            )}

            {/* IN_TRANSIT: Hub Manager sees read-only state — arrival is trip-driven */}
            {status === 'IN_TRANSIT' && !isFleetOwner && (
              <DropdownMenuItem
                disabled
                className="text-xs text-slate-400 gap-2 cursor-default"
              >
                <Clock className="h-3.5 w-3.5 text-slate-300" />
                <span>In Transit — Awaiting Arrival</span>
              </DropdownMenuItem>
            )}

            {/* ARRIVED → Confirm Delivery (POD) */}
            {status === 'ARRIVED' && (
              <DropdownMenuItem
                onClick={() => setDeliveryDialogOpen(true)}
                className="text-xs text-emerald-700 font-semibold focus:text-emerald-800 focus:bg-emerald-50 gap-2 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Confirm Delivery (POD)</span>
              </DropdownMenuItem>
            )}

            {/* DELIVERED → View POD & Receipt */}
            {status === 'DELIVERED' && (
              <DropdownMenuItem
                onClick={() => setPodDetailsOpen(true)}
                className="text-xs text-emerald-700 font-medium focus:text-emerald-800 focus:bg-emerald-50 gap-2 cursor-pointer"
              >
                <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>View POD & Receipt</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {/* Print 3" Thermal Bill — always available */}
            <DropdownMenuItem
              onClick={() => setThermalDialogOpen(true)}
              className="text-xs gap-2 cursor-pointer text-slate-700 font-medium"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Thermal Bill (3&quot;)</span>
            </DropdownMenuItem>

            {/* Cancel Consignment — BOOKING_PENDING or BOOKED only (per RBAC, Hub Manager restricted server-side) */}
            {(status === 'BOOKING_PENDING' || status === 'BOOKED') && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-xs text-rose-600 focus:text-rose-700 focus:bg-rose-50 gap-2 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cancel Consignment</span>
                </DropdownMenuItem>
              </>
            )}

            {/* Fleet Owner can also cancel IN_TRANSIT LRs */}
            {status === 'IN_TRANSIT' && isFleetOwner && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setCancelDialogOpen(true)}
                  className="text-xs text-rose-600 focus:text-rose-700 focus:bg-rose-50 gap-2 cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5 text-rose-600" />
                  <span>Cancel Consignment</span>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delivery Confirmation Dialog */}
      <DeliveryDialog
        lr={lr}
        open={deliveryDialogOpen}
        onOpenChange={setDeliveryDialogOpen}
      />

      {/* POD Details Dialog */}
      <PODDetailsDialog
        lr={lr}
        open={podDetailsOpen}
        onOpenChange={setPodDetailsOpen}
      />

      {/* Thermal Print Receipt Dialog */}
      <LRThermalDialog
        lr={lr}
        tenantName={tenantName}
        defaultOpen={thermalDialogOpen}
      />

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cancel Lorry Receipt {lr.lr_number}?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This action will mark the consignment as CANCELLED and record an audit log entry. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {status === 'IN_TRANSIT' && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>This LR is currently in transit. Cancelling it will remove it from the active trip. The physical goods must be handled manually.</span>
            </div>
          )}
          <DialogFooter className="pt-2 flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Go Back
            </Button>
            <Button
              type="button"
              onClick={() => handleStatusTransition('CANCELLED', 'Cancelled by user')}
              disabled={isPending}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
