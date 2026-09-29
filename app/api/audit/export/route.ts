import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';
import { listAudit, type AuditCategory } from '@/lib/queries/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const orgPlan = await getOrgPlan(supabase);

    if (!orgPlan?.canUse('audit_export')) {
      return NextResponse.json(
        {
          error: 'Audit exports are an Enterprise feature. Upgrade to access.',
          code: 'AUDIT_EXPORT_LOCKED',
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);

    // Fetch all matching rows (up to 5000) — paginate through
    const allRows: any[] = [];
    let page = 1;
    const pageSize = 500;
    let more = true;
    while (more && allRows.length < 5000) {
      const result = await listAudit({
        q: searchParams.get('q') ?? undefined,
        category: (searchParams.get('category') as AuditCategory) ?? 'all',
        actor_id: searchParams.get('actor_id') ?? undefined,
        range: (searchParams.get('range') as any) ?? '30d',
        page,
        pageSize,
      });
      allRows.push(...result.rows);
      more = result.rows.length === pageSize;
      page += 1;
    }

    const header = [
      'when',
      'category',
      'action',
      'entity',
      'entity_id',
      'project_code',
      'actor',
      'payload',
    ];
    const lines = [header.join(',')];

    for (const r of allRows) {
      lines.push(
        [
          r.created_at,
          r.category,
          r.action,
          r.entity ?? '',
          r.entity_id ?? '',
          r.project_code ?? '',
          r.actor_name ?? 'System',
          JSON.stringify(r.payload ?? {}),
        ]
          .map(csvCell)
          .join(',')
      );
    }

    const csv = lines.join('\n');
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse('\uFEFF' + csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="synlumex-audit-${stamp}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
