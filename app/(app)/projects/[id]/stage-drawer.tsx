'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { timeAgo, shortDate } from '@/lib/format';
import {
  X,
  Check,
  Ban,
  Unlock,
  MessageSquarePlus,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  ArrowRight,
  User,
  Calendar,
} from 'lucide-react';
import { STAGES, type ProjectStage } from '@/lib/types';
import {
  advanceStage,
  blockStage,
  unblockStage,
  addStageNote,
} from './stage-actions';

type StageRow = {
  id: string;
  project_id: string;
  stage: ProjectStage;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  entered_at: string | null;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
  input_summary?: string | null;
  output_summary?: string | null;
  evidence_url?: string | null;
};

type StageEvent = {
  id: string;
  stage: ProjectStage;
  event_type: string;
  actor_id: string | null;
  actor_name?: string | null;
  summary: string | null;
  evidence_url: string | null;
  created_at: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  stage: ProjectStage;
  stageRow: StageRow | null;
  events: StageEvent[];
  isCurrentStage: boolean;
  isPastStage: boolean;
  isFutureStage: boolean;
  projectCurrency: string;
};

const STAGE_STATUS_VARIANT: Record<
  string,
  'green' | 'amber' | 'red' | 'secondary' | 'outline'
> = {
  done: 'green',
  in_progress: 'amber',
  blocked: 'red',
  pending: 'outline',
};

const STAGE_STATUS_LABEL: Record<string, string> = {
  done: 'Completed',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  pending: 'Pending',
};

