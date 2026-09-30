'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Loader2, AlertTriangle, Check } from 'lucide-react';
import { requestCancellation } from './billing-actions';

const REASONS = [
  { value: 'too_expensive', label: 'Too expensive for our needs' },
  { value: 'missing_features', label: 'Missing features we need' },
  { value: 'not_using', label: "We're not using it enough" },
  { value: 'switching', label: 'Switching to another product' },
  { value: 'project_ended', label: 'Our project ended' },
  { value: 'other', label: 'Other' },
];

export function CancelModal({ onClose }: { onClose: () => void }) {
  const [reason, setReason] = useState('too_expensive');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await requestCancellation({ reason, comment });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to request cancellation');
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h2 className="font-semibold">Cancel subscription</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="font-semibold mb-1">Cancellation requested</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Our team will reach out to confirm and process your cancellation.
                You'll keep full access until the current billing period ends.
              </p>
              <Button className="mt-5" onClick={onClose}>
                Got it
              </Button>
            </div>
          ) : (
            <>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-destructive font-medium">
                    Before you go —
                  </span>{' '}
                  we'd love to know what's not working so we can improve. Our team
                  will reach out to see if we can help.
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Reason for cancellation</Label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Any other feedback? (optional)</Label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  placeholder="Tell us more — what would have kept you with us?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Keep subscription
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy}
              variant="destructive"
              className="gap-2"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Request cancellation
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
