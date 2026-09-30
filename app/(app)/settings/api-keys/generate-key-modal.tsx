'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  X,
  Loader2,
  KeyRound,
  Check,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
} from 'lucide-react';
import { createApiKey } from './api-key-actions';

const EXPIRY_OPTIONS = [
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: 0, label: 'Never' },
];

const SCOPES = [
  { id: 'read', label: 'Read', description: 'View projects, exceptions, billing' },
  { id: 'write', label: 'Write', description: 'Create and update records' },
  { id: 'delete', label: 'Delete', description: 'Delete records (use with care)' },
];

export function GenerateKeyModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [expiryDays, setExpiryDays] = useState(90);
  const [scopes, setScopes] = useState<string[]>(['read']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);

  function toggleScope(id: string) {
    setScopes((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createApiKey({
      name,
      expiresInDays: expiryDays === 0 ? null : expiryDays,
      scopes,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to create key');
      return;
    }
    setFullKey(res.fullKey ?? null);
  }

  async function copyKey() {
    if (!fullKey) return;
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={fullKey ? undefined : onClose} />
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-brand" />
            <h2 className="font-semibold">
              {fullKey ? 'Your new API key' : 'Generate API key'}
            </h2>
          </div>
          {!fullKey && (
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">
          {fullKey ? (
            <>
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    <span className="text-amber-500 font-medium">
                      Copy this key now.
                    </span>{' '}
                    You won't be able to see it again. If you lose it, you'll have to
                    generate a new one.
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">API key</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-xs break-all">
                    {showKey ? fullKey : `${fullKey.slice(0, 20)}${'•'.repeat(28)}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="p-2 rounded-md border border-input hover:bg-accent"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <Button
                    size="sm"
                    onClick={copyKey}
                    className="gap-1.5 brand-gradient text-white shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={onClose} className="brand-gradient text-white">
                  Done
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Key name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production server, Zapier, Analytics"
                  autoFocus
                  maxLength={60}
                />
                <p className="text-[10px] text-muted-foreground">
                  Describe what this key is for — you'll see it in the list.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Expires in</Label>
                <div className="grid grid-cols-4 gap-2">
                  {EXPIRY_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => setExpiryDays(o.value)}
                      className={cn(
                        'rounded-md border px-2 py-1.5 text-xs transition-all',
                        expiryDays === o.value
                          ? 'border-brand-cyan bg-brand/10 font-medium'
                          : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40'
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Scopes</Label>
                <div className="space-y-2">
                  {SCOPES.map((s) => (
                    <label
                      key={s.id}
                      className="flex items-start gap-3 cursor-pointer rounded-md border border-border bg-background/40 p-3 hover:border-brand-cyan/40"
                    >
                      <input
                        type="checkbox"
                        checked={scopes.includes(s.id)}
                        onChange={() => toggleScope(s.id)}
                        className="h-4 w-4 rounded border-border accent-primary mt-0.5"
                      />
                      <div>
                        <div className="text-sm font-medium">{s.label}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {s.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
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

        {!fullKey && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy || !name.trim() || scopes.length === 0}
              className="gap-2 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <KeyRound className="h-3.5 w-3.5" />
              )}
              Generate key
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
