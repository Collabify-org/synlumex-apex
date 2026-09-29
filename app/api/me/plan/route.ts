import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const orgPlan = await getOrgPlan(supabase);

    if (!orgPlan) {
      return NextResponse.json({ error: 'No org' }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        id: orgPlan.organization.id,
        name: orgPlan.organization.name,
        slug: orgPlan.organization.slug,
        plan_id: orgPlan.organization.plan_id,
        status: orgPlan.organization.status,
        trial_ends_at: orgPlan.organization.trial_ends_at,
        current_period_start: orgPlan.organization.current_period_start,
        current_period_end: orgPlan.organization.current_period_end,
        created_at: orgPlan.organization.created_at,
        updated_at: orgPlan.organization.updated_at,
      },
      plan: orgPlan.plan,
      tier: orgPlan.tier,
      isTrialing: orgPlan.isTrialing,
      trialEndsAt: orgPlan.trialEndsAt,
      trialDaysLeft: orgPlan.trialDaysLeft,
      maxProjects: orgPlan.maxProjects,
      maxUsers: orgPlan.maxUsers,
      maxAnalyses: orgPlan.maxAnalyses,
      planFeatures: orgPlan.planFeatures,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
