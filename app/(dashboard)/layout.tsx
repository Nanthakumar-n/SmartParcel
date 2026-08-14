import React from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getTenantById } from '@/lib/db/tenants';
import { getUserProfile } from '@/lib/db/users';
import { SessionProvider } from '@/components/providers/session-provider';
import { SidebarNav } from '@/components/shared/sidebar-nav';
import { UserNav } from '@/components/shared/user-nav';
import { Truck, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireRole(['fleet_owner', 'hub_manager']);
  } catch {
    redirect('/login');
  }

  const supabase = createServerClient();
  const [tenant, profile] = await Promise.all([
    getTenantById(supabase, session.tenantId),
    getUserProfile(supabase, session.id),
  ]);

  const extendedSession = {
    ...session,
    tenantName: tenant?.name || 'SmartParcel Logistics',
    tenantSlug: tenant?.slug || '',
    fullName: profile?.full_name || session.email,
  };

  return (
    <SessionProvider session={extendedSession}>
      <div className="min-h-screen bg-slate-50 flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-white shrink-0 z-20">
          {/* Logo / Tenant Brand Header */}
          <div className="h-16 flex items-center px-4 border-b gap-3 bg-white">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm text-slate-900 truncate leading-tight">
                {extendedSession.tenantName}
              </span>
              <span className="text-[11px] text-slate-400 font-medium truncate">
                SmartParcel Workspace
              </span>
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="flex-1 overflow-y-auto">
            <SidebarNav />
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header Navbar */}
          <header className="h-16 border-b bg-white px-4 sm:px-6 flex items-center justify-between sticky top-0 z-10 shadow-xs">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar Trigger */}
              <Sheet>
                <SheetTrigger
                  render={
                    <Button variant="ghost" size="icon" className="md:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  }
                />
                <SheetContent side="left" className="p-0 w-72">
                  <div className="h-16 flex items-center px-4 border-b gap-3">
                    <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-sm">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {extendedSession.tenantName}
                      </span>
                      <span className="text-[11px] text-slate-400">SmartParcel</span>
                    </div>
                  </div>
                  <SidebarNav />
                </SheetContent>
              </Sheet>

              {/* Breadcrumb / Section Header Info */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{extendedSession.tenantName}</span>
                <span>/</span>
                <span className="capitalize">{session.role === 'fleet_owner' ? 'Fleet Administration' : 'Hub Branch'}</span>
              </div>
            </div>

            {/* Right User Navigation */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {extendedSession.fullName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium capitalize">
                  {session.role === 'fleet_owner' ? 'Fleet Owner (Admin)' : 'Hub Manager'}
                </span>
              </div>
              <UserNav />
            </div>
          </header>

          {/* Page Content Container */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  );
}
