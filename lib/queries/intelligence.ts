import { createClient } from '@/lib/supabase/server';

export type IntelRange = '90d' | '180d' | '365d' | 'all';

export type KpiDelta = {
  current: number;
  previous: number;
  delta: number;
  deltaPercent: number;
  direction: 'up' | 'down' | 'flat';
  positive: boolean;
};

export type ExceptionCause = {
  type: string;
  count: number;
  percent: number;
};

export type CurrencyExposure = {
  currency: string;
  value: number;
  percent: number;
};

export type HealthSnapshot = {
  onTrack: number;
  atRisk: number;
  critical: number;
  onHold: number;
};

export type StageBucket = {
  stage: string;
  count: number;
};

export type ClientLtv = {
  client_name: string;
  project_count: number;
  total_value: number;
  total_collected: number;
  avg_efficiency: number;
};

export type DurationBucket = {
  range: string; // e.g. "0-90"
  count: number;
};

export type MonthlyTrend = {
  month: string;
  label: string;
  avg_duration: number;
  project_count: number;
};

export type IntelligenceData = {
  range: IntelRange;
  // KPIs
  avgDuration: KpiDelta;
  avgDaysToEnd: KpiDelta;
  lifetimeValue: KpiDelta;
  // Static
  exceptionCauses: ExceptionCause[];
  currencyExposure: CurrencyExposure[];
  healthSnapshot: HealthSnapshot;
  stageDistribution: StageBucket[];
  // New
  clientLtv: ClientLtv[];
  durationDistribution: DurationBucket[];
  monthlyTrend: MonthlyTrend[];
  // Totals
  totalProjects: number;
  totalExceptionCount: number;
};

function rangeToCutoff(range: IntelRange): Date | null {
  if (range === 'all') return null;
  const days = range === '90d' ? 90 : range === '180d' ? 180 : 365;
  return new Date(Date.now() - days * 86400000);
}

function prevRange(range: IntelRange): { start: Date; end: Date } | null {
  if (range === 'all') return null;
  const days = range === '90d' ? 90 : range === '180d' ? 180 : 365;
  const end = new Date(Date.now() - days * 86400000);
  const start = new Date(end.getTime() - days * 86400000);
  return { start, end };
}

function mkDelta(current: number, previous: number, higherIsBetter = true): KpiDelta {
  const delta = current - previous;
  const deltaPercent =
    previous === 0 ? (current > 0 ? 100 : 0) : (delta / Math.abs(previous)) * 100;
  const direction = Math.abs(deltaPercent) < 0.5 ? 'flat' : delta > 0 ? 'up' : 'down';
  return {
    current,
    previous,
    delta,
    deltaPercent,
    direction,
    positive: higherIsBetter ? delta >= 0 : delta <= 0,
  };
}

