'use client';

import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';

type DashboardSnapshot = {
  generatedAt: string;
  rangeLabel: string;
  kpis: { label: string; value: string; sub?: string }[];
  attention: { project: string; message: string; severity: string }[];
  milestones: { project: string; name: string; end_date: string; days: number }[];
  cash: { billed: string; collected: string; rate: string; overdue: string };
  topProjects: { code: string; name: string; health: string; value: string }[];
};

const NAVY: [number, number, number] = [30, 64, 175];
const NAVY_DARK: [number, number, number] = [30, 58, 138];
const SLATE_900: [number, number, number] = [15, 23, 42];
const SLATE_700: [number, number, number] = [51, 65, 85];
const SLATE_500: [number, number, number] = [100, 116, 139];
const SLATE_200: [number, number, number] = [226, 232, 240];
const SLATE_100: [number, number, number] = [241, 245, 249];
const RED: [number, number, number] = [220, 38, 38];
const AMBER: [number, number, number] = [245, 158, 11];
const GREEN: [number, number, number] = [16, 185, 129];
const WHITE: [number, number, number] = [255, 255, 255];

export function ExportPdfButton({ snapshot }: { snapshot: DashboardSnapshot }) {
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 50;
      const contentW = pageW - margin * 2;
      const headerH = 60;
      const footerY = pageH - 30;
      let y = headerH + 20;

      // Header
      doc.setFillColor(...NAVY);
      doc.rect(margin, 30, 100, 20, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...WHITE);
      doc.text('SYNLUMEX', margin + 8, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...SLATE_500);
      doc.text(`Range: ${snapshot.rangeLabel}`, pageW - margin, 43, { align: 'right' });

      doc.setDrawColor(...NAVY);
      doc.setLineWidth(1.2);
      doc.line(margin, 56, pageW - margin, 56);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(...NAVY_DARK);
      doc.text('Owner Command Center', margin, y + 8);
      y += 30;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...SLATE_500);
      doc.text(`Portfolio snapshot · Generated ${snapshot.generatedAt}`, margin, y);
      y += 24;

      // KPI grid
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...SLATE_900);
      doc.text('Key Metrics', margin, y);
      y += 14;

      const kpiCols = 4;
      const kpiGap = 8;
      const kpiW = (contentW - kpiGap * (kpiCols - 1)) / kpiCols;
      const kpiH = 50;
      const kpis = snapshot.kpis.slice(0, 8);

      kpis.forEach((k, i) => {
        const col = i % kpiCols;
        const row = Math.floor(i / kpiCols);
        const x = margin + col * (kpiW + kpiGap);
        const ky = y + row * (kpiH + kpiGap);

        doc.setDrawColor(...SLATE_200);
        doc.setLineWidth(0.5);
        doc.setFillColor(250, 250, 250);
        doc.rect(x, ky, kpiW, kpiH, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...SLATE_500);
        doc.text(k.label.toUpperCase(), x + 10, ky + 14);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...NAVY);
        doc.text(k.value, x + 10, ky + 34);

        if (k.sub) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...SLATE_500);
          const sub = doc.splitTextToSize(k.sub, kpiW - 20);
          doc.text(sub.slice(0, 1), x + 10, ky + 45);
        }
      });
      y += Math.ceil(kpis.length / kpiCols) * (kpiH + kpiGap) + 12;

      // Needs Attention
      if (snapshot.attention.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...SLATE_900);
        doc.text('Needs Attention', margin, y);
        y += 14;

        snapshot.attention.forEach((a) => {
          const sevColor =
            a.severity === 'critical' ? RED : a.severity === 'high' ? AMBER : SLATE_500;
          doc.setFillColor(...sevColor);
          doc.rect(margin, y - 2, 3, 22, 'F');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_900);
          doc.text(a.project, margin + 10, y + 8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_700);
          const msg = doc.splitTextToSize(a.message, contentW - 20);
          doc.text(msg.slice(0, 2), margin + 10, y + 19);
          y += 24;
        });
        y += 8;
      }

      // Cash Snapshot
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...SLATE_900);
      doc.text('Cash Snapshot — Last 30 Days', margin, y);
      y += 14;

      const cashRows: [string, string][] = [
        ['Billed', snapshot.cash.billed],
        ['Collected', snapshot.cash.collected],
        ['Collection Rate', snapshot.cash.rate],
        ['Overdue', snapshot.cash.overdue],
      ];

      cashRows.forEach(([label, value], i) => {
        const rowY = y + i * 16;
        doc.setDrawColor(...SLATE_200);
        doc.setLineWidth(0.3);
        doc.line(margin, rowY + 12, pageW - margin, rowY + 12);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...SLATE_700);
        doc.text(label, margin + 6, rowY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...SLATE_900);
        doc.text(value, pageW - margin - 6, rowY + 8, { align: 'right' });
      });
      y += cashRows.length * 16 + 12;

      // Closing Soon
      if (snapshot.milestones.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...SLATE_900);
        doc.text('Projects Closing in Next 30 Days', margin, y);
        y += 14;

        snapshot.milestones.forEach((m) => {
          doc.setDrawColor(...SLATE_200);
          doc.setLineWidth(0.3);
          doc.line(margin, y + 12, pageW - margin, y + 12);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_900);
          doc.text(m.project, margin + 6, y + 8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_700);
          const name = doc.splitTextToSize(m.name, contentW - 180);
          doc.text(name.slice(0, 1), margin + 80, y + 8);

          const col: [number, number, number] =
            m.days <= 7 ? RED : m.days <= 14 ? AMBER : GREEN;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...col);
          doc.text(`${m.days}d`, pageW - margin - 6, y + 8, { align: 'right' });
          y += 16;
        });
        y += 12;
      }

      // Top projects
      if (y < pageH - 200 && snapshot.topProjects.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(...SLATE_900);
        doc.text('Top Projects by Value', margin, y);
        y += 14;

        doc.setFillColor(...SLATE_100);
        doc.rect(margin, y, contentW, 16, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...SLATE_500);
        doc.text('CODE', margin + 6, y + 11);
        doc.text('NAME', margin + 70, y + 11);
        doc.text('HEALTH', pageW - margin - 150, y + 11);
        doc.text('VALUE', pageW - margin - 6, y + 11, { align: 'right' });
        y += 16;

        snapshot.topProjects.forEach((p) => {
          doc.setDrawColor(...SLATE_200);
          doc.setLineWidth(0.3);
          doc.line(margin, y + 12, pageW - margin, y + 12);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...NAVY);
          doc.text(p.code, margin + 6, y + 8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_700);
          const name = doc.splitTextToSize(p.name, 200);
          doc.text(name.slice(0, 1), margin + 70, y + 8);

          const col: [number, number, number] =
            p.health === 'red' ? RED : p.health === 'amber' ? AMBER : GREEN;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...col);
          doc.text(p.health.toUpperCase(), pageW - margin - 150, y + 8);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...SLATE_900);
          doc.text(p.value, pageW - margin - 6, y + 8, { align: 'right' });
          y += 16;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...SLATE_200);
        doc.setLineWidth(0.5);
        doc.line(margin, pageH - 42, pageW - margin, pageH - 42);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...SLATE_500);
        doc.text('SYNLUMEX INTEL · Owner Command Center', margin, footerY);
        doc.text(`Page ${i} of ${totalPages}`, pageW - margin, footerY, { align: 'right' });
      }

      const stamp = new Date().toISOString().slice(0, 10);
      doc.save(`synlumex-portfolio-${stamp}.pdf`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={generate} disabled={busy} className="gap-2">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {busy ? 'Generating…' : 'Export PDF'}
    </Button>
  );
}
