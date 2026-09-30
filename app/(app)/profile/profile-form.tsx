'use client';

import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { shortDate } from '@/lib/format';
import {
  Loader2,
  Save,
  Check,
  AlertTriangle,
  Camera,
  Mail,
  Phone,
  Briefcase,
  Globe,
  User as UserIcon,
  Building2,
  FileText,
  Edit3,
  X,
} from 'lucide-react';
import {
  updateProfile,
  uploadAvatar,
  changePassword,
  changeEmail,
  signOutOthers,
  updateUserNotifications,
} from './profile-actions';

const TIMEZONES = [
  'UTC',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Australia/Sydney',
];

type ProfileData = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  job_title: string | null;
  timezone: string | null;
  bio: string | null;
  company_name: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
  password_changed_at: string | null;
  notif_opt_out: any;
};

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [form, setForm] = useState({
    full_name: initial.full_name ?? '',
    phone: initial.phone ?? '',
    job_title: initial.job_title ?? '',
    timezone: initial.timezone ?? 'UTC',
    bio: initial.bio ?? '',
    company_name: initial.company_name ?? '',
    avatar_url: initial.avatar_url ?? '',
  });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Avatar
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatar_url ?? '');

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateProfile(form);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save');
      return;
    }
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2200);
  }

  function cancel() {
    setForm({
      full_name: initial.full_name ?? '',
      phone: initial.phone ?? '',
      job_title: initial.job_title ?? '',
      timezone: initial.timezone ?? 'UTC',
      bio: initial.bio ?? '',
      company_name: initial.company_name ?? '',
      avatar_url: initial.avatar_url ?? '',
    });
    setEditing(false);
    setError(null);
  }

  async function handleAvatarUpload(file: File) {
    setUploadingAvatar(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadAvatar(formData);
      if (!res.ok) {
        setError(res.error ?? 'Upload failed');
        return;
      }
      setAvatarUrl(res.url ?? '');
      patch('avatar_url', res.url ?? '');
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initials = (form.full_name || initial.email)
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Identity card */}
      <Card className="p-6 bg-card/50">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Avatar */}
          <div className="relative self-start">
            <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden text-2xl font-bold text-primary">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={form.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials || 'U'
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background shadow-md hover:bg-accent transition-colors"
              aria-label="Upload avatar"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleAvatarUpload(f);
                e.target.value = '';
              }}
            />
          </div>

          {/* Header text */}
          <div className="flex-1 min-w-0">
            {!editing ? (
              <>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">
                      {form.full_name || 'Unnamed User'}
                    </h2>
                    {form.job_title && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {form.job_title}
                        {form.company_name ? ` at ${form.company_name}` : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(true)}
                    className="gap-1.5"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit profile
                  </Button>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoLine icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={initial.email} />
                  {form.phone && (
                    <InfoLine icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={form.phone} />
                  )}
                  {form.timezone && (
                    <InfoLine icon={<Globe className="h-3.5 w-3.5" />} label="Timezone" value={form.timezone} />
                  )}
                  <InfoLine
                    icon={<UserIcon className="h-3.5 w-3.5" />}
                    label="Role"
                    value={initial.role}
                    capitalize
                  />
                </div>

                {form.bio && (
                  <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
                    {form.bio}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Full name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(e) => patch('full_name', e.target.value)}
                    placeholder="Jane Doe"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Job title</Label>
                    <Input
                      value={form.job_title}
                      onChange={(e) => patch('job_title', e.target.value)}
                      placeholder="Operations Manager"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => patch('phone', e.target.value)}
                      placeholder="+1 555 000 0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Company</Label>
                    <Input
                      value={form.company_name}
                      onChange={(e) => patch('company_name', e.target.value)}
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Timezone</Label>
                    <select
                      value={form.timezone}
                      onChange={(e) => patch('timezone', e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Bio</Label>
                  <textarea
                    value={form.bio}
                    onChange={(e) => patch('bio', e.target.value)}
                    rows={3}
                    placeholder="A short intro — visible to your team"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={cancel} disabled={busy}>
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={busy}
                    className="gap-2 brand-gradient text-white"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : saved ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save profile
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </Card>

      {/* Email + Password */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EmailChangeCard currentEmail={initial.email} />
        <PasswordChangeCard lastChanged={initial.password_changed_at} />
      </div>

      {/* Notification preferences */}
      <NotificationCard
        muteAll={!!initial.notif_opt_out?.mute_all}
        criticalOnly={!!initial.notif_opt_out?.critical_only}
      />

      {/* Sessions */}
      <SessionCard />
    </div>
  );
}

function InfoLine({
  icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase shrink-0">
        {label}
      </span>
      <span className={cn('truncate', capitalize && 'capitalize')}>{value}</span>
    </div>
  );
}

// ---------- Email change ----------
function EmailChangeCard({ currentEmail }: { currentEmail: string }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await changeEmail({ new_email: newEmail });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    setDone(true);
  }

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 text-brand" />
        <h3 className="font-semibold">Email address</h3>
      </div>
      <p className="text-sm font-mono truncate">{currentEmail}</p>

      {!editing && !done && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setEditing(true);
            setNewEmail('');
          }}
          className="mt-3"
        >
          Change email
        </Button>
      )}

      {editing && !done && (
        <div className="mt-3 space-y-3">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
          />
          <p className="text-[10px] text-muted-foreground">
            We'll send a confirmation link to the new address. Your current email
            stays active until confirmed.
          </p>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy || !newEmail.trim()}
              className="gap-2 brand-gradient text-white"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send confirmation
            </Button>
          </div>
        </div>
      )}

      {done && (
        <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
          Confirmation email sent. Check your new inbox to complete the change.
        </div>
      )}
    </Card>
  );
}

