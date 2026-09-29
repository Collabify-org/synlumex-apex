import { NextResponse } from 'next/server';
import { extractBOQ } from '@/lib/ai/provider';
import { createClient } from '@/lib/supabase/server';
import { canRunAI } from '@/lib/limits';
import { extractText, getDocumentProxy } from 'unpdf';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });

    const supabase = await createClient();

    // Enforce AI cap
    const limit = await canRunAI(supabase);
    if (!limit.allowed) {
      return NextResponse.json(
        {
          error: limit.reason ?? 'AI quota reached',
          code: 'AI_LIMIT_REACHED',
          used: limit.used,
          limit: limit.limit,
        },
        { status: 403 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();

    let text = '';
    try {
      const pdf = await getDocumentProxy(new Uint8Array(arrayBuffer));
      const result = await extractText(pdf, { mergePages: true });
      text = Array.isArray(result.text) ? result.text.join('\n\n') : result.text;
    } catch (e: any) {
      return NextResponse.json(
        { error: `Could not parse PDF: ${e.message ?? 'unknown'}` },
        { status: 400 }
      );
    }

    if (!text || text.trim().length < 20) {
      return NextResponse.json(
        { error: 'PDF has no readable text (may be scanned image — OCR not supported yet).' },
        { status: 400 }
      );
    }

    const items = await extractBOQ(text);

    // Track usage
    try {
      await supabase.from('usage_events').insert({
        event_type: 'ai_boq',
        metadata: { items: items.length, source: 'pdf', file_size: file.size },
      });
    } catch {}

    if (projectId && items.length > 0) {
      const rows = items.map((i) => ({
        project_id: projectId,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        rate: i.rate,
        source: 'ai_extracted',
      }));
      const { error } = await supabase.from('boq_items').insert(rows);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      items,
      textLength: text.length,
      preview: text.slice(0, 400),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
