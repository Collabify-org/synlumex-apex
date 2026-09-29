// ============================================================
// Plan limit enforcement — server-side
// Returns whether the org can perform an action, based on plan caps
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import { getOrgPlan, type OrgPlan } from '@/lib/plan';

export type LimitCheck = {
  allowed: boolean;
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  reason?: string; // human-readable if blocked
};

/**
 * Check whether the current org can create another project.
 * Returns { allowed: true, limit: null } for unlimited tiers.
 */
export async function canCreateProject(
  supabase: SupabaseClient,
  orgPlan?: OrgPlan | null
): Promise<LimitCheck> {
  const plan = orgPlan ?? (await getOrgPlan(supabase));
  if (!plan) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: 'No active workspace.',
    };
  }

  if (plan.maxProjects === null) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('archived', false);

  const used = count ?? 0;
  const limit = plan.maxProjects;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      reason: `You've reached your ${plan.plan.name} plan limit of ${limit} active projects. Upgrade to add more.`,
    };
  }

  return { allowed: true, used, limit, remaining };
}

/**
 * Check whether the current org can add another user.
 */
export async function canAddUser(
  supabase: SupabaseClient,
  orgPlan?: OrgPlan | null
): Promise<LimitCheck> {
  const plan = orgPlan ?? (await getOrgPlan(supabase));
  if (!plan) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: 'No active workspace.',
    };
  }

  if (plan.maxUsers === null) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const { count } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', plan.organization.id);

  const used = count ?? 0;
  const limit = plan.maxUsers;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      reason: `You've reached your ${plan.plan.name} plan limit of ${limit} team members. Upgrade to add more.`,
    };
  }

  return { allowed: true, used, limit, remaining };
}

/**
 * Check whether the current org can run another AI extraction this month.
 * Counts events with event_type IN ('ai_boq', 'ai_risk') since the 1st of the month.
 */
export async function canRunAI(
  supabase: SupabaseClient,
  orgPlan?: OrgPlan | null
): Promise<LimitCheck> {
  const plan = orgPlan ?? (await getOrgPlan(supabase));
  if (!plan) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: 'No active workspace.',
    };
  }

  if (plan.maxAnalyses === null) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .in('event_type', ['ai_boq', 'ai_risk'])
    .gte('created_at', monthStart.toISOString());

  const used = count ?? 0;
  const limit = plan.maxAnalyses;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      reason: `You've used all ${limit} AI extractions for this month on your ${plan.plan.name} plan. Resets on the 1st, or upgrade for more.`,
    };
  }

  return { allowed: true, used, limit, remaining };
}
