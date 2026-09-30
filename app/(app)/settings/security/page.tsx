import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { SecurityForm } from './security-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Security — Synlumex Apex',
};

export default async function SecurityPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(*)')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  const org = (membership?.organizations as any) ?? null;
  const role = membership?.role ?? 'member';
  const canEdit = ['owner', 'admin'].includes(role);
  const isEnterprise = orgPlan?.canUse('enforce_mfa') ?? false;

  // Load recent security-related audit events
  let recentEvents: any[] = [];
  if (org?.id) {
    const { data: events } = await supabase
      .from('audit_log')
      .select('id, action, actor_id, created_at, payload')
      .or(
        'action.ilike.settings.security%,action.ilike.member%,action.ilike.plan%'
      )
      .order('created_at', { ascending: false })
      .limit(10);

    const actorIds = Array.from(
      new Set((events ?? []).map((e: any) => e.actor_id).filter(Boolean))
    );
    const actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', actorIds);
      for (const a of actors ?? []) {
        actorMap.set(a.id, a.full_name ?? a.email ?? 'Unknown');
      }
    }

    recentEvents = (events ?? []).map((e: any) => ({
      id: e.id,
      action: e.action,
      actor_name: e.actor_id ? actorMap.get(e.actor_id) ?? null : 'System',
      created_at: e.created_at,
      payload: e.payload,
    }));
  }

  if (!org) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          No workspace found. Contact support.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Settings
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control authentication, password policy, and session management.
        </p>
      </div>

      <SecurityForm
        initial={{
          enforce_mfa: org.enforce_mfa ?? false,
          session_timeout_minutes: org.session_timeout_minutes ?? 10080,
          password_min_length: org.password_min_length ?? 8,
          require_password_uppercase: org.require_password_uppercase ?? false,
          require_password_number: org.require_password_number ?? false,
          require_password_symbol: org.require_password_symbol ?? false,
          password_expiry_days: org.password_expiry_days ?? 0,
        }}
        canEdit={canEdit}
        isEnterprise={isEnterprise}
        recentEvents={recentEvents}
      />
    </div>
  );
}
