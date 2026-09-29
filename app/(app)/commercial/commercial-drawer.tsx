'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatMoney, shortDate, pct } from '@/lib/format';
import {
  X,
  ExternalLink,
  FileText,
  Banknote,
  AlertTriangle,
  Clock,
} from 'lucide-react';

export type InvoiceRow = {
  id: string;
  invoice_no: string;
  amount: number;
  billed_at: string;
  due_at: string | null;
  status: string;
};

export type CollectionRow = {
  id: string;
  amount: number;
  collected_at: string;
  reference: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  project: {
    id: string;
    code: string;
    name: string;
    client_name: string | null;
    currency: string;
    contract_value: number;
    billed: number;
    collected: number;
    unbilled: number;
    overdue: number;
    efficiency: number;
    aging_0_30: number;
    aging_31_60: number;
    aging_61_90: number;
    aging_90_plus: number;
  };
  invoices: InvoiceRow[];
  collections: CollectionRow[];
};

export function CommercialDrawer({
  open,
  onClose,
  project,
  invoices,
  collections,
}: Props) {
  const statusVariant: Record<string, 'green' | 'amber' | 'red' | 'outline'> = {
    paid: 'green',
    approved: 'outline',
    raised: 'outline',
    unpaid: 'amber',
    overdue: 'red',
  };

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
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[600px] bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] text-brand mb-1">
              {project.code}
            </div>
            <h2 className="text-lg font-bold tracking-tight">{project.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {project.client_name ?? 'No client'}
            </p>
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
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Financial summary */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCell
              label="Contract"
              value={formatMoney(project.contract_value, project.currency as any)}
            />
            <SummaryCell
              label="Billed"
              value={formatMoney(project.billed, project.currency as any)}
              sub={
                project.contract_value > 0
                  ? `${pct((project.billed / project.contract_value) * 100)} of contract`
                  : undefined
              }
            />
            <SummaryCell
              label="Collected"
              value={formatMoney(project.collected, project.currency as any)}
              accent="emerald"
              sub={pct(project.efficiency) + ' efficiency'}
            />
            <SummaryCell
              label="Unbilled"
              value={formatMoney(project.unbilled, project.currency as any)}
              accent="amber"
            />
            {project.overdue > 0 && (
              <SummaryCell
                label="Overdue"
                value={formatMoney(project.overdue, project.currency as any)}
                accent="red"
                colSpan
              />
            )}
          </div>

          {/* Aging buckets */}
          {project.overdue > 0 && (
            <div>
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Aging Buckets
              </div>
              <div className="grid grid-cols-4 gap-2">
                <AgingBucket
                  label="0-30"
                  value={project.aging_0_30}
                  currency={project.currency}
                  tone="mild"
                />
                <AgingBucket
                  label="31-60"
                  value={project.aging_31_60}
                  currency={project.currency}
                  tone="warn"
                />
                <AgingBucket
                  label="61-90"
                  value={project.aging_61_90}
                  currency={project.currency}
                  tone="warn"
                />
                <AgingBucket
                  label="90+"
                  value={project.aging_90_plus}
                  currency={project.currency}
                  tone="danger"
                />
              </div>
            </div>
          )}

          {/* Open project */}
          <Link
            href={`/projects/${project.id}`}
            className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 hover:border-brand-cyan/40 hover:bg-card/60 transition-colors"
          >
            <span className="text-sm">Open project workspace</span>
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>

          {/* Invoices */}
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Invoices ({invoices.length})
            </div>
            {invoices.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No invoices raised for this project yet.
              </div>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-brand">
                          {inv.invoice_no}
                        </span>
                        <Badge
                          variant={statusVariant[inv.status] ?? 'outline'}
                          className="text-[9px] capitalize"
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground flex items-center gap-3">
                        <span>Billed {shortDate(inv.billed_at)}</span>
                        {inv.due_at && <span>Due {shortDate(inv.due_at)}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm">
                        {formatMoney(inv.amount, project.currency as any)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collections */}
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3 flex items-center gap-1">
              <Banknote className="h-3 w-3" />
              Collections ({collections.length})
            </div>
            {collections.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No collections received for this project yet.
              </div>
            ) : (
              <div className="space-y-2">
                {collections.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs">
                        {shortDate(c.collected_at)}
                      </div>
                      {c.reference && (
                        <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                          Ref: {c.reference}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-sm text-emerald-400">
                        +{formatMoney(c.amount, project.currency as any)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  accent,
  colSpan,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'emerald' | 'amber' | 'red';
  colSpan?: boolean;
}) {
  const colorClass =
    accent === 'emerald'
      ? 'text-emerald-500'
      : accent === 'amber'
      ? 'text-amber-500'
      : accent === 'red'
      ? 'text-red-400'
      : 'text-foreground';

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-card/40 p-3',
        colSpan && 'col-span-2'
      )}
    >
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label}
      </div>
      <div className={cn('text-lg font-semibold', colorClass)}>{value}</div>
      {sub && <div className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function AgingBucket({
  label,
  value,
  currency,
  tone,
}: {
  label: string;
  value: number;
  currency: string;
  tone: 'mild' | 'warn' | 'danger';
}) {
  const colorClass =
    tone === 'mild'
      ? 'text-amber-300'
      : tone === 'warn'
      ? 'text-amber-400'
      : 'text-red-400';
  const borderClass =
    tone === 'mild'
      ? 'border-amber-300/30'
      : tone === 'warn'
      ? 'border-amber-400/40'
      : 'border-red-500/40';

  return (
    <div className={cn('rounded-md border bg-card/40 p-2', borderClass)}>
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label} days
      </div>
      <div className={cn('text-xs font-mono font-semibold', colorClass)}>
        {value > 0 ? formatMoney(value, currency as any) : '—'}
      </div>
    </div>
  );
}
