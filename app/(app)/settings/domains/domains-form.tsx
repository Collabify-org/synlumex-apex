'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { shortDate } from '@/lib/format';
import {
  Loader2,
  Check,
  Copy,
  Globe,
  AlertTriangle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  addCustomDomain,
  verifyDomain,
  removeCustomDomain,
} from './domains-actions';

const VERCEL_CNAME = 'cname.vercel-dns.com';

type DomainState = {
  custom_domain: string | null;
  domain_verified: boolean;
  domain_verification_token: string | null;
  domain_verified_at: string | null;
};

export function DomainsForm({
  initial,
  canEdit,
}: {
  initial: DomainState;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [domain, setDomain] = useState(initial.custom_domain ?? '');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyField(value: string, id: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function handleAdd() {
    if (!input.trim()) {
      setError('Enter a domain');
      return;
    }
    setBusy('add');
    setError(null);
    const res = await addCustomDomain(input);
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? 'Failed to add domain');
      return;
    }
    setDomain(input.trim().toLowerCase());
    setInput('');
    router.refresh();
  }

  async function handleVerify() {
    setBusy('verify');
    setError(null);
    const res = await verifyDomain();
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? 'Verification failed');
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    if (!confirm('Remove this custom domain? Your workspace will return to the Synlumex subdomain.')) return;
    setBusy('remove');
    setError(null);
    const res = await removeCustomDomain();
    setBusy(null);
    if (!res.ok) {
      setError(res.error ?? 'Failed to remove domain');
      return;
    }
    setDomain('');
    router.refresh();
  }

  // ------- State 1: No domain configured -------
  if (!initial.custom_domain) {
    return (
      <div className="space-y-4">
        {!canEdit && (
          <Card className="p-3 bg-amber-500/5 border-amber-500/30">
            <div className="flex items-center gap-2 text-xs text-amber-500">
              <AlertTriangle className="h-3.5 w-3.5" />
              Only owners and admins can configure custom domains.
            </div>
          </Card>
        )}

        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-1">Add a custom domain</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Enter the domain you want to use for this workspace. You'll configure
            DNS records after adding it.
          </p>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Domain</Label>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="projects.yourcompany.com"
                disabled={!canEdit || busy === 'add'}
              />
              <p className="text-[10px] text-muted-foreground">
                Use a subdomain like <code className="text-brand">projects.</code> or{' '}
                <code className="text-brand">app.</code> — not your root domain.
              </p>
            </div>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </div>
            )}

            <Button
              onClick={handleAdd}
              disabled={!canEdit || busy === 'add' || !input.trim()}
              className="gap-2 brand-gradient text-white"
            >
              {busy === 'add' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Globe className="h-3.5 w-3.5" />
              )}
              Add domain
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ------- State 2: Domain configured -------
  const isVerified = initial.domain_verified;
  const subdomain = initial.custom_domain.split('.')[0];

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <Card
        className={cn(
          'p-4',
          isVerified ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-amber-500/5 border-amber-500/30'
        )}
      >
        <div className="flex items-start gap-3">
          {isVerified ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-sm font-medium">
                {initial.custom_domain}
              </span>
              <Badge
                variant={isVerified ? 'green' : 'amber'}
                className="text-[9px]"
              >
                {isVerified ? 'Verified' : 'Pending verification'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isVerified
                ? `Live since ${shortDate(initial.domain_verified_at ?? '')}. SSL issued automatically.`
                : 'Add the DNS records below, then click Verify to activate.'}
            </p>
          </div>
          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              {!isVerified && (
                <Button
                  size="sm"
                  onClick={handleVerify}
                  disabled={busy === 'verify'}
                  className="gap-2 brand-gradient text-white"
                >
                  {busy === 'verify' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Verify now
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRemove}
                disabled={busy === 'remove'}
                className="gap-2 text-destructive border-destructive/40 hover:bg-destructive/10"
              >
                {busy === 'remove' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* CNAME record */}
      <Card className="p-5 bg-card/50">
        <h3 className="font-semibold mb-1">Step 1 — CNAME record</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add this record in your DNS provider (GoDaddy, Cloudflare, Route 53, etc.)
        </p>

        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead className="bg-muted/30">
              <tr className="text-[10px] tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">TYPE</th>
                <th className="text-left p-3 font-normal">NAME / HOST</th>
                <th className="text-left p-3 font-normal">VALUE / TARGET</th>
                <th className="w-10 p-3"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-3">CNAME</td>
                <td className="p-3">{subdomain}</td>
                <td className="p-3">{VERCEL_CNAME}</td>
                <td className="p-2">
                  <button
                    onClick={() => copyField(`${subdomain} CNAME ${VERCEL_CNAME}`, 'cname')}
                    className="p-1.5 rounded hover:bg-accent"
                    title="Copy"
                  >
                    {copied === 'cname' ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">
          <strong>DNS propagation</strong> may take 5 minutes to 24 hours. Once done,
          click <strong>Verify now</strong> above.
        </p>
      </Card>

      {/* TXT verification record */}
      {!isVerified && initial.domain_verification_token && (
        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-1">Step 2 — Ownership verification</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Add this TXT record to prove you own the domain.
          </p>

          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-xs font-mono">
              <thead className="bg-muted/30">
                <tr className="text-[10px] tracking-widest text-muted-foreground">
                  <th className="text-left p-3 font-normal">TYPE</th>
                  <th className="text-left p-3 font-normal">NAME / HOST</th>
                  <th className="text-left p-3 font-normal">VALUE</th>
                  <th className="w-10 p-3"></th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="p-3">TXT</td>
                  <td className="p-3">_synlumex-verify</td>
                  <td className="p-3 break-all">{initial.domain_verification_token}</td>
                  <td className="p-2">
                    <button
                      onClick={() => copyField(initial.domain_verification_token ?? '', 'token')}
                      className="p-1.5 rounded hover:bg-accent"
                      title="Copy"
                    >
                      {copied === 'token' ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3 text-muted-foreground" />
                      )}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* SSL */}
      {isVerified && (
        <Card className="p-5 bg-card/50">
          <h3 className="font-semibold mb-1">SSL certificate</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            An SSL certificate is issued automatically for{' '}
            <span className="font-mono text-foreground">{initial.custom_domain}</span>.
            Users can access the workspace at{' '}
            <a
              href={`https://${initial.custom_domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-cyan hover:underline"
            >
              https://{initial.custom_domain}
            </a>
          </p>
        </Card>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
