'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  Loader2,
  FolderKanban,
  AlertTriangle,
  Bell,
  FileText,
  ArrowRight,
  CornerDownLeft,
} from 'lucide-react';

type Result = {
  id: string;
  type: 'project' | 'exception' | 'reminder' | 'invoice';
  title: string;
  subtitle: string | null;
  href: string;
};

const TYPE_META: Record<
  Result['type'],
  { label: string; icon: React.ReactNode; color: string }
> = {
  project: {
    label: 'Project',
    icon: <FolderKanban className="h-3.5 w-3.5" />,
    color: 'text-brand',
  },
  exception: {
    label: 'Exception',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    color: 'text-amber-500',
  },
  reminder: {
    label: 'Reminder',
    icon: <Bell className="h-3.5 w-3.5" />,
    color: 'text-blue-400',
  },
  invoice: {
    label: 'Invoice',
    icon: <FileText className="h-3.5 w-3.5" />,
    color: 'text-emerald-500',
  },
};

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();

    if (q.length < 2) {
      setResults([]);
      setBusy(false);
      return;
    }

    setBusy(true);
    debounceRef.current = setTimeout(async () => {
      const like = `%${q.replace(/%/g, '')}%`;

      const [projects, exceptions, reminders, invoices] = await Promise.all([
        supabase
          .from('projects')
          .select('id, code, name, client_name')
          .or(`code.ilike.${like},name.ilike.${like},client_name.ilike.${like}`)
          .eq('archived', false)
          .limit(6),
        supabase
          .from('exceptions')
          .select('id, project_id, message, severity')
          .ilike('message', like)
          .eq('status', 'open')
          .limit(4),
        supabase
          .from('reminders')
          .select('id, project_id, message')
          .ilike('message', like)
          .eq('status', 'pending')
          .limit(4),
        supabase
          .from('invoices')
          .select('id, invoice_number, plan_name, total_amount, currency')
          .ilike('invoice_number', like)
          .limit(4),
      ]);

      const r: Result[] = [];

      for (const p of projects.data ?? []) {
        r.push({
          id: p.id,
          type: 'project',
          title: `${p.code} — ${p.name}`,
          subtitle: p.client_name,
          href: `/projects/${p.id}`,
        });
      }

      for (const e of exceptions.data ?? []) {
        r.push({
          id: e.id,
          type: 'exception',
          title: e.message,
          subtitle: e.severity.toUpperCase(),
          href: `/exceptions`,
        });
      }

      for (const rem of reminders.data ?? []) {
        r.push({
          id: rem.id,
          type: 'reminder',
          title: rem.message,
          subtitle: null,
          href: `/reminders`,
        });
      }

      for (const inv of invoices.data ?? []) {
        r.push({
          id: inv.id,
          type: 'invoice',
          title: inv.invoice_number,
          subtitle: `${inv.currency} ${Number(inv.total_amount).toLocaleString()}`,
          href: `/account`,
        });
      }

      setResults(r);
      setSelectedIndex(0);
      setBusy(false);
    }, 250);
  }, [query, supabase]);

  // Arrow keys + enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(results.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const r = results[selectedIndex];
        if (r) {
          onClose();
          router.push(r.href);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [results, selectedIndex, onClose, router]);

  // Group results by type
  const grouped = useMemo(() => {
    const groups: Record<Result['type'], Result[]> = {
      project: [],
      exception: [],
      reminder: [],
      invoice: [],
    };
    for (const r of results) groups[r.type].push(r);
    return groups;
  }, [results]);

  // Flat list with proper indices for keyboard nav
  const flat = useMemo(() => results, [results]);

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, exceptions, reminders, invoices…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded border border-border">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              Start typing to search across your workspace
            </div>
          ) : results.length === 0 && !busy ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No results for "{query}"
            </div>
          ) : (
            <div className="py-1">
              {(Object.keys(grouped) as Result['type'][]).map((type) => {
                const items = grouped[type];
                if (items.length === 0) return null;
                const meta = TYPE_META[type];
                return (
                  <div key={type}>
                    <div className="px-4 pt-3 pb-1 text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                      {meta.label}
                      {items.length > 1 ? 's' : ''}
                    </div>
                    {items.map((r) => {
                      const globalIndex = flat.indexOf(r);
                      const selected = globalIndex === selectedIndex;
                      return (
                        <button
                          key={`${r.type}-${r.id}`}
                          onClick={() => {
                            onClose();
                            router.push(r.href);
                          }}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                            selected ? 'bg-accent' : 'hover:bg-accent/50'
                          )}
                        >
                          <span className={cn('shrink-0', meta.color)}>{meta.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm truncate">{r.title}</div>
                            {r.subtitle && (
                              <div className="text-[10px] font-mono text-muted-foreground truncate">
                                {r.subtitle}
                              </div>
                            )}
                          </div>
                          {selected && (
                            <CornerDownLeft className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/20 text-[10px] font-mono text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border">↑↓</kbd>{' '}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border">↵</kbd> Open
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded border border-border">ESC</kbd> Close
            </span>
          </div>
          <span className="hidden sm:inline">Synlumex Apex</span>
        </div>
      </div>
    </div>
  );
}
