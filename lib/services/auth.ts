import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { TenantRegisterInput, LoginInput } from '@/lib/validations/auth';
import type { ActionResult } from '@/lib/types/action-result';
import { actionSuccess, actionError, formError } from '@/lib/types/action-result';
import { getTenantBySlug, insertTenant } from '@/lib/db/tenants';
import { getUserProfile, insertUserProfile } from '@/lib/db/users';
import { normalizePhone } from '@/lib/utils/format-phone';
import { createAdminClient } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<Database, any, any>;

/**
 * Register a new Tenant with a Fleet Owner administrator account.
 */
export async function registerFleetOwnerService(
  userSupabase: AnySupabaseClient,
  input: TenantRegisterInput
): Promise<ActionResult<{ tenantSlug: string; userId: string }>> {
  const adminClient = createAdminClient();

  // 1. Check if slug is already taken
  const existingTenant = await getTenantBySlug(adminClient, input.slug);
  if (existingTenant) {
    return actionError('slug', 'This company URL slug is already taken. Please choose another.');
  }

  const normalizedPhone = normalizePhone(input.contactPhone);

  // 2. Create the tenant record using admin client (bypasses RLS for initial signup)
  let tenant;
  try {
    tenant = await insertTenant(adminClient, {
      name: input.companyName,
      slug: input.slug,
      gstin: input.gstin ? input.gstin.toUpperCase() : null,
      contact_phone: normalizedPhone,
      address_line1: input.addressLine1,
      city: input.city,
      state: input.state,
      pin_code: input.pinCode,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Database error';
    if (errorMsg.includes('tenants_slug_key') || errorMsg.includes('unique constraint')) {
      return actionError('slug', 'This company URL slug is already taken.');
    }
    return formError('Failed to create company profile. Please try again.');
  }

  if (!tenant) {
    return formError('Failed to initialize company profile.');
  }

  // 3. Create user in Supabase Auth via Admin API
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true, // auto-confirm in local / staging
    user_metadata: {
      full_name: input.fullName,
      phone: normalizedPhone,
      user_role: 'fleet_owner',
      tenant_id: tenant.id,
    },
    app_metadata: {
      user_role: 'fleet_owner',
      tenant_id: tenant.id,
    },
  });

  if (authError || !authUser.user) {
    return formError(authError?.message || 'Failed to create user account.');
  }

  // 4. Create the profile in public.users using admin client
  try {
    await insertUserProfile(adminClient, {
      id: authUser.user.id,
      email: input.email,
      phone: normalizedPhone,
      full_name: input.fullName,
      user_role: 'fleet_owner',
      tenant_id: tenant.id,
      is_active: true,
    });
  } catch {
    const existing = await getUserProfile(adminClient, authUser.user.id);
    if (!existing) {
      return formError('Account created but failed to link profile. Please contact support.');
    }
  }

  // 5. Sign in the user session via user's SSR client so session cookie is set
  const { error: signInError } = await userSupabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (signInError) {
    // If sign in fails, user account was still created, they can log in via /login
  }

  return actionSuccess({
    tenantSlug: tenant.slug,
    userId: authUser.user.id,
  });
}

/**
 * Log in an existing user with email and password.
 */
export async function loginService(
  supabase: AnySupabaseClient,
  input: LoginInput
): Promise<ActionResult<{ userId: string; role: string; tenantId: string }>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return formError('Invalid email or password. Please check your credentials.');
  }

  // Check user profile for role
  const profile = await getUserProfile(supabase, data.user.id);
  const role = profile?.user_role || (data.user.app_metadata?.user_role as string) || 'fleet_owner';
  const tenantId = profile?.tenant_id || (data.user.app_metadata?.tenant_id as string) || '';

  if (role === 'driver') {
    await supabase.auth.signOut();
    return formError('Driver accounts cannot log in to the web admin. Please use the mobile app.');
  }

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return formError('Your account has been deactivated. Please contact your company administrator.');
  }

  return actionSuccess({
    userId: data.user.id,
    role,
    tenantId,
  });
}

/**
 * Log out current session.
 */
export async function logoutService(
  supabase: AnySupabaseClient
): Promise<ActionResult<void>> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return formError('Failed to sign out cleanly.');
  }
  return actionSuccess(undefined);
}
