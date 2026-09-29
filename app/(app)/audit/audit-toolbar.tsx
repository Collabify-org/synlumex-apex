'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, X, Download, ChevronDown } from 'lucide-react';
import type { AuditCategory } from '@/lib/queries/audit';

const CATEGORIES: { value: AuditCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'stage', label: 'Stage' },
  { value: 'exception', label: 'Exception' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'billing', label: 'Billing' },
  { value: 'settings', label: 'Settings' },
  { value: 'system', label: 'System' },
];

const RANGES = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'all', label: 'All' },
];

type Actor = { id: string; name: string };

type Props = {
  actors: Actor[];
  totalCount: number;
  filteredCount: number;
};

export function AuditToolbar({ actors, totalCount, filteredCount }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '');
  const [actorOpen, setActorOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const category = (searchParams.get('category') as AuditCategory) ?? 'all';
  const range = searchParams.get('range') ?? '30d';
  const actorId = searchParams.get('actor_id') ?? '';

  function updateParams(updates: {
    q?: string | null;
    category?: string;
    range?: string;
    actor_id?: string | null;
    page?: number | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.q !== undefined) {
      if (updates.q) params.set('q', updates.q);
      else params.delete('q');
    }
    if (updates.category !== undefined) params.set('category', updates.category);
    if (updates.range !== undefined) params.set('range', updates.range);
    if (updates.actor_id !== undefined) {
      if (updates.actor_id) params.set('actor_id', updates.actor_id);
      else params.delete('actor_id');
    }
    // Reset page on any filter change
    if (updates.page === null) params.delete('page');
    else if (updates.page !== undefined) params.set('page', String(updates.page));
    else params.delete('page');

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value || null });
    }, 350);
  }

  const exportUrl = `/api/audit/export?${searchParams.toString()}`;
  const selectedActor = actors.find((a) => a.id === actorId);

  return (
    <div className="space-y-3">
      {/* Row 1: category chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
          Category
        </span>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => updateParams({ category: c.value })}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
              category === c.value
                ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Row 2: search + range + actor + export */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search action, entity, project…"
            className="pl-9 pr-8 h-9"
          />
          {searchValue && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => updateParams({ range: r.value })}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors',
                range === r.value
                  ? 'brand-gradient text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Actor filter dropdown */}
        {actors.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className={cn('gap-2', actorId && 'brand-gradient text-white')}
              onClick={() => setActorOpen((v) => !v)}
            >
              {selectedActor ? selectedActor.name : 'Actor'}
              <ChevronDown className="h-3 w-3" />
            </Button>
            {actorOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setActorOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-56 rounded-md border border-border bg-card shadow-lg z-20 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      updateParams({ actor_id: null });
                      setActorOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-xs hover:bg-accent/50',
                      !actorId && 'font-medium text-brand'
                    )}
                  >
                    All actors
                  </button>
                  <button
                    onClick={() => {
                      updateParams({ actor_id: '__system__' });
                      setActorOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-accent/50 border-t border-border/50"
                  >
                    System only
                  </button>
                  {actors.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        updateParams({ actor_id: a.id });
                        setActorOpen(false);
                      }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs hover:bg-accent/50 border-t border-border/50',
                        actorId === a.id && 'font-medium text-brand'
                      )}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">
            {filteredCount}
            {filteredCount !== totalCount && ` / ${totalCount}`} events
          </span>
          <a href={exportUrl}>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
}
