'use client';

import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/format';
import type { CashFlowPoint } from '@/lib/queries/commercial';

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-1">Cash Flow — Last 6 Months</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Billed vs Collected by month
        </p>
        <div className="py-12 text-center text-xs text-muted-foreground">
          No billing or collection activity yet.
        </div>
      </Card>
    );
  }

  const max = Math.max(
    ...data.flatMap((d) => [d.billed, d.collected]),
    1
  );

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold">Cash Flow — Last 6 Months</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Billed vs Collected by month
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-blue-500" />
            <span className="text-muted-foreground">Billed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-emerald-500" />
            <span className="text-muted-foreground">Collected</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end gap-3 h-48 mb-3">
        {data.map((d) => {
          const billedPct = (d.billed / max) * 100;
          const collectedPct = (d.collected / max) * 100;
          return (
            <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end gap-0.5">
                <div
                  className="flex-1 rounded-t-sm bg-blue-500/80 hover:bg-blue-500 transition-all"
                  style={{ height: `${Math.max(billedPct, 2)}%` }}
                  title={`Billed: ${formatMoney(d.billed, 'INR')}`}
                />
                <div
                  className="flex-1 rounded-t-sm bg-emerald-500/80 hover:bg-emerald-500 transition-all"
                  style={{ height: `${Math.max(collectedPct, 2)}%` }}
                  title={`Collected: ${formatMoney(d.collected, 'INR')}`}
                />
              </div>
              <div className="text-[10px] font-medium text-muted-foreground mt-2">
                {d.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono">
        <span className="text-muted-foreground">
          Total billed:{' '}
          <span className="text-foreground">
            {formatMoney(
              data.reduce((s, d) => s + d.billed, 0),
              'INR'
            )}
          </span>
        </span>
        <span className="text-muted-foreground">
          Total collected:{' '}
          <span className="text-emerald-500">
            {formatMoney(
              data.reduce((s, d) => s + d.collected, 0),
              'INR'
            )}
          </span>
        </span>
      </div>
    </Card>
  );
}
