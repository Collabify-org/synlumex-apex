import { createClient } from '@/lib/supabase/server';

export type Delta = {
  value: number;       // percentage change, e.g. 12 for +12%
  direction: 'up' | 'down' | 'flat';
  positive: boolean;   // whether the direction is "good"
};

export type AttentionItem = {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  kind: 'critical_project' | 'critical_exception' | 'overdue_reminder' | 'collection_gap';
  message: string;
  severity: 'critical' | 'high' | 'medium';
};

export type ActivityItem = {
  id: string;
  when: string;
  actor: string;
  action: string;
  project_code: string | null;
  project_id: string | null;
  summary: string;
};

export type MilestoneItem = {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  end_date: string;
  days_away: number;
  health: string;
};

export type CashSnapshot = {
  billed_30d: number;
  collected_30d: number;
  overdue_total: number;
  collection_rate_30d: number; // percentage
};

export interface DashboardMetrics {
  // KPIs
  totalProjects: number;
  activeProjects: number;
  atRisk: number;
  critical: number;
  onTrack: number;
  onHold: number;
  totalContractValue: number;
  totalBilled: number;
  totalCollected: number;
  totalUnbilled: number;
  totalOverdue: number;
  collectionEfficiency: number;
  openExceptions: number;
  criticalExceptions: number;
  highExceptions: number;
  mediumExceptions: number;
  overdueReminders: number;
  avgExecutionProgress: number;
  stageDistribution: { stage: string; count: number }[];
  currencyBreakdown: { currency: string; value: number }[];
  lastSync: string | null;

  // NEW: trends (vs previous 30-day window)
  deltas: {
    billed: Delta;
    collected: Delta;
    projects_added: Delta;
    exceptions_opened: Delta;
  };

  // NEW: attention panel
  attention: AttentionItem[];

  // NEW: activity feed
  activity: ActivityItem[];

  // NEW: upcoming milestones (next 30 days)
  milestones: MilestoneItem[];

  // NEW: cash snapshot
  cash: CashSnapshot;
}

