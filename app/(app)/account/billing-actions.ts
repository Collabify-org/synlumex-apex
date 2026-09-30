'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

async function getCallerContext(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, orgId: null, role: null };

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  return {
    user,
    orgId: membership?.organization_id ?? null,
    role: membership?.role ?? null,
  };
}

// ============================================================
// UPDATE BILLING DETAILS
// ============================================================
export async function updateBillingDetails(payload: {
  billing_email: string;
  billing_company_name: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  billing_tax_id: string;
  billing_notes: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can update billing details' };
  }

  if (payload.billing_email && !payload.billing_email.includes('@')) {
    return { ok: false, error: 'Invalid billing email' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      billing_email: payload.billing_email.trim() || null,
      billing_company_name: payload.billing_company_name.trim() || null,
      billing_address_line1: payload.billing_address_line1.trim() || null,
      billing_address_line2: payload.billing_address_line2.trim() || null,
      billing_city: payload.billing_city.trim() || null,
      billing_state: payload.billing_state.trim() || null,
      billing_postal_code: payload.billing_postal_code.trim() || null,
      billing_country: payload.billing_country || 'US',
      billing_tax_id: payload.billing_tax_id.trim() || null,
      billing_notes: payload.billing_notes.trim() || null,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'billing.details_updated',
    entity: 'organizations',
    entity_id: orgId,
    payload: {},
  });

  revalidatePath('/account');
  return { ok: true };
}

// ============================================================
// REQUEST PLAN CHANGE
// ============================================================
export async function requestPlanChange(payload: {
  target_plan_id: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (!['owner', 'admin'].includes(role ?? '')) {
    return { ok: false, error: 'Only owners and admins can change the plan' };
  }

  const { data: target } = await supabase
    .from('plans')
    .select('id, name')
    .eq('id', payload.target_plan_id)
    .single();

  if (!target) return { ok: false, error: 'Target plan not found' };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'billing.plan_change_requested',
    entity: 'organizations',
    entity_id: orgId,
    payload: { target_plan_id: target.id, target_plan_name: target.name },
  });

  revalidatePath('/account');
  return { ok: true };
}

// ============================================================
// REQUEST CANCELLATION
// ============================================================
export async function requestCancellation(payload: {
  reason: string;
  comment?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only the workspace owner can cancel the subscription' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      cancel_requested_at: new Date().toISOString(),
      cancel_reason: `${payload.reason}${payload.comment ? ` — ${payload.comment}` : ''}`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'billing.cancellation_requested',
    entity: 'organizations',
    entity_id: orgId,
    payload: { reason: payload.reason, comment: payload.comment ?? null },
  });

  revalidatePath('/account');
  return { ok: true };
}

// ============================================================
// TOGGLE AUTO-RENEW
// ============================================================
export async function updateAutoRenew(autoRenew: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { user, orgId, role } = await getCallerContext(supabase);

  if (!user) return { ok: false, error: 'Not authenticated' };
  if (!orgId) return { ok: false, error: 'No organization found' };
  if (role !== 'owner') {
    return { ok: false, error: 'Only the workspace owner can change auto-renew' };
  }

  const { error } = await supabase
    .from('organizations')
    .update({
      auto_renew: autoRenew,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orgId);

  if (error) return { ok: false, error: error.message };

  await supabase.from('audit_log').insert({
    project_id: null,
    actor_id: user.id,
    action: 'billing.auto_renew_updated',
    entity: 'organizations',
    entity_id: orgId,
    payload: { auto_renew: autoRenew },
  });

  revalidatePath('/account');
  return { ok: true };
}
