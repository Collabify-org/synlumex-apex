'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Target,
  TrendingUp,
  Sparkles,
  Building2,
  Wallet,
  FileText,
  AlertTriangle,
  Banknote,
  type LucideIcon,
} from 'lucide-react';
import type { KpiDelta } from '@/lib/queries/intelligence';

const ICONS: Record<string, LucideIcon> = {
  clock: Clock,
  target: Target,
  trending: TrendingUp,
  sparkles: Sparkles,
  building: Building2,
  wallet: Wallet,
  file: FileText,
  alert: AlertTriangle,
  banknote: Banknote,
};

type Props = {
  icon: string; // name of icon, e.g. "clock"
  label: string;
  value: string;
  sub?: string;
  delta?: KpiDelta;
  href?: string;
  className?: string;
};

export function IntelKpi({
  icon,
  label,
  value,
  sub,
  delta,
  href,
  className,
}: Props) {
  const Icon = ICONS[icon] ?? Sparkles;

  const card = (
    <Card
      className={cn(
        'p-5 bg-card/50 border-border transition-all',
        href &&
          'hover:border-brand-cyan/40 hover:shadow-lg hover:shadow-brand/5 cursor-pointer',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="h-8 w-8 rounded-md bg-muted text-muted-foreground flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>

        {delta && delta.direction !== 'flat' && (
          <span
            className={cn(
              'text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1',
              delta.positive
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-red-400 bg-red-500/10'
            )}
            title={`Previous: ${delta.previous.toLocaleString()}`}
          >
            {delta.direction === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(delta.deltaPercent).toFixed(1)}%
          </span>
        )}

        {delta && delta.direction === 'flat' && (
          <span className="text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground bg-muted/50">
            <Minus className="h-3 w-3" />
            flat
          </span>
        )}
      </div>

      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
        {label}
      </div>
      <div className="text-2xl md:text-3xl font-semibold brand-gradient-text">
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }
  return card;
}
