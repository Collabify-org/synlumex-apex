'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Save,
  Check,
  AlertTriangle,
  ShieldCheck,
  KeyRound,
  Monitor,
  Lock,
  History,
} from 'lucide-react';
import { timeAgo } from '@/lib/format';
import {
  updateSecuritySettings,
  signOutOtherSessions,
} from './security-actions';

const SESSION_TIMEOUTS = [
  { value: 60, label: '1 hour' },
  { value: 1440, label: '24 hours' },
  { value: 10080, label: '7 days' },
  { value: 43200, label: '30 days' },
  { value: 0, label: 'Never (not recommended)' },
];

const PASSWORD_EXPIRY = [
  { value: 0, label: 'Never' },
  { value: 30, label: '30 days' },
  { value: 60, label: '60 days' },
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
];

type SecurityPrefs = {
  enforce_mfa: boolean;
  session_timeout_minutes: number;
  password_min_length: number;
  require_password_uppercase: boolean;
  require_password_number: boolean;
  require_password_symbol: boolean;
  password_expiry_days: number;
};

type AuditEvent = {
  id: string;
  action: string;
  actor_name: string | null;
  created_at: string;
  payload: any;
};

export function SecurityForm({
  initial,
  canEdit,
  isEnterprise,
  recentEvents,
}: {
  initial: SecurityPrefs;
  canEdit: boolean;
  isEnterprise: boolean;
  recentEvents: AuditEvent[];
}) {
  const [prefs, setPrefs] = useState<SecurityPrefs>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  function patch<K extends keyof SecurityPrefs>(key: K, value: SecurityPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateSecuritySettings(prefs);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  async function signOutOthers() {
    if (!confirm('Sign out of all other devices?')) return;
    setSigningOut(true);
    const res = await signOutOtherSessions();
    setSigningOut(false);
    if (!res.ok) {
      alert(res.error);
    } else {
      alert('Signed out of all other devices.');
    }
  }

  return (
    <div className="space-y-4">
      {!canEdit && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Only owners and admins can change security settings.
          </div>
        </Card>
      )}

      {/* Authentication */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Authentication</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Your account uses Supabase Auth with email and password.
        </p>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 py-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Enforce MFA for all members</span>
                <Badge variant="outline" className="text-[9px] font-mono uppercase">
                  Enterprise
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Require every member to set up an authenticator app before they can
                access the workspace.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.enforce_mfa}
              onClick={() => isEnterprise && canEdit && patch('enforce_mfa', !prefs.enforce_mfa)}
              disabled={!isEnterprise || !canEdit}
              className={cn(
                'relative h-6 w-11 shrink-0 rounded-full border transition-colors mt-1',
                prefs.enforce_mfa && isEnterprise ? 'bg-primary' : 'bg-secondary',
                (!isEnterprise || !canEdit) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
                  prefs.enforce_mfa ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs">Session timeout</Label>
            <select
              value={prefs.session_timeout_minutes}
              onChange={(e) =>
                patch('session_timeout_minutes', parseInt(e.target.value, 10))
              }
              disabled={!isEnterprise || !canEdit}
              className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              {SESSION_TIMEOUTS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Members are automatically signed out after this period of inactivity.
              {!isEnterprise && ' Upgrade to Enterprise to enforce.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Password policy */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Password policy</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Apply to new passwords set by members of this workspace.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Minimum length</Label>
              <span className="font-mono text-xs">{prefs.password_min_length} chars</span>
            </div>
            <input
              type="range"
              min={8}
              max={24}
              step={1}
              value={prefs.password_min_length}
              onChange={(e) =>
                patch('password_min_length', parseInt(e.target.value, 10))
              }
              disabled={!canEdit}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
              <span>8</span>
              <span>24</span>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-border/50">
            <CheckRow
              title="Require uppercase letter"
              checked={prefs.require_password_uppercase}
              onChange={(v) => patch('require_password_uppercase', v)}
              disabled={!canEdit}
            />
            <CheckRow
              title="Require number"
              checked={prefs.require_password_number}
              onChange={(v) => patch('require_password_number', v)}
              disabled={!canEdit}
            />
            <CheckRow
              title="Require symbol (!@#$...)"
              checked={prefs.require_password_symbol}
              onChange={(v) => patch('require_password_symbol', v)}
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border/50">
            <Label className="text-xs">Password expiry</Label>
            <select
              value={prefs.password_expiry_days}
              onChange={(e) =>
                patch('password_expiry_days', parseInt(e.target.value, 10))
              }
              disabled={!canEdit}
              className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {PASSWORD_EXPIRY.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Members are prompted to change their password after this period.
            </p>
          </div>
        </div>
      </Card>

      {/* Sessions */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-1">
          <Monitor className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Active sessions</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          You're currently signed in on this device. If you suspect another session
          is compromised, sign out everywhere else.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={signOutOthers}
          disabled={signingOut}
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          )}
          Sign out all other devices
        </Button>
      </Card>

      {/* Security activity */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <History className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Recent security activity</h3>
        </div>
        {recentEvents.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            No security events recorded yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-start justify-between gap-4 py-2 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0">
                  <div className="text-xs font-mono">{e.action}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {e.actor_name ?? 'System'}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground shrink-0">
                  {timeAgo(e.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy} className="gap-2">
            {saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function CheckRow({
  title,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex items-center justify-between gap-4 cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className="text-sm">{title}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 rounded border-border accent-primary"
      />
    </label>
  );
}
