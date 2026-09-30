'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutGrid, FolderKanban, AlertTriangle, Banknote,
  Sparkles, Bell, ScrollText, Settings, Plug,
  User, CreditCard, LogOut, ChevronUp,
} from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/lib/types';

type Org = {
  id: string;
  name: string;
  plan_id: string | null;
  status: string;
} | null;

type Props = {
  profile: Profile | null;
  org?: Org;
};

const NAV = {
  OPERATIONS: [
    { href: '/dashboard', label: 'Command Center', icon: LayoutGrid },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/exceptions', label: 'Exceptions', icon: AlertTriangle },
    { href: '/commercial', label: 'Commercial', icon: Banknote },
  ],
  INTELLIGENCE: [
    { href: '/intelligence', label: 'Intelligence', icon: Sparkles },
    { href: '/reminders', label: 'Reminders', icon: Bell },
  ],
  SYSTEM: [
    { href: '/audit', label: 'Audit Log', icon: ScrollText },
    { href: '/settings/integrations', label: 'Integrations', icon: Plug },
    { href: '/settings', label: 'Settings', icon: Settings, exact: true },
  ],
};

export function Sidebar({ profile, org }: Props) {
  const path = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // Close on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [path]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initial = profile?.full_name?.charAt(0)?.toUpperCase() ?? 'U';

  return (
    <aside className="w-60 shrink-0 border-r border-border bg-card/30 flex flex-col h-screen">
      {/* Brand */}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <Link href="/dashboard" className="group flex items-center" aria-label="SYNLUMEX">
          <Logo size={28} interactive />
        </Link>
      </div>

      {/* Org nameplate */}
      {org && (
        <div className="px-3 pt-3">
          <div className="rounded-md border border-border bg-background/40 px-3 py-2">
            <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-0.5">
              Workspace
            </div>
            <div className="text-xs font-medium truncate">{org.name}</div>
            <div className="text-[10px] font-mono text-brand-cyan capitalize mt-0.5">
              {org.plan_id ?? 'no plan'} · {org.status}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {Object.entries(NAV).map(([section, items]) => (
          <div key={section} className="mb-6">
            <div className="px-3 mb-2 text-[10px] font-mono tracking-widest text-muted-foreground/70">
              {section}
            </div>
            {items.map((item) => {
              const active = (item as any).exact
                ? path === item.href
                : path === item.href || path.startsWith(item.href + '/');
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all relative',
                    active
                      ? 'bg-brand/10 text-foreground'
                      : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r brand-gradient" />
                  )}
                  <Icon className={cn('h-4 w-4', active && 'text-brand-cyan')} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profile card (bottom) — menu opens upward */}
      <div className="border-t border-border p-3 relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            'w-full flex items-center gap-3 rounded-md px-2 py-2 transition-colors text-left',
            menuOpen ? 'bg-accent/60' : 'hover:bg-accent/40'
          )}
        >
          <div className="h-8 w-8 rounded-full brand-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium truncate">
              {profile?.full_name ?? 'User'}
            </div>
            <div className="text-[10px] text-muted-foreground capitalize font-mono truncate">
              {profile?.role ?? 'member'}
            </div>
          </div>
          <ChevronUp
            className={cn(
              'h-3 w-3 text-muted-foreground shrink-0 transition-transform',
              menuOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Menu opens upward */}
        {menuOpen && (
          <div className="absolute left-3 right-3 bottom-full mb-2 rounded-lg border border-border bg-popover shadow-2xl overflow-hidden z-50">
            {/* User header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full brand-gradient flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {profile?.full_name ?? 'User'}
                  </div>
                  <div className="text-[10px] font-mono text-muted-foreground truncate">
                    {profile?.email ?? ''}
                  </div>
                </div>
              </div>
              {org && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <div className="text-[9px] font-mono tracking-widest text-muted-foreground uppercase mb-0.5">
                    Workspace
                  </div>
                  <div className="text-xs font-medium truncate">
                    {org.name}
                  </div>
                  <div className="text-[10px] font-mono text-brand-cyan capitalize mt-0.5">
                    {org.plan_id ?? 'no plan'} · {org.status}
                  </div>
                </div>
              )}
            </div>

            {/* Links */}
            <div className="py-1">
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent/60 transition-colors"
              >
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">Profile</span>
              </Link>
              <Link
                href="/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent/60 transition-colors"
              >
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">Billing &amp; Plan</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-accent/60 transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">Settings</span>
              </Link>
            </div>

            {/* Sign out */}
            <div className="py-1 border-t border-border">
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-2 text-sm w-full text-left hover:bg-destructive/10 text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
