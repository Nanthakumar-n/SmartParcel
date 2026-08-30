import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../lib/types/supabase';
import { HUB_FIXTURES } from '../fixtures';
import { logSuccess } from '../utils/logger';

export async function seedHubs(
  supabase: SupabaseClient<Database>,
  tenantId: string
): Promise<Map<string, string>> {
  const hubCodeToId = new Map<string, string>();
  const currentYear = new Date().getFullYear();

  for (const fixture of HUB_FIXTURES) {
    const { data: existing } = await supabase
      .from('hubs')
      .select('id, hub_code')
      .eq('tenant_id', tenantId)
      .eq('hub_code', fixture.hub_code)
      .maybeSingle();

    let hubId: string;
    if (existing) {
      hubId = existing.id;
      // Update details to ensure clean fixture sync
      await supabase
        .from('hubs')
        .update({
          name: fixture.name,
          address_line1: fixture.address_line1,
          city: fixture.city,
          state: fixture.state,
          pin_code: fixture.pin_code,
          latitude: fixture.latitude,
          longitude: fixture.longitude,
          contact_phone: fixture.contact_phone,
          is_active: true,
        })
        .eq('id', hubId);
    } else {
      const { data: created, error } = await supabase
        .from('hubs')
        .insert({
          tenant_id: tenantId,
          hub_code: fixture.hub_code,
          name: fixture.name,
          address_line1: fixture.address_line1,
          city: fixture.city,
          state: fixture.state,
          pin_code: fixture.pin_code,
          latitude: fixture.latitude,
          longitude: fixture.longitude,
          contact_phone: fixture.contact_phone,
          is_active: true,
        })
        .select('id')
        .single();

      if (error || !created) {
        throw new Error(`Failed to create hub ${fixture.hub_code}: ${error?.message}`);
      }
      hubId = created.id;
    }

    // Initialize or upsert lr_sequences for the year
    await supabase.from('lr_sequences').upsert({
      hub_id: hubId,
      year: currentYear,
      last_seq: 100, // reserve 1-100 for seeds
    });

    hubCodeToId.set(fixture.hub_code, hubId);
  }

  logSuccess(`Seeded ${hubCodeToId.size} Hubs (MUM, DEL, BLR) with LR sequences initialized.`);
  return hubCodeToId;
}
