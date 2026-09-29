'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Lock } from 'lucide-react';

type RiskBullet = {
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
};

const sevVariant: Record<string, 'red' | 'amber' | 'outline' | 'secondary'> = {
  critical: 'red',
  high: 'amber',
  medium: 'outline',
  low: 'secondary',
};

type QuotaInfo = {
  used: number;
  limit: number | null;
};

export function RiskPanel({
  projectId,
  quota,
  canUse,
}: {
  projectId: string;
  quota: QuotaInfo;
  canUse: boolean;
}) {
  const [risks, setRisks] = useState<RiskBullet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const atCap = quota.limit !== null && quota.used >= quota.limit;

  async function generate() {
    setLoading(true);
    setError(null);
    setLimitError(null);
    setRisks([]);
    try {
      const res = await fetch('/api/ai/risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === 'AI_LIMIT_REACHED') {
        setLimitError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Risk generation failed');
      setRisks(data.risks ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Locked view (Pro+ feature) ──
  if (!canUse) {
    return (
      <Card className="p-5 bg-card/50 border-dashed">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-md bg-muted/60 flex items-center justify-center">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">AI Risk Analysis</h3>
            <Badge variant="outline" className="font-mono text-[9px]">
              PRO
            </Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          AI reads this project&apos;s state and writes executive risk bullets — BOQ vs
          contract drift, cash gaps, schedule pressure, and execution risk.
        </p>
        <a
          href="mailto:abdul@synlumexai.com?subject=Upgrade to unlock AI Risk Analysis"
          className="text-xs text-brand-cyan hover:underline font-medium"
        >
          Upgrade to Pro →
        </a>
      </Card>
    );
  }

  // ── Unlocked view ──
  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">AI Risk Analysis</h3>
        </div>
        {!atCap && (
          <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            {risks.length === 0 ? 'Generate' : 'Regenerate'}
          </Button>
        )}
      </div>

      {quota.limit !== null && (
        <div className="text-[10px] font-mono text-muted-foreground mb-3">
          {quota.used} / {quota.limit} AI extractions this month
        </div>
      )}

      {(atCap || limitError) && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-amber-400">
                AI extraction limit reached
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {limitError ??
                  `You've used all ${quota.limit} AI extractions this month. Resets on the 1st.`}
              </div>
              <a
                href="mailto:abdul@synlumexai.com?subject=Upgrade for more AI extractions"
                className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-2 inline-block"
              >
                Upgrade for more →
              </a>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      )}

      {risks.length === 0 && !loading && !error && !atCap && !limitError && (
        <p className="text-xs text-muted-foreground">
          Click Generate to analyze this project and surface risks.
        </p>
      )}

      {risks.length > 0 && (
        <div className="space-y-3">
          {risks.map((r, i) => (
            <div
              key={i}
              className="border-l-2 pl-3 py-1"
              style={{
                borderColor:
                  r.severity === 'critical'
                    ? '#ef4444'
                    : r.severity === 'high'
                    ? '#f59e0b'
                    : r.severity === 'medium'
                    ? '#3b82f6'
                    : '#71717a',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={sevVariant[r.severity]} className="text-[9px]">
                  {r.severity}
                </Badge>
                <span className="text-sm font-medium">{r.title}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                {r.detail}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