export async function getIntelligenceData(
  range: IntelRange = 'all'
): Promise<IntelligenceData> {
  const supabase = await createClient();

  const cutoff = rangeToCutoff(range);
  const prev = prevRange(range);

  // Projects (current window)
  let projQuery = supabase.from('projects').select('*').eq('archived', false);
  if (cutoff) projQuery = projQuery.gte('created_at', cutoff.toISOString());
  const { data: projects } = await projQuery;

  // Projects (previous window)
  let prevProjQuery = supabase
    .from('projects')
    .select('*')
    .eq('archived', false);
  if (prev) {
    prevProjQuery = prevProjQuery
      .gte('created_at', prev.start.toISOString())
      .lt('created_at', prev.end.toISOString());
  }
  const { data: prevProjects } = prev ? await prevProjQuery : { data: [] };

  const ps = projects ?? [];
  const prevPs = prevProjects ?? [];

  // ─── KPI: Avg duration ───
  const durations = ps
    .filter((p) => p.start_date && p.end_date)
    .map(
      (p) =>
        (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) /
        86400000
    );
  const avgDuration =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

  const prevDurations = prevPs
    .filter((p) => p.start_date && p.end_date)
    .map(
      (p) =>
        (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) /
        86400000
    );
  const prevAvgDuration =
    prevDurations.length > 0
      ? Math.round(prevDurations.reduce((a, b) => a + b, 0) / prevDurations.length)
      : 0;

  // ─── KPI: Avg days to end ───
  const activeWithEnd = ps.filter((p) => p.end_date && !p.archived);
  const avgDaysToEnd =
    activeWithEnd.length > 0
      ? Math.round(
          activeWithEnd.reduce(
            (s, p) =>
              s + (new Date(p.end_date!).getTime() - Date.now()) / 86400000,
            0
          ) / activeWithEnd.length
        )
      : 0;

  const prevActiveWithEnd = prevPs.filter((p) => p.end_date && !p.archived);
  const prevAvgDaysToEnd =
    prevActiveWithEnd.length > 0
      ? Math.round(
          prevActiveWithEnd.reduce(
            (s, p) =>
              s + (new Date(p.end_date!).getTime() - Date.now()) / 86400000,
            0
          ) / prevActiveWithEnd.length
        )
      : 0;

  // ─── KPI: Lifetime value ───
  const lifetimeValue = ps.reduce(
    (s, p) => s + Number(p.contract_value),
    0
  );
  const prevLifetimeValue = prevPs.reduce(
    (s, p) => s + Number(p.contract_value),
    0
  );

  // ─── Exception causes ───
  const projectIds = ps.map((p) => p.id);
  let exceptions: any[] = [];
  if (projectIds.length > 0) {
    const { data } = await supabase
      .from('exceptions')
      .select('type, severity, status, project_id')
      .in('project_id', projectIds);
    exceptions = data ?? [];
  }

  const causeMap = new Map<string, number>();
  for (const e of exceptions) {
    causeMap.set(e.type, (causeMap.get(e.type) ?? 0) + 1);
  }
  const exceptionCauses: ExceptionCause[] = Array.from(causeMap.entries())
    .map(([type, count]) => ({
      type,
      count,
      percent: exceptions.length > 0 ? (count / exceptions.length) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // ─── Currency exposure ───
  const currencyMap = new Map<string, number>();
  for (const p of ps) {
    const cur = p.currency;
    currencyMap.set(cur, (currencyMap.get(cur) ?? 0) + Number(p.contract_value));
  }
  const currencyExposure: CurrencyExposure[] = Array.from(currencyMap.entries())
    .map(([currency, value]) => ({
      currency,
      value,
      percent: lifetimeValue > 0 ? (value / lifetimeValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // ─── Health snapshot ───
  const healthSnapshot: HealthSnapshot = {
    onTrack: ps.filter((p) => p.health === 'green').length,
    atRisk: ps.filter((p) => p.health === 'amber').length,
    critical: ps.filter((p) => p.health === 'red').length,
    onHold: ps.filter((p) => p.health === 'on_hold').length,
  };

  // ─── Stage distribution ───
  const stageMap = new Map<string, number>();
  for (const p of ps) {
    stageMap.set(p.current_stage, (stageMap.get(p.current_stage) ?? 0) + 1);
  }
  const stageDistribution: StageBucket[] = Array.from(stageMap.entries()).map(
    ([stage, count]) => ({ stage, count })
  );

  // ─── Client LTV ───
  const { data: allProjectsWithClients } = await supabase
    .from('projects')
    .select('id, contract_value, client_id, clients(name)')
    .eq('archived', false);

  const clientAgg = new Map<
    string,
    { count: number; value: number; collected: number; billed: number }
  >();
  const clientProjectIds: Record<string, string[]> = {};

  for (const p of allProjectsWithClients ?? []) {
    const clientName = Array.isArray((p as any).clients)
      ? (p as any).clients[0]?.name
      : (p as any).clients?.name;
    if (!clientName) continue;
    if (!clientAgg.has(clientName)) {
      clientAgg.set(clientName, { count: 0, value: 0, collected: 0, billed: 0 });
      clientProjectIds[clientName] = [];
    }
    const entry = clientAgg.get(clientName)!;
    entry.count += 1;
    entry.value += Number(p.contract_value);
    clientProjectIds[clientName].push(p.id);
  }

  // Fetch billing + collections per client's projects
  const allIds = Object.values(clientProjectIds).flat();
  if (allIds.length > 0) {
    const { data: billings } = await supabase
      .from('billing')
      .select('project_id, amount')
      .in('project_id', allIds);
    const { data: collections } = await supabase
      .from('collections')
      .select('project_id, amount')
      .in('project_id', allIds);

    const billedByProj = new Map<string, number>();
    for (const b of billings ?? []) {
      billedByProj.set(
        b.project_id,
        (billedByProj.get(b.project_id) ?? 0) + Number(b.amount)
      );
    }
    const collByProj = new Map<string, number>();
    for (const c of collections ?? []) {
      collByProj.set(
        c.project_id,
        (collByProj.get(c.project_id) ?? 0) + Number(c.amount)
      );
    }

    for (const [clientName, ids] of Object.entries(clientProjectIds)) {
      const entry = clientAgg.get(clientName)!;
      let billed = 0;
      let collected = 0;
      for (const id of ids) {
        billed += billedByProj.get(id) ?? 0;
        collected += collByProj.get(id) ?? 0;
      }
      entry.billed = billed;
      entry.collected = collected;
    }
  }

  const clientLtv: ClientLtv[] = Array.from(clientAgg.entries())
    .map(([client_name, agg]) => ({
      client_name,
      project_count: agg.count,
      total_value: agg.value,
      total_collected: agg.collected,
      avg_efficiency: agg.billed > 0 ? (agg.collected / agg.billed) * 100 : 0,
    }))
    .sort((a, b) => b.total_value - a.total_value)
    .slice(0, 10);

  // ─── Duration distribution ───
  const durationBuckets = [
    { range: '0-90', min: 0, max: 90 },
    { range: '91-180', min: 91, max: 180 },
    { range: '181-365', min: 181, max: 365 },
    { range: '365-730', min: 366, max: 730 },
    { range: '730+', min: 731, max: Infinity },
  ];
  const durationDistribution: DurationBucket[] = durationBuckets.map((b) => ({
    range: b.range,
    count: durations.filter((d) => d >= b.min && d <= b.max).length,
  }));

  // ─── Monthly trend ───
  const now = new Date();
  const monthlyTrend: MonthlyTrend[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

    const monthProjects = ps.filter((p) => {
      const created = new Date(p.created_at);
      return created >= d && created <= monthEnd;
    });

    const monthDurations = monthProjects
      .filter((p) => p.start_date && p.end_date)
      .map(
        (p) =>
          (new Date(p.end_date).getTime() - new Date(p.start_date).getTime()) /
          86400000
      );

    monthlyTrend.push({
      month: monthKey,
      label: d.toLocaleString('en-GB', { month: 'short' }),
      avg_duration:
        monthDurations.length > 0
          ? Math.round(
              monthDurations.reduce((a, b) => a + b, 0) / monthDurations.length
            )
          : 0,
      project_count: monthProjects.length,
    });
  }

  return {
    range,
    avgDuration: mkDelta(avgDuration, prevAvgDuration, false),
    avgDaysToEnd: mkDelta(avgDaysToEnd, prevAvgDaysToEnd, true),
    lifetimeValue: mkDelta(lifetimeValue, prevLifetimeValue, true),
    exceptionCauses,
    currencyExposure,
    healthSnapshot,
    stageDistribution,
    clientLtv,
    durationDistribution,
    monthlyTrend,
    totalProjects: ps.length,
    totalExceptionCount: exceptions.length,
  };
}
