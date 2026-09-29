import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import {
  listAudit,
  getAuditKpis,
  getDistinctActors,
  type AuditCategory,
} from '@/lib/queries/audit';
import { Card } from '@/components/ui/card';
import { ScrollText, Users, Cog, Activity } from 'lucide-react';
import { AuditToolbar } from './audit-toolbar';
import { AuditTable } from './audit-table';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  category?: AuditCategory;
  actor_id?: string;
  range?: string;
  page?: string;
  pageSize?: string;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);
  const canExport = orgPlan?.canUse('audit_export') ?? false;

  const page = searchParams.page ? parseInt(searchParams.page, 10) : 1;
  const pageSize = searchParams.pageSize
    ? parseInt(searchParams.pageSize, 10)
    : 50;

  // Handle special "__system__" actor filter
  const actorFilter =
    searchParams.actor_id === '__system__' ? undefined : searchParams.actor_id;

  const [result, kpis, actors] = await Promise.all([
    listAudit({
      q: searchParams.q,
      category: searchParams.category ?? 'all',
      actor_id: actorFilter,
      range: (searchParams.range as any) ?? '30d',
      page,
      pageSize,
    }),
    getAuditKpis(),
    getDistinctActors(),
  ]);

  // If "system only" was selected, filter in-memory (since listAudit can't do NULL actor easily)
  let rows = result.rows;
  if (searchParams.actor_id === '__system__') {
    rows = rows.filter((r) => !r.actor_id);
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-brand" />
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every state change, recompute, and action across the system.
          </p>
        </div>
        {!canExport && (
          <div className="rounded-md border border-dashed border-border px-3 py-2 text-[10px] font-mono tracking-widest text-muted-foreground">
            ENTERPRISE
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <KpiCell
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Total Events"
          value={String(kpis.total)}
        />
        <KpiCell
          icon={<Users className="h-3.5 w-3.5" />}
          label="Human Actions"
          value={String(kpis.human)}
          color="brand"
        />
        <KpiCell
          icon={<Cog className="h-3.5 w-3.5" />}
          label="System Events"
          value={String(kpis.system)}
        />
        <KpiCell
          icon={<ScrollText className="h-3.5 w-3.5" />}
          label="Today"
          value={String(kpis.today)}
          color="emerald"
        />
      </div>

      {/* Toolbar */}
      <div className="mb-4">
        <AuditToolbar
          actors={actors}
          totalCount={kpis.total}
          filteredCount={result.total}
        />
      </div>

      {/* Table */}
      <AuditTable
        rows={rows}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        totalPages={result.totalPages}
      />
    </div>
  );
}

function KpiCell({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'brand' | 'emerald';
}) {
  const colorClass =
    color === 'brand'
      ? 'text-brand'
      : color === 'emerald'
      ? 'text-emerald-500'
      : 'text-foreground';

  return (
    <Card className="p-3 bg-card/50">
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className={cn('text-lg font-semibold', colorClass)}>{value}</div>
    </Card>
  );
}

// Local `cn` fallback (small)
function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
