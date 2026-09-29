'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/format';
import {
  ChevronLeft,
  ChevronRight,
  Cog,
  AlertTriangle,
  Bell,
  Banknote,
  Settings as SettingsIcon,
  Layers,
  FileText,
  ExternalLink,
} from 'lucide-react';
import type { AuditRow, AuditCategory } from '@/lib/queries/audit';
import { AuditDrawer } from './audit-drawer';

const CATEGORY_META: Record<
  AuditCategory,
  { color: string; icon: React.ReactNode }
> = {
  stage: { color: 'text-brand', icon: <Layers className="h-3 w-3" /> },
  exception: { color: 'text-amber-500', icon: <AlertTriangle className="h-3 w-3" /> },
  reminder: { color: 'text-blue-400', icon: <Bell className="h-3 w-3" /> },
  billing: { color: 'text-emerald-500', icon: <Banknote className="h-3 w-3" /> },
  settings: { color: 'text-muted-foreground', icon: <SettingsIcon className="h-3 w-3" /> },
  system: { color: 'text-muted-foreground', icon: <Cog className="h-3 w-3" /> },
  all: { color: 'text-foreground', icon: <FileText className="h-3 w-3" /> },
};

function payloadPreview(payload: any): string {
  if (!payload) return '—';
  try {
    const keys = Object.keys(payload);
    if (keys.length === 0) return '—';
    const parts = keys.slice(0, 3).map((k) => {
      const v = payload[k];
      const vStr = typeof v === 'string' ? v : JSON.stringify(v);
      const short = vStr.length > 20 ? vStr.slice(0, 20) + '…' : vStr;
      return `${k}: ${short}`;
    });
    const extra = keys.length > 3 ? ` +${keys.length - 3}` : '';
    return parts.join(' · ') + extra;
  } catch {
    return '—';
  }
}

export function AuditTable({
  rows,
  page,
  pageSize,
  total,
  totalPages,
}: {
  rows: AuditRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);

  function gotoPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const openRow = openId ? rows.find((r) => r.id === openId) ?? null : null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(start + rows.length - 1, total);

  return (
    <>
      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">WHEN</th>
                <th className="text-left p-3 font-normal">CATEGORY</th>
                <th className="text-left p-3 font-normal">ACTION</th>
                <th className="text-left p-3 font-normal">PROJECT</th>
                <th className="text-left p-3 font-normal">ACTOR</th>
                <th className="text-left p-3 font-normal">PAYLOAD</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    No events match your filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const meta = CATEGORY_META[r.category] ?? CATEGORY_META.system;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setOpenId(r.id)}
                      className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {timeAgo(r.created_at)}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-mono tracking-wider uppercase',
                            meta.color
                          )}
                        >
                          {meta.icon}
                          {r.category}
                        </span>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {r.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-xs">
                        {r.project_id ? (
                          <Link
                            href={`/projects/${r.project_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-brand hover:underline"
                          >
                            {r.project_code}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground truncate max-w-[140px]">
                        {r.actor_name ?? 'System'}
                      </td>
                      <td className="p-3 text-[10px] font-mono text-muted-foreground truncate max-w-[360px]">
                        {payloadPreview(r.payload)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-xs text-muted-foreground font-mono">
              Showing {start}–{end} of {total}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground">
                Page {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => gotoPage(page - 1)}
                  disabled={page <= 1}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => gotoPage(page + 1)}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {openRow && (
        <AuditDrawer
          open={true}
          onClose={() => setOpenId(null)}
          row={openRow}
        />
      )}
    </>
  );
}
