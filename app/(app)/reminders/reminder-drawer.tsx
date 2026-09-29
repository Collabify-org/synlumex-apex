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
  BellOff,
  User,
  UserCheck,
  MessageSquarePlus,
  Loader2,
  AlertTriangle,
  Clock,
  ExternalLink,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Calendar,
  Flag,
} from 'lucide-react';
import {
  completeReminder,
  dismissReminder,
  snoozeReminder,
  unsnoozeReminder,
  assignReminder,
  addReminderNote,
  reopenReminder,
  setReminderPriority,
} from './reminder-actions';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Status = 'pending' | 'done' | 'overdue';

export type ReminderRow = {
  id: string;
  project_id: string;
  project_code: string | null;
  project_name: string | null;
  exception_id: string | null;
  message: string;
  due_at: string;
  status: Status;
  priority: Priority;
  assigned_to: string | null;
  assigned_name: string | null;
  completed_at: string | null;
  dismissed_at: string | null;
  snoozed_until: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ReminderEvent = {
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
  reminder: ReminderRow;
  events: ReminderEvent[];
  teamMembers: TeamMember[];
};

const priorityVariant: Record<Priority, 'outline' | 'amber' | 'red' | 'secondary'> = {
  low: 'secondary',
  normal: 'outline',
  high: 'amber',
  urgent: 'red',
};

const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

export function ReminderDrawer({
  open,
  onClose,
  reminder,
  events,
  teamMembers,
}: Props) {
  const [mode, setMode] = useState<
    'view' | 'dismiss' | 'note' | 'assign' | 'snooze' | 'priority'
  >('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dismissReason, setDismissReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>(
    reminder.assigned_to ?? ''
  );

  useEffect(() => {
    setMode('view');
    setError(null);
    setDismissReason('');
    setNoteText('');
    setSelectedAssignee(reminder.assigned_to ?? '');
  }, [reminder.id, reminder.assigned_to]);

  const isPending = reminder.status === 'pending' || reminder.status === 'overdue';
  const isDone = reminder.status === 'done';
  const isSnoozed =
    reminder.snoozed_until && new Date(reminder.snoozed_until) > new Date();

  const dueDate = new Date(reminder.due_at);
  const isOverdue = dueDate < new Date() && isPending;
  const daysOverdue = isOverdue
    ? Math.floor((Date.now() - dueDate.getTime()) / 86400000)
    : 0;
  const daysUntilDue = !isOverdue
    ? Math.ceil((dueDate.getTime() - Date.now()) / 86400000)
    : 0;

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

  async function handleComplete() {
    if (await run(() => completeReminder(reminder.id))) setMode('view');
  }

  async function handleDismiss() {
    if (
      await run(() =>
        dismissReminder(reminder.id, {
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
    if (await run(() => addReminderNote(reminder.id, { note: noteText.trim() }))) {
      setNoteText('');
      setMode('view');
    }
  }

  async function handleAssign() {
    if (
      await run(() => assignReminder(reminder.id, selectedAssignee || null))
    ) {
      setMode('view');
    }
  }

  async function handleSnooze(days: number) {
    if (await run(() => snoozeReminder(reminder.id, { days }))) {
      setMode('view');
    }
  }

  async function handleUnsnooze() {
    await run(() => unsnoozeReminder(reminder.id));
  }

  async function handleReopen() {
    await run(() => reopenReminder(reminder.id, {}));
  }

  async function handlePriority(p: Priority) {
    if (await run(() => setReminderPriority(reminder.id, { priority: p }))) {
      setMode('view');
    }
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
          'fixed top-0 right-0 z-50 h-screen w-full max-w-[520px] bg-background border-l border-border shadow-2xl transition-transform duration-300 flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge
                variant={priorityVariant[reminder.priority]}
                className="text-[9px]"
              >
                {priorityLabel[reminder.priority]}
              </Badge>
              {isOverdue && (
                <Badge variant="red" className="text-[9px]">
                  Overdue {daysOverdue}d
                </Badge>
              )}
              {!isOverdue && isPending && daysUntilDue >= 0 && (
                <Badge variant="outline" className="text-[9px]">
                  Due in {daysUntilDue}d
                </Badge>
              )}
              {isDone && (
                <Badge variant="green" className="text-[9px]">
                  Completed
                </Badge>
              )}
              {isSnoozed && (
                <Badge variant="outline" className="text-[9px] gap-1">
                  <BellOff className="h-2.5 w-2.5" />
                  Snoozed
                </Badge>
              )}
            </div>
            <h2 className="text-base font-semibold leading-snug">
              {reminder.message}
            </h2>
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
          {reminder.project_id && (
            <Link
              href={`/projects/${reminder.project_id}`}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 hover:border-brand-cyan/40 hover:bg-card/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-mono text-[10px] text-brand">
                  {reminder.project_code}
                </div>
                <div className="text-sm truncate">{reminder.project_name}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* Related exception link */}
          {reminder.exception_id && (
            <Link
              href={`/exceptions`}
              className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 hover:border-amber-500/40 hover:bg-card/60 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                Linked to exception
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Due
              </div>
              <div
                className={cn(
                  'text-sm',
                  isOverdue && 'text-red-400 font-medium'
                )}
              >
                {shortDate(reminder.due_at)}
              </div>
            </div>
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <UserCheck className="h-3 w-3" /> Assigned to
              </div>
              <div className="text-sm truncate">
                {reminder.assigned_name ?? 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Notes / dismiss reason */}
          {isDone && reminder.notes && (
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
                Resolution note
              </div>
              <div className="text-sm whitespace-pre-wrap">{reminder.notes}</div>
            </div>
          )}

          {/* Actions */}
          {mode === 'view' && (
            <div>
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                Actions
              </div>

              {isPending && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleComplete}
                    disabled={busy}
                    className="gap-2 brand-gradient text-white col-span-2"
                    size="sm"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    Mark as done
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
                    className="gap-2"
                    onClick={() => setMode('priority')}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Priority
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

              {isDone && (
                <div className="space-y-2">
                  <div className="rounded-md border border-border bg-card/30 p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    Completed {reminder.completed_at ? timeAgo(reminder.completed_at) : ''}
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
                    Reopen reminder
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

          {/* Dismiss form */}
          {mode === 'dismiss' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Dismiss reminder</h3>
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
                  placeholder="Why is this not needed?"
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
                <h3 className="text-sm font-semibold">Snooze reminder</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Push the due date forward.
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

          {/* Priority form */}
          {mode === 'priority' && (
            <div className="rounded-md border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Set priority</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['low', 'normal', 'high', 'urgent'] as Priority[]).map((p) => (
                  <Button
                    key={p}
                    variant={reminder.priority === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePriority(p)}
                    disabled={busy}
                    className={cn(
                      'capitalize gap-2',
                      reminder.priority === p && 'brand-gradient text-white'
                    )}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    {p}
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
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  dismissed: <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />,
  snoozed: <BellOff className="h-3.5 w-3.5 text-amber-500" />,
  unsnoozed: <BellOff className="h-3.5 w-3.5 text-muted-foreground" />,
  assigned: <User className="h-3.5 w-3.5 text-blue-400" />,
  reopened: <RotateCcw className="h-3.5 w-3.5 text-amber-500" />,
  noted: <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />,
  priority_changed: <Flag className="h-3.5 w-3.5 text-amber-500" />,
};

const EVENT_LABEL: Record<string, string> = {
  completed: 'Completed',
  dismissed: 'Dismissed',
  snoozed: 'Snoozed',
  unsnoozed: 'Unsnoozed',
  assigned: 'Assigned',
  reopened: 'Reopened',
  noted: 'Note',
  priority_changed: 'Priority changed',
};

function EventRow({ event }: { event: ReminderEvent }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
      <div className="h-7 w-7 rounded-md bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
        {EVENT_ICON[event.event_type] ?? (
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        )}
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
