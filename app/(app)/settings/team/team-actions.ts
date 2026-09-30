'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
// CREATE USER — direct creation like admin panel
// ============================================================
export async function createTeamMember(payload: {
  email: string;
  password: string;
  fullName: string;
  role: 'owner' | 'admin' | 'member';
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can add team members' };
  }

  const email = payload.email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Valid email required' };
  }
  if (payload.password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }

  // Check plan user cap
  const { data: org } = await supabase
    .from('organizations')
    .select('plan_id')
    .eq('id', orgId)
    .single();

  const { data: plan } = await supabase
    .from('plans')
    .select('name, max_users')
    .eq('id', org?.plan_id ?? '')
    .single();

  if (plan?.max_users !== null && plan?.max_users !== undefined) {
    const { count: userCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    if ((userCount ?? 0) >= plan.max_users) {
      return {
        ok: false,
        error: `This workspace has reached its ${plan.name} plan limit of ${plan.max_users} team members. Upgrade to add more.`,
      };
    }
  }

  // Check if user already exists in the org
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', orgId)
      .eq('user_id', existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      return { ok: false, error: 'This user is already a member of this workspace' };
    }
  }

  // Use service role to create the user
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Create auth user (or use existing if profile found)
  let userId: string | null = null;

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      return { ok: false, error: authError?.message ?? 'Failed to create user' };
    }

    userId = authUser.user.id;

    // Create profile
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email,
      full_name: payload.fullName.trim() || email.split('@')[0],
      role: 'member',
      is_super_admin: false,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: `Profile creation failed: ${profileError.message}` };
    }
  }

  // Add to org
  const { error: memberError } = await admin.from('organization_members').insert({
    organization_id: orgId,
    user_id: userId,
    role: payload.role,
    invited_by: user.id,
  });

  if (memberError) {
    if (!existingProfile) await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: `Failed to add to workspace: ${memberError.message}` };
  }

  // Log audit
  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'member.added',
    entity: 'organization_members',
    entity_id: userId,
    payload: { email, role: payload.role },
  });

  revalidatePath('/settings/team');
  revalidatePath('/settings');
  return { ok: true };
}

// ============================================================
// CHANGE ROLE
// ============================================================
export async function changeMemberRole(
  memberId: string,
  newRole: 'owner' | 'admin' | 'member'
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only workspace owner can change roles' };
  }

  const { data: target } = await supabase
    .from('organization_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single();

  if (!target) return { ok: false, error: 'Member not found' };
  if (target.user_id === user.id) {
    return { ok: false, error: 'You cannot change your own role' };
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'member.role_changed',
    entity: 'organization_members',
    entity_id: target.user_id,
    payload: { old_role: target.role, new_role: newRole },
  });

  revalidatePath('/settings/team');
  return { ok: true };
}

// ============================================================
// REMOVE MEMBER
// ============================================================
export async function removeMember(memberId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can remove members' };
  }

  const { data: target } = await supabase
    .from('organization_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('organization_id', orgId)
    .single();

  if (!target) return { ok: false, error: 'Member not found' };
  if (target.user_id === user.id) {
    return { ok: false, error: 'You cannot remove yourself' };
  }
  if (target.role === 'owner' && role !== 'owner') {
    return { ok: false, error: 'Only the owner can remove another owner' };
  }

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'member.removed',
    entity: 'organization_members',
    entity_id: target.user_id,
    payload: { role: target.role },
  });

  revalidatePath('/settings/team');
  return { ok: true };
}

// ============================================================
// CANCEL INVITATION
// ============================================================
export async function cancelInvitation(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can cancel invitations' };
  }

  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', invitationId)
    .eq('organization_id', orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings/team');
  return { ok: true };
}
