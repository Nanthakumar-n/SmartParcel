'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  PackageCheck,
  User,
  Navigation,
  MapPin,
  XCircle,
  Plus,
  Minus,
  Archive,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  dispatchTripAction,
  markTripArrivedAction,
  cancelTripAction,
  assignLRToTripAction,
  removeLRFromTripAction,
  getAvailableLRsAction,
} from '../actions';
import type { TripWithRelations } from '@/lib/db/trips';
import { formatINRFromPaise } from '@/lib/utils/format-currency';

interface AvailableLR {
  id: string;
  lr_number: string | null;
  consignor_name: string;
  consignee_name: string;
  freight_amount: number;
}

interface ManifestPanelProps {
  trip: TripWithRelations | null;
  open: boolean;
  userRole?: string;
  onOpenChange: (open: boolean) => void;
}

export function ManifestPanel({ trip, open, userRole, onOpenChange }: ManifestPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [isDispatching, setIsDispatching] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionLrId, setActionLrId] = useState<string | null>(null);
  const [poolLRs, setPoolLRs] = useState<AvailableLR[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  const isFleetOwner = userRole === 'fleet_owner';

  // Load pool LRs when a SCHEDULED trip's manifest opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!trip || !open || trip.status !== 'SCHEDULED') {
      setPoolLRs([]);
      return;
    }
    setIsLoadingPool(true);
    getAvailableLRsAction(trip.id)
      .then((res) => {
        if (res.success) setPoolLRs(res.data);
      })
      .catch(() => {
        // silent — pool is a nice-to-have
      })
      .finally(() => setIsLoadingPool(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id, open, trip?.lorry_receipts.length]);

  if (!trip) return null;

  const lrs = trip.lorry_receipts || [];
  const bookedLRs = lrs.filter((lr) => lr.status === 'BOOKED');
  const inTransitLRs = lrs.filter((lr) => lr.status === 'IN_TRANSIT');
  const totalFreight = lrs.reduce((acc, curr) => acc + Number(curr.freight_amount), 0);

  // Dispatch requirements: SCHEDULED + vehicle assigned + at least 1 BOOKED LR
  const hasVehicle = !!trip.vehicle_id;
  const canDispatch = trip.status === 'SCHEDULED' && hasVehicle && bookedLRs.length > 0;
  const canMarkArrived = trip.status === 'IN_TRANSIT';
  const canCancel = (trip.status === 'SCHEDULED') || (trip.status === 'IN_TRANSIT' && isFleetOwner);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDispatch = async () => {
    setIsDispatching(true);
    startTransition(async () => {
      try {
        const res = await dispatchTripAction(trip.id);
        if (res.success) {
          toast.success('Trip dispatched! All LRs are now IN_TRANSIT.');
          onOpenChange(false);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to dispatch trip.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setIsDispatching(false);
      }
    });
  };

  const handleMarkArrived = async () => {
    setIsArriving(true);
    startTransition(async () => {
      try {
        const res = await markTripArrivedAction(trip.id);
        if (res.success) {
          toast.success('Trip marked as ARRIVED. All LRs updated. Vehicle is now AVAILABLE.');
          onOpenChange(false);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to mark trip as arrived.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setIsArriving(false);
      }
    });
  };

  const handleCancelTrip = async () => {
    setIsCancelling(true);
    startTransition(async () => {
      try {
        const res = await cancelTripAction(trip.id);
        if (res.success) {
          const msg = trip.status === 'SCHEDULED'
            ? 'Trip cancelled. All assigned LRs released back to the booking pool.'
            : 'Trip cancelled. LRs reverted to BOOKED. Vehicle is now AVAILABLE.';
          toast.success(msg);
          setCancelDialogOpen(false);
          onOpenChange(false);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to cancel trip.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setIsCancelling(false);
      }
    });
  };

  const handleAssignLR = async (lrId: string) => {
    setActionLrId(lrId);
    startTransition(async () => {
      try {
        const res = await assignLRToTripAction(lrId, trip.id);
        if (res.success) {
          toast.success('LR added to this trip manifest.');
          setPoolLRs((prev) => prev.filter((l) => l.id !== lrId));
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to add LR.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setActionLrId(null);
      }
    });
  };

  const handleRemoveLR = async (lrId: string) => {
    setActionLrId(lrId);
    startTransition(async () => {
      try {
        const res = await removeLRFromTripAction(lrId, trip.id);
        if (res.success) {
          toast.success('LR removed from this manifest and returned to pool.');
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to remove LR.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setActionLrId(null);
      }
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[560px] flex flex-col h-full bg-white border-l border-slate-200 p-0">
          <div className="p-6 overflow-y-auto flex-1 space-y-5">
            <SheetHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <FileSpreadsheet className="h-5 w-5" />
                <SheetTitle className="text-slate-900 font-bold text-lg">Trip Manifest</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-slate-500">
                {trip.status === 'SCHEDULED'
                  ? 'Manage cargo manifest and dispatch the run.'
                  : trip.status === 'IN_TRANSIT'
                  ? 'Trip is in transit. Mark it arrived when the truck reaches the destination.'
                  : `Trip is ${trip.status.toLowerCase()}.`}
              </SheetDescription>
            </SheetHeader>

            {/* Route & Status */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
                <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[10px]">Route</span>
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="font-mono text-blue-600">[{trip.from_hub.hub_code}]</span>
                  <span>{trip.from_hub.city}</span>
                  <span className="text-slate-400">→</span>
                  <span className="font-mono text-emerald-600">[{trip.to_hub.hub_code}]</span>
                  <span>{trip.to_hub.city}</span>
                </div>
              </div>
              <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
                <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[10px]">Status</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold ${
                    trip.status === 'SCHEDULED'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : trip.status === 'IN_TRANSIT'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : trip.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {trip.status}
                </Badge>
              </div>
            </div>

            {/* Fleet Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">Vehicle:</span>
                </div>
                {trip.vehicle ? (
                  <span className="font-mono font-bold text-slate-900">
                    {trip.vehicle.registration_number} ({trip.vehicle.vehicle_type})
                  </span>
                ) : (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Not Assigned
                  </span>
                )}
              </div>
              <Separator className="bg-slate-200" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-slate-500" />
                  <span className="font-semibold text-slate-700">Driver:</span>
                </div>
                <span className="font-bold text-slate-900">
                  {trip.driver ? `${trip.driver.full_name} (${trip.driver.phone})` : (
                    <span className="text-slate-400 font-normal">Not assigned (optional)</span>
                  )}
                </span>
              </div>
              <Separator className="bg-slate-200" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-700">Total Run Value:</span>
                <span className="font-bold text-blue-600 font-mono">{formatINRFromPaise(totalFreight)}</span>
              </div>
            </div>

            {/* Assigned LRs */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-blue-600" />
                  <span>Assigned Manifest ({lrs.length})</span>
                </h3>
              </div>

              {lrs.length === 0 ? (
                <div className="p-6 border border-dashed rounded-lg text-center bg-slate-50 space-y-1.5 text-xs">
                  <Archive className="h-5 w-5 text-slate-400 mx-auto" />
                  <div className="font-semibold text-slate-600">No LRs Assigned</div>
                  <p className="text-slate-400">Add LRs from the pool below, or they will auto-assign when created for this route.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {lrs.map((lr) => (
                    <div
                      key={lr.id}
                      className="p-3 border rounded-lg bg-white flex items-center justify-between gap-3 text-xs shadow-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900">{lr.lr_number}</span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-bold shrink-0 ${
                              lr.status === 'BOOKED'
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : lr.status === 'IN_TRANSIT'
                                ? 'bg-amber-50 text-amber-600 border-amber-200'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}
                          >
                            {lr.status}
                          </Badge>
                        </div>
                        <p className="text-slate-500 truncate">
                          {lr.consignor_name} → {lr.consignee_name}
                        </p>
                      </div>

                      {/* Remove button — only for BOOKED LRs on SCHEDULED trips */}
                      {trip.status === 'SCHEDULED' && lr.status === 'BOOKED' && (
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => handleRemoveLR(lr.id)}
                          disabled={isPending || actionLrId === lr.id}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                          title="Remove from manifest"
                        >
                          {actionLrId === lr.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Minus className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}

                      {/* Loaded indicator for IN_TRANSIT */}
                      {lr.status === 'IN_TRANSIT' && (
                        <div className="flex items-center gap-1 text-amber-600 font-semibold text-[11px] shrink-0">
                          <Navigation className="h-3.5 w-3.5" />
                          <span>In Transit</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pool LRs (unassigned, same route) — shown only for SCHEDULED trips */}
            {trip.status === 'SCHEDULED' && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-slate-500" />
                  <span>Available in Pool</span>
                  {isLoadingPool && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </h3>

                {!isLoadingPool && poolLRs.length === 0 && (
                  <p className="text-xs text-slate-400 px-1">
                    No unassigned BOOKED LRs for this route. Create an LR on route{' '}
                    <span className="font-mono text-blue-600">[{trip.from_hub.hub_code}]→[{trip.to_hub.hub_code}]</span> to add it here.
                  </p>
                )}

                {poolLRs.length > 0 && (
                  <div className="space-y-2">
                    {poolLRs.map((lr) => (
                      <div
                        key={lr.id}
                        className="p-3 border border-dashed rounded-lg bg-slate-50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-bold text-slate-700">{lr.lr_number}</span>
                          <p className="text-slate-400 truncate">
                            {lr.consignor_name} → {lr.consignee_name}
                          </p>
                        </div>
                        <Button
                          size="xs"
                          onClick={() => handleAssignLR(lr.id)}
                          disabled={isPending || actionLrId === lr.id}
                          className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                        >
                          {actionLrId === lr.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Panel */}
          <div className="p-4 border-t bg-slate-50 space-y-3">

            {/* Dispatch (SCHEDULED → IN_TRANSIT) */}
            {trip.status === 'SCHEDULED' && (
              <>
                {!canDispatch && (
                  <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Before you can dispatch:</span>
                      <ul className="list-disc list-inside mt-0.5 text-amber-800 space-y-0.5">
                        {!hasVehicle && <li>Assign a vehicle to this trip.</li>}
                        {bookedLRs.length === 0 && <li>Add at least one LR to the manifest.</li>}
                      </ul>
                    </div>
                  </div>
                )}
                <Button
                  disabled={!canDispatch || isPending || isDispatching}
                  onClick={handleDispatch}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold h-11 shadow-xs"
                >
                  {isDispatching ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Navigation className="h-4 w-4" />
                      Dispatch Run ({bookedLRs.length} LR{bookedLRs.length !== 1 ? 's' : ''})
                    </>
                  )}
                </Button>
              </>
            )}

            {/* Mark Arrived (IN_TRANSIT → COMPLETED) */}
            {canMarkArrived && (
              <Button
                disabled={isPending || isArriving}
                onClick={handleMarkArrived}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold h-11 shadow-xs"
              >
                {isArriving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Marking Arrived...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" />
                    Mark Trip Arrived ({inTransitLRs.length} LR{inTransitLRs.length !== 1 ? 's' : ''} → ARRIVED)
                  </>
                )}
              </Button>
            )}

            {/* Cancel Trip */}
            {canCancel && (
              <Button
                variant="outline"
                disabled={isPending || isCancelling}
                onClick={() => setCancelDialogOpen(true)}
                className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 h-9"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Cancel Trip
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Trip Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cancel this trip?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {trip.status === 'SCHEDULED'
                ? `This will cancel the trip and release all ${lrs.length} assigned LR(s) back to the booking pool. They can be assigned to a new trip.`
                : `This will cancel the in-transit trip. All ${inTransitLRs.length} IN_TRANSIT LR(s) will revert to BOOKED status. The vehicle will be released back to AVAILABLE.`}
            </DialogDescription>
          </DialogHeader>
          {trip.status === 'IN_TRANSIT' && (
            <div className="flex items-start gap-2 p-2.5 rounded-md bg-red-50 border border-red-200 text-[11px] text-red-900">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>The truck is currently on the road. Coordinate with the driver before cancelling.</span>
            </div>
          )}
          <DialogFooter className="pt-2 flex justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
              className="text-xs"
            >
              Go Back
            </Button>
            <Button
              type="button"
              onClick={handleCancelTrip}
              disabled={isCancelling}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Cancelling...
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
