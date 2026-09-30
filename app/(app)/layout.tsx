import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { ImpersonationBanner } from '@/components/shell/impersonation-banner';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Update last login timestamp (fire and forget)
  void supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)
    .then();

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If super admin is impersonating, use the impersonated org
  let org: any = null;
  const impersonatingOrgId = (profile as any)?.impersonating_org_id;

  if (impersonatingOrgId) {
    const { data: impOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', impersonatingOrgId)
      .single();
    org = impOrg;
  } else {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id, role, organizations(*)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    org = (membership as any)?.organizations ?? null;
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-background">
      {impersonatingOrgId && org && (
        <ImpersonationBanner orgName={org.name} />
      )}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <Sidebar profile={profile} org={org} />
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto min-h-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
