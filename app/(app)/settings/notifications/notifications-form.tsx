'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, Save, Check, AlertTriangle, Bell, BellOff } from 'lucide-react';
import {
  updateOrgNotifications,
  updateUserNotifications,
} from './notifications-actions';

const DIGEST_DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
];

type OrgPrefs = {
  notif_trial_ending: boolean;
  notif_project_red: boolean;
  notif_inactive_user: boolean;
  notif_weekly_digest: boolean;
  notif_exception_created: boolean;
  notif_reminder_due: boolean;
  notif_collection_overdue: boolean;
  notif_digest_day: string;
};

type UserPrefs = {
  mute_all: boolean;
  critical_only: boolean;
};

export function NotificationsForm({
  initialOrg,
  initialUser,
  canEditOrg,
}: {
  initialOrg: OrgPrefs;
  initialUser: UserPrefs;
  canEditOrg: boolean;
}) {
  const [org, setOrg] = useState<OrgPrefs>(initialOrg);
  const [user, setUser] = useState<UserPrefs>(initialUser);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchOrg<K extends keyof OrgPrefs>(key: K, value: OrgPrefs[K]) {
    setOrg((o) => ({ ...o, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function patchUser<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setUser((u) => ({ ...u, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);

    // Save org-level (if permitted)
    if (canEditOrg) {
      const res = await updateOrgNotifications(org);
      if (!res.ok) {
        setError(res.error ?? 'Failed to save workspace notifications');
        setBusy(false);
        return;
      }
    }

    // Save user-level
    const userRes = await updateUserNotifications(user);
    if (!userRes.ok) {
      setError(userRes.error ?? 'Failed to save user notifications');
      setBusy(false);
      return;
    }

    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="space-y-4">
      {/* Personal preferences (any member) */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">My notifications</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Control what emails you personally receive. Applies only to your account.
        </p>

        <div className="space-y-3">
          <ToggleRow
            title="Mute all emails"
            description="You won't receive any email from Synlumex. You can still see everything in the app."
            checked={user.mute_all}
            onChange={(v) => patchUser('mute_all', v)}
            warning
          />
          <ToggleRow
            title="Critical alerts only"
            description="Only send me emails for critical severity events (project failures, overdue collections)."
            checked={user.critical_only}
            onChange={(v) => patchUser('critical_only', v)}
            disabled={user.mute_all}
          />
        </div>
      </Card>

      {/* Workspace preferences (owner/admin) */}
      {canEditOrg ? (
        <>
          <Card className="p-5 bg-card/50">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="h-4 w-4 text-brand" />
              <h3 className="font-semibold">Workspace notifications</h3>
              <Badge variant="outline" className="text-[9px] font-mono uppercase">
                Owner/Admin
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              These apply to all workspace owners and admins by default. Individual
              members can mute their own emails above.
            </p>

            <div className="space-y-3">
              <ToggleRow
                title="Trial ending"
                description="Send a warning 3 days before the trial expires."
                checked={org.notif_trial_ending}
                onChange={(v) => patchOrg('notif_trial_ending', v)}
              />
              <ToggleRow
                title="Project health alert"
                description="Notify when a project's health turns Critical (red)."
                checked={org.notif_project_red}
                onChange={(v) => patchOrg('notif_project_red', v)}
              />
              <ToggleRow
                title="Inactive user reminder"
                description="Nudge users who haven't logged in for 7+ days."
                checked={org.notif_inactive_user}
                onChange={(v) => patchOrg('notif_inactive_user', v)}
              />
              <ToggleRow
                title="Weekly digest"
                description="A summary of portfolio health sent on your chosen day."
                checked={org.notif_weekly_digest}
                onChange={(v) => patchOrg('notif_weekly_digest', v)}
              />
            </div>
          </Card>

          <Card className="p-5 bg-card/50">
            <h3 className="font-semibold mb-1">Operational alerts</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Per-event notifications triggered by project activity.
            </p>

            <div className="space-y-3">
              <ToggleRow
                title="New exception created"
                description="Email when a new exception is logged on any project."
                checked={org.notif_exception_created}
                onChange={(v) => patchOrg('notif_exception_created', v)}
              />
              <ToggleRow
                title="Reminder due"
                description="Email when a reminder reaches its due date."
                checked={org.notif_reminder_due}
                onChange={(v) => patchOrg('notif_reminder_due', v)}
              />
              <ToggleRow
                title="Collection overdue"
                description="Email when an invoice becomes overdue by 30+ days."
                checked={org.notif_collection_overdue}
                onChange={(v) => patchOrg('notif_collection_overdue', v)}
              />
            </div>
          </Card>

          <Card className="p-5 bg-card/50">
            <h3 className="font-semibold mb-1">Digest schedule</h3>
            <p className="text-xs text-muted-foreground mb-4">
              When the weekly digest is sent.
            </p>
            <div className="space-y-2">
              <Label className="text-xs">Day of week</Label>
              <select
                value={org.notif_digest_day}
                onChange={(e) => patchOrg('notif_digest_day', e.target.value)}
                disabled={!org.notif_weekly_digest}
                className="w-full max-w-xs h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                {DIGEST_DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              {!org.notif_weekly_digest && (
                <p className="text-[10px] text-muted-foreground">
                  Enable weekly digest above to change the schedule.
                </p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-4 bg-amber-500/5 border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Only workspace owners and admins can change workspace-wide notifications.
            Your personal preferences are saved above.
          </div>
        </Card>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

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
              Save preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  disabled,
  warning,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 py-2',
        disabled && 'opacity-50'
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {warning && checked && (
            <Badge variant="amber" className="text-[9px] gap-1">
              <BellOff className="h-2.5 w-2.5" />
              Muted
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors mt-1',
          checked ? 'bg-primary' : 'bg-secondary',
          disabled && 'cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </div>
  );
}
