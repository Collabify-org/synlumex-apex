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

// ============================================================
// UPDATE SECURITY SETTINGS
// ============================================================
export async function updateSecuritySettings(payload: {
  enforce_mfa: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  require_password_uppercase: boolean;
  require_password_number: boolean;
  require_password_symbol: boolean;
  password_expiry_days: number;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can change security settings' };
  }

  if (payload.password_min_length < 8 || payload.password_min_length > 24) {
    return { ok: false, error: 'Password length must be 8–24' };
  }

  const validTimeouts = [60, 1440, 10080, 43200, 0];
  if (!validTimeouts.includes(payload.session_timeout_minutes)) {
    return { ok: false, error: 'Invalid session timeout' };
  }

  const validExpiry = [0, 30, 60, 90, 180];
  if (!validExpiry.includes(payload.password_expiry_days)) {
    return { ok: false, error: 'Invalid password expiry' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      enforce_mfa: payload.enforce_mfa,
      session_timeout_minutes: payload.session_timeout_minutes,
      password_min_length: payload.password_min_length,
      require_password_uppercase: payload.require_password_uppercase,
      require_password_number: payload.require_password_number,
      require_password_symbol: payload.require_password_symbol,
      password_expiry_days: payload.password_expiry_days,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.security_updated',
    entity: 'organizations',
    entity_id: orgId,
    payload,
  });

  revalidatePath('/settings/security');
  return { ok: true };
}

// ============================================================
// SIGN OUT OTHER SESSIONS
// ============================================================
export async function signOutOtherSessions(): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut({ scope: 'others' });

  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
