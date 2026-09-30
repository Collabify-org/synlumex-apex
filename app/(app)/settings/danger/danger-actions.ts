'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string; data?: any };

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
// EXPORT ALL WORKSPACE DATA
// ============================================================
export async function exportWorkspaceData(): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') return { ok: false, error: 'Only the owner can export data' };

  // Fetch everything
  const [projects, exceptions, reminders, billing, collections, boqItems, members] =
    await Promise.all([
      supabase.from('projects').select('*').eq('organization_id', orgId),
      supabase.from('exceptions').select('*').eq('organization_id', orgId),
      supabase.from('reminders').select('*').eq('organization_id', orgId),
      supabase
        .from('billing')
        .select('*, projects!inner(organization_id)')
        .eq('projects.organization_id', orgId),
      supabase
        .from('collections')
        .select('*, projects!inner(organization_id)')
        .eq('projects.organization_id', orgId),
      supabase
        .from('boq_items')
        .select('*, projects!inner(organization_id)')
        .eq('projects.organization_id', orgId),
      supabase
        .from('organization_members')
        .select('role, joined_at, profiles(email, full_name)')
        .eq('organization_id', orgId),
    ]);

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.data_exported',
    entity: 'organizations',
    entity_id: orgId,
    payload: {},
  });

  return {
    ok: true,
    data: {
      exported_at: new Date().toISOString(),
      organization_id: orgId,
      projects: projects.data ?? [],
      exceptions: exceptions.data ?? [],
      reminders: reminders.data ?? [],
      billing: billing.data ?? [],
      collections: collections.data ?? [],
      boq_items: boqItems.data ?? [],
      members: members.data ?? [],
    },
  };
}

// ============================================================
// DELETE WORKSPACE (DANGER)
// ============================================================
export async function deleteWorkspace(confirmName: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only the workspace owner can delete it' };
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  if (!org) return { ok: false, error: 'Organization not found' };

  if (confirmName.trim() !== org.name) {
    return { ok: false, error: 'Workspace name does not match' };
  }

  // Log the deletion first (audit_log has ON DELETE CASCADE on projects, so log BEFORE)
  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'settings.workspace_deleted',
    entity: 'organizations',
    entity_id: orgId,
    payload: { name: org.name },
  });

  // This requires a service-role edge function in production
  // For now we soft-delete by marking the org as deleted
  const { error } = await supabase
    .from('organizations')
    .update({
      status: 'deleted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/settings');
  return { ok: true };
}
