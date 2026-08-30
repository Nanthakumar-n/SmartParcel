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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  tripExpenseCreateSchema,
  TRIP_EXPENSE_CATEGORIES,
  type TripExpenseCategory,
} from '@/lib/validations/trip-expense';
import { addTripExpenseAction } from '../actions';

interface AddExpenseDialogProps {
  tripId: string;
  tripLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface AddExpenseFormValues {
  category: TripExpenseCategory;
  amount_rupees: string;
  description?: string;
}

const CATEGORY_LABELS: Record<string, { label: string; desc: string; type: 'advance' | 'expense' }> = {
  ADVANCE: { label: 'Cash Advance', desc: 'Money given to driver (Driver owes company)', type: 'advance' },
  FUEL: { label: 'Fuel / Diesel', desc: 'Diesel/petrol road refill', type: 'expense' },
  TOLL: { label: 'Toll / FastTag', desc: 'Highway toll payments', type: 'expense' },
  MAINTENANCE: { label: 'Maintenance / Repairs', desc: 'Roadside puncture, repair, or mechanic', type: 'expense' },
  BHATTA: { label: 'Driver Bhatta / Food', desc: 'Driver daily meal and lodging allowance', type: 'expense' },
  LABOUR: { label: 'Loading / Unloading Labour', desc: 'Hamali/coolie charges paid by driver', type: 'expense' },
  MISC: { label: 'Miscellaneous', desc: 'Other expense (description required)', type: 'expense' },
};

export function AddExpenseDialog({
  tripId,
  tripLabel,
  open,
  onOpenChange,
  onSuccess,
}: AddExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AddExpenseFormValues>({
    resolver: zodResolver(tripExpenseCreateSchema),
    defaultValues: {
      category: 'FUEL',
      amount_rupees: '',
      description: '',
    },
  });

  const selectedCategory = form.watch('category');
  const isMisc = selectedCategory === 'MISC';

  const onSubmit = async (values: AddExpenseFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await addTripExpenseAction(tripId, values);
      if (res.success) {
        toast.success(
          values.category === 'ADVANCE'
            ? 'Cash advance added successfully.'
            : 'Expense entry recorded successfully.'
        );
        form.reset({
          category: 'FUEL',
          amount_rupees: '',
          description: '',
        });
        onOpenChange(false);
        onSuccess?.();
      } else {
        if (res.error._form) {
          toast.error(res.error._form[0]);
        }
        for (const [field, messages] of Object.entries(res.error)) {
          if (field !== '_form' && (field === 'category' || field === 'amount_rupees' || field === 'description')) {
            form.setError(field, { message: messages[0] });
          }
        }
      }
    } catch {
      toast.error('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Record Trip Expense / Advance
              </DialogTitle>
              {tripLabel && (
                <DialogDescription className="text-xs text-slate-500 font-mono mt-0.5">
                  Trip: {tripLabel}
                </DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLInputElement) {
                e.preventDefault();
                form.handleSubmit(onSubmit)();
              }
            }}
          >
            {/* Category Select */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Expense Category <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger tabIndex={1} className="text-xs h-9 bg-white">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Driver Advance
                      </div>
                      <SelectItem value="ADVANCE" className="text-xs">
                        <div className="flex items-center justify-between w-full gap-2">
                          <span className="font-semibold text-emerald-700">Cash Advance</span>
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                            + Advance
                          </span>
                        </div>
                      </SelectItem>

                      <div className="px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Trip Road Expenses
                      </div>
                      {TRIP_EXPENSE_CATEGORIES.filter((c) => c !== 'ADVANCE').map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{CATEGORY_LABELS[cat]?.label || cat}</span>
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                              - Expense
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Amount Field (Rupees) */}
            <FormField
              control={form.control}
              name="amount_rupees"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Amount (₹) <span className="text-red-500">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-slate-400 font-semibold select-none">
                        ₹
                      </span>
                      <Input
                        tabIndex={2}
                        placeholder="500 or 1500.50"
                        className="pl-7 text-xs h-9 font-mono font-semibold"
                        {...field}
                        disabled={isSubmitting}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Description / Remarks</span>
                    {isMisc ? (
                      <span className="text-[10px] font-bold text-amber-600">
                        Mandatory for Misc
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                    )}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      tabIndex={3}
                      placeholder={
                        isMisc
                          ? 'Explain what this miscellaneous expense was for (e.g. Weighbridge fee, State permit)'
                          : 'Optional remarks or petrol pump name'
                      }
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

            {selectedCategory === 'ADVANCE' && (
              <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-800">
                <AlertCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  This advance increases the cash amount the driver holds. It will count as a{' '}
                  <strong>positive balance</strong> until road expenses are incurred.
                </span>
              </div>
            )}

            <DialogFooter className="pt-3 gap-2">
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
                tabIndex={4}
                disabled={isSubmitting}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Entry (Enter)</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
