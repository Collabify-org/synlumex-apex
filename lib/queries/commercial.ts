import { createClient } from '@/lib/supabase/server';

export type CommercialRow = {
  id: string;
  code: string;
  name: string;
  client_name: string | null;
  currency: string;
  contract_value: number;
  billed: number;
  collected: number;
  unbilled: number;
  overdue: number;
  efficiency: number;
  // Aging buckets (outstanding amount by days overdue)
  aging_0_30: number;
  aging_31_60: number;
  aging_61_90: number;
  aging_90_plus: number;
  // Metadata
  invoices: number;
  collections: number;
  last_invoice_date: string | null;
  last_collection_date: string | null;
};

export type CommercialFilters = {
  range?: '30d' | '90d' | '180d' | 'all';
  q?: string;
  client?: string[];
  currency?: string[];
  sort?: string;
  dir?: 'asc' | 'desc';
};

export type CommercialTotals = {
  contract: number;
  billed: number;
  collected: number;
  unbilled: number;
  overdue: number;
  efficiency: number;
  aging_0_30: number;
  aging_31_60: number;
  aging_61_90: number;
  aging_90_plus: number;
};

export type CashFlowPoint = {
  month: string; // YYYY-MM
  label: string; // Mon
  billed: number;
  collected: number;
};

function rangeToCutoff(range: string | undefined): Date | null {
  if (!range || range === 'all') return null;
  const days = range === '30d' ? 30 : range === '90d' ? 90 : 180;
  return new Date(Date.now() - days * 86400000);
}

export async function getCommercialRows(
  filters: CommercialFilters = {}
): Promise<CommercialRow[]> {
  const supabase = await createClient();

  const { data: projects } = await supabase
    .from('projects')
    .select('id, code, name, currency, contract_value, clients(name)')
    .eq('archived', false);

  const projectIds = (projects ?? []).map((p: any) => p.id);
  if (projectIds.length === 0) return [];

  const cutoff = rangeToCutoff(filters.range);

  // Fetch billing (with billed_at for range filter + aging)
  let billingQuery = supabase
    .from('billing')
    .select('project_id, amount, status, billed_at, due_at')
    .in('project_id', projectIds);

  if (cutoff) {
    billingQuery = billingQuery.gte('billed_at', cutoff.toISOString().slice(0, 10));
  }

  const { data: billings } = await billingQuery;

  // Fetch collections (with collected_at for range filter)
  let collectionsQuery = supabase
    .from('collections')
    .select('project_id, amount, collected_at')
    .in('project_id', projectIds);

  if (cutoff) {
    collectionsQuery = collectionsQuery.gte(
      'collected_at',
      cutoff.toISOString().slice(0, 10)
    );
  }

  const { data: collections } = await collectionsQuery;

  // Aggregate per project
  const now = Date.now();
  const byProject = new Map<
    string,
    {
      billed: number;
      collected: number;
      overdue: number;
      invoices: number;
      collections: number;
      last_invoice_date: string | null;
      last_collection_date: string | null;
      aging_0_30: number;
      aging_31_60: number;
      aging_61_90: number;
      aging_90_plus: number;
    }
  >();

  for (const b of billings ?? []) {
    const cur = byProject.get(b.project_id) ?? {
      billed: 0,
      collected: 0,
      overdue: 0,
      invoices: 0,
      collections: 0,
      last_invoice_date: null,
      last_collection_date: null,
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_90_plus: 0,
    };
    const amt = Number(b.amount);
    cur.billed += amt;
    cur.invoices += 1;
    if (b.billed_at && (!cur.last_invoice_date || b.billed_at > cur.last_invoice_date)) {
      cur.last_invoice_date = b.billed_at;
    }
    if (b.status === 'overdue' || b.status === 'unpaid') {
      cur.overdue += amt;
      // Aging buckets — how many days overdue?
      const dueDate = b.due_at ? new Date(b.due_at).getTime() : now;
      const daysOverdue = Math.max(0, Math.floor((now - dueDate) / 86400000));
      if (daysOverdue <= 30) cur.aging_0_30 += amt;
      else if (daysOverdue <= 60) cur.aging_31_60 += amt;
      else if (daysOverdue <= 90) cur.aging_61_90 += amt;
      else cur.aging_90_plus += amt;
    }
    byProject.set(b.project_id, cur);
  }

  for (const c of collections ?? []) {
    const cur = byProject.get(c.project_id) ?? {
      billed: 0,
      collected: 0,
      overdue: 0,
      invoices: 0,
      collections: 0,
      last_invoice_date: null,
      last_collection_date: null,
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_90_plus: 0,
    };
    cur.collected += Number(c.amount);
    cur.collections += 1;
    if (
      c.collected_at &&
      (!cur.last_collection_date || c.collected_at > cur.last_collection_date)
    ) {
      cur.last_collection_date = c.collected_at;
    }
    byProject.set(c.project_id, cur);
  }

  let rows: CommercialRow[] = (projects ?? []).map((p: any) => {
    const agg = byProject.get(p.id) ?? {
      billed: 0,
      collected: 0,
      overdue: 0,
      invoices: 0,
      collections: 0,
      last_invoice_date: null,
      last_collection_date: null,
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_90_plus: 0,
    };
    const unbilled = Math.max(agg.billed - agg.collected, 0);
    const efficiency = agg.billed > 0 ? (agg.collected / agg.billed) * 100 : 0;
    const clientName = Array.isArray(p.clients)
      ? p.clients[0]?.name
      : p.clients?.name;
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      client_name: clientName ?? null,
      currency: p.currency,
      contract_value: Number(p.contract_value),
      billed: agg.billed,
      collected: agg.collected,
      overdue: agg.overdue,
      unbilled,
      efficiency,
      aging_0_30: agg.aging_0_30,
      aging_31_60: agg.aging_31_60,
      aging_61_90: agg.aging_61_90,
      aging_90_plus: agg.aging_90_plus,
      invoices: agg.invoices,
      collections: agg.collections,
      last_invoice_date: agg.last_invoice_date,
      last_collection_date: agg.last_collection_date,
    };
  });

  // Text search
  if (filters.q && filters.q.trim()) {
    const q = filters.q.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        r.code.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.client_name ?? '').toLowerCase().includes(q)
    );
  }

  // Client filter
  if (filters.client && filters.client.length > 0) {
    rows = rows.filter((r) => r.client_name && filters.client!.includes(r.client_name));
  }

  // Currency filter
  if (filters.currency && filters.currency.length > 0) {
    rows = rows.filter((r) => filters.currency!.includes(r.currency));
  }

  // Sort
  const sortField = filters.sort ?? 'contract_value';
  const sortDir = filters.dir === 'asc' ? 1 : -1;
  const allowedSorts = [
    'code',
    'name',
    'contract_value',
    'billed',
    'collected',
    'unbilled',
    'overdue',
    'efficiency',
  ];
  const safeSort = allowedSorts.includes(sortField) ? sortField : 'contract_value';

  rows.sort((a, b) => {
    const av = (a as any)[safeSort];
    const bv = (b as any)[safeSort];
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * sortDir;
    }
    return ((av as number) - (bv as number)) * sortDir;
  });

  return rows;
}

