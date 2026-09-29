'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { timeAgo, shortDate } from '@/lib/format';
import {
  X,
  Check,
  Ban,
  User,
  UserCheck,
  MessageSquarePlus,
  Loader2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RotateCcw,
  BellOff,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  acknowledgeException,
  assignException,
  resolveException,
  dismissException,
  snoozeException,
  unsnoozeException,
  reopenException,
  addExceptionNote,
} from './exception-actions';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'ack' | 'closed';

export type ExceptionRow = {
  id: string;
  project_id: string;
  project_code: string | null;
  project_name: string | null;
  type: string;
  severity: Severity;
  message: string;
  status: Status;
  assigned_to: string | null;
  assigned_name: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  acknowledged_at: string | null;
  snoozed_until: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExceptionEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  actor_name: string | null;
  note: string | null;
  created_at: string;
};

type TeamMember = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  exception: ExceptionRow;
  events: ExceptionEvent[];
  teamMembers: TeamMember[];
};

const sevVariant: Record<Severity, 'red' | 'amber' | 'outline' | 'secondary'> = {
  critical: 'red',
  high: 'amber',
  medium: 'outline',
  low: 'secondary',
};

const sevLabel: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const statusVariant: Record<Status, 'amber' | 'green' | 'outline'> = {
  open: 'outline',
  ack: 'amber',
  closed: 'green',
};

const statusLabel: Record<Status, string> = {
  open: 'Open',
  ack: 'Acknowledged',
  closed: 'Closed',
};

