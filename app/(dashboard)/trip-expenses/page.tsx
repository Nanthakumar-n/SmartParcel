import React from 'react';
import { Metadata } from 'next';
import { requireRole } from '@/lib/auth/session';
import { createServerClient } from '@/lib/supabase/server';
import { getTripsWithExpenseLedgerByTenant } from '@/lib/db/trip-expenses';
import { ExpenseLedgerTable } from './_components/expense-ledger-table';
import { Badge } from '@/components/ui/badge';
import { Receipt } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Trip Expenses & Advances | SmartParcel Logistics',
  description: 'Manage driver trip advances, road expenses, and trip settlements.',
};

interface TripExpensesPageProps {
  searchParams?: {
    search?: string;
    hub?: string;
    settled?: 'all' | 'unsettled' | 'settled';
  };
}

export default async function TripExpensesPage({ searchParams }: TripExpensesPageProps) {
  const session = await requireRole(['fleet_owner', 'hub_manager']);
  const supabase = createServerClient();

  const search = searchParams?.search || '';
  const hubId = searchParams?.hub || 'ALL';
  const settledFilter = searchParams?.settled || 'all';

  const trips = await getTripsWithExpenseLedgerByTenant(supabase, {
    search,
    hubId,
    settledFilter,
  });

  const isFleetOwner = session.role === 'fleet_owner';

  // Overall metric counts across all trips
  const unsettledTrips = trips.filter((t) => !t.isSettled && t.expenses.length > 0);
  const settledTrips = trips.filter((t) => t.isSettled);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Driver Trip Expense Ledger
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Track driver cash advances, road expenses (fuel, tolls, bhatta), and finalize trip settlements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs bg-slate-50 text-slate-700 font-semibold px-2.5 py-1"
          >
            {unsettledTrips.length} Unsettled Trips
          </Badge>
          <Badge
            variant="outline"
            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold px-2.5 py-1"
          >
            {settledTrips.length} Settled
          </Badge>
        </div>
      </div>

      {/* Main Ledger Table with Trip Switcher */}
      <ExpenseLedgerTable
        trips={trips}
        isFleetOwner={isFleetOwner}
        userId={session.id}
      />
    </div>
  );
}
