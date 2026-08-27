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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Edit2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  dispatchTripAction,
  markTripArrivedAction,
  cancelTripAction,
  assignLRToTripAction,
  removeLRFromTripAction,
  getAvailableLRsAction,
  getAvailableFleetAction,
  assignVehicleAndDriverAction,
} from '../actions';
import type { TripWithRelations } from '@/lib/db/trips';
import type { AvailableVehicleOption } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';
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
  const [currentTrip, setCurrentTrip] = useState<TripWithRelations | null>(trip);
  const [isPending, startTransition] = useTransition();
  const [isDispatching, setIsDispatching] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionLrId, setActionLrId] = useState<string | null>(null);
  const [poolLRs, setPoolLRs] = useState<AvailableLR[]>([]);
  const [isLoadingPool, setIsLoadingPool] = useState(false);

  // Fleet Assignment State
  const [isEditingFleet, setIsEditingFleet] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [availableFleet, setAvailableFleet] = useState<{
    vehicles: AvailableVehicleOption[];
    drivers: DriverRow[];
  }>({ vehicles: [], drivers: [] });
  const [isLoadingFleet, setIsLoadingFleet] = useState(false);
  const [isSavingFleet, setIsSavingFleet] = useState(false);

  const isFleetOwner = userRole === 'fleet_owner';

  // Sync currentTrip when prop changes
  useEffect(() => {
    setCurrentTrip(trip);
    if (trip) {
      setSelectedVehicleId(trip.vehicle_id || '');
      setSelectedDriverId(trip.driver_id || '');
    }
    setIsEditingFleet(false);
  }, [trip]);

  // Load pool LRs when a SCHEDULED trip's manifest opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!currentTrip || !open || currentTrip.status !== 'SCHEDULED') {
      setPoolLRs([]);
      return;
    }
    setIsLoadingPool(true);
    getAvailableLRsAction(currentTrip.id)
      .then((res) => {
        if (res.success) setPoolLRs(res.data);
      })
      .catch(() => {
        // silent — pool is a nice-to-have
      })
      .finally(() => setIsLoadingPool(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrip?.id, open, currentTrip?.lorry_receipts.length]);

  if (!currentTrip) return null;

  const lrs = currentTrip.lorry_receipts || [];
  const bookedLRs = lrs.filter((lr) => lr.status === 'BOOKED');
  const inTransitLRs = lrs.filter((lr) => lr.status === 'IN_TRANSIT');
  const totalFreight = lrs.reduce((acc, curr) => acc + Number(curr.freight_amount), 0);

  // Dispatch requirements: SCHEDULED + vehicle assigned + at least 1 BOOKED LR
  const hasVehicle = !!currentTrip.vehicle_id;
  const canDispatch = currentTrip.status === 'SCHEDULED' && hasVehicle && bookedLRs.length > 0;
  const canMarkArrived = currentTrip.status === 'IN_TRANSIT';
  const canCancel = (currentTrip.status === 'SCHEDULED') || (currentTrip.status === 'IN_TRANSIT' && isFleetOwner);

  // ── Fleet Handlers ─────────────────────────────────────────────────────────

  const handleOpenFleetEditor = async () => {
    if (!currentTrip) return;
    setIsEditingFleet(true);
    setIsLoadingFleet(true);
    try {
      const res = await getAvailableFleetAction(
        currentTrip.from_hub_id,
        currentTrip.id,
        currentTrip.vehicle_id || undefined
      );
      if (res.success) {
        setAvailableFleet(res.data);
      } else {
        toast.error(res.error?._form?.[0] || 'Failed to load available fleet.');
      }
    } catch {
      toast.error('Failed to load fleet options.');
    } finally {
      setIsLoadingFleet(false);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const chosen = availableFleet.vehicles.find((v) => v.id === vehicleId);
    if (chosen?.default_driver_id && !selectedDriverId) {
      setSelectedDriverId(chosen.default_driver_id);
    }
  };

  const handleSaveFleet = async () => {
    if (!currentTrip) return;
    setIsSavingFleet(true);
    startTransition(async () => {
      try {
        const vehicleIdToSave = selectedVehicleId || null;
        const driverIdToSave = selectedDriverId || null;
        const res = await assignVehicleAndDriverAction(
          currentTrip.id,
          vehicleIdToSave,
          driverIdToSave
        );
        if (res.success) {
          toast.success('Vehicle and driver assigned successfully!');
          const chosenVehicle = availableFleet.vehicles.find((v) => v.id === vehicleIdToSave);
          const chosenDriver = availableFleet.drivers.find((d) => d.id === driverIdToSave);
          setCurrentTrip((prev) =>
            prev
              ? {
                  ...prev,
                  vehicle_id: vehicleIdToSave,
                  vehicle: chosenVehicle
                    ? {
                        id: chosenVehicle.id,
                        registration_number: chosenVehicle.registration_number,
                        vehicle_type: chosenVehicle.vehicle_type,
                      }
                    : null,
                  driver_id: driverIdToSave,
                  driver: chosenDriver
                    ? {
                        id: chosenDriver.id,
                        full_name: chosenDriver.full_name,
                        phone: chosenDriver.phone,
                      }
                    : null,
                }
              : null
          );
          setIsEditingFleet(false);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to assign vehicle and driver.');
        }
      } catch {
        toast.error('An unexpected error occurred while saving fleet.');
      } finally {
        setIsSavingFleet(false);
      }
    });
  };

  // ── Trip Handlers ──────────────────────────────────────────────────────────

  const handleDispatch = async () => {
    setIsDispatching(true);
    startTransition(async () => {
      try {
        const res = await dispatchTripAction(currentTrip.id);
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
        const res = await markTripArrivedAction(currentTrip.id);
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
        const res = await cancelTripAction(currentTrip.id);
        if (res.success) {
          const msg = currentTrip.status === 'SCHEDULED'
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
        const res = await assignLRToTripAction(lrId, currentTrip.id);
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
        const res = await removeLRFromTripAction(lrId, currentTrip.id);
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
                {currentTrip.status === 'SCHEDULED'
                  ? 'Manage cargo manifest and dispatch the run.'
                  : currentTrip.status === 'IN_TRANSIT'
                  ? 'Trip is in transit. Mark it arrived when the truck reaches the destination.'
                  : `Trip is ${currentTrip.status.toLowerCase()}.`}
              </SheetDescription>
            </SheetHeader>

            {/* Route & Status */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 min-w-0">
                <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[10px]">Route</span>
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 font-bold text-slate-900 leading-tight">
                  <span className="font-mono text-blue-600">[{currentTrip.from_hub.hub_code}]</span>
                  <span className="break-words">{currentTrip.from_hub.city}</span>
                  <span className="text-slate-400 shrink-0">→</span>
                  <span className="font-mono text-emerald-600">[{currentTrip.to_hub.hub_code}]</span>
                  <span className="break-words">{currentTrip.to_hub.city}</span>
                </div>
              </div>
              <div className="col-span-1 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 flex flex-col justify-between">
                <span className="text-slate-500 block uppercase tracking-wider font-semibold text-[10px]">Status</span>
                <div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      currentTrip.status === 'SCHEDULED'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : currentTrip.status === 'IN_TRANSIT'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : currentTrip.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {currentTrip.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Fleet Details */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  Fleet Assignment
                </span>
                {currentTrip.status === 'SCHEDULED' && !isEditingFleet && (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={handleOpenFleetEditor}
                    className="h-6 text-[10px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50 font-semibold"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    {currentTrip.vehicle ? 'Change Fleet' : 'Assign Fleet'}
                  </Button>
                )}
              </div>

              {isEditingFleet ? (
                <div className="space-y-3 pt-1 border-t border-slate-200">
                  {isLoadingFleet ? (
                    <div className="py-4 flex items-center justify-center text-slate-500 gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Loading available vehicles at [{currentTrip.from_hub.hub_code}] {currentTrip.from_hub.city}...</span>
                    </div>
                  ) : (
                    <>
                      {/* Vehicle Select */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Select Vehicle / Truck <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={selectedVehicleId}
                          onValueChange={(val) => handleSelectVehicle(val ?? '')}
                          disabled={isSavingFleet}
                        >
                          <SelectTrigger className="text-xs h-8 bg-white">
                            {(() => {
                              const v = availableFleet.vehicles.find((vh) => vh.id === selectedVehicleId);
                              return v ? (
                                <span className="font-semibold">{v.registration_number} ({v.vehicle_type} - {v.capacity_tonnes}T)</span>
                              ) : <SelectValue placeholder="Choose an available vehicle" />;
                            })()}
                          </SelectTrigger>
                          <SelectContent>
                            {availableFleet.vehicles.length === 0 ? (
                              <div className="p-2 text-center text-xs text-slate-400">
                                No available vehicles currently at [{currentTrip.from_hub.hub_code}] {currentTrip.from_hub.city}.
                              </div>
                            ) : (
                              availableFleet.vehicles.map((v) => (
                                <SelectItem key={v.id} value={v.id} className="text-xs">
                                  <div className="flex items-center justify-between w-full gap-2">
                                    <span className="font-mono font-bold">{v.registration_number}</span>
                                    <span className="text-slate-500">({v.vehicle_type} - {v.capacity_tonnes}T)</span>
                                    {v.currentLocationHub ? (
                                      <span className="text-[10px] text-blue-600 font-mono">[{v.currentLocationHub.hub_code}]</span>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600">New Fleet</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Driver Select */}
                      <div className="space-y-1">
                        <Label className="text-[11px] font-semibold text-slate-700">
                          Assigned Driver <span className="text-slate-400 font-normal">(Optional)</span>
                        </Label>
                        <Select
                          value={selectedDriverId || 'NONE'}
                          onValueChange={(val) => setSelectedDriverId(!val || val === 'NONE' ? '' : val)}
                          disabled={isSavingFleet}
                        >
                          <SelectTrigger className="text-xs h-8 bg-white">
                            {(() => {
                              const d = availableFleet.drivers.find((dr) => dr.id === selectedDriverId);
                              return d ? (
                                <span>{d.full_name} ({d.phone})</span>
                              ) : <SelectValue placeholder="No driver assigned (optional)" />;
                            })()}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE" className="text-xs text-slate-500">
                              -- No driver (Contractor / Optional) --
                            </SelectItem>
                            {availableFleet.drivers.map((d) => (
                              <SelectItem key={d.id} value={d.id} className="text-xs">
                                {d.full_name} <span className="text-slate-400">({d.phone})</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Save / Cancel buttons */}
                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="ghost"
                          onClick={() => setIsEditingFleet(false)}
                          disabled={isSavingFleet}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          onClick={handleSaveFleet}
                          disabled={isSavingFleet}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                          {isSavingFleet ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Saving...
                            </>
                          ) : (
                            'Save Assignment'
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-slate-700">Vehicle:</span>
                    </div>
                    {currentTrip.vehicle ? (
                      <span className="font-mono font-bold text-slate-900">
                        {currentTrip.vehicle.registration_number} ({currentTrip.vehicle.vehicle_type})
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
                      {currentTrip.driver ? `${currentTrip.driver.full_name} (${currentTrip.driver.phone})` : (
                        <span className="text-slate-400 font-normal">Not assigned (optional)</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

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
                      {currentTrip.status === 'SCHEDULED' && lr.status === 'BOOKED' && (
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
            {currentTrip.status === 'SCHEDULED' && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Archive className="h-4 w-4 text-slate-500" />
                  <span>Available in Pool</span>
                  {isLoadingPool && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
                </h3>

                {!isLoadingPool && poolLRs.length === 0 && (
                  <p className="text-xs text-slate-400 px-1">
                    No unassigned BOOKED LRs for this route. Create an LR on route{' '}
                    <span className="font-mono text-blue-600">[{currentTrip.from_hub.hub_code}]→[{currentTrip.to_hub.hub_code}]</span> to add it here.
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
            {currentTrip.status === 'SCHEDULED' && (
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
              {currentTrip.status === 'SCHEDULED'
                ? `This will cancel the trip and release all ${lrs.length} assigned LR(s) back to the booking pool. They can be assigned to a new trip.`
                : `This will cancel the in-transit trip. All ${inTransitLRs.length} IN_TRANSIT LR(s) will revert to BOOKED status. The vehicle will be released back to AVAILABLE.`}
            </DialogDescription>
          </DialogHeader>
          {currentTrip.status === 'IN_TRANSIT' && (
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
