'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { randomBytes } from 'crypto';

type ActionResult = { ok: boolean; error?: string; token?: string };

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

function isValidDomain(domain: string): boolean {
  // Basic domain validation: sub.domain.tld or domain.tld
  const re = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  return re.test(domain);
}

// ============================================================
// ADD DOMAIN
// ============================================================
export async function addCustomDomain(rawDomain: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can manage custom domains' };
  }

  const domain = rawDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  if (!domain) return { ok: false, error: 'Domain required' };
  if (!isValidDomain(domain)) {
    return { ok: false, error: 'Invalid domain format. Example: projects.yourcompany.com' };
  }
  if (domain.endsWith('synlumexai.com') || domain.endsWith('vercel.app')) {
    return { ok: false, error: 'Cannot use Synlumex or Vercel domains' };
  }

  // Check uniqueness
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .ilike('custom_domain', domain)
    .neq('id', orgId)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: 'This domain is already in use by another workspace' };
  }

  // Generate verification token
  const token = `synlumex-verify-${randomBytes(16).toString('hex')}`;

  const { error } = await supabase
    .from('organizations')
    .update({
      custom_domain: domain,
      domain_verified: false,
      domain_verification_token: token,
      domain_verified_at: null,
      domain_configured_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.domain_added',
    entity: 'organizations',
    entity_id: orgId,
    payload: { domain },
  });

  revalidatePath('/settings/domains');
  return { ok: true, token };
}

// ============================================================
// VERIFY DOMAIN (placeholder — real check happens via Vercel API later)
// ============================================================
export async function verifyDomain(): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can verify domains' };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('custom_domain, domain_verification_token')
    .eq('id', orgId)
    .single();

  if (!org?.custom_domain) {
    return { ok: false, error: 'No domain configured' };
  }

  // TODO: replace with real DNS lookup + Vercel API check
  // For now, we simulate a successful verification
  // In production: fetch DNS TXT records for domain, compare with token

  const { error } = await supabase
    .from('organizations')
    .update({
      domain_verified: true,
      domain_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.domain_verified',
    entity: 'organizations',
    entity_id: orgId,
    payload: { domain: org.custom_domain },
  });

  revalidatePath('/settings/domains');
  return { ok: true };
}

// ============================================================
// REMOVE DOMAIN
// ============================================================
export async function removeCustomDomain(): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can remove domains' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      custom_domain: null,
      domain_verified: false,
      domain_verification_token: null,
      domain_verified_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.domain_removed',
    entity: 'organizations',
    entity_id: orgId,
    payload: {},
  });

  revalidatePath('/settings/domains');
  return { ok: true };
}
