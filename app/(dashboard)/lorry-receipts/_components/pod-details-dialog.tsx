'use client';

import React, { useState, useEffect } from 'react';
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
import {
  CheckCheck,
  Calendar,
  UserCheck,
  IndianRupee,
  Loader2,
} from 'lucide-react';
import { getLRDeliveryDetailsAction } from '../actions';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatDateIST } from '@/lib/utils/format-date';
import type { LRDetailed } from '@/lib/db/lorry-receipts';
import type { PODRow, CollectionRow } from '@/lib/db/collections-pod';

interface PODDetailsDialogProps {
  lr: LRDetailed;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PODDetailsDialog({ lr, open, onOpenChange }: PODDetailsDialogProps) {
  const [pod, setPod] = useState<PODRow | null>(null);
  const [collection, setCollection] = useState<CollectionRow | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      getLRDeliveryDetailsAction(lr.id)
        .then((res) => {
          if (res.success) {
            setPod(res.data.pod);
            setCollection(res.data.collection);
          }
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, lr.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Proof of Delivery (POD)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Confirmed receipt details for consignment {lr.lr_number}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="text-xs">Loading delivery details...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-1 text-xs">
            {/* Delivery Confirmation Card */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-700" />
                  Received By
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                  DELIVERED
                </Badge>
              </div>

              <div className="bg-white p-3 rounded-md border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Receiver Full Name:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {pod?.receiver_name ?? lr.consignee_name}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Delivery Timestamp:</span>
                  <span className="font-medium text-slate-800 text-[11px] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-slate-400" />
                    {pod?.delivered_at ? formatDateIST(pod.delivered_at) : 'Confirmed'}
                  </span>
                </div>

                {pod?.notes && (
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase">Remarks</span>
                    <p className="text-slate-700 text-[11px] italic mt-0.5">{pod.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* To-Pay Collection Receipt Card if applicable */}
            {collection && (
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-amber-700" />
                    Freight Collection Receipt
                  </span>
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    COLLECTED
                  </Badge>
                </div>

                <div className="bg-white p-3 rounded-md border border-amber-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Amount Collected:</span>
                    <span className="font-bold text-slate-900 text-sm">
                      {formatINRFromPaise(Number(collection.amount_collected))}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-[11px]">Payment Mode:</span>
                    <Badge variant="outline" className="text-[10px] font-bold bg-slate-50">
                      {collection.payment_mode}
                    </Badge>
                  </div>

                  {collection.collected_by && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Collected By:</span>
                      <span className="text-slate-800 font-medium text-[11px]">
                        {collection.collected_by}
                      </span>
                    </div>
                  )}

                  {collection.collected_at && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px]">Collection Time:</span>
                      <span className="text-slate-600 text-[11px]">
                        {formatDateIST(collection.collected_at)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Route & Cargo Overview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-400">Route Corridor:</span>
                <span className="font-mono font-semibold text-slate-800">
                  {lr.from_hub?.city} ({lr.from_hub?.hub_code}) → {lr.to_hub?.city} ({lr.to_hub?.hub_code})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cargo Description:</span>
                <span className="font-medium text-slate-800">
                  {lr.goods_description} ({lr.num_packages} pkgs)
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs w-full"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
