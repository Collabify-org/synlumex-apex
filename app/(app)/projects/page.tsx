import { createClient } from '@/lib/supabase/server';
import { listProjects, getDistinctClients } from '@/lib/queries/projects';
import { canCreateProject } from '@/lib/limits';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle, ArrowRight, FolderKanban } from 'lucide-react';
import Link from 'next/link';
import { ProjectsToolbar } from './projects-toolbar';
import { ProjectsTableClient } from './projects-table-client';

export const dynamic = 'force-dynamic';

type SearchParams = {
  q?: string;
  health?: string | string[];
  stage?: string | string[];
  client?: string | string[];
  currency?: string | string[];
  sort?: string;
  dir?: 'asc' | 'desc';
};

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filters = {
    q: searchParams.q,
    health: toArray(searchParams.health),
    stage: toArray(searchParams.stage),
    client: toArray(searchParams.client),
    currency: toArray(searchParams.currency),
    sort: searchParams.sort,
    dir: searchParams.dir,
  };

  const [rows, clients, limit, allCountRes] = await Promise.all([
    listProjects(filters),
    getDistinctClients(),
    canCreateProject(await createClient()),
    (await createClient())
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('archived', false),
  ]);

  const totalCount = allCountRes.count ?? 0;
  const filteredCount = rows.length;

  const usage =
    limit.limit !== null ? Math.round((limit.used / limit.limit) * 100) : null;
  const showWarning = usage !== null && usage >= 70 && usage < 100;
  const showLocked = usage !== null && usage >= 100;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-brand" /> Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} active project{totalCount === 1 ? '' : 's'}
            {limit.limit !== null && ` · ${limit.used} / ${limit.limit} on your plan`}
          </p>
        </div>
        {!showLocked && (
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 rounded-md brand-gradient text-white px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Project
          </Link>
        )}
      </div>

      {/* Usage warning (70-99%) */}
      {showWarning && (
        <Card className="mb-4 p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                You&apos;re using {usage}% of your project allowance
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {limit.used} of {limit.limit} projects used. Upgrade to add more before you hit
                the cap.
              </div>
            </div>
            <a href="mailto:abdul@synlumexai.com?subject=Upgrade to add more projects">
              <button className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1">
                Upgrade
                <ArrowRight className="h-3 w-3" />
              </button>
            </a>
          </div>
        </Card>
      )}

      {/* Locked (100%) */}
      {showLocked && (
        <Card className="mb-4 p-4 border-destructive/40 bg-destructive/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium">
                You&apos;ve reached your plan limit
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {limit.limit} active projects maximum. Archive a project or upgrade to add more.
              </div>
            </div>
            <a href="mailto:abdul@synlumexai.com?subject=Upgrade to add more projects">
              <button className="text-xs text-destructive hover:opacity-80 font-medium inline-flex items-center gap-1">
                Upgrade Plan
                <ArrowRight className="h-3 w-3" />
              </button>
            </a>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div className="mb-4">
        <ProjectsToolbar
          clients={clients}
          totalCount={totalCount}
          filteredCount={filteredCount}
        />
      </div>

      {/* Table */}
      <ProjectsTableClient rows={rows} />
    </div>
  );
}
