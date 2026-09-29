import { createClient } from '@/lib/supabase/server';
import { canCreateProject } from '@/lib/limits';
import { NewProjectForm } from './new-project-form';

export const dynamic = 'force-dynamic';

export default async function NewProjectPage() {
  const supabase = await createClient();
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .order('name');

  const { count } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('archived', false);

  const nextCode = `SYNLUMEX-P${String((count ?? 0) + 1).padStart(3, '0')}`;

  const limit = await canCreateProject(supabase);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight mb-1">New Project</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Create a new project in the portfolio.
      </p>
      <NewProjectForm
        clients={clients ?? []}
        suggestedCode={nextCode}
        limitInfo={{ used: limit.used, limit: limit.limit }}
      />
    </div>
  );
}
