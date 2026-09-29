'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { timeAgo, shortDate } from '@/lib/format';
import { createClient } from '@/integrations/../lib/supabase/client';
import {
  Search,
  AlertTriangle,
  Bell,
  CheckCircle2,
  X,
  User,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import {
  ReminderDrawer,
  type ReminderRow,
  type ReminderEvent,
} from './reminder-drawer';

type TeamMember = { id: string; name: string };
type StatusFilter = 'pending' | 'overdue' | 'done';

type Props = {
  rows: ReminderRow[];
  eventsByReminder: Record<string, ReminderEvent[]>;
  teamMembers: TeamMember[];
};

const priorityVariant: Record<string, 'outline' | 'amber' | 'red' | 'secondary'> = {
  low: 'secondary',
  normal: 'outline',
  high: 'amber',
  urgent: 'red',
};

export function RemindersList({ rows, eventsByReminder, teamMembers }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter[]>(['overdue', 'pending']);
  const [sort, setSort] = useState<'due' | 'priority'>('due');
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenId(null);
    }
    if (openId) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [openId]);

  function toggleStatus(s: StatusFilter) {
    setStatusFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function toggleSelect(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  async function bulkComplete() {
    if (selected.size === 0) return;
    if (
      !confirm(
        `Mark ${selected.size} reminder${selected.size === 1 ? '' : 's'} as done?`
      )
    )
      return;
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reminders')
        .update({ status: 'done', completed_at: now, updated_at: now })
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

  // Compute status for each row
  const enrichedRows = useMemo(() => {
    const now = Date.now();
    return rows.map((r) => {
      const due = new Date(r.due_at).getTime();
      const isOverdue = r.status === 'pending' && due < now;
      const isSnoozed =
        r.snoozed_until && new Date(r.snoozed_until).getTime() > now;
      return {
        ...r,
        _isOverdue: isOverdue,
        _isSnoozed: isSnoozed,
        _dueMs: due,
      };
    });
  }, [rows]);

  // Filter + sort
  const filtered = useMemo(() => {
    let result = enrichedRows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.message.toLowerCase().includes(q) ||
          (r.project_code ?? '').toLowerCase().includes(q) ||
          (r.project_name ?? '').toLowerCase().includes(q) ||
          (r.assigned_name ?? '').toLowerCase().includes(q)
      );
    }

    if (statusFilter.length > 0) {
      result = result.filter((r) => {
        if (statusFilter.includes('overdue') && r._isOverdue) return true;
        if (statusFilter.includes('pending') && r.status === 'pending' && !r._isOverdue) return true;
        if (statusFilter.includes('done') && r.status === 'done') return true;
        return false;
      });
    }

    result = [...result].sort((a, b) => {
      if (sort === 'priority') {
        const order = { urgent: 0, high: 1, normal: 2, low: 3 };
        return (
          (order[a.priority] ?? 99) - (order[b.priority] ?? 99) ||
          a._dueMs - b._dueMs
        );
      }
      return a._dueMs - b._dueMs;
    });

    return result;
  }, [enrichedRows, search, statusFilter, sort]);

  const overdue = enrichedRows.filter((r) => r._isOverdue).length;
  const pending = enrichedRows.filter(
    (r) => r.status === 'pending' && !r._isOverdue
  ).length;
  const done = enrichedRows.filter((r) => r.status === 'done').length;

  const openRow = openId ? rows.find((r) => r.id === openId) ?? null : null;
  const openEvents = openId ? eventsByReminder[openId] ?? [] : [];

  const hasFilters = search.trim().length > 0 || statusFilter.length !== 3;

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search message, project, assignee…"
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

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setSort(sort === 'due' ? 'priority' : 'due')}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Sort: {sort === 'due' ? 'Due date' : 'Priority'}
          </Button>

          {hasFilters && (
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter(['overdue', 'pending']);
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

        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
            Status
          </span>
          <button
            onClick={() => toggleStatus('overdue')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
              statusFilter.includes('overdue')
                ? 'border-red-500/60 bg-red-500/10 text-red-400 font-medium'
                : 'border-border bg-background/40 text-muted-foreground hover:border-red-500/40'
            )}
          >
            Overdue ({overdue})
          </button>
          <button
            onClick={() => toggleStatus('pending')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
              statusFilter.includes('pending')
                ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40'
            )}
          >
            Pending ({pending})
          </button>
          <button
            onClick={() => toggleStatus('done')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
              statusFilter.includes('done')
                ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-500 font-medium'
                : 'border-border bg-background/40 text-muted-foreground hover:border-emerald-500/40'
            )}
          >
            Done ({done})
          </button>
        </div>
      </div>

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-md border border-brand-cyan/40 bg-brand/10 px-3 py-2 mb-4">
          <span className="text-xs font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={bulkComplete}
              disabled={busy}
              className="gap-1.5 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10"
            >
              <Check className="h-3.5 w-3.5" />
              Mark done
            </Button>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          {hasFilters
            ? 'No reminders match your filters.'
            : 'No reminders. All clear.'}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((r) => {
            const checked = selected.has(r.id);
            const isDone = r.status === 'done';
            return (
              <Card
                key={r.id}
                onClick={() => setOpenId(r.id)}
                className={cn(
                  'p-4 cursor-pointer transition-all border-l-4 hover:shadow-lg hover:shadow-brand/5',
                  isDone
                    ? 'border-l-emerald-500/60 opacity-70 hover:opacity-100'
                    : r._isOverdue
                    ? 'border-l-red-500'
                    : 'border-l-amber-500/60',
                  checked && 'ring-2 ring-brand-cyan'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(r.id);
                    }}
                    className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors',
                      checked
                        ? 'bg-brand-cyan border-brand-cyan'
                        : 'border-border hover:border-brand-cyan'
                    )}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant={priorityVariant[r.priority] ?? 'outline'}
                        className="text-[9px] capitalize"
                      >
                        {r.priority}
                      </Badge>
                      {isDone ? (
                        <Badge variant="green" className="text-[9px]">
                          Done
                        </Badge>
                      ) : r._isOverdue ? (
                        <Badge variant="red" className="text-[9px]">
                          Overdue
                        </Badge>
                      ) : null}
                      {r._isSnoozed && (
                        <Badge variant="outline" className="text-[9px]">
                          Snoozed
                        </Badge>
                      )}
                    </div>

                    <div className="text-sm leading-snug mb-2">{r.message}</div>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-brand truncate">
                          {r.project_code}
                        </span>
                        {r.assigned_name && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <User className="h-2.5 w-2.5" />
                            {r.assigned_name}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          'shrink-0',
                          r._isOverdue ? 'text-red-400' : 'text-muted-foreground'
                        )}
                      >
                        {shortDate(r.due_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawer */}
      {openRow && (
        <ReminderDrawer
          open={true}
          onClose={() => setOpenId(null)}
          reminder={openRow}
          events={openEvents}
          teamMembers={teamMembers}
        />
      )}
    </>
  );
}
