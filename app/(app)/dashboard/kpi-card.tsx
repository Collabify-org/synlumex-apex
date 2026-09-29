import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Delta = {
  value: number;
  direction: 'up' | 'down' | 'flat';
  positive: boolean;
};

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  trend?: Delta;
  href?: string;
  className?: string;
  accent?: boolean;
  warning?: boolean;
};

export function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  href,
  className,
  accent,
  warning,
}: Props) {
  const card = (
    <Card
      className={cn(
        'p-5 bg-card/50 border-border relative overflow-hidden transition-all',
        accent && 'border-brand-cyan/30',
        warning && 'border-amber-500/40',
        href && 'hover:border-brand-cyan/50 hover:shadow-lg hover:shadow-brand/5 cursor-pointer',
        className
      )}
    >
      {accent && (
        <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand-cyan/5 pointer-events-none" />
      )}

      <div className="flex items-start justify-between mb-4 relative">
        <div
          className={cn(
            'h-8 w-8 rounded-md flex items-center justify-center',
            accent
              ? 'brand-gradient text-white'
              : warning
              ? 'bg-amber-500/10 text-amber-500'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
        </div>

        {trend && trend.direction !== 'flat' && (
          <span
            className={cn(
              'text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1',
              trend.positive
                ? 'text-emerald-500 bg-emerald-500/10'
                : 'text-red-400 bg-red-500/10'
            )}
          >
            {trend.direction === 'up' ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(trend.value).toFixed(1)}%
          </span>
        )}

        {trend && trend.direction === 'flat' && (
          <span className="text-[10px] font-mono px-2 py-1 rounded inline-flex items-center gap-1 text-muted-foreground bg-muted/50">
            <Minus className="h-3 w-3" />
            0%
          </span>
        )}
      </div>

      <div className="relative">
        <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
          {label}
        </div>
        <div
          className={cn(
            'font-semibold tracking-tight',
            accent ? 'text-3xl brand-gradient-text' : 'text-2xl'
          )}
        >
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
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