export function StageDrawer({
  open,
  onClose,
  projectId,
  stage,
  stageRow,
  events,
  isCurrentStage,
  isPastStage,
  isFutureStage,
}: Props) {
  const [mode, setMode] = useState<'view' | 'advance' | 'block' | 'note'>('view');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Advance form
  const [outputSummary, setOutputSummary] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');

  // Block form
  const [blockReason, setBlockReason] = useState('');

  // Note form
  const [noteText, setNoteText] = useState('');

  // Reset when stage changes
  useEffect(() => {
    setMode('view');
    setError(null);
    setOutputSummary('');
    setEvidenceUrl('');
    setBlockReason('');
    setNoteText('');
  }, [stage]);

  const stageMeta = STAGES.find((s) => s.key === stage);
  const status = stageRow?.status ?? 'pending';

  const duration = (() => {
    if (!stageRow?.entered_at) return null;
    const end = stageRow.completed_at ? new Date(stageRow.completed_at).getTime() : Date.now();
    const days = Math.max(
      0,
      Math.round((end - new Date(stageRow.entered_at).getTime()) / 86400000)
    );
    return days;
  })();

  async function handleAdvance() {
    setBusy(true);
    setError(null);
    const res = await advanceStage(projectId, stage, {
      outputSummary: outputSummary.trim() || undefined,
      evidenceUrl: evidenceUrl.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    onClose();
  }

  async function handleBlock() {
    if (!blockReason.trim()) {
      setError('Reason required');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await blockStage(projectId, stage, { reason: blockReason.trim() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    setBlockReason('');
    setMode('view');
  }

  async function handleUnblock() {
    setBusy(true);
    setError(null);
    const res = await unblockStage(projectId, stage, {});
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
  }

  async function handleNote() {
    if (!noteText.trim()) {
      setError('Note required');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await addStageNote(projectId, stage, { note: noteText.trim() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    setNoteText('');
    setMode('view');
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Drawer */}
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
              <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                Stage {STAGES.findIndex((s) => s.key === stage) + 1} of {STAGES.length}
              </span>
              <Badge variant={STAGE_STATUS_VARIANT[status] ?? 'outline'} className="text-[9px]">
                {STAGE_STATUS_LABEL[status] ?? status}
              </Badge>
              {isCurrentStage && (
                <span className="text-[10px] font-mono text-brand">● CURRENT</span>
              )}
            </div>
            <h2 className="text-xl font-bold tracking-tight">{stageMeta?.label ?? stage}</h2>
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
          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Entered
              </div>
              <div className="text-sm">{shortDate(stageRow?.entered_at ?? null)}</div>
            </div>
            <div className="rounded-md border border-border bg-card/40 p-3">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duration
              </div>
              <div className="text-sm">
                {duration !== null ? `${duration} day${duration === 1 ? '' : 's'}` : '—'}
              </div>
            </div>
          </div>

          {/* Input / Output */}
          {(stageRow?.input_summary || stageRow?.output_summary || stageRow?.notes) && (
            <div className="space-y-3">
              {stageRow?.input_summary && (
                <FieldBlock label="Input" value={stageRow.input_summary} />
              )}
              {stageRow?.output_summary && (
                <FieldBlock label="Output" value={stageRow.output_summary} />
              )}
              {stageRow?.notes && (
                <FieldBlock label="Notes" value={stageRow.notes} />
              )}
              {stageRow?.evidence_url && (
                <div>
                  <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">
                    Evidence
                  </div>
                  <a
                    href={stageRow.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-cyan hover:underline inline-flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    View attachment →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Action buttons — only for current / blocked / past stages */}
          {mode === 'view' && (
            <div className="space-y-2">
              <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase">
                Actions
              </div>

              {isCurrentStage && status === 'in_progress' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => setMode('advance')}
                    className="gap-2 brand-gradient text-white col-span-2"
                    size="sm"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Advance to next stage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
                    onClick={() => setMode('block')}
                  >
                    <Ban className="h-3.5 w-3.5" />
                    Mark blocked
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setMode('note')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              )}

              {status === 'blocked' && (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleUnblock}
                    disabled={busy}
                    className="gap-2 col-span-2"
                    size="sm"
                    variant="outline"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                    Unblock stage
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 col-span-2"
                    onClick={() => setMode('note')}
                  >
                    <MessageSquarePlus className="h-3.5 w-3.5" />
                    Add note
                  </Button>
                </div>
              )}

              {status === 'done' && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Stage completed on {shortDate(stageRow?.completed_at ?? null)}
                  </span>
                </div>
              )}

              {status === 'pending' && (
                <div className="rounded-md border border-border bg-card/30 p-3 text-xs text-muted-foreground">
                  {isFutureStage
                    ? 'This stage has not been reached yet.'
                    : 'Waiting to be started.'}
                </div>
              )}

              {/* Note-only for completed stages */}
              {(status === 'done' || (isPastStage && status !== 'blocked')) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => setMode('note')}
                >
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Add note
                </Button>
              )}
            </div>
          )}

          {/* Advance form */}
          {mode === 'advance' && (
            <div className="rounded-md border border-brand-cyan/40 bg-brand/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Advance to next stage</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Output summary (what was produced)
                </Label>
                <textarea
                  value={outputSummary}
                  onChange={(e) => setOutputSummary(e.target.value)}
                  rows={3}
                  placeholder="e.g. Final MEP design approved, BOQ sign-off from client on 25 Sep…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Evidence URL (optional)
                </Label>
                <Input
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder="https://drive.google.com/…"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdvance}
                  disabled={busy}
                  className="gap-2 brand-gradient text-white"
                >
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Complete & Advance
                </Button>
              </div>
            </div>
          )}

          {/* Block form */}
          {mode === 'block' && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-destructive">Mark stage blocked</h3>
                <button
                  onClick={() => setMode('view')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Reason
                </Label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                  placeholder="e.g. Waiting on client approval for revised BOQ…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleBlock}
                  disabled={busy || !blockReason.trim()}
                  variant="destructive"
                  className="gap-2"
                >
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Mark blocked
                </Button>
              </div>
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
                placeholder="What happened at this stage?"
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
              Event History ({events.length})
            </div>
            {events.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No events yet. Actions on this stage will appear here.
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

function FieldBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-3">
      <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label}
      </div>
      <div className="text-sm whitespace-pre-wrap leading-relaxed">{value}</div>
    </div>
  );
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  entered: <ArrowRight className="h-3.5 w-3.5 text-blue-400" />,
  completed: <Check className="h-3.5 w-3.5 text-emerald-500" />,
  blocked: <Ban className="h-3.5 w-3.5 text-destructive" />,
  unblocked: <Unlock className="h-3.5 w-3.5 text-amber-500" />,
  noted: <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground" />,
};

const EVENT_LABEL: Record<string, string> = {
  entered: 'Entered',
  completed: 'Completed',
  blocked: 'Blocked',
  unblocked: 'Unblocked',
  noted: 'Note',
};

function EventRow({ event }: { event: StageEvent }) {
  return (
    <div className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
      <div className="h-7 w-7 rounded-md bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
        {EVENT_ICON[event.event_type] ?? (
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
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
        {event.summary && (
          <div className="text-xs text-muted-foreground mt-1 leading-snug whitespace-pre-wrap">
            {event.summary}
          </div>
        )}
        {event.evidence_url && (
          <a
            href={event.evidence_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-brand-cyan hover:underline mt-1 inline-flex items-center gap-1"
          >
            <FileText className="h-2.5 w-2.5" />
            View evidence
          </a>
        )}
        <div className="text-[10px] font-mono text-muted-foreground mt-1">
          {timeAgo(event.created_at)}
        </div>
      </div>
    </div>
  );
}
