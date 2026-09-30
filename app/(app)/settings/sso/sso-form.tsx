'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Loader2,
  Save,
  Check,
  AlertTriangle,
  Copy,
  Fingerprint,
  BookOpen,
} from 'lucide-react';
import { updateSsoConfig } from './sso-actions';

const PROVIDERS = [
  { id: 'okta', label: 'Okta' },
  { id: 'azure', label: 'Azure AD' },
  { id: 'google', label: 'Google Workspace' },
  { id: 'onelogin', label: 'OneLogin' },
  { id: 'ping', label: 'Ping Identity' },
  { id: 'other', label: 'Other / Generic SAML' },
];

type SsoPrefs = {
  sso_provider: string;
  sso_domain: string;
  sso_metadata_url: string;
  sso_entity_id: string;
  sso_acs_url: string;
  sso_certificate: string;
  sso_enabled: boolean;
};

export function SsoForm({
  initial,
  spEntityId,
  spAcsUrl,
  canEdit,
  isConfigured,
}: {
  initial: SsoPrefs;
  spEntityId: string;
  spAcsUrl: string;
  canEdit: boolean;
  isConfigured: boolean;
}) {
  const [prefs, setPrefs] = useState<SsoPrefs>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function patch<K extends keyof SsoPrefs>(key: K, value: SsoPrefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
    setSaved(false);
    setError(null);
  }

  async function copyField(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function save() {
    setBusy(true);
    setError(null);
    const res = await updateSsoConfig(prefs);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to save SSO config');
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
            Only the workspace owner can configure SSO.
          </div>
        </Card>
      )}

      {/* Status banner */}
      <Card
        className={cn(
          'p-4',
          isConfigured
            ? 'bg-emerald-500/5 border-emerald-500/30'
            : 'bg-card/50'
        )}
      >
        <div className="flex items-start gap-3">
          <Fingerprint
            className={cn(
              'h-4 w-4 shrink-0 mt-0.5',
              isConfigured ? 'text-emerald-500' : 'text-muted-foreground'
            )}
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">
                {isConfigured ? 'SSO configured' : 'SSO not configured'}
              </span>
              <Badge
                variant={prefs.sso_enabled ? 'green' : 'outline'}
                className="text-[9px]"
              >
                {prefs.sso_enabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isConfigured
                ? 'Members with the configured email domain will be redirected to your identity provider at login.'
                : 'Add your identity provider details below to enable company-wide SSO.'}
            </p>
          </div>
        </div>
      </Card>

      {/* SP details */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-4 w-4 text-brand" />
          <h3 className="font-semibold">Service Provider (SP) details</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Give these to your IT team to configure in your identity provider.
        </p>

        <div className="space-y-3">
          <CopyField
            label="SP Entity ID"
            value={spEntityId}
            onCopy={() => copyField(spEntityId, 'entity')}
            copied={copied === 'entity'}
          />
          <CopyField
            label="ACS URL (Assertion Consumer Service)"
            value={spAcsUrl}
            onCopy={() => copyField(spAcsUrl, 'acs')}
            copied={copied === 'acs'}
          />
        </div>
      </Card>

      {/* IdP config */}
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-1">Identity Provider (IdP) configuration</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Choose your provider and enter the details from your IdP.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Provider</Label>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => canEdit && patch('sso_provider', p.id)}
                  disabled={!canEdit}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs transition-all',
                    prefs.sso_provider === p.id
                      ? 'border-brand-cyan bg-brand/10 font-medium'
                      : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40',
                    !canEdit && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Email domain *</Label>
            <Input
              value={prefs.sso_domain}
              onChange={(e) => patch('sso_domain', e.target.value)}
              placeholder="yourcompany.com"
              disabled={!canEdit}
            />
            <p className="text-[10px] text-muted-foreground">
              Members with this email domain will be redirected to SSO.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">IdP Metadata URL</Label>
            <Input
              value={prefs.sso_metadata_url}
              onChange={(e) => patch('sso_metadata_url', e.target.value)}
              placeholder="https://your-idp.com/app/xxx/sso/saml/metadata"
              disabled={!canEdit}
            />
            <p className="text-[10px] text-muted-foreground">
              Preferred — we'll fetch certificates and endpoints automatically.
            </p>
          </div>

          <details className="rounded-md border border-border">
            <summary className="p-3 text-xs font-medium cursor-pointer hover:bg-accent/30">
              Or configure manually (Entity ID, ACS URL, certificate)
            </summary>
            <div className="p-3 space-y-3 border-t border-border">
              <div className="space-y-2">
                <Label className="text-xs">IdP Entity ID</Label>
                <Input
                  value={prefs.sso_entity_id}
                  onChange={(e) => patch('sso_entity_id', e.target.value)}
                  placeholder="https://your-idp.com/entity"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">IdP ACS URL</Label>
                <Input
                  value={prefs.sso_acs_url}
                  onChange={(e) => patch('sso_acs_url', e.target.value)}
                  placeholder="https://your-idp.com/sso/saml"
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">X.509 Certificate</Label>
                <textarea
                  value={prefs.sso_certificate}
                  onChange={(e) => patch('sso_certificate', e.target.value)}
                  rows={5}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono"
                  disabled={!canEdit}
                />
              </div>
            </div>
          </details>
        </div>
      </Card>

      {/* Enable SSO */}
      <Card className="p-5 bg-card/50">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium mb-1">Enable SSO</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              When enabled, users with <strong>{prefs.sso_domain || 'your domain'}</strong>{' '}
              emails will be redirected to your identity provider at login.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.sso_enabled}
            onClick={() => canEdit && patch('sso_enabled', !prefs.sso_enabled)}
            disabled={!canEdit}
            className={cn(
              'relative h-6 w-11 shrink-0 rounded-full border transition-colors',
              prefs.sso_enabled ? 'bg-primary' : 'bg-secondary',
              !canEdit && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
                prefs.sso_enabled ? 'translate-x-5' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end gap-2">
          <a
            href="mailto:abdul@synlumexai.com?subject=SSO Setup Help"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center px-3"
          >
            Need help? Contact support
          </a>
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
                Save configuration
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function CopyField({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-xs break-all">
          {value}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="p-2 rounded-md border border-input hover:bg-accent shrink-0"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