// ---------- Password change ----------
function PasswordChangeCard({ lastChanged }: { lastChanged: string | null }) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (next.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (next !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await changePassword({
      current_password: current,
      new_password: next,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    setDone(true);
    setCurrent('');
    setNext('');
    setConfirm('');
    setEditing(false);
  }

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <UserIcon className="h-4 w-4 text-brand" />
        <h3 className="font-semibold">Password</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Last changed: {lastChanged ? shortDate(lastChanged) : 'Never'}
      </p>

      {!editing && !done && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditing(true)}
          className="mt-3"
        >
          Change password
        </Button>
      )}

      {done && (
        <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
          Password updated successfully.
        </div>
      )}

      {editing && (
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current password</Label>
            <Input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">New password (min 8 chars)</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Confirm new password</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat password"
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy || !current || !next || !confirm}
              className="gap-2 brand-gradient text-white"
            >
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Update password
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ---------- Notification prefs ----------
function NotificationCard({
  muteAll: initialMute,
  criticalOnly: initialCritical,
}: {
  muteAll: boolean;
  criticalOnly: boolean;
}) {
  const [muteAll, setMuteAll] = useState(initialMute);
  const [criticalOnly, setCriticalOnly] = useState(initialCritical);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    await updateUserNotifications({ mute_all: muteAll, critical_only: criticalOnly });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-brand" />
        <h3 className="font-semibold">My notifications</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Control the emails you personally receive from Synlumex.
      </p>

      <div className="space-y-3">
        <ToggleRow
          title="Mute all emails"
          checked={muteAll}
          onChange={(v) => {
            setMuteAll(v);
            setSaved(false);
          }}
        />
        <ToggleRow
          title="Critical alerts only"
          checked={criticalOnly}
          disabled={muteAll}
          onChange={(v) => {
            setCriticalOnly(v);
            setSaved(false);
          }}
        />
      </div>

      <div className="flex justify-end mt-4">
        <Button size="sm" onClick={save} disabled={busy} className="gap-2">
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </Card>
  );
}

function ToggleRow({
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
    <div className={cn('flex items-center justify-between gap-4', disabled && 'opacity-50')}>
      <span className="text-sm">{title}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
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

// ---------- Sessions ----------
function SessionCard() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function signOut() {
    if (!confirm('Sign out of all other devices?')) return;
    setBusy(true);
    const res = await signOutOthers();
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    }
  }

  return (
    <Card className="p-5 bg-card/50">
      <div className="flex items-center gap-2 mb-3">
        <Building2 className="h-4 w-4 text-brand" />
        <h3 className="font-semibold">Active sessions</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        If you suspect another session is compromised, sign out everywhere else.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={signOut}
        disabled={busy}
        className="gap-2"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Sign out other devices
      </Button>
      {done && (
        <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-500">
          Signed out of all other devices.
        </div>
      )}
    </Card>
  );
}
