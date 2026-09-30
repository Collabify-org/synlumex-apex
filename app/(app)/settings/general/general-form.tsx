'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Loader2, Save, Check, AlertTriangle } from 'lucide-react';
import { updateGeneralSettings } from './general-actions';

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

const CURRENCIES = [
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'SAR', label: 'SAR — Saudi Riyal' },
];

type Props = {
  initial: {
    name: string;
    timezone: string;
    currency: string;
    website: string | null;
    address: string | null;
    logo_url: string | null;
  };
  canEdit: boolean;
};

export function GeneralForm({ initial, canEdit }: Props) {
  const [form, setForm] = useState({
    name: initial.name,
    timezone: initial.timezone,
    currency: initial.currency,
    website: initial.website ?? '',
    address: initial.address ?? '',
    logo_url: initial.logo_url ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateGeneralSettings({
      name: form.name,
      timezone: form.timezone,
      currency: form.currency,
      website: form.website || undefined,
      address: form.address || undefined,
      logo_url: form.logo_url || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save');
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="space-y-4">
      {/* Read-only notice */}
      {!canEdit && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            You don't have permission to edit these settings. Ask a workspace owner or admin.
          </div>
        </Card>
      )}

      {/* Identity */}
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-4">Workspace identity</h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Workspace name</Label>
            <Input
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
              placeholder="Acme Constructions"
              disabled={!canEdit}
              maxLength={80}
            />
            <p className="text-[10px] text-muted-foreground">
              Shown in the sidebar, invoices, and PDF exports.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Logo URL</Label>
            <Input
              value={form.logo_url}
              onChange={(e) => patch('logo_url', e.target.value)}
              placeholder="https://…/logo.png"
              disabled={!canEdit}
            />
            <p className="text-[10px] text-muted-foreground">
              PNG or SVG, 200×200 or larger. Used in branded exports.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Website</Label>
            <Input
              value={form.website}
              onChange={(e) => patch('website', e.target.value)}
              placeholder="https://yourcompany.com"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Address</Label>
            <textarea
              value={form.address}
              onChange={(e) => patch('address', e.target.value)}
              rows={2}
              placeholder="Company address for invoices"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canEdit}
            />
          </div>
        </div>
      </Card>

      {/* Locale */}
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-4">Locale</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Timezone</Label>
            <select
              value={form.timezone}
              onChange={(e) => patch('timezone', e.target.value)}
              disabled={!canEdit}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Used for scheduling reminders and displaying dates.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Default currency</Label>
            <select
              value={form.currency}
              onChange={(e) => patch('currency', e.target.value)}
              disabled={!canEdit}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Default for new projects — individual projects can override.
            </p>
          </div>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Save */}
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
