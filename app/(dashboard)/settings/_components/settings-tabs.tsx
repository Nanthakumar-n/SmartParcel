'use client';

import React, { useState } from 'react';
import { Building2, FileText, MessageSquare, History, Sparkles } from 'lucide-react';
import { CompanyProfileForm } from './company-profile-form';
import { LRSettingsForm } from './lr-settings-form';
import { WhatsAppSettingsForm } from './whatsapp-settings-form';
import { NotificationLogsSheet } from './notification-logs-sheet';
import type { TenantSettingsSummary } from '@/lib/services/tenant-settings';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SettingsTabsProps {
  summary: TenantSettingsSummary;
  defaultTab?: string;
}

export type SettingsTabKey = 'company' | 'waybills' | 'whatsapp' | 'logs';

export function SettingsTabs({ summary, defaultTab = 'company' }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabKey>(
    (defaultTab as SettingsTabKey) || 'company'
  );

  const tabs: {
    key: SettingsTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { key: 'company', label: 'Company Profile', icon: Building2 },
    { key: 'waybills', label: 'Waybill Defaults & T&C', icon: FileText },
    { key: 'whatsapp', label: 'WhatsApp / WATI Gateway', icon: MessageSquare },
    { key: 'logs', label: 'Dispatch & Delivery Logs', icon: History, count: summary.logs.length },
  ];

  return (
    <div className="w-full space-y-0">
      {/* Excel / Workbook Top Tab Strip */}
      <div className="bg-slate-100/90 border border-slate-200 border-b-0 rounded-t-xl px-3 pt-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 sm:gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-t-lg transition-all whitespace-nowrap border-t border-l border-r',
                  isActive
                    ? 'bg-white text-emerald-700 border-slate-200 shadow-xs relative -mb-[1px] z-10'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-200/60'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-emerald-600' : 'text-slate-400'
                  )}
                />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] px-1.5 py-0 font-mono font-medium rounded-full',
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Workbook Meta Ribbon */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 font-medium pb-1 pr-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Tenant: <strong className="text-slate-700">{summary.tenant.name}</strong></span>
        </div>
      </div>

      {/* Main Sheet Canvas — 100% Full Width */}
      <div className="bg-white border border-slate-200 rounded-b-xl p-5 sm:p-8 shadow-xs w-full">
        {activeTab === 'company' && <CompanyProfileForm tenant={summary.tenant} />}
        {activeTab === 'waybills' && (
          <LRSettingsForm
            settings={summary.settings}
            companyName={summary.tenant.name}
            contactPhone={summary.tenant.contact_phone || '+91 98765 43210'}
          />
        )}
        {activeTab === 'whatsapp' && (
          <WhatsAppSettingsForm
            settings={summary.settings}
            isTokenConfigured={summary.isTokenConfigured}
          />
        )}
        {activeTab === 'logs' && <NotificationLogsSheet logs={summary.logs} />}
      </div>
    </div>
  );
}
