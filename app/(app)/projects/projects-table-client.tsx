'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatMoney, shortDate } from '@/lib/format';
import { STAGES, type HealthStatus } from '@/lib/types';
import type { ProjectRow } from '@/lib/queries/projects';
import { cn } from '@/lib/utils';
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  MoreVertical,
  Archive,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
} from 'lucide-react';
import { ProjectCardGrid } from './project-card-grid';

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

type SortField =
  | 'code'
  | 'name'
  | 'current_stage'
  | 'health'
  | 'contract_value'
  | 'end_date'
  | 'updated_at';

const PAGE_SIZES = [25, 50, 100];

export function ProjectsTableClient({ rows }: { rows: ProjectRow[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const sort = (searchParams.get('sort') ?? 'updated_at') as SortField;
  const dir = (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'table' | 'card'>('table');

  // Persist view choice
  useEffect(() => {
    try {
      const saved = localStorage.getItem('synlumex:projects-view');
      if (saved === 'card' || saved === 'table') setView(saved);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('synlumex:projects-view', view);
    } catch {}
  }, [view]);

  // Reset selection when rows change
  useEffect(() => {
    setSelected(new Set());
    setPage(1);
  }, [rows.length]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      setMenuOpen(null);
    }
    document.addEventListener('click', handle);
    return () => document.removeEventListener('click', handle);
  }, [menuOpen]);

  function setSort(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === field) {
      params.set('dir', dir === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', field);
      params.set('dir', field === 'code' || field === 'name' ? 'asc' : 'desc');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    const pageIds = pageRows.map((r) => r.id);
    const allSelected = pageIds.every((id) => selected.has(id));
    const next = new Set(selected);
    if (allSelected) pageIds.forEach((id) => next.delete(id));
    else pageIds.forEach((id) => next.add(id));
    setSelected(next);
  }

  async function archiveSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Archive ${selected.size} project${selected.size === 1 ? '' : 's'}? They will be hidden from the active list.`)) return;

    setBusy(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ archived: true })
        .in('id', Array.from(selected));
      if (error) throw error;
      setSelected(new Set());
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function archiveOne(id: string, code: string) {
    if (!confirm(`Archive project ${code}? It will be hidden from the active list.`)) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ archived: true })
        .eq('id', id);
      if (error) throw error;
      router.refresh();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
      setMenuOpen(null);
    }
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const allOnPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  // Totals
  const totals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const r of rows) {
      byCurrency[r.currency] = (byCurrency[r.currency] ?? 0) + r.contract_value;
    }
    return byCurrency;
  }, [rows]);

  const pageTotals = useMemo(() => {
    const byCurrency: Record<string, number> = {};
    for (const r of pageRows) {
      byCurrency[r.currency] = (byCurrency[r.currency] ?? 0) + r.contract_value;
    }
    return byCurrency;
  }, [pageRows]);

  const kpis = useMemo(() => {
    return {
      total: rows.length,
      onTrack: rows.filter((r) => r.health === 'green').length,
      atRisk: rows.filter((r) => r.health === 'amber').length,
      critical: rows.filter((r) => r.health === 'red').length,
      onHold: rows.filter((r) => r.health === 'on_hold').length,
      totalValueByCurrency: totals,
    };
  }, [rows, totals]);

    return (
    <div className="space-y-4">
      {/* View toggle */}
      <div className="flex items-center justify-end">
        <div className="inline-flex items-center rounded-lg border border-border bg-card/60 p-0.5">
          <button
            onClick={() => setView('table')}
            className={cn(
              'px-2.5 py-1.5 text-xs rounded-md transition-colors inline-flex items-center gap-1.5',
              view === 'table'
                ? 'bg-brand/15 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Table view"
          >
            <List className="h-3.5 w-3.5" />
            Table
          </button>
          <button
            onClick={() => setView('card')}
            className={cn(
              'px-2.5 py-1.5 text-xs rounded-md transition-colors inline-flex items-center gap-1.5',
              view === 'card'
                ? 'bg-brand/15 text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-label="Card view"
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Cards
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiStripCell label="Total" value={String(kpis.total)} />
        <KpiStripCell label="On Track" value={String(kpis.onTrack)} color="emerald" />
        <KpiStripCell label="At Risk" value={String(kpis.atRisk)} color="amber" />
        <KpiStripCell label="Critical" value={String(kpis.critical)} color="red" />
        <KpiStripCell
          label="Total Value"
          value={Object.entries(kpis.totalValueByCurrency)
            .map(([cur, val]) => formatMoney(val, cur as any))
            .join(' · ')}
          small
        />
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-brand-cyan/40 bg-brand/10 px-3 py-2">
          <span className="text-xs font-medium">
            {selected.size} selected
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={archiveSelected}
              disabled={busy}
              className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive selected
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="w-10 p-3">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAll}
                    className="h-3.5 w-3.5 rounded border-border cursor-pointer"
                  />
                </th>
                <SortHeader field="code" current={sort} dir={dir} onSort={setSort}>
                  CODE
                </SortHeader>
                <SortHeader field="name" current={sort} dir={dir} onSort={setSort}>
                  NAME
                </SortHeader>
                <th className="text-left p-3 font-normal">CLIENT</th>
                <SortHeader field="current_stage" current={sort} dir={dir} onSort={setSort}>
                  STAGE
                </SortHeader>
                <SortHeader field="health" current={sort} dir={dir} onSort={setSort}>
                  HEALTH
                </SortHeader>
                <SortHeader field="contract_value" current={sort} dir={dir} onSort={setSort} align="right">
                  CONTRACT
                </SortHeader>
                <SortHeader field="end_date" current={sort} dir={dir} onSort={setSort} align="right">
                  END DATE
                </SortHeader>
                <th className="w-10 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-sm text-muted-foreground">
                    No projects match your filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((p) => {
                  const stage = STAGES.find((s) => s.key === p.current_stage);
                  const checked = selected.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={cn(
                        'border-t border-border hover:bg-accent/30 transition-colors',
                        checked && 'bg-brand/5'
                      )}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(p.id)}
                          className="h-3.5 w-3.5 rounded border-border cursor-pointer"
                        />
                      </td>
                      <td className="p-3 font-mono text-xs text-brand">
                        <Link href={`/projects/${p.id}`}>{p.code}</Link>
                      </td>
                      <td className="p-3 max-w-[240px]">
                        <Link
                          href={`/projects/${p.id}`}
                          className="hover:underline block truncate"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[180px]">
                        {p.client_name ?? '—'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {stage?.label ?? p.current_stage}
                      </td>
                      <td className="p-3">
                        <Badge variant={healthVariant[p.health]}>
                          {healthLabel[p.health]}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                        {formatMoney(p.contract_value, p.currency)}
                      </td>
                      <td className="p-3 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {shortDate(p.end_date)}
                      </td>
                      <td className="p-2 text-right relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(menuOpen === p.id ? null : p.id);
                          }}
                          className="p-1.5 rounded hover:bg-accent"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {menuOpen === p.id && (
                          <div
                            className="absolute right-2 top-full mt-1 w-44 rounded-md border border-border bg-card shadow-lg z-20 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link
                              href={`/projects/${p.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-accent/50"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Open project
                            </Link>
                            <button
                              onClick={() => archiveOne(p.id, p.code)}
                              disabled={busy}
                              className="flex items-center gap-2 px-3 py-2 text-xs w-full text-left hover:bg-destructive/10 text-destructive"
                            >
                              <Archive className="h-3 w-3" />
                              Archive project
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {/* Totals row */}
            {pageRows.length > 0 && (
              <tfoot className="bg-muted/20 border-t-2 border-border">
                <tr className="text-xs font-medium">
                  <td colSpan={6} className="p-3 text-right text-muted-foreground">
                    Page totals
                  </td>
                  <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                    {Object.entries(pageTotals)
                      .map(([cur, val]) => formatMoney(val, cur as any))
                      .join(' · ')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
                {rows.length > pageSize && (
                  <tr className="text-xs">
                    <td colSpan={6} className="p-3 text-right text-muted-foreground">
                      Filtered totals ({rows.length} projects)
                    </td>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap font-semibold">
                      {Object.entries(totals)
                        .map(([cur, val]) => formatMoney(val, cur as any))
                        .join(' · ')}
                    </td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {rows.length > pageSize && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded border border-input bg-background px-2 text-xs"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-muted-foreground font-mono">
                {start + 1}–{Math.min(start + pageSize, rows.length)} of {rows.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono px-2">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SortHeader({
  field,
  current,
  dir,
  onSort,
  children,
  align,
}: {
  field: SortField;
  current: SortField;
  dir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const active = current === field;
  return (
    <th
      className={cn(
        'p-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <span className={cn('inline-flex items-center gap-1', align === 'right' && 'flex-row-reverse')}>
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-brand" />
          ) : (
            <ArrowDown className="h-3 w-3 text-brand" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}

function KpiStripCell({
  label,
  value,
  color,
  small,
}: {
  label: string;
  value: string;
  color?: 'emerald' | 'amber' | 'red';
  small?: boolean;
}) {
  const colorClass =
    color === 'emerald'
      ? 'text-emerald-500'
      : color === 'amber'
      ? 'text-amber-500'
      : color === 'red'
      ? 'text-red-400'
      : 'text-foreground';

  return (
    <Card className="p-3 bg-card/50">
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label}
      </div>
      <div className={cn('font-semibold', small ? 'text-xs' : 'text-lg', colorClass)}>
        {value || '—'}
      </div>
    </Card>
  );
}
