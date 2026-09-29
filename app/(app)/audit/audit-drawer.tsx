'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { timeAgo, shortDate } from '@/lib/format';
import type { AuditRow, AuditCategory } from '@/lib/queries/audit';
import {
  X,
  ExternalLink,
  User,
  Cog,
  Calendar,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  FileText,
  AlertTriangle,
  Bell,
  Banknote,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';

const CATEGORY_META: Record<
  AuditCategory,
  { label: string; color: string; icon: React.ReactNode }
> = {
  stage: {
    label: 'Stage',
    color: 'text-brand',
    icon: <Layers className="h-3.5 w-3.5" />,
  },
  exception: {
    label: 'Exception',
    color: 'text-amber-500',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  reminder: {
    label: 'Reminder',
    color: 'text-blue-400',
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  billing: {
    label: 'Billing',
    color: 'text-emerald-500',
    icon: <Banknote className="h-3.5 w-3.5" />,
  },
  settings: {
    label: 'Settings',
    color: 'text-muted-foreground',
    icon: <SettingsIcon className="h-3.5 w-3.5" />,
  },
  system: {
    label: 'System',
    color: 'text-muted-foreground',
    icon: <Cog className="h-3.5 w-3.5" />,
  },
  all: {
    label: 'All',
    color: 'text-foreground',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
};

export function AuditDrawer({
  open,
  onClose,
  row,
}: {
  open: boolean;
  onClose: () => void;
  row: AuditRow;
}) {
  const [copied, setCopied] = useState(false);

  const meta = CATEGORY_META[row.category] ?? CATEGORY_META.system;

  async function copyPayload() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(row.payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}

      <div
        className={cn(
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[560px] bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={cn('flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase', meta.color)}>
                {meta.icon}
                {meta.label}
              </span>
              <Badge variant="outline" className="text-[9px] font-mono">
                {row.action}
              </Badge>
            </div>
            <h2 className="text-base font-semibold leading-snug">
              Event detail
            </h2>
            <div className="text-xs text-muted-foreground mt-1 font-mono">
              {timeAgo(row.created_at)} · {shortDate(row.created_at)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Context grid */}
          <div className="grid grid-cols-2 gap-3">
            <ContextCell
              icon={<User className="h-3 w-3" />}
              label="Actor"
              value={row.actor_name ?? 'System'}
              sub={row.actor_id ? 'Human action' : 'Automatic'}
            />
            <ContextCell
              icon={<Calendar className="h-3 w-3" />}
              label="When"
              value={timeAgo(row.created_at)}
              sub={shortDate(row.created_at)}
            />
          </div>

          {/* Project link */}
          {row.project_id && (
            <Link
              href={`/projects/${row.project_id}`}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 hover:border-brand-cyan/40 hover:bg-card/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-brand">
                  {row.project_code}
                </div>
                <div className="text-sm truncate">{row.project_name}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* Entity */}
          {(row.entity || row.entity_id) && (
            <div className="rounded-md border border-border bg-card/40 p-3 space-y-1.5">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                Entity
              </div>
              {row.entity && (
                <div className="text-sm font-mono">{row.entity}</div>
              )}
              {row.entity_id && (
                <div className="text-[10px] font-mono text-muted-foreground break-all">
                  {row.entity_id}
                </div>
              )}
            </div>
          )}

          {/* Payload viewer */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                Payload
              </div>
              {row.payload && Object.keys(row.payload).length > 0 && (
                <button
                  onClick={copyPayload}
                  className="text-[10px] text-muted-foreground hover:text-foreground font-medium inline-flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <Check className="h-2.5 w-2.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-2.5 w-2.5" />
                      Copy JSON
                    </>
                  )}
                </button>
              )}
            </div>
            {!row.payload || Object.keys(row.payload).length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No payload recorded for this event.
              </div>
            ) : (
              <JsonViewer data={row.payload} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function ContextCell({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm truncate">{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

// ---------- JSON VIEWER ----------

function JsonViewer({ data }: { data: any }) {
  if (data === null) return <Muted>null</Muted>;
  if (typeof data === 'string') return <StringVal v={data} />;
  if (typeof data === 'number') return <NumberVal v={data} />;
  if (typeof data === 'boolean') return <BooleanVal v={data} />;
  if (Array.isArray(data)) return <ArrayNode data={data} />;
  if (typeof data === 'object') return <ObjectNode data={data} />;
  return <Muted>{String(data)}</Muted>;
}

function ObjectNode({ data }: { data: Record<string, any> }) {
  const [expanded, setExpanded] = useState(true);
  const keys = Object.keys(data);
  if (keys.length === 0) return <Muted>{'{}'}</Muted>;

  return (
    <div className="font-mono text-xs leading-relaxed">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="text-foreground">{'{'}</span>
        {!expanded && <span className="text-muted-foreground">…{keys.length} keys…</span>}
        {!expanded && <span className="text-foreground">{'}'}</span>}
      </button>

      {expanded && (
        <div className="ml-4 border-l border-border/50 pl-3 py-1 space-y-1">
          {keys.map((k) => (
            <div key={k} className="flex flex-wrap gap-x-2">
              <span className="text-brand-cyan">{k}:</span>
              <span className="min-w-0 break-all">
                <JsonViewer data={data[k]} />
              </span>
            </div>
          ))}
        </div>
      )}
      {expanded && <span className="text-foreground">{'}'}</span>}
    </div>
  );
}

function ArrayNode({ data }: { data: any[] }) {
  const [expanded, setExpanded] = useState(true);
  if (data.length === 0) return <Muted>[]</Muted>;

  return (
    <div className="font-mono text-xs leading-relaxed">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        <span className="text-foreground">[</span>
        {!expanded && <span className="text-muted-foreground">…{data.length} items…</span>}
        {!expanded && <span className="text-foreground">]</span>}
      </button>

      {expanded && (
        <div className="ml-4 border-l border-border/50 pl-3 py-1 space-y-1">
          {data.map((item, i) => (
            <div key={i} className="flex flex-wrap gap-x-2">
              <span className="text-muted-foreground">{i}:</span>
              <span className="min-w-0 break-all">
                <JsonViewer data={item} />
              </span>
            </div>
          ))}
        </div>
      )}
      {expanded && <span className="text-foreground">]</span>}
    </div>
  );
}

function StringVal({ v }: { v: string }) {
  return <span className="text-emerald-500">"{v}"</span>;
}

function NumberVal({ v }: { v: number }) {
  return <span className="text-amber-500">{v.toLocaleString()}</span>;
}

function BooleanVal({ v }: { v: boolean }) {
  return <span className="text-purple-400">{String(v)}</span>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}
