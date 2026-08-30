'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
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
  Receipt,
  PlusCircle,
  CheckCircle2,
  Ban,
  RotateCcw,
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
import {
  getTripExpenseDetailsAction,
  voidTripExpenseAction,
  reopenSettlementAction,
} from '@/app/(dashboard)/trip-expenses/actions';
import { AddExpenseDialog } from '@/app/(dashboard)/trip-expenses/_components/add-expense-dialog';
import { SettleTripDialog } from '@/app/(dashboard)/trip-expenses/_components/settle-trip-dialog';
import type { TripWithRelations } from '@/lib/db/trips';
import type { AvailableVehicleOption } from '@/lib/db/vehicles';
import type { DriverRow } from '@/lib/db/drivers';
import type { TripExpenseWithUsers, TripSettlementWithUser } from '@/lib/db/trip-expenses';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatDateIST } from '@/lib/utils/format-date';

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
  userId?: string;
  onOpenChange: (open: boolean) => void;
}

const EXPENSE_CATEGORY_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  ADVANCE: { label: 'Advance', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FUEL: { label: 'Fuel', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  TOLL: { label: 'Toll', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  MAINTENANCE: { label: 'Repairs', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  BHATTA: { label: 'Bhatta', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  LABOUR: { label: 'Labour', bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  MISC: { label: 'Misc', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

export function ManifestPanel({ trip, open, userRole, userId, onOpenChange }: ManifestPanelProps) {
  const [currentTrip, setCurrentTrip] = useState<TripWithRelations | null>(trip);
  const [activeTab, setActiveTab] = useState<'manifest' | 'expenses'>('manifest');
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

  // Expenses State
  const [expenses, setExpenses] = useState<TripExpenseWithUsers[]>([]);
  const [settlement, setSettlement] = useState<TripSettlementWithUser | null>(null);
  const [totalAdvancesPaise, setTotalAdvancesPaise] = useState(0);
  const [totalExpensesPaise, setTotalExpensesPaise] = useState(0);
  const [netBalancePaise, setNetBalancePaise] = useState(0);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<TripExpenseWithUsers | null>(null);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);

  const isFleetOwner = userRole === 'fleet_owner';

  // Load Expenses Data
  const loadExpenses = useCallback(async (tripId: string) => {
    setIsLoadingExpenses(true);
    try {
      const res = await getTripExpenseDetailsAction(tripId);
      if (res.success) {
        setExpenses(res.data.expenses);
        setSettlement(res.data.settlement);
        setTotalAdvancesPaise(res.data.totalAdvancesPaise);
        setTotalExpensesPaise(res.data.totalExpensesPaise);
        setNetBalancePaise(res.data.netBalancePaise);
      }
    } catch {
      // Non-blocking error
    } finally {
      setIsLoadingExpenses(false);
    }
  }, []);

  // Sync currentTrip when prop changes
  useEffect(() => {
    setCurrentTrip(trip);
    setIsEditingFleet(false);
    if (trip?.id) {
      loadExpenses(trip.id);
    }
  }, [trip, loadExpenses]);

  // Load available LRs for pool when panel opens
  useEffect(() => {
    if (open && currentTrip && currentTrip.status === 'SCHEDULED') {
      setIsLoadingPool(true);
      getAvailableLRsAction(currentTrip.id)
        .then((res) => {
          if (res.success) {
            setPoolLRs(res.data as AvailableLR[]);
          }
        })
        .finally(() => setIsLoadingPool(false));
    }
  }, [open, currentTrip]);

  if (!currentTrip) return null;

  const lrs = currentTrip.lorry_receipts || [];
  const bookedLRs = lrs.filter((lr) => lr.status === 'BOOKED');
  const inTransitLRs = lrs.filter((lr) => lr.status === 'IN_TRANSIT');
  const hasVehicle = Boolean(currentTrip.vehicle_id);
  const totalFreight = lrs.reduce((sum, lr) => sum + Number(lr.freight_amount || 0), 0);

  const canDispatch = currentTrip.status === 'SCHEDULED' && hasVehicle && bookedLRs.length > 0;
  const canMarkArrived = currentTrip.status === 'IN_TRANSIT';
  const canCancel =
    currentTrip.status === 'SCHEDULED' ||
    (currentTrip.status === 'IN_TRANSIT' && isFleetOwner);

  // ── Fleet Assignment Handlers ──────────────────────────────────────────────

  const handleOpenFleetEditor = async () => {
    setIsEditingFleet(true);
    setSelectedVehicleId(currentTrip.vehicle_id || '');
    setSelectedDriverId(currentTrip.driver_id || '');
    setIsLoadingFleet(true);

    try {
      const res = await getAvailableFleetAction(currentTrip.from_hub.id, currentTrip.id);
      if (res.success) {
        setAvailableFleet(res.data);
      } else {
        toast.error('Failed to load available fleet.');
      }
    } catch {
      toast.error('An unexpected error occurred while loading fleet.');
    } finally {
      setIsLoadingFleet(false);
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    const chosenVehicle = availableFleet.vehicles.find((v) => v.id === vehicleId);
    if (chosenVehicle && chosenVehicle.default_driver_id) {
      const driverExists = availableFleet.drivers.some((d) => d.id === chosenVehicle.default_driver_id);
      if (driverExists) {
        setSelectedDriverId(chosenVehicle.default_driver_id);
      }
    }
  };

  const handleSaveFleet = async () => {
    if (!selectedVehicleId) {
      toast.error('Please select a vehicle.');
      return;
    }

    setIsSavingFleet(true);
    startTransition(async () => {
      try {
        const driverIdToSave = selectedDriverId === 'NO_DRIVER' || !selectedDriverId ? null : selectedDriverId;
        const res = await assignVehicleAndDriverAction(currentTrip.id, selectedVehicleId, driverIdToSave);
        if (res.success) {
          toast.success('Vehicle and driver assigned to this trip.');
          const chosenVehicle = availableFleet.vehicles.find((v) => v.id === selectedVehicleId);
          const chosenDriver = availableFleet.drivers.find((d) => d.id === driverIdToSave);

          setCurrentTrip((prev) =>
            prev
              ? {
                  ...prev,
                  vehicle_id: selectedVehicleId,
                  vehicle: chosenVehicle
                    ? {
                        id: chosenVehicle.id,
                        registration_number: chosenVehicle.registration_number,
                        vehicle_type: chosenVehicle.vehicle_type,
                        capacity_tonnes: chosenVehicle.capacity_tonnes,
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
          const msg =
            currentTrip.status === 'SCHEDULED'
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
          toast.success('LR removed and returned to booking pool.');
          const removed = lrs.find((l) => l.id === lrId);
          if (removed) {
            setPoolLRs((prev) => [
              ...prev,
              {
                id: removed.id,
                lr_number: removed.lr_number,
                consignor_name: removed.consignor_name,
                consignee_name: removed.consignee_name,
                freight_amount: Number(removed.freight_amount || 0),
              },
            ]);
          }
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

  const handleVoidExpense = async () => {
    if (!expenseToVoid) return;
    startTransition(async () => {
      try {
        const res = await voidTripExpenseAction(expenseToVoid.id);
        if (res.success) {
          toast.success('Expense entry voided successfully.');
          setVoidDialogOpen(false);
          setExpenseToVoid(null);
          loadExpenses(currentTrip.id);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to void expense entry.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  const handleReopenSettlement = async () => {
    startTransition(async () => {
      try {
        const res = await reopenSettlementAction(currentTrip.id);
        if (res.success) {
          toast.success('Settlement re-opened! You can now record or adjust entries.');
          setReopenDialogOpen(false);
          loadExpenses(currentTrip.id);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to re-open settlement.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  const tripLabel = `[${currentTrip.from_hub.hub_code}] ${currentTrip.from_hub.city} → [${currentTrip.to_hub.hub_code}] ${currentTrip.to_hub.city}`;
  const isSettled = !!settlement;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[580px] flex flex-col h-full bg-white border-l border-slate-200 p-0">
          <div className="p-6 overflow-y-auto flex-1 space-y-4">
            <SheetHeader>
              <div className="flex items-center gap-2 text-blue-600">
                <FileSpreadsheet className="h-5 w-5" />
                <SheetTitle className="text-slate-900 font-bold text-lg">Trip Dispatch Manifest</SheetTitle>
              </div>
              <SheetDescription className="text-xs text-slate-500">
                {currentTrip.status === 'SCHEDULED'
                  ? 'Manage cargo manifest, assign fleet, and dispatch the run.'
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
                          value={selectedDriverId}
                          onValueChange={(val) => setSelectedDriverId(val ?? '')}
                          disabled={isSavingFleet}
                        >
                          <SelectTrigger className="text-xs h-8 bg-white">
                            {(() => {
                              if (!selectedDriverId || selectedDriverId === 'NO_DRIVER') {
                                return <span className="text-slate-500">No driver assigned</span>;
                              }
                              const d = availableFleet.drivers.find((dr) => dr.id === selectedDriverId);
                              return d ? <span>{d.full_name} ({d.phone})</span> : <SelectValue placeholder="Select driver" />;
                            })()}
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NO_DRIVER" className="text-xs text-slate-500">
                              No driver assigned (contractor / third-party)
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

            {/* TABBED INTERFACE: Cargo Manifest vs Driver Expenses */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('manifest')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      activeTab === 'manifest'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    <span>Manifest ({lrs.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                      activeTab === 'expenses'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>Expenses ({expenses.length})</span>
                    {netBalancePaise !== 0 && (
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          netBalancePaise > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {netBalancePaise > 0 ? '+' : '-'}
                        {formatINRFromPaise(Math.abs(netBalancePaise))}
                      </span>
                    )}
                  </button>
                </div>

                {activeTab === 'expenses' && !isSettled && (
                  <Button
                    size="xs"
                    onClick={() => setAddExpenseOpen(true)}
                    className="h-7 text-[11px] bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold gap-1"
                  >
                    <PlusCircle className="h-3 w-3" />
                    <span>Add Expense</span>
                  </Button>
                )}
              </div>

              {/* TAB 1: Cargo Manifest */}
              {activeTab === 'manifest' && (
                <div className="space-y-4">
                  {/* Assigned LRs */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Assigned Manifest ({lrs.length})
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
                            className="p-3 border rounded-lg bg-white flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-slate-300 transition-colors"
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
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <Archive className="h-3.5 w-3.5 text-slate-400" />
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
                                className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white shrink-0 font-semibold"
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
              )}

              {/* TAB 2: Trip Expenses */}
              {activeTab === 'expenses' && (
                <div className="space-y-4">
                  {/* Balance Summary Header */}
                  <div className="p-3 rounded-lg border bg-slate-50 border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Trip Running Balance
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          isSettled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : netBalancePaise > 0
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : netBalancePaise < 0
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isSettled
                          ? 'Settled (₹0.00 Outstanding)'
                          : netBalancePaise > 0
                          ? 'Driver Owes Company'
                          : netBalancePaise < 0
                          ? 'Company Owes Driver'
                          : 'Zero Balance'}
                      </Badge>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div className="text-lg font-bold font-mono">
                        {isSettled
                          ? '₹0.00'
                          : formatINRFromPaise(Math.abs(netBalancePaise))}
                      </div>
                      <div className="text-[11px] text-slate-500 space-x-2 font-mono">
                        <span className="text-emerald-700 font-semibold">
                          +{formatINRFromPaise(totalAdvancesPaise)}
                        </span>
                        <span>/</span>
                        <span className="text-rose-700 font-semibold">
                          -{formatINRFromPaise(totalExpensesPaise)}
                        </span>
                      </div>
                    </div>

                    {isSettled && settlement && (
                      <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-950 flex flex-col gap-1">
                        <div className="flex items-center justify-between font-bold text-emerald-900">
                          <span>Settled Amount: {formatINRFromPaise(Math.abs(settlement.net_balance))}</span>
                          <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-800 border-emerald-300">
                            {settlement.net_balance > 0
                              ? 'Driver Refunded'
                              : settlement.net_balance < 0
                              ? 'Driver Reimbursed'
                              : 'Zero Balance'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 text-[10px]">
                          <span>
                            Via <strong>{settlement.settlement_mode}</strong> on {formatDateIST(settlement.settled_at)}
                          </span>
                          {isFleetOwner && (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setReopenDialogOpen(true)}
                              className="h-5 text-[10px] text-slate-600 hover:text-slate-900 p-0"
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Re-open
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Settle CTA for Fleet Owner if not settled */}
                  {!isSettled && isFleetOwner && expenses.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => setSettleDialogOpen(true)}
                      className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 h-8 shadow-2xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Settle Trip Ledger ({formatINRFromPaise(Math.abs(netBalancePaise))})</span>
                    </Button>
                  )}

                  {/* Expense Items List */}
                  {isLoadingExpenses ? (
                    <div className="py-8 flex items-center justify-center text-slate-400 gap-2 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Loading expense ledger...</span>
                    </div>
                  ) : expenses.length === 0 && !isSettled ? (
                    <div className="p-6 border border-dashed rounded-lg text-center bg-slate-50 space-y-1.5 text-xs">
                      <Receipt className="h-5 w-5 text-slate-400 mx-auto" />
                      <div className="font-semibold text-slate-600">No Expenses Recorded</div>
                      <p className="text-slate-400">
                        Record cash advances or road expenses (fuel, tolls, bhatta) for this run.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map((exp) => {
                        const isAdvance = exp.category === 'ADVANCE';
                        const style = EXPENSE_CATEGORY_STYLES[exp.category] || EXPENSE_CATEGORY_STYLES.MISC;
                        const canVoid =
                          !isSettled &&
                          !exp.is_voided &&
                          (isFleetOwner || exp.entered_by === userId);

                        return (
                          <div
                            key={exp.id}
                            className={`p-3 border rounded-lg bg-white flex items-center justify-between gap-3 text-xs shadow-2xs ${
                              exp.is_voided ? 'opacity-60 bg-slate-50' : ''
                            }`}
                          >
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] font-bold ${style.bg} ${style.text} ${style.border}`}
                                >
                                  {style.label}
                                </Badge>
                                {exp.is_voided && (
                                  <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.2 rounded font-mono font-semibold">
                                    VOIDED
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {formatDateIST(exp.entered_at)}
                                </span>
                              </div>
                              <p className={`text-slate-600 truncate ${exp.is_voided ? 'line-through' : ''}`}>
                                {exp.description || `${style.label} entry`}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`font-mono font-bold ${
                                  exp.is_voided
                                    ? 'text-slate-400 line-through'
                                    : isAdvance
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {isAdvance ? '+' : '-'}
                                {formatINRFromPaise(Math.abs(Number(exp.amount)))}
                              </span>

                              {canVoid && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => {
                                    setExpenseToVoid(exp);
                                    setVoidDialogOpen(true);
                                  }}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="Void entry"
                                >
                                  <Ban className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Settlement Balancing Item when Settled */}
                      {isSettled && settlement && (
                        <div className="p-3 border-2 border-emerald-300 rounded-lg bg-emerald-50/70 flex items-center justify-between gap-3 text-xs shadow-2xs">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge className="text-[9px] font-bold bg-emerald-600 text-white">
                                SETTLEMENT
                              </Badge>
                              <span className="text-[10px] text-emerald-800 font-mono">
                                {formatDateIST(settlement.settled_at)}
                              </span>
                            </div>
                            <p className="text-emerald-950 font-semibold truncate">
                              {settlement.net_balance < 0
                                ? `Settlement payout reimbursed to driver via ${settlement.settlement_mode}`
                                : settlement.net_balance > 0
                                ? `Settlement refund collected from driver via ${settlement.settlement_mode}`
                                : `Zero balance settled via ${settlement.settlement_mode}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold text-emerald-700 text-sm">
                              {settlement.net_balance < 0 ? '+' : '-'}
                              {formatINRFromPaise(Math.abs(settlement.net_balance))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
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

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        tripId={currentTrip.id}
        tripLabel={tripLabel}
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        onSuccess={() => loadExpenses(currentTrip.id)}
      />

      {/* Settle Trip Dialog */}
      <SettleTripDialog
        tripId={currentTrip.id}
        tripLabel={tripLabel}
        netBalancePaise={netBalancePaise}
        open={settleDialogOpen}
        onOpenChange={setSettleDialogOpen}
        onSuccess={() => loadExpenses(currentTrip.id)}
      />

      {/* Void Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Void Expense Entry?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This entry will be marked as voided in the audit trail.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" size="xs" onClick={() => setVoidDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleVoidExpense} className="bg-rose-600 hover:bg-rose-700 text-white">
              Confirm Void
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-open Settlement Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900">Re-open Settlement?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              This will cancel the current settlement, allowing you to add or modify entries before re-settling.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2 gap-2">
            <Button variant="outline" size="xs" onClick={() => setReopenDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="xs" onClick={handleReopenSettlement} className="bg-amber-600 hover:bg-amber-700 text-white">
              Re-open Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Trip Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-slate-900 font-bold">Cancel Trip?</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 pt-1">
              {currentTrip.status === 'SCHEDULED' ? (
                <span>
                  All {bookedLRs.length} assigned LR{bookedLRs.length !== 1 ? 's' : ''} will be released back to the booking pool and will be available to assign to other trips.
                </span>
              ) : (
                <span>
                  This IN_TRANSIT trip will be cancelled. All {inTransitLRs.length} assigned LR{inTransitLRs.length !== 1 ? 's' : ''} will revert to BOOKED status in the pool, and the vehicle will become AVAILABLE.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isCancelling}
              onClick={() => setCancelDialogOpen(false)}
              className="text-xs"
            >
              Keep Trip
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isCancelling}
              onClick={handleCancelTrip}
              className="text-xs bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Trip'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