export function computeTotals(rows: CommercialRow[]): CommercialTotals {
  const total = rows.reduce(
    (acc, r) => ({
      contract: acc.contract + r.contract_value,
      billed: acc.billed + r.billed,
      collected: acc.collected + r.collected,
      unbilled: acc.unbilled + r.unbilled,
      overdue: acc.overdue + r.overdue,
      aging_0_30: acc.aging_0_30 + r.aging_0_30,
      aging_31_60: acc.aging_31_60 + r.aging_31_60,
      aging_61_90: acc.aging_61_90 + r.aging_61_90,
      aging_90_plus: acc.aging_90_plus + r.aging_90_plus,
    }),
    {
      contract: 0,
      billed: 0,
      collected: 0,
      unbilled: 0,
      overdue: 0,
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_90_plus: 0,
    }
  );
  return {
    ...total,
    efficiency: total.billed > 0 ? (total.collected / total.billed) * 100 : 0,
  };
}

export async function getCashFlow(
  months: number = 6
): Promise<CashFlowPoint[]> {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('id')
    .eq('archived', false);

  const projectIds = (projects ?? []).map((p: any) => p.id);
  if (projectIds.length === 0) return [];

  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data: billings } = await supabase
    .from('billing')
    .select('amount, billed_at')
    .in('project_id', projectIds)
    .gte('billed_at', since.toISOString().slice(0, 10));

  const { data: collections } = await supabase
    .from('collections')
    .select('amount, collected_at')
    .in('project_id', projectIds)
    .gte('collected_at', since.toISOString().slice(0, 10));

  const buckets = new Map<string, { billed: number; collected: number }>();

  for (let i = 0; i < months; i++) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { billed: 0, collected: 0 });
  }

  for (const b of billings ?? []) {
    const key = (b.billed_at ?? '').slice(0, 7);
    const cur = buckets.get(key);
    if (cur) cur.billed += Number(b.amount);
  }

  for (const c of collections ?? []) {
    const key = (c.collected_at ?? '').slice(0, 7);
    const cur = buckets.get(key);
    if (cur) cur.collected += Number(c.amount);
  }

  return Array.from(buckets.entries()).map(([month, v]) => {
    const [y, m] = month.split('-');
    const label = new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-GB', {
      month: 'short',
    });
    return { month, label, ...v };
  });
}
