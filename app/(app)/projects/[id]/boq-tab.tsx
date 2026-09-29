'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Save, Upload, FileText, X, Lock } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import type { CurrencyCode } from '@/lib/types';

interface Item {
  description: string;
  unit: string | null;
  quantity: number;
  rate: number;
}

type BoqRow = {
  id: string;
  description: string;
  unit: string | null;
  quantity: number;
  rate: number;
  amount: number;
  source: string;
};

type QuotaInfo = {
  used: number;
  limit: number | null;
};

export function BoqTab({
  projectId,
  currency,
  initialItems,
  quota,
}: {
  projectId: string;
  currency: CurrencyCode;
  initialItems: BoqRow[];
  quota: QuotaInfo;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [text, setText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);

  const atCap = quota.limit !== null && quota.used >= quota.limit;
  const remaining =
    quota.limit === null ? null : Math.max(0, quota.limit - quota.used);

  function reset() {
    setItems([]);
    setError(null);
    setNotice(null);
    setLimitError(null);
  }

  async function extractFromText() {
    setLoading(true);
    reset();
    try {
      const res = await fetch('/api/ai/boq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.status === 403 && data.code === 'AI_LIMIT_REACHED') {
        setLimitError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed');
      setItems(data.items ?? []);
      if ((data.items ?? []).length === 0) setError('No items found.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function extractFromPdf() {
    if (!pdfFile) return;
    setLoading(true);
    reset();
    try {
      const fd = new FormData();
      fd.append('file', pdfFile);
      fd.append('projectId', projectId);
      const res = await fetch('/api/ai/boq-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.status === 403 && data.code === 'AI_LIMIT_REACHED') {
        setLimitError(data.error);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Extraction failed');
      setItems(data.items ?? []);
      if ((data.items ?? []).length === 0)
        setError('No BOQ items found in the PDF.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveItems() {
    setSaving(true);
    setError(null);
    try {
      const rows = items.map((i) => ({
        project_id: projectId,
        description: i.description,
        unit: i.unit,
        quantity: i.quantity,
        rate: i.rate,
        source: 'ai_extracted',
      }));
      const { error } = await supabase.from('boq_items').insert(rows);
      if (error) throw new Error(error.message);
      setNotice(`Saved ${items.length} items.`);
      setText('');
      setPdfFile(null);
      setItems([]);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files accepted.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10MB).');
      return;
    }
    setPdfFile(f);
    setError(null);
    setNotice(null);
  }

  const canExtract =
    !atCap && (mode === 'text' ? text.trim().length >= 10 : !!pdfFile);

  return (
    <div className="space-y-4">
      <Card className="p-5 bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <h3 className="font-semibold">AI BOQ Extraction</h3>
          </div>
          {quota.limit !== null && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {quota.used} / {quota.limit} AI extractions this month
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Upload a PDF spec or paste text. AI extracts structured line items.
        </p>

        {/* Cap hit banner */}
        {(atCap || limitError) && (
          <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs font-medium text-amber-400">
                  AI extraction limit reached
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {limitError ??
                    `You've used all ${quota.limit} AI extractions for this month on your plan. Resets on the 1st.`}
                </div>
                <a
                  href="mailto:abdul@synlumexai.com?subject=Upgrade for more AI extractions"
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-2 inline-block"
                >
                  Upgrade for more →
                </a>
              </div>
            </div>
          </div>
        )}

        {!atCap && !limitError && (
          <>
            <div className="inline-flex items-center rounded-md border border-border p-0.5 mb-3">
              <button
                onClick={() => {
                  setMode('text');
                  reset();
                }}
                className={`px-3 py-1.5 text-xs rounded ${
                  mode === 'text'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Paste Text
              </button>
              <button
                onClick={() => {
                  setMode('pdf');
                  reset();
                }}
                className={`px-3 py-1.5 text-xs rounded ${
                  mode === 'pdf'
                    ? 'bg-brand text-brand-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Upload PDF
              </button>
            </div>

            {mode === 'text' ? (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="e.g. Supply and install 500 cum of M30 grade RCC at Rs 9200 per cum..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              />
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) {
                    if (!f.name.toLowerCase().endsWith('.pdf')) {
                      setError('Only PDF files accepted.');
                      return;
                    }
                    setPdfFile(f);
                    setError(null);
                  }
                }}
                className="border border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-brand/50 hover:bg-brand/5 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={onFilePick}
                />
                {pdfFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-6 w-6 text-brand" />
                    <div className="text-left">
                      <div className="text-sm font-medium">{pdfFile.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {(pdfFile.size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfFile(null);
                      }}
                      className="ml-2 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <div className="text-sm">Click to upload or drag PDF here</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                      PDF only · max 10MB
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button
                onClick={mode === 'text' ? extractFromText : extractFromPdf}
                disabled={loading || !canExtract}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Extract with AI
              </Button>
              {remaining !== null && remaining <= 5 && remaining > 0 && (
                <span className="text-[10px] font-mono text-amber-400">
                  Only {remaining} left this month
                </span>
              )}
              {items.length > 0 && (
                <Button onClick={saveItems} variant="secondary" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" /> Save {items.length} items
                </Button>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
            {notice}
          </div>
        )}
      </Card>

      {items.length > 0 && (
        <Card className="bg-card/50 overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-semibold">Extracted Items (preview)</h4>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">DESCRIPTION</th>
                <th className="text-left p-3 font-normal">UNIT</th>
                <th className="text-right p-3 font-normal">QTY</th>
                <th className="text-right p-3 font-normal">RATE</th>
                <th className="text-right p-3 font-normal">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-3">{it.description}</td>
                  <td className="p-3 text-muted-foreground">{it.unit ?? '—'}</td>
                  <td className="p-3 text-right font-mono text-xs">{it.quantity}</td>
                  <td className="p-3 text-right font-mono text-xs">{it.rate}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {formatMoney(it.quantity * it.rate, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card className="bg-card/50 overflow-hidden">
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-semibold">Saved BOQ ({initialItems.length})</h4>
        </div>
        {initialItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No BOQ items saved yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">DESCRIPTION</th>
                <th className="text-left p-3 font-normal">UNIT</th>
                <th className="text-right p-3 font-normal">QTY</th>
                <th className="text-right p-3 font-normal">RATE</th>
                <th className="text-right p-3 font-normal">AMOUNT</th>
                <th className="text-left p-3 font-normal">SOURCE</th>
              </tr>
            </thead>
            <tbody>
              {initialItems.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="p-3">{it.description}</td>
                  <td className="p-3 text-muted-foreground">{it.unit ?? '—'}</td>
                  <td className="p-3 text-right font-mono text-xs">{it.quantity}</td>
                  <td className="p-3 text-right font-mono text-xs">{it.rate}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {formatMoney(Number(it.amount), currency)}
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        it.source === 'ai_extracted'
                          ? 'bg-brand/10 text-brand'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {it.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
