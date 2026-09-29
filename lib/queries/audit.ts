import { createClient } from '@/lib/supabase/server';

export type AuditCategory =
  | 'stage'
  | 'exception'
  | 'reminder'
  | 'billing'
  | 'settings'
  | 'system'
  | 'all';

export type AuditFilters = {
  q?: string;
  category?: AuditCategory;
  actor_id?: string;
  range?: '24h' | '7d' | '30d' | '90d' | 'all';
  page?: number;
  pageSize?: number;
};

export type AuditRow = {
  id: string;
  project_id: string | null;
  project_code: string | null;
  project_name: string | null;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: any;
  created_at: string;
  category: AuditCategory;
};

export type AuditResult = {
  rows: AuditRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AuditKpis = {
  total: number;
  human: number;
  system: number;
  today: number;
};

export function categorizeAction(action: string): AuditCategory {
  const a = (action ?? '').toLowerCase();
  if (a === 'recompute') return 'system';
  if (a.startsWith('stage')) return 'stage';
  if (a.startsWith('exception')) return 'exception';
  if (a.startsWith('reminder')) return 'reminder';
  if (a.startsWith('billing') || a.startsWith('collection') || a.startsWith('invoice')) return 'billing';
  if (a.startsWith('settings') || a.startsWith('plan') || a.startsWith('member')) return 'settings';
  return 'system';
}

function rangeToCutoff(range: string | undefined): Date | null {
  if (!range || range === 'all') return null;
  const hours = range === '24h' ? 24 : range === '7d' ? 24 * 7 : range === '30d' ? 24 * 30 : 24 * 90;
  return new Date(Date.now() - hours * 3600 * 1000);
}

export async function listAudit(
  filters: AuditFilters = {}
): Promise<AuditResult> {
  const supabase = await createClient();

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(25, filters.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('audit_log')
    .select(
      'id, project_id, actor_id, action, entity, entity_id, payload, created_at, projects(code, name)',
      { count: 'exact' }
    );

  // Category filter — map to action prefixes
  if (filters.category && filters.category !== 'all') {
    if (filters.category === 'system') {
      query = query.eq('action', 'recompute');
    } else if (filters.category === 'stage') {
      query = query.or('action.ilike.stage%,action.ilike.entered%,action.ilike.completed%,action.ilike.blocked%,action.ilike.unblocked%');
    } else if (filters.category === 'exception') {
      query = query.ilike('action', 'exception%');
    } else if (filters.category === 'reminder') {
      query = query.ilike('action', 'reminder%');
    } else if (filters.category === 'billing') {
      query = query.or('action.ilike.billing%,action.ilike.collection%,action.ilike.invoice%');
    } else if (filters.category === 'settings') {
      query = query.or('action.ilike.settings%,action.ilike.plan%,action.ilike.member%');
    }
  }

  // Date range
  const cutoff = rangeToCutoff(filters.range);
  if (cutoff) {
    query = query.gte('created_at', cutoff.toISOString());
  }

  // Actor filter
  if (filters.actor_id) {
    query = query.eq('actor_id', filters.actor_id);
  }

  // Search — action or payload text
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().replace(/%/g, '');
    query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%`);
  }

  // Order + paginate
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  // Load actor names
  const actorIds = Array.from(
    new Set((data ?? []).map((r: any) => r.actor_id).filter(Boolean))
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

  const rows: AuditRow[] = (data ?? []).map((r: any) => {
    const project = Array.isArray(r.projects) ? r.projects[0] : r.projects;
    return {
      id: r.id,
      project_id: r.project_id,
      project_code: project?.code ?? null,
      project_name: project?.name ?? null,
      actor_id: r.actor_id,
      actor_name: r.actor_id ? actorMap.get(r.actor_id) ?? null : 'System',
      action: r.action,
      entity: r.entity,
      entity_id: r.entity_id,
      payload: r.payload,
      created_at: r.created_at,
      category: categorizeAction(r.action),
    };
  });

  return {
    rows,
    total: count ?? rows.length,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
  };
}

export async function getAuditKpis(): Promise<AuditKpis> {
  const supabase = await createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [totalRes, humanRes, sysRes, todayRes] = await Promise.all([
    supabase.from('audit_log').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .not('actor_id', 'is', null),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'recompute'),
    supabase
      .from('audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
  ]);

  return {
    total: totalRes.count ?? 0,
    human: humanRes.count ?? 0,
    system: sysRes.count ?? 0,
    today: todayRes.count ?? 0,
  };
}

export async function getDistinctActors(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from('audit_log')
    .select('actor_id')
    .not('actor_id', 'is', null);

  const ids = Array.from(new Set((logs ?? []).map((r: any) => r.actor_id)));
  if (ids.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids);

  return (profiles ?? []).map((p: any) => ({
    id: p.id,
    name: p.full_name ?? p.email ?? 'User',
  }));
}
