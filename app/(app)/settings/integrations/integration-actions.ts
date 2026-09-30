'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getIntegrationById } from '@/lib/integrations/catalog';

type ActionResult = { ok: boolean; error?: string };

export async function requestIntegration(
  providerId: string,
  payload: { contactEmail?: string; notes?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const provider = getIntegrationById(providerId);
  if (!provider) return { ok: false, error: 'Unknown integration' };

  // Find user's org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return { ok: false, error: 'No organization found' };
  }

  // Check for existing pending request
  const { data: existing } = await supabase
    .from('integration_requests')
    .select('id')
    .eq('organization_id', membership.organization_id)
    .eq('provider_id', providerId)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing) {
    return { ok: false, error: 'You already requested this integration' };
  }

  const { error } = await supabase.from('integration_requests').insert({
    organization_id: membership.organization_id,
    provider_id: providerId,
    provider_name: provider.name,
    requested_by: user.id,
    contact_email: payload.contactEmail?.trim() || null,
    notes: payload.notes?.trim() || null,
    status: 'pending',
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/integrations');
  return { ok: true };
}

export async function cancelIntegrationRequest(
  requestId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('integration_requests')
    .delete()
    .eq('id', requestId)
    .eq('requested_by', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/integrations');
  return { ok: true };
}
