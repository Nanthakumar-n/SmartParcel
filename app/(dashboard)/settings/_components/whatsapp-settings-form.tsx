'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Zap,
  Activity,
  Radio,
  Eye,
  EyeOff,
  BellRing,
  Clock,
  MessageSquare,
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  whatsappSettingsSchema,
  type WhatsAppSettingsInput,
} from '@/lib/validations/tenant-settings';
import {
  updateWhatsAppSettingsAction,
  testWatiConnectionAction,
} from '../actions';
import type { TenantSettingsRow } from '@/lib/db/tenant-settings';
import { MASKED_TOKEN_PLACEHOLDER } from '@/lib/services/tenant-settings';

interface WhatsAppSettingsFormProps {
  settings: TenantSettingsRow | null;
  isTokenConfigured: boolean;
}

interface EventConfig {
  key: keyof WhatsAppSettingsInput['notification_preferences'];
  title: string;
  recipient: 'Consignor' | 'Consignee' | 'Both';
  description: string;
  triggerEvent: string;
}

const NOTIFICATION_EVENTS: EventConfig[] = [
  {
    key: 'BOOKED',
    title: 'Booking Confirmed (LR Created)',
    recipient: 'Consignor',
    description: 'Sends digital PDF waybill link immediately upon LR booking.',
    triggerEvent: 'LR status: BOOKED',
  },
  {
    key: 'IN_TRANSIT',
    title: 'Trip Dispatched (On Road)',
    recipient: 'Consignor',
    description: 'Notifies consignor with assigned truck reg number and dispatch time.',
    triggerEvent: 'LR status: IN_TRANSIT',
  },
  {
    key: 'ARRIVED',
    title: 'Arrived at Destination Hub',
    recipient: 'Consignee',
    description: 'Alerts consignee with destination branch hub contact details.',
    triggerEvent: 'LR status: ARRIVED',
  },
  {
    key: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    recipient: 'Consignee',
    description: 'Alerts consignee that cargo is on the way for final drop-off.',
    triggerEvent: 'LR status: OUT_FOR_DELIVERY',
  },
  {
    key: 'DELIVERED',
    title: 'Delivery Confirmation & POD',
    recipient: 'Consignee',
    description: 'Sends delivery receipt with receiver name and To-Pay acknowledgement.',
    triggerEvent: 'LR status: DELIVERED',
  },
  {
    key: 'PAYMENT_REMINDER',
    title: 'Overdue To-Pay Follow-up',
    recipient: 'Consignee',
    description: 'Automated daily follow-up for uncollected freight charges.',
    triggerEvent: 'Daily pg_cron at 10:00 AM IST',
  },
];

