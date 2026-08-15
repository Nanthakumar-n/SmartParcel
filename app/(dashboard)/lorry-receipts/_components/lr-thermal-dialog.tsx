'use client';

import React, { useRef } from 'react';
import { Printer, FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatINRFromPaise } from '@/lib/utils/format-currency';
import { formatPhoneDisplay } from '@/lib/utils/format-phone';
import type { LRDetailed } from '@/lib/db/lorry-receipts';

interface LRThermalDialogProps {
  lr: LRDetailed;
  tenantName?: string;
  trigger?: React.ReactElement;
  defaultOpen?: boolean;
}

export function LRThermalDialog({
  lr,
  tenantName = 'SmartParcel Logistics',
  trigger,
  defaultOpen = false,
}: LRThermalDialogProps) {
  const [open, setOpen] = React.useState(defaultOpen);
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span>Thermal Bill (3&quot;)</span>
            </Button>
          }
        />
      )}

      <DialogContent className="sm:max-w-[420px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Lorry Receipt (Builty)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Thermal 3-inch receipt format for consignor and transit copy.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Thermal Print Card */}
        <div
          ref={receiptRef}
          className="bg-white border-2 border-dashed border-slate-300 p-4 rounded-md font-mono text-xs text-slate-900 space-y-3 shadow-inner print:border-none print:shadow-none print:p-0"
        >
          {/* Header */}
          <div className="text-center border-b border-slate-300 pb-2 space-y-0.5">
            <div className="font-bold text-sm tracking-wider uppercase">
              {tenantName}
            </div>
            <div className="text-[10px] text-slate-500 uppercase">
              Goods Transport & Logistics Waybill
            </div>
            <div className="font-bold text-base tracking-widest text-blue-900 pt-1">
              {lr.lr_number}
            </div>
            <div className="text-[10px] text-slate-600">
              Booking Date: {lr.booking_date}
            </div>
          </div>

          {/* Route Section */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-2 text-[11px]">
            <div>
              <span className="text-[9px] text-slate-400 block uppercase">FROM (ORIGIN)</span>
              <span className="font-bold">[{lr.from_hub?.hub_code}] {lr.from_hub?.city}</span>
              <span className="text-[10px] text-slate-600 block truncate">{lr.from_hub?.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-400 block uppercase">TO (DESTINATION)</span>
              <span className="font-bold">[{lr.to_hub?.hub_code}] {lr.to_hub?.city}</span>
              <span className="text-[10px] text-slate-600 block truncate">{lr.to_hub?.name}</span>
            </div>
          </div>

          {/* Consignor & Consignee */}
          <div className="grid grid-cols-2 gap-2 border-b border-slate-300 pb-2 text-[11px]">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">CONSIGNOR (SENDER)</span>
              <span className="font-bold block truncate">{lr.consignor_name}</span>
              <span className="text-[10px] text-slate-600 block">{formatPhoneDisplay(lr.consignor_phone)}</span>
              {lr.consignor_gstin && (
                <span className="text-[9px] text-slate-500 block">GST: {lr.consignor_gstin}</span>
              )}
            </div>
            <div className="space-y-0.5 text-right">
              <span className="text-[9px] text-slate-400 uppercase font-bold block">CONSIGNEE (RECEIVER)</span>
              <span className="font-bold block truncate">{lr.consignee_name}</span>
              <span className="text-[10px] text-slate-600 block">{formatPhoneDisplay(lr.consignee_phone)}</span>
              {lr.consignee_gstin && (
                <span className="text-[9px] text-slate-500 block">GST: {lr.consignee_gstin}</span>
              )}
            </div>
          </div>

          {/* Cargo Details */}
          <div className="border-b border-slate-300 pb-2 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Goods Description:</span>
              <span className="font-semibold">{lr.goods_description}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">No. of Packages:</span>
              <span className="font-semibold">{lr.num_packages} Units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Charged Weight:</span>
              <span className="font-semibold">{lr.weight_kg ? `${lr.weight_kg} kg` : 'N/A'}</span>
            </div>
          </div>

          {/* Financials */}
          <div className="border-b-2 border-slate-900 pb-2 text-xs space-y-1">
            <div className="flex justify-between items-center text-sm font-bold pt-1">
              <span>TOTAL FREIGHT:</span>
              <span className="text-blue-900">{formatINRFromPaise(Number(lr.freight_amount))}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-500">PAYMENT STATUS:</span>
              <span className="font-bold px-1.5 py-0.5 bg-slate-100 rounded border border-slate-300">
                {lr.payment_mode}
              </span>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="text-[9px] text-slate-400 text-center space-y-1 pt-1">
            <p>Subject to local jurisdiction. Goods carried at owner&apos;s risk.</p>
            <p className="font-bold text-slate-700 tracking-wider">
              *** SMARTPARCEL VERIFIED ***
            </p>
          </div>
        </div>

        <DialogFooter className="pt-2 flex sm:justify-between items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="text-xs"
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Receipt</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
