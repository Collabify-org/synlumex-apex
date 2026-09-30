'use client';

import { useEffect, useState } from 'react';
import { Search, Bell, AlertTriangle } from 'lucide-react';
import { CommandPalette } from './command-palette';

export function Topbar() {
  const [clock, setClock] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setClock(
        d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' UTC'
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Cmd+K opens palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="h-14 shrink-0 border-b border-border bg-background flex items-center px-6 gap-4 sticky top-0 z-30">
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex items-center gap-2 rounded-md border border-border bg-background/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-brand-cyan/40 transition-colors min-w-[280px]"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search…</span>
          <span className="ml-auto font-mono text-[10px] opacity-60">⌘K</span>
        </button>

        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-muted-foreground font-mono">
            Last sync: {clock}
          </span>

          <button className="relative text-muted-foreground hover:text-brand-cyan transition-colors">
            <Bell className="h-4 w-4" />
          </button>

          <button className="relative text-muted-foreground hover:text-brand-cyan transition-colors">
            <AlertTriangle className="h-4 w-4" />
          </button>

          <span className="text-[10px] font-mono font-semibold tracking-widest text-white rounded px-2 py-1 brand-gradient brand-glow">
            LIVE
          </span>
        </div>
      </header>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}
