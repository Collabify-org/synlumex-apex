import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, pct } from '@/lib/format';
import {
  Brain,
  TrendingUp,
  Clock,
  AlertTriangle,
  Globe,
  Target,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { STAGES } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function IntelligencePage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

  // Gate: Historical Intelligence is Pro+ only
  if (!orgPlan?.canUse('historical_intelligence')) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-8 bg-card/50 border-dashed text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Historical Intelligence</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              PRO
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Compounding insights from your past projects — average durations, common delay
            causes, drop-off stages, and lifetime value processed. Everything gets sharper
            with every project you complete.
          </p>
          <a
            href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock Historical Intelligence"
            className="inline-flex items-center gap-2 rounded-md brand-gradient text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Upgrade to Pro
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Card>
      </div>
    );
  }

  // Full Intelligence page for Pro+
  const { data: projects } = await supabase.from('projects').select('*');
  const { data: exceptions } = await supabase.from('exceptions').select('type, severity');
  const { data: billing } = await supabase.from('billing').select('amount, status');
  const { data: collections } = await supabase.from('collections').select('amount');

  const ps = projects ?? [];
  const es = exceptions ?? [];
  const bs = billing ?? [];
  const cs = collections ?? [];

  const durations = ps
    .filter((p) => p.start_date && p.end_date)
    .map((p) => (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) / 86400000);
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const causeMap = new Map<string, number>();
  es.forEach((e) => causeMap.set(e.type, (causeMap.get(e.type) ?? 0) + 1));
  const topCauses = Array.from(causeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const currMap = new Map<string, number>();
  ps.forEach((p) =>
    currMap.set(p.currency, (currMap.get(p.currency) ?? 0) + Number(p.contract_value))
  );
  const currencyBreakdown = Array.from(currMap.entries());

  const stageMap = new Map<string, number>();
  ps.forEach((p) =>
    stageMap.set(p.current_stage, (stageMap.get(p.current_stage) ?? 0) + 1)
  );

  const totalContract = ps.reduce((s, p) => s + Number(p.contract_value), 0);
  const totalBilled = bs.reduce((s, b) => s + Number(b.amount), 0);
  const totalCollected = cs.reduce((s, c) => s + Number(c.amount), 0);

  const healthCounts = {
    green: ps.filter((p) => p.health === 'green').length,
    amber: ps.filter((p) => p.health === 'amber').length,
    red: ps.filter((p) => p.health === 'red').length,
    on_hold: ps.filter((p) => p.health === 'on_hold').length,
  };

  const activeWithEnd = ps.filter((p) => p.end_date && !p.archived);
  const avgDaysToEnd = activeWithEnd.length > 0
    ? Math.round(
        activeWithEnd.reduce(
          (s, p) => s + (new Date(p.end_date!).getTime() - Date.now()) / 86400000,
          0
        ) / activeWithEnd.length
      )
    : 0;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-brand" /> Historical Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compounding insights from {ps.length} projects · every future project gets smarter
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <Clock className="h-3 w-3" /> Avg Project Duration
          </div>
          <div className="text-3xl font-semibold text-brand">{avgDuration} days</div>
          <div className="text-xs text-muted-foreground mt-1">
            ≈ {Math.round(avgDuration / 30)} months across portfolio
          </div>
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <Target className="h-3 w-3" /> Avg Days to Contract End
          </div>
          <div className="text-3xl font-semibold">{avgDaysToEnd} days</div>
          <div className="text-xs text-muted-foreground mt-1">
            Across {activeWithEnd.length} active projects
          </div>
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
            <TrendingUp className="h-3 w-3" /> Lifetime Value Processed
          </div>
          <div className="text-3xl font-semibold">{formatMoney(totalContract, 'INR')}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {formatMoney(totalCollected, 'INR')} collected
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Top Exception Causes
          </h3>
          {topCauses.length === 0 ? (
            <p className="text-xs text-muted-foreground">No exceptions logged yet.</p>
          ) : (
            <div className="space-y-3">
              {topCauses.map(([type, count], i) => {
                const pctOfTotal = (count / es.length) * 100;
                return (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(i + 1).padStart(2, '0')} · {type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs font-mono">
                        {count} ({pctOfTotal.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full"
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" /> Currency Exposure
          </h3>
          {currencyBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {currencyBreakdown.map(([currency, value]) => {
                const pctOfTotal = (value / totalContract) * 100;
                return (
                  <div key={currency}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono">{currency}</span>
                      <span className="text-xs font-mono">
                        {formatMoney(value, currency as any)} ({pctOfTotal.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${pctOfTotal}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5 bg-card/50 mb-6">
        <h3 className="font-semibold mb-4">Portfolio Health Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
              On Track
            </div>
            <div className="text-2xl font-semibold text-emerald-400">{healthCounts.green}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
              At Risk
            </div>
            <div className="text-2xl font-semibold text-amber-400">{healthCounts.amber}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
              Critical
            </div>
            <div className="text-2xl font-semibold text-red-400">{healthCounts.red}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
              On Hold
            </div>
            <div className="text-2xl font-semibold text-muted-foreground">{healthCounts.on_hold}</div>
          </div>
        </div>
      </Card>

      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-4">Stage Distribution Across Portfolio</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((s) => {
            const count = stageMap.get(s.key) ?? 0;
            return (
              <div
                key={s.key}
                className={`rounded-md px-3 py-2 min-w-[76px] text-center ${
                  count > 0
                    ? 'bg-brand/10 border border-brand/30'
                    : 'bg-muted/30 border border-border'
                }`}
              >
                <div className="text-[10px] font-mono text-muted-foreground">{s.short}</div>
                <div
                  className={`text-lg font-semibold ${
                    count > 0 ? 'text-brand' : 'text-muted-foreground'
                  }`}
                >
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
