import Link from 'next/link';
import {
  getDashboardMetrics,
  getRecentExceptions,
  getRecentProjects,
  getTodayReminders,
} from '@/lib/queries/dashboard';
import { KpiCard } from './kpi-card';
import { StageDistribution, HealthDistribution } from './charts';
import { ExceptionsFeed } from './exceptions-feed';
import { ProjectsTable } from './projects-table';
import { RemindersPanel } from './reminders-panel';
import { TimeFilter } from './time-filter';
import { ExportPdfButton } from './export-pdf-button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, pct, timeAgo, shortDate } from '@/lib/format';
import {
  Building2,
  AlertTriangle,
  TrendingUp,
  ScrollText,
  Bell,
  FileText,
  Target,
  Banknote,
  ArrowRight,
  Activity,
  CalendarClock,
  Wallet,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [metrics, exceptions, projects, reminders] = await Promise.all([
    getDashboardMetrics(),
    getRecentExceptions(5),
    getRecentProjects(6),
    getTodayReminders(4),
  ]);

  const syncLabel = metrics.lastSync ? timeAgo(metrics.lastSync) : 'never';

  const sevColor: Record<string, string> = {
    critical: 'border-l-red-500',
    high: 'border-l-amber-500',
    medium: 'border-l-blue-400',
  };

  const sevBadge: Record<string, 'red' | 'amber' | 'outline'> = {
    critical: 'red',
    high: 'amber',
    medium: 'outline',
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Owner Command Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Portfolio health as of{' '}
            {new Date().toLocaleString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}{' '}
            UTC
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground hidden md:block">
            recomputeProjectState() ran {syncLabel}
          </span>
          <TimeFilter />
          <ExportPdfButton
            snapshot={{
              generatedAt: new Date().toLocaleString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }),
              rangeLabel: '30 days',
              kpis: [
                {
                  label: 'Active Project Value',
                  value: formatMoney(metrics.totalContractValue, 'INR'),
                  sub: `${metrics.activeProjects} active`,
                },
                {
                  label: 'Collection',
                  value: pct(metrics.collectionEfficiency),
                  sub: formatMoney(metrics.totalCollected, 'INR'),
                },
                {
                  label: 'Exceptions',
                  value: String(metrics.openExceptions),
                  sub: `${metrics.criticalExceptions} critical`,
                },
                {
                  label: 'Overdue Reminders',
                  value: String(metrics.overdueReminders),
                  sub: metrics.overdueReminders === 0 ? 'all clear' : 'past due',
                },
                {
                  label: 'Billed',
                  value: formatMoney(metrics.totalBilled, 'INR'),
                  sub: 'to date',
                },
                {
                  label: 'Unbilled',
                  value: formatMoney(metrics.totalUnbilled, 'INR'),
                  sub: 'billed - collected',
                },
                {
                  label: 'Execution',
                  value: pct(metrics.avgExecutionProgress),
                  sub: 'weighted',
                },
                {
                  label: 'Attention',
                  value: String(metrics.attention.length),
                  sub: 'items',
                },
              ],
              attention: metrics.attention.map((a) => ({
                project: a.project_code,
                message: a.message,
                severity: a.severity,
              })),
              milestones: metrics.milestones.map((m) => ({
                project: m.project_code,
                name: m.project_name,
                end_date: m.end_date,
                days: m.days_away,
              })),
              cash: {
                billed: formatMoney(metrics.cash.billed_30d, 'INR'),
                collected: formatMoney(metrics.cash.collected_30d, 'INR'),
                rate: pct(metrics.cash.collection_rate_30d),
                overdue: formatMoney(metrics.cash.overdue_total, 'INR'),
              },
              topProjects: projects.slice(0, 8).map((p: any) => ({
                code: p.code,
                name: p.name,
                health: p.health,
                value: formatMoney(Number(p.contract_value), p.currency ?? 'INR'),
              })),
            }}
          />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={Building2}
          label="Total Active Project Value"
          value={formatMoney(metrics.totalContractValue, 'INR')}
          sub={`Across ${metrics.activeProjects} active projects`}
          accent
          href="/projects"
          className="lg:col-span-2"
        />
        <KpiCard
          icon={AlertTriangle}
          label={metrics.critical + metrics.atRisk > 0 ? 'Needs Intervention' : 'Portfolio Health'}
          value={
            metrics.critical + metrics.atRisk > 0
              ? `${metrics.critical + metrics.atRisk} project${metrics.critical + metrics.atRisk === 1 ? '' : 's'}`
              : 'All clear'
          }
          sub={
            metrics.critical + metrics.atRisk > 0
              ? `${metrics.critical} critical · ${metrics.atRisk} at-risk`
              : `${metrics.onTrack} on track`
          }
          warning={metrics.critical + metrics.atRisk > 0}
          href="/projects"
        />
        <KpiCard
          icon={TrendingUp}
          label="Collection Efficiency"
          value={pct(metrics.collectionEfficiency)}
          sub={`${formatMoney(metrics.totalCollected, 'INR')} of ${formatMoney(metrics.totalBilled, 'INR')}`}
          trend={metrics.deltas.collected}
          href="/commercial"
        />
        <KpiCard
          icon={ScrollText}
          label="Unresolved Exceptions"
          value={String(metrics.openExceptions)}
          sub={`${metrics.criticalExceptions} critical · ${metrics.highExceptions} high · ${metrics.mediumExceptions} medium`}
          trend={metrics.deltas.exceptions_opened}
          href="/exceptions"
        />
        <KpiCard
          icon={Bell}
          label="Overdue Reminders"
          value={String(metrics.overdueReminders)}
          sub={metrics.overdueReminders === 0 ? 'All clear' : 'Past due'}
          warning={metrics.overdueReminders > 0}
          href="/reminders"
        />
        <KpiCard
          icon={FileText}
          label="Billed to Date"
          value={formatMoney(metrics.totalBilled, 'INR')}
          sub={
            metrics.totalContractValue > 0
              ? `${((metrics.totalBilled / metrics.totalContractValue) * 100).toFixed(1)}% of contract`
              : 'No invoices raised yet'
          }
          trend={metrics.deltas.billed}
          href="/commercial"
        />
        <KpiCard
          icon={Target}
          label="Avg Execution Progress"
          value={pct(metrics.avgExecutionProgress)}
          sub="Weighted across execution-stage projects"
        />
        <KpiCard
          icon={Banknote}
          label="Unbilled Revenue"
          value={formatMoney(metrics.totalUnbilled, 'INR')}
          sub="Billed but not yet collected"
          href="/commercial"
        />
      </div>

      {/* Needs Attention + Cash Snapshot row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5 bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h3 className="font-semibold">Needs Attention</h3>
              {metrics.attention.length > 0 && (
                <Badge variant="red" className="text-[10px]">
                  {metrics.attention.length}
                </Badge>
              )}
            </div>
            <Link href="/exceptions" className="text-xs text-brand hover:underline">
              View all →
            </Link>
          </div>
          {metrics.attention.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nothing needs your attention. Portfolio is clean.
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.attention.map((item) => (
                <Link
                  key={item.id}
                  href={`/projects/${item.project_id}`}
                  className={`block rounded-md border-l-2 bg-background/40 hover:bg-background/70 transition-colors p-3 ${sevColor[item.severity] ?? 'border-l-border'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[10px] text-brand">
                          {item.project_code}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {item.project_name}
                        </span>
                        <Badge
                          variant={sevBadge[item.severity] ?? 'outline'}
                          className="text-[9px]"
                        >
                          {item.severity}
                        </Badge>
                      </div>
                      <div className="text-sm leading-snug">{item.message}</div>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold">Cash Snapshot</h3>
          </div>
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
            Last 30 days
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Billed</span>
              <span className="font-mono text-sm">
                {formatMoney(metrics.cash.billed_30d, 'INR')}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Collected</span>
              <span className="font-mono text-sm text-emerald-500">
                {formatMoney(metrics.cash.collected_30d, 'INR')}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Collection Rate</span>
              <span className="font-mono text-sm font-semibold">
                {pct(metrics.cash.collection_rate_30d)}
              </span>
            </div>
          </div>

          {metrics.cash.overdue_total > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-[10px] font-mono tracking-widest text-red-400 uppercase mb-2">
                Overdue
              </div>
              <div className="text-lg font-semibold text-red-400">
                {formatMoney(metrics.cash.overdue_total, 'INR')}
              </div>
            </div>
          )}

          <Link
            href="/commercial"
            className="mt-4 inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline font-medium"
          >
            View full commercial →
          </Link>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <StageDistribution data={metrics.stageDistribution} />
        </div>
        <HealthDistribution
          onTrack={metrics.onTrack}
          atRisk={metrics.atRisk}
          critical={metrics.critical}
          onHold={metrics.onHold}
        />
      </div>

      {/* Activity + Milestones row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2 p-5 bg-card/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              <h3 className="font-semibold">Recent Activity</h3>
            </div>
            <Link href="/audit" className="text-xs text-brand hover:underline">
              Full audit log →
            </Link>
          </div>
          {metrics.activity.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No activity yet.
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.activity.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-md border border-border/50 p-3 bg-background/30"
                >
                  <div className="h-7 w-7 rounded-md bg-brand/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Activity className="h-3.5 w-3.5 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm leading-snug">{a.summary}</div>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1 flex items-center gap-3">
                      {a.project_code && a.project_id && (
                        <Link
                          href={`/projects/${a.project_id}`}
                          className="text-brand hover:underline"
                        >
                          {a.project_code}
                        </Link>
                      )}
                      <span>{timeAgo(a.when)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Closing Soon</h3>
          </div>
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
            Next 30 days
          </div>
          {metrics.milestones.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No projects ending in the next 30 days.
            </div>
          ) : (
            <div className="space-y-3">
              {metrics.milestones.map((m) => (
                <Link
                  key={m.id}
                  href={`/projects/${m.project_id}`}
                  className="block rounded-md border border-border/50 p-3 bg-background/30 hover:bg-background/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-mono text-[10px] text-brand">
                      {m.project_code}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {m.days_away === 0
                        ? 'today'
                        : m.days_away === 1
                        ? 'tomorrow'
                        : `${m.days_away}d`}
                    </span>
                  </div>
                  <div className="text-xs leading-snug truncate">
                    {m.project_name}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">
                    {shortDate(m.end_date)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Feeds Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ExceptionsFeed rows={exceptions as any} />
        <ProjectsTable rows={projects as any} />
        <RemindersPanel rows={reminders as any} />
      </div>
    </div>
  );
}
