import React from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Building2, ExternalLink } from 'lucide-react';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getTenantSettingsSummaryService } from '@/lib/services/tenant-settings';
import { SettingsTabs } from './_components/settings-tabs';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Tenant Settings & Integrations | SmartParcel Logistics',
  description: 'Manage company profile, waybill defaults, and WhatsApp Business WATI notification parameters.',
};

interface SettingsPageProps {
  searchParams?: {
    tab?: string;
  };
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await requireRole(['fleet_owner']);
  if (!session || !session.tenantId) {
    redirect('/dashboard');
  }

  const supabase = createServerClient();
  const summary = await getTenantSettingsSummaryService(supabase, session.tenantId);

  if (!summary) {
    notFound();
  }

  const defaultTab = searchParams?.tab || 'company';

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Tenant Settings & Integrations
            </h1>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold">
              Fleet Owner
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Configure company branding, legal terms on waybills, and WhatsApp notifications via WATI.
          </p>
        </div>

        {/* Company Quick Badge / Public Portal Link */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium text-slate-700">
            <Building2 className="h-4 w-4 text-slate-500" />
            <span className="font-semibold text-slate-900">{summary.tenant.name}</span>
            <span className="text-slate-400">({summary.tenant.slug})</span>
          </div>

          <a
            href={`/book/${summary.tenant.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-blue-600 shadow-2xs transition-colors"
          >
            <span>Customer Portal</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Main Settings Tabs */}
      <SettingsTabs summary={summary} defaultTab={defaultTab} />
    </div>
  );
}
