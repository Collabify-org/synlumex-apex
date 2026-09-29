'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/format';
import {
  Search,
  AlertTriangle,
  ArrowUpDown,
  X,
  User,
} from 'lucide-react';
import { ExceptionDrawer, type ExceptionRow, type ExceptionEvent } from './exception-drawer';

type TeamMember = { id: string; name: string };

type Props = {
  rows: ExceptionRow[];
  eventsByException: Record<string, ExceptionEvent[]>;
  teamMembers: TeamMember[];
};

type SeverityFilter = 'critical' | 'high' | 'medium' | 'low';
type StatusFilter = 'open' | 'ack' | 'closed';
type SortField = 'severity' | 'age' | 'project' | 'type';
type SortDir = 'asc' | 'desc';

const SEV_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const sevVariant: Record<string, 'red' | 'amber' | 'outline' | 'secondary'> = {
  critical: 'red',
  high: 'amber',
  medium: 'outline',
  low: 'secondary',
};

const statusVariant: Record<string, 'amber' | 'green' | 'outline'> = {
  open: 'outline',
  ack: 'amber',
  closed: 'green',
};

const statusLabel: Record<string, string> = {
  open: 'Open',
  ack: 'Ack',
  closed: 'Closed',
};

export function ExceptionsList({ rows, eventsByException, teamMembers }: Props) {
  const [search, setSearch] = useState('');
  const [sevFilter, setSevFilter] = useState<SeverityFilter[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortField>('severity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Close drawer with Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null);
    }
    if (openId) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [openId]);

  function toggleSev(s: SeverityFilter) {
    setSevFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function toggleStatus(s: StatusFilter) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function cycleSort(field: SortField) {
    if (sort === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(field);
      setSortDir(field === 'severity' ? 'asc' : 'desc');
    }
  }

  const filtered = useMemo(() => {
    let result = rows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.message.toLowerCase().includes(q) ||
          r.type.toLowerCase().includes(q) ||
          (r.project_code ?? '').toLowerCase().includes(q) ||
          (r.project_name ?? '').toLowerCase().includes(q)
      );
    }

    if (sevFilter.length > 0) {
      result = result.filter((r) => sevFilter.includes(r.severity as SeverityFilter));
    }

    if (statusFilter.length > 0) {
      result = result.filter((r) =>
        statusFilter.includes(r.status as StatusFilter)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sort === 'severity') {
        cmp = (SEV_ORDER[a.severity] ?? 99) - (SEV_ORDER[b.severity] ?? 99);
      } else if (sort === 'age') {
        cmp =
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sort === 'project') {
        cmp = (a.project_code ?? '').localeCompare(b.project_code ?? '');
      } else if (sort === 'type') {
        cmp = a.type.localeCompare(b.type);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [rows, search, sevFilter, statusFilter, sort, sortDir]);

  const openRow = openId ? rows.find((r) => r.id === openId) ?? null : null;
  const openEvents = openId ? eventsByException[openId] ?? [] : [];

  const hasFilters =
    search.trim().length > 0 || sevFilter.length > 0 || statusFilter.length > 0;

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        {/* Search + clear */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message, project, type…"
              className="pl-9 pr-8 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setSevFilter([]);
                setStatusFilter([]);
              }}
              className="text-xs text-muted-foreground hover:text-foreground font-medium"
            >
              Clear all
            </button>
          )}
          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {filtered.length}
            {filtered.length !== rows.length && ` / ${rows.length}`} shown
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Severity
          </span>
          {(['critical', 'high', 'medium', 'low'] as SeverityFilter[]).map((s) => {
            const active = sevFilter.includes(s);
            const count = rows.filter((r) => r.severity === s).length;
            return (
              <button
                key={s}
                onClick={() => toggleSev(s)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] transition-all capitalize',
                  active
                    ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                    : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
                )}
              >
                {s} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}

          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase ml-4">
            Status
          </span>
          {(['open', 'ack', 'closed'] as StatusFilter[]).map((s) => {
            const active = statusFilter.includes(s);
            const count = rows.filter((r) => r.status === s).length;
            return (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[11px] transition-all capitalize',
                  active
                    ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                    : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
                )}
              >
                {s} {count > 0 && <span className="opacity-60">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <SortableHeader
                  field="severity"
                  current={sort}
                  dir={sortDir}
                  onSort={cycleSort}
                >
                  SEVERITY
                </SortableHeader>
                <SortableHeader
                  field="project"
                  current={sort}
                  dir={sortDir}
                  onSort={cycleSort}
                >
                  PROJECT
                </SortableHeader>
                <SortableHeader
                  field="type"
                  current={sort}
                  dir={sortDir}
                  onSort={cycleSort}
                >
                  TYPE
                </SortableHeader>
                <th className="text-left p-3 font-normal">MESSAGE</th>
                <th className="text-left p-3 font-normal">STATUS</th>
                <th className="text-left p-3 font-normal">ASSIGNED</th>
                <SortableHeader
                  field="age"
                  current={sort}
                  dir={sortDir}
                  onSort={cycleSort}
                  align="right"
                >
                  AGE
                </SortableHeader>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">
                    {hasFilters
                      ? 'No exceptions match your filters.'
                      : 'No exceptions. Portfolio is clean.'}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => setOpenId(e.id)}
                    className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3">
                      <Badge variant={sevVariant[e.severity] ?? 'outline'} className="text-[10px]">
                        {e.severity}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="font-mono text-xs text-brand">{e.project_code ?? '—'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[220px]">
                        {e.project_name ?? ''}
                      </div>
                    </td>
                    <td className="p-3 text-xs font-mono text-muted-foreground">
                      {e.type.replace(/_/g, ' ')}
                    </td>
                    <td className="p-3 max-w-[360px]">
                      <div className="text-sm leading-snug truncate">{e.message}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariant[e.status] ?? 'outline'} className="text-[10px]">
                        {statusLabel[e.status] ?? e.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {e.assigned_name ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {e.assigned_name}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                      {timeAgo(e.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer */}
      {openRow && (
        <ExceptionDrawer
          open={true}
          onClose={() => setOpenId(null)}
          exception={openRow}
          events={openEvents}
          teamMembers={teamMembers}
        />
      )}
    </>
  );
}

function SortableHeader({
  field,
  current,
  dir,
  onSort,
  children,
  align,
}: {
  field: SortField;
  current: SortField;
  dir: SortDir;
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
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'flex-row-reverse'
        )}
      >
        {children}
        <ArrowUpDown
          className={cn(
            'h-3 w-3 transition-colors',
            active ? 'text-brand' : 'opacity-30'
          )}
        />
      </span>
    </th>
  );
}
