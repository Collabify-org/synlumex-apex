'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';

const RANGES = [
  { value: '90d', label: '90d' },
  { value: '180d', label: '6mo' },
  { value: '365d', label: '12mo' },
  { value: 'all', label: 'All' },
];

export function IntelToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get('range') ?? 'all';

  function setRange(range: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', range);
    router.push(`${pathname}?${params.toString()}`);
  }

  const exportUrl = `/api/intelligence/export?${searchParams.toString()}`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              current === r.value
                ? 'brand-gradient text-white'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      <a href={exportUrl}>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-3.5 w-3.5" />
          Export Report
        </Button>
      </a>
    </div>
  );
}
