import { NextResponse } from 'next/server';
import { getIntelligenceData, type IntelRange } from '@/lib/queries/intelligence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get('range') as IntelRange) ?? 'all';

    const data = await getIntelligenceData(range);

    const lines: string[] = [];

    lines.push('Synlumex Historical Intelligence Report');
    lines.push(`Range,${range}`);
    lines.push(`Generated,${new Date().toISOString().slice(0, 10)}`);
    lines.push('');

    lines.push('KPI,Value,Previous Period,Change %');
    lines.push(
      [
        'Avg Project Duration (days)',
        data.avgDuration.current,
        data.avgDuration.previous,
        data.avgDuration.deltaPercent.toFixed(1),
      ]
        .map(csvCell)
        .join(',')
    );
    lines.push(
      [
        'Avg Days to Contract End',
        data.avgDaysToEnd.current,
        data.avgDaysToEnd.previous,
        data.avgDaysToEnd.deltaPercent.toFixed(1),
      ]
        .map(csvCell)
        .join(',')
    );
    lines.push(
      [
        'Lifetime Value',
        data.lifetimeValue.current,
        data.lifetimeValue.previous,
        data.lifetimeValue.deltaPercent.toFixed(1),
      ]
        .map(csvCell)
        .join(',')
    );
    lines.push('');

    lines.push('Exception Cause,Count,Percent');
    for (const c of data.exceptionCauses) {
      lines.push([c.type, c.count, c.percent.toFixed(1)].map(csvCell).join(','));
    }
    lines.push('');

    lines.push('Currency,Value,Percent');
    for (const c of data.currencyExposure) {
      lines.push([c.currency, c.value, c.percent.toFixed(1)].map(csvCell).join(','));
    }
    lines.push('');

    lines.push('Client,Projects,Total Value,Collected,Efficiency %');
    for (const c of data.clientLtv) {
      lines.push(
        [
          c.client_name,
          c.project_count,
          c.total_value,
          c.total_collected,
          c.avg_efficiency.toFixed(1),
        ]
          .map(csvCell)
          .join(',')
      );
    }
    lines.push('');

    lines.push('Duration Range,Count');
    for (const b of data.durationDistribution) {
      lines.push([b.range, b.count].map(csvCell).join(','));
    }

    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synlumex-intelligence-${stamp}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
