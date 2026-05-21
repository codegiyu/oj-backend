const MAX_SAMPLES_PER_ROUTE = 500;

const samplesByRoute = new Map<string, number[]>();

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);

  return Math.round(sorted[index] * 100) / 100;
}

export type RouteLatencyStats = {
  route: string;
  count: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

export type LatencyHistogramSnapshot = {
  generatedAt: string;
  routes: RouteLatencyStats[];
};

export function buildRouteLatencyKey(method: string, route: string): string {
  return `${method} ${route}`;
}

export function recordRequestLatency(routeKey: string, durationMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return;
  }

  const bucket = samplesByRoute.get(routeKey) ?? [];
  bucket.push(durationMs);

  if (bucket.length > MAX_SAMPLES_PER_ROUTE) {
    bucket.shift();
  }

  samplesByRoute.set(routeKey, bucket);
}

export function getLatencyHistogramSnapshot(): LatencyHistogramSnapshot {
  const routes: RouteLatencyStats[] = [];

  for (const [route, samples] of samplesByRoute.entries()) {
    const sorted = [...samples].sort((a, b) => a - b);

    routes.push({
      route,
      count: sorted.length,
      p50Ms: percentile(sorted, 50),
      p95Ms: percentile(sorted, 95),
      p99Ms: percentile(sorted, 99),
    });
  }

  routes.sort((a, b) => b.p95Ms - a.p95Ms);

  return {
    generatedAt: new Date().toISOString(),
    routes,
  };
}

export function resetLatencyHistogramForTests(): void {
  samplesByRoute.clear();
}
