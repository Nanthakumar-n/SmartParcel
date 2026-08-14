import { createServerClient } from '@/lib/supabase/server';

export type UserRole = 'fleet_owner' | 'hub_manager' | 'driver';

export interface UserSession {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

/**
 * Get the current authenticated user session from Supabase.
 * Returns null if the user is not authenticated.
 */
export async function getSession(): Promise<UserSession | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email ?? '',
    role: (user.app_metadata?.user_role as UserRole) ?? 'fleet_owner',
    tenantId: user.app_metadata?.tenant_id as string,
  };
}

/**
 * Require an authenticated user with one of the specified roles.
 * Throws 'UNAUTHENTICATED' if no session exists.
 * Throws 'FORBIDDEN' if user's role is not in the allowed list.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<UserSession> {
  const session = await getSession();
  if (!session) throw new Error('UNAUTHENTICATED');
  if (!allowedRoles.includes(session.role)) throw new Error('FORBIDDEN');
  return session;
}

/**
 * Get the hub IDs assigned to the current user.
 * Fleet Owners are not scoped to specific hubs (returns empty array).
 */
export async function getUserHubIds(userId: string): Promise<string[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('user_hub_assignments')
    .select('hub_id')
    .eq('user_id', userId);

  if (!data) return [];
  return data.map((row: { hub_id: string }) => row.hub_id);
}
