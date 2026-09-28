// ============================================================
// Plan resolution — server-side
// Reads the current user's org + plan + feature flags
// ============================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanTier = 'starter' | 'pro' | 'enterprise';

export type PlanFeatureKey =
  | 'historical_intelligence'
  | 'predictive_risk'
  | 'unbilled_revenue_tracking'
  | 'custom_domains'
  | 'api_access'
  | 'sso_saml'
  | 'custom_sla'
  | 'dedicated_support'
  | 'on_premise'
  | 'multi_entity'
  | 'audit_export';

export type PlanRow = {
  id: PlanTier;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_projects: number | null;
  max_users: number | null;
  max_ai_extractions_monthly: number | null;
  is_active: boolean;
  sort_order: number;
  features: Partial<Record<PlanFeatureKey, boolean>>;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  plan_id: PlanTier;
  status: string;
  trial_ends_at: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type OrgPlan = {
  organization: OrganizationRow;
  plan: PlanRow;
  tier: PlanTier;
  isTrialing: boolean;
  trialEndsAt: Date | null;
  trialDaysLeft: number;
  maxProjects: number | null;
  maxUsers: number | null;
  maxAnalyses: number | null;
  canUse: (feature: PlanFeatureKey) => boolean;
  planFeatures: Partial<Record<PlanFeatureKey, boolean>>;
};

/**
 * Load the current user's org + plan + derived limits.
 * Returns null if there's no user or no org membership.
 *
 * Usage (server component):
 *   const supabase = await createClient();
 *   const orgPlan = await getOrgPlan(supabase);
 *   if (orgPlan?.canUse('sso_saml')) { ... }
 */
export async function getOrgPlan(
  supabase: SupabaseClient
): Promise<OrgPlan | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find org membership (first org, ordered by join date)
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', membership.organization_id)
    .single();

  if (!org) return null;

  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', org.plan_id)
    .single();

  if (!plan) return null;

  const organization = org as OrganizationRow;
  const planRow = plan as PlanRow;

  const trialEndsAt = organization.trial_ends_at
    ? new Date(organization.trial_ends_at)
    : null;

  const trialDaysLeft =
    trialEndsAt && organization.status === 'trialing'
      ? Math.max(
          0,
          Math.ceil((trialEndsAt.getTime() - Date.now()) / 86400000)
        )
      : 0;

  const planFeatures = (planRow.features ?? {}) as Partial<
    Record<PlanFeatureKey, boolean>
  >;

  return {
    organization,
    plan: planRow,
    tier: planRow.id,
    isTrialing: organization.status === 'trialing',
    trialEndsAt,
    trialDaysLeft,
    maxProjects: planRow.max_projects ?? null,
    maxUsers: planRow.max_users ?? null,
    maxAnalyses: planRow.max_ai_extractions_monthly ?? null,
    canUse: (feature) => planFeatures[feature] === true,
    planFeatures,
  };
}