function pctDelta(current: number, previous: number): Delta {
  if (previous === 0 && current === 0) {
    return { value: 0, direction: 'flat', positive: true };
  }
  if (previous === 0) {
    return { value: 100, direction: 'up', positive: true };
  }
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const dir: 'up' | 'down' | 'flat' =
    Math.abs(pct) < 0.5 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { value: Number(pct.toFixed(1)), direction: dir, positive: pct >= 0 };
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('archived', false);

  const { data: billings } = await supabase.from('billing').select('*');
  const { data: collections } = await supabase.from('collections').select('*');
  const { data: exceptions } = await supabase.from('exceptions').select('*');
  const { data: reminders } = await supabase.from('reminders').select('*');
  const { data: executions } = await supabase
    .from('execution_updates')
    .select('project_id, progress_pct, created_at')
    .order('created_at', { ascending: false });
  const { data: settings } = await supabase.from('settings').select('last_sync_at').single();

  const ps = projects ?? [];
  const bs = billings ?? [];
  const cs = collections ?? [];
  const es = exceptions ?? [];
  const rs = reminders ?? [];
  const xs = executions ?? [];

  const totalContractValue = ps.reduce((s, p) => s + Number(p.contract_value ?? 0), 0);
  const totalBilled = bs.reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const totalCollected = cs.reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const totalOverdue = bs
    .filter((b) => b.status === 'overdue')
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const totalUnbilled = Math.max(totalBilled - totalCollected, 0);

  const openExceptions = es.filter((e) => e.status === 'open').length;
  const criticalExceptions = es.filter(
    (e) => e.status === 'open' && e.severity === 'critical'
  ).length;
  const highExceptions = es.filter(
    (e) => e.status === 'open' && e.severity === 'high'
  ).length;
  const mediumExceptions = es.filter(
    (e) => e.status === 'open' && e.severity === 'medium'
  ).length;

  const now = new Date();
  const overdueReminders = rs.filter(
    (r) => r.status === 'pending' && new Date(r.due_at) < now
  ).length;

  const atRisk = ps.filter((p) => p.health === 'amber').length;
  const critical = ps.filter((p) => p.health === 'red').length;
  const onTrack = ps.filter((p) => p.health === 'green').length;
  const onHold = ps.filter((p) => p.health === 'on_hold').length;

  const executionProjects = ps.filter((p) =>
    ['execution', 'qa_qc', 'testing_commissioning'].includes(p.current_stage)
  );
  const latestByProject = new Map<string, number>();
  for (const x of xs) {
    if (!latestByProject.has(x.project_id)) {
      latestByProject.set(x.project_id, Number(x.progress_pct));
    }
  }
  const avgExecutionProgress =
    executionProjects.length === 0
      ? 0
      : executionProjects.reduce(
          (s, p) => s + (latestByProject.get(p.id) ?? 0),
          0
        ) / executionProjects.length;

  const stageMap = new Map<string, number>();
  for (const p of ps) stageMap.set(p.current_stage, (stageMap.get(p.current_stage) ?? 0) + 1);
  const stageDistribution = Array.from(stageMap.entries()).map(([stage, count]) => ({
    stage,
    count,
  }));

  const currencyMap = new Map<string, number>();
  for (const p of ps) {
    currencyMap.set(p.currency, (currencyMap.get(p.currency) ?? 0) + Number(p.contract_value ?? 0));
  }
  const currencyBreakdown = Array.from(currencyMap.entries()).map(([currency, value]) => ({
    currency,
    value,
  }));

  // ─── TRENDS: compare last 30 days vs previous 30 days ───
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  const billedThis = bs
    .filter((b) => new Date(b.billed_at ?? b.created_at) >= thirtyDaysAgo)
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);
  const billedPrev = bs
    .filter((b) => {
      const d = new Date(b.billed_at ?? b.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    })
    .reduce((s, b) => s + Number(b.amount ?? 0), 0);

  const collectedThis = cs
    .filter((c) => new Date(c.collected_at ?? c.created_at) >= thirtyDaysAgo)
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);
  const collectedPrev = cs
    .filter((c) => {
      const d = new Date(c.collected_at ?? c.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    })
    .reduce((s, c) => s + Number(c.amount ?? 0), 0);

  const projectsThis = ps.filter((p) => new Date(p.created_at) >= thirtyDaysAgo).length;
  const projectsPrev = ps.filter((p) => {
    const d = new Date(p.created_at);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;

  const exceptionsThis = es.filter((e) => new Date(e.created_at) >= thirtyDaysAgo).length;
  const exceptionsPrev = es.filter((e) => {
    const d = new Date(e.created_at);
    return d >= sixtyDaysAgo && d < thirtyDaysAgo;
  }).length;

  const deltas = {
    billed: pctDelta(billedThis, billedPrev),
    collected: pctDelta(collectedThis, collectedPrev),
    projects_added: pctDelta(projectsThis, projectsPrev),
    exceptions_opened: pctDelta(exceptionsThis, exceptionsPrev),
  };

  // ─── ATTENTION: top 5 things needing action ───
  const attention: AttentionItem[] = [];

  // Critical projects
  for (const p of ps.filter((x) => x.health === 'red').slice(0, 3)) {
    attention.push({
      id: `proj-${p.id}`,
      project_id: p.id,
      project_code: p.code,
      project_name: p.name,
      kind: 'critical_project',
      message: `Project is marked Critical — intervention needed`,
      severity: 'critical',
    });
  }

  // Critical open exceptions
  for (const e of es
    .filter((x) => x.status === 'open' && x.severity === 'critical')
    .slice(0, 3)) {
    const p = ps.find((x) => x.id === e.project_id);
    if (!p) continue;
    attention.push({
      id: `exc-${e.id}`,
      project_id: p.id,
      project_code: p.code,
      project_name: p.name,
      kind: 'critical_exception',
      message: e.message,
      severity: 'critical',
    });
  }

  // Overdue reminders
  for (const r of rs
    .filter((x) => x.status === 'pending' && new Date(x.due_at) < now)
    .slice(0, 2)) {
    const p = ps.find((x) => x.id === r.project_id);
    if (!p) continue;
    attention.push({
      id: `rem-${r.id}`,
      project_id: p.id,
      project_code: p.code,
      project_name: p.name,
      kind: 'overdue_reminder',
      message: r.message,
      severity: 'high',
    });
  }

  // Sort: critical first
  const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  attention.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const topAttention = attention.slice(0, 5);

  // ─── ACTIVITY: latest 8 audit_log entries ───
  const { data: auditData } = await supabase
    .from('audit_log')
    .select('id, created_at, action, entity, entity_id, project_id, actor_id, payload')
    .order('created_at', { ascending: false })
    .limit(8);

  const actorIds = Array.from(
    new Set((auditData ?? []).map((a: any) => a.actor_id).filter(Boolean))
  );
  let actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', actorIds);
    for (const a of actors ?? []) actorMap.set(a.id, a.full_name ?? 'system');
  }

  const activity: ActivityItem[] = (auditData ?? []).map((a: any) => {
    const proj = ps.find((p) => p.id === a.project_id);
    return {
      id: a.id,
      when: a.created_at,
      actor: actorMap.get(a.actor_id) ?? 'system',
      action: a.action ?? 'unknown',
      project_code: proj?.code ?? null,
      project_id: proj?.id ?? null,
      summary: `${actorMap.get(a.actor_id) ?? 'System'} · ${a.action}`,
    };
  });

  // ─── MILESTONES: projects ending in next 30 days ───
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);
  const milestones: MilestoneItem[] = ps
    .filter((p) => p.end_date)
    .filter((p) => {
      const d = new Date(p.end_date);
      return d >= now && d <= thirtyDaysFromNow;
    })
    .map((p) => ({
      id: p.id,
      project_id: p.id,
      project_code: p.code,
      project_name: p.name,
      end_date: p.end_date!,
      days_away: Math.ceil((new Date(p.end_date!).getTime() - now.getTime()) / 86400000),
      health: p.health,
    }))
    .sort((a, b) => a.days_away - b.days_away)
    .slice(0, 5);

  // ─── CASH SNAPSHOT ───
  const cash: CashSnapshot = {
    billed_30d: billedThis,
    collected_30d: collectedThis,
    overdue_total: totalOverdue,
    collection_rate_30d: billedThis > 0 ? (collectedThis / billedThis) * 100 : 0,
  };

  return {
    totalProjects: ps.length,
    activeProjects: ps.length,
    atRisk,
    critical,
    onTrack,
    onHold,
    totalContractValue,
    totalBilled,
    totalCollected,
    totalUnbilled,
    totalOverdue,
    collectionEfficiency: totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0,
    openExceptions,
    criticalExceptions,
    highExceptions,
    mediumExceptions,
    overdueReminders,
    avgExecutionProgress,
    stageDistribution,
    currencyBreakdown,
    lastSync: settings?.last_sync_at ?? null,
    deltas,
    attention: topAttention,
    activity,
    milestones,
    cash,
  };
}

export async function getRecentExceptions(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('exceptions')
    .select('id, project_id, type, severity, message, status, created_at, projects(code, name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getRecentProjects(limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('projects')
    .select('id, code, name, health, current_stage, currency, contract_value, updated_at')
    .eq('archived', false)
    .order('updated_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getTodayReminders(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('reminders')
    .select('id, project_id, message, due_at, status, projects(code, name)')
    .eq('status', 'pending')
    .order('due_at', { ascending: true })
    .limit(limit);
  return data ?? [];
}
