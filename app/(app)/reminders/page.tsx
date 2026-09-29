import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Bell } from 'lucide-react';
import { RemindersList } from './reminders-list';

export const dynamic = 'force-dynamic';

export default async function RemindersPage() {
  const supabase = await createClient();

  const { data: reminders } = await supabase
    .from('reminders')
    .select(
      '*, projects(code, name), assignee:profiles!reminders_assigned_to_fkey(id, full_name, email)'
    )
    .order('due_at', { ascending: true });

  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email');

  // Events for these reminders
  const reminderIds = (reminders ?? []).map((r: any) => r.id);
  let events: any[] = [];
  if (reminderIds.length > 0) {
    const { data: rawEvents } = await supabase
      .from('reminder_events')
      .select('id, reminder_id, event_type, actor_id, note, created_at')
      .in('reminder_id', reminderIds)
      .order('created_at', { ascending: false });

    const actorIds = Array.from(
      new Set((rawEvents ?? []).map((e: any) => e.actor_id).filter(Boolean))
    );
    const actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);
      for (const a of actors ?? []) {
        actorMap.set(a.id, a.full_name ?? a.email ?? 'Unknown');
      }
    }

    events = (rawEvents ?? []).map((e: any) => ({
      ...e,
      actor_name: e.actor_id ? actorMap.get(e.actor_id) ?? null : null,
    }));
  }

  const eventsByReminder: Record<string, any[]> = {};
  for (const e of events) {
    if (!eventsByReminder[e.reminder_id]) eventsByReminder[e.reminder_id] = [];
    eventsByReminder[e.reminder_id].push(e);
  }

  // Normalize rows
  const now = Date.now();
  const rows = (reminders ?? []).map((r: any) => {
    const assignee = Array.isArray(r.assignee) ? r.assignee[0] : r.assignee;
    const project = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    const dueMs = new Date(r.due_at).getTime();
    const isOverdue = r.status === 'pending' && dueMs < now;
    return {
      id: r.id,
      project_id: r.project_id,
      project_code: project?.code ?? null,
      project_name: project?.name ?? null,
      exception_id: r.exception_id,
      message: r.message,
      due_at: r.due_at,
      status: isOverdue ? 'overdue' : r.status,
      priority: r.priority ?? 'normal',
      assigned_to: r.assigned_to,
      assigned_name: assignee?.full_name ?? assignee?.email ?? null,
      completed_at: r.completed_at ?? null,
      dismissed_at: r.dismissed_at ?? null,
      snoozed_until: r.snoozed_until ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });

  const normalizedTeam = (teamMembers ?? []).map((m: any) => ({
    id: m.id,
    name: m.full_name ?? m.email ?? 'User',
  }));

  const overdue = rows.filter((r) => r.status === 'overdue').length;
  const pending = rows.filter((r) => r.status === 'pending').length;
  const done = rows.filter((r) => r.status === 'done').length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6 text-amber-500" />
          Reminders
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {overdue} overdue · {pending} upcoming · {done} done
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <KpiCell label="Overdue" value={String(overdue)} color="red" />
        <KpiCell label="Pending" value={String(pending)} color="amber" />
        <KpiCell label="Completed" value={String(done)} color="emerald" />
      </div>

      <RemindersList
        rows={rows}
        eventsByReminder={eventsByReminder}
        teamMembers={normalizedTeam}
      />
    </div>
  );
}

function KpiCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'red' | 'amber' | 'emerald';
}) {
  const colorClass =
    color === 'red'
      ? 'text-red-400'
      : color === 'amber'
      ? 'text-amber-500'
      : color === 'emerald'
      ? 'text-emerald-500'
      : 'text-foreground';

  return (
    <Card className="p-3 bg-card/50">
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label}
      </div>
      <div className={`text-lg font-semibold ${colorClass}`}>{value}</div>
    </Card>
  );
}
