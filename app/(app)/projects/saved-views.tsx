'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Star, Bookmark, X, Plus } from 'lucide-react';

const STORAGE_KEY = 'synlumex:project-views';

type SavedView = {
  id: string;
  name: string;
  query: string; // the search string e.g. "health=red&stage=execution"
};

const PRESETS: SavedView[] = [
  { id: 'preset-all', name: 'All', query: '' },
  { id: 'preset-critical', name: 'Critical', query: 'health=red' },
  { id: 'preset-risk', name: 'At Risk', query: 'health=amber' },
  { id: 'preset-execution', name: 'Execution', query: 'stage=execution' },
  { id: 'preset-procurement', name: 'Procurement', query: 'stage=procurement' },
];

export function SavedViews() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [userViews, setUserViews] = useState<SavedView[]>([]);
  const [saveName, setSaveName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUserViews(JSON.parse(raw));
    } catch {}
  }, []);

  function persist(views: SavedView[]) {
    setUserViews(views);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
    } catch {}
  }

  function applyView(query: string) {
    if (!query) {
      router.push(pathname);
    } else {
      router.push(`${pathname}?${query}`);
    }
  }

  function isActive(query: string): boolean {
    const current = searchParams.toString();
    if (!query) return current === '';
    // loose comparison — sorts keys
    const a = new URLSearchParams(query).toString();
    const b = new URLSearchParams(current).toString();
    return a === b;
  }

  function saveCurrent() {
    const name = saveName.trim();
    if (!name) return;

    const query = searchParams.toString();
    const next: SavedView[] = [
      ...userViews.filter((v) => v.name !== name),
      { id: `user-${Date.now()}`, name, query },
    ];
    persist(next);
    setSaveName('');
    setSaveOpen(false);
  }

  function removeView(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    persist(userViews.filter((v) => v.id !== id));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase flex items-center gap-1">
        <Bookmark className="h-3 w-3" />
        Views
      </span>

      {PRESETS.map((v) => (
        <button
          key={v.id}
          onClick={() => applyView(v.query)}
          className={cn(
            'rounded-full border px-3 py-1 text-[11px] transition-all',
            isActive(v.query)
              ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
              : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
          )}
        >
          {v.name}
        </button>
      ))}

      {userViews.map((v) => (
        <button
          key={v.id}
          onClick={() => applyView(v.query)}
          className={cn(
            'group rounded-full border px-3 py-1 text-[11px] transition-all inline-flex items-center gap-1',
            isActive(v.query)
              ? 'border-brand-cyan bg-brand/10 text-foreground font-medium'
              : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40 hover:text-foreground'
          )}
        >
          <Star className="h-2.5 w-2.5 text-amber-400" />
          {v.name}
          <span
            onClick={(e) => removeView(v.id, e)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
            role="button"
            aria-label="Remove view"
          >
            <X className="h-2.5 w-2.5" />
          </span>
        </button>
      ))}

      {/* Save current view */}
      {saveOpen ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveCurrent();
              if (e.key === 'Escape') {
                setSaveOpen(false);
                setSaveName('');
              }
            }}
            placeholder="View name…"
            className="h-7 rounded-full border border-brand-cyan bg-background px-3 text-[11px] outline-none w-32"
          />
          <button
            onClick={saveCurrent}
            className="text-brand-cyan hover:text-foreground"
            aria-label="Save"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={() => {
              setSaveOpen(false);
              setSaveName('');
            }}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSaveOpen(true)}
          className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-brand-cyan/60 hover:text-foreground transition-all inline-flex items-center gap-1"
        >
          <Plus className="h-2.5 w-2.5" />
          Save view
        </button>
      )}
    </div>
  );
}
