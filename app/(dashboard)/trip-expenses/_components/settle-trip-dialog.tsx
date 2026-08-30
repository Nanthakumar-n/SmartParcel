'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  tripExpenseSettleSchema,
  type TripExpenseSettleInput,
} from '@/lib/validations/trip-expense';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { settleTripAction } from '../actions';

interface SettleTripDialogProps {
  tripId: string;
  tripLabel: string;
  netBalancePaise: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SettleTripDialog({
  tripId,
  tripLabel,
  netBalancePaise,
  open,
  onOpenChange,
  onSuccess,
}: SettleTripDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TripExpenseSettleInput>({
    resolver: zodResolver(tripExpenseSettleSchema),
    defaultValues: {
      settlement_mode: 'CASH',
      notes: '',
    },
  });

  const isDriverOwing = netBalancePaise > 0;
  const isCompanyOwing = netBalancePaise < 0;
  const isZeroBalance = netBalancePaise === 0;

  const onSubmit = async (values: TripExpenseSettleInput) => {
    setIsSubmitting(true);
    try {
      const res = await settleTripAction(tripId, values);
      if (res.success) {
        toast.success('Trip expense ledger settled successfully!');
        form.reset({
          settlement_mode: 'CASH',
          notes: '',
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        if (res.error._form) {
          toast.error(res.error._form[0]);
        }
        for (const [field, messages] of Object.entries(res.error)) {
          if (field !== '_form' && (field === 'settlement_mode' || field === 'notes')) {
            form.setError(field, { message: messages[0] });
          }
        }
      }
    } catch {
      toast.error('An unexpected error occurred while settling the trip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Settle Trip Expense Ledger
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                Trip: {tripLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Net Balance Status Card */}
        <div
          className={`p-3.5 rounded-lg border text-xs space-y-1.5 ${
            isDriverOwing
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
              : isCompanyOwing
              ? 'bg-rose-50/70 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wider text-[10px]">
              Final Calculated Balance
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold ${
                isDriverOwing
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isCompanyOwing
                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}
            >
              {isDriverOwing
                ? 'Driver Owes Company'
                : isCompanyOwing
                ? 'Company Owes Driver'
                : 'Zero Balance'}
            </Badge>
          </div>

          <div className="text-xl font-bold font-mono tracking-tight">
            {formatINRFromPaise(Math.abs(netBalancePaise))}
          </div>

          <p className="text-[11px] opacity-90 leading-tight">
            {isDriverOwing &&
              'The driver holds remaining advance cash. Collect this amount before closing.'}
            {isCompanyOwing &&
              'The driver paid out-of-pocket road expenses. Reimburse this amount to driver.'}
            {isZeroBalance && 'Total advances equal total incurred expenses perfectly.'}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {/* Settlement Payment Mode */}
            <FormField
              control={form.control}
              name="settlement_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Settlement Payment Mode <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger className="text-xs h-9 bg-white">
                        <SelectValue placeholder="Select Payment Mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="CASH" className="text-xs">
                        Cash
                      </SelectItem>
                      <SelectItem value="UPI" className="text-xs">
                        UPI / GPay / PhonePe
                      </SelectItem>
                      <SelectItem value="BANK_TRANSFER" className="text-xs">
                        Bank Transfer / IMPS / NEFT
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Settlement Notes / Transaction Ref (Optional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. UPI Ref #98127391823 or Handed cash at Pune Hub"
                      rows={2}
                      className="text-xs resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Settling...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm Settlement</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
