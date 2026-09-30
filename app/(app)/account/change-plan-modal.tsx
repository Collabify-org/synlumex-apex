'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  X,
  Loader2,
  ArrowRight,
  Check,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { requestPlanChange } from './billing-actions';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_projects: number | null;
  max_users: number | null;
  max_ai_extractions_monthly: number | null;
};

export function ChangePlanModal({
  currentPlan,
  targetPlan,
  onClose,
}: {
  currentPlan: Plan;
  targetPlan: Plan;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isUpgrade = targetPlan.price_monthly > currentPlan.price_monthly;
  const isDowngrade = targetPlan.price_monthly < currentPlan.price_monthly;

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await requestPlanChange({ target_plan_id: targetPlan.id });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to request plan change');
      return;
    }
    setDone(true);
  }

  function limitChange(from: number | null, to: number | null): string {
    const f = from === null ? '∞' : String(from);
    const t = to === null ? '∞' : String(to);
    if (from === to) return 'No change';
    return `${f} → ${t}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            {isUpgrade && <TrendingUp className="h-4 w-4 text-emerald-500" />}
            {isDowngrade && <TrendingDown className="h-4 w-4 text-amber-500" />}
            <h2 className="font-semibold">
              {isUpgrade ? 'Upgrade to' : isDowngrade ? 'Switch to' : 'Switch to'}{' '}
              {targetPlan.name}
            </h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold mb-1">Plan change requested</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Our team will process this change within 1 business day and email you
                at your billing address. You'll keep current access until the switch
                is applied.
              </p>
              <Button className="mt-5 brand-gradient text-white" onClick={onClose}>
                Got it
              </Button>
            </div>
          ) : (
            <>
              {/* Price comparison */}
              <div className="rounded-md border border-border bg-card/40 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                      Current
                    </div>
                    <div className="text-sm font-medium">{currentPlan.name}</div>
                    <div className="text-lg font-semibold mt-1">
                      ${currentPlan.price_monthly}
                      <span className="text-xs text-muted-foreground font-normal">
                        {' '}
                        /mo
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-mono tracking-widest text-brand uppercase mb-1">
                      New
                    </div>
                    <div className="text-sm font-medium">{targetPlan.name}</div>
                    <div className="text-lg font-semibold text-brand mt-1">
                      ${targetPlan.price_monthly}
                      <span className="text-xs text-muted-foreground font-normal">
                        {' '}
                        /mo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* What changes */}
              <div>
                <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                  What changes
                </div>
                <div className="space-y-2">
                  <ChangeRow
                    label="Active projects"
                    before={currentPlan.max_projects}
                    after={targetPlan.max_projects}
                  />
                  <ChangeRow
                    label="Team members"
                    before={currentPlan.max_users}
                    after={targetPlan.max_users}
                  />
                  <ChangeRow
                    label="AI extractions / month"
                    before={currentPlan.max_ai_extractions_monthly}
                    after={targetPlan.max_ai_extractions_monthly}
                  />
                </div>
              </div>

              {/* Warning for downgrade */}
              {isDowngrade && (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      <span className="text-amber-500 font-medium">
                        Switching to a lower plan may affect your usage.
                      </span>{' '}
                      If you're currently over the target plan's limits, you'll be
                      asked to archive projects or remove members before the switch.
                    </div>
                  </div>
                </div>
              )}

              {/* Upgrade note */}
              {isUpgrade && (
                <div className="rounded-md border border-brand-cyan/30 bg-brand/5 p-3">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-brand-cyan shrink-0 mt-0.5" />
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      Our team will reach out within 1 business day with invoicing
                      details. New limits activate as soon as the change is
                      processed.
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy}
              className="gap-2 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" />
              )}
              Request plan change
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChangeRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number | null;
  after: number | null;
}) {
  const changed = before !== after;
  return (
    <div className="flex items-center justify-between text-xs py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-mono', changed && 'font-semibold')}>
        {before === null ? '∞' : before}
        {changed && (
          <>
            {' '}
            <ArrowRight className="inline h-3 w-3 text-muted-foreground" />{' '}
            <span className="text-brand">{after === null ? '∞' : after}</span>
          </>
        )}
      </span>
    </div>
  );
}
