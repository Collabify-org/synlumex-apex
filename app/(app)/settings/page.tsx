import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Building2,
  Users,
  Bell,
  ShieldCheck,
  KeyRound,
  Fingerprint,
  Globe,
  AlertTriangle,
  Plug,
  CreditCard,
  ArrowRight,
  Lock,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

type SettingsCard = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  tier?: 'pro' | 'enterprise';
  badge?: string;
  accent?: boolean;
};

export default async function SettingsHubPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

  const canUse = orgPlan?.canUse ?? (() => false);

  // Setup progress: what's missing?
  const { data: { user } } = await supabase.auth.getUser();

  const { count: memberCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true });

  const { count: integrationCount } = await supabase
    .from('integration_requests')
    .select('*', { count: 'exact', head: true });

  const cards: SettingsCard[] = [
    {
      href: '/settings/general',
      icon: Building2,
      title: 'General',
      description: 'Workspace name, timezone, currency, and logo.',
    },
    {
      href: '/settings/team',
      icon: Users,
      title: 'Team',
      description:
        memberCount === 1
          ? 'You\'re the only member — invite teammates.'
          : `${memberCount} team member${memberCount === 1 ? '' : 's'} in this workspace.`,
      accent: memberCount === 1,
    },
    {
      href: '/settings/notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Email preferences, digest frequency, and categories.',
    },
    {
      href: '/settings/security',
      icon: ShieldCheck,
      title: 'Security',
      description: 'Two-factor auth, session management, password policy.',
    },
    {
      href: '/settings/api-keys',
      icon: KeyRound,
      title: 'API Keys',
      description: 'Generate and revoke keys for REST API access.',
      tier: 'enterprise',
    },
    {
      href: '/settings/sso',
      icon: Fingerprint,
      title: 'Single Sign-On',
      description: 'Configure SAML / SSO with your identity provider.',
      tier: 'enterprise',
    },
    {
      href: '/settings/domains',
      icon: Globe,
      title: 'Custom Domains',
      description: 'Host your workspace on your own domain.',
      tier: 'pro',
    },
  ];

  const extraCards: SettingsCard[] = [
    {
      href: '/settings/integrations',
      icon: Plug,
      title: 'Integrations',
      description:
        integrationCount && integrationCount > 0
          ? `${integrationCount} request${integrationCount === 1 ? '' : 's'} in queue.`
          : 'Connect Tally, Zoho, Slack, WhatsApp, and more.',
    },
    {
      href: '/account',
      icon: CreditCard,
      title: 'Billing & Plan',
      description: orgPlan
        ? `${orgPlan.plan.name} · ${
            orgPlan.isTrialing
              ? `Trial · ${orgPlan.trialDaysLeft}d left`
              : orgPlan.organization.status
          }`
        : 'Manage your plan, usage, and invoices.',
    },
    {
      href: '/settings/danger',
      icon: AlertTriangle,
      title: 'Danger Zone',
      description: 'Export data, transfer ownership, or delete the workspace.',
      badge: 'Irreversible',
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-brand" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your workspace, team, security, and billing.
        </p>
      </div>

      {/* Plan banner */}
      {orgPlan && (
        <Link href="/account">
          <Card className="mb-6 p-5 bg-card/50 border-brand-cyan/30 hover:border-brand-cyan/60 transition-colors cursor-pointer">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg brand-gradient flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">
                      {orgPlan.plan.name} Plan
                    </h2>
                    <Badge
                      variant={orgPlan.isTrialing ? 'amber' : 'green'}
                      className="capitalize text-[10px]"
                    >
                      {orgPlan.isTrialing
                        ? `Trial · ${orgPlan.trialDaysLeft}d left`
                        : orgPlan.organization.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {orgPlan.plan.description ?? 'Your current workspace plan'}
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </Card>
        </Link>
      )}

      {/* Main grid — 7 settings cards */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
          Configuration
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cards.map((c) => (
            <SettingsCardTile key={c.href} card={c} allowed={tierAllowed(c, canUse)} />
          ))}
        </div>
      </div>

      {/* Extra row — Integrations, Billing, Danger */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
          Workspace
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {extraCards.map((c) => (
            <SettingsCardTile key={c.href} card={c} allowed={true} />
          ))}
        </div>
      </div>
    </div>
  );
}

function tierAllowed(
  card: SettingsCard,
  canUse: (feature: any) => boolean
): boolean {
  if (!card.tier) return true;
  if (card.tier === 'pro') return canUse('custom_domains');
  if (card.tier === 'enterprise') {
    // Check any relevant enterprise flag — SSO uses sso_saml, API uses api_access
    if (card.href.includes('api-keys')) return canUse('api_access');
    if (card.href.includes('sso')) return canUse('sso_saml');
    return false;
  }
  return true;
}

function SettingsCardTile({
  card,
  allowed,
}: {
  card: SettingsCard;
  allowed: boolean;
}) {
  const Icon = card.icon;

  if (!allowed) {
    return (
      <Card className="p-4 bg-card/30 border-dashed opacity-70">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-md bg-muted/50 flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm text-muted-foreground">
                {card.title}
              </h3>
              {card.tier && (
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {card.tier}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {card.description}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Link href={card.href} className="block group">
      <Card
        className={cn(
          'p-4 bg-card/50 transition-all h-full hover:border-brand-cyan/50 hover:shadow-lg hover:shadow-brand/5 cursor-pointer',
          card.accent && 'border-amber-500/40',
          card.badge && 'border-destructive/30'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-md flex items-center justify-center shrink-0',
              card.accent
                ? 'bg-amber-500/10 text-amber-500'
                : card.badge
                ? 'bg-destructive/10 text-destructive'
                : 'bg-brand/10 text-brand group-hover:bg-brand/20'
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-semibold text-sm">{card.title}</h3>
              {card.tier && (
                <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  {card.tier}
                </span>
              )}
              {card.badge && (
                <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-destructive">
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {card.description}
            </p>
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1 group-hover:text-brand transition-colors" />
        </div>
      </Card>
    </Link>
  );
}
