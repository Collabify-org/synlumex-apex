'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Search, X, Check, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  type Integration,
  type IntegrationCategory,
} from '@/lib/integrations/catalog';
import { requestIntegration } from './integration-actions';

type ExistingRequest = {
  id: string;
  provider_id: string;
  status: string;
};

type Props = {
  existingRequests: ExistingRequest[];
};

export function IntegrationsGrid({ existingRequests }: Props) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | 'all'>('all');
  const [openProvider, setOpenProvider] = useState<Integration | null>(null);

  const requestedIds = new Set(existingRequests.map((r) => r.provider_id));

  const filtered = useMemo(() => {
    let result = INTEGRATIONS;
    if (categoryFilter !== 'all') {
      result = result.filter((i) => i.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [categoryFilter, search]);

  return (
    <>
      {/* Toolbar */}
      <div className="space-y-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search integrations…"
              className="pl-9 pr-8 h-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="ml-auto text-xs text-muted-foreground font-mono">
            {filtered.length} of {INTEGRATIONS.length} providers
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-[11px] transition-all',
              categoryFilter === 'all'
                ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
            )}
          >
            All
          </button>
          {(Object.keys(INTEGRATION_CATEGORIES) as IntegrationCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[11px] transition-all capitalize',
                categoryFilter === c
                  ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
                  : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
              )}
            >
              {INTEGRATION_CATEGORIES[c].label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 bg-card/50 text-center text-sm text-muted-foreground">
          No integrations match your search.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((int) => {
            const requested = requestedIds.has(int.id);
            return (
              <Card
                key={int.id}
                className={cn(
                  'p-4 bg-card/50 transition-all h-full flex flex-col',
                  requested ? 'border-emerald-500/30' : 'hover:border-brand-cyan/40'
                )}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-xl shrink-0">
                    {int.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm truncate">{int.name}</h3>
                      {requested && (
                        <Badge variant="green" className="text-[9px] gap-1">
                          <Check className="h-2.5 w-2.5" />
                          Requested
                        </Badge>
                      )}
                    </div>
                    <div className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mt-0.5">
                      {INTEGRATION_CATEGORIES[int.category].label}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1">
                  {int.description}
                </p>

                <div className="flex items-center gap-2 pt-3 border-t border-border/50">
                  {int.docs_url && (
                    <a
                      href={int.docs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                      Learn more
                    </a>
                  )}
                  <div className="ml-auto">
                    {requested ? (
                      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-500 border-emerald-500/40">
                        <Check className="h-2.5 w-2.5" />
                        In queue
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setOpenProvider(int)}
                      >
                        <Sparkles className="h-3 w-3" />
                        Request access
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request modal */}
      {openProvider && (
        <RequestModal
          provider={openProvider}
          onClose={() => setOpenProvider(null)}
        />
      )}
    </>
  );
}

function RequestModal({
  provider,
  onClose,
}: {
  provider: Integration;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await requestIntegration(provider.id, {
      contactEmail: email || undefined,
      notes: notes || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed');
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center text-xl">
              {provider.icon}
            </div>
            <div>
              <h2 className="font-semibold">Connect {provider.name}</h2>
              <p className="text-xs text-muted-foreground">
                {INTEGRATION_CATEGORIES[provider.category].label}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold mb-1">Request received</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Our team will reach out to you shortly to connect {provider.name} to your
                workspace.
              </p>
              <Button className="mt-5" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {provider.description}
              </p>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Your email (optional)
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="finance@company.com"
                />
                <p className="text-[10px] text-muted-foreground">
                  We'll reach out here to discuss the setup.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  What do you want to sync? (optional)
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. We want invoices + payments auto-synced daily…"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!done && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy}
              className="gap-2 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Request {provider.name}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
