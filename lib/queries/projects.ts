import { createClient } from '@/lib/supabase/server';
import type { ProjectStage, HealthStatus, CurrencyCode } from '@/lib/types';

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  current_stage: ProjectStage;
  health: HealthStatus;
  contract_value: number;
  currency: CurrencyCode;
  end_date: string | null;
  start_date: string | null;
  updated_at: string;
  created_at: string;
};

export type ProjectFilters = {
  q?: string;
  health?: string[];
  stage?: string[];
  client?: string[];
  currency?: string[];
  sort?: string;
  dir?: 'asc' | 'desc';
};

export async function listProjects(filters: ProjectFilters = {}): Promise<ProjectRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('archived', false);

  // Health filter
  if (filters.health && filters.health.length > 0) {
    query = query.in('health', filters.health);
  }

  // Stage filter
  if (filters.stage && filters.stage.length > 0) {
    query = query.in('current_stage', filters.stage);
  }

  // Currency filter
  if (filters.currency && filters.currency.length > 0) {
    query = query.in('currency', filters.currency);
  }

  // Search text — code, name, or client name
  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim().replace(/%/g, '');
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
  }

  // Sort
  const sortField = filters.sort || 'updated_at';
  const sortDir = filters.dir === 'asc' ? { ascending: true } : { ascending: false };

  const allowedSorts = [
    'code',
    'name',
    'current_stage',
    'health',
    'contract_value',
    'end_date',
    'updated_at',
    'created_at',
  ];
  const safeSort = allowedSorts.includes(sortField) ? sortField : 'updated_at';

  query = query.order(safeSort, sortDir);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Map to normalized rows
  let rows: ProjectRow[] = (data ?? []).map((p: any) => {
    const clientName = Array.isArray(p.clients) ? p.clients[0]?.name : p.clients?.name;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      client_name: clientName ?? null,
      current_stage: p.current_stage,
      health: p.health,
      contract_value: Number(p.contract_value),
      currency: p.currency,
      end_date: p.end_date,
      start_date: p.start_date,
      updated_at: p.updated_at,
      created_at: p.created_at,
    };
  });

  // Client filter (client-side, since it's a joined field)
  if (filters.client && filters.client.length > 0) {
    rows = rows.filter((r) => r.client_name && filters.client!.includes(r.client_name));
  }

  // Text search — also match client name
  if (filters.q && filters.q.trim().length > 0) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.client_name ?? '').toLowerCase().includes(q)
    );
  }

  return rows;
}

export async function getDistinctClients(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('clients')
    .select('name')
    .order('name');
  return (data ?? []).map((c: any) => c.name).filter(Boolean);
}

export function summarizeProjects(rows: ProjectRow[]) {
  const totalValue = rows.reduce((s, r) => s + r.contract_value, 0);
  const totalByCurrency = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.currency] = (acc[r.currency] ?? 0) + r.contract_value;
    return acc;
  }, {});
  const byHealth = {
    green: rows.filter((r) => r.health === 'green').length,
    amber: rows.filter((r) => r.health === 'amber').length,
    red: rows.filter((r) => r.health === 'red').length,
    on_hold: rows.filter((r) => r.health === 'on_hold').length,
  };
  return { totalValue, totalByCurrency, byHealth, count: rows.length };
}
