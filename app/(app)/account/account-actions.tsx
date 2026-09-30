'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { ChangePlanModal } from './change-plan-modal';
import { CancelModal } from './cancel-modal';

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  max_projects: number | null;
  max_users: number | null;
  max_ai_extractions_monthly: number | null;
};

export function AccountActions({
  currentPlan,
  plans,
  isOwner,
  isPendingCancel,
}: {
  currentPlan: Plan;
  plans: Plan[];
  isOwner: boolean;
  isPendingCancel: boolean;
}) {
  const [changeTarget, setChangeTarget] = useState<Plan | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const otherPlans = plans.filter((p) => p.id !== currentPlan.id);

  return (
    <div className="space-y-4">
      {/* Switch buttons */}
      {otherPlans.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {otherPlans.map((p) => (
            <Button
              key={p.id}
              variant="outline"
              onClick={() => setChangeTarget(p)}
              disabled={!isOwner}
              className="gap-2"
            >
              {p.price_monthly > currentPlan.price_monthly ? 'Upgrade to' : 'Switch to'}{' '}
              {p.name}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ))}
        </div>
      )}

      {/* Cancel */}
      {!isPendingCancel && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-medium text-destructive">
                Cancel subscription
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-2xl">
                You can cancel anytime. Your access remains until the end of the
                current billing period.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              disabled={!isOwner}
              className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Cancel subscription
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {changeTarget && (
        <ChangePlanModal
          currentPlan={currentPlan}
          targetPlan={changeTarget}
          onClose={() => setChangeTarget(null)}
        />
      )}
      {cancelOpen && <CancelModal onClose={() => setCancelOpen(false)} />}
    </div>
  );
}
