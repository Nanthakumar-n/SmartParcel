'use client';

import React, { useState, useTransition } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  PlusCircle,
  CheckCircle2,
  RotateCcw,
  Ban,
  Loader2,
  Truck,
  User,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { TripWithExpenseLedger, TripExpenseWithUsers } from '@/lib/db/trip-expenses';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatDateIST } from '@/lib/utils/format-date';
import { AddExpenseDialog } from './add-expense-dialog';
import { SettleTripDialog } from './settle-trip-dialog';
import { voidTripExpenseAction, reopenSettlementAction } from '../actions';

interface ExpenseLedgerTableProps {
  trips: TripWithExpenseLedger[];
  isFleetOwner: boolean;
  userRole?: string;
  userHubIds?: string[];
  userId: string;
}

const CATEGORY_STYLES: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  ADVANCE: {
    label: 'Advance',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  FUEL: {
    label: 'Fuel / Diesel',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  TOLL: {
    label: 'Toll',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  BHATTA: {
    label: 'Bhatta / Food',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
  },
  LABOUR: {
    label: 'Labour',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
  },
  MISC: {
    label: 'Misc',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
  },
};

export function ExpenseLedgerTable({
  trips,
  isFleetOwner,
  userRole,
  userHubIds,
  userId,
}: ExpenseLedgerTableProps) {
  const [selectedTripId, setSelectedTripId] = useState<string>(
    trips.length > 0 ? trips[0].id : ''
  );
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [expenseToVoid, setExpenseToVoid] = useState<TripExpenseWithUsers | null>(null);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeTrip = trips.find((t) => t.id === selectedTripId) || trips[0] || null;

  const handleVoidExpense = async () => {
    if (!expenseToVoid) return;
    startTransition(async () => {
      try {
        const res = await voidTripExpenseAction(expenseToVoid.id);
        if (res.success) {
          toast.success('Expense entry voided successfully.');
          setVoidDialogOpen(false);
          setExpenseToVoid(null);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to void expense entry.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  const handleReopenSettlement = async () => {
    if (!activeTrip) return;
    startTransition(async () => {
      try {
        const res = await reopenSettlementAction(activeTrip.id);
        if (res.success) {
          toast.success('Settlement re-opened! You can now add or adjust expense entries.');
          setReopenDialogOpen(false);
        } else {
          toast.error(res.error?._form?.[0] || 'Failed to re-open settlement.');
        }
      } catch {
        toast.error('An unexpected error occurred.');
      }
    });
  };

  if (!activeTrip) {
    return (
      <Card className="border-slate-200">
        <CardContent className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="p-3 bg-slate-100 rounded-full text-slate-400">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Trips Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              No trips match your current filter. Create and dispatch trips from the Trip Dispatches page to track driver advances and road expenses.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tripLabel = `[${activeTrip.from_hub.hub_code}] ${activeTrip.from_hub.city} → [${activeTrip.to_hub.hub_code}] ${activeTrip.to_hub.city}`;

  return (
    <div className="space-y-6">
      {/* Trip Selector Tabs / Carousel */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1">
          Select Trip Manifest
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {trips.map((t) => {
            const isSelected = t.id === activeTrip.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTripId(t.id)}
                className={`flex-shrink-0 text-left px-3 py-2 rounded-md border text-xs transition-all ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-1 ring-blue-400 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold font-mono">
                  <span>[{t.from_hub.hub_code}]</span>
                  <span className="text-slate-400">→</span>
                  <span>[{t.to_hub.hub_code}]</span>
                  {t.isSettled ? (
                    <span className="ml-1 text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-sans font-semibold">
                      Settled
                    </span>
                  ) : t.expenses.length > 0 ? (
                    <span className="ml-1 text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-sans font-semibold">
                      Ledger Open
                    </span>
                  ) : null}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>{t.vehicle?.registration_number || 'No Vehicle'}</span>
                  <span>•</span>
                  <span>{formatDateIST(t.created_at)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Trip Details & Action Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{tripLabel}</h2>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  activeTrip.isSettled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {activeTrip.isSettled ? 'Settled' : 'Unsettled'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-semibold text-slate-700">
                  {activeTrip.vehicle
                    ? `${activeTrip.vehicle.registration_number} (${activeTrip.vehicle.vehicle_type})`
                    : 'No Truck Assigned'}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span>{activeTrip.driver?.full_name || 'No Driver'}</span>
                {activeTrip.driver?.phone && (
                  <span className="font-mono text-slate-400">({activeTrip.driver.phone})</span>
                )}
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <span>Created {formatDateIST(activeTrip.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!activeTrip.isSettled ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAddExpenseOpen(true)}
                  className="text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span>Add Entry</span>
                </Button>

                {(isFleetOwner ||
                  (userRole === 'hub_manager' &&
                    activeTrip.status === 'COMPLETED' &&
                    userHubIds?.includes(activeTrip.to_hub.id))) && (
                  <Button
                    size="sm"
                    onClick={() => setSettleDialogOpen(true)}
                    className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Settle Trip</span>
                  </Button>
                )}
              </>
            ) : (
              isFleetOwner && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReopenDialogOpen(true)}
                  className="text-xs gap-1.5 text-slate-700 hover:bg-slate-100 font-semibold border-slate-300"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Re-open Settlement</span>
                </Button>
              )
            )}
          </div>
        </div>

        {/* 3 Summary Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Advances Given */}
          <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-lg p-3 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-800 block">
              Total Cash Advances (+)
            </span>
            <div className="text-lg font-bold font-mono text-emerald-700">
              {formatINRFromPaise(activeTrip.totalAdvancesPaise)}
            </div>
            <p className="text-[10px] text-emerald-600">Total cash in driver&apos;s possession</p>
          </div>

          {/* Total Road Expenses Incurred */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-lg p-3 space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-rose-800 block">
              Total Road Expenses (-)
            </span>
            <div className="text-lg font-bold font-mono text-rose-700">
              {formatINRFromPaise(activeTrip.totalExpensesPaise)}
            </div>
            <p className="text-[10px] text-rose-600">Fuel, tolls, bhatta & repairs</p>
          </div>

          {/* Running Net Balance / Settled Balance */}
          <div
            className={`border rounded-lg p-3 space-y-1 ${
              activeTrip.isSettled
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : activeTrip.netBalancePaise > 0
                ? 'bg-emerald-100/40 border-emerald-300 text-emerald-950'
                : activeTrip.netBalancePaise < 0
                ? 'bg-rose-100/40 border-rose-300 text-rose-950'
                : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}
          >
            <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80 block">
              {activeTrip.isSettled ? 'Final Settlement Balance' : 'Running Net Balance'}
            </span>
            <div className="text-lg font-bold font-mono">
              {activeTrip.isSettled
                ? '₹0.00'
                : formatINRFromPaise(Math.abs(activeTrip.netBalancePaise))}
            </div>
            <p className="text-[10px] font-semibold">
              {activeTrip.isSettled && activeTrip.settlement
                ? `🟢 Fully Settled (${formatINRFromPaise(Math.abs(activeTrip.settlement.net_balance))} ${
                    activeTrip.settlement.net_balance > 0
                      ? 'collected from driver'
                      : activeTrip.settlement.net_balance < 0
                      ? 'reimbursed to driver'
                      : 'cleared'
                  })`
                : activeTrip.netBalancePaise > 0
                ? '🟢 Driver owes company'
                : activeTrip.netBalancePaise < 0
                ? '🔴 Company owes driver'
                : '⚪ Zero Balance'}
            </p>
          </div>
        </div>

        {/* Settlement Info Banner if Settled */}
        {activeTrip.isSettled && activeTrip.settlement && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-950 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-md shrink-0 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-emerald-900">
                    Settlement Cleared: {formatINRFromPaise(Math.abs(activeTrip.settlement.net_balance))}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold"
                  >
                    {activeTrip.settlement.net_balance > 0
                      ? 'Driver refunded Company'
                      : activeTrip.settlement.net_balance < 0
                      ? 'Company reimbursed Driver'
                      : 'Zero Balance Cleared'}
                  </Badge>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Paid via <strong>{activeTrip.settlement.settlement_mode}</strong> by{' '}
                  <strong>{activeTrip.settlement.settled_by_user?.full_name || 'Fleet Owner'}</strong> on{' '}
                  {formatDateIST(activeTrip.settlement.settled_at)}.
                  {activeTrip.settlement.notes && (
                    <span className="italic block sm:inline sm:ml-1">
                      (Ref / Notes: &ldquo;{activeTrip.settlement.notes}&rdquo;)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {isFleetOwner && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setReopenDialogOpen(true)}
                className="shrink-0 text-slate-700 border-slate-300 bg-white hover:bg-slate-50 font-semibold gap-1 self-end sm:self-center"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Re-open Settlement</span>
              </Button>
            )}
          </div>
        )}

        {/* Expense Entries Table */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-[11px] font-semibold text-slate-600">Type / Category</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-600">Description / Remarks</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-600">Entered By</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-600">Date & Time</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-600 text-right">Amount (₹)</TableHead>
                <TableHead className="text-[11px] font-semibold text-slate-600 text-center w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeTrip.expenses.length === 0 && !activeTrip.isSettled ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    No expense or advance entries recorded yet for this trip.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {activeTrip.expenses.map((exp) => {
                    const isAdvance = exp.category === 'ADVANCE';
                    const style = CATEGORY_STYLES[exp.category] || CATEGORY_STYLES.MISC;
                    const canVoid =
                      !activeTrip.isSettled &&
                      !exp.is_voided &&
                      (isFleetOwner || exp.entered_by === userId);

                    return (
                      <TableRow
                        key={exp.id}
                        className={exp.is_voided ? 'bg-slate-50/70 text-slate-400 line-through' : ''}
                      >
                        {/* Category Badge */}
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold ${style.bg} ${style.text} ${style.border} ${
                                exp.is_voided ? 'opacity-50' : ''
                              }`}
                            >
                              {style.label}
                            </Badge>
                            {exp.is_voided && (
                              <span className="text-[9px] bg-rose-100 text-rose-700 px-1 py-0.5 rounded font-mono font-semibold no-underline inline-block">
                                VOIDED
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Description */}
                        <TableCell className="text-xs py-2.5 max-w-[200px] truncate">
                          {exp.description || <span className="text-slate-400 italic">No notes</span>}
                        </TableCell>

                        {/* Entered By */}
                        <TableCell className="text-xs py-2.5 text-slate-600">
                          {exp.entered_by_user?.full_name || 'Staff'}
                        </TableCell>

                        {/* Date */}
                        <TableCell className="text-xs py-2.5 text-slate-500 font-mono text-[11px]">
                          {formatDateIST(exp.entered_at)}
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-xs py-2.5 text-right font-mono font-bold">
                          <span
                            className={
                              exp.is_voided
                                ? 'text-slate-400'
                                : isAdvance
                                ? 'text-emerald-700'
                                : 'text-rose-700'
                            }
                          >
                            {isAdvance ? '+' : '-'}
                            {formatINRFromPaise(Math.abs(Number(exp.amount)))}
                          </span>
                        </TableCell>

                        {/* Void Action */}
                        <TableCell className="py-2.5 text-center">
                          {canVoid ? (
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setExpenseToVoid(exp);
                                setVoidDialogOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Void this entry"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Settlement Balancing Row when Settled */}
                  {activeTrip.isSettled && activeTrip.settlement && (
                    <TableRow className="bg-emerald-50/70 border-t-2 border-emerald-200 font-medium">
                      <TableCell className="py-2.5">
                        <Badge className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-600 text-white shadow-2xs">
                          SETTLEMENT
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-2.5 font-semibold text-emerald-950">
                        {activeTrip.settlement.net_balance < 0
                          ? `Final settlement payout reimbursed to driver via ${activeTrip.settlement.settlement_mode}`
                          : activeTrip.settlement.net_balance > 0
                          ? `Final settlement refund collected from driver via ${activeTrip.settlement.settlement_mode}`
                          : `Zero balance settlement closed via ${activeTrip.settlement.settlement_mode}`}
                        {activeTrip.settlement.notes && (
                          <span className="text-slate-500 font-normal italic block text-[11px]">
                            Note: {activeTrip.settlement.notes}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-emerald-900 font-semibold">
                        {activeTrip.settlement.settled_by_user?.full_name || 'Fleet Owner'}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-emerald-800 font-mono text-[11px]">
                        {formatDateIST(activeTrip.settlement.settled_at)}
                      </TableCell>
                      <TableCell className="text-xs py-2.5 text-right font-mono font-bold text-emerald-700">
                        {activeTrip.settlement.net_balance < 0 ? '+' : '-'}
                        {formatINRFromPaise(Math.abs(activeTrip.settlement.net_balance))}
                      </TableCell>
                      <TableCell className="py-2.5 text-center text-[10px] text-emerald-600 font-bold">
                        CLEARED
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <AddExpenseDialog
        tripId={activeTrip.id}
        tripLabel={tripLabel}
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
      />

      {/* Settle Trip Dialog */}
      <SettleTripDialog
        tripId={activeTrip.id}
        tripLabel={tripLabel}
        netBalancePaise={activeTrip.netBalancePaise}
        open={settleDialogOpen}
        onOpenChange={setSettleDialogOpen}
      />

      {/* Void Confirmation Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Void Expense Entry?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  This action marks the entry as voided in the audit trail. It cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {expenseToVoid && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Category:</span>
                <span className="font-semibold">{expenseToVoid.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Amount:</span>
                <span className="font-mono font-bold">
                  {formatINRFromPaise(Math.abs(Number(expenseToVoid.amount)))}
                </span>
              </div>
              {expenseToVoid.description && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Description:</span>
                  <span className="text-slate-700">{expenseToVoid.description}</span>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVoidDialogOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleVoidExpense}
              disabled={isPending}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Voiding...</span>
                </>
              ) : (
                <span>Confirm Void</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-open Settlement Confirmation Dialog */}
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Re-open Settlement?
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Re-opening this trip will cancel the existing settlement, allowing you to add, adjust, or void entries before settling again.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReopenDialogOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReopenSettlement}
              disabled={isPending}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold gap-1"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Re-opening...</span>
                </>
              ) : (
                <span>Re-open Trip</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
