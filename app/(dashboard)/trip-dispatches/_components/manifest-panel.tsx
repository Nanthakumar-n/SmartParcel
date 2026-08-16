'use client';

import React, { useState, useTransition } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  FileSpreadsheet,
  PackageCheck,
  User,
  Navigation,
} from 'lucide-react';
import { toast } from 'sonner';
import { loadLRAction, loadAllLRsAction, dispatchTripAction } from '../actions';
import type { TripWithRelations } from '@/lib/db/trips';
import { formatINRFromPaise } from '@/lib/utils/format-currency';

interface ManifestPanelProps {
  trip: TripWithRelations | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManifestPanel({ trip, open, onOpenChange }: ManifestPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [loadingLrId, setLoadingLrId] = useState<string | null>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  if (!trip) return null;

  const lrs = trip.lorry_receipts || [];
  const bookedLRs = lrs.filter((lr) => lr.status === 'BOOKED');
  const pickedUpLRs = lrs.filter((lr) => lr.status === 'PICKED_UP');

  const totalLRs = lrs.length;
  const loadedCount = pickedUpLRs.length;
  const bookedCount = bookedLRs.length;

  const totalFreight = lrs.reduce((acc, curr) => acc + Number(curr.freight_amount), 0);

  const canDispatch = trip.status === 'SCHEDULED' && loadedCount > 0 && bookedCount === 0;

  const handleLoadLR = async (lrId: string) => {
    setLoadingLrId(lrId);
    startTransition(async () => {
      try {
        const res = await loadLRAction(lrId, trip.id);
        if (res.success) {
          toast.success('LR loaded onto vehicle!');
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to load LR.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setLoadingLrId(null);
      }
    });
  };

  const handleLoadAll = async () => {
    setIsBulkLoading(true);
    startTransition(async () => {
      try {
        const res = await loadAllLRsAction(trip.id);
        if (res.success) {
          toast.success('All pending LRs loaded onto vehicle!');
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to bulk load LRs.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      } finally {
        setIsBulkLoading(false);
      }
    });
  };

  const handleDispatch = async () => {
    setIsDispatching(true);
    startTransition(async () => {
      try {
        const res = await dispatchTripAction(trip.id);
        if (res.success) {
          toast.success('Trip dispatched successfully! Vehicle is now IN_TRANSIT.');
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] flex flex-col h-full bg-white border-l border-slate-200 p-0">
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <SheetHeader>
            <div className="flex items-center gap-2 text-blue-600">
              <FileSpreadsheet className="h-5 w-5" />
              <SheetTitle className="text-slate-900 font-bold text-lg">Trip Manifest & Dispatch</SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-500">
              Manage loading sheet and trigger transit dispatch for vehicle registration{' '}
              <span className="font-bold text-slate-900">
                {trip.vehicle?.registration_number || 'Unassigned'}
              </span>.
            </SheetDescription>
          </SheetHeader>

          {/* Trip Header Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
              <span className="text-slate-500 block uppercase tracking-wider font-semibold">Route & Corridor</span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <span className="font-mono text-blue-600">[{trip.from_hub.hub_code}]</span>
                <span>{trip.from_hub.city}</span>
                <span className="text-slate-400">→</span>
                <span className="font-mono text-emerald-600">[{trip.to_hub.hub_code}]</span>
                <span>{trip.to_hub.city}</span>
              </div>
            </div>

            <div className="bg-slate-50 border rounded-lg p-3 text-xs space-y-1">
              <span className="text-slate-500 block uppercase tracking-wider font-semibold">Trip Status</span>
              <div>
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
          </div>

          {/* Fleet Details */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Vehicle:</span>
              </div>
              <span className="font-mono font-bold text-slate-900">
                {trip.vehicle ? `${trip.vehicle.registration_number} (${trip.vehicle.vehicle_type})` : 'Unassigned'}
              </span>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-slate-700">Driver:</span>
              </div>
              <span className="font-bold text-slate-900">
                {trip.driver ? `${trip.driver.full_name} (${trip.driver.phone})` : 'Unassigned'}
              </span>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Total Manifest Weight:</span>
              <span className="font-bold text-slate-900">
                {totalLRs > 0 ? `${lrs.length} items` : '0 items'}
              </span>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Total Run Value:</span>
              <span className="font-bold text-blue-600 font-mono">
                {formatINRFromPaise(totalFreight)}
              </span>
            </div>
          </div>

          {/* Manifest LRs Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <span>Cargo Loading Manifest ({totalLRs})</span>
              </h3>
              {trip.status === 'SCHEDULED' && bookedCount > 0 && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleLoadAll}
                  disabled={isPending || isBulkLoading}
                  className="text-[10px] h-7 bg-white text-slate-700 hover:text-slate-900"
                >
                  {isBulkLoading && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                  Load All
                </Button>
              )}
            </div>

            {totalLRs === 0 ? (
              <div className="p-8 border border-dashed rounded-lg text-center bg-slate-50 space-y-2 text-xs">
                <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto" />
                <div className="font-semibold text-slate-700">Empty Manifest</div>
                <p className="text-slate-500">
                  No Lorry Receipts are slotted to this run. LRs automatically slot here if they match the route corridor.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lrs.map((lr) => (
                  <div
                    key={lr.id}
                    className="p-3 border rounded-lg bg-white flex items-center justify-between gap-4 text-xs shadow-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{lr.lr_number}</span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            lr.status === 'BOOKED'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : lr.status === 'PICKED_UP'
                              ? 'bg-purple-50 text-purple-600 border-purple-200'
                              : 'bg-amber-50 text-amber-600 border-amber-200'
                          }`}
                        >
                          {lr.status}
                        </Badge>
                      </div>
                      <p className="text-slate-500">
                        Sender: {lr.consignor_name} | Receiver: {lr.consignee_name}
                      </p>
                    </div>

                    <div>
                      {trip.status === 'SCHEDULED' && lr.status === 'BOOKED' ? (
                        <Button
                          size="xs"
                          onClick={() => handleLoadLR(lr.id)}
                          disabled={isPending || loadingLrId === lr.id}
                          className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loadingLrId === lr.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            'Load'
                          )}
                        </Button>
                      ) : lr.status === 'PICKED_UP' || lr.status === 'IN_TRANSIT' ? (
                        <div className="flex items-center gap-1 text-green-600 font-semibold text-[11px]">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Loaded</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Action Panel */}
        {trip.status === 'SCHEDULED' && (
          <div className="p-4 border-t bg-slate-50 space-y-3">
            {!canDispatch && (
              <div className="flex items-start gap-2 p-2.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Dispatch Requirements:</span>
                  <ul className="list-disc list-inside mt-0.5 text-amber-800 space-y-0.5">
                    <li>At least 1 cargo item must be loaded onto the vehicle.</li>
                    <li>All assigned items must be in <strong>Loaded</strong> (PICKED_UP) status.</li>
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
                  Dispatching Run...
                </>
              ) : (
                <>
                  <Navigation className="h-4 w-4" />
                  Dispatch Run ({loadedCount} LRs)
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
