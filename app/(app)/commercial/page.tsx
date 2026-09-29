import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, pct } from '@/lib/format';
import { TrendingUp, AlertTriangle, Banknote, FileText, Lock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CommercialPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

  const canSeeUnbilled = orgPlan?.canUse('unbilled_revenue_tracking') ?? false;

  // 1. Projects + clients only (no join ambiguity)
  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('archived', false)
    .order('contract_value', { ascending: false });

  const projectIds = (projects ?? []).map((p: any) => p.id);

  // 2. Fetch billing per project (single query, grouped in code)
  const billingByProject = new Map<
    string,
    { amount: number; status: string }[]
  >();

  // 3. Fetch collections per project (single query, grouped in code)
  const collectionsByProject = new Map<string, number>();

  if (projectIds.length > 0) {
    const { data: billings } = await supabase
      .from('billing')
      .select('project_id, amount, status')
      .in('project_id', projectIds);

    for (const b of billings ?? []) {
      const arr = billingByProject.get(b.project_id) ?? [];
      arr.push({ amount: Number(b.amount), status: b.status });
      billingByProject.set(b.project_id, arr);
    }

    const { data: collections } = await supabase
      .from('collections')
      .select('project_id, amount')
      .in('project_id', projectIds);

    for (const c of collections ?? []) {
      const sum = collectionsByProject.get(c.project_id) ?? 0;
      collectionsByProject.set(c.project_id, sum + Number(c.amount));
    }
  }

  const rows = (projects ?? []).map((p: any) => {
    const billings = billingByProject.get(p.id) ?? [];
    const collected = collectionsByProject.get(p.id) ?? 0;
    const billed = billings.reduce((s, b) => s + b.amount, 0);
    const overdue = billings
      .filter((b) => b.status === 'overdue')
      .reduce((s, b) => s + b.amount, 0);
    const unbilled = Math.max(billed - collected, 0);
    const efficiency = billed > 0 ? (collected / billed) * 100 : 0;
    const clientName = Array.isArray(p.clients)
      ? p.clients[0]?.name
      : p.clients?.name;
    return {
      ...p,
      billed,
      collected,
      overdue,
      unbilled,
      efficiency,
      clientName,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      contract: acc.contract + Number(r.contract_value),
      billed: acc.billed + r.billed,
      collected: acc.collected + r.collected,
      overdue: acc.overdue + r.overdue,
      unbilled: acc.unbilled + r.unbilled,
    }),
    { contract: 0, billed: 0, collected: 0, overdue: 0, unbilled: 0 }
  );

  const overallEfficiency =
    totals.billed > 0 ? (totals.collected / totals.billed) * 100 : 0;

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
            {pct(overallEfficiency)} collection efficiency
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

      <Card className="bg-card/50 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">Per-Project Commercial Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">PROJECT</th>
                <th className="text-left p-3 font-normal">CLIENT</th>
                <th className="text-right p-3 font-normal">CONTRACT</th>
                <th className="text-right p-3 font-normal">BILLED</th>
                <th className="text-right p-3 font-normal">COLLECTED</th>
                {canSeeUnbilled && (
                  <>
                    <th className="text-right p-3 font-normal">UNBILLED</th>
                    <th className="text-right p-3 font-normal">OVERDUE</th>
                  </>
                )}
                <th className="text-right p-3 font-normal">EFFICIENCY</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-border hover:bg-accent/30"
                >
                  <td className="p-3 font-mono text-xs">
                    <Link
                      href={`/projects/${r.id}`}
                      className="text-brand hover:underline"
                    >
                      {r.code}
                    </Link>
                    <div className="text-muted-foreground text-[10px] truncate max-w-[200px]">
                      {r.name}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground truncate max-w-[160px]">
                    {r.clientName ?? '—'}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {formatMoney(Number(r.contract_value), r.currency)}
                  </td>
                  <td className="p-3 text-right font-mono text-xs">
                    {r.billed > 0 ? formatMoney(r.billed, r.currency) : '—'}
                  </td>
                  <td className="p-3 text-right font-mono text-xs text-emerald-400">
                    {r.collected > 0 ? formatMoney(r.collected, r.currency) : '—'}
                  </td>
                  {canSeeUnbilled && (
                    <>
                      <td className="p-3 text-right font-mono text-xs text-amber-400">
                        {r.unbilled > 0 ? formatMoney(r.unbilled, r.currency) : '—'}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-red-400">
                        {r.overdue > 0 ? formatMoney(r.overdue, r.currency) : '—'}
                      </td>
                    </>
                  )}
                  <td className="p-3 text-right font-mono text-xs">
                    {r.billed > 0 ? pct(r.efficiency) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/20 border-t-2 border-border">
              <tr className="text-xs font-medium">
                <td colSpan={2} className="p-3 text-right text-muted-foreground">
                  Totals
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatMoney(totals.contract, 'INR')}
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatMoney(totals.billed, 'INR')}
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-emerald-400">
                  {formatMoney(totals.collected, 'INR')}
                </td>
                {canSeeUnbilled && (
                  <>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-amber-400">
                      {formatMoney(totals.unbilled, 'INR')}
                    </td>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-red-400">
                      {formatMoney(totals.overdue, 'INR')}
                    </td>
                  </>
                )}
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap font-semibold">
                  {pct(overallEfficiency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}
