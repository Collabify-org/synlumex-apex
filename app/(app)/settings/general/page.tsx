import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Building2 } from 'lucide-react';
import { GeneralForm } from './general-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'General Settings — Synlumex Apex',
};

export default async function GeneralSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find org + role
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(*)')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  const org = (membership?.organizations as any) ?? null;
  const role = membership?.role ?? 'member';
  const canEdit = ['owner', 'admin'].includes(role);

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
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Settings
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your workspace identity, branding, and locale.
        </p>
      </div>

      <GeneralForm
        initial={{
          name: org.name ?? '',
          timezone: org.timezone ?? 'UTC',
          currency: org.currency ?? 'INR',
          website: org.website ?? null,
          address: org.address ?? null,
          logo_url: org.logo_url ?? null,
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
