// ============================================================
// <PlanGate> — locks any UI section behind a plan feature
// ============================================================

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlanFeatureKey, PlanTier } from '@/lib/plan';

type Props = {
  /** Which feature flag unlocks this section. */
  requires: PlanFeatureKey;
  /** Which tier the user must be on (for the CTA copy). */
  tier: Exclude<PlanTier, 'starter'>;
  /** Whether the current user can use this feature. Pass `orgPlan.canUse(...)`. */
  allowed: boolean;
  /** Title shown when locked. */
  title: string;
  /** Short description shown when locked. */
  description: string;
  /** What gets rendered when the user HAS access. */
  children: React.ReactNode;
};

export function PlanGate({
  tier,
  allowed,
  title,
  description,
  children,
}: Props) {
  if (allowed) return <>{children}</>;

  return (
    <Card className="relative overflow-hidden border-dashed">
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
            <Lock className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold">{title}</h3>
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                {tier}
              </span>
            </div>

            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>

            <div className="mt-4">
              <Button size="sm" variant="outline" className="gap-2" asChild>
                <a
                  href={`mailto:abdul@synlumexai.com?subject=Upgrade to ${tier}`}
                >
                  <Lock className="h-3 w-3" />
                  {tier === 'enterprise' ? 'Talk to sales' : `Upgrade to ${cap(tier)}`}
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Blurred placeholder preview */}
        <div
          aria-hidden
          className={cn(
            'pointer-events-none mt-4 select-none rounded-lg border bg-muted/20 p-4 text-xs text-muted-foreground/40 blur-[1.5px]'
          )}
        >
          <div className="space-y-2">
            <div className="h-3 w-2/3 rounded bg-muted-foreground/20" />
            <div className="h-3 w-1/2 rounded bg-muted-foreground/20" />
            <div className="h-3 w-4/5 rounded bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
