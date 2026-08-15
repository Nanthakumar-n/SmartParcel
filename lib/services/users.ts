import { createAdminClient } from '@/lib/supabase/admin';
import { createServerClient } from '@/lib/supabase/server';
import { normalizePhone } from '@/lib/utils/format-phone';
import {
  insertUserProfile,
  updateUserRecord,
  setUserHubAssignments,
} from '@/lib/db/users';
import type { InviteUserInput, UpdateUserInput } from '@/lib/validations/user';
import type { UserSession } from '@/lib/auth/session';
import {
  type ActionResult,
  actionSuccess,
  actionError,
  formError,
} from '@/lib/types/action-result';

export async function inviteUserService(
  input: InviteUserInput,
  session: UserSession
): Promise<ActionResult<{ id: string; email: string }>> {
  const adminClient = createAdminClient();
  const supabase = createServerClient();

  const cleanPhone = normalizePhone(input.phone);
  const cleanEmail = input.email.toLowerCase().trim();

  // 1. Create user in Supabase Auth via Admin Client
  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password: input.password || 'SmartParcel@123',
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name.trim(),
        user_role: input.user_role,
        tenant_id: session.tenantId,
      },
      app_metadata: {
        user_role: input.user_role,
        tenant_id: session.tenantId,
      },
    });

  if (authError || !authData.user) {
    if (authError?.message.includes('already registered')) {
      return actionError('email', 'A user with this email address already exists');
    }
    return formError(authError?.message || 'Failed to create user account');
  }

  const newUserId = authData.user.id;

  try {
    // 2. Insert into public.users table
    await insertUserProfile(supabase, {
      id: newUserId,
      email: cleanEmail,
      phone: cleanPhone,
      full_name: input.full_name.trim(),
      user_role: input.user_role,
      tenant_id: session.tenantId,
      is_active: input.is_active,
    });

    // 3. Insert Hub assignments if Hub Manager
    if (input.user_role === 'hub_manager' && input.assigned_hub_ids.length > 0) {
      await setUserHubAssignments(
        supabase,
        newUserId,
        session.tenantId,
        input.assigned_hub_ids
      );
    }

    return actionSuccess({ id: newUserId, email: cleanEmail });
  } catch (error: unknown) {
    // Rollback auth user if profile insertion failed
    await adminClient.auth.admin.deleteUser(newUserId);
    throw error;
  }
}

export async function updateUserService(
  userId: string,
  input: UpdateUserInput,
  session: UserSession
): Promise<ActionResult<{ id: string }>> {
  const adminClient = createAdminClient();
  const supabase = createServerClient();

  const cleanPhone = normalizePhone(input.phone);

  // 1. Update public.users
  await updateUserRecord(supabase, userId, {
    full_name: input.full_name.trim(),
    phone: cleanPhone,
    user_role: input.user_role,
    is_active: input.is_active,
  });

  // 2. Sync hub assignments
  const hubIds = input.user_role === 'hub_manager' ? input.assigned_hub_ids : [];
  await setUserHubAssignments(supabase, userId, session.tenantId, hubIds);

  // 3. Update Supabase Auth app_metadata if role changed
  await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: input.full_name.trim(),
      user_role: input.user_role,
    },
    app_metadata: {
      user_role: input.user_role,
      tenant_id: session.tenantId,
    },
  });

  return actionSuccess({ id: userId });
}
