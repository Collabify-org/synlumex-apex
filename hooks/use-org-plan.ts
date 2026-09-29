'use client';

import { useEffect, useState } from 'react';
import type { OrgPlan } from '@/lib/plan';

type State = {
  data: OrgPlan | null;
  isLoading: boolean;
  error: Error | null;
};

export function useOrgPlan(): State {
  const [state, setState] = useState<State>({
    data: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/me/plan', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as OrgPlan;
        if (!cancelled) {
          setState({ data, isLoading: false, error: null });
        }
      } catch (e: any) {
        if (!cancelled) {
          setState({ data: null, isLoading: false, error: e });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
