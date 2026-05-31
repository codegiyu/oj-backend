import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import {
  attachChartMovement,
  bestRankEverForMusic,
  buildPreviousRankMap,
  wasRankedInEarlierSnapshots,
} from '../../src/services/musicCharts.helpers';
import type { ChartSnapshotDoc } from '../../src/repositories/charts/musicChartSnapshot.repository';

const musicA = 'aaaaaaaaaaaaaaaaaaaaaaaa';

function snapshot(
  periodKey: string,
  entries: Array<{ musicId: string; rank: number }>
): ChartSnapshotDoc {
  return {
    scopeKey: 'all',
    period: 'weekly',
    periodKey,
    windowStart: new Date('2026-05-23T00:00:00.000Z'),
    windowEnd: new Date('2026-05-30T00:00:00.000Z'),
    computedAt: new Date(),
    entries: entries.map(entry => ({
      musicId: new mongoose.Types.ObjectId(entry.musicId),
      rank: entry.rank,
      score: 10,
    })),
  };
}

describe('musicCharts.helpers', () => {
  it('buildPreviousRankMap maps snapshot entries', () => {
    const map = buildPreviousRankMap(
      snapshot('rolling-7d-2026-05-23', [{ musicId: musicA, rank: 6 }])
    );

    expect(map.get(musicA)).toBe(6);
  });

  it('attachChartMovement calculates up movement', () => {
    const result = attachChartMovement({
      musicId: musicA,
      rank: 2,
      previousRank: 6,
      historicalSnapshots: [],
      previousPeriodKey: 'rolling-7d-2026-05-23',
    });

    expect(result).toEqual({ trend: 'up', change: 4 });
  });

  it('attachChartMovement calculates down movement', () => {
    const result = attachChartMovement({
      musicId: musicA,
      rank: 6,
      previousRank: 2,
      historicalSnapshots: [],
      previousPeriodKey: 'rolling-7d-2026-05-23',
    });

    expect(result).toEqual({ trend: 'down', change: 4 });
  });

  it('attachChartMovement marks new entries', () => {
    const result = attachChartMovement({
      musicId: musicA,
      rank: 3,
      historicalSnapshots: [],
      previousPeriodKey: 'rolling-7d-2026-05-23',
    });

    expect(result).toEqual({ trend: 'up', change: 0, chartEntry: 'new' });
  });

  it('attachChartMovement marks reentry from older snapshots', () => {
    const historical = [snapshot('rolling-7d-2026-05-09', [{ musicId: musicA, rank: 8 }])];

    const result = attachChartMovement({
      musicId: musicA,
      rank: 5,
      historicalSnapshots: historical,
      previousPeriodKey: 'rolling-7d-2026-05-23',
    });

    expect(result.chartEntry).toBe('reentry');
    expect(result.change).toBe(0);
  });

  it('attachChartMovement prioritizes peak badge', () => {
    const historical = [
      snapshot('rolling-7d-2026-05-09', [{ musicId: musicA, rank: 4 }]),
      snapshot('rolling-7d-2026-05-23', [{ musicId: musicA, rank: 5 }]),
    ];

    const result = attachChartMovement({
      musicId: musicA,
      rank: 3,
      previousRank: 5,
      historicalSnapshots: historical,
      previousPeriodKey: 'rolling-7d-2026-05-23',
    });

    expect(result.chartEntry).toBe('peak');
    expect(result.change).toBe(2);
  });

  it('wasRankedInEarlierSnapshots ignores previous period key only', () => {
    const historical = [snapshot('rolling-7d-2026-05-09', [{ musicId: musicA, rank: 2 }])];

    expect(
      wasRankedInEarlierSnapshots(musicA, historical, 'rolling-7d-2026-05-09')
    ).toBe(false);
    expect(
      wasRankedInEarlierSnapshots(musicA, historical, 'rolling-7d-2026-05-23')
    ).toBe(true);
  });

  it('bestRankEverForMusic returns lowest rank seen', () => {
    const historical = [
      snapshot('rolling-7d-2026-05-09', [{ musicId: musicA, rank: 7 }]),
      snapshot('rolling-7d-2026-05-16', [{ musicId: musicA, rank: 3 }]),
    ];

    expect(bestRankEverForMusic(musicA, historical)).toBe(3);
  });
});
