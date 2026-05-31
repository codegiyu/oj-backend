import type { ChartSnapshotDoc } from '../repositories/charts/musicChartSnapshot.repository';

export type ChartTrend = 'up' | 'down' | 'same';
export type ChartEntry = 'new' | 'reentry' | 'peak';

export function buildPreviousRankMap(snapshot: ChartSnapshotDoc | null): Map<string, number> {
  const map = new Map<string, number>();
  if (!snapshot) return map;

  for (const entry of snapshot.entries) {
    map.set(String(entry.musicId), entry.rank);
  }

  return map;
}

export function wasRankedInEarlierSnapshots(
  musicId: string,
  snapshots: ChartSnapshotDoc[],
  previousPeriodKey: string
): boolean {
  for (const snapshot of snapshots) {
    if (snapshot.periodKey === previousPeriodKey) continue;

    if (snapshot.entries.some(entry => String(entry.musicId) === musicId)) {
      return true;
    }
  }

  return false;
}

export function bestRankEverForMusic(
  musicId: string,
  snapshots: ChartSnapshotDoc[]
): number | null {
  let best: number | null = null;

  for (const snapshot of snapshots) {
    const entry = snapshot.entries.find(row => String(row.musicId) === musicId);
    if (!entry) continue;

    if (best == null || entry.rank < best) {
      best = entry.rank;
    }
  }

  return best;
}

export function attachChartMovement(options: {
  musicId: string;
  rank: number;
  previousRank?: number;
  historicalSnapshots: ChartSnapshotDoc[];
  previousPeriodKey: string;
}): { trend: ChartTrend; change: number; chartEntry?: ChartEntry } {
  const { musicId, rank, previousRank, historicalSnapshots, previousPeriodKey } = options;

  let trend: ChartTrend;
  let change: number;
  let chartEntry: ChartEntry | undefined;

  if (previousRank == null) {
    trend = 'up';
    change = 0;
    chartEntry = wasRankedInEarlierSnapshots(musicId, historicalSnapshots, previousPeriodKey)
      ? 'reentry'
      : 'new';
  } else if (previousRank === rank) {
    trend = 'same';
    change = 0;
  } else if (previousRank > rank) {
    trend = 'up';
    change = previousRank - rank;
  } else {
    trend = 'down';
    change = rank - previousRank;
  }

  const bestEver = bestRankEverForMusic(musicId, historicalSnapshots);
  if (bestEver != null && rank <= bestEver && previousRank != null && rank < previousRank) {
    chartEntry = 'peak';
  }

  return {
    trend,
    change,
    ...(chartEntry ? { chartEntry } : {}),
  };
}
