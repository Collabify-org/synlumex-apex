import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { getIntelligenceData, type IntelRange } from '@/lib/queries/intelligence';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, pct } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Brain,
  TrendingUp,
  Clock,
  AlertTriangle,
  Globe,
  Target,
  Lock,
  ArrowRight,
  Building2,
  BarChart3,
} from 'lucide-react';
import { STAGES } from '@/lib/types';
import { IntelToolbar } from './intel-toolbar';
import { TrendChart } from './trend-chart';
import { IntelKpi } from './intel-kpi';

export const dynamic = 'force-dynamic';

type SearchParams = { range?: IntelRange };

export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

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
            Compounding insights from your past projects — average durations,
            common delay causes, drop-off stages, and lifetime value processed.
            Everything gets sharper with every project you complete.
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

  const data = await getIntelligenceData(searchParams.range ?? 'all');

  const rangeLabel =
    searchParams.range === '90d'
      ? 'last 90 days'
      : searchParams.range === '180d'
      ? 'last 6 months'
      : searchParams.range === '365d'
      ? 'last 12 months'
      : 'all time';

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-brand" /> Historical Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compounding insights from {data.totalProjects} project
            {data.totalProjects === 1 ? '' : 's'} · showing {rangeLabel}
          </p>
        </div>
        <IntelToolbar />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <IntelKpi
          icon={Clock}
          label="Avg Project Duration"
          value={`${data.avgDuration.current} days`}
          sub={`≈ ${Math.round(data.avgDuration.current / 30)} months across portfolio`}
          delta={data.avgDuration}
        />
        <IntelKpi
          icon={Target}
          label="Avg Days to Contract End"
          value={`${data.avgDaysToEnd.current} days`}
          sub={`Across ${data.totalProjects} active projects`}
          delta={data.avgDaysToEnd}
        />
        <IntelKpi
          icon={TrendingUp}
          label="Lifetime Value Processed"
          value={formatMoney(data.lifetimeValue.current, 'INR')}
          sub={`${formatMoney(data.currencyExposure.find((c) => c.currency === 'INR')?.value ?? 0, 'INR')} in INR contracts`}
          delta={data.lifetimeValue}
        />
      </div>

      {/* Trend chart */}
      <div className="mb-6">
        <TrendChart data={data.monthlyTrend} />
      </div>

      {/* Exceptions + Currency row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <h3 className="font-semibold">Top Exception Causes</h3>
            </div>
            <Link
              href="/exceptions"
              className="text-xs text-brand hover:underline"
            >
              View all →
            </Link>
          </div>
          {data.exceptionCauses.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">
              No exceptions logged yet.
            </p>
          ) : (
            <div className="space-y-3">
              {data.exceptionCauses.map((cause, i) => (
                <Link
                  key={cause.type}
                  href={`/exceptions?q=${encodeURIComponent(cause.type)}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-1 group-hover:text-foreground">
                    <span className="text-xs font-mono text-muted-foreground group-hover:text-foreground">
                      {String(i + 1).padStart(2, '0')} ·{' '}
                      {cause.type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono">
                      {cause.count} ({cause.percent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full group-hover:bg-brand-cyan transition-colors"
                      style={{ width: `${cause.percent}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-5">
            <Globe className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Currency Exposure</h3>
          </div>
          {data.currencyExposure.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No projects yet.</p>
          ) : (
            <div className="space-y-3">
              {data.currencyExposure.map((c) => (
                <Link
                  key={c.currency}
                  href={`/projects?currency=${c.currency}`}
                  className="block group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono group-hover:text-foreground">
                      {c.currency}
                    </span>
                    <span className="text-xs font-mono">
                      {formatMoney(c.value, c.currency as any)} ({c.percent.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full group-hover:bg-blue-500 transition-colors"
                      style={{ width: `${c.percent}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Health snapshot — clickable */}
      <Card className="p-5 bg-card/50 mb-6">
        <h3 className="font-semibold mb-4">Portfolio Health Snapshot</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <HealthTile
            label="On Track"
            value={data.healthSnapshot.onTrack}
            color="emerald"
            href="/projects?health=green"
          />
          <HealthTile
            label="At Risk"
            value={data.healthSnapshot.atRisk}
            color="amber"
            href="/projects?health=amber"
          />
          <HealthTile
            label="Critical"
            value={data.healthSnapshot.critical}
            color="red"
            href="/projects?health=red"
          />
          <HealthTile
            label="On Hold"
            value={data.healthSnapshot.onHold}
            color="slate"
            href="/projects?health=on_hold"
          />
        </div>
      </Card>

      {/* Stage distribution — clickable */}
      <Card className="p-5 bg-card/50 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Stage Distribution Across Portfolio</h3>
          <Link
            href="/projects"
            className="text-xs text-brand hover:underline"
          >
            View all →
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {STAGES.map((s) => {
            const bucket = data.stageDistribution.find((b) => b.stage === s.key);
            const count = bucket?.count ?? 0;
            return (
              <Link
                key={s.key}
                href={`/projects?stage=${s.key}`}
                className={cn(
                  'rounded-md px-3 py-2 min-w-[76px] text-center transition-colors',
                  count > 0
                    ? 'bg-brand/10 border border-brand/30 hover:bg-brand/20'
                    : 'bg-muted/30 border border-border hover:bg-muted/50'
                )}
              >
                <div className="text-[10px] font-mono text-muted-foreground">
                  {s.short}
                </div>
                <div
                  className={cn(
                    'text-lg font-semibold',
                    count > 0 ? 'text-brand' : 'text-muted-foreground'
                  )}
                >
                  {count}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {/* Duration distribution */}
      <Card className="p-5 bg-card/50 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Duration Distribution</h3>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {data.durationDistribution.map((b) => (
            <div
              key={b.range}
              className="rounded-md border border-border bg-card/40 p-3 text-center"
            >
              <div className="text-[10px] font-mono text-muted-foreground mb-1">
                {b.range} days
              </div>
              <div className="text-2xl font-semibold">{b.count}</div>
              <div className="text-[9px] font-mono text-muted-foreground mt-1">
                project{b.count === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Client LTV */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Top Clients by Value</h3>
        </div>
        {data.clientLtv.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            No client data yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                  <th className="text-left p-2 font-normal">CLIENT</th>
                  <th className="text-right p-2 font-normal">PROJECTS</th>
                  <th className="text-right p-2 font-normal">TOTAL VALUE</th>
                  <th className="text-right p-2 font-normal">COLLECTED</th>
                  <th className="text-right p-2 font-normal">EFFICIENCY</th>
                </tr>
              </thead>
              <tbody>
                {data.clientLtv.map((c) => (
                  <tr
                    key={c.client_name}
                    className="border-t border-border hover:bg-accent/30"
                  >
                    <td className="p-2 text-xs">
                      <Link
                        href={`/projects?client=${encodeURIComponent(c.client_name)}`}
                        className="hover:underline"
                      >
                        {c.client_name}
                      </Link>
                    </td>
                    <td className="p-2 text-right font-mono text-xs">
                      {c.project_count}
                    </td>
                    <td className="p-2 text-right font-mono text-xs">
                      {formatMoney(c.total_value, 'INR')}
                    </td>
                    <td className="p-2 text-right font-mono text-xs text-emerald-400">
                      {c.total_collected > 0
                        ? formatMoney(c.total_collected, 'INR')
                        : '—'}
                    </td>
                    <td className="p-2 text-right font-mono text-xs">
                      {c.avg_efficiency > 0 ? pct(c.avg_efficiency) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function HealthTile({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'red' | 'slate';
  href: string;
}) {
  const colorClass =
    color === 'emerald'
      ? 'text-emerald-400'
      : color === 'amber'
      ? 'text-amber-400'
      : color === 'red'
      ? 'text-red-400'
      : 'text-muted-foreground';

  return (
    <Link href={href} className="block group">
      <div className="rounded-md border border-border bg-card/40 p-4 hover:border-brand-cyan/40 hover:bg-card/60 transition-all cursor-pointer">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
          {label}
        </div>
        <div className={cn('text-2xl font-semibold', colorClass)}>{value}</div>
      </div>
    </Link>
  );
}
