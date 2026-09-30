'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { shortDate } from '@/lib/format';
import { FileText, Download, Check } from 'lucide-react';

type Invoice = {
  id: string;
  invoice_number: string;
  plan_name: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  issue_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  paid_at: string | null;
};

const statusVariant: Record<string, 'green' | 'amber' | 'red' | 'secondary'> = {
  paid: 'green',
  partial: 'amber',
  unpaid: 'red',
  void: 'secondary',
};

export function InvoicesList({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <Card className="p-12 bg-card/50 text-center">
        <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium mb-1">No invoices yet</p>
        <p className="text-xs text-muted-foreground">
          Invoices appear here after your first billing cycle. Our team sends each
          invoice by email and can provide PDF copies on request.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
              <th className="text-left p-3 font-normal">INVOICE</th>
              <th className="text-left p-3 font-normal">PLAN</th>
              <th className="text-left p-3 font-normal">PERIOD</th>
              <th className="text-right p-3 font-normal">AMOUNT</th>
              <th className="text-left p-3 font-normal">ISSUED</th>
              <th className="text-left p-3 font-normal">DUE</th>
              <th className="text-left p-3 font-normal">STATUS</th>
              <th className="w-10 p-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="border-t border-border hover:bg-accent/30 transition-colors"
              >
                <td className="p-3 font-mono text-xs text-brand">
                  {inv.invoice_number}
                </td>
                <td className="p-3 text-xs">{inv.plan_name}</td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {inv.period_start && inv.period_end
                    ? `${shortDate(inv.period_start)} → ${shortDate(inv.period_end)}`
                    : '—'}
                </td>
                <td className="p-3 text-right font-mono text-xs whitespace-nowrap">
                  ${Number(inv.total_amount).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  <span className="text-muted-foreground">{inv.currency}</span>
                </td>
                <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {shortDate(inv.issue_date)}
                </td>
                <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                  {shortDate(inv.due_date)}
                </td>
                <td className="p-3">
                  <Badge
                    variant={statusVariant[inv.status] ?? 'outline'}
                    className="text-[10px] capitalize gap-1"
                  >
                    {inv.status === 'paid' && <Check className="h-2.5 w-2.5" />}
                    {inv.status}
                  </Badge>
                </td>
                <td className="p-2 text-right">
                  <a
                    href={`/api/admin/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs',
                      'text-brand-cyan hover:bg-brand-cyan/10 transition-colors'
                    )}
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
