import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Bell } from 'lucide-react';
import { NotificationsForm } from './notifications-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Notifications — Synlumex Apex',
};

export default async function NotificationsPage() {
  const supabase = await createClient();

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
  const canEditOrg = ['owner', 'admin'].includes(role);

  const { data: profile } = await supabase
    .from('profiles')
    .select('notif_opt_out')
    .eq('id', user?.id ?? '')
    .single();

  if (!org) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          No workspace found. Contact support.
        </Card>
      </div>
    );
  }

  const optOut = (profile?.notif_opt_out as any) ?? {};

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
          <Bell className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control what emails you and your team receive.
        </p>
      </div>

      <NotificationsForm
        initialOrg={{
          notif_trial_ending: org.notif_trial_ending ?? true,
          notif_project_red: org.notif_project_red ?? true,
          notif_inactive_user: org.notif_inactive_user ?? true,
          notif_weekly_digest: org.notif_weekly_digest ?? true,
          notif_exception_created: org.notif_exception_created ?? true,
          notif_reminder_due: org.notif_reminder_due ?? true,
          notif_collection_overdue: org.notif_collection_overdue ?? true,
          notif_digest_day: org.notif_digest_day ?? 'monday',
        }}
        initialUser={{
          mute_all: !!optOut.mute_all,
          critical_only: !!optOut.critical_only,
        }}
        canEditOrg={canEditOrg}
      />
    </div>
  );
}
