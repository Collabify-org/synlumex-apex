'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatMoney, pct } from '@/lib/format';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import type { CommercialRow } from '@/lib/queries/commercial';
import {
  CommercialDrawer,
  type InvoiceRow,
  type CollectionRow,
} from './commercial-drawer';

type SortField =
  | 'code'
  | 'name'
  | 'contract_value'
  | 'billed'
  | 'collected'
  | 'unbilled'
  | 'overdue'
  | 'efficiency';

type Props = {
  rows: CommercialRow[];
  invoicesByProject: Record<string, InvoiceRow[]>;
  collectionsByProject: Record<string, CollectionRow[]>;
  totals: {
    contract: number;
    billed: number;
    collected: number;
    unbilled: number;
    overdue: number;
    efficiency: number;
  };
  canSeeUnbilled: boolean;
};

export function CommercialTable({
  rows,
  invoicesByProject,
  collectionsByProject,
  totals,
  canSeeUnbilled,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sort = (searchParams.get('sort') ?? 'contract_value') as SortField;
  const dir = (searchParams.get('dir') ?? 'desc') as 'asc' | 'desc';

  const [openId, setOpenId] = useState<string | null>(null);

  function setSort(field: SortField) {
    const params = new URLSearchParams(searchParams.toString());
    if (sort === field) {
      params.set('dir', dir === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('sort', field);
      params.set('dir', field === 'code' || field === 'name' ? 'asc' : 'desc');
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const openRow = openId ? rows.find((r) => r.id === openId) ?? null : null;

  return (
    <>
      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <SortHeader field="code" current={sort} dir={dir} onSort={setSort}>
                  PROJECT
                </SortHeader>
                <th className="text-left p-3 font-normal">CLIENT</th>
                <SortHeader
                  field="contract_value"
                  current={sort}
                  dir={dir}
                  onSort={setSort}
                  align="right"
                >
                  CONTRACT
                </SortHeader>
                <SortHeader
                  field="billed"
                  current={sort}
                  dir={dir}
                  onSort={setSort}
                  align="right"
                >
                  BILLED
                </SortHeader>
                <SortHeader
                  field="collected"
                  current={sort}
                  dir={dir}
                  onSort={setSort}
                  align="right"
                >
                  COLLECTED
                </SortHeader>
                {canSeeUnbilled && (
                  <>
                    <SortHeader
                      field="unbilled"
                      current={sort}
                      dir={dir}
                      onSort={setSort}
                      align="right"
                    >
                      UNBILLED
                    </SortHeader>
                    <SortHeader
                      field="overdue"
                      current={sort}
                      dir={dir}
                      onSort={setSort}
                      align="right"
                    >
                      OVERDUE
                    </SortHeader>
                  </>
                )}
                <SortHeader
                  field="efficiency"
                  current={sort}
                  dir={dir}
                  onSort={setSort}
                  align="right"
                >
                  EFFICIENCY
                </SortHeader>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={canSeeUnbilled ? 8 : 6}
                    className="text-center py-12 text-sm text-muted-foreground"
                  >
                    No projects match your filters.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="border-t border-border hover:bg-accent/30 transition-colors cursor-pointer"
                  >
                    <td className="p-3 font-mono text-xs">
                      <span className="text-brand">{r.code}</span>
                      <div className="text-muted-foreground text-[10px] truncate max-w-[200px]">
                        {r.name}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground truncate max-w-[160px]">
                      {r.client_name ?? '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                      {formatMoney(r.contract_value, r.currency as any)}
                    </td>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                      {r.billed > 0 ? formatMoney(r.billed, r.currency as any) : '—'}
                    </td>
                    <td className="p-3 text-right font-mono text-xs text-emerald-400 whitespace-nowrap">
                      {r.collected > 0 ? formatMoney(r.collected, r.currency as any) : '—'}
                    </td>
                    {canSeeUnbilled && (
                      <>
                        <td className="p-3 text-right font-mono text-xs text-amber-400 whitespace-nowrap">
                          {r.unbilled > 0 ? formatMoney(r.unbilled, r.currency as any) : '—'}
                        </td>
                        <td className="p-3 text-right font-mono text-xs text-red-400 whitespace-nowrap">
                          {r.overdue > 0 ? formatMoney(r.overdue, r.currency as any) : '—'}
                        </td>
                      </>
                    )}
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                      {r.billed > 0 ? pct(r.efficiency) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-muted/20 border-t-2 border-border">
              <tr className="text-xs font-medium">
                <td colSpan={2} className="p-3 text-right text-muted-foreground">
                  Totals
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatMoney(totals.contract, 'INR')}
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                  {formatMoney(totals.billed, 'INR')}
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-emerald-400">
                  {formatMoney(totals.collected, 'INR')}
                </td>
                {canSeeUnbilled && (
                  <>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-amber-400">
                      {formatMoney(totals.unbilled, 'INR')}
                    </td>
                    <td className="p-3 text-right font-mono text-xs whitespace-nowrap text-red-400">
                      {formatMoney(totals.overdue, 'INR')}
                    </td>
                  </>
                )}
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap font-semibold">
                  {pct(totals.efficiency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {openRow && (
        <CommercialDrawer
          open={true}
          onClose={() => setOpenId(null)}
          project={openRow}
          invoices={invoicesByProject[openRow.id] ?? []}
          collections={collectionsByProject[openRow.id] ?? []}
        />
      )}
    </>
  );
}

function SortHeader({
  field,
  current,
  dir,
  onSort,
  children,
  align,
}: {
  field: SortField;
  current: SortField;
  dir: 'asc' | 'desc';
  onSort: (f: SortField) => void;
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  const active = current === field;
  return (
    <th
      className={cn(
        'p-3 font-normal cursor-pointer select-none hover:text-foreground transition-colors',
        align === 'right' ? 'text-right' : 'text-left'
      )}
      onClick={() => onSort(field)}
    >
      <span
        className={cn(
          'inline-flex items-center gap-1',
          align === 'right' && 'flex-row-reverse'
        )}
      >
        {children}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="h-3 w-3 text-brand" />
          ) : (
            <ArrowDown className="h-3 w-3 text-brand" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </span>
    </th>
  );
}
