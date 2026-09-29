'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

async function loadContext(supabase: any, reminderId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, reminder: null };

  const { data: reminder } = await supabase
    .from('reminders')
    .select('id, organization_id, project_id, status, assigned_to')
    .eq('id', reminderId)
    .single();

  return { user, reminder };
}

function revalidate(projectId?: string | null) {
  revalidatePath('/reminders');
  revalidatePath('/dashboard');
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

// ============================================================
// COMPLETE — mark reminder as done
// ============================================================
export async function completeReminder(reminderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('reminders')
    .update({
      status: 'done',
      completed_at: now,
      completed_by: user.id,
      updated_at: now,
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'completed',
    actor_id: user.id,
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// DISMISS — not a real reminder; hide it
// ============================================================
export async function dismissReminder(
  reminderId: string,
  payload: { reason?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('reminders')
    .update({
      status: 'done',
      dismissed_at: now,
      dismissed_by: user.id,
      notes: payload.reason ?? null,
      updated_at: now,
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'dismissed',
    actor_id: user.id,
    note: payload.reason ?? null,
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// SNOOZE — push due date forward
// ============================================================
export async function snoozeReminder(
  reminderId: string,
  payload: { days: number }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const until = new Date(Date.now() + payload.days * 86400000).toISOString();

  const { error } = await supabase
    .from('reminders')
    .update({
      snoozed_until: until,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'snoozed',
    actor_id: user.id,
    note: `Snoozed for ${payload.days} day${payload.days === 1 ? '' : 's'}`,
    metadata: { until },
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// UNSNOOZE
// ============================================================
export async function unsnoozeReminder(reminderId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const { error } = await supabase
    .from('reminders')
    .update({
      snoozed_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'unsnoozed',
    actor_id: user.id,
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// ASSIGN — assign to team member
// ============================================================
export async function assignReminder(
  reminderId: string,
  assigneeId: string | null
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const { error } = await supabase
    .from('reminders')
    .update({
      assigned_to: assigneeId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  let name = 'Unassigned';
  if (assigneeId) {
    const { data: p } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', assigneeId)
      .single();
    name = p?.full_name ?? p?.email ?? 'User';
  }

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'assigned',
    actor_id: user.id,
    note: `Assigned to ${name}`,
    metadata: { assignee_id: assigneeId },
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// NOTE
// ============================================================
export async function addReminderNote(
  reminderId: string,
  payload: { note: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };
  if (!payload.note.trim()) return { ok: false, error: 'Empty note' };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'noted',
    actor_id: user.id,
    note: payload.note.trim(),
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// REOPEN
// ============================================================
export async function reopenReminder(
  reminderId: string,
  payload: { reason?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const { error } = await supabase
    .from('reminders')
    .update({
      status: 'pending',
      completed_at: null,
      completed_by: null,
      dismissed_at: null,
      dismissed_by: null,
      snoozed_until: null,
      notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'reopened',
    actor_id: user.id,
    note: payload.reason ?? null,
  });

  revalidate(reminder.project_id);
  return { ok: true };
}

// ============================================================
// PRIORITY
// ============================================================
export async function setReminderPriority(
  reminderId: string,
  payload: { priority: 'low' | 'normal' | 'high' | 'urgent' }
): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, reminder } = await loadContext(supabase, reminderId);
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!reminder) return { ok: false, error: 'Reminder not found' };

  const { error } = await supabase
    .from('reminders')
    .update({
      priority: payload.priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reminderId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('reminder_events').insert({
    reminder_id: reminderId,
    organization_id: reminder.organization_id,
    event_type: 'priority_changed',
    actor_id: user.id,
    note: `Priority: ${payload.priority}`,
    metadata: { priority: payload.priority },
  });

  revalidate(reminder.project_id);
  return { ok: true };
}
