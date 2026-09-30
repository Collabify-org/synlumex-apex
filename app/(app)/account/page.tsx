import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  Sparkles,
  Users,
  FolderKanban,
  Zap,
  AlertCircle,
  Check,
  Mail,
  Building2,
  XCircle,
} from 'lucide-react';
import { formatMoney, shortDate } from '@/lib/format';
import { InvoicesList } from './invoices-list';
import { BillingDetailsForm } from './billing-details-form';
import { AccountActions } from './account-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Billing & Plan — Synlumex Apex',
};

export default async function AccountPage() {
  const supabase = await createClient();
  const orgPlan = await getOrgPlan(supabase);

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
  const canManage = ['owner', 'admin'].includes(role);

  if (!org || !orgPlan) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          Unable to load billing information.
        </Card>
      </div>
    );
  }

  // Load usage stats
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .eq('archived', false);

  const { count: memberCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { count: aiUsed } = await supabase
    .from('usage_events')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', org.id)
    .in('event_type', ['ai_boq', 'ai_risk'])
    .gte('created_at', monthStart.toISOString());

  // Load invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('organization_id', org.id)
    .order('issue_date', { ascending: false })
    .limit(20);

  // Load all plans for change-plan section
  const { data: plans } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  // Usage percentages
  const projectPct =
    orgPlan.maxProjects && orgPlan.maxProjects > 0
      ? Math.min(100, Math.round(((projectCount ?? 0) / orgPlan.maxProjects) * 100))
      : 0;

  const userPct =
    orgPlan.maxUsers && orgPlan.maxUsers > 0
      ? Math.min(100, Math.round(((memberCount ?? 0) / orgPlan.maxUsers) * 100))
      : 0;

  const aiPct =
    orgPlan.maxAnalyses && orgPlan.maxAnalyses > 0
      ? Math.min(100, Math.round(((aiUsed ?? 0) / orgPlan.maxAnalyses) * 100))
      : 0;

  const isTrialing = orgPlan.isTrialing;
  const trialDaysLeft = orgPlan.trialDaysLeft;
  const isPendingCancel = !!org.cancel_requested_at;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-brand" /> Billing &amp; Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription, usage, invoices, and billing details.
        </p>
      </div>

      {/* Pending cancellation banner */}
      {isPendingCancel && (
        <Card className="mb-6 p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-amber-500">
                Cancellation requested
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Our team will reach out to confirm. You keep full access until
                your current billing period ends.
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Trial / next charge banner */}
      {isTrialing && trialDaysLeft > 0 && (
        <Card className="mb-6 p-4 bg-brand/5 border-brand-cyan/30">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">
                  You're on a {orgPlan.plan.name} trial · {trialDaysLeft} day
                  {trialDaysLeft === 1 ? '' : 's'} left
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Trial ends {shortDate(org.trial_ends_at)}. Upgrade anytime to
                  keep Pro features.
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Current plan card */}
      <Card className="mb-6 p-5 bg-card/50">
        <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold">{orgPlan.plan.name} Plan</h2>
              <Badge
                variant={isTrialing ? 'amber' : 'green'}
                className="capitalize text-[10px]"
              >
                {isTrialing ? 'Trial' : org.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {orgPlan.plan.description ?? 'Your current workspace plan'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold brand-gradient-text">
              {orgPlan.plan.price_monthly > 0
                ? `$${orgPlan.plan.price_monthly}`
                : 'Custom'}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {orgPlan.plan.price_monthly > 0 ? 'per month · USD' : 'contact us'}
            </div>
          </div>
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
            used={memberCount ?? 0}
            limit={orgPlan.maxUsers}
            pct={userPct}
          />
          <UsageBar
            icon={<Zap className="h-3.5 w-3.5" />}
            label="AI Extractions"
            used={aiUsed ?? 0}
            limit={orgPlan.maxAnalyses}
            pct={aiPct}
            sub="this month"
          />
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border text-xs">
          <span className="text-muted-foreground">
            Current period ends{' '}
            <span className="text-foreground font-mono">
              {shortDate(org.current_period_end)}
            </span>
          </span>
        </div>
      </Card>

      {/* Usage alert */}
      {(projectPct >= 80 || userPct >= 80 || aiPct >= 80) && (
        <Card className="mb-6 p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium">
                Approaching plan limits
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {projectPct >= 80 && <div>• Projects: {projectPct}% of limit used</div>}
                {userPct >= 80 && <div>• Team members: {userPct}% of limit used</div>}
                {aiPct >= 80 && <div>• AI extractions: {aiPct}% of monthly quota used</div>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Billing details */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-2">
          <Mail className="h-3 w-3" />
          Billing details
        </div>
        <BillingDetailsForm
          initial={{
            billing_email: org.billing_email ?? '',
            billing_company_name: org.billing_company_name ?? '',
            billing_address_line1: org.billing_address_line1 ?? '',
            billing_address_line2: org.billing_address_line2 ?? '',
            billing_city: org.billing_city ?? '',
            billing_state: org.billing_state ?? '',
            billing_postal_code: org.billing_postal_code ?? '',
            billing_country: org.billing_country ?? 'US',
            billing_tax_id: org.billing_tax_id ?? '',
            billing_notes: org.billing_notes ?? '',
          }}
          canEdit={canManage}
        />
      </div>

      {/* Invoices */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-2">
          <CreditCard className="h-3 w-3" />
          Invoices
        </div>
        <InvoicesList invoices={(invoices ?? []) as any} />
      </div>

      {/* Payment method */}
      <Card className="mb-6 p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Payment method</h3>
        </div>
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <div className="text-sm font-medium mb-1">
            Manual payment setup
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We accept bank transfer, wire, and card payments processed manually by
            our team. Contact us to arrange payment and receive a payment link.
          </p>
          <a
            href="mailto:abdul@synlumexai.com?subject=Payment setup for our workspace"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-cyan hover:underline font-medium"
          >
            <Mail className="h-3 w-3" />
            Contact billing
          </a>
        </div>
      </Card>

      {/* Change plan + actions */}
      <div className="mb-6">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-2">
          <Building2 className="h-3 w-3" />
          Change plan
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          All plans include the AI intelligence layer, historical insights, and
          audit logs. Prices in USD.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {(plans ?? []).map((p: any) => {
            const isCurrent = p.id === orgPlan.plan.id;
            const price = p.price_monthly;
            return (
              <Card
                key={p.id}
                className={`p-5 bg-card/50 relative ${
                  isCurrent ? 'border-brand-cyan/40 brand-glow' : ''
                }`}
              >
                {isCurrent && (
                  <div className="absolute top-3 right-3">
                    <Badge variant="green" className="text-[9px]">
                      CURRENT
                    </Badge>
                  </div>
                )}
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5 mb-4">
                  {p.description}
                </p>
                <div className="mb-4">
                  {price > 0 ? (
                    <>
                      <span className="text-2xl font-semibold brand-gradient-text">
                        ${price.toLocaleString('en-US')}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1">
                        / month
                      </span>
                    </>
                  ) : (
                    <span className="text-2xl font-semibold brand-gradient-text">
                      Custom
                    </span>
                  )}
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex gap-2">
                    <Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    {p.max_projects === null
                      ? 'Unlimited projects'
                      : `Up to ${p.max_projects} projects`}
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    {p.max_users === null
                      ? 'Unlimited team members'
                      : `Up to ${p.max_users} team members`}
                  </li>
                  <li className="flex gap-2">
                    <Check className="h-3.5 w-3.5 text-brand shrink-0 mt-0.5" />
                    {p.max_ai_extractions_monthly === null
                      ? 'Unlimited AI extractions'
                      : `${p.max_ai_extractions_monthly} AI / month`}
                  </li>
                </ul>
              </Card>
            );
          })}
        </div>

        <AccountActions
          currentPlan={{
            id: orgPlan.plan.id,
            name: orgPlan.plan.name,
            description: orgPlan.plan.description,
            price_monthly: orgPlan.plan.price_monthly,
            max_projects: orgPlan.plan.max_projects,
            max_users: orgPlan.plan.max_users,
            max_ai_extractions_monthly: orgPlan.plan.max_ai_extractions_monthly,
          }}
          plans={(plans ?? []).map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price_monthly: p.price_monthly,
            max_projects: p.max_projects,
            max_users: p.max_users,
            max_ai_extractions_monthly: p.max_ai_extractions_monthly,
          }))}
          isOwner={role === 'owner'}
          isPendingCancel={isPendingCancel}
        />
      </div>
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
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  pct: number;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
          {sub && <span className="text-[10px]">({sub})</span>}
        </div>
        <span className="text-xs font-mono">
          {used} / {limit ?? '∞'}
        </span>
      </div>
      {limit !== null && (
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              pct > 80 ? 'bg-amber-500' : 'brand-gradient'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
