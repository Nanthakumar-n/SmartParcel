import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getUsersByTenant } from '@/lib/db/users';
import { getHubsByTenant } from '@/lib/db/hubs';
import { Users, Building2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserTable } from './_components/user-table';
import { UserDialog } from './_components/user-dialog';

export const metadata: Metadata = {
  title: 'User Management | SmartParcel',
  description: 'Manage fleet managers, hub assignments, and organization access control.',
};

export default async function UsersPage() {
  await requireRole(['fleet_owner']);
  const supabase = createServerClient();

  const [users, hubsResult] = await Promise.all([
    getUsersByTenant(supabase),
    getHubsByTenant(supabase, { pageSize: 100 }),
  ]);

  const hubs = hubsResult.data;

  const totalUsers = users.length;
  const hubManagers = users.filter((u) => u.user_role === 'hub_manager').length;
  const fleetOwners = users.filter((u) => u.user_role === 'fleet_owner').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Invite and manage Hub Managers, assign branch locations, and control operational permissions.
          </p>
        </div>
        <UserDialog hubs={hubs} />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Team Members
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
            <p className="text-xs text-slate-500 mt-1">Active users in organization</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Hub Managers
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{hubManagers}</div>
            <p className="text-xs text-slate-500 mt-1">Branch and booking operators</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fleet Owners
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{fleetOwners}</div>
            <p className="text-xs text-slate-500 mt-1">Full administrative administrators</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <UserTable initialUsers={users} hubs={hubs} />
    </div>
  );
}
