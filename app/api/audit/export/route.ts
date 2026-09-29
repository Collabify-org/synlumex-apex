import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/plan';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = await createClient();
    const orgPlan = await getOrgPlan(supabase);

    // Enforce Enterprise-only audit export
    if (!orgPlan?.canUse('audit_export')) {
      return NextResponse.json(
        {
          error: 'Audit exports are an Enterprise feature. Upgrade to access.',
          code: 'AUDIT_EXPORT_LOCKED',
        },
        { status: 403 }
      );
    }

    const { data: logs } = await supabase
      .from('audit_log')
      .select('*, projects(code, name), profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(1000);

    const rows = logs ?? [];

    // Build CSV
    const header = ['when', 'action', 'entity', 'entity_id', 'project_code', 'actor', 'payload'];
    const lines = [header.join(',')];

    for (const l of rows as any[]) {
      const proj = Array.isArray(l.projects) ? l.projects[0] : l.projects;
      const profile = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles;

      const cells = [
        l.created_at ?? '',
        l.action ?? '',
        l.entity ?? '',
        l.entity_id ?? '',
        proj?.code ?? '',
        profile?.full_name ?? 'system',
        JSON.stringify(l.payload ?? {}),
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
        'Content-Disposition': `attachment; filename="synlumex-audit-${stamp}.csv"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}
