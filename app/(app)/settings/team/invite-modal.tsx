'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Loader2, UserPlus, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { createTeamMember } from './team-actions';

type Role = 'owner' | 'admin' | 'member';

export function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let pwd = '';
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setPassword(pwd);
    setShowPassword(true);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createTeamMember({ email, password, fullName, role });
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Failed to create user');
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand" />
            <h2 className="font-semibold">Add team member</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                <Check className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="font-semibold mb-1">Team member added</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Share the email and password with {fullName || email}. They can log in
                immediately and change their password from Account settings.
              </p>
              <Button className="mt-5" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Password * (min 8 chars)</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set a temporary password"
                    className="pr-20"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="text-[10px] text-brand-cyan hover:underline font-medium"
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Share this with the user — they can change it later in Account → Security.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Role</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['member', 'admin', 'owner'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`rounded-md border px-3 py-2 text-xs capitalize transition-all ${
                        role === r
                          ? 'border-brand-cyan bg-brand/10 font-medium'
                          : 'border-border bg-background/40 text-muted-foreground hover:border-brand-cyan/40'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {role === 'owner'
                    ? 'Full access including billing and team management.'
                    : role === 'admin'
                    ? 'Can manage projects, members, and settings. No billing.'
                    : 'Can view and edit projects. No settings access.'}
                </p>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        {!done && (
          <div className="flex justify-end gap-2 p-4 border-t border-border">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={busy || !email || password.length < 8}
              className="gap-2 brand-gradient text-white"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserPlus className="h-3.5 w-3.5" />
              )}
              Add team member
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
