'use client';

import React, { useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  CheckCheck,
  IndianRupee,
  Loader2,
  UserCheck,
} from 'lucide-react';
import {
  deliveryConfirmationSchema,
  type DeliveryConfirmationInput,
} from '@/lib/validations/delivery';
import { confirmDeliveryAction } from '../actions';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import type { LRDetailed } from '@/lib/db/lorry-receipts';

interface DeliveryDialogProps {
  lr: LRDetailed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeliveryDialog({ lr, open, onOpenChange }: DeliveryDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isToPay = lr.payment_mode === 'TO_PAY';
  const defaultRupees = (Number(lr.freight_amount) / 100).toFixed(2);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<DeliveryConfirmationInput>({
    resolver: zodResolver(deliveryConfirmationSchema),
    defaultValues: {
      lr_id: lr.id,
      receiver_name: lr.consignee_name || '',
      delivered_at: '',
      notes: '',
      is_to_pay: isToPay,
      amount_collected_rupees: isToPay ? defaultRupees : '',
      collection_payment_mode: 'CASH',
      collected_by: '',
      collection_notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        lr_id: lr.id,
        receiver_name: lr.consignee_name || '',
        delivered_at: '',
        notes: '',
        is_to_pay: isToPay,
        amount_collected_rupees: isToPay ? defaultRupees : '',
        collection_payment_mode: 'CASH',
        collected_by: '',
        collection_notes: '',
      });
    }
  }, [open, lr, isToPay, defaultRupees, reset]);

  const onSubmit = (data: DeliveryConfirmationInput) => {
    startTransition(async () => {
      const res = await confirmDeliveryAction(data);

      if (!res.success) {
        if (res.error._form) {
          toast.error(res.error._form[0]);
        } else {
          Object.entries(res.error).forEach(([field, messages]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setError(field as any, { message: messages[0] });
          });
          toast.error('Please resolve the validation errors');
        }
        return;
      }

      toast.success(
        `LR ${res.data.lrNumber} successfully delivered! POD and receipt saved.`
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Confirm Delivery & POD
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Record Proof of Delivery and collect freight receivables
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Consignment Summary Banner */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-blue-900">
                {lr.lr_number}
              </span>
              <Badge
                variant="outline"
                className="bg-white text-slate-700 font-mono text-[10px]"
              >
                {lr.from_hub?.hub_code} → {lr.to_hub?.hub_code}
              </Badge>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 block">
                {formatINRFromPaise(Number(lr.freight_amount))}
              </span>
              <Badge
                variant="outline"
                className={
                  isToPay
                    ? 'bg-amber-50 text-amber-700 border-amber-200 text-[10px]'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]'
                }
              >
                {lr.payment_mode}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Consignee</span>
              <span className="font-semibold text-slate-800">{lr.consignee_name}</span>
              <span className="text-slate-500 block font-mono">{formatPhoneDisplay(lr.consignee_phone)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Cargo</span>
              <span className="font-semibold text-slate-800 block truncate">{lr.goods_description}</span>
              <span className="text-slate-500">{lr.num_packages} pkgs {lr.weight_kg ? `• ${lr.weight_kg} kg` : ''}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Receiver Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Receiver Full Name *</span>
              <span className="text-[11px] text-slate-400 font-normal">Person receiving parcel</span>
            </Label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="e.g. Ramesh Patel"
                className="text-xs h-9 pl-9"
                {...register('receiver_name')}
              />
            </div>
            {errors.receiver_name && (
              <p className="text-[11px] text-rose-500 font-medium">{errors.receiver_name.message}</p>
            )}
          </div>

          {/* To-Pay Collection Section */}
          {isToPay && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-amber-700" />
                <span className="text-xs font-bold text-amber-900">
                  To-Pay Freight Collection Required
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount in Rupees */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Amount Collected (₹) *
                  </Label>
                  <Input
                    placeholder="0.00"
                    className="text-xs h-9 bg-white"
                    {...register('amount_collected_rupees')}
                  />
                  {errors.amount_collected_rupees && (
                    <p className="text-[11px] text-rose-500 font-medium">{errors.amount_collected_rupees.message}</p>
                  )}
                </div>

                {/* Collection Payment Mode */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-800">
                    Payment Mode *
                  </Label>
                  <Controller
                    control={control}
                    name="collection_payment_mode"
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="text-xs h-9 bg-white">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH" className="text-xs">
                            Cash
                          </SelectItem>
                          <SelectItem value="UPI" className="text-xs">
                            UPI (GPay / PhonePe / Paytm)
                          </SelectItem>
                          <SelectItem value="BANK_TRANSFER" className="text-xs">
                            Bank Transfer / IMPS / NEFT
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              {/* Collected By */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Collected By (Staff / Driver Name)
                </Label>
                <Input
                  placeholder="e.g. Suresh Kumar (Branch Staff)"
                  className="text-xs h-9 bg-white"
                  {...register('collected_by')}
                />
              </div>
            </div>
          )}

          {/* General Delivery Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800">
              Delivery Remarks / Notes (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Received in good condition, ID verified"
              className="text-xs min-h-[60px] resize-none"
              {...register('notes')}
            />
          </div>

          <DialogFooter className="pt-2 flex sm:justify-between items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Confirming Delivery...</span>
                </>
              ) : (
                <>
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Confirm Delivery & POD</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
