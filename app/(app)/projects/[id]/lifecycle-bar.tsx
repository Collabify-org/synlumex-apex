'use client';

import { useState } from 'react';
import { STAGES, type ProjectStage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { StageDrawer } from './stage-drawer';

type StageRow = {
  id: string;
  project_id: string;
  stage: ProjectStage;
  status: 'pending' | 'in_progress' | 'done' | 'blocked';
  entered_at: string | null;
  completed_at: string | null;
  notes: string | null;
  updated_at: string;
  input_summary?: string | null;
  output_summary?: string | null;
  evidence_url?: string | null;
};

type StageEvent = {
  id: string;
  stage: ProjectStage;
  event_type: string;
  actor_id: string | null;
  actor_name?: string | null;
  summary: string | null;
  evidence_url: string | null;
  created_at: string;
};

type Props = {
  projectId: string;
  currentStage: ProjectStage;
  stages: StageRow[];
  events: StageEvent[];
  projectCurrency: string;
};

export function LifecycleBar({
  projectId,
  currentStage,
  stages,
  events,
  projectCurrency,
}: Props) {
  const [openStage, setOpenStage] = useState<ProjectStage | null>(null);

  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  function statusOf(stage: ProjectStage): StageRow['status'] {
    const row = stages.find((s) => s.stage === stage);
    return row?.status ?? 'pending';
  }

  const selectedStageRow = openStage
    ? stages.find((s) => s.stage === openStage) ?? null
    : null;

  const selectedStageIdx = openStage
    ? STAGES.findIndex((s) => s.key === openStage)
    : -1;

  const selectedEvents = openStage
    ? events.filter((e) => e.stage === openStage)
    : [];

  return (
    <>
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STAGES.map((s, idx) => {
          const status = statusOf(s.key);
          const active = currentStage === s.key;
          const isPast = idx < currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={s.key} className="flex items-center shrink-0">
              <button
                onClick={() => setOpenStage(s.key)}
                className={cn(
                  'h-10 min-w-[68px] rounded-md px-2 flex items-center justify-center text-[10px] font-mono transition-all cursor-pointer hover:ring-2 hover:ring-brand-cyan/40 relative',
                  active
                    ? 'bg-brand text-brand-foreground shadow-sm'
                    : status === 'done'
                    ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    : status === 'blocked'
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                    : status === 'in_progress'
                    ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
                title={`Click to view ${s.label} details`}
              >
                <span className="font-semibold">{s.short}</span>
                {status === 'blocked' && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 border border-background" />
                )}
              </button>
              {idx < STAGES.length - 1 && (
                <div className="w-1 h-px bg-border" />
              )}
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="text-[10px] font-mono text-muted-foreground mt-2">
        Click any stage to view evidence, outputs, and history
      </div>

      {/* Drawer */}
      {openStage && (
        <StageDrawer
          open={openStage !== null}
          onClose={() => setOpenStage(null)}
          projectId={projectId}
          stage={openStage}
          stageRow={selectedStageRow}
          events={selectedEvents}
          isCurrentStage={openStage === currentStage}
          isPastStage={selectedStageIdx < currentIdx}
          isFutureStage={selectedStageIdx > currentIdx}
          projectCurrency={projectCurrency}
        />
      )}
    </>
  );
}
