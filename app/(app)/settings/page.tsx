import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlanGate } from '@/components/plan-gate';
import {
  Settings as SettingsIcon,
  User,
  Database,
  Sparkles,
  AlertTriangle,
  Clock,
  Lock,
  FolderKanban,
  Users,
  Zap,
  Globe,
  KeyRound,
  ShieldCheck,
  Server,
  Building2,
  FileText,
  CreditCard,
  Plug,
  ArrowRight,
} from 'lucide-react';
import { timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id ?? '')
    .single();
  const { data: settings } = await supabase.from('settings').select('*').single();

  const orgPlan = await getOrgPlan(supabase);

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('archived', false);

  const { count: exceptionCount } = await supabase
    .from('exceptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'open');

  const { count: boqCount } = await supabase
    .from('boq_items')
    .select('*', { count: 'exact', head: true });

  const { count: userCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: aiBoqCount } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'ai_boq')
    .gte('created_at', monthStart.toISOString());

  const { count: aiRiskCount } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_type', 'ai_risk')
    .gte('created_at', monthStart.toISOString());

  const aiUsed = (aiBoqCount ?? 0) + (aiRiskCount ?? 0);
  const canUse = orgPlan?.canUse ?? (() => false);

  function usagePct(used: number, limit: number | null): number | null {
    if (limit === null || limit === 0) return null;
    return Math.min(100, Math.round((used / limit) * 100));
  }

  const projectPct = usagePct(projectCount ?? 0, orgPlan?.maxProjects ?? null);
  const userPct = usagePct(userCount ?? 0, orgPlan?.maxUsers ?? null);
  const aiPct = usagePct(aiUsed, orgPlan?.maxAnalyses ?? null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-6 w-6 text-brand" /> Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Workspace configuration, plan access, and account details
        </p>
      </div>

      {/* Plan summary */}
      {orgPlan && (
        <Card className="p-5 bg-card/50 mb-6 border-brand-cyan/30">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg brand-gradient flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <UsageBar
              icon={<FolderKanban className="h-3.5 w-3.5" />}
              label="Projects"
              used={projectCount ?? 0}
              limit={orgPlan.maxProjects}
              pct={projectPct}
            />
            <UsageBar
              icon={<Users className="h-3.5 w-3.5" />}
              label="Team Members"
              used={userCount ?? 0}
              limit={orgPlan.maxUsers}
              pct={userPct}
            />
            <UsageBar
              icon={<Zap className="h-3.5 w-3.5" />}
              label="AI Extractions (this month)"
              used={aiUsed}
              limit={orgPlan.maxAnalyses}
              pct={aiPct}
            />
          </div>
        </Card>
      )}

      {/* Account + Workspace data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">Account</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{profile?.full_name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono text-xs">{profile?.email ?? user?.email ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Role</span>
              <Badge variant={profile?.role === 'owner' ? 'green' : 'secondary'} className="capitalize">
                {profile?.role ?? 'member'}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-blue-400" />
            <h3 className="font-semibold">Workspace Data</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company</span>
              <span className="font-medium">{settings?.company_name ?? 'SYNLUMEX INTEL'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projects</span>
              <span className="font-mono">{projectCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exceptions</span>
              <span className="font-mono">{exceptionCount ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">BOQ Items</span>
              <span className="font-mono">{boqCount ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Configuration */}
      <Card className="p-5 bg-card/50 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">AI Configuration</h3>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">BOQ Extraction</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Paste text or upload PDF → structured line items
              </div>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Risk Analysis</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                AI-generated project risk bullets for owners
              </div>
            </div>
            <Badge variant="green">Active</Badge>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Provider Fallback</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Groq → Cerebras → OpenRouter → Gemini
              </div>
            </div>
            <Badge variant="green">Enabled</Badge>
          </div>
        </div>
      </Card>

      {/* Pro Features */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Pro Features</h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            Unlocked on Pro and Enterprise
          </span>
        </div>

        <div className="space-y-3">
          <PlanGate
            requires="historical_intelligence"
            tier="pro"
            allowed={canUse('historical_intelligence')}
            title="Historical Intelligence"
            description="Compounding insights from past projects — avg durations, delay causes, drop-off stages."
          >
            <FeatureRow
              icon={<Sparkles className="h-4 w-4 text-brand" />}
              title="Historical Intelligence"
              description="Active. See the Intelligence page for compounding insights."
              linkTo="/intelligence"
            />
          </PlanGate>

          <PlanGate
            requires="predictive_risk"
            tier="pro"
            allowed={canUse('predictive_risk')}
            title="Predictive Risk Flags"
            description="AI reads project state and predicts risk before it materializes."
          >
            <FeatureRow
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
              title="Predictive Risk Flags"
              description="Active. AI risk analysis runs on each project detail page."
            />
          </PlanGate>

          <PlanGate
            requires="unbilled_revenue_tracking"
            tier="pro"
            allowed={canUse('unbilled_revenue_tracking')}
            title="Unbilled Revenue Tracking"
            description="See billed-but-uncollected amounts across the portfolio, per project."
          >
            <FeatureRow
              icon={<CreditCard className="h-4 w-4 text-emerald-400" />}
              title="Unbilled Revenue Tracking"
              description="Active. See the Commercial page."
              linkTo="/commercial"
            />
          </PlanGate>

          <PlanGate
            requires="custom_domains"
            tier="pro"
            allowed={canUse('custom_domains')}
            title="Custom Domains"
            description="Host your workspace on your own domain (e.g. projects.yourcompany.com)."
          >
            <FeatureRow
              icon={<Globe className="h-4 w-4 text-brand" />}
              title="Custom Domains"
              description="Configure a custom domain for your workspace."
            />
          </PlanGate>
        </div>
      </div>

      {/* Enterprise Features */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Enterprise Features</h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            Unlocked on Enterprise only
          </span>
        </div>

        <div className="space-y-3">
          <PlanGate
            requires="sso_saml"
            tier="enterprise"
            allowed={canUse('sso_saml')}
            title="Single Sign-On (SSO / SAML)"
            description="Connect your identity provider for company-wide authentication."
          >
            <FeatureRow
              icon={<KeyRound className="h-4 w-4 text-brand" />}
              title="Single Sign-On (SSO / SAML)"
              description="Contact your account manager to configure SAML."
            />
          </PlanGate>

          <PlanGate
            requires="api_access"
            tier="enterprise"
            allowed={canUse('api_access')}
            title="API Access"
            description="Full REST API for integrating Synlumex with your existing systems."
          >
            <FeatureRow
              icon={<Server className="h-4 w-4 text-brand" />}
              title="API Access"
              description="API keys and documentation available."
            />
          </PlanGate>

          <PlanGate
            requires="audit_export"
            tier="enterprise"
            allowed={canUse('audit_export')}
            title="Custom Audit Exports"
            description="Export audit logs in custom formats for compliance teams."
          >
            <FeatureRow
              icon={<FileText className="h-4 w-4 text-brand" />}
              title="Custom Audit Exports"
              description="CSV / JSON / PDF export options on the Audit Log page."
              linkTo="/audit"
            />
          </PlanGate>

          <PlanGate
            requires="multi_entity"
            tier="enterprise"
            allowed={canUse('multi_entity')}
            title="Multi-Entity / Multi-Site"
            description="Manage several business entities or sites under one workspace."
          >
            <FeatureRow
              icon={<Building2 className="h-4 w-4 text-brand" />}
              title="Multi-Entity / Multi-Site"
              description="Switch between entities and sites from the workspace menu."
            />
          </PlanGate>

          <PlanGate
            requires="custom_sla"
            tier="enterprise"
            allowed={canUse('custom_sla')}
            title="Custom SLA"
            description="Guaranteed uptime and response times per your contract."
          >
            <FeatureRow
              icon={<ShieldCheck className="h-4 w-4 text-brand" />}
              title="Custom SLA"
              description="Your dedicated account manager monitors SLA compliance."
            />
          </PlanGate>

          <PlanGate
            requires="on_premise"
            tier="enterprise"
            allowed={canUse('on_premise')}
            title="On-Premise Deployment"
            description="Deploy Synlumex inside your own infrastructure."
          >
            <FeatureRow
              icon={<Server className="h-4 w-4 text-brand" />}
              title="On-Premise Deployment"
              description="Contact your account manager to schedule deployment."
            />
          </PlanGate>

          <PlanGate
            requires="dedicated_support"
            tier="enterprise"
            allowed={canUse('dedicated_support')}
            title="Dedicated Support"
            description="A named account manager and dedicated support channel."
          >
            <FeatureRow
              icon={<User className="h-4 w-4 text-brand" />}
              title="Dedicated Support"
              description="Your account manager is available via WhatsApp and email."
            />
          </PlanGate>
        </div>
      </div>

      {/* Integrations */}
      <Card className="p-5 bg-card/50 mb-6 border-brand/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg brand-gradient flex items-center justify-center shrink-0">
              <Plug className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold">Integrations</h3>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
                Connect Synlumex to Tally, Zoho Books, Slack, WhatsApp, Stripe,
                Google Drive, and 8 more tools. Request access and our team will
                set it up with you.
              </p>
            </div>
          </div>
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1.5 rounded-md brand-gradient text-white px-3 py-2 text-xs font-medium hover:opacity-90 shrink-0"
          >
            Open integrations
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>

      {/* The Loop */}
      <Card className="p-5 bg-card/50 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">The Loop</h3>
        </div>
        <div className="text-sm">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground">Last recompute</span>
            <span className="font-mono text-xs">
              {settings?.last_sync_at ? timeAgo(settings.last_sync_at) : 'never'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Every mutation to billing, collections, and exceptions triggers{' '}
            <code className="text-brand font-mono text-[10px]">recomputeProjectState()</code>{' '}
            — which updates project health, writes audit logs, and refreshes the timestamp above.
          </p>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-5 bg-card/50 border-destructive/30">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <h3 className="font-semibold text-destructive">Danger Zone</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Demo data reset and workspace actions. Use Supabase SQL Editor for safety.
        </p>
        <div className="text-[10px] font-mono text-muted-foreground">
          <div className="mb-1">Available actions via Supabase:</div>
          <ul className="space-y-1 ml-3">
            <li>• Reset all demo data: DELETE FROM projects;</li>
            <li>• Reset exceptions: DELETE FROM exceptions;</li>
            <li>• Force recompute: SELECT recompute_project_state(id) FROM projects;</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function UsageBar({
  icon,
  label,
  used,
  limit,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  pct: number | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <span className="text-xs font-mono">
          {used} / {limit ?? '∞'}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              (pct ?? 0) > 80 ? 'bg-amber-500' : 'brand-gradient'
            )}
            style={{ width: `${pct ?? 0}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  description,
  linkTo,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo?: string;
}) {
  return (
    <Card className="p-4 bg-card/50 border-brand-cyan/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <div className="text-sm font-medium">{title}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {description}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="green" className="text-[10px]">Active</Badge>
          {linkTo && (
            <Link
              href={linkTo}
              className="text-xs text-brand-cyan hover:underline"
            >
              Open →
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
