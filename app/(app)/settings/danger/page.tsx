import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { DangerForm } from './danger-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Danger Zone — Synlumex Apex',
};

export default async function DangerPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role, organizations(id, name)')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  const org = (membership?.organizations as any) ?? null;
  const role = membership?.role ?? 'member';
  const isOwner = role === 'owner';

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
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-[10px] font-mono tracking-widest text-destructive uppercase">
            Danger Zone
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Danger Zone</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Export your workspace data or permanently delete this workspace.
          These actions cannot be undone.
        </p>
      </div>

      <DangerForm
        workspaceName={org.name}
        canDelete={isOwner}
        isOwner={isOwner}
      />
    </div>
  );
}
