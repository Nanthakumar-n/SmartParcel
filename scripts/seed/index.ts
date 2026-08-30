/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { Database } from '../../lib/types/supabase';
import { purgeTransactionalData } from './cleaner';
import {
  assignHubManagers,
  seedTenant,
  seedUsers,
  USER_ACCOUNTS,
} from './seeders/auth-users';
import { seedBookingRequests } from './seeders/bookings';
import { seedTripExpenses } from './seeders/expenses';
import { seedFleet } from './seeders/fleet';
import { seedHubs } from './seeders/hubs';
import { seedLorryReceipts } from './seeders/lrs';
import { seedTrips } from './seeders/trips';
import {
  colors,
  logError,
  logHeader,
  logInfo,
  logStep,
  logSuccess,
  printCredentialsTable,
  printSummaryTable,
  type EntitySummary,
} from './utils/logger';

// Load Supabase environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: {
    transport: WebSocket as unknown as typeof globalThis.WebSocket,
  },
});

interface SeedOptions {
  preset: 'full' | 'base' | 'ops';
  append: boolean;
  tenantSlug: string;
}

function parseArguments(): SeedOptions {
  const args = process.argv.slice(2);
  const options: SeedOptions = {
    preset: 'full',
    append: false,
    tenantSlug: 'patel-roadways',
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
${colors.bright}SmartParcel Database Seeder CLI${colors.reset}

${colors.yellow}Usage:${colors.reset}
  npx tsx scripts/seed/index.ts [options]
  npm run db:seed           (runs full preset with clean reset)
  npm run db:seed:base      (seeds only Tenant, Users, Hubs, Fleet)
  npm run db:seed:ops       (seeds active operational queues)
  npm run db:seed:append    (runs full seed without wiping existing records)

${colors.yellow}Options:${colors.reset}
  --preset=<full|base|ops>   Choose seeding preset (default: full)
  --append                   Do not purge previous transaction records
  --tenant=<slug>            Target tenant slug (default: patel-roadways)
  --help, -h                 Show this help manual
`);
      process.exit(0);
    }

    if (arg.startsWith('--preset=')) {
      const p = arg.split('=')[1]?.toLowerCase();
      if (p === 'full' || p === 'base' || p === 'ops') {
        options.preset = p;
      }
    }

    if (arg === '--append') {
      options.append = true;
    }

    if (arg.startsWith('--tenant=')) {
      const t = arg.split('=')[1];
      if (t) options.tenantSlug = t;
    }
  }

  return options;
}

async function main() {
  const options = parseArguments();
  logHeader(`Database Seeder [Preset: ${options.preset.toUpperCase()}]`);
  logInfo(`Connecting to Supabase at: ${SUPABASE_URL}`);
  logInfo(`Tenant Slug: ${options.tenantSlug} | Mode: ${options.append ? 'Append' : 'Clean Reset'}`);

  const summary: EntitySummary = {
    tenants: 0,
    users: 0,
    hubs: 0,
    drivers: 0,
    vehicles: 0,
    bookingRequests: 0,
    lorryReceipts: 0,
    trips: 0,
    proofOfDeliveries: 0,
    toPayCollections: 0,
    tripExpenses: 0,
    tripSettlements: 0,
  };

  try {
    const totalSteps = options.preset === 'base' ? 5 : 8;

    // STEP 1: Tenant
    logStep(1, totalSteps, 'Initializing Logistics Tenant...');
    const tenant = await seedTenant(supabase, options.tenantSlug);
    summary.tenants = 1;

    // STEP 2: Purge existing transactional data (if not --append)
    if (!options.append && options.preset !== 'base') {
      logStep(2, totalSteps, 'Resetting Tenant Transaction Data...');
      await purgeTransactionalData(supabase, tenant.id);
    } else {
      logStep(2, totalSteps, 'Skipping transaction data purge (--append or base preset).');
    }

    // STEP 3: Users & Auth Accounts
    logStep(3, totalSteps, 'Seeding Fleet Owner & Hub Manager Auth Users...');
    const userMap = await seedUsers(supabase, tenant.id);
    summary.users = userMap.size;

    // STEP 4: Hub Branches
    logStep(4, totalSteps, 'Seeding Hub Branches (MUM, DEL, BLR) & LR Sequences...');
    const hubMap = await seedHubs(supabase, tenant.id);
    summary.hubs = hubMap.size;

    // Hub Manager assignments
    await assignHubManagers(supabase, tenant.id, userMap, hubMap);

    // STEP 5: Fleet (Drivers & Vehicles)
    logStep(5, totalSteps, 'Seeding Vehicles & Drivers with Station Assignments...');
    const fleet = await seedFleet(supabase, tenant.id, hubMap);
    summary.drivers = fleet.drivers.size;
    summary.vehicles = fleet.vehicles.size;

    // If preset is BASE, we stop here
    if (options.preset === 'base') {
      logSuccess('Base infrastructure seeded successfully!');
      printCredentialsTable(
        USER_ACCOUNTS.map((u) => ({
          role: u.role === 'fleet_owner' ? 'Fleet Owner' : 'Hub Manager',
          name: u.name,
          email: u.email,
          hub: u.hubCode ?? 'ALL (Tenant)',
        }))
      );
      printSummaryTable(summary);
      return;
    }

    const fleetOwner = userMap.get('kishore@patelroadways.com')!;

    // STEP 6: Customer Online Bookings
    logStep(6, totalSteps, 'Seeding Customer Online Booking Requests...');
    const bookings = await seedBookingRequests(
      supabase,
      tenant.id,
      tenant.slug,
      hubMap
    );
    summary.bookingRequests = bookings.length;

    // STEP 7: Trips & LRs across lifecycle
    logStep(7, totalSteps, 'Seeding Trips, Dispatches & Lorry Receipts across Lifecycle...');
    const tripMap = await seedTrips(
      supabase,
      tenant.id,
      hubMap,
      fleet.vehicles,
      fleet.drivers,
      fleetOwner.id,
      options.preset
    );
    summary.trips = tripMap.size;

    const lrStats = await seedLorryReceipts(
      supabase,
      tenant.id,
      hubMap,
      tripMap,
      fleetOwner.id,
      options.preset
    );
    summary.lorryReceipts = lrStats.totalLRs;
    summary.proofOfDeliveries = lrStats.pods;
    summary.toPayCollections = lrStats.collections;

    // STEP 8: Phase 1.5 Driver Trip Expenses & Settlements
    logStep(8, totalSteps, 'Seeding Driver Trip Expense Ledgers & Settlements...');
    const expStats = await seedTripExpenses(
      supabase,
      tenant.id,
      tripMap,
      fleetOwner.id
    );
    summary.tripExpenses = expStats.totalExpenses;
    summary.tripSettlements = expStats.totalSettlements;

    // Print final tables
    console.log(`\n${colors.bright}${colors.green}🎉 Complete Dataset Seeding Finished Successfully!${colors.reset}`);

    printCredentialsTable(
      USER_ACCOUNTS.map((u) => ({
        role: u.role === 'fleet_owner' ? 'Fleet Owner' : 'Hub Manager',
        name: u.name,
        email: u.email,
        hub: u.hubCode ?? 'ALL (Tenant)',
      }))
    );

    printSummaryTable(summary);
  } catch (error) {
    logError('Seeding failed with error:', error);
    process.exit(1);
  }
}

main();
