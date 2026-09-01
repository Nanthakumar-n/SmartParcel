'use client';

import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  TrendingUp,
  Building2,
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type FinancialsTabId = 'fleet-pl' | 'hub-pl' | 'trip-pl';

interface TabItem {
  id: FinancialsTabId;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  count?: number;
}

interface FinancialsTabsProps {
  activeTab: FinancialsTabId;
  hubCount: number;
  tripCount: number;
  children: React.ReactNode;
}

export function FinancialsTabs({
  activeTab,
  hubCount,
  tripCount,
  children,
}: FinancialsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (tabId: FinancialsTabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const tabs: TabItem[] = [
    {
      id: 'fleet-pl',
      label: 'Fleet Executive Summary',
      sublabel: 'Consolidated Revenue & Margin',
      icon: TrendingUp,
    },
    {
      id: 'hub-pl',
      label: 'Hub Branch P&L',
      sublabel: 'Branch Performance & Receivables',
      icon: Building2,
      count: hubCount,
    },
    {
      id: 'trip-pl',
      label: 'Trip Consignment P&L',
      sublabel: 'Route Profitability & Direct Costs',
      icon: Truck,
      count: tripCount,
    },
  ];

  return (
    <div className="w-full space-y-0">
      {/* Excel Workbook Sheet Tab Bar */}
      <div className="bg-slate-100/90 border border-b-0 border-slate-300/80 rounded-t-xl px-2 pt-2 flex items-center justify-between gap-2 overflow-x-auto shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-t-lg text-xs font-semibold transition-all border-t-2 select-none relative',
                  isActive
                    ? 'bg-white text-blue-700 border-t-blue-600 border-x border-slate-300/80 shadow-xs z-10'
                    : 'bg-transparent text-slate-600 border-t-transparent hover:bg-slate-200/60 hover:text-slate-900'
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-400'
                  )}
                />
                <span className="whitespace-nowrap">{tab.label}</span>
                {typeof tab.count === 'number' && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0 h-4 min-w-4 flex items-center justify-center rounded-full',
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-600'
                    )}
                  >
                    {tab.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sheet Canvas Container */}
      <div className="w-full bg-white border border-slate-300/80 rounded-b-xl p-4 sm:p-6 shadow-xs focus-visible:outline-none">
        {children}
      </div>
    </div>
  );
}
