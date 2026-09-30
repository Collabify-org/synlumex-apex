import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, KeyRound, Lock, ArrowRight } from 'lucide-react';
import { ApiKeysList } from './api-keys-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'API Keys — Synlumex Apex',
};

export default async function ApiKeysPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);
  const hasAccess = orgPlan?.canUse('api_access') ?? false;

  // Gating — Enterprise only
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
            <h2 className="text-lg font-semibold">API Access</h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              ENTERPRISE
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Generate API keys to connect external tools — automation, analytics,
            or your own dashboards — directly to your Synlumex workspace.
          </p>
          <a
            href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock API Access"
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
    .select('organization_id, role')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  const orgId = membership?.organization_id ?? null;
  const role = membership?.role ?? 'member';
  const canManage = ['owner', 'admin'].includes(role);

  let keys: any[] = [];
  if (orgId) {
    const { data: rows } = await supabase
      .from('api_keys')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    const now = Date.now();
    keys = (rows ?? []).map((k: any) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_prefix,
      scopes: Array.isArray(k.scopes) ? k.scopes : [],
      created_at: k.created_at,
      last_used_at: k.last_used_at,
      expires_at: k.expires_at,
      revoked_at: k.revoked_at,
      is_expired: k.expires_at ? new Date(k.expires_at).getTime() < now : false,
    }));
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
          <KeyRound className="h-4 w-4 text-brand" />
          <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
            Workspace
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Generate keys for external tools and integrations. Each key is shown
          only once — store it securely.
        </p>
      </div>

      <ApiKeysList keys={keys} canManage={canManage} />
    </div>
  );
}
