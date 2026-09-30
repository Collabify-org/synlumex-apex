'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Check, AlertTriangle, Mail, Building2 } from 'lucide-react';
import { updateBillingDetails } from './billing-actions';

const COUNTRIES = [
  { code: 'US', label: 'United States' },
  { code: 'IN', label: 'India' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'OTHER', label: 'Other' },
];

type BillingDetails = {
  billing_email: string;
  billing_company_name: string;
  billing_address_line1: string;
  billing_address_line2: string;
  billing_city: string;
  billing_state: string;
  billing_postal_code: string;
  billing_country: string;
  billing_tax_id: string;
  billing_notes: string;
};

export function BillingDetailsForm({
  initial,
  canEdit,
}: {
  initial: BillingDetails;
  canEdit: boolean;
}) {
  const [form, setForm] = useState<BillingDetails>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof BillingDetails>(key: K, value: BillingDetails[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateBillingDetails(form);
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
      {!canEdit && (
        <Card className="p-3 bg-amber-500/5 border-amber-500/30">
          <div className="flex items-center gap-2 text-xs text-amber-500">
            <AlertTriangle className="h-3.5 w-3.5" />
            Only owners and admins can edit billing details.
          </div>
        </Card>
      )}

      {/* Billing email */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Billing email</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Invoices and receipts are sent to this address.
        </p>
        <Input
          type="email"
          value={form.billing_email}
          onChange={(e) => patch('billing_email', e.target.value)}
          placeholder="finance@company.com"
          disabled={!canEdit}
        />
        <p className="text-[10px] text-muted-foreground mt-2">
          Leave blank to send invoices to the workspace owner's email.
        </p>
      </Card>

      {/* Billing company + address */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Company &amp; billing address</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Appears on invoices and receipts for tax purposes.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Company name</Label>
            <Input
              value={form.billing_company_name}
              onChange={(e) => patch('billing_company_name', e.target.value)}
              placeholder="Acme Constructions LLC"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Address line 1</Label>
            <Input
              value={form.billing_address_line1}
              onChange={(e) => patch('billing_address_line1', e.target.value)}
              placeholder="123 Main Street"
              disabled={!canEdit}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Address line 2 (optional)</Label>
            <Input
              value={form.billing_address_line2}
              onChange={(e) => patch('billing_address_line2', e.target.value)}
              placeholder="Suite 400"
              disabled={!canEdit}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">City</Label>
              <Input
                value={form.billing_city}
                onChange={(e) => patch('billing_city', e.target.value)}
                placeholder="San Francisco"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">State / Region</Label>
              <Input
                value={form.billing_state}
                onChange={(e) => patch('billing_state', e.target.value)}
                placeholder="California"
                disabled={!canEdit}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Postal code</Label>
              <Input
                value={form.billing_postal_code}
                onChange={(e) => patch('billing_postal_code', e.target.value)}
                placeholder="94103"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Country</Label>
              <select
                value={form.billing_country}
                onChange={(e) => patch('billing_country', e.target.value)}
                disabled={!canEdit}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tax ID / VAT / GSTIN (optional)</Label>
            <Input
              value={form.billing_tax_id}
              onChange={(e) => patch('billing_tax_id', e.target.value)}
              placeholder="e.g. US-EIN 12-3456789, GSTIN 22AAAAA0000A1Z5"
              disabled={!canEdit}
            />
            <p className="text-[10px] text-muted-foreground">
              Shown on invoices. Required for tax registration in most jurisdictions.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Billing notes (optional)</Label>
            <textarea
              value={form.billing_notes}
              onChange={(e) => patch('billing_notes', e.target.value)}
              rows={2}
              placeholder="Special invoicing instructions"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={!canEdit}
            />
          </div>
        </div>
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
                Save billing details
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
