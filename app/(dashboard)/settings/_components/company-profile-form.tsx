'use client';

import React, { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Building2,
  Save,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
  FileCheck2,
  MapPin,
  PhoneCall,
  Globe,
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
import { Badge } from '@/components/ui/badge';
import {
  companyProfileSchema,
  type CompanyProfileInput,
} from '@/lib/validations/tenant-settings';
import { updateCompanyProfileAction } from '../actions';
import type { TenantRow } from '@/lib/db/tenants';

interface CompanyProfileFormProps {
  tenant: TenantRow;
}

export function CompanyProfileForm({ tenant }: CompanyProfileFormProps) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const form = useForm<CompanyProfileInput>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      name: tenant.name || '',
      slug: tenant.slug || '',
      gstin: tenant.gstin || '',
      contact_phone: tenant.contact_phone || '',
      address_line1: tenant.address_line1 || '',
      city: tenant.city || '',
      state: tenant.state || '',
      pin_code: tenant.pin_code || '',
    },
  });

  const watchSlug = form.watch('slug') || tenant.slug;
  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${watchSlug}`
    : `https://smartparcel.in/book/${watchSlug}`;

  const handleCopyPortalUrl = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(portalUrl);
      setCopied(true);
      toast.success('Public booking portal link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onSubmit = (values: CompanyProfileInput) => {
    startTransition(async () => {
      try {
        const result = await updateCompanyProfileAction(values);

        if (!result.success) {
          Object.entries(result.error).forEach(([field, messages]) => {
            if (field === '_form') {
              toast.error(messages.join(', '));
            } else {
              form.setError(field as keyof CompanyProfileInput, {
                type: 'manual',
                message: messages.join(', '),
              });
            }
          });
          return;
        }

        toast.success('Company profile and public booking portal slug updated successfully');
        form.reset(values);
      } catch {
        toast.error('An unexpected error occurred while saving profile');
      }
    });
  };

  return (
    <div className="w-full space-y-8">
      {/* Top Banner Ribbon */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 border border-blue-200 text-blue-700 shadow-2xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Company Profile & Master Identity</span>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-semibold gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Verified Tenant</span>
              </Badge>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Manage organization details, customizable public booking URL, GSTIN tax identity, and support contact.
            </p>
          </div>
        </div>

        {/* Public Booking Portal Preview Box */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-2 sm:px-3 text-xs">
          <div className="space-y-0.5">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Globe className="h-3 w-3 text-blue-600" />
              <span>Live Customer Booking Portal</span>
            </div>
            <div className="font-mono text-xs text-blue-700 font-semibold truncate max-w-[210px]">
              /book/{watchSlug}
            </div>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <button
              type="button"
              onClick={handleCopyPortalUrl}
              className="p-1.5 hover:bg-slate-200/60 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
              title="Copy public booking portal URL"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            </button>
            <a
              href={`/book/${watchSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-md transition-colors"
              title="Open public booking portal in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Section 1: Business Identity & Editable Slug */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              <FileCheck2 className="h-4 w-4 text-blue-600" />
              <span>1. Business Identity & Public Portal Link</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-800">
                      Company / Organization Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Patel Roadways Logistics"
                        className="bg-white text-sm h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px] text-slate-500">
                      Official legal name printed at the header of all Lorry Receipts and waybill manifests.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Editable Public Booking Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                      <span>Public Booking Portal URL Slug <span className="text-red-500">*</span></span>
                      <span className="text-[10px] text-blue-600 font-normal">Editable custom slug</span>
                    </FormLabel>
                    <FormControl>
                      <div className="flex rounded-md shadow-2xs">
                        <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-100 text-slate-500 text-xs font-mono select-none">
                          smartparcel.in/book/
                        </span>
                        <Input
                          placeholder="patel-roadways"
                          className="rounded-l-none font-mono text-xs bg-white h-10"
                          {...field}
                          onChange={(e) => {
                            // Automatically sanitize input to lowercase alphanumeric + hyphens
                            const sanitized = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, '-')
                              .replace(/--+/g, '-');
                            field.onChange(sanitized);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormDescription className="text-[11px] text-slate-500">
                      Custom URL slug used by clients to access your online booking request portal.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section 2: Statutory & Support Contact */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              <PhoneCall className="h-4 w-4 text-indigo-600" />
              <span>2. Tax & Support Contact Information</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="gstin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-800">
                      GSTIN (Goods & Services Tax ID)
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="27ABCDE1234F1Z5"
                        maxLength={15}
                        className="font-mono uppercase bg-white text-sm h-10"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px] text-slate-500">
                      15-character statutory GST identification number printed on tax receipts.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-800">
                      Dispatch & Customer Support Phone <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="+91 98765 43210"
                        className="bg-white text-sm h-10 font-mono"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px] text-slate-500">
                      Primary helpline displayed on thermal print bills and WhatsApp message footers.
                    </FormDescription>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Section 3: Registered Head Office */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-100">
              <MapPin className="h-4 w-4 text-emerald-600" />
              <span>3. Registered Head Office & Operating Address</span>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-slate-800">
                      Address Line 1 <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Shop No. 12, Transport Nagar, APMC Market Yard"
                        className="bg-white text-sm h-10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-800">
                        City <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Mumbai" className="bg-white text-sm h-10" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-800">
                        State <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Maharashtra" className="bg-white text-sm h-10" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pin_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-800">
                        PIN Code <span className="text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="400703"
                          maxLength={6}
                          className="font-mono bg-white text-sm h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {form.formState.isDirty ? (
                <span className="text-amber-600 font-medium">● You have unsaved changes in your company profile.</span>
              ) : (
                <span>All company information is up to date.</span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs px-6 h-10"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Company Profile</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
