import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Users, ArrowLeft } from 'lucide-react';
import { TeamList } from './team-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Team — Synlumex Apex',
};

export default async function TeamPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find user's org + role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  const orgId = membership?.organization_id ?? null;
  const callerRole = membership?.role ?? 'member';
  const canManage = ['owner', 'admin'].includes(callerRole);

  // Load all members of this org
  let members: any[] = [];
  if (orgId) {
    const { data: rows } = await supabase
      .from('organization_members')
      .select('id, user_id, role, joined_at, profiles(id, email, full_name)')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });

    members = (rows ?? []).map((m: any) => {
      const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return {
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        email: profile?.email ?? null,
        full_name: profile?.full_name ?? null,
        is_current_user: m.user_id === user?.id,
      };
    });
  }

  if (!orgId) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          No workspace found. Contact support.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Settings
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Add teammates, assign roles, and manage workspace access.
        </p>
      </div>

      <TeamList
        members={members}
        canManage={canManage}
        planLimit={orgPlan?.maxUsers ?? null}
      />
    </div>
  );
}
