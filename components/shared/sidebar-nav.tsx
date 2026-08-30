'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/components/providers/session-provider';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Truck,
  PlusCircle,
  Building2,
  Users,
  Inbox,
  UserCheck,
  CalendarDays,
  ExternalLink,
  Receipt,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  fleetOwnerOnly?: boolean;
}

export function SidebarNav() {
  const pathname = usePathname();
  const session = useSession();
  const isFleetOwner = session.role === 'fleet_owner';

  const mainNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Lorry Receipts (LR)',
      href: '/lorry-receipts',
      icon: FileText,
    },
    {
      title: 'Trip Dispatches',
      href: '/trip-dispatches',
      icon: Truck,
    },
    {
      title: 'Trip Expenses',
      href: '/trip-expenses',
      icon: Receipt,
    },
    {
      title: 'Booking Requests',
      href: '/booking-requests',
      icon: Inbox,
    },
  ];

  const fleetNavItems: NavItem[] = [
    {
      title: 'Hub Branches',
      href: '/hubs',
      icon: Building2,
      fleetOwnerOnly: true,
    },
    {
      title: 'Truck Registry',
      href: '/vehicles',
      icon: Truck,
      fleetOwnerOnly: true,
    },
    {
      title: 'Drivers',
      href: '/drivers',
      icon: UserCheck,
      fleetOwnerOnly: true,
    },
    {
      title: 'Trip Schedules',
      href: '/trip-schedules',
      icon: CalendarDays,
      fleetOwnerOnly: true,
    },
    {
      title: 'User Management',
      href: '/users',
      icon: Users,
      fleetOwnerOnly: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Quick Action Button for Hub Managers & Fleet Owners */}
      <div className="px-3">
        <Link
          href="/lorry-receipts/new"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-primary text-primary-foreground font-semibold text-xs rounded-md shadow-sm hover:bg-primary/90 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Lorry Receipt (F2)</span>
        </Link>
      </div>

      {/* Operations Group */}
      <div className="space-y-1 px-3">
        <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Operations
        </p>
        <nav className="space-y-1">
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Administration Group (Fleet Owner Only) */}
      {isFleetOwner && (
        <div className="space-y-1 px-3">
          <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Fleet Administration
          </p>
          <nav className="space-y-1">
            {fleetNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')} />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Customer Booking Portal Link */}
      {session.tenantSlug && (
        <div className="mt-auto px-3 pt-4 border-t border-slate-200">
          <a
            href={`/book/${session.tenantSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 hover:bg-slate-100 transition-colors group"
          >
            <div className="flex flex-col truncate">
              <span className="font-semibold text-slate-900 truncate">Customer Portal</span>
              <span className="text-[10px] text-slate-500 truncate">/book/{session.tenantSlug}</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
          </a>
        </div>
      )}
    </div>
  );
}
