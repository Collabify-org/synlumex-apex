'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type ActionResult = { ok: boolean; error?: string };

async function getUserId(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ============================================================
// UPDATE PROFILE (name, phone, title, timezone, bio, company, avatar)
// ============================================================
export async function updateProfile(payload: {
  full_name: string;
  phone: string;
  job_title: string;
  timezone: string;
  bio: string;
  company_name: string;
  avatar_url: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: 'Not authenticated' };

  if (!payload.full_name.trim()) {
    return { ok: false, error: 'Full name is required' };
  }
  if (payload.full_name.length > 80) {
    return { ok: false, error: 'Name too long (max 80)' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: payload.full_name.trim(),
      phone: payload.phone.trim() || null,
      job_title: payload.job_title.trim() || null,
      timezone: payload.timezone || 'UTC',
      bio: payload.bio.trim() || null,
      company_name: payload.company_name.trim() || null,
      avatar_url: payload.avatar_url.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath('/profile');
  revalidatePath('/settings');
  return { ok: true };
}

// ============================================================
// UPLOAD AVATAR (Supabase Storage)
// ============================================================
export async function uploadAvatar(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
  url?: string;
}> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: 'Not authenticated' };

  const file = formData.get('file') as File | null;
  if (!file) return { ok: false, error: 'No file provided' };

  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'File too large (max 2MB)' };
  }

  const allowed = ['image/png', 'image/jpeg', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return { ok: false, error: 'Only PNG, JPG, or WebP allowed' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true });

  if (uploadErr) return { ok: false, error: uploadErr.message };

  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from('profiles')
    .update({ avatar_url: urlData.publicUrl, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (dbErr) return { ok: false, error: dbErr.message };

  revalidatePath('/profile');
  return { ok: true, url: urlData.publicUrl };
}

// ============================================================
// CHANGE PASSWORD
// ============================================================
export async function changePassword(payload: {
  current_password: string;
  new_password: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: 'Not authenticated' };

  if (payload.new_password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'No email on file' };

  // Verify current password by re-signing in
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: payload.current_password,
  });

  if (verifyErr) {
    return { ok: false, error: 'Current password is incorrect' };
  }

  // Update password
  const { error } = await supabase.auth.updateUser({
    password: payload.new_password,
  });

  if (error) return { ok: false, error: error.message };

  // Update password_changed_at
  await supabase
    .from('profiles')
    .update({ password_changed_at: new Date().toISOString() })
    .eq('id', userId);

  revalidatePath('/profile');
  return { ok: true };
}

// ============================================================
// CHANGE EMAIL (sends confirmation to new email via Supabase Auth)
// ============================================================
export async function changeEmail(payload: { new_email: string }): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: 'Not authenticated' };

  const email = payload.new_email.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, error: 'Invalid email' };
  }

  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

// ============================================================
// SIGN OUT OTHER SESSIONS
// ============================================================
export async function signOutOthers(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ============================================================
// UPDATE NOTIFICATION PREFERENCES (per-user)
// ============================================================
export async function updateUserNotifications(payload: {
  mute_all: boolean;
  critical_only: boolean;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const userId = await getUserId(supabase);
  if (!userId) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      notif_opt_out: {
        mute_all: payload.mute_all,
        critical_only: payload.critical_only,
      },
    })
    .eq('id', userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath('/profile');
  return { ok: true };
}
