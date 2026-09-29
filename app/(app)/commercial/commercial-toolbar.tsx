'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Search, Filter, X, Download, ChevronDown } from 'lucide-react';

const TIME_RANGES = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '180d', label: '6mo' },
  { value: 'all', label: 'All' },
];

const CURRENCIES = ['INR', 'USD', 'SAR'];

type Props = {
  clients: string[];
  totalCount: number;
  filteredCount: number;
};

export function CommercialToolbar({
  clients,
  totalCount,
  filteredCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '');
  }, [searchParams]);

  const range = searchParams.get('range') ?? '30d';
  const clientFilters = searchParams.getAll('client');
  const currencyFilters = searchParams.getAll('currency');
  const activeFilterCount = clientFilters.length + currencyFilters.length;

  function updateParams(updates: {
    q?: string | null;
    range?: string;
    client?: string[];
    currency?: string[];
  }) {
    const params = new URLSearchParams(searchParams.toString());
    if (updates.q !== undefined) {
      if (updates.q) params.set('q', updates.q);
      else params.delete('q');
    }
    if (updates.range !== undefined) {
      params.set('range', updates.range);
    }
    const arrayKeys: ('client' | 'currency')[] = ['client', 'currency'];
    for (const key of arrayKeys) {
      if (updates[key] !== undefined) {
        params.delete(key);
        for (const v of updates[key]!) params.append(key, v);
      }
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      updateParams({ q: value || null });
    }, 350);
  }

  function toggleFilter(key: 'client' | 'currency', value: string) {
    const current = searchParams.getAll(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateParams({ [key]: next });
  }

  function clearAll() {
    setSearchValue('');
    updateParams({ q: null, client: [], currency: [] });
  }

  const exportUrl = `/api/commercial/export?${searchParams.toString()}`;

  return (
    <div className="space-y-3">
      {/* Row 1: time + search + filters + export */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time range segmented control */}
        <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => updateParams({ range: r.value })}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                range === r.value
                  ? 'brand-gradient text-white'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search project, client…"
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

        <Button
          variant={filtersOpen || activeFilterCount > 0 ? 'default' : 'outline'}
          size="sm"
          className={cn(
            'gap-2',
            activeFilterCount > 0 && 'brand-gradient text-white'
          )}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-mono">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 transition-transform',
              filtersOpen && 'rotate-180'
            )}
          />
        </Button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-muted-foreground hover:text-foreground font-medium"
          >
            Clear all
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground font-mono hidden sm:block">
            {filteredCount}
            {filteredCount !== totalCount && ` / ${totalCount}`} projects
          </span>
          <a href={exportUrl}>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </a>
        </div>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="rounded-lg border border-border bg-card/40 p-4 space-y-4">
          {clients.length > 0 && (
            <FilterGroup
              label="Client"
              options={clients.map((c) => ({ value: c, label: c }))}
              selected={clientFilters}
              onToggle={(v) => toggleFilter('client', v)}
            />
          )}
          <FilterGroup
            label="Currency"
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            selected={currencyFilters}
            onToggle={(v) => toggleFilter('currency', v)}
          />
        </div>
      )}

      {/* Active filter chips */}
      {activeFilterCount > 0 && !filtersOpen && (
        <div className="flex flex-wrap items-center gap-1.5">
          {clientFilters.map((c) => (
            <Chip key={`c-${c}`} onRemove={() => toggleFilter('client', c)}>
              Client: {c}
            </Chip>
          ))}
          {currencyFilters.map((c) => (
            <Chip key={`cur-${c}`} onRemove={() => toggleFilter('currency', c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              onClick={() => onToggle(o.value)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs transition-all',
                active
                  ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                  : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand-cyan/40 bg-brand/10 px-2 py-0.5 text-[10px] font-mono text-brand-cyan">
      {children}
      <button onClick={onRemove} className="hover:text-foreground">
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
