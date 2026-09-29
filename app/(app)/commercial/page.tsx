import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import {
  getCommercialRows,
  computeTotals,
  getCashFlow,
} from '@/lib/queries/commercial';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, pct } from '@/lib/format';
import {
  TrendingUp,
  AlertTriangle,
  Banknote,
  FileText,
  Lock,
  Clock,
} from 'lucide-react';
import { CommercialToolbar } from './commercial-toolbar';
import { CommercialTable } from './commercial-table';
import { CashFlowChart } from './cash-flow-chart';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  range?: string;
  client?: string | string[];
  currency?: string | string[];
  sort?: string;
  dir?: 'asc' | 'desc';
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function CommercialPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);
  const canSeeUnbilled = orgPlan?.canUse('unbilled_revenue_tracking') ?? false;

  // Fetch data
  const [rows, cashFlow, allClientData, allCurrencyData] = await Promise.all([
    getCommercialRows({
      range: (searchParams.range as any) ?? '30d',
      q: searchParams.q,
      client: toArray(searchParams.client),
      currency: toArray(searchParams.currency),
      sort: searchParams.sort,
      dir: searchParams.dir,
    }),
    getCashFlow(6),
    supabase.from('clients').select('name').order('name'),
    supabase.from('projects').select('currency').eq('archived', false),
  ]);

  const totals = computeTotals(rows);

  // Fetch invoices + collections for those rows (only for the drawer)
  const projectIds = rows.map((r) => r.id);
  const invoicesByProject: Record<string, any[]> = {};
  const collectionsByProject: Record<string, any[]> = {};

  if (projectIds.length > 0) {
    const { data: invoices } = await supabase
      .from('billing')
      .select('id, project_id, invoice_no, amount, billed_at, due_at, status')
      .in('project_id', projectIds)
      .order('billed_at', { ascending: false });

    for (const inv of invoices ?? []) {
      if (!invoicesByProject[inv.project_id]) invoicesByProject[inv.project_id] = [];
      invoicesByProject[inv.project_id].push({
        id: inv.id,
        invoice_no: inv.invoice_no,
        amount: Number(inv.amount),
        billed_at: inv.billed_at,
        due_at: inv.due_at,
        status: inv.status,
      });
    }

    const { data: collections } = await supabase
      .from('collections')
      .select('id, project_id, amount, collected_at, reference')
      .in('project_id', projectIds)
      .order('collected_at', { ascending: false });

    for (const c of collections ?? []) {
      if (!collectionsByProject[c.project_id]) collectionsByProject[c.project_id] = [];
      collectionsByProject[c.project_id].push({
        id: c.id,
        amount: Number(c.amount),
        collected_at: c.collected_at,
        reference: c.reference,
      });
    }
  }

  // Distinct clients
  const clients = Array.from(
    new Set((allClientData.data ?? []).map((c: any) => c.name).filter(Boolean))
  );

  // Total unfiltered count
  const { count: totalCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('archived', false);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Commercial Visibility
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Execution vs Billing vs Collection across portfolio
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <FileText className="h-3 w-3" /> Total Contract
          </div>
          <div className="text-2xl font-semibold">
            {formatMoney(totals.contract, 'INR')}
          </div>
        </Card>
        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <TrendingUp className="h-3 w-3" /> Billed
          </div>
          <div className="text-2xl font-semibold">
            {formatMoney(totals.billed, 'INR')}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">
            {pct(totals.contract > 0 ? (totals.billed / totals.contract) * 100 : 0)} of contract
          </div>
        </Card>
        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <Banknote className="h-3 w-3" /> Collected
          </div>
          <div className="text-2xl font-semibold text-emerald-400">
            {formatMoney(totals.collected, 'INR')}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono mt-1">
            {pct(totals.efficiency)} collection efficiency
          </div>
        </Card>

        {canSeeUnbilled ? (
          <Card className="p-5 bg-card/50 border-amber-500/30">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-amber-400 uppercase mb-2">
              <AlertTriangle className="h-3 w-3" /> Unbilled + Overdue
            </div>
            <div className="text-2xl font-semibold text-amber-400">
              {formatMoney(totals.unbilled, 'INR')}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono mt-1">
              {formatMoney(totals.overdue, 'INR')} overdue
            </div>
          </Card>
        ) : (
          <Card className="p-5 bg-card/50 border-dashed">
            <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
              <Lock className="h-3 w-3" /> Unbilled Revenue
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="font-mono text-[9px]">
                PRO
              </Badge>
            </div>
            <a
              href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock Unbilled Revenue Tracking"
              className="text-[10px] text-brand-cyan hover:underline font-medium"
            >
              Upgrade to Pro →
            </a>
          </Card>
        )}
      </div>

      {/* Aging buckets (only if Pro+ and there's overdue) */}
      {canSeeUnbilled && totals.overdue > 0 && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <AgingCard
            label="0-30 days"
            value={totals.aging_0_30}
            tone="mild"
          />
          <AgingCard
            label="31-60 days"
            value={totals.aging_31_60}
            tone="warn"
          />
          <AgingCard
            label="61-90 days"
            value={totals.aging_61_90}
            tone="warn"
          />
          <AgingCard
            label="90+ days"
            value={totals.aging_90_plus}
            tone="danger"
          />
        </div>
      )}

      {/* Cash flow chart */}
      <div className="mb-6">
        <CashFlowChart data={cashFlow} />
      </div>

      {/* Toolbar */}
      <div className="mb-4">
        <CommercialToolbar
          clients={clients}
          totalCount={totalCount ?? 0}
          filteredCount={rows.length}
        />
      </div>

      {/* Table */}
      <CommercialTable
        rows={rows}
        invoicesByProject={invoicesByProject}
        collectionsByProject={collectionsByProject}
        totals={totals}
        canSeeUnbilled={canSeeUnbilled}
      />
    </div>
  );
}

function AgingCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'mild' | 'warn' | 'danger';
}) {
  const colorClass =
    tone === 'mild'
      ? 'text-amber-300'
      : tone === 'warn'
      ? 'text-amber-400'
      : 'text-red-400';
  const borderClass =
    tone === 'mild'
      ? 'border-amber-300/30'
      : tone === 'warn'
      ? 'border-amber-400/40'
      : 'border-red-500/40';

  return (
    <Card className={`p-4 bg-card/50 ${borderClass}`}>
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {label}
      </div>
      <div className={`text-lg font-semibold ${colorClass}`}>
        {formatMoney(value, 'INR')}
      </div>
    </Card>
  );
}
