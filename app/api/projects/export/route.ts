import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/queries/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rows = await listProjects({
      q: searchParams.get('q') ?? undefined,
      health: searchParams.getAll('health'),
      stage: searchParams.getAll('stage'),
      client: searchParams.getAll('client'),
      currency: searchParams.getAll('currency'),
      sort: searchParams.get('sort') ?? 'updated_at',
      dir: (searchParams.get('dir') as 'asc' | 'desc') ?? 'desc',
    });

    const header = [
      'code',
      'name',
      'client',
      'stage',
      'health',
      'contract_value',
      'currency',
      'start_date',
      'end_date',
      'updated_at',
    ];

    const lines = [header.join(',')];

    for (const r of rows) {
      const cells = [
        csvCell(r.code),
        csvCell(r.name),
        csvCell(r.client_name ?? ''),
        csvCell(r.current_stage),
        csvCell(r.health),
        // Format as integer string, no scientific notation
        csvCell(Math.round(r.contract_value).toString()),
        csvCell(r.currency),
        csvCell(shortDate(r.start_date)),
        csvCell(shortDate(r.end_date)),
        csvCell(shortDate(r.updated_at)),
      ];
      lines.push(cells.join(','));
    }

    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse('\uFEFF' + csv, {
      // BOM prefix helps Excel open UTF-8 correctly
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synlumex-projects-${stamp}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
