export type FrontendRevalidationContentType = 'music_item' | 'news_item' | 'marketplace_product';

export function frontendPathsForMusicItem(id: string): string[] {
  const encoded = encodeURIComponent(id);
  return ['/', '/music', `/music/${encoded}`];
}

export function frontendPathsForNewsItem(id: string): string[] {
  const encoded = encodeURIComponent(id);
  return ['/', '/news', `/news/story/${encoded}`];
}

export function frontendPathsForMarketplaceProduct(slug: string): string[] {
  const encoded = encodeURIComponent(slug);
  return ['/marketplace', '/marketplace/products', `/marketplace/products/${encoded}`];
}

export function frontendPathsForContent(
  type: FrontendRevalidationContentType,
  value: string
): string[] {
  switch (type) {
    case 'music_item':
      return frontendPathsForMusicItem(value);
    case 'news_item':
      return frontendPathsForNewsItem(value);
    case 'marketplace_product':
      return frontendPathsForMarketplaceProduct(value);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export async function requestFrontendRevalidation(paths: string[]): Promise<void> {
  const url = process.env.FRONTEND_REVALIDATION_URL?.trim();
  const secret =
    process.env.REVALIDATION_SECRET?.trim() || process.env.FRONTEND_REVALIDATION_SECRET?.trim();
  const uniquePaths = [...new Set(paths.map(path => path.trim()).filter(Boolean))];

  if (!url || !secret || uniquePaths.length === 0) {
    return;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ paths: uniquePaths }),
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      // Non-fatal: stale ISR remains until the next scheduled revalidation window.
      return;
    }
  } catch {
    // Non-fatal for admin publish flows.
  }
}

export function scheduleFrontendRevalidation(paths: string[]): void {
  void requestFrontendRevalidation(paths);
}

export function schedulePublishedContentRevalidation(
  type: FrontendRevalidationContentType,
  value: string
): void {
  scheduleFrontendRevalidation(frontendPathsForContent(type, value));
}
