import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { canRunAI } from '@/lib/limits';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { STAGES, type HealthStatus } from '@/lib/types';
import { formatMoney, shortDate } from '@/lib/format';
import { ArrowLeft } from 'lucide-react';
import { BoqTab } from './boq-tab';
import { getOrgPlan } from '@/lib/plan';
import { RiskPanel } from './risk-panel';
import { LifecycleBar } from './lifecycle-bar';

export const dynamic = 'force-dynamic';

const healthVariant: Record<HealthStatus, 'green' | 'amber' | 'red' | 'secondary'> = {
  green: 'green',
  amber: 'amber',
  red: 'red',
  on_hold: 'secondary',
};

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: project } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('id', params.id)
    .single();

  if (!project) notFound();

    const { data: stages } = await supabase
    .from('project_stages')
    .select('*')
    .eq('project_id', params.id);

  // Fetch stage_events + actor names
  const { data: stageEventsRaw } = await supabase
    .from('stage_events')
    .select('id, stage, event_type, actor_id, summary, evidence_url, created_at')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  const stageEventActorIds = Array.from(
    new Set((stageEventsRaw ?? []).map((e: any) => e.actor_id).filter(Boolean))
  );
  let stageEventActorMap = new Map<string, string>();
  if (stageEventActorIds.length > 0) {
    const { data: actors } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', stageEventActorIds);
    for (const a of actors ?? []) {
      stageEventActorMap.set(a.id, a.full_name ?? 'Unknown');
    }
  }
  const stageEvents = (stageEventsRaw ?? []).map((e: any) => ({
    ...e,
    actor_name: e.actor_id ? stageEventActorMap.get(e.actor_id) ?? null : null,
  }));

  const { data: billings } = await supabase
    .from('billing')
    .select('*')
    .eq('project_id', params.id);

  const { data: collections } = await supabase
    .from('collections')
    .select('*')
    .eq('project_id', params.id);

  const { data: exceptions } = await supabase
    .from('exceptions')
    .select('*')
    .eq('project_id', params.id)
    .eq('status', 'open');

  const { data: boqItems } = await supabase
    .from('boq_items')
    .select('*')
    .eq('project_id', params.id)
    .order('created_at', { ascending: false });

  // AI quota for this org (used + limit)
const orgPlan = await getOrgPlan(supabase);
const canUseRisk = orgPlan?.canUse('predictive_risk') ?? false;

const aiLimitInfo = await canRunAI(supabase);
const aiUsage = aiLimitInfo.used;
const aiLimit = aiLimitInfo.limit;

  const totalBilled = (billings ?? []).reduce((s, b) => s + Number(b.amount), 0);
  const totalCollected = (collections ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const unbilled = Math.max(totalBilled - totalCollected, 0);
  const clientName = Array.isArray(project.clients)
    ? project.clients[0]?.name
    : project.clients?.name;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <Link
        href="/projects"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> All Projects
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono text-xs text-brand mb-1">{project.code}</div>
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{clientName ?? 'No client'}</p>
        </div>
        <Badge variant={healthVariant[project.health as HealthStatus]} className="text-xs">
          {project.health.toUpperCase()}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-card/50">
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
            Contract Value
          </div>
          <div className="text-xl font-semibold text-brand">
            {formatMoney(Number(project.contract_value), project.currency)}
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
            Billed
          </div>
          <div className="text-xl font-semibold">
            {formatMoney(totalBilled, project.currency)}
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
            Collected
          </div>
          <div className="text-xl font-semibold">
            {formatMoney(totalCollected, project.currency)}
          </div>
        </Card>
        <Card className="p-4 bg-card/50">
          <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
            Unbilled
          </div>
          <div className="text-xl font-semibold text-amber-400">
            {formatMoney(unbilled, project.currency)}
          </div>
        </Card>
      </div>

            <Card className="p-5 bg-card/50 mb-6">
        <h3 className="font-semibold mb-4">Lifecycle</h3>
        <LifecycleBar
          projectId={project.id}
          currentStage={project.current_stage}
          stages={(stages ?? []) as any}
          events={stageEvents}
          projectCurrency={project.currency}
        />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-3">Description</h3>
          <p className="text-sm text-muted-foreground">{project.description ?? '—'}</p>
          <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono text-muted-foreground">
            <div>
              <span className="opacity-60">START</span>
              <br />
              {shortDate(project.start_date)}
            </div>
            <div>
              <span className="opacity-60">END</span>
              <br />
              {shortDate(project.end_date)}
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-3">Open Exceptions</h3>
          {(exceptions ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">None. Clean.</p>
          ) : (
            <div className="space-y-2">
              {exceptions!.map((e: any) => (
                <div key={e.id} className="text-xs">
                  <Badge
                    variant={
                      e.severity === 'critical'
                        ? 'red'
                        : e.severity === 'high'
                        ? 'amber'
                        : 'outline'
                    }
                    className="text-[9px]"
                  >
                    {e.severity}
                  </Badge>
                  <div className="mt-1 leading-snug">{e.message}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-3">Invoices</h3>
          {(billings ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No invoices raised yet.</p>
          ) : (
            <div className="space-y-2">
              {billings!.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-muted-foreground">{b.invoice_no}</span>
                  <span className="font-mono">
                    {formatMoney(Number(b.amount), project.currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <BoqTab
            projectId={project.id}
            currency={project.currency}
            initialItems={(boqItems ?? []) as any}
            quota={{ used: aiUsage, limit: aiLimit }}
          />
        </div>
        <RiskPanel
  projectId={project.id}
  quota={{ used: aiUsage, limit: aiLimit }}
  canUse={canUseRisk}
/>
      </div>
    </div>
  );
}
