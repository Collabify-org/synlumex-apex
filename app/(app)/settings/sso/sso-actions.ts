'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

async function getCallerContext(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, orgId: null, role: null };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  return {
    user,
    orgId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
}

export async function updateSsoConfig(payload: {
  sso_provider: string;
  sso_domain: string;
  sso_metadata_url: string;
  sso_entity_id: string;
  sso_acs_url: string;
  sso_certificate: string;
  sso_enabled: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only workspace owner can configure SSO' };
  }

  const validProviders = ['okta', 'azure', 'google', 'onelogin', 'ping', 'other'];
  if (!validProviders.includes(payload.sso_provider)) {
    return { ok: false, error: 'Invalid provider' };
  }

  // If enabling, require at minimum domain + certificate
  if (payload.sso_enabled) {
    if (!payload.sso_domain.trim()) {
      return { ok: false, error: 'Email domain is required to enable SSO' };
    }
    if (!payload.sso_certificate.trim() && !payload.sso_metadata_url.trim()) {
      return {
        ok: false,
        error: 'Either certificate or metadata URL is required to enable SSO',
      };
    }
  }

  const domain = payload.sso_domain.trim().toLowerCase().replace(/^@/, '');

  const { error } = await supabase
    .from('organizations')
    .update({
      sso_provider: payload.sso_provider,
      sso_domain: domain || null,
      sso_metadata_url: payload.sso_metadata_url.trim() || null,
      sso_entity_id: payload.sso_entity_id.trim() || null,
      sso_acs_url: payload.sso_acs_url.trim() || null,
      sso_certificate: payload.sso_certificate.trim() || null,
      sso_enabled: payload.sso_enabled,
      sso_configured_at: new Date().toISOString(),
      sso_configured_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.sso_updated',
    entity: 'organizations',
    entity_id: orgId,
    payload: {
      provider: payload.sso_provider,
      domain,
      enabled: payload.sso_enabled,
    },
  });

  revalidatePath('/settings/sso');
  return { ok: true };
}
