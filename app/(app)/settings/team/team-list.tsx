'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { timeAgo, shortDate } from '@/lib/format';
import {
  UserPlus,
  MoreVertical,
  Shield,
  ShieldCheck,
  User,
  Trash2,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { InviteModal } from './invite-modal';
import { changeMemberRole, removeMember } from './team-actions';

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  email: string | null;
  full_name: string | null;
  is_current_user: boolean;
};

type Props = {
  members: Member[];
  canManage: boolean;
  planLimit: number | null;
};

const roleVariant: Record<string, 'green' | 'amber' | 'outline'> = {
  owner: 'green',
  admin: 'amber',
  member: 'outline',
};

const roleIcon: Record<string, React.ReactNode> = {
  owner: <ShieldCheck className="h-3 w-3" />,
  admin: <Shield className="h-3 w-3" />,
  member: <User className="h-3 w-3" />,
};

export function TeamList({ members, canManage, planLimit }: Props) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const atCap = planLimit !== null && members.length >= planLimit;

  async function handleChangeRole(memberId: string, newRole: string) {
    if (!confirm(`Change this member's role to ${newRole}?`)) return;
    setBusy(memberId);
    const res = await changeMemberRole(memberId, newRole as any);
    setBusy(null);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setMenuOpen(null);
    router.refresh();
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this member from the workspace? They will lose access immediately.')) return;
    setBusy(memberId);
    const res = await removeMember(memberId);
    setBusy(null);
    if (!res.ok) {
      alert(res.error);
      return;
    }
    setMenuOpen(null);
    router.refresh();
  }

  return (
    <>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {members.length} team member{members.length === 1 ? '' : 's'}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {planLimit === null
              ? 'Unlimited seats on your plan.'
              : `${members.length} of ${planLimit} seats used.`}
          </p>
        </div>
        {canManage && !atCap && (
          <Button
            onClick={() => setInviteOpen(true)}
            className="gap-2 brand-gradient text-white"
            size="sm"
          >
            <UserPlus className="h-4 w-4" />
            Add team member
          </Button>
        )}
        {canManage && atCap && (
          <a href="mailto:abdul@synlumexai.com?subject=Upgrade for more seats">
            <Button variant="outline" size="sm" className="gap-2 text-amber-500 border-amber-500/40">
              Upgrade to add more
            </Button>
          </a>
        )}
      </div>

      {/* Members table */}
      <Card className="bg-card/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30">
              <tr className="text-[10px] font-mono tracking-widest text-muted-foreground">
                <th className="text-left p-3 font-normal">NAME</th>
                <th className="text-left p-3 font-normal">EMAIL</th>
                <th className="text-left p-3 font-normal">ROLE</th>
                <th className="text-right p-3 font-normal">JOINED</th>
                <th className="w-10 p-3"></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    'border-t border-border hover:bg-accent/30 transition-colors',
                    m.is_current_user && 'bg-brand/5'
                  )}
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full brand-gradient flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {(m.full_name ?? m.email ?? 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {m.full_name || 'Unnamed'}
                        </div>
                        {m.is_current_user && (
                          <div className="text-[10px] font-mono text-brand">You</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{m.email ?? '—'}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <Badge
                      variant={roleVariant[m.role] ?? 'outline'}
                      className="text-[10px] capitalize gap-1"
                    >
                      {roleIcon[m.role]}
                      {m.role}
                    </Badge>
                  </td>
                  <td className="p-3 text-right text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {shortDate(m.joined_at)}
                  </td>
                  <td className="p-2 text-right relative">
                    {canManage && !m.is_current_user && (
                      <>
                        <button
                          onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                          disabled={busy === m.id}
                          className="p-1.5 rounded hover:bg-accent disabled:opacity-40"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {menuOpen === m.id && (
                          <div
                            className="absolute right-2 top-full mt-1 w-52 rounded-md border border-border bg-card shadow-lg z-20 overflow-hidden"
                            onClick={() => setMenuOpen(null)}
                          >
                            <div className="px-3 py-2 text-[10px] font-mono tracking-widest text-muted-foreground uppercase border-b border-border">
                              Change role
                            </div>
                            {(['owner', 'admin', 'member'] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => handleChangeRole(m.id, r)}
                                disabled={m.role === r}
                                className={cn(
                                  'w-full text-left px-3 py-2 text-xs hover:bg-accent/50 capitalize flex items-center gap-2',
                                  m.role === r && 'opacity-40 cursor-not-allowed'
                                )}
                              >
                                {roleIcon[r]}
                                {r}
                              </button>
                            ))}
                            <div className="border-t border-border">
                              <button
                                onClick={() => handleRemove(m.id)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-destructive/10 text-destructive flex items-center gap-2"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove from workspace
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Info */}
      <div className="mt-4 text-[10px] font-mono text-muted-foreground leading-relaxed">
        <div className="mb-1 font-semibold uppercase tracking-widest">Roles</div>
        <ul className="space-y-1">
          <li>• <span className="text-foreground">Owner</span> — full access including billing and team management</li>
          <li>• <span className="text-foreground">Admin</span> — can manage projects, members, and settings</li>
          <li>• <span className="text-foreground">Member</span> — can view and edit projects</li>
        </ul>
      </div>

      {/* Modal */}
      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </>
  );
}
