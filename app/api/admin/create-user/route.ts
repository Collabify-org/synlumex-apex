import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { canAddUser } from '@/lib/limits';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    // 1. Verify caller is super admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (!callerProfile?.is_super_admin) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // 2. Parse body
    const { email, password, fullName, role, orgId } = await req.json();

    if (!email || !password || !orgId) {
      return NextResponse.json(
        { error: 'email, password, and orgId are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // 3. Check plan user cap for THIS org
    const { data: org } = await supabase
      .from('organizations')
      .select('id, plan_id')
      .eq('id', orgId)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const { data: plan } = await supabase
      .from('plans')
      .select('name, max_users')
      .eq('id', org.plan_id)
      .single();

    if (plan && plan.max_users !== null) {
      const { count: userCount } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      const used = userCount ?? 0;
      if (used >= plan.max_users) {
        return NextResponse.json(
          {
            error: `This organization has reached its ${plan.name} plan limit of ${plan.max_users} team members. Upgrade the plan to add more.`,
            code: 'USER_LIMIT_REACHED',
            used,
            limit: plan.max_users,
          },
          { status: 403 }
        );
      }
    }

    // 4. Create the user via admin API (service role)
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: authError?.message ?? 'Failed to create user' },
        { status: 400 }
      );
    }

    // 5. Create profile
    const { error: profileError } = await admin.from('profiles').insert({
      id: authUser.user.id,
      email: email.trim().toLowerCase(),
      full_name: fullName ?? email.split('@')[0],
      role: 'owner',
      is_super_admin: false,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    // 6. Link to organization
    const { error: memberError } = await admin.from('organization_members').insert({
      organization_id: orgId,
      user_id: authUser.user.id,
      role: role === 'member' ? 'member' : 'owner',
    });

    if (memberError) {
      await admin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Org link failed: ${memberError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId: authUser.user.id,
      email: authUser.user.email,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Unknown error' }, { status: 500 });
  }
}
