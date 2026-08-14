'use server';

import { createServerClient } from '@/lib/supabase/server';
import { logoutService } from '@/lib/services/auth';
import type { ActionResult } from '@/lib/types/action-result';
import { formError } from '@/lib/types/action-result';
import { revalidatePath } from 'next/cache';

export async function logoutAction(): Promise<ActionResult<void>> {
  try {
    const supabase = createServerClient();
    const result = await logoutService(supabase);

    if (result.success) {
      revalidatePath('/', 'layout');
    }
    return result;
  } catch {
    return formError('Failed to log out.');
  }
}
