import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ArrowLeft, UserCircle2 } from 'lucide-react';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Profile — Synlumex Apex',
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          Not authenticated.
        </Card>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          Profile not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to dashboard
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <UserCircle2 className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Personal
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your personal details, security, and notification preferences.
        </p>
      </div>

      <ProfileForm
        initial={{
          id: profile.id,
          email: profile.email ?? user.email ?? '',
          full_name: profile.full_name ?? '',
          phone: profile.phone ?? null,
          job_title: profile.job_title ?? null,
          timezone: profile.timezone ?? 'UTC',
          bio: profile.bio ?? null,
          company_name: profile.company_name ?? null,
          avatar_url: profile.avatar_url ?? null,
          role: profile.role ?? 'member',
          created_at: profile.created_at,
          password_changed_at: profile.password_changed_at ?? null,
          notif_opt_out: profile.notif_opt_out ?? {},
        }}
      />
    </div>
  );
}
