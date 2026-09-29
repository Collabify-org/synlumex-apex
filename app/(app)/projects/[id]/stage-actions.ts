'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { ProjectStage } from '@/lib/types';

type ActionResult = {
  ok: boolean;
  error?: string;
};

// Ordered list of stages — matches STAGES in lib/types.ts
const STAGE_ORDER: ProjectStage[] = [
  'intake',
  'requirements',
  'boq',
  'estimation',
  'engineering',
  'procurement',
  'execution',
  'qa_qc',
  'testing_commissioning',
  'measurement_claim',
  'financial_erp',
  'commercial_visibility',
  'handover',
  'closeout',
];

function nextStage(stage: ProjectStage): ProjectStage | null {
  const idx = STAGE_ORDER.indexOf(stage);
  if (idx === -1 || idx >= STAGE_ORDER.length - 1) return null;
  return STAGE_ORDER[idx + 1];
}

async function getProjectAndOrg(supabase: any, projectId: string) {
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id, current_stage')
    .eq('id', projectId)
    .single();
  return project;
}

// ============================================================
// Advance stage: mark current as completed, next as in_progress
// ============================================================
export async function advanceStage(
  projectId: string,
  fromStage: ProjectStage,
  payload: {
    outputSummary?: string;
    evidenceUrl?: string;
  }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const project = await getProjectAndOrg(supabase, projectId);
  if (!project) return { ok: false, error: 'Project not found' };

  const to = nextStage(fromStage);
  if (!to) return { ok: false, error: 'Already at final stage' };

  const now = new Date().toISOString();

  // 1. Complete current stage
  const { error: completeErr } = await supabase
    .from('project_stages')
    .update({
      status: 'done',
      completed_at: now,
      completed_by: user.id,
      output_summary: payload.outputSummary ?? null,
      evidence_url: payload.evidenceUrl ?? null,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('project_id', projectId)
    .eq('stage', fromStage);

  if (completeErr) return { ok: false, error: completeErr.message };

  // 2. Enter next stage
  const { error: enterErr } = await supabase
    .from('project_stages')
    .update({
      status: 'in_progress',
      entered_at: now,
      entered_by: user.id,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('project_id', projectId)
    .eq('stage', to);

  if (enterErr) return { ok: false, error: enterErr.message };

  // 3. Update project's current_stage
  const { error: projErr } = await supabase
    .from('projects')
    .update({
      current_stage: to,
      updated_at: now,
    })
    .eq('id', projectId);

  if (projErr) return { ok: false, error: projErr.message };

  // 4. Log both events
  await supabase.from('stage_events').insert([
    {
      project_id: projectId,
      organization_id: project.organization_id,
      stage: fromStage,
      event_type: 'completed',
      actor_id: user.id,
      summary: payload.outputSummary ?? `Completed ${fromStage}`,
      output_snapshot: { output_summary: payload.outputSummary ?? null },
      evidence_url: payload.evidenceUrl ?? null,
    },
    {
      project_id: projectId,
      organization_id: project.organization_id,
      stage: to,
      event_type: 'entered',
      actor_id: user.id,
      summary: `Entered ${to}`,
    },
  ]);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/dashboard');
  return { ok: true };
}

// ============================================================
// Block current stage
// ============================================================
export async function blockStage(
  projectId: string,
  stage: ProjectStage,
  payload: { reason: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const project = await getProjectAndOrg(supabase, projectId);
  if (!project) return { ok: false, error: 'Project not found' };

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('project_stages')
    .update({
      status: 'blocked',
      notes: payload.reason,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('project_id', projectId)
    .eq('stage', stage);

  if (updateErr) return { ok: false, error: updateErr.message };

  await supabase.from('stage_events').insert({
    project_id: projectId,
    organization_id: project.organization_id,
    stage,
    event_type: 'blocked',
    actor_id: user.id,
    summary: payload.reason,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ============================================================
// Unblock stage
// ============================================================
export async function unblockStage(
  projectId: string,
  stage: ProjectStage,
  payload: { note?: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const project = await getProjectAndOrg(supabase, projectId);
  if (!project) return { ok: false, error: 'Project not found' };

  const now = new Date().toISOString();

  const { error: updateErr } = await supabase
    .from('project_stages')
    .update({
      status: 'in_progress',
      notes: payload.note ?? null,
      updated_by: user.id,
      updated_at: now,
    })
    .eq('project_id', projectId)
    .eq('stage', stage);

  if (updateErr) return { ok: false, error: updateErr.message };

  await supabase.from('stage_events').insert({
    project_id: projectId,
    organization_id: project.organization_id,
    stage,
    event_type: 'unblocked',
    actor_id: user.id,
    summary: payload.note ?? `Unblocked ${stage}`,
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ============================================================
// Add a note to a stage (doesn't change state)
// ============================================================
export async function addStageNote(
  projectId: string,
  stage: ProjectStage,
  payload: { note: string }
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const project = await getProjectAndOrg(supabase, projectId);
  if (!project) return { ok: false, error: 'Project not found' };

  if (!payload.note.trim()) return { ok: false, error: 'Empty note' };

  await supabase.from('stage_events').insert({
    project_id: projectId,
    organization_id: project.organization_id,
    stage,
    event_type: 'noted',
    actor_id: user.id,
    summary: payload.note.trim(),
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}
