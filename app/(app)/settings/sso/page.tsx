import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Fingerprint, Lock, ArrowRight } from 'lucide-react';
import { SsoForm } from './sso-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Single Sign-On — Synlumex Apex',
};

const BASE_URL = 'https://apex.synlumexai.com';

export default async function SsoPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);
  const hasAccess = orgPlan?.canUse('sso_saml') ?? false;

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
            <h2 className="text-lg font-semibold">Single Sign-On (SSO / SAML)</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              ENTERPRISE
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Connect your identity provider (Okta, Azure AD, Google Workspace) for
            company-wide single sign-on. Centralize access, enforce policies, and
            simplify onboarding.
          </p>
          <a
            href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock SSO"
            className="inline-flex items-center gap-2 rounded-md brand-gradient text-white px-5 py-2.5 text-sm font-semibold hover:opacity-90"
          >
            Talk to sales
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
  const canEdit = role === 'owner';

  if (!org) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          No workspace found. Contact support.
        </Card>
      </div>
    );
  }

  const isConfigured = !!org.sso_configured_at;
  const spEntityId = `${BASE_URL}/auth/saml/metadata`;
  const spAcsUrl = `${BASE_URL}/auth/saml/acs`;

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
          <Fingerprint className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Single Sign-On (SSO)</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Connect your identity provider so your team signs in with company
          credentials.
        </p>
      </div>

      <SsoForm
        initial={{
          sso_provider: org.sso_provider ?? 'okta',
          sso_domain: org.sso_domain ?? '',
          sso_metadata_url: org.sso_metadata_url ?? '',
          sso_entity_id: org.sso_entity_id ?? '',
          sso_acs_url: org.sso_acs_url ?? '',
          sso_certificate: org.sso_certificate ?? '',
          sso_enabled: org.sso_enabled ?? false,
        }}
        spEntityId={spEntityId}
        spAcsUrl={spAcsUrl}
        canEdit={canEdit}
        isConfigured={isConfigured}
      />
    </div>
  );
}
