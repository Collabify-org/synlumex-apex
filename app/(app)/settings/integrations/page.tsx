import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plug, Sparkles, BookOpen } from 'lucide-react';
import { IntegrationsGrid } from './integrations-grid';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Integrations — Synlumex Apex',
};

export default async function IntegrationsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Find user's org
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .maybeSingle();

  let existingRequests: { id: string; provider_id: string; status: string }[] = [];
  if (membership?.organization_id) {
    const { data: requests } = await supabase
      .from('integration_requests')
      .select('id, provider_id, status')
      .eq('organization_id', membership.organization_id);
    existingRequests = requests ?? [];
  }

  const pendingCount = existingRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Back link */}
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3 w-3" /> Back to Settings
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Plug className="h-4 w-4 text-brand" />
              <span className="text-[10px] font-mono tracking-widest text-brand uppercase">
                Connect your software
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Connect Synlumex to the tools you already use — accounting, ERP,
              communication, payments, and cloud storage. Request access and our
              team will set it up with you.
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="green" className="gap-1.5 text-xs">
              <Sparkles className="h-3 w-3" />
              {pendingCount} request{pendingCount === 1 ? '' : 's'} in queue
            </Badge>
          )}
        </div>
      </div>

      {/* Info banner */}
      <Card className="p-4 bg-brand/5 border-brand/20 mb-6">
        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">
              Need a provider we don't list?
            </span>{' '}
            Request any integration — we prioritize based on customer demand.
            Enterprise plans include custom integrations built to your workflow.{' '}
            <a
              href="mailto:abdul@synlumexai.com?subject=Custom Integration Request"
              className="text-brand-cyan hover:underline"
            >
              Contact us →
            </a>
          </div>
        </div>
      </Card>

      {/* Grid */}
      <IntegrationsGrid existingRequests={existingRequests} />
    </div>
  );
}
