'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatMoney, shortDate } from '@/lib/format';
import { STAGES, type HealthStatus } from '@/lib/types';
import type { ProjectRow } from '@/lib/queries/projects';
import { cn } from '@/lib/utils';
import { ArrowRight, Calendar, Building2 } from 'lucide-react';

const healthVariant: Record<HealthStatus, 'green' | 'amber' | 'red' | 'secondary'> = {
  green: 'green',
  amber: 'amber',
  red: 'red',
  on_hold: 'secondary',
};

const healthLabel: Record<HealthStatus, string> = {
  green: 'On Track',
  amber: 'At Risk',
  red: 'Critical',
  on_hold: 'On Hold',
};

const healthBorder: Record<HealthStatus, string> = {
  green: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  red: 'border-l-red-500',
  on_hold: 'border-l-slate-500',
};

export function ProjectCardGrid({ rows }: { rows: ProjectRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
        No projects match your filters.
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((p) => {
        const stage = STAGES.find((s) => s.key === p.current_stage);
        return (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card
              className={cn(
                'p-4 bg-card/50 border-l-4 transition-all hover:border-brand-cyan/50 hover:shadow-lg hover:shadow-brand/5 cursor-pointer h-full',
                healthBorder[p.health]
              )}
            >
              {/* Top: code + health badge */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <span className="font-mono text-[10px] text-brand">
                  {p.code}
                </span>
                <Badge variant={healthVariant[p.health]} className="text-[9px]">
                  {healthLabel[p.health]}
                </Badge>
              </div>

              {/* Name */}
              <h3 className="font-semibold text-sm leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
                {p.name}
              </h3>

              {/* Client */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{p.client_name ?? 'No client'}</span>
              </div>

              {/* Stage */}
              <div className="mb-3">
                <span className="inline-flex items-center rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                  {stage?.label ?? p.current_stage}
                </span>
              </div>

              {/* Footer: value + end date */}
              <div className="flex items-end justify-between gap-2 pt-3 border-t border-border/50">
                <div>
                  <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-0.5">
                    Contract
                  </div>
                  <div className="text-sm font-semibold brand-gradient-text">
                    {formatMoney(p.contract_value, p.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-0.5 flex items-center gap-1 justify-end">
                    <Calendar className="h-2.5 w-2.5" />
                    End
                  </div>
                  <div className="text-xs font-mono text-muted-foreground">
                    {shortDate(p.end_date)}
                  </div>
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
