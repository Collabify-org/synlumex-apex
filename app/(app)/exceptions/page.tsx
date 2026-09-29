import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { ExceptionsList } from './exceptions-list';

export const dynamic = 'force-dynamic';

export default async function ExceptionsPage() {
  const supabase = await createClient();

  // Exceptions + project + assignee
  const { data: exceptions } = await supabase
    .from('exceptions')
    .select('*, projects(code, name), assignee:profiles!exceptions_assigned_to_fkey(id, full_name)')
    .order('created_at', { ascending: false });

  // Team members for assignment
  const { data: teamMembers } = await supabase
    .from('profiles')
    .select('id, full_name, email');

  // All events for these exceptions
  const exceptionIds = (exceptions ?? []).map((e: any) => e.id);
  let events: any[] = [];
  if (exceptionIds.length > 0) {
    const { data: rawEvents } = await supabase
      .from('exception_events')
      .select('id, exception_id, event_type, actor_id, note, created_at')
      .in('exception_id', exceptionIds)
      .order('created_at', { ascending: false });

    // Load actor names
    const actorIds = Array.from(
      new Set((rawEvents ?? []).map((e: any) => e.actor_id).filter(Boolean))
    );
    let actorMap = new Map<string, string>();
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

  // Group events by exception
  const eventsByException: Record<string, any[]> = {};
  for (const e of events) {
    if (!eventsByException[e.exception_id]) eventsByException[e.exception_id] = [];
    eventsByException[e.exception_id].push(e);
  }

  // Normalize rows
  const rows = (exceptions ?? []).map((e: any) => {
    const assignee = Array.isArray(e.assignee) ? e.assignee[0] : e.assignee;
    const project = Array.isArray(e.projects) ? e.projects[0] : e.projects;
    return {
      id: e.id,
      project_id: e.project_id,
      project_code: project?.code ?? null,
      project_name: project?.name ?? null,
      type: e.type,
      severity: e.severity,
      message: e.message,
      status: e.status,
      assigned_to: e.assigned_to,
      assigned_name: assignee?.full_name ?? assignee?.email ?? null,
      resolved_at: e.resolved_at,
      resolution_note: e.resolution_note ?? null,
      acknowledged_at: e.acknowledged_at ?? null,
      snoozed_until: e.snoozed_until ?? null,
      due_at: e.due_at ?? null,
      created_at: e.created_at,
      updated_at: e.updated_at,
    };
  });

  const normalizedTeam = (teamMembers ?? []).map((m: any) => ({
    id: m.id,
    name: m.full_name ?? m.email ?? 'User',
  }));

  // KPI counts
  const open = rows.filter((r) => r.status === 'open').length;
  const ack = rows.filter((r) => r.status === 'ack').length;
  const closed = rows.filter((r) => r.status === 'closed').length;
  const critical = rows.filter((r) => r.severity === 'critical').length;
  const high = rows.filter((r) => r.severity === 'high').length;
  const medium = rows.filter((r) => r.severity === 'medium').length;
  const low = rows.filter((r) => r.severity === 'low').length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Exceptions
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {open} open · {ack} acknowledged · {closed} closed
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <KpiCell label="Open" value={String(open)} color="amber" />
        <KpiCell label="Acknowledged" value={String(ack)} color="brand" />
        <KpiCell label="Closed" value={String(closed)} color="emerald" />
        <KpiCell label="Critical" value={String(critical)} color="red" />
        <KpiCell label="High" value={String(high)} color="amber" />
        <KpiCell label="Medium/Low" value={`${medium} / ${low}`} />
      </div>

      <ExceptionsList
        rows={rows}
        eventsByException={eventsByException}
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
  color?: 'red' | 'amber' | 'emerald' | 'brand';
}) {
  const colorClass =
    color === 'red'
      ? 'text-red-400'
      : color === 'amber'
      ? 'text-amber-500'
      : color === 'emerald'
      ? 'text-emerald-500'
      : color === 'brand'
      ? 'text-brand'
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
