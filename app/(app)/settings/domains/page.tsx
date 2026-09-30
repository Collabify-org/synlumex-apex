import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Globe, Lock, ArrowRight } from 'lucide-react';
import { DomainsForm } from './domains-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Custom Domains — Synlumex Apex',
};

export default async function DomainsPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);
  const hasAccess = orgPlan?.canUse('custom_domains') ?? false;

  if (!hasAccess) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Back to Settings
        </Link>

        <Card className="p-8 bg-card/50 border-dashed text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-lg font-semibold">Custom Domains</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              PRO
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Host your Synlumex workspace on your own domain (e.g.
            projects.yourcompany.com) for a fully white-labeled experience.
          </p>
          <a
            href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock Custom Domains"
            className="inline-flex items-center gap-2 rounded-md brand-gradient text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Upgrade to Pro
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </Card>
      </div>
    );
  }

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
          <Globe className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Domains</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Host your workspace on your own domain for a fully branded experience.
        </p>
      </div>

      <DomainsForm
        initial={{
          custom_domain: org.custom_domain ?? null,
          domain_verified: org.domain_verified ?? false,
          domain_verification_token: org.domain_verification_token ?? null,
          domain_verified_at: org.domain_verified_at ?? null,
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
