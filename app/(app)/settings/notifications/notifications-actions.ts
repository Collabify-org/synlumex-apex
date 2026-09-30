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
// UPDATE ORG-LEVEL NOTIFICATION PREFERENCES
// ============================================================
export async function updateOrgNotifications(payload: {
  notif_trial_ending: boolean;
  notif_project_red: boolean;
  notif_inactive_user: boolean;
  notif_weekly_digest: boolean;
  notif_exception_created: boolean;
  notif_reminder_due: boolean;
  notif_collection_overdue: boolean;
  notif_digest_day: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can change workspace notifications' };
  }

  const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  if (!validDays.includes(payload.notif_digest_day)) {
    return { ok: false, error: 'Invalid digest day' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      notif_trial_ending: payload.notif_trial_ending,
      notif_project_red: payload.notif_project_red,
      notif_inactive_user: payload.notif_inactive_user,
      notif_weekly_digest: payload.notif_weekly_digest,
      notif_exception_created: payload.notif_exception_created,
      notif_reminder_due: payload.notif_reminder_due,
      notif_collection_overdue: payload.notif_collection_overdue,
      notif_digest_day: payload.notif_digest_day,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.notifications_updated',
    entity: 'organizations',
    entity_id: orgId,
    payload,
  });

  revalidatePath('/settings/notifications');
  return { ok: true };
}

// ============================================================
// UPDATE PER-USER OVERRIDES (mute, critical-only, etc.)
// ============================================================
export async function updateUserNotifications(payload: {
  mute_all: boolean;
  critical_only: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      notif_opt_out: {
        mute_all: payload.mute_all,
        critical_only: payload.critical_only,
      },
    })
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/notifications');
  return { ok: true };
}
