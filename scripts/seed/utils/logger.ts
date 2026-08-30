/* eslint-disable no-console */
/**
 * Terminal UI and summary logger for SmartParcel Seeder
 */

export const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m',
  bgBlue: '\x1b[44m',
};

export function logHeader(title: string) {
  console.log(`\n${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(` ${colors.bright}${colors.white}🚀  SmartParcel — ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════════════${colors.reset}\n`);
}

export function logStep(step: number, total: number, message: string) {
  console.log(`${colors.magenta}[${step}/${total}]${colors.reset} ${colors.bright}${message}${colors.reset}`);
}

export function logSuccess(message: string) {
  console.log(`  ${colors.green}✔${colors.reset} ${message}`);
}

export function logInfo(message: string) {
  console.log(`  ${colors.blue}ℹ${colors.reset} ${colors.gray}${message}${colors.reset}`);
}

export function logWarn(message: string) {
  console.log(`  ${colors.yellow}⚠${colors.reset} ${colors.yellow}${message}${colors.reset}`);
}

export function logError(message: string, error?: unknown) {
  console.error(`  ${colors.red}✖ ${message}${colors.reset}`, error ?? '');
}

export interface CredentialRow {
  role: string;
  name: string;
  email: string;
  hub: string;
  password?: string;
}

export function printCredentialsTable(users: CredentialRow[]) {
  console.log(`\n${colors.bright}${colors.yellow}┌───────────────────────── Quick Login Credentials ─────────────────────────┐${colors.reset}`);
  console.log(`${colors.dim}│ Default Password for all seeded users: Password123!                        │${colors.reset}`);
  console.log(`${colors.yellow}├───────────────────────┬──────────────────────────────────┬─────────────────┤${colors.reset}`);
  console.log(`${colors.bright}│ Role                  │ Email                            │ Assigned Hub    │${colors.reset}`);
  console.log(`${colors.yellow}├───────────────────────┼──────────────────────────────────┼─────────────────┤${colors.reset}`);

  for (const u of users) {
    const role = u.role.padEnd(21);
    const email = u.email.padEnd(32);
    const hub = u.hub.padEnd(15);
    console.log(`│ ${role} │ ${colors.cyan}${email}${colors.reset} │ ${colors.green}${hub}${colors.reset} │`);
  }

  console.log(`${colors.yellow}└───────────────────────┴──────────────────────────────────┴─────────────────┘${colors.reset}\n`);
}

export interface EntitySummary {
  tenants: number;
  users: number;
  hubs: number;
  drivers: number;
  vehicles: number;
  bookingRequests: number;
  lorryReceipts: number;
  trips: number;
  proofOfDeliveries: number;
  toPayCollections: number;
  tripExpenses: number;
  tripSettlements: number;
}

export function printSummaryTable(summary: EntitySummary) {
  console.log(`${colors.bright}${colors.green}┌──────────────────────── Database Seed Summary ────────────────────────────┐${colors.reset}`);
  console.log(`${colors.green}├──────────────────────────────────────┬─────────────────────────────────────┤${colors.reset}`);
  console.log(`${colors.bright}│ Entity                               │ Records Seeded                      │${colors.reset}`);
  console.log(`${colors.green}├──────────────────────────────────────┼─────────────────────────────────────┤${colors.reset}`);

  const rows: [string, number][] = [
    ['🏢 Tenants', summary.tenants],
    ['👤 Auth & App Users', summary.users],
    ['📍 Hub Branches', summary.hubs],
    ['🚚 Fleet Vehicles', summary.vehicles],
    ['👨‍✈️ Drivers', summary.drivers],
    ['📦 Customer Booking Requests', summary.bookingRequests],
    ['📋 Lorry Receipts (All States)', summary.lorryReceipts],
    ['🛣️ Trips & Dispatches', summary.trips],
    ['✅ Proof of Deliveries (POD)', summary.proofOfDeliveries],
    ['💰 To-Pay Collections', summary.toPayCollections],
    ['🧾 Trip Expenses (Ledger)', summary.tripExpenses],
    ['🤝 Trip Settlements', summary.tripSettlements],
  ];

  for (const [name, count] of rows) {
    const paddedName = name.padEnd(36);
    const paddedCount = String(count).padStart(35);
    console.log(`│ ${paddedName} │ ${colors.bright}${paddedCount}${colors.reset} │`);
  }

  console.log(`${colors.green}└──────────────────────────────────────┴─────────────────────────────────────┘${colors.reset}\n`);
}
