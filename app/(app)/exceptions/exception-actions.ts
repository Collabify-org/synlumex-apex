'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

// Helper: verify user + load exception's org
async function loadContext(supabase: any, exceptionId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, exception: null };

  const { data: exception } = await supabase
    .from('exceptions')
    .select('id, organization_id, project_id, status, assigned_to')
    .eq('id', exceptionId)
    .single();

  return { user, exception };
}

// ============================================================
// ACKNOWLEDGE — user sees it and takes ownership
// ============================================================
export async function acknowledgeException(exceptionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('exceptions')
    .update({
      status: 'ack',
      acknowledged_at: now,
      acknowledged_by: user.id,
      updated_at: now,
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'acknowledged',
    actor_id: user.id,
  });

  revalidatePath('/exceptions');
  revalidatePath('/dashboard');
  if (exception.project_id) revalidatePath(`/projects/${exception.project_id}`);
  return { ok: true };
}

// ============================================================
// ASSIGN — assign to a team member
// ============================================================
export async function assignException(
  exceptionId: string,
  assigneeId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('exceptions')
    .update({
      assigned_to: assigneeId,
      updated_at: now,
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  // Load assignee name for the event log
  let assigneeName = 'Unassigned';
  if (assigneeId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', assigneeId)
      .single();
    assigneeName = profile?.full_name ?? profile?.email ?? 'User';
  }

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'assigned',
    actor_id: user.id,
    note: `Assigned to ${assigneeName}`,
    metadata: { assignee_id: assigneeId },
  });

  revalidatePath('/exceptions');
  revalidatePath('/dashboard');
  if (exception.project_id) revalidatePath(`/projects/${exception.project_id}`);
  return { ok: true };
}

// ============================================================
// RESOLVE — mark as fixed
// ============================================================
export async function resolveException(
  exceptionId: string,
  payload: { note?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('exceptions')
    .update({
      status: 'closed',
      resolved_at: now,
      resolved_by: user.id,
      resolution_note: payload.note ?? null,
      updated_at: now,
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'resolved',
    actor_id: user.id,
    note: payload.note ?? null,
  });

  revalidatePath('/exceptions');
  revalidatePath('/dashboard');
  if (exception.project_id) revalidatePath(`/projects/${exception.project_id}`);
  return { ok: true };
}

// ============================================================
// DISMISS — not a real issue; hide it
// ============================================================
export async function dismissException(
  exceptionId: string,
  payload: { reason?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('exceptions')
    .update({
      status: 'closed',
      dismissed_at: now,
      dismissed_by: user.id,
      resolution_note: payload.reason ?? null,
      updated_at: now,
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'dismissed',
    actor_id: user.id,
    note: payload.reason ?? null,
  });

  revalidatePath('/exceptions');
  revalidatePath('/dashboard');
  if (exception.project_id) revalidatePath(`/projects/${exception.project_id}`);
  return { ok: true };
}

// ============================================================
// SNOOZE — hide for N days
// ============================================================
export async function snoozeException(
  exceptionId: string,
  payload: { days: number }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const until = new Date(Date.now() + payload.days * 86400000).toISOString();

  const { error } = await supabase
    .from('exceptions')
    .update({
      snoozed_until: until,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'snoozed',
    actor_id: user.id,
    note: `Snoozed for ${payload.days} day${payload.days === 1 ? '' : 's'}`,
    metadata: { until },
  });

  revalidatePath('/exceptions');
  return { ok: true };
}

// ============================================================
// UNSNOOZE — remove snooze
// ============================================================
export async function unsnoozeException(exceptionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const { error } = await supabase
    .from('exceptions')
    .update({
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'unsnoozed',
    actor_id: user.id,
  });

  revalidatePath('/exceptions');
  return { ok: true };
}

// ============================================================
// REOPEN — bring a closed exception back to open
// ============================================================
export async function reopenException(
  exceptionId: string,
  payload: { reason?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };

  const { error } = await supabase
    .from('exceptions')
    .update({
      status: 'open',
      resolved_at: null,
      resolved_by: null,
      dismissed_at: null,
      dismissed_by: null,
      resolution_note: null,
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', exceptionId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'reopened',
    actor_id: user.id,
    note: payload.reason ?? null,
  });

  revalidatePath('/exceptions');
  revalidatePath('/dashboard');
  if (exception.project_id) revalidatePath(`/projects/${exception.project_id}`);
  return { ok: true };
}

// ============================================================
// ADD NOTE — free-form comment
// ============================================================
export async function addExceptionNote(
  exceptionId: string,
  payload: { note: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, exception } = await loadContext(supabase, exceptionId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!exception) return { ok: false, error: 'Exception not found' };
  if (!payload.note.trim()) return { ok: false, error: 'Empty note' };

  await supabase.from('exception_events').insert({
    exception_id: exceptionId,
    organization_id: exception.organization_id,
    event_type: 'noted',
    actor_id: user.id,
    note: payload.note.trim(),
  });

  revalidatePath('/exceptions');
  return { ok: true };
}
