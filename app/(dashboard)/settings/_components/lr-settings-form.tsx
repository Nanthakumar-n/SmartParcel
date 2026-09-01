'use client';

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  FileText,
  Save,
  Loader2,
  Info,
  RotateCcw,
  Printer,
  Receipt,
  QrCode,
  Layers,
  FileCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  lrSettingsSchema,
  type LRSettingsInput,
} from '@/lib/validations/tenant-settings';
import { updateLRSettingsAction } from '../actions';
import type { TenantSettingsRow } from '@/lib/db/tenant-settings';
import { cn } from '@/lib/utils';

interface LRSettingsFormProps {
  settings: TenantSettingsRow | null;
  companyName?: string;
  contactPhone?: string;
}

const DEFAULT_TC = `1. Goods are carried strictly at owner's risk.
2. The carrier is not responsible for leakage, breakage, deterioration, or transit delays due to circumstances beyond control.
3. Consignments must be inspected and verified at destination branch before claiming delivery.
4. All claims and disputes are subject to local city jurisdiction only.`;

export function LRSettingsForm({
  settings,
  companyName = 'Patel Roadways Logistics',
  contactPhone = '+91 98765 43210',
}: LRSettingsFormProps) {
  const [isPending, startTransition] = useTransition();

  const form = useForm<LRSettingsInput>({
    resolver: zodResolver(lrSettingsSchema),
    defaultValues: {
      lr_terms_and_conditions: settings?.lr_terms_and_conditions || DEFAULT_TC,
      lr_default_remarks: settings?.lr_default_remarks || '',
      waybill_format: (settings?.waybill_format as LRSettingsInput['waybill_format']) || 'THERMAL_3INCH',
      waybill_copies: settings?.waybill_copies ?? 1,
      show_gst_breakdown: settings?.show_gst_breakdown ?? true,
      show_tracking_qr: settings?.show_tracking_qr ?? true,
      show_terms_on_print: settings?.show_terms_on_print ?? true,
    },
  });

  const watchFormat = form.watch('waybill_format');
  const watchCopies = form.watch('waybill_copies');
  const watchShowGST = form.watch('show_gst_breakdown');
  const watchShowQR = form.watch('show_tracking_qr');
  const watchShowTerms = form.watch('show_terms_on_print');
  const watchTC = form.watch('lr_terms_and_conditions') || DEFAULT_TC;
  const watchRemarks = form.watch('lr_default_remarks');

  const onSubmit = (values: LRSettingsInput) => {
    startTransition(async () => {
      try {
        const result = await updateLRSettingsAction(values);

        if (!result.success) {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(messages.join(', '));
            } else {
              form.setError(field as keyof LRSettingsInput, {
                type: 'manual',
                message: messages.join(', '),
              });
            }
          });
          return;
        }

        toast.success('Waybill format & LR defaults updated successfully');
        form.reset(values);
      } catch {
        toast.error('An unexpected error occurred while saving LR defaults');
      }
    });
  };

  const handleResetTC = () => {
    form.setValue('lr_terms_and_conditions', DEFAULT_TC, { shouldDirty: true });
    toast.info('Loaded standard Indian transport terms and conditions');
  };

  const formatOptions: {
    value: LRSettingsInput['waybill_format'];
    title: string;
    description: string;
    badge: string;
  }[] = [
    {
      value: 'THERMAL_3INCH',
      title: '3-Inch Thermal Receipt (80mm)',
      description: 'Continuous roll print for rapid counter issuance & driver handoff.',
      badge: 'Recommended',
    },
    {
      value: 'A4_STANDARD',
      title: 'Standard A4 Multi-Copy (Laser / Inkjet)',
      description: '3-part consignment note with Consignor, Consignee & POD signature sections.',
      badge: 'Full Page',
    },
    {
      value: 'A5_LANDSCAPE',
      title: 'A5 Landscape Transport Slip',
      description: 'Half-page compact billing docket for dot-matrix or laser printers.',
      badge: 'Compact',
    },
  ];

  return (
    <div className="w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-2xs">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Waybill Format & Legal Terms</span>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-semibold">
                Print & Digital Format
              </Badge>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Configure your default print format, number of bill copies, thermal roll layout, and legal terms & conditions.
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleResetTC}
          className="gap-1.5 text-xs text-indigo-700 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset Standard T&C</span>
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Waybill Format Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <Printer className="h-4 w-4 text-indigo-600" />
                <span>1. Default Waybill Print Format & Paper Size</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">Applied to 1-Click Print</span>
            </div>

            <FormField
              control={form.control}
              name="waybill_format"
              render={({ field }) => (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {formatOptions.map((opt) => {
                    const isSelected = field.value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between space-y-3',
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                        )}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">{opt.title}</span>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />}
                          </div>
                          <p className="text-[11px] text-slate-500 leading-relaxed">{opt.description}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] w-fit font-mono font-medium',
                            isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-600'
                          )}
                        >
                          {opt.badge}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </div>

          {/* Section 2: Print Customization & Copies */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>2. Print Preferences & Document Options</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Copies */}
              <FormField
                control={form.control}
                name="waybill_copies"
                render={({ field }) => (
                  <FormItem className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
                    <FormLabel className="text-xs font-semibold text-slate-800">
                      Default Copies per Print
                    </FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(val) => {
                        if (val) {
                          field.onChange(parseInt(val, 10));
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white text-xs h-9">
                          <SelectValue placeholder="Select copies" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Copy (Driver / Single)</SelectItem>
                        <SelectItem value="2">2 Copies (Consignor + Consignee)</SelectItem>
                        <SelectItem value="3">3 Copies (Original + POD + Office)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              {/* Show GST Breakdown */}
              <FormField
                control={form.control}
                name="show_gst_breakdown"
                render={({ field }) => (
                  <FormItem className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                    <div>
                      <FormLabel className="text-xs font-semibold text-slate-800">GST Breakdown</FormLabel>
                      <p className="text-[10px] text-slate-500 mt-0.5">Show CGST/SGST/IGST tax rows</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-slate-600">{field.value ? 'Enabled' : 'Hidden'}</span>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {/* Show Tracking QR */}
              <FormField
                control={form.control}
                name="show_tracking_qr"
                render={({ field }) => (
                  <FormItem className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                    <div>
                      <FormLabel className="text-xs font-semibold text-slate-800">Tracking QR Code</FormLabel>
                      <p className="text-[10px] text-slate-500 mt-0.5">Customer tracking link QR</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-slate-600">{field.value ? 'Enabled' : 'Hidden'}</span>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {/* Show Terms on Print */}
              <FormField
                control={form.control}
                name="show_terms_on_print"
                render={({ field }) => (
                  <FormItem className="p-3.5 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col justify-between space-y-2">
                    <div>
                      <FormLabel className="text-xs font-semibold text-slate-800">Terms on Bill Slip</FormLabel>
                      <p className="text-[10px] text-slate-500 mt-0.5">Print T&C at footer</p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-slate-600">{field.value ? 'Enabled' : 'Hidden'}</span>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section 3: Legal Terms & Live Simulator */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">
              <FileCheck className="h-4 w-4 text-indigo-600" />
              <span>3. Legal Terms & Live Print Preview</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left 7 Columns: Form Inputs */}
              <div className="lg:col-span-7 space-y-6">
                {/* Terms and Conditions Textarea */}
                <FormField
                  control={form.control}
                  name="lr_terms_and_conditions"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-slate-800">
                          Standard Terms & Conditions (T&C)
                        </FormLabel>
                        <span className="text-[11px] text-slate-400">Printed on receipt footer</span>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Enter terms and conditions..."
                          className="min-h-[140px] font-sans text-xs bg-white resize-y leading-relaxed p-3.5"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-slate-500">
                        Standard legal protection clause printed on customer waybills and thermal receipt slips.
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Default Consignment Remarks */}
                <FormField
                  control={form.control}
                  name="lr_default_remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-800">
                        Default Consignment Handling Remarks (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g. Fragile Cargo / Keep Dry / Verify container seal number on delivery"
                          className="min-h-[85px] font-sans text-xs bg-white resize-y leading-relaxed p-3"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-slate-500">
                        Optional text automatically pre-filled into the remarks field during new Lorry Receipt creation (F2).
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Numbering Format Info Banner */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3 text-xs text-slate-700">
                  <Info className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900">Autonomous LR Numbering Sequence</div>
                    <p className="text-slate-600 leading-relaxed">
                      SmartParcel automatically assigns unique consecutive LR numbers in the format{' '}
                      <code className="px-1.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded font-mono text-[11px]">
                        &#123;HUB_CODE&#125;-&#123;YYYY&#125;-&#123;SEQUENCE&#125;
                      </code>{' '}
                      (e.g., <span className="font-mono font-semibold text-slate-900">MUM-2025-000123</span>) per dispatch hub.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Live Waybill / Thermal Print Preview Simulator */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 pb-1">
                  <div className="flex items-center gap-1.5">
                    <Printer className="h-4 w-4 text-slate-600" />
                    <span>Live Receipt Print Simulator</span>
                  </div>
                  <Badge variant="secondary" className="text-[9px] bg-slate-100 font-mono">
                    {watchFormat === 'THERMAL_3INCH' ? '3-Inch Thermal' : watchFormat === 'A4_STANDARD' ? 'A4 Format' : 'A5 Docket'}
                  </Badge>
                </div>

                {/* Simulated Waybill Paper Card */}
                <div className="bg-amber-50/40 border border-amber-200/80 rounded-xl p-4 sm:p-5 font-mono text-[11px] text-slate-700 shadow-2xs space-y-3">
                  <div className="text-center pb-2 border-b border-dashed border-slate-300">
                    <div className="flex items-center justify-center gap-1.5 text-slate-900 font-bold text-xs uppercase mb-0.5">
                      <Receipt className="h-3.5 w-3.5 text-amber-700" />
                      <span>{companyName}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Waybill Receipt # MUM-2025-000123</div>
                    <div className="text-[10px] text-slate-500">Helpline: {contactPhone}</div>
                    {watchCopies > 1 && (
                      <div className="text-[9px] font-sans text-indigo-700 font-semibold mt-1">
                        [Print Mode: {watchCopies} Copies]
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 text-[10px] text-slate-600">
                    <div className="flex justify-between">
                      <span>ROUTE:</span>
                      <span className="font-bold text-slate-900">MUMBAI &rarr; DELHI</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PAYMENT:</span>
                      <span className="font-bold text-slate-900">TO-PAY (₹4,500.00)</span>
                    </div>
                    {watchShowGST && (
                      <div className="flex justify-between text-slate-500 text-[9px] pt-0.5 border-t border-slate-200">
                        <span>GST (5% RCM):</span>
                        <span>₹225.00</span>
                      </div>
                    )}
                    {watchRemarks && (
                      <div className="pt-1 text-[10px] text-amber-800 bg-amber-100/60 p-1.5 rounded">
                        <span className="font-bold">REMARKS: </span>
                        <span>{watchRemarks}</span>
                      </div>
                    )}
                  </div>

                  {watchShowQR && (
                    <div className="flex items-center justify-center gap-2 py-2 bg-white/80 rounded border border-amber-100">
                      <QrCode className="h-7 w-7 text-slate-700" />
                      <div className="text-[9px] text-slate-500 font-sans">
                        <div className="font-semibold text-slate-800">Scan to Track Live</div>
                        <div>smartparcel.in/track</div>
                      </div>
                    </div>
                  )}

                  {watchShowTerms && (
                    <div className="pt-2 border-t border-dashed border-slate-300">
                      <div className="text-[9px] font-bold uppercase text-slate-400 mb-1">Terms & Conditions:</div>
                      <div className="text-[9.5px] text-slate-600 leading-snug whitespace-pre-line bg-white/70 p-2 rounded border border-amber-100">
                        {watchTC}
                      </div>
                    </div>
                  )}

                  <div className="text-center pt-1 text-[9px] text-slate-400">
                    *** THANK YOU FOR YOUR BUSINESS ***
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Save Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {form.formState.isDirty ? (
                <span className="text-amber-600 font-medium">● You have unsaved changes in your waybill format settings.</span>
              ) : (
                <span>All waybill formatting preferences are synchronized.</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs px-6 h-10"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Defaults...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Waybill Format & Defaults</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