export function WhatsAppSettingsForm({
  settings,
  isTokenConfigured,
}: WhatsAppSettingsFormProps) {
  const [isPending, startTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);
  const [showToken, setShowToken] = useState(false);

  const rawToken = settings?.wati_api_token || '';
  const initialPrefs = (settings?.notification_preferences as Record<string, boolean>) || {};

  const form = useForm<WhatsAppSettingsInput>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsapp_enabled: settings?.whatsapp_enabled ?? false,
      wati_api_endpoint: settings?.wati_api_endpoint || '',
      wati_api_token: rawToken,
      notification_preferences: {
        BOOKED: initialPrefs.BOOKED ?? true,
        IN_TRANSIT: initialPrefs.IN_TRANSIT ?? true,
        ARRIVED: initialPrefs.ARRIVED ?? true,
        OUT_FOR_DELIVERY: initialPrefs.OUT_FOR_DELIVERY ?? true,
        DELIVERED: initialPrefs.DELIVERED ?? true,
        PAYMENT_REMINDER: initialPrefs.PAYMENT_REMINDER ?? true,
      },
      payment_reminder_days: settings?.payment_reminder_days ?? 3,
    },
  });

  const whatsappEnabled = form.watch('whatsapp_enabled');

  const onSubmit = (values: WhatsAppSettingsInput) => {
    startTransition(async () => {
      try {
        const result = await updateWhatsAppSettingsAction(values);

        if (!result.success) {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(messages.join(', '));
            } else {
              form.setError(field as keyof WhatsAppSettingsInput, {
                type: 'manual',
                message: messages.join(', '),
              });
            }
          });
          return;
        }

        toast.success('WhatsApp & WATI notification settings saved successfully');
        form.reset(values);
      } catch {
        toast.error('An unexpected error occurred while saving settings');
      }
    });
  };

  const handleTestConnection = async () => {
    const endpoint = form.getValues('wati_api_endpoint');
    const token = form.getValues('wati_api_token');

    if (!endpoint) {
      toast.error('Please enter a valid WATI API Endpoint URL first');
      form.setFocus('wati_api_endpoint');
      return;
    }

    if (!token && !isTokenConfigured) {
      toast.error('Please enter a WATI API Token to test');
      form.setFocus('wati_api_token');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testWatiConnectionAction({
        wati_api_endpoint: endpoint,
        wati_api_token: token || MASKED_TOKEN_PLACEHOLDER,
      });

      if (result.success) {
        setTestResult({ success: true, message: result.data.message });
        toast.success(result.data.message);
      } else {
        const errMsg = result.error._form?.join(', ') || 'Failed to connect to WATI API';
        setTestResult({ success: false, message: errMsg });
        toast.error(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error testing WATI';
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Top Banner Ribbon with Master Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 rounded-xl shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-2xs">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    WhatsApp Business Gateway (WATI)
                  </h2>
                  <Badge
                    variant="outline"
                    className={
                      whatsappEnabled
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 text-xs font-semibold'
                        : 'bg-slate-100 text-slate-500 border-slate-300 text-xs font-semibold'
                    }
                  >
                    {whatsappEnabled ? 'Active & Live' : 'Disabled'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Dispatches automated PDF waybills, transit updates, and payment reminders directly to consignor & consignee WhatsApp numbers.
                </p>
              </div>
            </div>

            <FormField
              control={form.control}
              name="whatsapp_enabled"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-3 space-y-0 shrink-0 bg-white px-3.5 py-2 rounded-lg border border-emerald-200">
                  <span className="text-xs font-semibold text-slate-700">Master WhatsApp Switch</span>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label="Toggle WhatsApp Notifications"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* 2-Column Enterprise Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: WATI Gateway Credentials */}
            <div className="p-6 bg-slate-50/60 border border-slate-200 rounded-xl space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span>WATI Gateway Credentials</span>
                </div>

                <FormField
                  control={form.control}
                  name="wati_api_endpoint"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-800">
                        WATI API Endpoint URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://live-server-XXXXX.wati.io"
                          className="font-mono text-xs bg-white h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-slate-500">
                        Obtained from your WATI Account &rarr; API Docs &rarr; API Endpoint.
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wati_api_token"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-xs font-semibold text-slate-800">
                          WATI Access Token (Bearer Key)
                        </FormLabel>
                        {isTokenConfigured && (
                          <button
                            type="button"
                            onClick={() => setShowToken(!showToken)}
                            className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                          >
                            {showToken ? (
                              <>
                                <EyeOff className="h-3 w-3" />
                                <span>Mask</span>
                              </>
                            ) : (
                              <>
                                <Eye className="h-3 w-3" />
                                <span>Reveal</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type={showToken ? 'text' : 'password'}
                          placeholder={
                            isTokenConfigured
                              ? MASKED_TOKEN_PLACEHOLDER
                              : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                          }
                          className="font-mono text-xs bg-white h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px] text-slate-500">
                        {isTokenConfigured
                          ? 'Token is safely stored. Leave unchanged or type a new key to update.'
                          : 'Enter the long-lived API Access Token provided by WATI.'}
                      </FormDescription>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Connection Validator Box */}
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Radio className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Connection Health Validator</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="gap-1.5 bg-white border-slate-300 text-xs font-semibold hover:bg-slate-50 shadow-2xs"
                  >
                    {isTesting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Testing Gateway...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        <span>Test Connection</span>
                      </>
                    )}
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      testResult.success
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-red-50 text-red-900 border-red-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold">
                        {testResult.success ? 'Gateway Verified' : 'Connection Error'}:
                      </span>{' '}
                      {testResult.message}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Automated Lifecycle Triggers & Reminders */}
            <div className="p-6 bg-slate-50/60 border border-slate-200 rounded-xl space-y-5">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-700">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-amber-600" />
                  <span>Lifecycle Event Triggers</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal normal-case">Individual Toggles</span>
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {NOTIFICATION_EVENTS.map((event) => (
                  <FormField
                    key={event.key}
                    control={form.control}
                    name={`notification_preferences.${event.key}`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-white hover:border-slate-300 transition-colors space-y-0 gap-3 shadow-2xs">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {event.title}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[9px] py-0 px-1.5 font-medium bg-slate-100 text-slate-600 shrink-0"
                            >
                              {event.recipient}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {event.description}
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!whatsappEnabled}
                            aria-label={`Toggle ${event.title}`}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {/* Payment Reminder Grace Period */}
              <div className="pt-4 border-t border-slate-200">
                <FormField
                  control={form.control}
                  name="payment_reminder_days"
                  render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>To-Pay Overdue Follow-up Grace Period</span>
                        </FormLabel>
                        <FormDescription className="text-[11px] text-slate-500">
                          Days after delivery before the automated payment reminder is sent.
                        </FormDescription>
                      </div>
                      <Select
                        value={String(field.value)}
                        onValueChange={(val) => {
                          if (val) {
                            field.onChange(parseInt(val, 10));
                          }
                        }}
                        disabled={!whatsappEnabled}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[190px] bg-white text-xs h-9">
                            <SelectValue placeholder="Select delay" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Day After Delivery</SelectItem>
                          <SelectItem value="3">3 Days (Recommended)</SelectItem>
                          <SelectItem value="7">7 Days After Delivery</SelectItem>
                          <SelectItem value="14">14 Days After Delivery</SelectItem>
                          <SelectItem value="30">30 Days After Delivery</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Bottom Save Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Event switches and webhook credentials apply immediately to live dispatches.</span>
            </div>

            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs px-6 h-10"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save WhatsApp Settings</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
