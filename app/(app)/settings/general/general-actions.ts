'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

export async function updateGeneralSettings(payload: {
  name: string;
  timezone: string;
  currency: string;
  website?: string;
  address?: string;
  logo_url?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Get user's org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return { ok: false, error: 'No organization found' };
  }

  // Only owners/admins can update
  if (!['owner', 'admin'].includes(membership.role ?? '')) {
    return { ok: false, error: 'Only owners and admins can update workspace settings' };
  }

  // Validate
  if (!payload.name?.trim()) {
    return { ok: false, error: 'Workspace name is required' };
  }
  if (payload.name.length > 80) {
    return { ok: false, error: 'Workspace name too long (max 80 chars)' };
  }
  if (!['INR', 'USD', 'SAR'].includes(payload.currency)) {
    return { ok: false, error: 'Invalid currency' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      name: payload.name.trim(),
      timezone: payload.timezone,
      currency: payload.currency,
      website: payload.website?.trim() || null,
      address: payload.address?.trim() || null,
      logo_url: payload.logo_url?.trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', membership.organization_id);

  if (error) return { ok: false, error: error.message };

  // Audit log
  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.general_updated',
    entity: 'organizations',
    entity_id: membership.organization_id,
    payload: {
      name: payload.name,
      timezone: payload.timezone,
      currency: payload.currency,
    },
  });

  revalidatePath('/settings/general');
  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true };
}
