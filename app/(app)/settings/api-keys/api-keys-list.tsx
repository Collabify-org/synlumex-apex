'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shortDate, timeAgo } from '@/lib/format';
import { KeyRound, Plus, MoreVertical, Copy, Trash2, Ban, Check } from 'lucide-react';
import { revokeApiKey, deleteApiKey } from './api-key-actions';
import { GenerateKeyModal } from './generate-key-modal';

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  is_expired: boolean;
};

export function ApiKeysList({ keys, canManage }: { keys: ApiKey[]; canManage: boolean }) {
  const router = useRouter();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyPrefix(id: string, prefix: string) {
    try {
      await navigator.clipboard.writeText(prefix);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {}
  }

  async function handleRevoke(keyId: string) {
    if (!confirm('Revoke this API key? Any tools using it will stop working immediately.')) return;
    setBusy(keyId);
    const res = await revokeApiKey(keyId);
    setBusy(null);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setMenuOpen(null);
    router.refresh();
  }

  async function handleDelete(keyId: string) {
    if (!confirm('Permanently delete this API key? This cannot be undone.')) return;
    setBusy(keyId);
    const res = await deleteApiKey(keyId);
    setBusy(null);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setMenuOpen(null);
    router.refresh();
  }

  const activeKeys = keys.filter((k) => !k.revoked_at && !k.is_expired).length;

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCell label="Total keys" value={String(keys.length)} />
        <StatCell label="Active" value={String(activeKeys)} color="emerald" />
        <StatCell
          label="Last used"
          value={
            keys.some((k) => k.last_used_at)
              ? timeAgo(keys.filter((k) => k.last_used_at).sort((a, b) =>
                  (b.last_used_at ?? '').localeCompare(a.last_used_at ?? '')
                )[0].last_used_at ?? '')
              : 'Never'
          }
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {keys.length} key{keys.length === 1 ? '' : 's'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            API keys grant access to your workspace data. Keep them secret.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setGenerateOpen(true)}
            className="gap-2 brand-gradient text-white"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Generate key
          </Button>
        )}
      </div>

      {/* Keys table */}
      {keys.length === 0 ? (
        <Card className="p-12 bg-card/50 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium mb-1">No API keys yet</p>
          <p className="text-xs text-muted-foreground mb-4">
            Generate your first key to connect external tools.
          </p>
          {canManage && (
            <Button onClick={() => setGenerateOpen(true)} className="gap-2 brand-gradient text-white">
              <Plus className="h-3.5 w-3.5" />
              Generate key
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-card/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                  <th className="text-left p-3 font-normal">NAME</th>
                  <th className="text-left p-3 font-normal">PREFIX</th>
                  <th className="text-left p-3 font-normal">SCOPES</th>
                  <th className="text-left p-3 font-normal">LAST USED</th>
                  <th className="text-left p-3 font-normal">EXPIRES</th>
                  <th className="text-left p-3 font-normal">STATUS</th>
                  <th className="w-10 p-3"></th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => {
                  const revoked = !!k.revoked_at;
                  const expired = k.is_expired;
                  return (
                    <tr key={k.id} className="border-t border-border hover:bg-accent/30">
                      <td className="p-3 font-medium">{k.name}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {k.key_prefix}…
                          </span>
                          <button
                            onClick={() => copyPrefix(k.id, k.key_prefix)}
                            className="p-1 rounded hover:bg-accent text-muted-foreground"
                            title="Copy prefix"
                          >
                            {copied === k.id ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <Badge key={s} variant="outline" className="text-[9px] font-mono">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {k.last_used_at ? timeAgo(k.last_used_at) : 'Never'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {k.expires_at ? shortDate(k.expires_at) : 'Never'}
                      </td>
                      <td className="p-3">
                        {revoked ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Revoked
                          </Badge>
                        ) : expired ? (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Expired
                          </Badge>
                        ) : (
                          <Badge variant="green" className="text-[10px]">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-right relative">
                        {canManage && !revoked && (
                          <>
                            <button
                              onClick={() => setMenuOpen(menuOpen === k.id ? null : k.id)}
                              disabled={busy === k.id}
                              className="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                            >
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            {menuOpen === k.id && (
                              <div
                                className="absolute right-2 top-full mt-1 w-48 rounded-md border border-border bg-card shadow-lg z-20 overflow-hidden"
                                onClick={() => setMenuOpen(null)}
                              >
                                <button
                                  onClick={() => handleRevoke(k.id)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-amber-500/10 text-amber-500 flex items-center gap-2"
                                >
                                  <Ban className="h-3 w-3" />
                                  Revoke key
                                </button>
                                <button
                                  onClick={() => handleDelete(k.id)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2 border-t border-border"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete permanently
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Security notice */}
      <div className="mt-4 rounded-md border border-border bg-muted/20 p-3 text-[10px] font-mono text-muted-foreground leading-relaxed">
        <div className="text-foreground mb-1 uppercase tracking-widest">
          Security best practices
        </div>
        <ul className="space-y-1 ml-3">
          <li>• Never commit API keys to Git or share them in chat</li>
          <li>• Rotate keys periodically — generate new, then revoke old</li>
          <li>• Use one key per tool so revocation is isolated</li>
        </ul>
      </div>

      {generateOpen && <GenerateKeyModal onClose={() => setGenerateOpen(false)} />}
    </>
  );
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: 'emerald';
}) {
  return (
    <Card className="p-3 bg-card/50">
      <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-1">
        {label}
      </div>
      <div
        className={cn(
          'text-lg font-semibold',
          color === 'emerald' ? 'text-emerald-500' : 'text-foreground'
        )}
      >
        {value}
      </div>
    </Card>
  );
}