export function ExceptionDrawer({
  open,
  onClose,
  exception,
  events,
  teamMembers,
}: Props) {
  const [mode, setMode] = useState<
    'view' | 'resolve' | 'dismiss' | 'note' | 'assign' | 'snooze'
  >('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resolveNote, setResolveNote] = useState('');
  const [dismissReason, setDismissReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>(
    exception.assigned_to ?? ''
  );

  useEffect(() => {
    setMode('view');
    setError(null);
    setResolveNote('');
    setDismissReason('');
    setNoteText('');
    setSelectedAssignee(exception.assigned_to ?? '');
  }, [exception.id, exception.assigned_to]);

  const isOpen = exception.status === 'open';
  const isAck = exception.status === 'ack';
  const isClosed = exception.status === 'closed';
  const isSnoozed =
    exception.snoozed_until && new Date(exception.snoozed_until) > new Date();

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return false;
    }
    return true;
  }

  async function handleAck() {
    if (await run(() => acknowledgeException(exception.id))) setMode('view');
  }

  async function handleResolve() {
    if (
      await run(() =>
        resolveException(exception.id, { note: resolveNote.trim() || undefined })
      )
    ) {
      setResolveNote('');
      setMode('view');
    }
  }

  async function handleDismiss() {
    if (
      await run(() =>
        dismissException(exception.id, {
          reason: dismissReason.trim() || undefined,
        })
      )
    ) {
      setDismissReason('');
      setMode('view');
    }
  }

  async function handleNote() {
    if (!noteText.trim()) {
      setError('Note required');
      return;
    }
    if (await run(() => addExceptionNote(exception.id, { note: noteText.trim() }))) {
      setNoteText('');
      setMode('view');
    }
  }

  async function handleAssign() {
    if (
      await run(() =>
        assignException(exception.id, selectedAssignee || null)
      )
    ) {
      setMode('view');
    }
  }

  async function handleSnooze(days: number) {
    if (await run(() => snoozeException(exception.id, { days }))) {
      setMode('view');
    }
  }

  async function handleUnsnooze() {
    await run(() => unsnoozeException(exception.id));
  }

  async function handleReopen() {
    await run(() => reopenException(exception.id, {}));
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
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[540px] bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant={sevVariant[exception.severity]} className="text-[9px]">
                {sevLabel[exception.severity]}
              </Badge>
              <Badge variant={statusVariant[exception.status]} className="text-[9px]">
                {statusLabel[exception.status]}
              </Badge>
              {isSnoozed && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  <BellOff className="h-2.5 w-2.5" />
                  Snoozed
                </Badge>
              )}
            </div>
            <h2 className="text-base font-semibold leading-snug">
              {exception.message}
            </h2>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-1">
              {exception.type.replace(/_/g, ' ')}
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
          {/* Project link */}
          {exception.project_id && (
            <Link
              href={`/projects/${exception.project_id}`}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 hover:border-brand-cyan/40 hover:bg-card/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-brand">
                  {exception.project_code}
                </div>
                <div className="text-sm truncate">{exception.project_name}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Raised
              </div>
              <div className="text-sm">{timeAgo(exception.created_at)}</div>
            </div>
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Assigned to
              </div>
              <div className="text-sm truncate">
                {exception.assigned_name ?? 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Resolution note (if closed) */}
          {isClosed && exception.resolution_note && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase mb-1">
                Resolution
              </div>
              <div className="text-sm whitespace-pre-wrap">
                {exception.resolution_note}
              </div>
            </div>
          )}

          {/* Actions */}
          {mode === 'view' && (
            <div>
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Actions
              </div>

              {isOpen && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleAck}
                    disabled={busy}
                    className="gap-2 brand-gradient text-white col-span-2"
                    size="sm"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Acknowledge
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMode('assign')}
                  >
                    <User className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMode('snooze')}
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    Snooze
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10"
                    onClick={() => setMode('resolve')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-muted-foreground"
                    onClick={() => setMode('dismiss')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Dismiss
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 col-span-2"
                    onClick={() => setMode('note')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              )}

              {isAck && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMode('assign')}
                  >
                    <User className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMode('snooze')}
                  >
                    <BellOff className="h-3.5 w-3.5" />
                    Snooze
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-emerald-500 border-emerald-500/40 hover:bg-emerald-500/10 col-span-2"
                    onClick={() => setMode('resolve')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 col-span-2"
                    onClick={() => setMode('note')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              )}

              {isClosed && (
                <div className="space-y-2">
                  <div className="rounded-md border border-border bg-card/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    Closed {exception.resolved_at ? timeAgo(exception.resolved_at) : ''}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={handleReopen}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Reopen exception
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 w-full"
                    onClick={() => setMode('note')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              )}

              {isSnoozed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full mt-2"
                  onClick={handleUnsnooze}
                  disabled={busy}
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                  Unsnooze
                </Button>
              )}
            </div>
          )}

          {/* Resolve form */}
          {mode === 'resolve' && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-emerald-500">Resolve exception</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Resolution note (optional)
                </Label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  rows={3}
                  placeholder="What was done to fix this?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleResolve}
                  disabled={busy}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Mark resolved
                </Button>
              </div>
            </div>
          )}

          {/* Dismiss form */}
          {mode === 'dismiss' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Dismiss exception</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Reason (optional)
                </Label>
                <textarea
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                  rows={3}
                  placeholder="Why is this not a real issue?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDismiss}
                  disabled={busy}
                  variant="outline"
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Assign form */}
          {mode === 'assign' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Assign to team member</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <select
                value={selectedAssignee}
                onChange={(e) => setSelectedAssignee(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Unassigned —</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAssign}
                  disabled={busy}
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Snooze form */}
          {mode === 'snooze' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Snooze exception</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Hide this exception and show it again later.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7].map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnooze(d)}
                    disabled={busy}
                  >
                    {d} day{d === 1 ? '' : 's'}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[14, 30].map((d) => (
                  <Button
                    key={d}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSnooze(d)}
                    disabled={busy}
                  >
                    {d} days
                  </Button>
                ))}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setMode('view')}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Note form */}
          {mode === 'note' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Add note</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="What's the status? Any update?"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleNote}
                  disabled={busy || !noteText.trim()}
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save note
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Event history */}
          <div>
            <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">
              Timeline ({events.length})
            </div>
            {events.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No events yet. Actions will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  acknowledged: <Check className="h-3.5 w-3.5 text-amber-500" />,
  assigned: <User className="h-3.5 w-3.5 text-blue-400" />,
  resolved: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  dismissed: <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />,
  snoozed: <BellOff className="h-3.5 w-3.5 text-muted-foreground" />,
  unsnoozed: <BellOff className="h-3.5 w-3.5 text-amber-500" />,
  reopened: <RotateCcw className="h-3.5 w-3.5 text-amber-500" />,
  noted: <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />,
};

const EVENT_LABEL: Record<string, string> = {
  acknowledged: 'Acknowledged',
  assigned: 'Assigned',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
  snoozed: 'Snoozed',
  unsnoozed: 'Unsnoozed',
  reopened: 'Reopened',
  noted: 'Note',
};

function EventRow({ event }: { event: ExceptionEvent }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
      <div className="h-7 w-7 rounded-md bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
        {EVENT_ICON[event.event_type] ?? <Clock className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold">
            {EVENT_LABEL[event.event_type] ?? event.event_type}
          </span>
          {event.actor_name && (
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              <User className="h-2.5 w-2.5" />
              {event.actor_name}
            </span>
          )}
        </div>
        {event.note && (
          <div className="text-xs text-muted-foreground mt-1 leading-snug whitespace-pre-wrap">
            {event.note}
          </div>
        )}
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {timeAgo(event.created_at)}
        </div>
      </div>
    </div>
  );
}
