'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { randomBytes, createHash } from 'crypto';

type ActionResult = { ok: boolean; error?: string; fullKey?: string };

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

function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

// ============================================================
// CREATE API KEY
// ============================================================
export async function createApiKey(payload: {
  name: string;
  expiresInDays: number | null;
  scopes: string[];
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can create API keys' };
  }

  // Check Enterprise plan
  const { data: org } = await supabase
    .from('organizations')
    .select('plan_id, plans(api_access)')
    .eq('id', orgId)
    .single();

  const planFeatures = (org as any)?.plans?.api_access;
  if (!planFeatures) {
    return {
      ok: false,
      error: 'API access is an Enterprise feature. Upgrade to create API keys.',
    };
  }

  if (!payload.name.trim()) {
    return { ok: false, error: 'Key name is required' };
  }
  if (payload.name.length > 60) {
    return { ok: false, error: 'Key name too long (max 60 chars)' };
  }

  // Generate the key
  const random = randomBytes(24).toString('hex'); // 48 chars
  const fullKey = `sk_live_${random}`;
  const prefix = `sk_live_${random.slice(0, 8)}`;
  const keyHash = hashKey(fullKey);

  const expiresAt = payload.expiresInDays
    ? new Date(Date.now() + payload.expiresInDays * 86400000).toISOString()
    : null;

  const { error } = await supabase.from('api_keys').insert({
    organization_id: orgId,
    name: payload.name.trim(),
    key_prefix: prefix,
    key_hash: keyHash,
    created_by: user.id,
    expires_at: expiresAt,
    scopes: payload.scopes,
  });

  if (error) return { ok: false, error: error.message };

  // Audit
  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.api_key_created',
    entity: 'api_keys',
    entity_id: null,
    payload: { name: payload.name, prefix },
  });

  revalidatePath('/settings/api-keys');
  return { ok: true, fullKey };
}

// ============================================================
// REVOKE API KEY
// ============================================================
export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can revoke API keys' };
  }

  const { error } = await supabase
    .from('api_keys')
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', keyId)
    .eq('organization_id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.api_key_revoked',
    entity: 'api_keys',
    entity_id: keyId,
    payload: {},
  });

  revalidatePath('/settings/api-keys');
  return { ok: true };
}

// ============================================================
// DELETE API KEY (permanent)
// ============================================================
export async function deleteApiKey(keyId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only the workspace owner can permanently delete keys' };
  }

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId)
    .eq('organization_id', orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/api-keys');
  return { ok: true };
}
