import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { logInfo, logSuccess } from '../utils/logger';

export interface SeededTenant {
  id: string;
  slug: string;
  name: string;
}

export interface SeededUser {
  id: string;
  email: string;
  role: 'fleet_owner' | 'hub_manager';
  name: string;
  phone: string;
  hubCode?: string;
}

export const USER_ACCOUNTS: Array<{
  email: string;
  name: string;
  phone: string;
  role: 'fleet_owner' | 'hub_manager';
  hubCode?: string;
}> = [
  {
    email: 'kishore@patelroadways.com',
    name: 'Kishore Patel',
    phone: '+919876543210',
    role: 'fleet_owner',
  },
  {
    email: 'mum.manager@patelroadways.com',
    name: 'Manoj Sharma (Mumbai Hub)',
    phone: '+919876543215',
    role: 'hub_manager',
    hubCode: 'MUM',
  },
  {
    email: 'del.manager@patelroadways.com',
    name: 'Deepak Gupta (Delhi Hub)',
    phone: '+919876543216',
    role: 'hub_manager',
    hubCode: 'DEL',
  },
  {
    email: 'blr.manager@patelroadways.com',
    name: 'Anand Rao (Bangalore Hub)',
    phone: '+919876543217',
    role: 'hub_manager',
    hubCode: 'BLR',
  },
];

export async function seedTenant(
  supabase: SupabaseClient<Database>,
  tenantSlug = 'patel-roadways'
): Promise<SeededTenant> {
  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('slug', tenantSlug)
    .maybeSingle();

  if (existingTenant) {
    logInfo(`Using existing tenant: ${existingTenant.name} (${existingTenant.slug})`);
    return existingTenant;
  }

  const { data: newTenant, error } = await supabase
    .from('tenants')
    .insert({
      name: 'Patel Roadways',
      slug: tenantSlug,
      contact_phone: '+919876543210',
      address_line1: '10 Transport Nagar, Bhiwandi',
      city: 'Mumbai',
      state: 'Maharashtra',
      pin_code: '400001',
      gstin: '27AAACP1234F1Z5',
    })
    .select('id, name, slug')
    .single();

  if (error || !newTenant) {
    throw new Error(`Failed to create tenant: ${error?.message}`);
  }

  logSuccess(`Created tenant: ${newTenant.name} (${newTenant.id})`);
  return newTenant;
}

export async function seedUsers(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Map<string, SeededUser>> {
  const userMap = new Map<string, SeededUser>();
  const defaultPassword = 'Password123!';

  const { data: userList } = await supabase.auth.admin.listUsers();
  const existingUsers = userList?.users ?? [];

  for (const account of USER_ACCOUNTS) {
    const existing = existingUsers.find((u) => u.email === account.email);
    let userId: string;

    const metadata = {
      full_name: account.name,
      phone: account.phone,
      user_role: account.role,
      tenant_id: tenantId,
    };

    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: defaultPassword,
        user_metadata: metadata,
        app_metadata: {
          user_role: account.role,
          tenant_id: tenantId,
        },
      });
    } else {
      const { data: created, error } = await supabase.auth.admin.createUser({
        email: account.email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: metadata,
        app_metadata: {
          user_role: account.role,
          tenant_id: tenantId,
        },
      });

      if (error || !created.user) {
        throw new Error(`Failed to create auth user ${account.email}: ${error?.message}`);
      }
      userId = created.user.id;
    }

    // Upsert into public.users
    const { error: upsertErr } = await supabase.from('users').upsert({
      id: userId,
      email: account.email,
      phone: account.phone,
      full_name: account.name,
      user_role: account.role,
      tenant_id: tenantId,
      is_active: true,
    });

    if (upsertErr) {
      throw new Error(`Failed to upsert public.users for ${account.email}: ${upsertErr.message}`);
    }

    userMap.set(account.email, {
      id: userId,
      email: account.email,
      role: account.role,
      name: account.name,
      phone: account.phone,
      hubCode: account.hubCode,
    });
  }

  logSuccess(`Seeded ${userMap.size} user accounts (1 Fleet Owner, 3 Hub Managers).`);
  return userMap;
}

export async function assignHubManagers(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  userMap: Map<string, SeededUser>,
  hubMap: Map<string, string> // hub_code -> hub_id
) {
  // Clear previous assignments for this tenant
  await supabase.from('user_hub_assignments').delete().eq('tenant_id', tenantId);

  const assignments: Array<{ user_id: string; hub_id: string; tenant_id: string }> = [];

  for (const user of Array.from(userMap.values())) {
    if (user.role === 'hub_manager' && user.hubCode) {
      const hubId = hubMap.get(user.hubCode);
      if (hubId) {
        assignments.push({
          user_id: user.id,
          hub_id: hubId,
          tenant_id: tenantId,
        });
      }
    }
  }

  if (assignments.length > 0) {
    const { error } = await supabase.from('user_hub_assignments').insert(assignments);
    if (error) {
      throw new Error(`Failed to assign hub managers: ${error.message}`);
    }
    logSuccess(`Assigned ${assignments.length} Hub Managers to their respective hub branches.`);
  }
}
