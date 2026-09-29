import { NextResponse } from 'next/server';
import { listProjects } from '@/lib/queries/projects';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
        r.code,
        r.name,
        r.client_name ?? '',
        r.current_stage,
        r.health,
        String(r.contract_value),
        r.currency,
        r.start_date ?? '',
        r.end_date ?? '',
        r.updated_at,
      ].map((cell) => {
        const s = String(cell).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      });
      lines.push(cells.join(','));
    }

    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synlumex-projects-${stamp}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
