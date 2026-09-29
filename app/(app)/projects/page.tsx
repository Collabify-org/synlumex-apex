import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canCreateProject } from '@/lib/limits';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STAGES, type HealthStatus } from '@/lib/types';
import { formatMoney, shortDate } from '@/lib/format';
import { Plus, AlertTriangle, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

const healthVariant: Record<HealthStatus, 'green' | 'amber' | 'red' | 'secondary'> = {
  green: 'green',
  amber: 'amber',
  red: 'red',
  on_hold: 'secondary',
};

const healthLabel: Record<HealthStatus, string> = {
  green: 'On Track',
  amber: 'At Risk',
  red: 'Critical',
  on_hold: 'On Hold',
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('archived', false)
    .order('updated_at', { ascending: false });

  const rows = projects ?? [];

  const limit = await canCreateProject(supabase);
  const usage =
    limit.limit !== null
      ? Math.round((limit.used / limit.limit) * 100)
      : null;

  const showWarning = usage !== null && usage >= 70 && usage < 100;
  const showLocked = usage !== null && usage >= 100;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rows.length} active project{rows.length === 1 ? '' : 's'}
            {limit.limit !== null && ` · ${limit.used} / ${limit.limit} on your plan`}
          </p>
        </div>
        {!showLocked && (
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> New Project
          </Link>
        )}
      </div>

      {/* Usage warning banner (70-99%) */}
      {showWarning && (
        <Card className="mb-4 p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                You&apos;re using {usage}% of your project allowance
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {limit.used} of {limit.limit} projects used. Upgrade to add more before you hit the cap.
              </div>
            </div>
            <a href="mailto:abdul@synlumexai.com?subject=Upgrade to add more projects">
              <button className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1">
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </button>
            </a>
          </div>
        </Card>
      )}

      {/* Locked banner (100%) */}
      {showLocked && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                You&apos;ve reached your plan limit
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {limit.limit} active projects maximum. Archive a project or upgrade to add more.
              </div>
            </div>
            <a href="mailto:abdul@synlumexai.com?subject=Upgrade to add more projects">
              <button className="text-xs text-destructive hover:opacity-80 font-medium inline-flex items-center gap-1">
                Upgrade Plan
                <ArrowRight className="h-3 w-3" />
              </button>
            </a>
          </div>
        </Card>
      )}

      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">CODE</th>
                <th className="text-left p-3 font-normal">NAME</th>
                <th className="text-left p-3 font-normal">CLIENT</th>
                <th className="text-left p-3 font-normal">STAGE</th>
                <th className="text-left p-3 font-normal">HEALTH</th>
                <th className="text-right p-3 font-normal">CONTRACT</th>
                <th className="text-right p-3 font-normal">END DATE</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    No projects yet. Click <span className="text-brand">New Project</span> to begin.
                  </td>
                </tr>
              ) : (
                rows.map((p: any) => {
                  const stage = STAGES.find((s) => s.key === p.current_stage);
                  const clientName = Array.isArray(p.clients) ? p.clients[0]?.name : p.clients?.name;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-accent/30">
                      <td className="p-3 font-mono text-xs text-brand">
                        <Link href={`/projects/${p.id}`}>{p.code}</Link>
                      </td>
                      <td className="p-3">
                        <Link href={`/projects/${p.id}`} className="hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{clientName ?? '—'}</td>
                      <td className="p-3 text-xs text-muted-foreground">{stage?.label ?? p.current_stage}</td>
                      <td className="p-3">
                        <Badge variant={healthVariant[p.health as HealthStatus]}>
                          {healthLabel[p.health as HealthStatus]}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-xs">
                        {formatMoney(Number(p.contract_value), p.currency)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground">
                        {shortDate(p.end_date)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
