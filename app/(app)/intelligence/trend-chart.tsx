'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MonthlyTrend } from '@/lib/queries/intelligence';

export function TrendChart({ data }: { data: MonthlyTrend[] }) {
  if (data.length === 0) {
    return (
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-1">Avg Duration Trend — 12 Months</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Monthly average project duration
        </p>
        <div className="py-12 text-center text-xs text-muted-foreground">
          Not enough data yet.
        </div>
      </Card>
    );
  }

  const durations = data.map((d) => d.avg_duration).filter((v) => v > 0);
  const max = Math.max(...durations, 1);

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="font-semibold">Avg Duration Trend — 12 Months</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Monthly average project duration (days)
          </p>
        </div>
      </div>

      <div className="flex items-end gap-1.5 h-48 mb-3">
        {data.map((d) => {
          const pct = (d.avg_duration / max) * 100;
          const isRecent = data.indexOf(d) >= data.length - 3;
          return (
            <div
              key={d.month}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    'w-full rounded-t-sm transition-all',
                    isRecent
                      ? 'bg-brand-gradient'
                      : 'bg-brand/40 group-hover:bg-brand/60'
                  )}
                  style={{ height: `${Math.max(pct, 2)}%` }}
                  title={`${d.label}: ${d.avg_duration} days avg (${d.project_count} project${d.project_count === 1 ? '' : 's'})`}
                />
              </div>
              <div className="text-[9px] font-mono text-muted-foreground mt-1">
                {d.label}
              </div>
              <div className="text-[9px] font-mono text-foreground -mt-0.5">
                {d.avg_duration > 0 ? d.avg_duration : '—'}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono text-muted-foreground">
        <span>
          Peak: <span className="text-foreground">{max} days</span>
        </span>
        <span>
          Latest:{' '}
          <span className="text-foreground">
            {data[data.length - 1]?.avg_duration ?? 0} days
          </span>
        </span>
      </div>
    </Card>
  );
}
