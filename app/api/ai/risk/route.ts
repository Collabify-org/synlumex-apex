import { NextResponse } from 'next/server';
import { summarizeRisk, type ProjectRiskContext } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';
import { canRunAI } from '@/lib/limits';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

    const supabase = await createClient();

    // Enforce AI cap
    const limit = await canRunAI(supabase);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: limit.reason ?? 'AI quota reached',
          code: 'AI_LIMIT_REACHED',
          used: limit.used,
          limit: limit.limit,
        },
        { status: 403 }
      );
    }

    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

    const { data: billings } = await supabase
      .from('billing')
      .select('amount, status')
      .eq('project_id', projectId);

    const { data: collections } = await supabase
      .from('collections')
      .select('amount')
      .eq('project_id', projectId);

    const { data: exceptions } = await supabase
      .from('exceptions')
      .select('severity, message')
      .eq('project_id', projectId)
      .eq('status', 'open');

    const { data: boqItems } = await supabase
      .from('boq_items')
      .select('quantity, rate')
      .eq('project_id', projectId);

    const billed = (billings ?? []).reduce((s, b) => s + Number(b.amount), 0);
    const collected = (collections ?? []).reduce((s, c) => s + Number(c.amount), 0);
    const overdue = (billings ?? [])
      .filter((b) => b.status === 'overdue')
      .reduce((s, b) => s + Number(b.amount), 0);
    const boqTotal = (boqItems ?? []).reduce(
      (s, b) => s + Number(b.quantity) * Number(b.rate),
      0
    );

    const daysToEnd = project.end_date
      ? Math.floor((new Date(project.end_date).getTime() - Date.now()) / 86400000)
      : null;

    const ctx: ProjectRiskContext = {
      code: project.code,
      name: project.name,
      stage: project.current_stage,
      health: project.health,
      currency: project.currency,
      contractValue: Number(project.contract_value),
      boqTotal,
      boqItemCount: (boqItems ?? []).length,
      billed,
      collected,
      overdue,
      exceptions: exceptions ?? [],
      daysToEnd,
    };

    const risks = await summarizeRisk(ctx);

    // Track usage
    try {
      await supabase.from('usage_events').insert({
        event_type: 'ai_risk',
        metadata: { project_id: projectId, risks_count: risks.length },
      });
    } catch {}

    return NextResponse.json({ risks });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
